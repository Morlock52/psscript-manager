"""
PowerShell Script Analysis API
A FastAPI service that analyzes PowerShell scripts using AI-powered multi-agent system.
"""

import os
import json
import asyncio
import time
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Import configuration
from config import config
# Import our agent system
from agents import agent_factory
from agents.agent_coordinator import AgentCoordinator
from analysis.script_analyzer import ScriptAnalyzer
# Import telemetry
from telemetry.tracing import initialize_instrumentations, trace_async_function, create_ai_operation_span
from telemetry.metrics import start_metrics_server, record_script_analysis, record_ai_api_request

# Initialize FastAPI app
app = FastAPI(
    title="PowerShell Script Analysis API",
    description="API for analyzing PowerShell scripts using AI",
    version="0.2.0"
)

# Initialize OpenTelemetry
initialize_instrumentations(app)

# Start metrics server
start_metrics_server(port=9090)

# Store application start time for health checks
app.state.start_time = time.time()

# Add CORS middleware with secure configuration
import os
allowed_origins = []

if os.getenv("NODE_ENV") == "production":
    # In production, only allow specific origins
    frontend_url = os.getenv("FRONTEND_URL", "https://your-domain.com")
    allowed_origins = [frontend_url]
else:
    # In development, allow localhost variants
    allowed_origins = [
        "http://localhost:3002",
        "http://localhost:3000",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

# Custom exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    # Log the detailed validation errors
    print(f"Validation Error: {exc.errors()}") # Use print for visibility in docker logs
    # You could use logger here as well: logger.error("Validation Error", detail=exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# Initialize script analyzer
script_analyzer = ScriptAnalyzer(use_cache=True)

# Define MOCK_MODE based on config
MOCK_MODE = config.mock_mode

# Log configuration
if config.api_keys.openai:
    print(f"Using OpenAI API key: {config.api_keys.openai[:8]}...")
else:
    print("No OpenAI API key found in environment variables")

print(f"Mock mode enabled: {MOCK_MODE}")
print(f"Default agent: {config.agent.default_agent}")
print(f"Default model: {config.agent.default_model}")


# Initialize agent coordinator
agent_coordinator = None
if not MOCK_MODE:
    try:
        # Create memory storage directory if it doesn't exist
        memory_storage_path = os.path.join(os.path.dirname(__file__), 
                                          "memory_storage")
        os.makedirs(memory_storage_path, exist_ok=True)
        
        # Create visualization output directory if it doesn't exist
        visualization_output_dir = os.path.join(os.path.dirname(__file__), 
                                               "visualizations")
        os.makedirs(visualization_output_dir, exist_ok=True)
        
        # Initialize the agent coordinator
        agent_coordinator = AgentCoordinator(
            api_key=config.api_keys.openai,
            memory_storage_path=memory_storage_path,
            visualization_output_dir=visualization_output_dir,
            model=config.agent.default_model
        )
        print("Agent coordinator initialized successfully")
    except Exception as e:
        print(f"Error initializing agent coordinator: {e}")
        print("Falling back to legacy agent system")


# Initialize legacy agent system as fallback
if not MOCK_MODE and not agent_coordinator:
    try:
        # Test the agent system
        test_message = [{"role": "user", "content": "Hello"}]
        asyncio.run(agent_factory.process_message(test_message, 
                                                 config.api_keys.openai))
        print("Legacy agent system initialized successfully")
    except Exception as e:
        print(f"Error initializing legacy agent system: {e}")
        if not config.api_keys.openai:
            print("No API key available. Service will require an API key to function.")
        else:
            print("Agent system initialization failed, but API key is present.")


# Database connection
def get_db_connection():
    """Create and return a database connection."""
    try:
        # Use environment variables with localhost fallback
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "psscript"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres"),
            port=os.getenv("DB_PORT", "5432")
        )
        conn.cursor_factory = RealDictCursor
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


# Check if pgvector extension is available
def is_pgvector_available():
    """Check if pgvector extension is available and installed."""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            print("Could not connect to database to check pgvector")
            return False
            
        cur = conn.cursor()
        
        # Check if vector extension is installed
        cur.execute("SELECT * FROM pg_extension WHERE extname = 'vector'")
        result = cur.fetchone()
        
        return result is not None
    except Exception as e:
        print(f"Error checking pgvector availability: {e}")
        return False
    finally:
        if conn:
            conn.close()


