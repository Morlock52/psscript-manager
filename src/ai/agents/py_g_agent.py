"""
Py-g Agent

This module implements an agent using Py-g for declarative agent design.
It provides a structured approach to building agents with a focus on
composability and reusability.
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable, Union, Tuple

# OpenAI imports
from openai import OpenAI

# Local imports
from .base_agent import BaseAgent
from ..analysis.script_analyzer import ScriptAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("py_g_agent")

class PyGAgent(BaseAgent):
    """
    Agent implementation using Py-g for declarative agent design.
    
    Py-g is a Python library for building agents with a focus on composability
    and reusability. It provides a declarative approach to agent design, allowing
    for more maintainable and testable agent implementations.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Py-g agent.
        
        Args:
            api_key: OpenAI API key to use for the agent
        """
        super().__init__(api_key)
        
        # Initialize OpenAI client
        self.client = OpenAI(api_key=self.api_key)
        
        # Initialize script analyzer
        self.script_analyzer = ScriptAnalyzer(use_cache=True)
        
        # Initialize agent state
        self.state = {
            "messages": [],
            "tools": [],
            "memory": {},
            "current_task": None,
            "task_queue": [],
            "completed_tasks": [],
            "errors": []
        }
        
        # Define agent capabilities
        self.capabilities = {
            "script_analysis": self._analyze_script,
            "security_analysis": self._security_analysis,
            "categorization": self._categorize_script,
            "documentation_lookup": self._documentation_lookup,
            "code_improvement": self._suggest_improvements,
            "error_handling": self._handle_error
        }
        
        logger.info("Py-g agent initialized")
    
    async def process_message(self, messages: List[Dict[str, str]]) -> str:
        """
        Process a message using the Py-g agent.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            
        Returns:
            The agent's response as a string
        """
        try:
            # Update agent state with new messages
            self.state["messages"] = messages
            
            # Extract the user's request from the last user message
            user_message = next((m for m in reversed(messages) if m["role"] == "user"), None)
            if not user_message:
                return "I couldn't find a user message to respond to."
            
            # Plan tasks based on the user's request
            tasks = self._plan_tasks(user_message["content"])
            self.state["task_queue"] = tasks
            
            # Execute tasks
            results = []
            for task in tasks:
                task_name, task_args = task
                if task_name in self.capabilities:
                    try:
                        result = await self.capabilities[task_name](**task_args)
                        results.append(result)
                        self.state["completed_tasks"].append(task)
                    except Exception as e:
                        error_result = await self.capabilities["error_handling"](
                            error=str(e),
                            task=task_name,
                            args=task_args
                        )
                        results.append(error_result)
                        self.state["errors"].append({
                            "task": task_name,
                            "args": task_args,
                            "error": str(e)
                        })
            
            # Generate response based on task results
            response = self._generate_response(results)
            return response
            
        except Exception as e:
            logger.error(f"Error processing message with Py-g agent: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    def _plan_tasks(self, user_request: str) -> List[Tuple[str, Dict[str, Any]]]:
        """
        Plan tasks based on the user's request.
        
        Args:
            user_request: The user's request
            
        Returns:
            A list of tasks to execute, where each task is a tuple of
            (task_name, task_args)
        """
        # Check if the request contains a PowerShell script
        if "```powershell" in user_request or "```ps1" in user_request:
            # Extract the script content
            script_content = self._extract_script(user_request)
            
            # Plan tasks for script analysis
            return [
                ("script_analysis", {"content": script_content}),
                ("security_analysis", {"content": script_content}),
                ("categorization", {"content": script_content}),
                ("code_improvement", {"content": script_content})
            ]
        else:
            # For general PowerShell questions, just use the LLM
            return [
                ("documentation_lookup", {"query": user_request})
            ]
    
    def _extract_script(self, text: str) -> str:
        """
        Extract PowerShell script from text.
        
        Args:
            text: Text containing a PowerShell script
            
        Returns:
            The extracted script content
        """
        # Look for PowerShell code blocks
        if "```powershell" in text:
            parts = text.split("```powershell")
            if len(parts) > 1:
                code_part = parts[1].split("```")[0]
                return code_part.strip()
        
        # Look for PS1 code blocks
        if "```ps1" in text:
            parts = text.split("```ps1")
            if len(parts) > 1:
                code_part = parts[1].split("```")[0]
                return code_part.strip()
        
        # If no code blocks found, return the original text
        return text
    
    def _generate_response(self, results: List[Dict[str, Any]]) -> str:
        """
        Generate a response based on task results.
        
        Args:
            results: List of task results
            
        Returns:
            The generated response
        """
        # Combine results into a coherent response
        if not results:
            return "I couldn't analyze your request. Please provide a PowerShell script or a specific question."
        
        # Start with a header
        response_parts = ["Here's my analysis:"]
        
        # Add each result section
        for result in results:
            if "section" in result and "content" in result:
                response_parts.append(f"\n## {result['section']}")
                
                if isinstance(result["content"], list):
                    # For lists (like suggestions or issues)
                    for item in result["content"]:
                        response_parts.append(f"- {item}")
                else:
                    # For text content
                    response_parts.append(result["content"])
        
        # Join all parts
        return "\n".join(response_parts)
    
    async def _analyze_script(self, content: str) -> Dict[str, Any]:
        """
        Analyze a PowerShell script.
        
        Args:
            content: The content of the PowerShell script
            
        Returns:
            Analysis results
        """
        try:
            # Use the script analyzer to analyze the script
            analysis = self.script_analyzer.analyze_script_content(content)
            
            return {
                "section": "Script Analysis",
                "content": f"Purpose: {analysis.get('purpose', 'Unknown purpose')}\n\n"
                          f"Code Quality Score: {analysis.get('code_quality_score', 5.0)}/10"
            }
        except Exception as e:
            logger.error(f"Error analyzing script: {e}")
            return {
                "section": "Script Analysis",
                "content": f"Error analyzing script: {str(e)}"
            }
    
    async def _security_analysis(self, content: str) -> Dict[str, Any]:
        """
        Perform security analysis on a PowerShell script.
        
        Args:
            content: The content of the PowerShell script
            
        Returns:
            Security analysis results
        """
        try:
            # Analyze script for security issues
            security_issues = []
            script_lower = content.lower()
            
            # Check for common security issues
            if "invoke-expression" in script_lower or "iex " in script_lower:
                security_issues.append("Uses Invoke-Expression which can lead to code injection vulnerabilities if input is not properly sanitized")
            
            if "convertto-securestring" in script_lower and "key" in script_lower and "plaintext" in script_lower:
                security_issues.append("Uses ConvertTo-SecureString with plaintext key, which is not secure for production environments")
            
            if "net.webclient" in script_lower and "downloadstring" in script_lower:
                security_issues.append("Downloads and executes content from the internet, which is a potential security risk")
            
            if "bypass" in script_lower and "executionpolicy" in script_lower:
                security_issues.append("Bypasses PowerShell execution policy, which is a security control")
            
            # Calculate security score
            base_score = 5.0
            score_adjustment = min(len(security_issues) * -0.5, -4.0)
            security_score = max(1.0, min(10.0, base_score + score_adjustment))
            
            return {
                "section": "Security Analysis",
                "content": [
                    f"Security Score: {security_score}/10",
                    *security_issues
                ] if security_issues else [
                    f"Security Score: {security_score}/10",
                    "No significant security issues detected."
                ]
            }
        except Exception as e:
            logger.error(f"Error performing security analysis: {e}")
            return {
                "section": "Security Analysis",
                "content": f"Error performing security analysis: {str(e)}"
            }
    
    async def _categorize_script(self, content: str) -> Dict[str, Any]:
        """
        Categorize a PowerShell script.
        
        Args:
            content: The content of the PowerShell script
            
        Returns:
            Categorization results
        """
        try:
            # Define categories
            categories = {
                "System Administration": ["get-service", "set-service", "restart-service", "get-process", "stop-process"],
                "Security & Compliance": ["get-acl", "set-acl", "convertto-securestring", "get-credential", "security"],
                "Automation & DevOps": ["workflow", "parallel", "foreach -parallel", "jenkins", "azure devops", "github"],
                "Cloud Management": ["azure", "aws", "amazon", "gcp", "google cloud", "connect-azaccount"],
                "Network Management": ["test-netconnection", "get-netadapter", "get-dnsclientcache", "ping", "tracert"],
                "Data Management": ["invoke-sqlcmd", "export-csv", "import-csv", "convertto-json", "convertfrom-json"],
                "Active Directory": ["get-aduser", "new-aduser", "get-adgroup", "add-adgroupmember", "active directory"],
                "Monitoring & Diagnostics": ["get-counter", "get-eventlog", "get-winevent", "get-wmiobject", "get-ciminstance"],
                "Backup & Recovery": ["backup", "restore", "copy-item", "compress-archive", "expand-archive"],
                "Utilities & Helpers": []  # Default category
            }
            
            script_lower = content.lower()
            
            # Score each category based on keyword matches
            category_scores = {}
            for category, keywords in categories.items():
                score = sum(1 for keyword in keywords if keyword in script_lower)
                if score > 0:
                    category_scores[category] = score
            
            # Get the category with the highest score, or default to Utilities & Helpers
            if category_scores:
                category = max(category_scores.items(), key=lambda x: x[1])[0]
                confidence = min(0.5 + (category_scores[category] * 0.1), 0.95)
            else:
                category = "Utilities & Helpers"
                confidence = 0.5
            
            return {
                "section": "Script Category",
                "content": f"{category} (Confidence: {confidence:.0%})"
            }
        except Exception as e:
            logger.error(f"Error categorizing script: {e}")
            return {
                "section": "Script Category",
                "content": "Error categorizing script"
            }
    
    async def _documentation_lookup(self, query: str) -> Dict[str, Any]:
        """
        Look up documentation for PowerShell commands.
        
        Args:
            query: The query to look up
            
        Returns:
            Documentation lookup results
        """
        try:
            # Use the OpenAI API to get documentation information
            response = self.client.chat.completions.create(
                model="o3-mini",
                messages=[
                    {"role": "system", "content": "You are a PowerShell documentation expert. Provide concise, accurate information about PowerShell commands, concepts, and best practices."},
                    {"role": "user", "content": query}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return {
                "section": "PowerShell Information",
                "content": response.choices[0].message.content
            }
        except Exception as e:
            logger.error(f"Error looking up documentation: {e}")
            return {
                "section": "PowerShell Information",
                "content": f"Error looking up documentation: {str(e)}"
            }
    
    async def _suggest_improvements(self, content: str) -> Dict[str, Any]:
        """
        Suggest improvements for a PowerShell script.
        
        Args:
            content: The content of the PowerShell script
            
        Returns:
            Improvement suggestions
        """
        try:
            # Use the OpenAI API to get improvement suggestions
            response = self.client.chat.completions.create(
                model="o3-mini",
                messages=[
                    {"role": "system", "content": "You are a PowerShell expert. Analyze the provided script and suggest specific improvements for better performance, readability, security, and adherence to best practices. Provide concise, actionable suggestions."},
                    {"role": "user", "content": f"Suggest improvements for this PowerShell script:\n\n```powershell\n{content}\n```"}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            # Extract suggestions from the response
            suggestions_text = response.choices[0].message.content
            
            # Parse suggestions into a list
            suggestions = []
            for line in suggestions_text.split("\n"):
                line = line.strip()
                if line and (line.startswith("-") or line.startswith("*") or line.startswith("•")):
                    suggestions.append(line[1:].strip())
                elif line and len(suggestions) > 0 and not line.startswith("#"):
                    # Append to the last suggestion if it's a continuation
                    suggestions[-1] += " " + line
            
            # If no suggestions were parsed, use the whole text
            if not suggestions:
                suggestions = [suggestions_text]
            
            return {
                "section": "Improvement Suggestions",
                "content": suggestions
            }
        except Exception as e:
            logger.error(f"Error suggesting improvements: {e}")
            return {
                "section": "Improvement Suggestions",
                "content": ["Error generating improvement suggestions"]
            }
    
    async def _handle_error(self, error: str, task: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle errors that occur during task execution.
        
        Args:
            error: The error message
            task: The task that failed
            args: The arguments to the task
            
        Returns:
            Error handling results
        """
        logger.error(f"Error in task {task}: {error}")
        
        return {
            "section": f"Error in {task}",
            "content": f"An error occurred: {error}"
        }
    
    async def analyze_script(self, script_id: str, content: str, 
                           include_command_details: bool = False,
                           fetch_ms_docs: bool = False) -> Dict[str, Any]:
        """
        Analyze a PowerShell script using the Py-g agent.
        
        Args:
            script_id: The ID of the script to analyze
            content: The content of the script
            include_command_details: Whether to include detailed command analysis
            fetch_ms_docs: Whether to fetch Microsoft documentation references
            
        Returns:
            A dictionary containing the analysis results
        """
        logger.info(f"Starting Py-g analysis for script {script_id}")
        
        try:
            # Execute analysis tasks
            script_analysis = await self._analyze_script(content)
            security_analysis = await self._security_analysis(content)
            categorization = await self._categorize_script(content)
            improvement_suggestions = await self._suggest_improvements(content)
            
            # Extract data from task results
            purpose = script_analysis.get("content", "").replace("Purpose: ", "").split("\n")[0]
            
            security_content = security_analysis.get("content", [])
            security_score = 5.0
            security_issues = []
            
            if isinstance(security_content, list) and len(security_content) > 0:
                # Extract security score from the first item
                score_text = security_content[0]
                if "Security Score:" in score_text:
                    try:
                        security_score = float(score_text.split(":")[1].split("/")[0].strip())
                    except (ValueError, IndexError):
                        security_score = 5.0
                
                # Extract security issues from the remaining items
                security_issues = security_content[1:] if len(security_content) > 1 else []
            
            # Extract category
            category = "Unknown"
            if "content" in categorization:
                category_text = categorization["content"]
                if isinstance(category_text, str) and "(" in category_text:
                    category = category_text.split("(")[0].strip()
            
            # Extract improvement suggestions
            optimization = []
            if "content" in improvement_suggestions:
                suggestions = improvement_suggestions["content"]
                if isinstance(suggestions, list):
                    optimization = suggestions
            
            # Combine results
            analysis_results = {
                "purpose": purpose,
                "security_analysis": security_issues,
                "security_score": security_score,
                "code_quality_score": 7.0,  # Default value
                "parameters": {},  # Would need more detailed analysis
                "category": category,
                "category_id": None,  # This would be filled in by the backend
                "optimization": optimization,
                "risk_score": 10 - security_score if security_score <= 10 else 5.0
            }
            
            # Add command details if requested
            if include_command_details:
                # This would be a more detailed analysis of each command
                analysis_results["command_details"] = []
            
            # Add MS Docs references if requested
            if fetch_ms_docs:
                # This would fetch documentation references
                analysis_results["ms_docs_references"] = []
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"Error analyzing script: {e}")
            return {
                "purpose": f"Error analyzing script: {str(e)}",
                "security_analysis": [],
                "security_score": 5.0,
                "code_quality_score": 5.0,
                "parameters": {},
                "category": "Unknown",
                "category_id": None,
                "optimization": [],
                "risk_score": 5.0
            }
