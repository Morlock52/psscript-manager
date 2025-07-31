"""
Agent Coordinator for PSScript Platform

This module implements the coordinator agent that orchestrates the multi-agent system
for PowerShell script analysis, categorization, and optimization. It delegates tasks
to specialized agents and combines their results.
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
import time
from datetime import datetime

# Import agent types
from .enhanced_memory import EnhancedMemorySystem
from .multi_agent_system import (
    MultiAgentSystem,
    Agent,
    AgentRole,
    AgentCapability,
    Task,
    TaskStatus
)
from .tool_integration import tool_registry
from .task_planning import TaskPlanner, TaskType, TaskPriority, TaskContext
from .state_visualization import StateTracker
from .voice_agent import VoiceAgent

# Set up logging configuration
log_level_str = os.getenv('LOG_LEVEL', 'INFO').upper()
log_level = getattr(logging, log_level_str, logging.INFO) # Default to INFO if invalid level
log_file = os.getenv('LOG_FILE') # Optional log file path

log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handlers = []

# Add console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
handlers.append(console_handler)

# Add file handler if LOG_FILE is set
if log_file:
    try:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(log_formatter)
        handlers.append(file_handler)
    except Exception as e:
        logging.error(f"Failed to set up file handler for {log_file}: {e}") # Use root logger before specific logger is set

# Configure logging with handlers
# Clear existing root handlers to avoid duplicate logs if run multiple times
logging.root.handlers = []
logging.basicConfig(level=log_level, handlers=handlers)

logger = logging.getLogger("agent_coordinator")
logger.info(f"Logger initialized. Level: {log_level_str}. File: {log_file or 'Console'}")


class AgentCoordinator:
    """
    Coordinator for the multi-agent system that orchestrates script analysis,
    categorization, and optimization tasks.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        memory_storage_path: Optional[str] = None,
        visualization_output_dir: Optional[str] = None,
        model: str = "o3-mini"
    ):
        """
        Initialize the agent coordinator.

        Args:
            api_key: OpenAI API key
            memory_storage_path: Path to store memory
            visualization_output_dir: Directory to save visualizations
            model: Model to use for agents
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")

        # Initialize the multi-agent system
        self.multi_agent_system = MultiAgentSystem(coordinator_api_key=self.api_key)

        # Initialize the task planner
        self.task_planner = TaskPlanner()

        # Initialize the state tracker
        self.state_tracker = StateTracker()

        # Initialize the memory system
        self.memory_system = EnhancedMemorySystem(
            working_memory_capacity=100,
            long_term_storage_path=memory_storage_path,
            max_episodes=50
        )

        # Create specialized agents
        self._create_specialized_agents(model)

        # Visualization output directory
        self.visualization_output_dir = visualization_output_dir
        if visualization_output_dir and not os.path.exists(visualization_output_dir):
            try:
                os.makedirs(visualization_output_dir)
            except OSError as e:
                 logger.error(f"Failed to create visualization directory {visualization_output_dir}: {e}")
                 self.visualization_output_dir = None # Disable visualization if dir creation fails

        # Start a new episode in the memory system
        self.memory_system.start_new_episode("Initialization")

        logger.info("Agent Coordinator initialized")

    def _create_specialized_agents(self, model: str) -> None:
        """
        Create specialized agents for different tasks.

        Args:
            model: Model to use for agents
        """
        # Analysis Agent
        self.multi_agent_system.add_agent(
            name="Analysis Agent",
            role=AgentRole.ANALYST,
            capabilities=[
                AgentCapability.SCRIPT_ANALYSIS,
                AgentCapability.REASONING,
                AgentCapability.MEMORY_MANAGEMENT
            ],
            api_key=self.api_key,
            model=model
        )

        # Security Agent
        self.multi_agent_system.add_agent(
            name="Security Agent",
            role=AgentRole.SPECIALIST,
            capabilities=[
                AgentCapability.SECURITY_ANALYSIS,
                AgentCapability.REASONING
            ],
            api_key=self.api_key,
            model=model
        )

        # Categorization Agent
        self.multi_agent_system.add_agent(
            name="Categorization Agent",
            role=AgentRole.SPECIALIST,
            capabilities=[
                AgentCapability.CATEGORIZATION,
                AgentCapability.REASONING
            ],
            api_key=self.api_key,
            model=model
        )

        # Documentation Agent
        self.multi_agent_system.add_agent(
            name="Documentation Agent",
            role=AgentRole.RESEARCHER,
            capabilities=[
                AgentCapability.DOCUMENTATION,
                AgentCapability.TOOL_USE
            ],
            api_key=self.api_key,
            model=model
        )

        # Optimization Agent
        self.multi_agent_system.add_agent(
            name="Optimization Agent",
            role=AgentRole.SPECIALIST,
            capabilities=[
                AgentCapability.OPTIMIZATION,
                AgentCapability.CODE_GENERATION,
                AgentCapability.REASONING
            ],
            api_key=self.api_key,
            model=model
        )

        # Voice Agent
        voice_agent_id = self.multi_agent_system.add_agent(
            name="Voice Agent",
            role=AgentRole.INTERFACE,
            capabilities=[
                AgentCapability.VOICE_SYNTHESIS,
                AgentCapability.VOICE_RECOGNITION,
                AgentCapability.TOOL_USE
            ],
            api_key=self.api_key,
            model=model
        )

        # Create the Voice Agent instance specifically
        # Ensure the agent added by ID is replaced with the specific VoiceAgent instance
        if voice_agent_id in self.multi_agent_system.agents:
             self.multi_agent_system.agents[voice_agent_id] = VoiceAgent(
                 agent_id=voice_agent_id,
                 name="Voice Agent",
                 api_key=self.api_key,
                 model=model
             )
             logger.info("Voice Agent instance created and assigned.")
        else:
             logger.error("Failed to retrieve voice_agent_id after adding agent.")


        logger.info("Specialized agents created")

    async def synthesize_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        output_format: str = "mp3"
    ) -> Dict[str, Any]:
        """
        Synthesize text into speech using the voice agent.

        Args:
            text: Text to synthesize
            voice_id: Voice ID to use (if none provided, default voice will be used)
            output_format: Output audio format; defaults to "mp3"

        Returns:
            Dictionary containing the audio data and metadata or an error message
        """
        # Locate a suitable voice agent
        voice_agent = self.find_voice_agent(AgentCapability.VOICE_SYNTHESIS)

        if not voice_agent:
            logger.error("No voice agent found for speech synthesis", extra={"event": "speech_synthesis", "context": "voice_agent_lookup"})
            return {"error": "No voice agent available."}

        # Attempt to synthesize speech
        try:
            # Type check is implicitly handled by find_voice_agent
            result = await voice_agent.synthesize_speech(
                text=text,
                voice_id=voice_id,
                output_format=output_format
            )
            return result

        except Exception as e:
            logger.error("An error occurred during speech synthesis", exc_info=True, extra={"text_preview": text[:50], "voice_id": voice_id}) # Add context
            return {"error": "Speech synthesis failed due to an internal error."} # Generic error to user

    def find_voice_agent(self, capability: AgentCapability) -> Optional[VoiceAgent]:
        """
        Find and return a voice agent capable of the specified capability.

        Args:
            capability: The capability to check in the agents (e.g., VOICE_SYNTHESIS, VOICE_RECOGNITION).

        Returns:
            VoiceAgent or None if not found.
        """
        for agent in self.multi_agent_system.agents.values():
            if capability in agent.capabilities and isinstance(agent, VoiceAgent):
                return agent
        # Use extra for structured context in debug message
        logger.debug("No VoiceAgent found with specified capability", extra={"capability": capability.name})
        return None

    async def recognize_speech(
        self,
        audio_data: str,
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Recognize speech from audio data using the voice agent.

        Args:
            audio_data: Base64-encoded audio data
            language: Language code

        Returns:
            Dictionary containing the recognized text and metadata
        """
        # Use the generalized helper method to find the agent
        voice_agent = self.find_voice_agent(AgentCapability.VOICE_RECOGNITION)

        if not voice_agent:
            # Add structured context
            logger.error("No voice agent found for speech recognition", extra={"event": "speech_recognition", "context": "voice_agent_lookup"})
            return {"error": "No voice agent available"}

        # Attempt speech recognition
        try:
            # Type check is implicitly handled by find_voice_agent returning Optional[VoiceAgent]
            result = await voice_agent.recognize_speech(
                audio_data=audio_data,
                language=language
            )
            return result
        except Exception as e:
            # Log the specific error and return a generic error message
            logger.error(f"Error during speech recognition: {e}", exc_info=True) # Add traceback info
            return {"error": "Speech recognition failed due to an internal error."}

    async def analyze_script(
        self,
        script_content: str,
        script_name: Optional[str] = None,
        script_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a PowerShell script using the multi-agent system.

        Args:
            script_content: Content of the script
            script_name: Name of the script
            script_id: ID of the script in the database
            metadata: Additional metadata for the script

        Returns:
            Analysis results from all agents
        """
        # Start a new episode and log the script in memory
        episode_name = f"Script Analysis: {script_name or script_id or 'Unnamed Script'}"
        self.memory_system.start_new_episode(episode_name)

        # Store the script in working memory
        self.memory_system.add_to_working_memory(
            content=script_content,
            memory_type="script",
            source="user",
            importance=0.9
        )

        # Task settings for various analyses
        analysis_tasks_config = [
            {
                "name": f"Analyze Script: {script_name or script_id or 'Unnamed Script'}",
                "description": "Analyze the PowerShell script to determine its purpose, functionality, security risks, and quality.",
                "capabilities": [AgentCapability.SCRIPT_ANALYSIS, AgentCapability.REASONING],
                "priority": 5,
                "result_key": "analysis"
            },
            {
                "name": f"Security Analysis: {script_name or script_id or 'Unnamed Script'}",
                "description": "Analyze the PowerShell script for security vulnerabilities and risks.",
                "capabilities": [AgentCapability.SECURITY_ANALYSIS],
                "priority": 4,
                "result_key": "security"
            },
            {
                "name": f"Categorize Script: {script_name or script_id or 'Unnamed Script'}",
                "description": "Categorize the PowerShell script based on its purpose and functionality.",
                "capabilities": [AgentCapability.CATEGORIZATION],
                "priority": 3,
                "result_key": "categorization"
            },
            {
                "name": f"Find Documentation: {script_name or script_id or 'Unnamed Script'}",
                "description": "Find relevant documentation for the PowerShell commands used in the script.",
                "capabilities": [AgentCapability.DOCUMENTATION, AgentCapability.TOOL_USE],
                "priority": 2,
                "result_key": "documentation"
            },
            {
                "name": f"Optimize Script: {script_name or script_id or 'Unnamed Script'}",
                "description": "Suggest optimizations for the PowerShell script.",
                "capabilities": [AgentCapability.OPTIMIZATION, AgentCapability.CODE_GENERATION],
                "priority": 1,
                "result_key": "optimization"
            }
        ]

        # Create tasks concurrently
        task_configs_with_ids = [] # Store config along with the future task ID
        for task_config in analysis_tasks_config:
            try:
                task_id = self.multi_agent_system.create_task(
                    name=task_config["name"],
                    description=task_config["description"],
                    required_capabilities=task_config["capabilities"],
                    priority=task_config["priority"],
                    context={
                        "script_content": script_content,
                        "script_name": script_name,
                        "script_id": script_id,
                        "metadata": metadata or {}
                    }
                )
                task_configs_with_ids.append({**task_config, "id": task_id})
            except Exception as e:
                 logger.error(f"Failed to create task '{task_config['name']}': {e}", exc_info=True)
                 # Decide how to handle task creation failure - skip? add error placeholder?
                 # For now, let's add a placeholder to indicate failure
                 task_configs_with_ids.append({**task_config, "id": None, "error": str(e)})


        # Wait for all successfully created tasks to complete with a timeout
        timeout = 300  # seconds
        start_time = time.time()
        all_task_ids = [t["id"] for t in task_configs_with_ids if t.get("id")] # Only wait for tasks that were created

        if all_task_ids: # Only wait if there are tasks to wait for
            while time.time() - start_time < timeout:
                tasks_status = {task_id: self.multi_agent_system.tasks.get(task_id) for task_id in all_task_ids}
                if all(task and task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED] for task in tasks_status.values()):
                    break # All tasks finished
                await asyncio.sleep(1) # Yield control
            else:
                # Timeout occurred
                logger.warning(f"Analysis timed out for script: {script_name or script_id}", extra={"script_name": script_name, "script_id": script_id, "timeout": timeout})


        # Collect results with thorough error handling
        results = {
            "script_name": script_name,
            "script_id": script_id,
            "analysis_time": time.time() - start_time,
            "timestamp": datetime.now().isoformat(),
        }

        for task_config in task_configs_with_ids:
            task_id = task_config.get("id")
            task_name = task_config["name"]
            result_key = task_config["result_key"]

            if task_id is None: # Task creation failed
                 results[result_key] = {"error": f"Task creation failed: {task_config.get('error', 'Unknown error')}"}
                 continue

            task = self.multi_agent_system.tasks.get(task_id)

            if task and task.status == TaskStatus.COMPLETED:
                results[result_key] = task.result
            else:
                status_str = task.status.name if task else "UNKNOWN"
                error_message = f"{task_name} task {status_str}"
                if task and task.status == TaskStatus.FAILED and task.error:
                     error_message += f": {task.error}"
                elif time.time() - start_time >= timeout and (not task or task.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED]):
                    error_message += " (timed out)"
                results[result_key] = {"error": error_message}
                # Log the specific task failure/timeout
                logger.warning(f"Task issue for {result_key}", extra={"task_name": task_name, "status": status_str, "error": results[result_key].get("error")})


        # Store the results in long-term memory
        self.memory_system.add_to_long_term_memory(
            content=results,
            memory_type="analysis_results",
            source="agent_coordinator",
            importance=0.8
        )

        # Log the completion event
        self.memory_system.add_event(
            event_type="script_analysis_completed",
            content={
                "script_name": script_name,
                "script_id": script_id,
                "analysis_time": results["analysis_time"]
            }
        )

        return results

    async def categorize_script(
        self,
        script_content: str,
        script_name: Optional[str] = None,
        script_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Categorize a PowerShell script using the categorization agent.

        Args:
            script_content: Content of the script
            script_name: Name of the script
            script_id: ID of the script in the database

        Returns:
            Categorization results
        """
        try:
            # Use the tool registry to execute the categorization tool
            categorization_result = await tool_registry.execute_tool(
                tool_name="script_categorization",
                args={"script_content": script_content},
                use_cache=True,
                api_key=self.api_key
            )

            if categorization_result["success"]:
                # Add to working memory
                self.memory_system.add_to_working_memory(
                    content=categorization_result["result"],
                    memory_type="categorization",
                    source="categorization_agent",
                    importance=0.7
                )
                return categorization_result["result"]
            else:
                error_msg = categorization_result.get("error", "Unknown error during categorization")
                logger.error(f"Categorization failed: {error_msg}", extra={"script_name": script_name, "script_id": script_id})
                return {"error": error_msg}
        except Exception as e:
            logger.error(f"Exception during script categorization: {e}", exc_info=True, extra={"script_name": script_name, "script_id": script_id})
            return {"error": "An unexpected error occurred during categorization."}


    async def analyze_script_security(
        self,
        script_content: str,
        script_name: Optional[str] = None,
        script_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze the security of a PowerShell script using the security agent.

        Args:
            script_content: Content of the script
            script_name: Name of the script
            script_id: ID of the script in the database

        Returns:
            Security analysis results
        """
        try:
            # Use the tool registry to execute the security analysis tool
            security_result = await tool_registry.execute_tool(
                tool_name="security_analysis",
                args={"script_content": script_content},
                use_cache=True,
                api_key=self.api_key
            )

            if security_result["success"]:
                # Add to working memory
                self.memory_system.add_to_working_memory(
                    content=security_result["result"],
                    memory_type="security_analysis",
                    source="security_agent",
                    importance=0.8
                )
                return security_result["result"]
            else:
                error_msg = security_result.get("error", "Unknown error during security analysis")
                logger.error(f"Security analysis failed: {error_msg}", extra={"script_name": script_name, "script_id": script_id})
                return {"error": error_msg}
        except Exception as e:
            logger.error(f"Exception during script security analysis: {e}", exc_info=True, extra={"script_name": script_name, "script_id": script_id})
            return {"error": "An unexpected error occurred during security analysis."}


    async def find_documentation_references(
        self,
        script_content: str,
        script_name: Optional[str] = None,
        script_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Find documentation references for a PowerShell script using the documentation agent.

        Args:
            script_content: Content of the script
            script_name: Name of the script
            script_id: ID of the script in the database

        Returns:
            Documentation references
        """
        try:
            # Use the tool registry to execute the documentation reference tool
            docs_result = await tool_registry.execute_tool(
                tool_name="ms_docs_reference",
                args={"script_content": script_content},
                use_cache=True,
                api_key=self.api_key
            )

            if docs_result["success"]:
                # Add to working memory
                self.memory_system.add_to_working_memory(
                    content=docs_result["result"],
                    memory_type="documentation_references",
                    source="documentation_agent",
                    importance=0.6
                )
                return docs_result["result"]
            else:
                error_msg = docs_result.get("error", "Unknown error during documentation search")
                logger.error(f"Documentation reference search failed: {error_msg}", extra={"script_name": script_name, "script_id": script_id})
                return {"error": error_msg}
        except Exception as e:
            logger.error(f"Exception during documentation reference search: {e}", exc_info=True, extra={"script_name": script_name, "script_id": script_id})
            return {"error": "An unexpected error occurred during documentation search."}


    async def search_similar_scripts(
        self,
        script_content: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar scripts using vector similarity.

        Args:
            script_content: Content of the script to find similar scripts for
            limit: Maximum number of similar scripts to return

        Returns:
            List of similar scripts with similarity scores
        """
        # This would typically call a vector search service
        # For now, return a placeholder
        logger.info(f"Searching for similar scripts (placeholder)", extra={"limit": limit})
        # Placeholder: Add actual implementation using a vector DB or search service
        return []

    async def generate_script_embedding(
        self,
        script_content: str
    ) -> List[float]:
        """
        Generate a vector embedding for a script.

        Args:
            script_content: Content of the script

        Returns:
            Vector embedding
        """
        # This would typically call an embedding service
        # For now, return a placeholder
        logger.info(f"Generating script embedding (placeholder)")
        # Placeholder: Add actual implementation using an embedding model/service
        return [0.0] * 1536  # Placeholder for a 1536-dimensional embedding

    def visualize_agent_network(
        self,
        filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Visualize the agent network.

        Args:
            filename: Filename to save the visualization to

        Returns:
            Path to the saved visualization, or None if not saved
        """
        if not self.visualization_output_dir and not filename:
            logger.warning("No visualization output directory or filename specified, skipping visualization.")
            return None

        # Prepare agents and interactions for visualization
        agents_data = {}
        for agent_id, agent in self.multi_agent_system.agents.items():
             # Ensure role is accessed correctly, might need .name if it's an Enum
             role_name = agent.role.name if hasattr(agent.role, 'name') else str(agent.role)
             agents_data[agent_id] = {
                 "name": agent.name,
                 "type": role_name,
                 "importance": 0.8 if agent.role == AgentRole.COORDINATOR else 0.5
             }


        # Create interactions based on message history
        interactions_data = []
        for message in self.multi_agent_system.messages:
            interactions_data.append({
                "source": message.sender_id,
                "target": message.receiver_id,
                "type": message.message_type,
                "strength": 1.0
            })

        # Generate the visualization
        try:
            from .state_visualization import StateVisualizer
            visualizer = StateVisualizer(output_dir=self.visualization_output_dir)

            if filename:
                # Ensure filename is just the name, not a full path if output_dir is set
                base_filename = os.path.basename(filename)
                if self.visualization_output_dir:
                    filepath = os.path.join(self.visualization_output_dir, base_filename)
                else:
                    filepath = base_filename # Save in CWD if no dir specified
            else:
                 # Default filename if none provided
                 timestamp = int(time.time())
                 filepath = os.path.join(self.visualization_output_dir, f"agent_network_{timestamp}.png")


            viz_path = visualizer.visualize_agent_network(
                agents=agents_data,
                interactions=interactions_data,
                filename=filepath,
                title="PSScript Agent Network"
            )
            logger.info(f"Agent network visualization saved to {viz_path}")
            return viz_path
        except ImportError:
             logger.warning("StateVisualizer or its dependencies not found. Skipping network visualization.")
             return None
        except Exception as e:
             logger.error(f"Failed to generate agent network visualization: {e}", exc_info=True)
             return None


    def save_state(self, filepath: str) -> bool:
        """
        Save the state of the agent coordinator.

        Args:
            filepath: Path to save the state to

        Returns:
            True if the state was saved successfully, False otherwise
        """
        try:
            # Save the multi-agent system state
            mas_state_path = f"{filepath}.mas"
            if not self.multi_agent_system.save_state(mas_state_path):
                 logger.error("Failed to save multi-agent system state.")
                 # Decide if this is critical - maybe return False or continue?
                 # For now, log and continue to save other parts.

            # Save the memory system state
            memory_state = self.memory_system.save_state()

            # Combine the states
            state = {
                "timestamp": datetime.now().isoformat(),
                "memory_state": memory_state
                # Add other coordinator-specific state if needed
            }

            # Save to file
            with open(filepath, 'w') as f:
                json.dump(state, f, indent=2)

            logger.info(f"Saved agent coordinator state to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error saving agent coordinator state: {e}", exc_info=True)
            return False

    def load_state(self, filepath: str) -> bool:
        """
        Load the state of the agent coordinator.

        Args:
            filepath: Path to load the state from

        Returns:
            True if the state was loaded successfully, False otherwise
        """
        try:
            # Load the multi-agent system state
            mas_state_path = f"{filepath}.mas"
            if os.path.exists(mas_state_path):
                if not self.multi_agent_system.load_state(mas_state_path):
                     logger.warning(f"Failed to load multi-agent system state from {mas_state_path}")
                     # Decide if this is critical

            # Load the combined state
            if not os.path.exists(filepath):
                 logger.error(f"State file not found: {filepath}")
                 return False

            with open(filepath, 'r') as f:
                state = json.load(f)

            # Load the memory system state
            if "memory_state" in state:
                self.memory_system.load_state(state["memory_state"])
            else:
                 logger.warning("No memory state found in the loaded state file.")

            # Load other coordinator-specific state if needed

            logger.info(f"Loaded agent coordinator state from {filepath}")
            return True
        except json.JSONDecodeError as e:
             logger.error(f"Error decoding JSON from state file {filepath}: {e}", exc_info=True)
             return False
        except Exception as e:
            logger.error(f"Error loading agent coordinator state: {e}", exc_info=True)
            return False

    async def process_chat(self, messages: List[Dict[str, str]]) -> str:
        """
        Process a chat conversation with the multi-agent system.

        Args:
            messages: List of message dictionaries with 'role' and 'content' keys

        Returns:
            Response from the agent system
        """
        logger.info(f"Processing chat with {len(messages)} messages")

        # Extract the user's message (the last message in the list)
        user_message = messages[-1]["content"] if messages and messages[-1]["role"] == "user" else ""

        if not user_message:
            logger.warning("Received empty user message in process_chat.")
            return "I'm here to help with PowerShell scripting. What can I assist you with today?"

        # Start a new episode in the memory system
        self.memory_system.start_new_episode("Chat Conversation")

        # Add the conversation to working memory
        self.memory_system.add_to_working_memory(
            content=messages,
            memory_type="conversation",
            source="user",
            importance=0.7
        )

        # Create a task for processing the chat
        chat_task_id = None
        try:
            chat_task_id = self.multi_agent_system.create_task(
                name="Process Chat Message",
                description="Process a chat message and generate a response",
                required_capabilities=[
                    AgentCapability.REASONING,
                    AgentCapability.SCRIPT_ANALYSIS, # Example capabilities, adjust as needed
                    AgentCapability.DOCUMENTATION
                ],
                priority=5,
                context={
                    "messages": messages,
                    "user_message": user_message
                }
            )
        except Exception as e:
             logger.error(f"Failed to create chat processing task: {e}", exc_info=True)
             return "I encountered an internal error setting up the task. Please try again."


        # Wait for the task to complete
        response = ""
        task_completed = False
        start_time = time.time()
        timeout = 60  # 1 minute timeout

        if chat_task_id:
            while not task_completed and time.time() - start_time < timeout:
                # Check if the task is completed
                chat_task = self.multi_agent_system.tasks.get(chat_task_id)

                if chat_task and chat_task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                    task_completed = True
                    if chat_task.status == TaskStatus.COMPLETED and chat_task.result:
                         response = chat_task.result.get("response", "")
                         logger.info("Chat task completed successfully.")
                    else:
                         error_detail = chat_task.error if chat_task.error else "Task did not complete successfully."
                         logger.error(f"Chat processing task failed or did not produce a result: {error_detail}", extra={"task_id": chat_task_id, "status": chat_task.status.name})
                else:
                    # Wait a bit before checking again
                    await asyncio.sleep(0.5)
            else: # Loop finished without break (timeout)
                 if not task_completed:
                      logger.warning("Chat processing task timed out.", extra={"task_id": chat_task_id, "timeout": timeout})

        # Fallback response if the task failed, timed out, or didn't produce a response
        if not response:
            response = """I'm having trouble processing your request at the moment.

As a PowerShell expert assistant, I can help you with:
- PowerShell script analysis and optimization
- Security best practices for PowerShell
- PowerShell command syntax and usage
- Troubleshooting PowerShell scripts

Could you please try asking your question again or provide more details?"""

        # Add the response to working memory
        self.memory_system.add_to_working_memory(
            content={"role": "assistant", "content": response},
            memory_type="response",
            source="agent_coordinator",
            importance=0.7
        )

        # Add event to episodic memory
        self.memory_system.add_event(
            event_type="chat_response_generated",
            content={
                "processing_time": time.time() - start_time,
                "message_length": len(user_message),
                "response_length": len(response),
                "task_status": chat_task.status.name if task_completed and chat_task else "TIMEOUT_OR_FAILED"
            }
        )

        return response