# Global flag for vector operations
VECTOR_ENABLED = is_pgvector_available()
print(f"Vector operations enabled: {VECTOR_ENABLED}")


# Request/Response Models
class ScriptContent(BaseModel):
    content: str = Field(..., description="PowerShell script content to analyze")
    script_id: Optional[int] = Field(None, description="Script ID if already stored")
    script_name: Optional[str] = Field(None, description="Name of the script")


class ScriptEmbeddingRequest(BaseModel):
    content: str = Field(..., 
                        description="PowerShell script content to generate embedding for")


class SimilarScriptsRequest(BaseModel):
    script_id: Optional[int] = Field(None, 
                                    description="Script ID to find similar scripts for")
    content: Optional[str] = Field(None, 
                                  description="Script content to find similar scripts for")
    limit: int = Field(5, description="Maximum number of similar scripts to return")


class AnalysisResponse(BaseModel):
    purpose: str
    security_analysis: str
    security_score: float
    code_quality_score: float
    parameters: Dict[str, Any]
    category: str
    category_id: Optional[int] = None
    command_details: Optional[List[Dict[str, Any]]] = None
    ms_docs_references: Optional[List[Dict[str, Any]]] = None
    optimization: List[str]
    risk_score: float


class EmbeddingResponse(BaseModel):
    embedding: List[float]


class SimilarScript(BaseModel):
    script_id: int
    title: str
    similarity: float


class SimilarScriptsResponse(BaseModel):
    similar_scripts: List[SimilarScript]


class VisualizationRequest(BaseModel):
    visualization_type: str = Field(..., 
                                   description="Type of visualization to generate")
    parameters: Dict[str, Any] = Field(default_factory=dict, 
                                     description="Optional parameters for the visualization")


class VisualizationResponse(BaseModel):
    visualization_path: str = Field(..., 
                                   description="Path to the generated visualization file")
    visualization_type: str = Field(..., 
                                   description="Type of visualization that was generated")


class ChatMessage(BaseModel):
    role: str = Field(..., description="The role of the message sender (user or assistant)")
    content: str = Field(..., description="The content of the message")


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="The chat messages")
    system_prompt: Optional[str] = Field(None, description="System prompt to use")
    api_key: Optional[str] = Field(None, description="Optional API key to use")
    agent_type: Optional[str] = Field(None, 
                                     description="Type of agent to use")
    session_id: Optional[str] = Field(None, 
                                     description="Session ID for persistent conversations")


class ChatResponse(BaseModel):
    response: str = Field(..., description="The assistant's response")
    session_id: Optional[str] = Field(None, 
                                     description="Session ID for continuing the conversation")


# API Routes
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint, returns API info."""
    return {
        "message": "PowerShell Script Analysis API",
        "version": "0.2.0",
        "status": "operational",
        "mode": "mock" if MOCK_MODE else "production",
        "agent_coordinator": "enabled" if agent_coordinator else "disabled"
    }


@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint for monitoring."""
    # Check if we have required components
    has_api_key = bool(config.api_keys.openai)
    coordinator_status = "enabled" if agent_coordinator else "disabled"
    
    # Determine overall health status
    is_healthy = True
    status_details = []
    
    if MOCK_MODE:
        status_details.append("Running in mock mode")
    elif not has_api_key:
        is_healthy = False
        status_details.append("No OpenAI API key configured")
    elif not agent_coordinator:
        status_details.append("Agent coordinator not initialized")
    
    # Check database connectivity
    db_healthy = False
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.fetchone()
            conn.close()
            db_healthy = True
    except Exception as e:
        status_details.append(f"Database connection issue: {str(e)}")
        is_healthy = False
    
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": time.time(),
        "checks": {
            "api_key": has_api_key,
            "database": db_healthy,
            "agent_coordinator": coordinator_status,
            "mode": "mock" if MOCK_MODE else "production"
        },
        "details": status_details,
        "uptime": time.time() - app.state.start_time if hasattr(app.state, 'start_time') else 0
    }


