"""
OpenAI Assistant Agent

This module implements an agent based on OpenAI's Assistants API, which provides
powerful agentic capabilities including function calling, retrieval, code interpretation,
and thread management.
"""

import os
import json
import logging
import asyncio
import time
import backoff
from typing import Dict, List, Any, Optional, Union, Tuple
import uuid

from openai import OpenAI, AsyncOpenAI
from openai.types.beta.threads import Run, ThreadMessage
from openai.types.beta.assistant import Assistant

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openai_assistant_agent")

# Constants for retry configuration
MAX_RETRIES = 5
MAX_RETRY_DELAY = 60  # Maximum retry delay in seconds

class OpenAIAssistantAgent:
    """
    An agent implementation based on OpenAI's Assistants API.
    This provides advanced agentic capabilities including:
    - Function calling
    - Retrieval augmentation
    - Code interpreter
    - Thread management for persistent conversations
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o",
        name: str = "PSScript Assistant",
        description: str = "PowerShell script analysis assistant with expertise in security, optimization, and best practices",
        instructions: Optional[str] = None,
        tools: Optional[List[str]] = None,
        file_ids: Optional[List[str]] = None,
        metadata: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize the OpenAI Assistant Agent.
        
        Args:
            api_key: OpenAI API key
            model: Model to use for the assistant (e.g., gpt-4o, gpt-4-turbo)
            name: Name of the assistant
            description: Description of the assistant
            instructions: Detailed instructions for the assistant
            tools: List of tools to enable (code_interpreter, retrieval, function)
            file_ids: List of file IDs to attach to the assistant
            metadata: Optional metadata for the assistant
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        # Initialize OpenAI clients with timeout and max_retries
        self.client = OpenAI(
            api_key=self.api_key,
            timeout=60.0,  # 60 second timeout
            max_retries=3  # Built-in retry mechanism
        )
        self.async_client = AsyncOpenAI(
            api_key=self.api_key,
            timeout=60.0,
            max_retries=3
        )
        
        # Set default tools if not provided
        self.tools = tools or ["code_interpreter"]
        
        # Convert tools to the format expected by the API
        self.api_tools = [{"type": tool} for tool in self.tools]
        
        # Set default instructions if not provided
        self.default_instructions = """
        You are PSScriptGPT, a specialized PowerShell expert assistant with agentic capabilities.
        
        Your expertise:
        1. PowerShell scripting best practices and conventions
        2. Security analysis and risk assessment for PowerShell scripts
        3. Script optimization and performance improvement
        4. Documentation and explanation of script functionality
        5. Categorization of scripts based on their purpose and use case
        
        When analyzing scripts:
        - Identify the main purpose and functionality
        - Evaluate security risks and potential vulnerabilities
        - Assess code quality and suggest improvements
        - Provide detailed explanations of complex sections
        - Reference relevant Microsoft documentation when appropriate
        
        Your responses should be:
        - Clear, concise, and technically accurate
        - Focused on practical, actionable information
        - Supportive of best practices and security guidelines
        - Tailored to both beginners and experienced PowerShell users
        
        Use the code interpreter tool to analyze and test scripts when appropriate.
        """
        
        self.instructions = instructions or self.default_instructions
        self.name = name
        self.description = description
        self.model = model
        self.file_ids = file_ids or []
        self.metadata = metadata or {"type": "powershell_expert", "version": "2.0"}
        
        # Assistant ID will be set when created or retrieved
        self.assistant_id = None
        
        # Thread IDs mapped to user sessions
        self.thread_map = {}
        
        # Connection status
        self.is_connected = False
        
        # Create or retrieve the assistant
        self._initialize_assistant()
        
        logger.info(f"OpenAI Assistant Agent initialized with model {model}")
    
    @backoff.on_exception(
        backoff.expo,
        (Exception),
        max_tries=MAX_RETRIES,
        max_value=MAX_RETRY_DELAY,
        on_backoff=lambda details: logger.warning(
            f"Retrying assistant initialization after error. Attempt {details['tries']}/{MAX_RETRIES}"
        )
    )
    def _initialize_assistant(self) -> None:
        """
        Create a new assistant or retrieve an existing one.
        Uses exponential backoff for retries on failure.
        """
        try:
            # Check if assistant ID is provided in environment variables
            env_assistant_id = os.environ.get("OPENAI_ASSISTANT_ID")
            if env_assistant_id:
                try:
                    # Try to retrieve the existing assistant
                    assistant = self.client.beta.assistants.retrieve(env_assistant_id)
                    self.assistant_id = assistant.id
                    logger.info(f"Using assistant from environment: {self.assistant_id}")
                    
                    # Update the assistant with latest configuration
                    self.client.beta.assistants.update(
                        assistant_id=self.assistant_id,
                        description=self.description,
                        instructions=self.instructions,
                        tools=self.api_tools,
                        file_ids=self.file_ids,
                        metadata=self.metadata
                    )
                    logger.info(f"Updated assistant: {self.assistant_id}")
                    self.is_connected = True
                    return
                except Exception as e:
                    logger.warning(f"Could not use assistant ID from environment: {e}")
                    # Continue to create or find another assistant
            
            # List existing assistants to check if one with our name exists
            assistants = self.client.beta.assistants.list(
                order="desc",
                limit=100
            )
            
            # Find an assistant with matching name and model
            for assistant in assistants.data:
                if assistant.name == self.name and assistant.model == self.model:
                    self.assistant_id = assistant.id
                    logger.info(f"Found existing assistant: {self.assistant_id}")
                    
                    # Update the assistant with latest configuration
                    self.client.beta.assistants.update(
                        assistant_id=self.assistant_id,
                        description=self.description,
                        instructions=self.instructions,
                        tools=self.api_tools,
                        file_ids=self.file_ids,
                        metadata=self.metadata
                    )
                    logger.info(f"Updated assistant: {self.assistant_id}")
                    self.is_connected = True
                    return
            
            # No matching assistant found, create a new one
            assistant = self.client.beta.assistants.create(
                name=self.name,
                description=self.description,
                instructions=self.instructions,
                model=self.model,
                tools=self.api_tools,
                file_ids=self.file_ids,
                metadata=self.metadata
            )
            self.assistant_id = assistant.id
            logger.info(f"Created new assistant: {self.assistant_id}")
            logger.info(f"Add this to your .env file: OPENAI_ASSISTANT_ID={self.assistant_id}")
            self.is_connected = True
        
        except Exception as e:
            self.is_connected = False
            logger.error(f"Error initializing assistant: {e}")
            raise
    
    @backoff.on_exception(
        backoff.expo,
        (Exception),
        max_tries=MAX_RETRIES,
        max_value=MAX_RETRY_DELAY,
        on_backoff=lambda details: logger.warning(
            f"Retrying thread creation after error. Attempt {details['tries']}/{MAX_RETRIES}"
        )
    )
    def get_or_create_thread(self, session_id: Optional[str] = None) -> str:
        """
        Get an existing thread or create a new one for a session.
        Uses exponential backoff for retries on failure.
        
        Args:
            session_id: Optional session identifier
            
        Returns:
            Thread ID
        """
        if not session_id:
            session_id = str(uuid.uuid4())
        
        if session_id in self.thread_map:
            # Verify the thread still exists
            try:
                self.client.beta.threads.retrieve(self.thread_map[session_id])
                return self.thread_map[session_id]
            except Exception as e:
                logger.warning(f"Thread {self.thread_map[session_id]} no longer exists: {e}")
                # Continue to create a new thread
        
        # Create a new thread with metadata
        thread = self.client.beta.threads.create(
            metadata={
                "session_id": session_id,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "client": "psscript_platform"
            }
        )
        self.thread_map[session_id] = thread.id
        logger.info(f"Created new thread: {thread.id} for session: {session_id}")
        
        return thread.id
    
    @backoff.on_exception(
        backoff.expo,
        (Exception),
        max_tries=MAX_RETRIES,
        max_value=MAX_RETRY_DELAY,
        on_backoff=lambda details: logger.warning(
            f"Retrying message processing after error. Attempt {details['tries']}/{MAX_RETRIES}"
        )
    )
    async def process_message(
        self,
        messages: List[Dict[str, str]],
        session_id: Optional[str] = None,
        additional_instructions: Optional[str] = None
    ) -> str:
        """
        Process a message using the OpenAI Assistant.
        Uses exponential backoff for retries on failure.
        
        Args:
            messages: List of message dictionaries with role and content
            session_id: Optional session identifier for thread continuity
            additional_instructions: Optional instructions to add for this run
            
        Returns:
            Assistant's response
        """
        if not self.is_connected:
            # Try to reconnect
            self._initialize_assistant()
            if not self.is_connected:
                return "Unable to connect to OpenAI Assistant API. Please check your API key and try again."
        
        try:
            # Get or create a thread for this session
            thread_id = self.get_or_create_thread(session_id)
            
            # Extract the last user message (the most recent one)
            user_message = None
            for msg in reversed(messages):
                if msg["role"] == "user":
                    user_message = msg["content"]
                    break
            
            if not user_message:
                raise ValueError("No user message found in the conversation")
            
            # Add the message to the thread
            await self.async_client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=user_message
            )
            
            # Run the assistant on the thread
            run_params = {
                "assistant_id": self.assistant_id
            }
            
            # Add additional instructions if provided
            if additional_instructions:
                run_params["additional_instructions"] = additional_instructions
            
            run = await self.async_client.beta.threads.runs.create(
                thread_id=thread_id,
                **run_params
            )
            
            # Poll for completion
            run = await self._wait_for_run_completion(thread_id, run.id)
            
            # Get the latest message
            thread_messages = await self.async_client.beta.threads.messages.list(
                thread_id=thread_id,
                order="desc",
                limit=1
            )
            
            if not thread_messages.data:
                return "No response from assistant"
            
            # Extract and return the content
            latest_message = thread_messages.data[0]
            response = self._extract_message_content(latest_message)
            
            return response
        
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            # Return a user-friendly error message
            return f"I encountered an error while processing your message: {str(e)}. Please try again or contact support if the issue persists."
    
    async def _wait_for_run_completion(self, thread_id: str, run_id: str) -> Run:
        """
        Wait for a run to complete, with exponential backoff.
        
        Args:
            thread_id: Thread ID
            run_id: Run ID
            
        Returns:
            Completed run
        """
        wait_time = 0.5
        max_wait_time = 10
        max_total_wait = 300  # 5 minutes maximum total wait time
        start_time = time.time()
        
        while time.time() - start_time < max_total_wait:
            try:
                run = await self.async_client.beta.threads.runs.retrieve(
                    thread_id=thread_id,
                    run_id=run_id
                )
                
                if run.status in ["completed", "failed", "cancelled", "expired"]:
                    if run.status != "completed":
                        logger.warning(f"Run ended with status: {run.status}")
                        if run.status == "failed" and run.last_error:
                            logger.error(f"Run failed with error: {run.last_error.code} - {run.last_error.message}")
                    return run
                
                # Handle requires_action status for function calling
                if run.status == "requires_action":
                    logger.info("Run requires action (function calling)")
                    if run.required_action and run.required_action.submit_tool_outputs:
                        tool_outputs = await self._handle_tool_calls(
                            thread_id, 
                            run_id, 
                            run.required_action.submit_tool_outputs.tool_calls
                        )
                        
                        if tool_outputs:
                            # Submit tool outputs and continue
                            await self.async_client.beta.threads.runs.submit_tool_outputs(
                                thread_id=thread_id,
                                run_id=run_id,
                                tool_outputs=tool_outputs
                            )
                        else:
                            # Cancel the run if we couldn't handle the tool calls
                            await self.async_client.beta.threads.runs.cancel(
                                thread_id=thread_id,
                                run_id=run_id
                            )
                            raise ValueError("Unable to handle required tool calls")
                    else:
                        # Cancel the run if there's no tool outputs to submit
                        await self.async_client.beta.threads.runs.cancel(
                            thread_id=thread_id,
                            run_id=run_id
                        )
                        raise ValueError("Run requires action but no tool outputs to submit")
                
                # Wait with exponential backoff
                await asyncio.sleep(wait_time)
                wait_time = min(wait_time * 1.5, max_wait_time)
                
            except Exception as e:
                logger.error(f"Error while waiting for run completion: {e}")
                # Wait a bit before retrying
                await asyncio.sleep(1)
        
        # If we've waited too long, cancel the run and raise an exception
        try:
            await self.async_client.beta.threads.runs.cancel(
                thread_id=thread_id,
                run_id=run_id
            )
        except Exception as cancel_error:
            logger.error(f"Error cancelling run: {cancel_error}")
        
        raise TimeoutError(f"Run {run_id} timed out after {max_total_wait} seconds")
    
    async def _handle_tool_calls(self, thread_id: str, run_id: str, tool_calls: List[Any]) -> List[Dict[str, Any]]:
        """
        Handle tool calls from the assistant.
        
        Args:
            thread_id: Thread ID
            run_id: Run ID
            tool_calls: List of tool calls from the assistant
            
        Returns:
            List of tool outputs to submit
        """
        tool_outputs = []
        
        for tool_call in tool_calls:
            try:
                # Parse the function arguments
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                logger.info(f"Handling tool call: {function_name} with args: {function_args}")
                
                # Handle different function types
                if function_name == "search_powershell_docs":
                    # Example implementation for searching PowerShell docs
                    query = function_args.get("query", "")
                    result = {"results": [{"title": "Example PowerShell Doc", "url": "https://docs.microsoft.com/powershell", "snippet": "This is an example result."}]}
                    tool_outputs.append({
                        "tool_call_id": tool_call.id,
                        "output": json.dumps(result)
                    })
                
                elif function_name == "analyze_script_security":
                    # Example implementation for script security analysis
                    script = function_args.get("script", "")
                    # In a real implementation, you would analyze the script
                    result = {"security_score": 7.5, "issues": ["Example security issue"]}
                    tool_outputs.append({
                        "tool_call_id": tool_call.id,
                        "output": json.dumps(result)
                    })
                
                else:
                    # Unknown function
                    tool_outputs.append({
                        "tool_call_id": tool_call.id,
                        "output": json.dumps({"error": f"Unknown function: {function_name}"})
                    })
            
            except Exception as e:
                logger.error(f"Error handling tool call: {e}")
                tool_outputs.append({
                    "tool_call_id": tool_call.id,
                    "output": json.dumps({"error": str(e)})
                })
        
        return tool_outputs
    
    def _extract_message_content(self, message: ThreadMessage) -> str:
        """
        Extract content from a message.
        
        Args:
            message: The thread message
            
        Returns:
            Text content of the message
        """
        content_parts = []
        
        for content in message.content:
            if content.type == "text":
                content_parts.append(content.text.value)
            elif content.type == "image_file":
                content_parts.append(f"[Image: {content.image_file.file_id}]")
        
        return "\n".join(content_parts)
    
    async def analyze_script(
        self,
        script_content: str,
        script_name: Optional[str] = None,
        analysis_type: str = "full"
    ) -> Dict[str, Any]:
        """
        Analyze a PowerShell script using the assistant.
        
        Args:
            script_content: Content of the script
            script_name: Name of the script
            analysis_type: Type of analysis (full, security, optimization, etc.)
            
        Returns:
            Analysis results
        """
        try:
            # Create a one-time thread for this analysis
            thread = self.client.beta.threads.create()
            
            # Craft the analysis prompt based on analysis type
            prompt = self._create_analysis_prompt(script_content, script_name, analysis_type)
            
            # Add the message to the thread
            self.client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=prompt
            )
            
            # Run the assistant on the thread
            run = self.client.beta.threads.runs.create(
                thread_id=thread.id,
                assistant_id=self.assistant_id
            )
            
            # Poll for completion (using sync client for simplicity)
            status = run.status
            while status not in ["completed", "failed", "cancelled", "expired"]:
                time.sleep(1)
                run = self.client.beta.threads.runs.retrieve(
                    thread_id=thread.id,
                    run_id=run.id
                )
                status = run.status
            
            if status != "completed":
                logger.error(f"Run failed with status: {status}")
                return {
                    "error": f"Analysis failed with status: {status}",
                    "status": status
                }
            
            # Get the assistant's response
            messages = self.client.beta.threads.messages.list(
                thread_id=thread.id,
                order="desc",
                limit=1
            )
            
            if not messages.data:
                return {"error": "No response from assistant"}
            
            # Extract the content and parse the JSON
            response_text = self._extract_message_content(messages.data[0])
            
            # Try to extract structured data from the response
            try:
                # Look for JSON blocks in the response
                json_start = response_text.find("```json")
                json_end = response_text.find("```", json_start + 7)
                
                if json_start >= 0 and json_end > json_start:
                    json_content = response_text[json_start + 7:json_end].strip()
                    analysis_data = json.loads(json_content)
                else:
                    # No JSON block found, return the raw text
                    analysis_data = {
                        "raw_analysis": response_text,
                        "analysis_type": analysis_type
                    }
            except json.JSONDecodeError:
                # Fall back to raw text if JSON parsing fails
                analysis_data = {
                    "raw_analysis": response_text,
                    "analysis_type": analysis_type
                }
            
            return analysis_data
        
        except Exception as e:
            logger.error(f"Error analyzing script: {e}")
            return {"error": str(e)}
    
    def _create_analysis_prompt(
        self,
        script_content: str,
        script_name: Optional[str] = None,
        analysis_type: str = "full"
    ) -> str:
        """
        Create a prompt for script analysis.
        
        Args:
            script_content: Content of the script
            script_name: Name of the script
            analysis_type: Type of analysis
            
        Returns:
            Analysis prompt
        """
        script_name_str = f" named '{script_name}'" if script_name else ""
        
        if analysis_type == "full":
            prompt = f"""
            Please analyze this PowerShell script{script_name_str} and provide a comprehensive assessment including:
            
            1. The main purpose and functionality of the script
            2. Security analysis and risk assessment
            3. Code quality evaluation and best practices adherence
            4. Optimization suggestions for performance improvement
            5. Parameter analysis and usage examples
            
            Return the analysis in JSON format with the following structure:
            ```json
            {{
                "purpose": "Brief description of the script's purpose",
                "security_analysis": "Detailed security analysis of the script",
                "security_score": 0.0 to 10.0,
                "code_quality_score": 0.0 to 10.0,
                "parameters": {{"param_name": {{"description": "description", "example": "example"}}}},
                "category": "Category of the script (e.g., System Administration, Security, etc.)",
                "command_details": [list of PowerShell commands used with details],
                "optimization": ["List of optimization suggestions"],
                "risk_score": 0.0 to 10.0
            }}
            ```
            
            Here's the script for analysis:
            ```powershell
            {script_content}
            ```
            """
        elif analysis_type == "security":
            prompt = f"""
            Please perform a security analysis on this PowerShell script{script_name_str}. Identify any:
            
            1. Security vulnerabilities or risks
            2. Potentially dangerous commands or techniques
            3. Permission and privilege issues
            4. Data handling and privacy concerns
            5. Security best practices violations
            
            Return the analysis in JSON format with the following structure:
            ```json
            {{
                "security_analysis": "Detailed security analysis",
                "security_score": 0.0 to 10.0,
                "vulnerabilities": [list of identified vulnerabilities],
                "recommendations": [list of security recommendations],
                "risk_score": 0.0 to 10.0
            }}
            ```
            
            Here's the script for analysis:
            ```powershell
            {script_content}
            ```
            """
        elif analysis_type == "optimization":
            prompt = f"""
            Please analyze this PowerShell script{script_name_str} for optimization opportunities including:
            
            1. Performance improvements
            2. Code simplification
            3. Resource usage optimization
            4. Best practices implementation
            5. Readability improvements
            
            Return the analysis in JSON format with the following structure:
            ```json
            {{
                "optimization_suggestions": [list of detailed optimization suggestions],
                "code_quality_score": 0.0 to 10.0,
                "performance_impact": "Assessment of current performance",
                "optimized_sections": [{{
                    "original_code": "original code snippet",
                    "optimized_code": "optimized code snippet",
                    "explanation": "explanation of the optimization"
                }}]
            }}
            ```
            
            Here's the script for analysis:
            ```powershell
            {script_content}
            ```
            """
        else:
            # Generic analysis request
            prompt = f"""
            Please analyze this PowerShell script{script_name_str} with focus on {analysis_type}.
            
            Return your analysis in a structured JSON format if possible.
            
            Here's the script for analysis:
            ```powershell
            {script_content}
            ```
            """
        
        return prompt
