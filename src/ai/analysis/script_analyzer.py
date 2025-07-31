"""
PowerShell Script Analyzer

Performs comprehensive analysis of PowerShell scripts using OpenAI's API with advanced
caching, error handling, and concurrent processing capabilities.
"""

import os
import json
import time
import logging
import asyncio
import hashlib
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Tuple, Any, Union, Callable

import openai
import numpy as np
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from dotenv import load_dotenv
from redis import Redis
from diskcache import Cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("script_analyzer")

# Load environment variables
load_dotenv()

# Set OpenAI API key from environment
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise EnvironmentError("OPENAI_API_KEY environment variable is not set")

# Initialize caching
disk_cache = Cache('./analysis_cache')
redis_client = None
if os.getenv("REDIS_URL"):
    try:
        from redis import Redis
        redis_client = Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
        logger.info("Redis cache initialized")
    except ImportError:
        logger.warning("Redis package not installed, falling back to disk cache")
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {e}, falling back to disk cache")

# Constants
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-ada-002")
ANALYSIS_MODEL = os.getenv("ANALYSIS_MODEL", "gpt-4o")
EMBEDDING_DIMENSION = 1536  # Current OpenAI embedding dimension
CACHE_TTL = int(os.getenv("CACHE_TTL", "86400"))  # Default: 1 day in seconds
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "5"))  # Default: 5 concurrent workers

