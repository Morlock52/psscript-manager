"""
PSScript Manager AI Service - Mock Version (no dependencies)
Fixed version to properly handle script ID 10 analysis
"""

import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import json
import logging
import re
from pathlib import Path

# Setup logging
# Ensure logs directory exists
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

# Create app
app = FastAPI(title="PSScript AI Service", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define data models
class ScriptAnalysisRequest(BaseModel):
    script_content: str = Field(..., description="PowerShell script content")
    script_id: Optional[int] = Field(None, description="Optional script ID from the database")
    script_name: Optional[str] = Field(None, description="Script name or identifier")
    analysis_type: str = Field("full", description="Type of analysis to perform")

class ScriptAnalysisResponse(BaseModel):
    analysis_id: str = Field(..., description="Unique analysis identifier")
    script_name: str = Field(..., description="Script name or identifier")
    analysis_summary: str = Field(..., description="Summary of the analysis")
    risk_score: float = Field(..., description="Risk score (0-100)")
    security_issues: List[Dict[str, Any]] = Field(..., description="Security issues found")
    recommendations: List[str] = Field(..., description="Recommendations for improvement")
    performance_insights: Optional[List[Dict[str, Any]]] = Field(None, description="Performance insights")

class VoiceSynthesisRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize into speech")
    voice_id: Optional[str] = Field(None, description="Voice ID to use")
    output_format: str = Field("mp3", description="Output audio format")

class VoiceSynthesisResponse(BaseModel):
    audio_data: str = Field(..., description="Base64-encoded audio data")
    format: str = Field(..., description="Audio format")
    duration: float = Field(..., description="Audio duration in seconds")
    text: str = Field(..., description="Text that was synthesized")

class VoiceRecognitionRequest(BaseModel):
    audio_data: str = Field(..., description="Base64-encoded audio data")
    language: str = Field("en-US", description="Language code")

class VoiceRecognitionResponse(BaseModel):
    text: str = Field(..., description="Recognized text")
    confidence: float = Field(..., description="Confidence score (0-1)")
    alternatives: Optional[List[Dict[str, Any]]] = Field(None, description="Alternative transcriptions")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "message": "PSScript AI Service is running"}

