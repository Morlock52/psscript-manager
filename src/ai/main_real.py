"""
PSScript Manager AI Service - Real Version with OpenAI
Simplified version that uses OpenAI directly without complex agent dependencies
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import openai
from openai import OpenAI
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, "app.log"))
    ]
)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create app
app = FastAPI(title="PSScript AI Service", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "postgres"),
    "port": os.getenv("DB_PORT", 5432),
    "database": os.getenv("DB_NAME", "psscript"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

# Define data models
class RAGRequest(BaseModel):
    query: str = Field(..., description="Query to search for PowerShell patterns and best practices")
    context: Optional[str] = Field(None, description="Additional context for the query")
    limit: int = Field(5, description="Number of results to return")

class RAGResponse(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    generated_response: str
    sources: List[Dict[str, str]]

class SemanticSearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    limit: int = Field(10, description="Number of results to return")
    threshold: float = Field(0.7, description="Similarity threshold")
    category: Optional[str] = Field(None, description="Filter by category")

class SemanticSearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    query_embedding_model: str
    search_time_ms: float

class SimilaritySearchRequest(BaseModel):
    script_id: int = Field(..., description="Script ID to find similar scripts for")
    limit: int = Field(5, description="Number of similar scripts to return")
    threshold: float = Field(0.7, description="Similarity threshold")

class SimilaritySearchResponse(BaseModel):
    source_script: Dict[str, Any]
    similar_scripts: List[Dict[str, Any]]
    search_time_ms: float
class ScriptAnalysisRequest(BaseModel):
    script_content: str = Field(..., description="PowerShell script content")
    script_id: Optional[int] = Field(None, description="Optional script ID from the database")
    script_name: Optional[str] = Field(None, description="Script name or identifier")
    analysis_type: str = Field("full", description="Type of analysis to perform")

class ScriptAnalysisResponse(BaseModel):
    script_id: Optional[int] = None
    summary: str
    purpose: str
    script_type: str
    estimated_runtime: str
    dependencies: List[str]
    required_modules: List[str]
    inputs: List[Dict[str, Any]]
    outputs: List[Dict[str, Any]]
    potential_risks: List[str]
    security_concerns: List[str]
    best_practices: List[str]
    error_handling: Dict[str, Any]
    logging_capability: str
    complexity_score: int
    readability_score: int
    maintainability_score: int
    quality_score: int
    powershell_version: str
    compatibility_notes: List[str]
    cmdlets_used: List[str]
    functions_defined: List[str]
    variables_used: List[str]
    external_calls: List[str]
    improvement_suggestions: List[str]
    code_smells: List[str]
    execution_flow: str
    parsed_content: Dict[str, Any]
    metadata: Dict[str, Any]

class EmbeddingRequest(BaseModel):
    text: str = Field(..., description="Text to generate embedding for")

class EmbeddingResponse(BaseModel):
    embedding: List[float] = Field(..., description="Vector embedding")
    model: str = Field(default="text-embedding-3-large")
    usage: Dict[str, int] = Field(default_factory=dict)

def get_db_connection():
    """Create a database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