class ScriptAnalyzer:
    """Analyzes PowerShell scripts using AI with caching and parallel processing."""
    
    def __init__(self, use_cache: bool = True):
        """
        Initialize the script analyzer.
        
        Args:
            use_cache: Whether to use caching for analysis results
        """
        self.use_cache = use_cache
        self.executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        logger.info(f"ScriptAnalyzer initialized with model {ANALYSIS_MODEL}")
        
    def _generate_cache_key(self, script_content: str, prefix: str = "analysis") -> str:
        """Generate a deterministic cache key for a script."""
        # Use a hash of the script content to create a unique key
        script_hash = hashlib.md5(script_content.encode('utf-8')).hexdigest()
        return f"{prefix}:{script_hash}"
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Try to get a value from cache (Redis or disk)."""
        if not self.use_cache:
            return None
            
        # Try Redis first if available
        if redis_client:
            try:
                cached_data = redis_client.get(key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception as e:
                logger.warning(f"Redis cache error: {e}")
        
        # Fall back to disk cache
        try:
            return disk_cache.get(key)
        except Exception as e:
            logger.warning(f"Disk cache error: {e}")
            
        return None
    
    def _save_to_cache(self, key: str, value: Any) -> None:
        """Save a value to cache (Redis and disk)."""
        if not self.use_cache:
            return
            
        # Save to Redis if available
        if redis_client:
            try:
                redis_client.setex(key, CACHE_TTL, json.dumps(value))
            except Exception as e:
                logger.warning(f"Redis cache save error: {e}")
        
        # Also save to disk cache as backup
        try:
            disk_cache.set(key, value, expire=CACHE_TTL)
        except Exception as e:
            logger.warning(f"Disk cache save error: {e}")
    
    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(min=1, max=20),
        retry=retry_if_exception_type(
            (Exception)  # Simplified error handling for compatibility
        )
    )
    async def generate_embedding_async(self, text: str) -> List[float]:
        """Generate vector embedding for the given text asynchronously."""
        # Check cache first
        cache_key = self._generate_cache_key(text, prefix="embedding")
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            logger.debug("Using cached embedding")
            return cached_result
            
        # Use a background thread to not block the event loop
        loop = asyncio.get_event_loop()
        try:
            response = await loop.run_in_executor(
                self.executor,
                lambda: openai.embeddings.create(
                    model=EMBEDDING_MODEL,
                    input=text
                )
            )
            
            embedding = response.data[0].embedding
            
            # Cache the result
            self._save_to_cache(cache_key, embedding)
            
            return embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def generate_embedding(self, text: str) -> List[float]:
        """Synchronous wrapper for embedding generation."""
        # Check if vector operations are enabled in the main module
        try:
            from main import VECTOR_ENABLED
            if not VECTOR_ENABLED:
                # Return a mock embedding if vector operations are disabled
                logger.warning("Vector operations are disabled. Returning mock embedding.")
                return [0.0] * EMBEDDING_DIMENSION
        except ImportError:
            # If we can't import the flag, assume vector operations are enabled
            pass
            
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.generate_embedding_async(text))
        finally:
            loop.close()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=30),
        retry=retry_if_exception_type(
            (Exception)  # Simplified error handling for compatibility
        )
    )
    async def analyze_script_async(self, script_content: str) -> Dict[str, Any]:
        """Perform comprehensive analysis of a PowerShell script asynchronously."""
        # Check cache first
        cache_key = self._generate_cache_key(script_content)
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            logger.debug("Using cached script analysis")
            return cached_result
        
        # Prepare the prompts for analysis
        system_prompt = """
        You are an expert PowerShell script analyzer. Your task is to analyze the provided PowerShell script and extract key information about it.
        You must provide a thorough, accurate, and security-focused analysis. Pay special attention to potential security risks, code quality, and execution risks.
        """
        
        user_prompt = f"""
        Analyze the following PowerShell script and provide a detailed report with the following sections:
        
        1. PURPOSE: Summarize what this script is designed to do in 1-2 sentences
        2. SECURITY_ANALYSIS: Identify potential security vulnerabilities or risks (scale 1-10, with 10 being highest risk)
          - A score of 1-3 means minimal security risks
          - A score of 4-6 means moderate security risks that should be addressed
          - A score of 7-10 means severe security risks requiring immediate attention
        3. CODE_QUALITY: Evaluate code quality and best practices (scale 1-10, with 10 being highest quality)
          - A score of 8-10 means excellent code following best practices
          - A score of 5-7 means acceptable code with some improvements needed
          - A score of 1-4 means poor code quality requiring significant refactoring
        4. PARAMETERS: Identify and document all parameters, including types and purposes
        5. CATEGORY: Classify this script into ONE of these categories:
           - System Administration: Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring
           - Security & Compliance: Scripts for security auditing, hardening, compliance checks, vulnerability scanning, and implementing security best practices
           - Automation & DevOps: Scripts that automate repetitive tasks, create workflows, CI/CD pipelines, and streamline IT processes
           - Cloud Management: Scripts for managing resources on Azure, AWS, GCP, and other cloud platforms, including provisioning and configuration
           - Network Management: Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services
           - Data Management: Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis tasks
           - Active Directory: Scripts for managing Active Directory, user accounts, groups, permissions, and domain services
           - Monitoring & Diagnostics: Scripts for system monitoring, logging, diagnostics, performance analysis, and alerting
           - Backup & Recovery: Scripts for data backup, disaster recovery, system restore, and business continuity operations
           - Utilities & Helpers: General-purpose utility scripts, helper functions, and reusable modules for various administrative tasks
        6. OPTIMIZATION: Provide specific suggestions for improving the script
        7. RISK_ASSESSMENT: Evaluate the potential risk of executing this script (scale 1-10, with 10 being highest risk)
          - A score of 1-3 means minimal execution risk
          - A score of 4-6 means moderate execution risk requiring caution
          - A score of 7-10 means high execution risk requiring careful review and controlled environment
        8. DEPENDENCIES: List any modules, tools, or services this script depends on
        9. RELIABILITY: Evaluate the error handling and robustness (scale 1-10, with 10 being most reliable)
          - A score of 8-10 means robust with excellent error handling
          - A score of 5-7 means adequate error handling with some improvements needed
          - A score of 1-4 means poor error handling requiring significant improvements
        10. COMMAND_DETAILS: Identify and document all PowerShell commands used in the script, including their purpose and potential risks
        11. MS_DOCS_REFERENCES: For each PowerShell command or concept in the script, include relevant Microsoft Learn documentation links with brief descriptions
        
        Format your response as a JSON object with these keys: "purpose", "security_analysis", "security_score", "code_quality_score", "parameters", "category", "category_id", "optimization", "risk_score", "dependencies", "reliability_score", "command_details", "ms_docs_references"
        
        For the category_id field, use these mappings:
        1: "System Administration"
        2: "Security & Compliance"
        3: "Automation & DevOps"
        4: "Cloud Management"
        5: "Network Management"
        6: "Data Management"
        7: "Active Directory"
        8: "Monitoring & Diagnostics"
        9: "Backup & Recovery"
        10: "Utilities & Helpers"
        
        For the ms_docs_references field, provide an array of objects, each containing:
        - "command": The PowerShell command or concept
        - "url": The full URL to the Microsoft Learn documentation
        - "description": A brief (10-25 word) description of what the documentation covers
        
        SCRIPT:
        ```powershell
        {script_content}
        ```
        """
        
        # Use a background thread to not block the event loop
        loop = asyncio.get_event_loop()
        
        try:
            response = await loop.run_in_executor(
                self.executor,
                lambda: openai.chat.completions.create(
                    model=ANALYSIS_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                    timeout=60  # 60 second timeout
                )
            )
            
            # Parse the JSON response
            analysis_text = response.choices[0].message.content
            analysis = json.loads(analysis_text)
            
            # Ensure all expected keys are present
            required_keys = [
                "purpose", "security_analysis", "security_score", "code_quality_score", 
                "parameters", "category", "category_id", "optimization", "risk_score", 
                "dependencies", "reliability_score", "command_details"
            ]
            
            for key in required_keys:
                if key not in analysis:
                    analysis[key] = None if key not in ["parameters", "optimization", "dependencies"] else {}
            
            # Add metadata
            analysis["analyzed_at"] = int(time.time())
            analysis["model"] = ANALYSIS_MODEL
            
            # Cache the result
            self._save_to_cache(cache_key, analysis)
            
            return analysis
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse analysis result as JSON: {e}")
            raise
        except Exception as e:
            logger.error(f"Error during script analysis: {e}")
            # Return a minimal response structure on error
            error_response = {
                "purpose": "Error analyzing script",
                "security_analysis": f"Analysis failed: {str(e)}",
                "security_score": 5,
                "code_quality_score": 5,
                "parameters": {},
                "category": "Utilities & Helpers",
                "category_id": 10,
                "optimization": ["Analysis failed"],
                "risk_score": 5,
                "dependencies": [],
                "reliability_score": 5,
                "command_details": [],
                "error": str(e),
                "analyzed_at": int(time.time()),
                "model": ANALYSIS_MODEL
            }
            return error_response
    
    def analyze_script(self, script_content: str) -> Dict[str, Any]:
        """Synchronous wrapper for script analysis."""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.analyze_script_async(script_content))
        finally:
            loop.close()
    
    async def find_similar_scripts_async(
        self, 
        embedding: List[float], 
        stored_embeddings: Dict[str, List[float]], 
        limit: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Tuple[str, float]]:
        """Find similar scripts based on embedding similarity asynchronously."""
        if not stored_embeddings:
            return []
            
        # Function to compute similarity for a single script
        def compute_similarity(script_id_embedding):
            script_id, stored_embedding = script_id_embedding
            # Calculate cosine similarity
            similarity = np.dot(embedding, stored_embedding) / (
                np.linalg.norm(embedding) * np.linalg.norm(stored_embedding)
            )
            return (script_id, float(similarity))
        
        # Use a background thread pool for parallel computation
        loop = asyncio.get_event_loop()
        similarities = await loop.run_in_executor(
            self.executor,
            lambda: list(map(compute_similarity, stored_embeddings.items()))
        )
        
        # Filter by threshold and sort by similarity
        similarities = [s for s in similarities if s[1] >= similarity_threshold]
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:limit]
    
    def find_similar_scripts(
        self, 
        embedding: List[float], 
        stored_embeddings: Dict[str, List[float]], 
        limit: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Tuple[str, float]]:
        """Synchronous wrapper for finding similar scripts."""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                self.find_similar_scripts_async(embedding, stored_embeddings, limit, similarity_threshold)
            )
        finally:
            loop.close()
    
    async def analyze_script_with_embedding_async(self, script_content: str) -> Dict[str, Any]:
        """Perform complete analysis including embedding generation asynchronously."""
        # Run both tasks concurrently
        embedding_task = self.generate_embedding_async(script_content)
        analysis_task = self.analyze_script_async(script_content)
        
        embedding = await embedding_task
        analysis = await analysis_task
        
        # Combine results
        result = {
            "analysis": analysis,
            "embedding": embedding,
            "processed_at": int(time.time())
        }
        
        return result
    
    def analyze_script_with_embedding(self, script_content: str) -> Dict[str, Any]:
        """Synchronous wrapper for complete script analysis with embedding."""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.analyze_script_with_embedding_async(script_content))
        finally:
            loop.close()
    
    async def batch_analyze_scripts_async(self, scripts: Dict[str, str]) -> Dict[str, Dict[str, Any]]:
        """Analyze multiple scripts concurrently."""
        tasks = {
            script_id: self.analyze_script_with_embedding_async(script_content)
            for script_id, script_content in scripts.items()
        }
        
        results = {}
        for script_id, task in tasks.items():
            try:
                results[script_id] = await task
            except Exception as e:
                logger.error(f"Error analyzing script {script_id}: {e}")
                results[script_id] = {
                    "error": str(e),
                    "processed_at": int(time.time())
                }
                
        return results
    
    def batch_analyze_scripts(self, scripts: Dict[str, str]) -> Dict[str, Dict[str, Any]]:
        """Synchronous wrapper for batch script analysis."""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.batch_analyze_scripts_async(scripts))
        finally:
            loop.close()


# Example usage
if __name__ == "__main__":
    # Example PowerShell script
    example_script = """
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$ComputerName,
        
        [Parameter(Mandatory=$false)]
        [switch]$IncludeServices = $false
    )
    
    Get-WmiObject -Class Win32_OperatingSystem -ComputerName $ComputerName | 
        Select-Object PSComputerName, Caption, Version, OSArchitecture
    
    if ($IncludeServices) {
        Get-Service -ComputerName $ComputerName | Where-Object {$_.Status -eq "Running"}
    }
    """
    
    analyzer = ScriptAnalyzer()
    result = analyzer.analyze_script_with_embedding(example_script)
    
    print(json.dumps(result["analysis"], indent=2))
    print(f"Embedding dimension: {len(result['embedding'])}")