@app.post("/analyze")
async def analyze_script(request: ScriptAnalysisRequest):
    """
    Analyze a PowerShell script and provide insights.
    
    This endpoint uses enhanced mock data that matches the structure expected by the frontend.
    """
    logger.info(f"Analyzing script: {request.script_name or 'unnamed'} with ID: {request.script_id}")
    
    # Extract script content for more targeted analysis
    script_content = request.script_content
    
    # Determine if the script has parameters
    has_parameters = "param" in script_content
    has_functions = "function" in script_content
    has_error_handling = "try" in script_content or "catch" in script_content
    has_loops = "foreach" in script_content or "for " in script_content or "while" in script_content
    has_conditionals = "if " in script_content or "else" in script_content
    
    # Generate more realistic scores based on script content
    security_score = 7.5 if has_error_handling else 5.5
    code_quality_score = 8.0 if (has_functions and has_error_handling) else 6.0
    risk_score = 3.0 if has_error_handling else 5.5
    
    # Generate parameter docs if parameters are detected
    parameter_docs = {}
    if has_parameters:
        # Simple parameter extraction (not comprehensive)
        param_lines = script_content.split("param")[1].split("(")[1].split(")")[0].strip() if "param" in script_content else ""
        if "InputFile" in param_lines:
            parameter_docs["InputFile"] = {
                "type": "string",
                "description": "Path to the input file to process",
                "mandatory": True
            }
        if "OutputFolder" in param_lines:
            parameter_docs["OutputFolder"] = {
                "type": "string",
                "description": "Path to the output folder",
                "mandatory": False,
                "defaultValue": "./output"
            }
        if "Force" in param_lines:
            parameter_docs["Force"] = {
                "type": "switch",
                "description": "Force overwrite of existing files",
                "mandatory": False
            }
    
    # Generate command details
    command_details = []
    if "Get-" in script_content:
        command_details.append({
            "name": "Get-ChildItem",
            "description": "Gets the items and child items in one or more specified locations",
            "usage": "Used to list files and directories",
            "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem"
        })
    if "Write-" in script_content:
        command_details.append({
            "name": "Write-Host",
            "description": "Writes customized output to the host",
            "usage": "Used for displaying information to the user",
            "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-host"
        })
    if "Import-" in script_content:
        command_details.append({
            "name": "Import-Csv",
            "description": "Creates table-like custom objects from the items in a CSV file",
            "usage": "Used to import data from CSV files",
            "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/import-csv"
        })
    if "Export-" in script_content:
        command_details.append({
            "name": "Export-Csv",
            "description": "Converts objects into a series of comma-separated value (CSV) strings and saves them to a file",
            "usage": "Used to export data to CSV files",
            "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-csv"
        })
    
    # Generate MS Docs references
    ms_docs_references = []
    for cmd in command_details:
        ms_docs_references.append({
            "command": cmd["name"],
            "url": cmd["documentation_url"],
            "description": cmd["description"]
        })
    
    # Add general PowerShell references
    ms_docs_references.append({
        "command": "PowerShell Scripting",
        "url": "https://learn.microsoft.com/en-us/powershell/scripting/",
        "description": "PowerShell scripting guide and reference documentation"
    })
    
    # Generate optimization suggestions
    optimization_suggestions = []
    if not has_error_handling:
        optimization_suggestions.append("Add error handling with try/catch blocks for better reliability")
    if not has_functions and len(script_content) > 100:
        optimization_suggestions.append("Consider organizing code into functions for better maintainability")
    if "Write-Host" in script_content:
        optimization_suggestions.append("Consider using Write-Output instead of Write-Host for better pipeline compatibility")
    
    # Determine script purpose based on content
    purpose = "This script appears to "
    if "Import-Csv" in script_content and "Export-Csv" in script_content:
        purpose += "process CSV data, transforming it and saving the results."
    elif "Get-ChildItem" in script_content and "Remove-" in script_content:
        purpose += "manage files or directories, possibly cleaning up or organizing data."
    elif "Get-Service" in script_content or "Start-Service" in script_content:
        purpose += "manage Windows services, checking their status or controlling them."
    elif "Invoke-WebRequest" in script_content or "Invoke-RestMethod" in script_content:
        purpose += "interact with web services or APIs, retrieving or sending data."
    else:
        purpose += "perform system administration tasks with " + ("good" if has_error_handling else "basic") + " error handling."
    
    # --- Specific Analysis for Script ID 10 ---
    # This is a simplified analysis based on the known content of test_script.ps1
    script_id_str = str(request.script_id) if request.script_id else None
    
    if script_id_str == '10':
        logger.info("Generating specific mock analysis for script ID 10")
        purpose = "Processes files from an input path, removes empty lines, and saves the result to an output path. Includes basic error handling and verbose output."
        security_score = 7.0 # Good use of Test-Path, but throws errors
        code_quality_score = 7.5 # Has function, params, try/catch, verbose
        risk_score = 4.0 # Moderate risk due to file operations and potential errors
        
        parameter_docs = {
            "InputPath": {"type": "string", "description": "Mandatory path to the input directory.", "mandatory": True},
            "OutputPath": {"type": "string", "description": "Optional path for the output file.", "mandatory": False, "defaultValue": ".\\output.txt"},
            "Force": {"type": "switch", "description": "Switch to force overwrite of the output file.", "mandatory": False}
        }
        
        optimization_suggestions = [
            "Consider using `Set-StrictMode -Version Latest` for better error checking.",
            "The `Where-Object` could potentially be combined with `Get-Content` using `-ReadCount 0` for large files, but current approach is fine for smaller files.",
            "Error messages could be more specific (e.g., differentiate between path not found and access denied)."
        ]
        
        command_details = [
            {"name": "Test-Path", "description": "Determines whether all elements of a path exist.", "usage": "Used to check if input and output paths exist.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-path"},
            {"name": "Get-ChildItem", "description": "Gets the items and child items in one or more specified locations.", "usage": "Used to list files in the input directory.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem"},
            {"name": "Write-Verbose", "description": "Writes text to the verbose message stream.", "usage": "Used for detailed progress output.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/write-verbose"},
            {"name": "Get-Content", "description": "Gets the content of the item at the specified location.", "usage": "Used to read the content of each file.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content"},
            {"name": "Where-Object", "description": "Selects objects from a collection based on their property values.", "usage": "Used to filter out empty lines.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object"},
            {"name": "Out-File", "description": "Sends output to a file.", "usage": "Used to save the processed content.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/out-file"},
            {"name": "Write-Output", "description": "Sends the specified objects to the next command in the pipeline.", "usage": "Used to output completion message.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-output"},
            {"name": "Write-Error", "description": "Writes an object to the error stream.", "usage": "Used for reporting errors.", "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/write-error"}
        ]
        
        ms_docs_references = [
            {"command": cmd["name"], "url": cmd["documentation_url"], "description": cmd["description"]} for cmd in command_details
        ]
        ms_docs_references.append({
            "command": "about_Try_Catch_Finally",
            "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_try_catch_finally",
            "description": "Describes how to use the try, catch, and finally blocks to handle terminating errors."
        })

        security_issues = [
             {"id": "SEC002", "severity": "low", "description": "Script uses `throw` which generates terminating errors. Ensure calling scripts handle these.", "line_number": 20, "remediation": "Document error handling expectations or use Write-Error with -ErrorAction Stop."}
        ]
        best_practice_violations = [
            {"id": "BP001", "severity": "informational", "description": "Consider using full cmdlet names instead of aliases (e.g., `Where-Object` instead of `?` or `where`).", "line_number": 33, "remediation": "Use full cmdlet names for better readability."}
        ]
        performance_insights = [
             {"id": "PERF002", "description": "Reading entire file content with Get-Content might be memory-intensive for very large files.", "line_number": 30, "suggestion": "For very large files, consider processing line-by-line using `Get-Content -ReadCount` or `switch -File`."}
        ]

        return {
            "purpose": purpose,
            "security_score": security_score,
            "code_quality_score": code_quality_score,
            "risk_score": risk_score,
            "parameters": parameter_docs,
            "category": "File Processing",
            "category_id": 4,
            "optimization": optimization_suggestions,
            "command_details": command_details,
            "ms_docs_references": ms_docs_references,
            "security_analysis": "The script includes try/catch blocks for error handling and uses Test-Path for validation. Risk is moderate due to file system operations.",
            "security_issues": security_issues,
            "best_practice_violations": best_practice_violations,
            "performanceInsights": performance_insights
        }
    else:
        # --- Fallback Generic Analysis ---
        logger.info(f"Generating generic mock analysis for script: {request.script_name or 'unnamed'}")
        # Determine if the script has parameters
        has_parameters = "param(" in script_content.lower() # Case-insensitive check
        has_functions = "function " in script_content.lower()
        has_error_handling = "try {" in script_content.lower() or "catch {" in script_content.lower()
        has_loops = "foreach" in script_content.lower() or "for " in script_content.lower() or "while" in script_content.lower()
        has_conditionals = "if " in script_content.lower() or "else" in script_content.lower()

        # Generate more realistic scores based on script content
        security_score = 7.5 if has_error_handling else 5.5
        code_quality_score = 8.0 if (has_functions and has_error_handling) else 6.0
        risk_score = 3.0 if has_error_handling else 5.5

        # Generate parameter docs if parameters are detected
        parameter_docs = {}
        if has_parameters:
            # Simple parameter extraction (not comprehensive)
            try:
                param_block_match = re.search(r'param\s*\((.*?)\)', script_content, re.IGNORECASE | re.DOTALL)
                if param_block_match:
                    param_lines = param_block_match.group(1)
                    # Basic parsing - needs improvement for real scenarios
                    if "[string]$InputFile" in param_lines or "$InputFile" in param_lines: # More robust check
                        parameter_docs["InputFile"] = {
                            "type": "string",
                            "description": "Path to the input file to process",
                            "mandatory": "[Parameter(Mandatory=$true)]" in param_lines or "[Parameter(Mandatory = $true)]" in param_lines
                        }
                    if "[string]$OutputFolder" in param_lines or "$OutputFolder" in param_lines:
                         parameter_docs["OutputFolder"] = {
                            "type": "string",
                            "description": "Path to the output folder",
                            "mandatory": False, # Assume false unless specified
                            "defaultValue": "./output" if ' = "./output"' in param_lines else None
                        }
                    if "[switch]$Force" in param_lines or "$Force" in param_lines:
                        parameter_docs["Force"] = {
                            "type": "switch",
                            "description": "Force overwrite of existing files",
                            "mandatory": False
                        }
            except Exception as e:
                logger.warning(f"Could not parse parameters: {e}")


        # Generate command details (simple keyword check)
        command_details = []
        if "Get-ChildItem" in script_content:
            command_details.append({
                "name": "Get-ChildItem",
                "description": "Gets the items and child items in one or more specified locations",
                "usage": "Used to list files and directories",
                "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem"
            })
        if "Write-Host" in script_content:
             command_details.append({
                "name": "Write-Host",
                "description": "Writes customized output to the host",
                "usage": "Used for displaying information to the user",
                "documentation_url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-host"
            })
        # Add more command checks as needed...

        # Generate MS Docs references
        ms_docs_references = []
        for cmd in command_details:
            ms_docs_references.append({
                "command": cmd["name"],
                "url": cmd["documentation_url"],
                "description": cmd["description"]
            })
        ms_docs_references.append({
            "command": "PowerShell Scripting",
            "url": "https://learn.microsoft.com/en-us/powershell/scripting/",
            "description": "PowerShell scripting guide and reference documentation"
        })

        # Generate optimization suggestions
        optimization_suggestions = []
        if not has_error_handling:
            optimization_suggestions.append("Add error handling with try/catch blocks for better reliability")
        if not has_functions and len(script_content) > 100:
            optimization_suggestions.append("Consider organizing code into functions for better maintainability")
        if "Write-Host" in script_content:
            optimization_suggestions.append("Consider using Write-Output instead of Write-Host for better pipeline compatibility")

        # Determine script purpose based on content
        purpose = "This script appears to "
        if "Import-Csv" in script_content and "Export-Csv" in script_content:
            purpose += "process CSV data, transforming it and saving the results."
        elif "Get-ChildItem" in script_content and ("Remove-Item" in script_content or "Move-Item" in script_content):
             purpose += "manage files or directories, possibly cleaning up or organizing data."
        elif "Get-Service" in script_content or "Start-Service" in script_content:
            purpose += "manage Windows services, checking their status or controlling them."
        elif "Invoke-WebRequest" in script_content or "Invoke-RestMethod" in script_content:
            purpose += "interact with web services or APIs, retrieving or sending data."
        else:
            purpose += "perform system administration tasks with " + ("good" if has_error_handling else "basic") + " error handling."

        # Create a comprehensive analysis response
        return {
            "purpose": purpose,
            "security_score": security_score,
            "code_quality_score": code_quality_score,
            "risk_score": risk_score,
            "parameters": parameter_docs,
            "category": "Automation & DevOps" if "Import-Csv" in script_content else "System Administration",
            "category_id": 3 if "Import-Csv" in script_content else 1,
            "optimization": optimization_suggestions,
            "command_details": command_details,
            "ms_docs_references": ms_docs_references,
            "security_analysis": "Generic security analysis: Ensure proper error handling and input validation.",
            "security_issues": [],
            "best_practice_violations": [],
            "performanceInsights": []
        }