@app.post("/analyze", response_model=AnalysisResponse, tags=["Analysis"])
async def analyze_script(
    script_data: ScriptContent,
    include_command_details: bool = False,
    fetch_ms_docs: bool = False,
    api_key: Optional[str] = Header(None, alias="x-api-key")
):
    """
    Analyze a PowerShell script and return detailed information.
    
    - include_command_details: Set to true to include detailed analysis of each PowerShell command
    - fetch_ms_docs: Set to true to fetch Microsoft documentation references
    - api_key: Optional OpenAI API key to use for this request
    """
    try:
        # Use the agent coordinator if available
        if agent_coordinator and not MOCK_MODE:
            # Prepare metadata
            metadata = {
                "include_command_details": include_command_details,
                "fetch_ms_docs": fetch_ms_docs
            }
            
            # Perform script analysis with the agent coordinator
            analysis_results = await agent_coordinator.analyze_script(
                script_content=script_data.content,
                script_name=script_data.script_name,
                script_id=script_data.script_id,
                metadata=metadata
            )
            
            # Extract the analysis results
            analysis = {
                "purpose": analysis_results.get("analysis", {}).get("purpose", 
                                                                   "Unknown purpose"),
                "security_analysis": analysis_results.get("security", {}).get(
                    "security_analysis", "No security analysis available"),
                "security_score": analysis_results.get("security", {}).get(
                    "security_score", 5.0),
                "code_quality_score": analysis_results.get("analysis", {}).get(
                    "code_quality_score", 5.0),
                "parameters": analysis_results.get("analysis", {}).get("parameters", {}),
                "category": analysis_results.get("categorization", {}).get(
                    "category", "Utilities & Helpers"),
                "category_id": None,  # Will be set below
                "optimization": analysis_results.get("optimization", {}).get(
                    "recommendations", []),
                "risk_score": analysis_results.get("security", {}).get("risk_score", 5.0)
            }
            
            # Add command details if requested
            if include_command_details:
                analysis["command_details"] = analysis_results.get(
                    "analysis", {}).get("command_details", [])
            
            # Add MS Docs references if requested
            if fetch_ms_docs:
                analysis["ms_docs_references"] = analysis_results.get(
                    "documentation", {}).get("references", [])
            
            # Map category to category_id
            category_mapping = {
                "System Administration": 1,
                "Security & Compliance": 2,
                "Automation & DevOps": 3,
                "Cloud Management": 4,
                "Network Management": 5,
                "Data Management": 6,
                "Active Directory": 7,
                "Monitoring & Diagnostics": 8,
                "Backup & Recovery": 9,
                "Utilities & Helpers": 10
            }
            analysis["category_id"] = category_mapping.get(analysis["category"], 10)
        else:
            # Fall back to the legacy agent system
            agent = agent_factory.get_agent("hybrid", api_key or config.api_keys.openai)
            
            # Perform script analysis with the hybrid agent
            analysis = await agent.analyze_script(
                script_data.script_id or "temp", 
                script_data.content,
                include_command_details=include_command_details,
                fetch_ms_docs=fetch_ms_docs
            )
        
        # If script_id is provided, store the analysis result in the database
        if script_data.script_id:
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                
                # Check if analysis exists for this script
                cur.execute(
                    "SELECT id FROM script_analysis WHERE script_id = %s",
                    (script_data.script_id,)
                )
                existing = cur.fetchone()
                
                if existing:
                    # Update existing analysis
                    cur.execute(
                        """
                        UPDATE script_analysis
                        SET purpose = %s, security_score = %s, quality_score = %s, 
                            risk_score = %s, parameter_docs = %s, suggestions = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE script_id = %s
                        RETURNING id
                        """,
                        (
                            analysis["purpose"],
                            analysis["security_score"],
                            analysis["code_quality_score"],
                            analysis["risk_score"],
                            json.dumps(analysis["parameters"]),
                            json.dumps(analysis["optimization"]),
                            script_data.script_id
                        )
                    )
                else:
                    # Insert new analysis
                    cur.execute(
                        """
                        INSERT INTO script_analysis
                        (script_id, purpose, security_score, quality_score, risk_score, 
                         parameter_docs, suggestions)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (
                            script_data.script_id,
                            analysis["purpose"],
                            analysis["security_score"],
                            analysis["code_quality_score"],
                            analysis["risk_score"],
                            json.dumps(analysis["parameters"]),
                            json.dumps(analysis["optimization"])
                        )
                    )
                
                conn.commit()
            
            except Exception as e:
                print(f"Database error: {e}")
                # Continue even if database operation fails
            finally:
                if conn:
                    conn.close()
        
        return analysis
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/security-analysis", tags=["Analysis"])
async def analyze_script_security(
    script_data: ScriptContent,
    api_key: Optional[str] = Header(None, alias="x-api-key")
):
    """
    Analyze the security aspects of a PowerShell script.
    
    - api_key: Optional OpenAI API key to use for this request
    """
    try:
        # Use the agent coordinator if available
        if agent_coordinator and not MOCK_MODE:
            security_results = await agent_coordinator.analyze_script_security(
                script_content=script_data.content,
                script_name=script_data.script_name,
                script_id=script_data.script_id
            )
            return security_results
        else:
            # Fall back to the legacy agent system
            agent = agent_factory.get_agent("hybrid", api_key or config.api_keys.openai)
            
            # Extract security analysis from the full analysis
            full_analysis = await agent.analyze_script(
                script_data.script_id or "temp", 
                script_data.content,
                include_command_details=False,
                fetch_ms_docs=False
            )
            
            return {
                "security_score": full_analysis["security_score"],
                "security_analysis": full_analysis["security_analysis"],
                "risk_score": full_analysis["risk_score"]
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, 
                           detail=f"Security analysis failed: {str(e)}")


@app.post("/categorize", tags=["Analysis"])
async def categorize_script(
    script_data: ScriptContent,
    api_key: Optional[str] = Header(None, alias="x-api-key")
):
    """
    Categorize a PowerShell script based on its purpose and functionality.
    
    - api_key: Optional OpenAI API key to use for this request
    """
    try:
        # Use the agent coordinator if available
        if agent_coordinator and not MOCK_MODE:
            categorization_results = await agent_coordinator.categorize_script(
                script_content=script_data.content,
                script_name=script_data.script_name,
                script_id=script_data.script_id
            )
            return categorization_results
        else:
            # Fall back to the legacy agent system
            agent = agent_factory.get_agent("hybrid", api_key or config.api_keys.openai)
            
            # Extract categorization from the full analysis
            full_analysis = await agent.analyze_script(
                script_data.script_id or "temp", 
                script_data.content,
                include_command_details=False,
                fetch_ms_docs=False
            )
            
            return {
                "category": full_analysis["category"],
                "category_id": full_analysis["category_id"],
                "confidence": 0.8  # Default confidence for legacy system
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Categorization failed: {str(e)}")


@app.post("/documentation", tags=["Analysis"])
async def find_documentation_references(
    script_data: ScriptContent,
    api_key: Optional[str] = Header(None, alias="x-api-key")
):
    """
    Find documentation references for PowerShell commands used in a script.
    
    - api_key: Optional OpenAI API key to use for this request
    """
    try:
        # Use the agent coordinator if available
        if agent_coordinator and not MOCK_MODE:
            documentation_results = await agent_coordinator.find_documentation_references(
                script_content=script_data.content,
                script_name=script_data.script_name,
                script_id=script_data.script_id
            )
            return documentation_results
        else:
            # Fall back to the legacy agent system
            agent = agent_factory.get_agent("hybrid", api_key or config.api_keys.openai)
            
            # Perform script analysis with documentation
            full_analysis = await agent.analyze_script(
                script_data.script_id or "temp", 
                script_data.content,
                include_command_details=False,
                fetch_ms_docs=True
            )
            
            return {
                "references": full_analysis.get("ms_docs_references", []),
                "commands_found": len(full_analysis.get("ms_docs_references", []))
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, 
                           detail=f"Documentation search failed: {str(e)}")


@app.post("/embedding", response_model=EmbeddingResponse, tags=["Embeddings"])
async def create_embedding(request: ScriptEmbeddingRequest):
    """Generate an embedding vector for a PowerShell script."""
    try:
        # Use the agent coordinator if available
        if agent_coordinator and not MOCK_MODE:
            embedding = await agent_coordinator.generate_script_embedding(request.content)
        else:
            # Fall back to the script analyzer
            embedding = script_analyzer.generate_embedding(request.content)
            
        return {"embedding": embedding}
    except Exception as e:
        raise HTTPException(status_code=500, 
                           detail=f"Embedding generation failed: {str(e)}")


@app.post("/similar", response_model=SimilarScriptsResponse, tags=["Search"])
async def find_similar_scripts(request: SimilarScriptsRequest):
    """Find scripts similar to a given script using vector similarity."""
    # Validate that either script_id or content is provided
    if request.script_id is None and request.content is None:
        raise HTTPException(
            status_code=400, 
            detail="Either script_id or content must be provided"
        )
    
    try:
        # Use the agent coordinator if available and content is provided
        if agent_coordinator and not MOCK_MODE and request.content:
            similar_scripts = await agent_coordinator.search_similar_scripts(
                script_content=request.content,
                limit=request.limit
            )
            
            # Convert to response format if needed
            if similar_scripts and not isinstance(similar_scripts[0], dict):
                similar_scripts = [
                    {
                        "script_id": script.id,
                        "title": script.title,
                        "similarity": script.similarity
                    }
                    for script in similar_scripts
                ]
                
            return {"similar_scripts": similar_scripts}
        
        # Otherwise use the database approach
        conn = get_db_connection()
        
        # Get the embedding for the query script
        query_embedding = None
        
        if request.script_id:
            # Fetch embedding for existing script
            cur = conn.cursor()
            cur.execute(
                "SELECT embedding FROM script_embeddings WHERE script_id = %s",
                (request.script_id,)
            )
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=404,
                    detail=f"No embedding found for script ID {request.script_id}"
                )
            
            query_embedding = result["embedding"]
        
        elif request.content:
            # Generate embedding for provided content
            query_embedding = script_analyzer.generate_embedding(request.content)
        
        # Convert query embedding to numpy array
        query_embedding_np = np.array(query_embedding)
        
        # Fetch all script embeddings from database
        cur = conn.cursor()
        cur.execute("""
            SELECT se.script_id, se.embedding, s.title
            FROM script_embeddings se
            JOIN scripts s ON se.script_id = s.id
            WHERE se.script_id != %s
        """, (request.script_id or 0,))
        
        script_embeddings = cur.fetchall()
        
        # Calculate similarities
        similarities = []
        for script in script_embeddings:
            script_embedding = np.array(script["embedding"])
            similarity = np.dot(query_embedding_np, script_embedding) / (
                np.linalg.norm(query_embedding_np) * np.linalg.norm(script_embedding)
            )
            similarities.append({
                "script_id": script["script_id"],
                "title": script["title"],
                "similarity": float(similarity)
            })
        
        # Sort by similarity (highest first) and return top matches
        similarities.sort(key=lambda x: x["similarity"], reverse=True)
        top_similarities = similarities[:request.limit]
        
        return {"similar_scripts": top_similarities}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to find similar scripts: {str(e)}"
        )
    finally:
        if conn:
            conn.close()


@app.post("/visualize", response_model=VisualizationResponse, tags=["Visualization"])
async def generate_visualization(request: VisualizationRequest):
    """
    Generate a visualization of the agent system.
    
    Visualization types:
    - agent_network: Visualize the agent network
    - memory_graph: Visualize the memory graph
    - task_progress: Visualize task progress
    """
    if not agent_coordinator:
        raise HTTPException(
            status_code=400,
            detail="Agent coordinator is not available"
        )
    
    try:
        visualization_path = None
        
        if request.visualization_type == "agent_network":
            filename = request.parameters.get("filename", 
                                             f"agent_network_{int(time.time())}.png")
            visualization_path = agent_coordinator.visualize_agent_network(
                filename=filename)
        
        elif request.visualization_type == "memory_graph":
            # This would call the appropriate visualization method
            # For now, return a placeholder
            visualization_path = "/path/to/memory_graph.png"
        
        elif request.visualization_type == "task_progress":
            # This would call the appropriate visualization method
            # For now, return a placeholder
            visualization_path = "/path/to/task_progress.png"
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported visualization type: {request.visualization_type}"
            )
        
        if not visualization_path:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate visualization"
            )
        
        return {
            "visualization_path": visualization_path,
            "visualization_type": request.visualization_type
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Visualization generation failed: {str(e)}"
        )


@app.get("/categories", tags=["Categories"])
async def get_categories():
    """Get the list of predefined script categories with IDs and descriptions."""
    categories = [
        {
            "id": 1,
            "name": "System Administration",
            "description": "Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring."
        },
        {
            "id": 2,
            "name": "Security & Compliance",
            "description": "Scripts for security auditing, hardening, compliance checks, vulnerability scanning, and implementing security best practices."
        },
        {
            "id": 3,
            "name": "Automation & DevOps",
            "description": "Scripts that automate repetitive tasks, create workflows, CI/CD pipelines, and streamline IT processes."
        },
        {
            "id": 4,
            "name": "Cloud Management",
            "description": "Scripts for managing resources on Azure, AWS, GCP, and other cloud platforms, including provisioning and configuration."
        },
        {
            "id": 5,
            "name": "Network Management",
            "description": "Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services."
        },
        {
            "id": 6,
            "name": "Data Management",
            "description": "Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis tasks."
        },
        {
            "id": 7,
            "name": "Active Directory",
            "description": "Scripts for managing Active Directory, user accounts, groups, permissions, and domain services."
        },
        {
            "id": 8,
            "name": "Monitoring & Diagnostics",
            "description": "Scripts for system monitoring, logging, diagnostics, performance analysis, and alerting."
        },
        {
            "id": 9,
            "name": "Backup & Recovery",
            "description": "Scripts for data backup, disaster recovery, system restore, and business continuity operations."
        },
        {
            "id": 10,
            "name": "Utilities & Helpers",
            "description": "General-purpose utility scripts, helper functions, and reusable modules for various administrative tasks."
        }
    ]
    
    return {"categories": categories}


# Mock chat response for development without API key
def get_mock_chat_response(messages):
    """Generate a mock chat response when no valid API key is provided"""
    user_message = messages[-1]['content'] if messages and messages[-1]['role'] == 'user' else ''
    
    if not user_message:
        return "I'm here to help with PowerShell scripting. What can I assist you with today?"
    
    # Greetings
    if any(greeting in user_message.lower() for greeting in ['hello', 'hi', 'hey', 'greetings']):
        return "Hello! I'm PSScriptGPT, your PowerShell assistant. How can I help you with your PowerShell scripts today?"
    
    # General PowerShell information
    if 'what is powershell' in user_message.lower():
        return """PowerShell is a cross-platform task automation solution made up of a command-line shell, a scripting language, and a configuration management framework. PowerShell runs on Windows, Linux, and macOS.

PowerShell is built on the .NET Common Language Runtime (CLR) and accepts and returns .NET objects. This fundamental change brings entirely new tools and methods for automation.

Key features of PowerShell include:

1. **Cmdlets**: Lightweight commands that perform a single function
2. **Piping**: The ability to pass objects between commands
3. **Providers**: Access to data stores like the file system or registry
4. **Scripting Language**: A full-featured scripting language for creating scripts and functions
5. **Error Handling**: Robust error handling with try/catch blocks
6. **Integrated Scripting Environment (ISE)**: An IDE for writing PowerShell scripts
7. **Remote Management**: Built-in remoting capabilities to manage remote systems

Would you like to see some basic PowerShell examples?"""
    
    # Provide a generic response for other queries
    return """I'm running in mock mode because no valid API key was provided. In production, I would use an AI model to generate helpful responses about PowerShell scripting. 

Here's a simple PowerShell function that demonstrates best practices:

```powershell
function Get-FileStats {
    <#
    .SYNOPSIS
        Gets statistics about files in a directory.
    
    .DESCRIPTION
        This function analyzes files in a specified directory and returns
        statistics like count, total size, and average size.
    
    .PARAMETER Path
        The directory path to analyze. Defaults to current directory.
    
    .PARAMETER Filter
        Optional file filter (e.g., "*.txt"). Defaults to all files.
    
    .EXAMPLE
        Get-FileStats -Path "C:\\Documents" -Filter "*.docx"
        
        Returns statistics for all .docx files in C:\\Documents.
    #>
    [CmdletBinding()]
    param (
        [Parameter(Position=0)]
        [string]$Path = (Get-Location),
        
        [Parameter(Position=1)]
        [string]$Filter = "*"
    )
    
    begin {
        Write-Verbose "Analyzing files in $Path with filter '$Filter'"
        $fileSizes = @()
        $totalSize = 0
    }
    
    process {
        try {
            $files = Get-ChildItem -Path $Path -Filter $Filter -File -ErrorAction Stop
            
            foreach ($file in $files) {
                $fileSizes += $file.Length
                $totalSize += $file.Length
            }
            
            $averageSize = if ($files.Count -gt 0) { $totalSize / $files.Count } else { 0 }
            
            [PSCustomObject]@{
                DirectoryPath = $Path
                FileFilter = $Filter
                FileCount = $files.Count
                TotalSizeBytes = $totalSize
                TotalSizeMB = [math]::Round($totalSize / 1MB, 2)
                AverageSizeBytes = [math]::Round($averageSize, 2)
                AverageSizeMB = [math]::Round($averageSize / 1MB, 4)
                LargestFileBytes = if ($fileSizes.Count -gt 0) { ($fileSizes | Measure-Object -Maximum).Maximum } else { 0 }
                SmallestFileBytes = if ($fileSizes.Count -gt 0) { ($fileSizes | Measure-Object -Minimum).Minimum } else { 0 }
            }
        }
        catch {
            Write-Error "Error analyzing files: $_"
        }
    }
}
```

Is there a specific PowerShell topic you'd like me to cover?"""


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_powershell_expert(request: ChatRequest):
    """Chat with a PowerShell expert AI assistant."""
    start_time = time.time()
    try:
        # Extract API key from request if provided
        api_key = getattr(request, 'api_key', None)
        # Use the provided API key or fall back to the configured API key
        api_key = api_key or config.api_keys.openai
        
        # Default system prompt for PowerShell expertise
        default_system_prompt = """
        You are PSScriptGPT, a specialized PowerShell expert assistant. You provide accurate, 
        detailed information about PowerShell scripting, best practices, and help users 
        troubleshoot their PowerShell scripts. You can explain PowerShell concepts, 
        cmdlets, modules, and provide code examples when appropriate.
        """
        
        # Check if we have a valid API key
        if not api_key and MOCK_MODE:
            # Use mock response in development mode
            response = get_mock_chat_response([msg.dict() for msg in request.messages])
            processing_time = time.time() - start_time
            print(f"Chat request processed in {processing_time:.2f}s (mock mode)")
            return {"response": response}
        
        # Convert messages to the format expected by the agent system
        messages = []
        
        # Add system prompt if provided, otherwise use default
        system_prompt = request.system_prompt or default_system_prompt
        messages.append({"role": "system", "content": system_prompt})
        
        # Add user messages
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        # Session ID for persistent conversations
        session_id = request.session_id or None
        
        # Process the chat request
        if agent_coordinator and not MOCK_MODE and not request.agent_type:
            # Use the agent coordinator
            response = await agent_coordinator.process_chat(messages)
            return {"response": response}
        elif request.agent_type == "assistant":
            # Use the OpenAI Assistant agent
            try:
                from agents.openai_assistant_agent import OpenAIAssistantAgent
                
                # Create an assistant agent
                assistant_agent = OpenAIAssistantAgent(api_key=api_key)
                
                # Process the message with the assistant agent
                response = await assistant_agent.process_message(messages, session_id)
                
                # Get the session ID for the response
                if not session_id:
                    session_id = assistant_agent.get_or_create_thread()
                
                return {"response": response, "session_id": session_id}
            except ImportError as e:
                print(f"OpenAI Assistant agent not available: {e}")
                print("Falling back to legacy agent system")
                # Fall back to legacy agent
                response = await agent_factory.process_message(messages, api_key)
                return {"response": response}
        else:
            # Use the agent factory with specified or auto-detected agent type
            response = await agent_factory.process_message(
                messages, 
                api_key, 
                request.agent_type,
                session_id
            )
            return {"response": response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")
