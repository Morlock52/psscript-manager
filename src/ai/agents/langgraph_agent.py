"""
LangGraph Agent

This module implements an agent using LangGraph for explicit state management
and multi-actor workflows. It provides a structured approach to agent design
with explicit state transitions and error handling.
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable, TypedDict, Sequence

# LangGraph imports
from langgraph.graph import StateGraph, END
from langgraph.graph.nodes import ToolNode
from langgraph.checkpoint import MemorySaver

# LangChain imports
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.tools import BaseTool
from langchain.chat_models import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.callbacks.manager import CallbackManagerForToolRun
from langchain.pydantic_v1 import BaseModel, Field

# Local imports
from .base_agent import BaseAgent
from ..analysis.script_analyzer import ScriptAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("langgraph_agent")

# Define the state schema for the agent
class AgentState(TypedDict):
    """State schema for the LangGraph agent."""
    messages: List[Dict[str, str]]
    tools: List[Dict[str, str]]
    tool_results: List[Dict[str, Any]]
    current_plan: Optional[List[str]]
    working_memory: Dict[str, Any]
    errors: List[Dict[str, Any]]
    final_response: Optional[str]

class PowerShellAnalysisTool(BaseTool):
    """Tool for analyzing PowerShell scripts."""
    
    name = "powershell_analysis"
    description = "Analyze a PowerShell script to identify its purpose, security risks, and code quality"
    
    def _run(self, script_content: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        """
        Analyze a PowerShell script.
        
        Args:
            script_content: The content of the PowerShell script to analyze
            
        Returns:
            A detailed analysis of the script
        """
        try:
            # Use the ScriptAnalyzer to analyze the script
            script_analyzer = ScriptAnalyzer(use_cache=True)
            analysis = script_analyzer.analyze_script_content(script_content)
            
            # Format the analysis as a structured response
            response = {
                "purpose": analysis.get("purpose", "Unknown purpose"),
                "security_score": analysis.get("security_score", 5.0),
                "code_quality_score": analysis.get("code_quality_score", 5.0),
                "risk_score": analysis.get("risk_score", 5.0),
                "security_analysis": analysis.get("security_analysis", "No security analysis available"),
                "optimization": analysis.get("optimization", []),
                "parameters": analysis.get("parameters", {})
            }
            
            return json.dumps(response, indent=2)
        except Exception as e:
            logger.error(f"Error analyzing PowerShell script: {e}")
            return f"Error analyzing script: {str(e)}"

class SecurityAnalysisTool(BaseTool):
    """Tool for analyzing security aspects of PowerShell scripts."""
    
    name = "security_analysis"
    description = "Analyze a PowerShell script for security vulnerabilities, risks, and best practices"
    
    def _run(self, script_content: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        """
        Analyze a PowerShell script for security issues.
        
        Args:
            script_content: The content of the PowerShell script to analyze
            
        Returns:
            A detailed security analysis of the script
        """
        try:
            script_lower = script_content.lower()
            security_issues = []
            best_practices = []
            
            # Check for common security issues
            if "invoke-expression" in script_lower or "iex " in script_lower:
                security_issues.append("Uses Invoke-Expression which can lead to code injection vulnerabilities if input is not properly sanitized")
            
            if "convertto-securestring" in script_lower and "key" in script_lower and "plaintext" in script_lower:
                security_issues.append("Uses ConvertTo-SecureString with plaintext key, which is not secure for production environments")
            
            if "net.webclient" in script_lower and "downloadstring" in script_lower:
                security_issues.append("Downloads and executes content from the internet, which is a potential security risk")
            
            if "bypass" in script_lower and "executionpolicy" in script_lower:
                security_issues.append("Bypasses PowerShell execution policy, which is a security control")
            
            # Check for security best practices
            if "try" in script_lower and "catch" in script_lower:
                best_practices.append("Uses error handling with try/catch blocks")
            
            if "[cmdletbinding()]" in script_lower:
                best_practices.append("Uses CmdletBinding for advanced function features")
            
            if "param(" in script_lower and "validateset" in script_lower:
                best_practices.append("Uses parameter validation to restrict input values")
            
            # Generate security score
            base_score = 5.0
            score_adjustment = min(len(security_issues) * -0.5, -4.0) + min(len(best_practices) * 0.3, 2.0)
            security_score = max(1.0, min(10.0, base_score + score_adjustment))
            
            # Format the response
            response = {
                "security_score": round(security_score, 1),
                "security_issues": security_issues,
                "security_best_practices": best_practices,
                "recommendations": [
                    "Use parameter validation attributes to restrict input values",
                    "Implement proper error handling with try/catch blocks",
                    "Avoid using Invoke-Expression with user input",
                    "Use ShouldProcess for functions that make changes",
                    "Implement logging for security-relevant actions"
                ]
            }
            
            return json.dumps(response, indent=2)
        except Exception as e:
            logger.error(f"Error performing security analysis: {e}")
            return f"Error performing security analysis: {str(e)}"

class ScriptCategorizationTool(BaseTool):
    """Tool for categorizing PowerShell scripts."""
    
    name = "script_categorization"
    description = "Categorize a PowerShell script into predefined categories based on its purpose and functionality"
    
    def _run(self, script_content: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        """
        Categorize a PowerShell script.
        
        Args:
            script_content: The content of the PowerShell script to categorize
            
        Returns:
            The category of the script with explanation
        """
        try:
            # Define categories
            categories = {
                "System Administration": "Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring.",
                "Security & Compliance": "Scripts for security auditing, hardening, compliance checks, vulnerability scanning, and implementing security best practices.",
                "Automation & DevOps": "Scripts that automate repetitive tasks, create workflows, CI/CD pipelines, and streamline IT processes.",
                "Cloud Management": "Scripts for managing resources on Azure, AWS, GCP, and other cloud platforms, including provisioning and configuration.",
                "Network Management": "Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services.",
                "Data Management": "Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis tasks.",
                "Active Directory": "Scripts for managing Active Directory, user accounts, groups, permissions, and domain services.",
                "Monitoring & Diagnostics": "Scripts for system monitoring, logging, diagnostics, performance analysis, and alerting.",
                "Backup & Recovery": "Scripts for data backup, disaster recovery, system restore, and business continuity operations.",
                "Utilities & Helpers": "General-purpose utility scripts, helper functions, and reusable modules for various administrative tasks."
            }
            
            script_lower = script_content.lower()
            
            # Simple categorization logic based on keywords
            category_scores = {}
            
            # System Administration indicators
            if any(keyword in script_lower for keyword in ["get-service", "set-service", "restart-service", "get-process", "stop-process"]):
                category_scores["System Administration"] = category_scores.get("System Administration", 0) + 1
            
            # Security & Compliance indicators
            if any(keyword in script_lower for keyword in ["get-acl", "set-acl", "convertto-securestring", "get-credential", "security"]):
                category_scores["Security & Compliance"] = category_scores.get("Security & Compliance", 0) + 1
            
            # Automation & DevOps indicators
            if any(keyword in script_lower for keyword in ["workflow", "parallel", "foreach -parallel", "jenkins", "azure devops", "github"]):
                category_scores["Automation & DevOps"] = category_scores.get("Automation & DevOps", 0) + 1
            
            # Cloud Management indicators
            if any(keyword in script_lower for keyword in ["azure", "aws", "amazon", "gcp", "google cloud", "connect-azaccount"]):
                category_scores["Cloud Management"] = category_scores.get("Cloud Management", 0) + 1
            
            # Network Management indicators
            if any(keyword in script_lower for keyword in ["test-netconnection", "get-netadapter", "get-dnsclientcache", "ping", "tracert"]):
                category_scores["Network Management"] = category_scores.get("Network Management", 0) + 1
            
            # Data Management indicators
            if any(keyword in script_lower for keyword in ["invoke-sqlcmd", "export-csv", "import-csv", "convertto-json", "convertfrom-json"]):
                category_scores["Data Management"] = category_scores.get("Data Management", 0) + 1
            
            # Active Directory indicators
            if any(keyword in script_lower for keyword in ["get-aduser", "new-aduser", "get-adgroup", "add-adgroupmember", "active directory"]):
                category_scores["Active Directory"] = category_scores.get("Active Directory", 0) + 1
            
            # Monitoring & Diagnostics indicators
            if any(keyword in script_lower for keyword in ["get-counter", "get-eventlog", "get-winevent", "get-wmiobject", "get-ciminstance"]):
                category_scores["Monitoring & Diagnostics"] = category_scores.get("Monitoring & Diagnostics", 0) + 1
            
            # Backup & Recovery indicators
            if any(keyword in script_lower for keyword in ["backup", "restore", "copy-item", "compress-archive", "expand-archive"]):
                category_scores["Backup & Recovery"] = category_scores.get("Backup & Recovery", 0) + 1
            
            # Default to Utilities & Helpers if no clear category
            if not category_scores:
                category = "Utilities & Helpers"
                confidence = 0.5
            else:
                # Get the category with the highest score
                category = max(category_scores.items(), key=lambda x: x[1])[0]
                confidence = min(0.5 + (category_scores[category] * 0.1), 0.95)
            
            response = {
                "category": category,
                "confidence": confidence,
                "description": categories[category],
                "keywords_matched": category_scores.get(category, 0)
            }
            
            return json.dumps(response, indent=2)
        except Exception as e:
            logger.error(f"Error categorizing script: {e}")
            return f"Error categorizing script: {str(e)}"

class MSDocsReferenceTool(BaseTool):
    """Tool for finding Microsoft documentation references for PowerShell commands."""
    
    name = "ms_docs_reference"
    description = "Find Microsoft documentation references for PowerShell commands used in a script"
    
    def _run(self, script_content: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        """
        Find Microsoft documentation references for PowerShell commands.
        
        Args:
            script_content: The content of the PowerShell script to analyze
            
        Returns:
            A list of Microsoft documentation references for PowerShell commands
        """
        try:
            import re
            
            # Regular expression to find PowerShell commands
            command_pattern = r'((?:Get|Set|New|Remove|Add|Start|Stop|Import|Export|Install|Uninstall|Invoke|Test|Update|Write|Read|Format|Out|Select|Where|ForEach|Sort|Group|Measure|Compare|Find|Search|Convert|Join|Split|Copy|Move|Rename|Clear|Show|Hide|Enable|Disable|Suspend|Resume|Wait|Watch|Use|Enter|Exit|Push|Pop|Step|Continue|Break|Return|Throw|Try|Catch|Finally|Switch|If|Else|ElseIf|For|While|Do|Until|Begin|Process|End|Param|Function|Filter|Workflow|Configuration|Class|Enum|Interface|Namespace|Module|Assembly|Type|Property|Method|Constructor|Field|Event|Attribute|Variable|Constant|Parameter|Argument|Value|Object|Array|Collection|List|Dictionary|HashTable|Stack|Queue|Set|Map|Tree|Graph|Node|Edge|Vertex|Point|Line|Rectangle|Circle|Ellipse|Polygon|Path|Shape|Color|Font|Brush|Pen|Image|Bitmap|Icon|Cursor|Window|Form|Control|Button|TextBox|Label|CheckBox|RadioButton|ComboBox|ListBox|TreeView|ListView|DataGrid|DataTable|DataSet|DataRow|DataColumn|DataView|DataReader|DataAdapter|Connection|Command|Transaction|Parameter|Reader|Writer|Stream|File|Directory|Path|Uri|Url|WebClient|WebRequest|WebResponse|HttpClient|HttpRequest|HttpResponse|Socket|TcpClient|TcpListener|UdpClient|NetworkStream|IPAddress|IPEndPoint|DNS|Ping|TraceRoute|Telnet|SSH|FTP|SMTP|POP3|IMAP|LDAP|WMI|CIM|COM|DCOM|RPC|XML|JSON|CSV|HTML|CSS|JavaScript|PowerShell|Bash|CMD|SQL|RegEx|DateTime|TimeSpan|Timer|Stopwatch|Thread|Task|Process|Service|EventLog|Registry|Certificate|Credential|Identity|Principal|Role|Permission|Security|Encryption|Decryption|Hash|Signature|Key|Password|Token|Session|Cookie|Cache|Log|Trace|Debug|Info|Warn|Error|Fatal|Exception|Try|Catch|Finally|Throw|Assert|Test|Mock|Stub|Spy|Verify)-[A-Za-z]+)\b'
            
            commands_found = re.findall(command_pattern, script_content)
            unique_commands = list(set(commands_found))
            
            # Create MS Docs references for each command
            ms_docs_references = []
            for cmd in unique_commands:
                # Create a reference with a search URL
                search_url = f"https://learn.microsoft.com/en-us/search/?terms={cmd}&scope=PowerShell"
                ms_docs_references.append({
                    "command": cmd,
                    "url": search_url,
                    "description": f"Microsoft documentation for {cmd} PowerShell command"
                })
            
            response = {
                "commands_found": len(unique_commands),
                "references": ms_docs_references
            }
            
            return json.dumps(response, indent=2)
        except Exception as e:
            logger.error(f"Error finding documentation references: {e}")
            return f"Error finding documentation references: {str(e)}"

class LangGraphAgent(BaseAgent):
    """
    Agent implementation using LangGraph for explicit state management and multi-actor workflows.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the LangGraph agent.
        
        Args:
            api_key: OpenAI API key to use for the agent
        """
        super().__init__(api_key)
        
        # Initialize tools
        self.tools = [
            PowerShellAnalysisTool(),
            SecurityAnalysisTool(),
            ScriptCategorizationTool(),
            MSDocsReferenceTool()
        ]
        
        # Initialize tool executor
        self.tool_executor = self._create_tool_executor()
        
        # Initialize the LLM
        self.llm = ChatOpenAI(
            model="o3-mini",
            temperature=0.7,
            streaming=True,
            callbacks=[StreamingCallbackHandler()]
        )
        
        # Build the graph
        self.graph = self._build_graph()
        
        # Initialize memory saver for state persistence
        self.memory_saver = MemorySaver()
        
        logger.info("LangGraph agent initialized")
    
    def _create_tool_executor(self) -> Callable:
        """Create a tool executor for the agent."""
        def tool_executor(state: AgentState, tool_name: str, tool_input: str) -> Dict[str, Any]:
            """Execute a tool and return the result."""
            for tool in self.tools:
                if tool.name == tool_name:
                    try:
                        result = tool.run(tool_input)
                        return {"result": result}
                    except Exception as e:
                        logger.error(f"Error executing tool {tool_name}: {e}")
                        return {"error": str(e)}
            
            return {"error": f"Tool {tool_name} not found"}
        
        return tool_executor
    
    def _create_planner_node(self) -> Callable:
        """Create the planner node for the graph."""
        # Create the prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert PowerShell assistant that helps users analyze and improve their scripts.
Your task is to plan and execute a workflow to help the user with their PowerShell scripting needs.

You have access to the following tools:
- powershell_analysis: Analyze a PowerShell script to identify its purpose, security risks, and code quality
- security_analysis: Analyze a PowerShell script for security vulnerabilities, risks, and best practices
- script_categorization: Categorize a PowerShell script into predefined categories based on its purpose and functionality
- ms_docs_reference: Find Microsoft documentation references for PowerShell commands used in a script

Based on the user's request, create a plan to help them. If you need to use a tool, specify the tool name and input.
If you have all the information you need to respond to the user, provide a final response."""),
            MessagesPlaceholder(variable_name="messages"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create the agent
        agent = create_openai_tools_agent(self.llm, self.tools, prompt)
        
        # Create the planner node
        def planner(state: AgentState) -> Dict[str, Any]:
            """Plan the next steps based on the current state."""
            # Extract messages from state
            messages = state["messages"]
            
            # Check if we already have a final response
            if state.get("final_response"):
                return {"final_response": state["final_response"]}
            
            # Check if we have a current plan
            if not state.get("current_plan"):
                # Create a plan based on the messages
                working_memory = state.get("working_memory", {})
                working_memory["planning_stage"] = True
                
                # Generate a plan
                plan = [
                    "Understand the user's request",
                    "Determine which tools to use",
                    "Execute tools in appropriate order",
                    "Synthesize results into a coherent response",
                    "Provide the final response to the user"
                ]
                
                return {"current_plan": plan, "working_memory": working_memory}
            
            # Check if we have tool results
            tool_results = state.get("tool_results", [])
            
            # Create agent scratchpad
            agent_scratchpad = []
            for tool_result in tool_results:
                agent_scratchpad.append(AIMessage(content=tool_result.get("result", "")))
            
            # Invoke the agent
            result = agent.invoke({
                "messages": messages,
                "agent_scratchpad": agent_scratchpad
            })
            
            # Check if the agent wants to use a tool
            if "tool_calls" in result.additional_kwargs:
                tool_calls = result.additional_kwargs["tool_calls"]
                for tool_call in tool_calls:
                    tool_name = tool_call["function"]["name"]
                    tool_input = json.loads(tool_call["function"]["arguments"])["script_content"]
                    
                    return {
                        "next": "tool_executor",
                        "tool_name": tool_name,
                        "tool_input": tool_input
                    }
            
            # If no tool calls, we have a final response
            return {"next": "responder", "final_response": result.content}
        
        return planner
    
    def _create_responder_node(self) -> Callable:
        """Create the responder node for the graph."""
        def responder(state: AgentState) -> Dict[str, Any]:
            """Generate the final response based on the current state."""
            # Extract the final response from the state
            final_response = state.get("final_response")
            
            if not final_response:
                # If no final response, generate one based on tool results
                tool_results = state.get("tool_results", [])
                
                if tool_results:
                    # Combine tool results into a coherent response
                    response_parts = ["Here's what I found about your PowerShell script:"]
                    
                    for tool_result in tool_results:
                        result = tool_result.get("result", "")
                        try:
                            # Try to parse the result as JSON
                            result_json = json.loads(result)
                            
                            if "purpose" in result_json:
                                response_parts.append(f"\n## Purpose\n{result_json['purpose']}")
                            
                            if "security_score" in result_json:
                                response_parts.append(f"\n## Security Score\n{result_json['security_score']}/10")
                            
                            if "security_issues" in result_json:
                                response_parts.append("\n## Security Issues")
                                for issue in result_json["security_issues"]:
                                    response_parts.append(f"- {issue}")
                            
                            if "optimization" in result_json:
                                response_parts.append("\n## Optimization Suggestions")
                                for suggestion in result_json["optimization"]:
                                    response_parts.append(f"- {suggestion}")
                            
                            if "category" in result_json:
                                response_parts.append(f"\n## Category\n{result_json['category']}")
                                
                            if "references" in result_json:
                                response_parts.append("\n## Documentation References")
                                for ref in result_json["references"][:5]:  # Limit to 5 references
                                    response_parts.append(f"- [{ref['command']}]({ref['url']})")
                        except:
                            # If not JSON, just add the raw result
                            response_parts.append(f"\n{result}")
                    
                    final_response = "\n".join(response_parts)
                else:
                    final_response = "I don't have enough information to provide a response. Please provide a PowerShell script to analyze."
            
            return {"final_response": final_response}
        
        return responder
    
    def _create_error_handler_node(self) -> Callable:
        """Create the error handler node for the graph."""
        def error_handler(state: AgentState, error: Exception) -> Dict[str, Any]:
            """Handle errors that occur during tool execution."""
            # Log the error
            logger.error(f"Error during tool execution: {error}")
            
            # Add the error to the state
            errors = state.get("errors", [])
            errors.append({"error": str(error), "timestamp": time.time()})
            
            # Add a message about the error
            messages = state.get("messages", [])
            messages.append({"role": "system", "content": f"Error: {str(error)}. Please revise your plan and try again."})
            
            # Return the updated state
            return {"errors": errors, "messages": messages}
        
        return error_handler
    
    def _build_graph(self) -> StateGraph:
        """Build the agent workflow graph."""
        # Define the nodes
        planner = self._create_planner_node()
        tool_executor_node = ToolNode(self.tool_executor)
        responder = self._create_responder_node()
        error_handler = self._create_error_handler_node()
        
        # Create the graph
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("planner", planner)
        workflow.add_node("tool_executor", tool_executor_node)
        workflow.add_node("responder", responder)
        workflow.add_node("error_handler", error_handler)
        
        # Add edges
        workflow.add_edge("planner", "tool_executor")
        workflow.add_edge("tool_executor", "planner")
        workflow.add_edge("planner", "responder")
        workflow.add_edge("responder", END)
        
        # Add error handling
        workflow.add_edge_from_exception("tool_executor", "error_handler")
        workflow.add_edge("error_handler", "planner")
        
        # Set the entry point
        workflow.set_entry_point("planner")
        
        # Compile the graph
        return workflow.compile()
    
    async def process_message(self, messages: List[Dict[str, str]]) -> str:
        """
        Process a message using the LangGraph agent.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            
        Returns:
            The agent's response as a string
        """
        try:
            # Initialize the state
            initial_state: AgentState = {
                "messages": messages,
                "tools": [{"name": tool.name, "description": tool.description} for tool in self.tools],
                "tool_results": [],
                "current_plan": None,
                "working_memory": {},
                "errors": [],
                "final_response": None
            }
            
            # Run the graph
            for event in self.graph.stream(initial_state, checkpointer=self.memory_saver):
                if "final_response" in event:
                    return event["final_response"]
            
            # If we get here, something went wrong
            return "I apologize, but I couldn't process your request. Please try again."
            
        except Exception as e:
            logger.error(f"Error processing message with LangGraph agent: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    async def analyze_script(self, script_id: str, content: str, 
                            include_command_details: bool = False,
                            fetch_ms_docs: bool = False) -> Dict[str, Any]:
        """
        Analyze a PowerShell script using the LangGraph agent.
        
        Args:
            script_id: The ID of the script to analyze
            content: The content of the script
            include_command_details: Whether to include detailed command analysis
            fetch_ms_docs: Whether to fetch Microsoft documentation references
            
        Returns:
            A dictionary containing the analysis results
        """
        logger.info(f"Starting LangGraph analysis for script {script_id}")
        
        # Create a message for script analysis
        messages = [
            {"role": "system", "content": "You are an expert PowerShell script analyzer. Your task is to analyze the provided PowerShell script and extract key information about it."},
            {"role": "user", "content": f"""
            Analyze the following PowerShell script and provide a detailed report with the following sections:
            
            1. PURPOSE: Summarize what this script is designed to do in 1-2 sentences
            2. SECURITY_ANALYSIS: Identify potential security vulnerabilities or risks
            3. CODE_QUALITY: Evaluate code quality and best practices
            4. PARAMETERS: Identify and document all parameters, including types and purposes
            5. CATEGORY: Classify this script into an appropriate category
            6. OPTIMIZATION: Provide specific suggestions for improving the script
            7. RISK_ASSESSMENT: Evaluate the potential risk of executing this script
            
            Script content:
            ```powershell
            {content}
            ```
            """}
        ]
        
        # Initialize the state
        initial_state: AgentState = {
            "messages": messages,
            "tools": [{"name": tool.name, "description": tool.description} for tool in self.tools],
            "tool_results": [],
            "current_plan": None,
            "working_memory": {
                "script_id": script_id,
                "include_command_details": include_command_details,
                "fetch_ms_docs": fetch_ms_docs
            },
            "errors": [],
            "final_response": None
        }
        
        # Run the graph
        analysis_results = {}
        
        try:
            # Execute tools directly for script analysis
            powershell_analysis_result = self.tools[0].run(content)
            security_analysis_result = self.tools[1].run(content)
            categorization_result = self.tools[2].run(content)
            
            # Parse the results
            try:
                powershell_analysis = json.loads(powershell_analysis_result)
                security_analysis = json.loads(security_analysis_result)
                categorization = json.loads(categorization_result)
                
                # Combine the results
                analysis_results = {
                    "purpose": powershell_analysis.get("purpose", "Unknown purpose"),
                    "security_analysis": security_analysis.get("security_issues", []),
                    "security_score": security_analysis.get("security_score", 5.0),
                    "code_quality_score": powershell_analysis.get("code_quality_score", 5.0),
                    "parameters": powershell_analysis.get("parameters", {}),
                    "category": categorization.get("category", "Unknown"),
                    "category_id": None,  # This would be filled in by the backend
                    "optimization": powershell_analysis.get("optimization", []),
                    "risk_score": powershell_analysis.get("risk_score", 5.0)
                }
                
                # Add command details if requested
                if include_command_details:
                    # This would be a more detailed analysis of each command
                    analysis_results["command_details"] = []
                
                # Add MS Docs references if requested
                if fetch_ms_docs:
                    ms_docs_result = self.tools[3].run(content)
                    ms_docs = json.loads(ms_docs_result)
                    analysis_results["ms_docs_references"] = ms_docs.get("references", [])
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing analysis results: {e}")
                analysis_results = {
                    "purpose": "Error analyzing script",
                    "security_analysis": "Error analyzing script",
                    "security_score": 5.0,
                    "code_quality_score": 5.0,
                    "parameters": {},
                    "category": "Unknown",
                    "category_id": None,
                    "optimization": [],
                    "risk_score": 5.0
                }
            
            return analysis_results
        
        except Exception as e:
            logger.error(f"Error analyzing script: {e}")
            return {
                "purpose": f"Error analyzing script: {str(e)}",
                "security_analysis": "Error",
                "security_score": 5.0,
                "code_quality_score": 5.0,
                "parameters": {},
                "category": "Unknown",
                "category_id": None,
                "optimization": [],
                "risk_score": 5.0
            }
