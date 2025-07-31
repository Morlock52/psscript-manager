"""
Example of instrumented script analyzer with custom metrics and traces
"""
import time
from typing import Dict, Any, Optional
from opentelemetry import trace
from telemetry.tracing import create_script_analysis_span, create_ai_operation_span, add_span_attributes
from telemetry.metrics import (
    record_script_analysis,
    record_embedding_generation,
    record_ai_api_request,
    AnalysisTimer,
    EmbeddingTimer
)

tracer = trace.get_tracer("psscript.ai.analyzer", "1.0.0")

class InstrumentedScriptAnalyzer:
    """Script analyzer with OpenTelemetry instrumentation"""
    
    async def analyze_script(self, script_content: str, script_name: str) -> Dict[str, Any]:
        """Analyze a PowerShell script with full telemetry"""
        
        # Start analysis timer context
        with AnalysisTimer() as timer:
            # Create main analysis span
            with create_script_analysis_span(script_name, len(script_content)) as span:
                try:
                    # Parse script
                    parsing_result = await self._parse_script(script_content)
                    
                    # Generate embeddings
                    embeddings = await self._generate_embeddings(script_content)
                    
                    # Perform security analysis
                    security_analysis = await self._analyze_security(parsing_result)
                    
                    # Calculate complexity
                    complexity_score = await self._calculate_complexity(parsing_result)
                    
                    # Generate recommendations
                    recommendations = await self._generate_recommendations(
                        security_analysis,
                        complexity_score
                    )
                    
                    # Add analysis results to span
                    add_span_attributes(
                        security_score=security_analysis['score'],
                        complexity_score=complexity_score,
                        recommendation_count=len(recommendations),
                        has_vulnerabilities=security_analysis['has_vulnerabilities']
                    )
                    
                    # Record metrics
                    record_script_analysis(
                        status="success",
                        duration=timer.__exit__(None, None, None),
                        complexity=complexity_score,
                        security=security_analysis['score']
                    )
                    
                    return {
                        "script_name": script_name,
                        "security_analysis": security_analysis,
                        "complexity_score": complexity_score,
                        "recommendations": recommendations,
                        "embeddings": embeddings
                    }
                    
                except Exception as e:
                    # Record failure
                    record_script_analysis(
                        status="failure",
                        duration=timer.__exit__(None, None, None)
                    )
                    raise
    
    async def _parse_script(self, script_content: str) -> Dict[str, Any]:
        """Parse PowerShell script with tracing"""
        with tracer.start_as_current_span("parse_script") as span:
            span.set_attribute("script.length", len(script_content))
            
            # Parsing logic here
            result = {
                "commands": ["Get-Process", "Set-Location"],
                "functions": ["Test-Function"],
                "variables": ["$path", "$result"]
            }
            
            span.set_attribute("command_count", len(result["commands"]))
            span.set_attribute("function_count", len(result["functions"]))
            span.set_attribute("variable_count", len(result["variables"]))
            
            return result
    
    async def _generate_embeddings(self, text: str) -> list:
        """Generate embeddings with telemetry"""
        with EmbeddingTimer() as timer:
            with create_ai_operation_span("generate_embeddings", "text-embedding-ada-002") as span:
                start_time = time.time()
                
                try:
                    # Simulate API call to OpenAI
                    embeddings = await self._call_openai_api(text)
                    
                    duration = time.time() - start_time
                    
                    # Record metrics
                    record_embedding_generation(
                        text_type="script",
                        duration=duration,
                        token_count=len(text.split())  # Approximate
                    )
                    
                    record_ai_api_request(
                        provider="openai",
                        model="text-embedding-ada-002",
                        operation="embedding",
                        status="success",
                        duration=duration,
                        tokens=len(text.split())
                    )
                    
                    return embeddings
                    
                except Exception as e:
                    duration = time.time() - start_time
                    record_ai_api_request(
                        provider="openai",
                        model="text-embedding-ada-002",
                        operation="embedding",
                        status="failure",
                        duration=duration
                    )
                    raise
    
    async def _analyze_security(self, parsing_result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze security with detailed tracing"""
        with tracer.start_as_current_span("security_analysis") as span:
            # Check for dangerous commands
            dangerous_commands = self._check_dangerous_commands(parsing_result["commands"])
            span.set_attribute("dangerous_command_count", len(dangerous_commands))
            
            # Check for vulnerabilities
            vulnerabilities = self._check_vulnerabilities(parsing_result)
            span.set_attribute("vulnerability_count", len(vulnerabilities))
            
            # Calculate security score
            score = 100 - (len(dangerous_commands) * 10) - (len(vulnerabilities) * 15)
            score = max(0, min(100, score))
            
            span.set_attribute("security_score", score)
            
            return {
                "score": score,
                "dangerous_commands": dangerous_commands,
                "vulnerabilities": vulnerabilities,
                "has_vulnerabilities": len(vulnerabilities) > 0
            }
    
    async def _calculate_complexity(self, parsing_result: Dict[str, Any]) -> float:
        """Calculate complexity score with tracing"""
        with tracer.start_as_current_span("complexity_calculation") as span:
            # Simple complexity calculation
            command_complexity = len(parsing_result["commands"]) * 2
            function_complexity = len(parsing_result["functions"]) * 5
            variable_complexity = len(parsing_result["variables"]) * 1
            
            total_complexity = command_complexity + function_complexity + variable_complexity
            
            # Normalize to 0-100 scale
            complexity_score = min(100, total_complexity * 2)
            
            span.set_attributes({
                "command_complexity": command_complexity,
                "function_complexity": function_complexity,
                "variable_complexity": variable_complexity,
                "total_complexity": complexity_score
            })
            
            return complexity_score
    
    async def _generate_recommendations(
        self,
        security_analysis: Dict[str, Any],
        complexity_score: float
    ) -> list:
        """Generate recommendations with AI assistance"""
        with create_ai_operation_span("generate_recommendations", "gpt-4") as span:
            recommendations = []
            
            # Security recommendations
            if security_analysis["score"] < 70:
                recommendations.append({
                    "type": "security",
                    "severity": "high",
                    "message": "Consider reviewing security practices"
                })
            
            # Complexity recommendations
            if complexity_score > 70:
                recommendations.append({
                    "type": "complexity",
                    "severity": "medium",
                    "message": "Consider refactoring to reduce complexity"
                })
            
            span.set_attribute("recommendation_count", len(recommendations))
            
            return recommendations
    
    def _check_dangerous_commands(self, commands: list) -> list:
        """Check for dangerous PowerShell commands"""
        dangerous = ["Invoke-Expression", "Start-Process", "Remove-Item"]
        return [cmd for cmd in commands if cmd in dangerous]
    
    def _check_vulnerabilities(self, parsing_result: Dict[str, Any]) -> list:
        """Check for common vulnerabilities"""
        vulnerabilities = []
        
        # Example vulnerability checks
        if "Invoke-Expression" in parsing_result["commands"]:
            vulnerabilities.append({
                "type": "injection",
                "severity": "high",
                "description": "Potential code injection vulnerability"
            })
        
        return vulnerabilities
    
    async def _call_openai_api(self, text: str) -> list:
        """Simulate OpenAI API call"""
        # In real implementation, this would call the actual API
        await asyncio.sleep(0.1)  # Simulate network delay
        return [0.1] * 1536  # Mock embedding vector