def analyze_script_with_openai(script_content: str) -> Dict[str, Any]:
    """Analyze PowerShell script using OpenAI"""
    
    prompt = f"""Analyze the following PowerShell script and provide a comprehensive analysis in JSON format.

PowerShell Script:
```powershell
{script_content}
```

Provide the analysis with the following structure:
{{
    "summary": "Brief summary of what the script does",
    "purpose": "Main purpose of the script",
    "script_type": "Type of script (e.g., System Administration, Data Processing, etc.)",
    "estimated_runtime": "Estimated execution time",
    "dependencies": ["List of external dependencies"],
    "required_modules": ["List of required PowerShell modules"],
    "inputs": [
        {{"name": "parameter_name", "type": "data_type", "description": "description", "required": true/false}}
    ],
    "outputs": [
        {{"type": "output_type", "description": "description"}}
    ],
    "potential_risks": ["List of potential risks"],
    "security_concerns": ["List of security concerns"],
    "best_practices": ["List of best practices followed"],
    "error_handling": {{
        "has_error_handling": true/false,
        "error_handling_approach": "description",
        "uncaught_exceptions": ["list of potential uncaught exceptions"]
    }},
    "logging_capability": "Description of logging capabilities",
    "complexity_score": 1-10,
    "readability_score": 1-10,
    "maintainability_score": 1-10,
    "quality_score": 1-10,
    "powershell_version": "Compatible PowerShell version",
    "compatibility_notes": ["Compatibility notes"],
    "cmdlets_used": ["List of cmdlets used"],
    "functions_defined": ["List of functions defined"],
    "variables_used": ["List of variables used"],
    "external_calls": ["List of external calls"],
    "improvement_suggestions": ["List of improvement suggestions"],
    "code_smells": ["List of code smells"],
    "execution_flow": "Description of execution flow",
    "parsed_content": {{
        "functions": ["list of function names"],
        "parameters": ["list of parameters"],
        "commands": ["list of main commands"]
    }}
}}

Provide only the JSON response, no additional text."""

    try:
        response = client.chat.completions.create(
            model="o3-mini",  # Using o3-mini model
            messages=[
                {"role": "system", "content": "You are a PowerShell script analysis expert. Provide detailed, accurate analysis in JSON format."},
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=2000,
            response_format={"type": "json_object"}  # Ensure JSON response
        )
        
        # Parse the response
        analysis_text = response.choices[0].message.content
        
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{[\s\S]*\}', analysis_text)
        if json_match:
            analysis_data = json.loads(json_match.group())
        else:
            # If no JSON found, create a basic structure
            analysis_data = {
                "summary": analysis_text,
                "purpose": "Unable to parse detailed analysis",
                "script_type": "Unknown",
                "quality_score": 5
            }
        
        return analysis_data
        
    except Exception as e:
        logger.error(f"OpenAI analysis error: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "PSScript AI Service",
        "version": "1.0.0",
        "status": "operational",
        "mode": "real"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        # Check database connection
        conn = get_db_connection()
        conn.close()
        db_status = "connected"
    except:
        db_status = "disconnected"
    
    # Check OpenAI connection
    try:
        # Make a simple test call
        response = client.models.list()
        ai_status = "connected"
    except:
        ai_status = "disconnected"
    
    return {
        "status": "healthy" if db_status == "connected" and ai_status == "connected" else "degraded",
        "database": db_status,
        "openai": ai_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/analyze", response_model=ScriptAnalysisResponse)
async def analyze_script(request: ScriptAnalysisRequest):
    """Analyze a PowerShell script"""
    try:
        logger.info(f"Analyzing script: {request.script_name or 'unnamed'}")
        
        # Perform analysis using OpenAI
        analysis = analyze_script_with_openai(request.script_content)
        
        # Add metadata
        analysis["script_id"] = request.script_id
        analysis["metadata"] = {
            "analysis_version": "1.0",
            "analysis_date": datetime.utcnow().isoformat(),
            "model_used": "o3-mini"
        }
        
        # Fill in any missing fields with defaults
        default_response = ScriptAnalysisResponse(
            script_id=request.script_id,
            summary=analysis.get("summary", "No summary available"),
            purpose=analysis.get("purpose", "Unknown"),
            script_type=analysis.get("script_type", "General"),
            estimated_runtime=analysis.get("estimated_runtime", "Unknown"),
            dependencies=analysis.get("dependencies", []),
            required_modules=analysis.get("required_modules", []),
            inputs=analysis.get("inputs", []),
            outputs=analysis.get("outputs", []),
            potential_risks=analysis.get("potential_risks", []),
            security_concerns=analysis.get("security_concerns", []),
            best_practices=analysis.get("best_practices", []),
            error_handling=analysis.get("error_handling", {"has_error_handling": False}),
            logging_capability=analysis.get("logging_capability", "None"),
            complexity_score=analysis.get("complexity_score", 5),
            readability_score=analysis.get("readability_score", 5),
            maintainability_score=analysis.get("maintainability_score", 5),
            quality_score=analysis.get("quality_score", 5),
            powershell_version=analysis.get("powershell_version", "5.1"),
            compatibility_notes=analysis.get("compatibility_notes", []),
            cmdlets_used=analysis.get("cmdlets_used", []),
            functions_defined=analysis.get("functions_defined", []),
            variables_used=analysis.get("variables_used", []),
            external_calls=analysis.get("external_calls", []),
            improvement_suggestions=analysis.get("improvement_suggestions", []),
            code_smells=analysis.get("code_smells", []),
            execution_flow=analysis.get("execution_flow", "Sequential"),
            parsed_content=analysis.get("parsed_content", {}),
            metadata=analysis.get("metadata", {})
        )
        
        return default_response
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embedding", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for text using OpenAI"""
    try:
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=request.text,
            dimensions=3072  # text-embedding-3-large has 3072 dimensions by default
        )
        
        embedding = response.data[0].embedding
        
        return EmbeddingResponse(
            embedding=embedding,
            model=response.model,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )
    except Exception as e:
        logger.error(f"Embedding generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-embeddings")
async def generate_embeddings(scripts: List[Dict[str, Any]]):
    """Generate embeddings for multiple scripts"""
    try:
        results = []
        
        for script in scripts:
            # Combine relevant text for embedding
            text = f"{script.get('name', '')} {script.get('description', '')} {script.get('content', '')}"
            
            # Generate embedding
            response = client.embeddings.create(
                model="text-embedding-3-large",
                input=text,
                dimensions=3072  # text-embedding-3-large has 3072 dimensions by default
            )
            
            embedding = response.data[0].embedding
            
            # Store in database
            conn = get_db_connection()
            cur = conn.cursor()
            
            try:
                cur.execute("""
                    INSERT INTO script_embeddings (script_id, embedding, embedding_model, embedding_dimensions, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (script_id) 
                    DO UPDATE SET 
                        embedding = EXCLUDED.embedding, 
                        embedding_model = EXCLUDED.embedding_model,
                        embedding_dimensions = EXCLUDED.embedding_dimensions,
                        updated_at = NOW()
                """, (script['id'], embedding, 'text-embedding-3-large', 3072))
                
                conn.commit()
                
                results.append({
                    "script_id": script['id'],
                    "success": True
                })
            except Exception as e:
                conn.rollback()
                results.append({
                    "script_id": script['id'],
                    "success": False,
                    "error": str(e)
                })
            finally:
                cur.close()
                conn.close()
        
        return {
            "total": len(scripts),
            "successful": sum(1 for r in results if r["success"]),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rag", response_model=RAGResponse)
async def retrieval_augmented_generation(request: RAGRequest):
    """RAG endpoint for PowerShell patterns and best practices"""
    try:
        import time
        start_time = time.time()
        
        # Generate embedding for the query
        query_embedding_response = client.embeddings.create(
            model="text-embedding-3-large",
            input=request.query,
            dimensions=3072
        )
        query_embedding = query_embedding_response.data[0].embedding
        
        # Search for relevant scripts using vector similarity
        conn = get_db_connection()
        cur = conn.cursor(RealDictCursor)
        
        # Find similar scripts and patterns
        cur.execute("""
            WITH ranked_scripts AS (
                SELECT 
                    s.id,
                    s.title,
                    s.description,
                    s.content,
                    s.category,
                    1 - (se.embedding <=> %s::vector) AS similarity,
                    s.created_at
                FROM scripts s
                JOIN script_embeddings se ON s.id = se.script_id
                WHERE se.embedding IS NOT NULL
                ORDER BY se.embedding <=> %s::vector
                LIMIT %s
            )
            SELECT * FROM ranked_scripts WHERE similarity > 0.5
        """, (query_embedding, query_embedding, request.limit * 2))
        
        similar_scripts = cur.fetchall()
        
        # Prepare context from similar scripts
        context_scripts = []
        for script in similar_scripts[:request.limit]:
            context_scripts.append({
                "title": script["title"],
                "description": script["description"],
                "content": script["content"][:500],  # Limit content length
                "similarity": script["similarity"]
            })
        
        # Generate response using GPT-4 with retrieved context
        system_prompt = """You are a PowerShell expert assistant. Use the provided script examples and patterns to answer questions about PowerShell best practices, patterns, and solutions. Always cite which example scripts you're referencing."""
        
        user_prompt = f"""Query: {request.query}

Additional Context: {request.context or 'None'}

Relevant PowerShell Script Examples:
{json.dumps(context_scripts, indent=2)}

Based on these examples and your knowledge, provide a comprehensive answer about PowerShell patterns and best practices related to the query."""
        
        response = client.chat.completions.create(
            model="o3-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_completion_tokens=1500
        )
        
        generated_response = response.choices[0].message.content
        
        # Prepare sources
        sources = [
            {
                "title": script["title"],
                "description": script["description"],
                "similarity_score": f"{script['similarity']:.2f}"
            }
            for script in similar_scripts[:request.limit]
        ]
        
        cur.close()
        conn.close()
        
        return RAGResponse(
            query=request.query,
            results=context_scripts,
            generated_response=generated_response,
            sources=sources
        )
        
    except Exception as e:
        logger.error(f"RAG error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/semantic-search", response_model=SemanticSearchResponse)
async def semantic_search(request: SemanticSearchRequest):
    """Semantic search for scripts using vector embeddings"""
    try:
        import time
        start_time = time.time()
        
        # Generate embedding for search query
        query_embedding_response = client.embeddings.create(
            model="text-embedding-3-large",
            input=request.query,
            dimensions=3072
        )
        query_embedding = query_embedding_response.data[0].embedding
        
        # Perform hybrid search (vector + text)
        conn = get_db_connection()
        cur = conn.cursor(RealDictCursor)
        
        # Use the hybrid search function
        category_filter = f"'{request.category}'" if request.category else "NULL"
        
        cur.execute(f"""
            SELECT * FROM hybrid_script_search(
                %s,  -- query_text
                %s::vector,  -- query_embedding
                %s,  -- limit
                0.3,  -- text_weight
                0.7,  -- vector_weight
                {category_filter}  -- category filter
            )
            WHERE vector_similarity >= %s OR text_rank > 0
        """, (request.query, query_embedding, request.limit, request.threshold))
        
        results = cur.fetchall()
        
        # Enrich results with full script data
        enriched_results = []
        for result in results:
            cur.execute("""
                SELECT s.*, se.embedding_model, se.embedding_dimensions
                FROM scripts s
                LEFT JOIN script_embeddings se ON s.id = se.script_id
                WHERE s.id = %s
            """, (result["id"],))
            
            full_script = cur.fetchone()
            if full_script:
                enriched_results.append({
                    "id": full_script["id"],
                    "title": full_script["title"],
                    "description": full_script["description"],
                    "category": full_script["category"],
                    "created_at": full_script["created_at"].isoformat() if full_script["created_at"] else None,
                    "similarity_score": result["vector_similarity"],
                    "text_score": result["text_rank"],
                    "combined_score": result["combined_score"]
                })
        
        cur.close()
        conn.close()
        
        search_time_ms = (time.time() - start_time) * 1000
        
        return SemanticSearchResponse(
            results=enriched_results,
            query_embedding_model="text-embedding-3-large",
            search_time_ms=search_time_ms
        )
        
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/similarity-search", response_model=SimilaritySearchResponse)
async def similarity_search(request: SimilaritySearchRequest):
    """Find similar scripts based on vector embeddings"""
    try:
        import time
        start_time = time.time()
        
        conn = get_db_connection()
        cur = conn.cursor(RealDictCursor)
        
        # Get the source script and its embedding
        cur.execute("""
            SELECT s.*, se.embedding
            FROM scripts s
            JOIN script_embeddings se ON s.id = se.script_id
            WHERE s.id = %s AND se.embedding IS NOT NULL
        """, (request.script_id,))
        
        source_script = cur.fetchone()
        if not source_script:
            raise HTTPException(status_code=404, detail="Script not found or missing embedding")
        
        # Find similar scripts
        cur.execute("""
            WITH similar AS (
                SELECT 
                    s.id,
                    s.title,
                    s.description,
                    s.category,
                    s.created_at,
                    1 - (se.embedding <=> %s::vector) AS similarity
                FROM scripts s
                JOIN script_embeddings se ON s.id = se.script_id
                WHERE s.id != %s AND se.embedding IS NOT NULL
                ORDER BY se.embedding <=> %s::vector
                LIMIT %s
            )
            SELECT * FROM similar WHERE similarity >= %s
        """, (
            source_script["embedding"], 
            request.script_id,
            source_script["embedding"],
            request.limit * 2,
            request.threshold
        ))
        
        similar_scripts = cur.fetchall()
        
        cur.close()
        conn.close()
        
        search_time_ms = (time.time() - start_time) * 1000
        
        # Format response
        formatted_similar = [
            {
                "id": script["id"],
                "title": script["title"],
                "description": script["description"],
                "category": script["category"],
                "similarity_score": round(script["similarity"], 4),
                "created_at": script["created_at"].isoformat() if script["created_at"] else None
            }
            for script in similar_scripts[:request.limit]
        ]
        
        return SimilaritySearchResponse(
            source_script={
                "id": source_script["id"],
                "title": source_script["title"],
                "description": source_script["description"],
                "category": source_script["category"]
            },
            similar_scripts=formatted_similar,
            search_time_ms=search_time_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similarity search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/embeddings/status")
async def embeddings_status():
    """Check the status of script embeddings"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(RealDictCursor)
        
        # Get statistics
        cur.execute("""
            SELECT 
                COUNT(DISTINCT s.id) as total_scripts,
                COUNT(DISTINCT se.script_id) as scripts_with_embeddings,
                COUNT(CASE WHEN se.embedding_model = 'text-embedding-3-large' THEN 1 END) as scripts_with_new_embeddings,
                COUNT(CASE WHEN se.embedding_model != 'text-embedding-3-large' OR se.embedding_model IS NULL THEN 1 END) as scripts_with_old_embeddings
            FROM scripts s
            LEFT JOIN script_embeddings se ON s.id = se.script_id
        """)
        
        stats = cur.fetchone()
        
        # Get scripts needing embeddings
        cur.execute("SELECT * FROM scripts_needing_embeddings() LIMIT 10")
        needs_update = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return {
            "total_scripts": stats["total_scripts"],
            "scripts_with_embeddings": stats["scripts_with_embeddings"],
            "scripts_with_new_model": stats["scripts_with_new_embeddings"],
            "scripts_needing_update": stats["total_scripts"] - stats["scripts_with_new_embeddings"],
            "embedding_model": "text-embedding-3-large",
            "embedding_dimensions": 3072,
            "sample_scripts_needing_update": needs_update
        }
        
    except Exception as e:
        logger.error(f"Embeddings status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None
    api_key: Optional[str] = None
    agent_type: Optional[str] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    usage: Optional[Dict[str, int]] = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint for conversational AI"""
    try:
        # Log request details for debugging
        logger.info(f"Chat request received with {len(request.messages)} messages")
        
        messages = [
            {"role": "system", "content": request.system_prompt or "You are a helpful PowerShell expert assistant."}
        ]
        
        # Convert ChatMessage objects to dict format for OpenAI
        for msg in request.messages:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        logger.info(f"Sending {len(messages)} messages to OpenAI")
        
        response = client.chat.completions.create(
            model="o3-mini",
            messages=messages,
            max_completion_tokens=500  # Reduced for faster responses
        )
        
        # Get the response content and ensure it's properly escaped
        response_content = response.choices[0].message.content
        
        # Log response for debugging
        logger.info(f"Received response from OpenAI: {len(response_content)} characters")
        
        # Ensure the response is a valid string (handle any escape issues)
        if response_content is None:
            response_content = "I apologize, but I couldn't generate a response. Please try again."
        
        return ChatResponse(
            response=response_content,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )
    except openai.APIError as e:
        logger.error(f"OpenAI API error: {e}")
        # Return a user-friendly error message
        return ChatResponse(
            response=f"I encountered an error while processing your request. Please try again. (Error: {type(e).__name__})",
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        )
    except Exception as e:
        logger.error(f"Chat error: {type(e).__name__}: {str(e)}")
        # Return a generic error response instead of raising HTTPException
        return ChatResponse(
            response="I apologize, but I encountered an unexpected error. Please try again later.",
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)