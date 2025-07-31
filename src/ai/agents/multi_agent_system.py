"""
Multi-Agent Collaboration System

This module provides a framework for multi-agent collaboration, allowing
multiple specialized agents to work together to solve complex tasks.
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple, Callable
from enum import Enum, auto
import uuid

# Import enhanced memory system
from .enhanced_memory import EnhancedMemorySystem

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("multi_agent_system")

class AgentRole(Enum):
    """Roles that agents can take in a multi-agent system."""
    COORDINATOR = auto()  # Coordinates the overall task and delegates to specialists
    ANALYST = auto()      # Analyzes data and provides insights
    EXECUTOR = auto()     # Executes actions in the environment
    CRITIC = auto()       # Evaluates plans and results
    RESEARCHER = auto()   # Gathers information from external sources
    PLANNER = auto()      # Creates plans for complex tasks
    SPECIALIST = auto()   # Specialized in a specific domain
    ASSISTANT = auto()    # Assists other agents with their tasks

class AgentCapability(Enum):
    """Capabilities that agents can have."""
    SCRIPT_ANALYSIS = auto()      # Analyze PowerShell scripts
    SECURITY_ANALYSIS = auto()    # Analyze security aspects of scripts
    CODE_GENERATION = auto()      # Generate code
    DOCUMENTATION = auto()        # Create documentation
    CATEGORIZATION = auto()       # Categorize scripts
    OPTIMIZATION = auto()         # Optimize scripts
    TOOL_USE = auto()             # Use external tools
    PLANNING = auto()             # Create plans
    REASONING = auto()            # Reason about complex problems
    LEARNING = auto()             # Learn from experience
    COMMUNICATION = auto()        # Communicate with users or other agents
    MEMORY_MANAGEMENT = auto()    # Manage memory systems
    VOICE_SYNTHESIS = auto()      # Convert text to speech
    VOICE_RECOGNITION = auto()    # Convert speech to text

class TaskStatus(Enum):
    """Status of a task in the multi-agent system."""
    PENDING = auto()      # Task is waiting to be assigned
    ASSIGNED = auto()     # Task has been assigned to an agent
    IN_PROGRESS = auto()  # Task is being worked on
    COMPLETED = auto()    # Task has been completed successfully
    FAILED = auto()       # Task has failed
    BLOCKED = auto()      # Task is blocked waiting for another task
    CANCELLED = auto()    # Task has been cancelled

class Task:
    """A task in the multi-agent system."""
    
    def __init__(
        self,
        name: str,
        description: str,
        required_capabilities: List[AgentCapability],
        priority: int = 1,
        parent_task_id: Optional[str] = None,
        deadline: Optional[float] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a task.
        
        Args:
            name: The name of the task
            description: A description of the task
            required_capabilities: Capabilities required to complete the task
            priority: The priority of the task (higher is more important)
            parent_task_id: The ID of the parent task, if any
            deadline: The deadline for the task (Unix timestamp), if any
            context: Additional context for the task
        """
        self.id = str(uuid.uuid4())
        self.name = name
        self.description = description
        self.required_capabilities = required_capabilities
        self.priority = priority
        self.parent_task_id = parent_task_id
        self.deadline = deadline
        self.context = context or {}
        self.status = TaskStatus.PENDING
        self.assigned_agent_id: Optional[str] = None
        self.created_at = time.time()
        self.started_at: Optional[float] = None
        self.completed_at: Optional[float] = None
        self.result: Optional[Any] = None
        self.error: Optional[str] = None
        self.subtasks: List[str] = []  # IDs of subtasks
        self.dependencies: List[str] = []  # IDs of tasks this task depends on
    
    def assign(self, agent_id: str) -> None:
        """
        Assign the task to an agent.
        
        Args:
            agent_id: The ID of the agent to assign the task to
        """
        self.assigned_agent_id = agent_id
        self.status = TaskStatus.ASSIGNED
    
    def start(self) -> None:
        """Start the task."""
        self.status = TaskStatus.IN_PROGRESS
        self.started_at = time.time()
    
    def complete(self, result: Any) -> None:
        """
        Complete the task.
        
        Args:
            result: The result of the task
        """
        self.status = TaskStatus.COMPLETED
        self.completed_at = time.time()
        self.result = result
    
    def fail(self, error: str) -> None:
        """
        Mark the task as failed.
        
        Args:
            error: The error that caused the task to fail
        """
        self.status = TaskStatus.FAILED
        self.completed_at = time.time()
        self.error = error
    
    def block(self) -> None:
        """Block the task."""
        self.status = TaskStatus.BLOCKED
    
    def cancel(self) -> None:
        """Cancel the task."""
        self.status = TaskStatus.CANCELLED
        self.completed_at = time.time()
    
    def add_subtask(self, task_id: str) -> None:
        """
        Add a subtask to the task.
        
        Args:
            task_id: The ID of the subtask
        """
        if task_id not in self.subtasks:
            self.subtasks.append(task_id)
    
    def add_dependency(self, task_id: str) -> None:
        """
        Add a dependency to the task.
        
        Args:
            task_id: The ID of the task this task depends on
        """
        if task_id not in self.dependencies:
            self.dependencies.append(task_id)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the task to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "required_capabilities": [cap.name for cap in self.required_capabilities],
            "priority": self.priority,
            "parent_task_id": self.parent_task_id,
            "deadline": self.deadline,
            "context": self.context,
            "status": self.status.name,
            "assigned_agent_id": self.assigned_agent_id,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "result": self.result,
            "error": self.error,
            "subtasks": self.subtasks,
            "dependencies": self.dependencies
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create a task from a dictionary."""
        task = cls(
            name=data["name"],
            description=data["description"],
            required_capabilities=[
                AgentCapability[cap] for cap in data["required_capabilities"]
            ],
            priority=data["priority"],
            parent_task_id=data["parent_task_id"],
            deadline=data["deadline"],
            context=data["context"]
        )
        task.id = data["id"]
        task.status = TaskStatus[data["status"]]
        task.assigned_agent_id = data["assigned_agent_id"]
        task.created_at = data["created_at"]
        task.started_at = data["started_at"]
        task.completed_at = data["completed_at"]
        task.result = data["result"]
        task.error = data["error"]
        task.subtasks = data["subtasks"]
        task.dependencies = data["dependencies"]
        return task

class Agent:
    """An agent in the multi-agent system."""
    
    def __init__(
        self,
        name: str,
        role: AgentRole,
        capabilities: List[AgentCapability],
        api_key: Optional[str] = None,
        model: str = "o3-mini",
        memory_system: Optional[EnhancedMemorySystem] = None
    ):
        """
        Initialize an agent.
        
        Args:
            name: The name of the agent
            role: The role of the agent
            capabilities: The capabilities of the agent
            api_key: The API key to use for the agent
            model: The model to use for the agent
            memory_system: The memory system for the agent
        """
        self.id = str(uuid.uuid4())
        self.name = name
        self.role = role
        self.capabilities = capabilities
        self.api_key = api_key
        self.model = model
        self.memory_system = memory_system or EnhancedMemorySystem()
        self.current_task_id: Optional[str] = None
        self.task_history: List[str] = []  # IDs of completed tasks
        self.created_at = time.time()
        self.last_active_at = self.created_at
    
    def can_handle_task(self, task: Task) -> bool:
        """
        Check if the agent can handle a task.
        
        Args:
            task: The task to check
            
        Returns:
            True if the agent can handle the task, False otherwise
        """
        # Check if the agent has all the required capabilities
        return all(cap in self.capabilities for cap in task.required_capabilities)
    
    def assign_task(self, task: Task) -> None:
        """
        Assign a task to the agent.
        
        Args:
            task: The task to assign
        """
        self.current_task_id = task.id
        task.assign(self.id)
    
    def complete_task(self, task: Task, result: Any) -> None:
        """
        Complete a task.
        
        Args:
            task: The task to complete
            result: The result of the task
        """
        task.complete(result)
        self.task_history.append(task.id)
        self.current_task_id = None
        self.last_active_at = time.time()
    
    def fail_task(self, task: Task, error: str) -> None:
        """
        Fail a task.
        
        Args:
            task: The task to fail
            error: The error that caused the task to fail
        """
        task.fail(error)
        self.task_history.append(task.id)
        self.current_task_id = None
        self.last_active_at = time.time()
    
    def is_available(self) -> bool:
        """
        Check if the agent is available to take on a new task.
        
        Returns:
            True if the agent is available, False otherwise
        """
        return self.current_task_id is None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the agent to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role.name,
            "capabilities": [cap.name for cap in self.capabilities],
            "model": self.model,
            "current_task_id": self.current_task_id,
            "task_history": self.task_history,
            "created_at": self.created_at,
            "last_active_at": self.last_active_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Agent':
        """Create an agent from a dictionary."""
        agent = cls(
            name=data["name"],
            role=AgentRole[data["role"]],
            capabilities=[AgentCapability[cap] for cap in data["capabilities"]],
            model=data["model"]
        )
        agent.id = data["id"]
        agent.current_task_id = data["current_task_id"]
        agent.task_history = data["task_history"]
        agent.created_at = data["created_at"]
        agent.last_active_at = data["last_active_at"]
        return agent

class Message:
    """A message in the multi-agent system."""
    
    def __init__(
        self,
        sender_id: str,
        receiver_id: str,
        content: Any,
        message_type: str = "text",
        related_task_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a message.
        
        Args:
            sender_id: The ID of the sender
            receiver_id: The ID of the receiver
            content: The content of the message
            message_type: The type of the message
            related_task_id: The ID of the related task, if any
            metadata: Additional metadata for the message
        """
        self.id = str(uuid.uuid4())
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.content = content
        self.message_type = message_type
        self.related_task_id = related_task_id
        self.metadata = metadata or {}
        self.timestamp = time.time()
        self.read = False
    
    def mark_as_read(self) -> None:
        """Mark the message as read."""
        self.read = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the message to a dictionary."""
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "content": self.content,
            "message_type": self.message_type,
            "related_task_id": self.related_task_id,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
            "read": self.read
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        """Create a message from a dictionary."""
        message = cls(
            sender_id=data["sender_id"],
            receiver_id=data["receiver_id"],
            content=data["content"],
            message_type=data["message_type"],
            related_task_id=data["related_task_id"],
            metadata=data["metadata"]
        )
        message.id = data["id"]
        message.timestamp = data["timestamp"]
        message.read = data["read"]
        return message

class MultiAgentSystem:
    """
    A multi-agent system for collaborative problem-solving.
    
    This system manages a team of agents with different roles and capabilities,
    allowing them to work together to solve complex tasks.
    """
    
    def __init__(self, coordinator_api_key: Optional[str] = None):
        """
        Initialize the multi-agent system.
        
        Args:
            coordinator_api_key: API key for the coordinator agent
        """
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.messages: List[Message] = []
        self.coordinator_api_key = coordinator_api_key
        self.system_memory = EnhancedMemorySystem()
        
        # Create the coordinator agent
        self._create_coordinator_agent()
    
    def _create_coordinator_agent(self) -> None:
        """Create the coordinator agent."""
        coordinator = Agent(
            name="Coordinator",
            role=AgentRole.COORDINATOR,
            capabilities=[
                AgentCapability.PLANNING,
                AgentCapability.REASONING,
                AgentCapability.COMMUNICATION,
                AgentCapability.MEMORY_MANAGEMENT
            ],
            api_key=self.coordinator_api_key,
            model="o3-mini",
            memory_system=self.system_memory
        )
        self.agents[coordinator.id] = coordinator
    
    def add_agent(
        self,
        name: str,
        role: AgentRole,
        capabilities: List[AgentCapability],
        api_key: Optional[str] = None,
        model: str = "o3-mini"
    ) -> str:
        """
        Add a new agent to the system.
        
        Args:
            name: The name of the agent
            role: The role of the agent
            capabilities: The capabilities of the agent
            api_key: The API key to use for the agent
            model: The model to use for the agent
            
        Returns:
            The ID of the new agent
        """
        # Create a new agent
        agent = Agent(
            name=name,
            role=role,
            capabilities=capabilities,
            api_key=api_key,
            model=model,
            memory_system=EnhancedMemorySystem()
        )
        
        # Add the agent to the system
        self.agents[agent.id] = agent
        
        # Log the addition
        logger.info(f"Added agent {agent.name} ({agent.id}) with role {agent.role.name}")
        
        return agent.id
    
    def remove_agent(self, agent_id: str) -> bool:
        """
        Remove an agent from the system.
        
        Args:
            agent_id: The ID of the agent to remove
            
        Returns:
            True if the agent was removed, False otherwise
        """
        if agent_id in self.agents:
            # Get the agent
            agent = self.agents[agent_id]
            
            # Check if the agent is the coordinator
            if agent.role == AgentRole.COORDINATOR:
                logger.warning("Cannot remove the coordinator agent")
                return False
            
            # Check if the agent has an active task
            if agent.current_task_id:
                # Get the task
                task = self.tasks.get(agent.current_task_id)
                if task:
                    # Cancel the task
                    task.cancel()
            
            # Remove the agent
            del self.agents[agent_id]
            
            # Log the removal
            logger.info(f"Removed agent {agent_id}")
            
            return True
        
        return False
    
    def create_task(
        self,
        name: str,
        description: str,
        required_capabilities: List[AgentCapability],
        priority: int = 1,
        parent_task_id: Optional[str] = None,
        deadline: Optional[float] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a new task.
        
        Args:
            name: The name of the task
            description: A description of the task
            required_capabilities: Capabilities required to complete the task
            priority: The priority of the task (higher is more important)
            parent_task_id: The ID of the parent task, if any
            deadline: The deadline for the task (Unix timestamp), if any
            context: Additional context for the task
            
        Returns:
            The ID of the new task
        """
        # Create a new task
        task = Task(
            name=name,
            description=description,
            required_capabilities=required_capabilities,
            priority=priority,
            parent_task_id=parent_task_id,
            deadline=deadline,
            context=context
        )
        
        # Add the task to the system
        self.tasks[task.id] = task
        
        # If this is a subtask, add it to the parent task
        if parent_task_id and parent_task_id in self.tasks:
            self.tasks[parent_task_id].add_subtask(task.id)
        
        # Log the creation
        logger.info(f"Created task {task.name} ({task.id})")
        
        # Try to assign the task
        self._assign_task(task.id)
        
        return task.id
    
    def _assign_task(self, task_id: str) -> bool:
        """
        Assign a task to an agent.
        
        Args:
            task_id: The ID of the task to assign
            
        Returns:
            True if the task was assigned, False otherwise
        """
        # Check if the task exists
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} does not exist")
            return False
        
        # Get the task
        task = self.tasks[task_id]
        
        # Check if the task is already assigned
        if task.assigned_agent_id:
            logger.warning(f"Task {task_id} is already assigned to agent {task.assigned_agent_id}")
            return False
        
        # Check if the task is blocked by dependencies
        for dependency_id in task.dependencies:
            if dependency_id in self.tasks:
                dependency = self.tasks[dependency_id]
                if dependency.status != TaskStatus.COMPLETED:
                    logger.info(f"Task {task_id} is blocked by dependency {dependency_id}")
                    task.block()
                    return False
        
        # Find an available agent that can handle the task
        available_agents = [
            agent for agent in self.agents.values()
            if agent.is_available() and agent.can_handle_task(task)
        ]
        
        if not available_agents:
            logger.info(f"No available agents can handle task {task_id}")
            return False
        
        # Sort agents by capability match (more matches is better)
        available_agents.sort(
            key=lambda agent: sum(1 for cap in task.required_capabilities if cap in agent.capabilities),
            reverse=True
        )
        
        # Assign the task to the best agent
        best_agent = available_agents[0]
        best_agent.assign_task(task)
        
        # Log the assignment
        logger.info(f"Assigned task {task.name} ({task.id}) to agent {best_agent.name} ({best_agent.id})")
        
        return True
    
    def complete_task(self, task_id: str, result: Any) -> bool:
        """
        Complete a task.
        
        Args:
            task_id: The ID of the task to complete
            result: The result of the task
            
        Returns:
            True if the task was completed, False otherwise
        """
        # Check if the task exists
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} does not exist")
            return False
        
        # Get the task
        task = self.tasks[task_id]
        
        # Check if the task is assigned
        if not task.assigned_agent_id:
            logger.warning(f"Task {task_id} is not assigned to an agent")
            return False
        
        # Get the agent
        agent = self.agents.get(task.assigned_agent_id)
        if not agent:
            logger.warning(f"Agent {task.assigned_agent_id} does not exist")
            return False
        
        # Complete the task
        agent.complete_task(task, result)
        
        # Log the completion
        logger.info(f"Completed task {task.name} ({task.id})")
        
        # Check if this unblocks any tasks
        self._check_blocked_tasks()
        
        return True
    
    def fail_task(self, task_id: str, error: str) -> bool:
        """
        Fail a task.
        
        Args:
            task_id: The ID of the task to fail
            error: The error that caused the task to fail
            
        Returns:
            True if the task was failed, False otherwise
        """
        # Check if the task exists
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} does not exist")
            return False
        
        # Get the task
        task = self.tasks[task_id]
        
        # Check if the task is assigned
        if not task.assigned_agent_id:
            logger.warning(f"Task {task_id} is not assigned to an agent")
            return False
        
        # Get the agent
        agent = self.agents.get(task.assigned_agent_id)
        if not agent:
            logger.warning(f"Agent {task.assigned_agent_id} does not exist")
            return False
        
        # Fail the task
        agent.fail_task(task, error)
        
        # Log the failure
        logger.info(f"Failed task {task.name} ({task.id}): {error}")
        
        return True
    
    def _check_blocked_tasks(self) -> None:
        """Check if any blocked tasks can now be unblocked."""
        # Get all blocked tasks
        blocked_tasks = [
            task for task in self.tasks.values()
            if task.status == TaskStatus.BLOCKED
        ]
        
        for task in blocked_tasks:
            # Check if all dependencies are completed
            dependencies_completed = True
            for dependency_id in task.dependencies:
                if dependency_id in self.tasks:
                    dependency = self.tasks[dependency_id]
                    if dependency.status != TaskStatus.COMPLETED:
                        dependencies_completed = False
                        break
            
            if dependencies_completed:
                # Unblock the task
                task.status = TaskStatus.PENDING
                logger.info(f"Unblocked task {task.name} ({task.id})")
                
                # Try to assign the task
                self._assign_task(task.id)
    
    def send_message(
        self,
        sender_id: str,
        receiver_id: str,
        content: Any,
        message_type: str = "text",
        related_task_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Send a message from one agent to another.
        
        Args:
            sender_id: The ID of the sender
            receiver_id: The ID of the receiver
            content: The content of the message
            message_type: The type of the message
            related_task_id: The ID of the related task, if any
            metadata: Additional metadata for the message
            
        Returns:
            The ID of the new message
        """
        # Check if the sender exists
        if sender_id not in self.agents:
            logger.warning(f"Sender {sender_id} does not exist")
            return ""
        
        # Check if the receiver exists
        if receiver_id not in self.agents:
            logger.warning(f"Receiver {receiver_id} does not exist")
            return ""
        
        # Create a new message
        message = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type,
            related_task_id=related_task_id,
            metadata=metadata
        )
        
        # Add the message to the system
        self.messages.append(message)
        
        # Log the message
        logger.info(f"Message from {sender_id} to {receiver_id}: {message.id}")
        
        return message.id
    
    def get_messages(
        self,
        agent_id: str,
        unread_only: bool = False,
        limit: Optional[int] = None
    ) -> List[Message]:
        """
        Get messages for an agent.
        
        Args:
            agent_id: The ID of the agent
            unread_only: Whether to get only unread messages
            limit: The maximum number of messages to get
            
        Returns:
            A list of messages
        """
        # Check if the agent exists
        if agent_id not in self.agents:
            logger.warning(f"Agent {agent_id} does not exist")
            return []
        
        # Get messages for the agent
        agent_messages = [
            message for message in self.messages
            if message.receiver_id == agent_id
            and (not unread_only or not message.read)
        ]
        
        # Sort by timestamp (newest first)
        agent_messages.sort(key=lambda m: m.timestamp, reverse=True)
        
        # Apply limit
        if limit is not None:
            agent_messages = agent_messages[:limit]
        
        return agent_messages
    
    def mark_message_as_read(self, message_id: str) -> bool:
        """
        Mark a message as read.
        
        Args:
            message_id: The ID of the message to mark as read
            
        Returns:
            True if the message was marked as read, False otherwise
        """
        # Find the message
        for message in self.messages:
            if message.id == message_id:
                message.mark_as_read()
                return True
        
        return False
    
    def get_agent_by_role(self, role: AgentRole) -> Optional[Agent]:
        """
        Get an agent by role.
        
        Args:
            role: The role to look for
            
        Returns:
            The agent with the specified role, or None if not found
        """
        for agent in self.agents.values():
            if agent.role == role:
                return agent
        
        return None
    
    def get_coordinator(self) -> Optional[Agent]:
        """
        Get the coordinator agent.
        
        Returns:
            The coordinator agent, or None if not found
        """
        return self.get_agent_by_role(AgentRole.COORDINATOR)
    
    def process_user_request(self, request: str) -> str:
        """
        Process a user request.
        
        Args:
            request: The user's request
            
        Returns:
            The ID of the task created for the request
        """
        # Get the coordinator agent
        coordinator = self.get_coordinator()
        if not coordinator:
            logger.error("No coordinator agent found")
            return ""
        
        # Create a task for the request
        task_id = self.create_task(
            name="User Request",
            description=request,
            required_capabilities=[
                AgentCapability.PLANNING,
                AgentCapability.REASONING,
                AgentCapability.COMMUNICATION
            ],
            priority=10,  # High priority for user requests
            context={"request": request}
        )
        
        return task_id
    
    def save_state(self, filepath: str) -> bool:
        """
        Save the state of the multi-agent system to a file.
        
        Args:
            filepath: The path to save the state to
            
        Returns:
            True if the state was saved successfully, False otherwise
        """
        try:
            # Create the state dictionary
            state = {
                "agents": {agent_id: agent.to_dict() for agent_id, agent in self.agents.items()},
                "tasks": {task_id: task.to_dict() for task_id, task in self.tasks.items()},
                "messages": [message.to_dict() for message in self.messages]
            }
            
            # Save to file
            with open(filepath, 'w') as f:
                json.dump(state, f, indent=2)
            
            logger.info(f"Saved state to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving state: {e}")
            return False
    
    def load_state(self, filepath: str) -> bool:
        """
        Load the state of the multi-agent system from a file.
        
        Args:
            filepath: The path to load the state from
            
        Returns:
            True if the state was loaded successfully, False otherwise
        """
        try:
            # Load from file
            with open(filepath, 'r') as f:
                state = json.load(f)
            
            # Load agents
            self.agents = {
                agent_id: Agent.from_dict(agent_data)
                for agent_id, agent_data in state["agents"].items()
            }
            
            # Load tasks
            self.tasks = {
                task_id: Task.from_dict(task_data)
                for task_id, task_data in state["tasks"].items()
            }
            
            # Load messages
            self.messages = [
                Message.from_dict(message_data)
                for message_data in state["messages"]
            ]
            
            logger.info(f"Loaded state from {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading state: {e}")
            return False