@app.post("/voice/synthesize", response_model=VoiceSynthesisResponse)
async def synthesize_speech(request: VoiceSynthesisRequest):
    """
    Mock endpoint for voice synthesis.
    """
    return {
        "audio_data": "base64mockdata==",
        "format": request.output_format,
        "duration": 2.5,
        "text": request.text
    }

@app.post("/voice/recognize", response_model=VoiceRecognitionResponse)
async def recognize_speech(request: VoiceRecognitionRequest):
    """
    Mock endpoint for speech recognition.
    """
    return {
        "text": "This is a mock transcription of the audio.",
        "confidence": 0.95,
        "alternatives": [
            {
                "text": "This is a mock transcription of the audio",
                "confidence": 0.93
            }
        ]
    }

@app.get("/models")
async def list_models():
    """List available AI models"""
    return {
        "models": [
            {
                "id": "gpt-4",
                "name": "GPT-4",
                "description": "Advanced model for script analysis and security evaluation",
                "capabilities": ["security-analysis", "performance-optimization", "code-explanation"]
            },
            {
                "id": "gpt-3.5-turbo",
                "name": "GPT-3.5 Turbo",
                "description": "Faster model suitable for basic script analysis",
                "capabilities": ["security-analysis", "code-explanation"]
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main_mock_fixed:app", host="0.0.0.0", port=8000, reload=True)
