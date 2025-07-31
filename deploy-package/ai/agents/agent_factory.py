"""
Agent Factory

This module provides a factory for creating and managing different types of agents,
including LangChain, AutoGPT, Hybrid, LangGraph, Py-g agents, and OpenAI Assistant agents. 
It selects the appropriate agent based on the user's request and available API keys.
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Type

# Import agent implementations
from .langchain_agent import LangChainAgent
from .autogpt_agent import AutoGPTAgent
from .hybrid_agent import HybridAgent

# Import new agent implementations
try:
    from .langgraph_agent import LangGraphAgent
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logging.warning("LangGraph agent not available. Install with 'pip install langgraph'")

try:
    from .py_g_agent import PyGAgent
    PYG_AVAILABLE = True
except ImportError:
    PYG_AVAILABLE = False
    logging.warning("Py-g agent not available. Install with 'pip install pyg'")

# Import OpenAI Assistant agent
try:
    from .openai_assistant_agent import OpenAIAssistantAgent
    ASSISTANT_AVAILABLE = True
except ImportError:
    ASSISTANT_AVAILABLE = False
    logging.warning("OpenAI Assistant agent not available. Ensure openai package is installed.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("agent_factory")

class AgentFactory:
    """
    Factory for creating and managing different types of agents.
    """
    
    def __init__(self):
        """Initialize the agent factory."""
        self.agents = {}
        self.default_agent_type = "langchain"
        logger.info("Agent factory initialized")
        
        # Log available agent types
        available_agents = ["langchain", "autogpt", "hybrid"]
        if LANGGRAPH_AVAILABLE:
            available_agents.append("langgraph")
        if PYG_AVAILABLE:
            available_agents.append("pyg")
        if ASSISTANT_AVAILABLE:
            available_agents.append("assistant")
        logger.info(f"Available agent types: {', '.join(available_agents)}")
    
    def get_agent(self, agent_type: str, api_key: Optional[str] = None) -> Any:
        """
        Get or create an agent of the specified type.
        
        Args:
            agent_type: The type of agent to get ('langchain', 'autogpt', 'hybrid', 'langgraph', 'pyg', or 'assistant')
            api_key: OpenAI API key to use for the agent
            
        Returns:
            An instance of the requested agent
        """
        # Normalize agent type
        agent_type = agent_type.lower()
        
        # Create a unique key for this agent instance
        agent_key = f"{agent_type}_{api_key}"
        
        # Return existing agent if available
        if agent_key in self.agents:
            logger.info(f"Returning existing {agent_type} agent")
            return self.agents[agent_key]
        
        # Create a new agent
        try:
            if agent_type == "langchain":
                logger.info("Creating new LangChain agent")
                agent = LangChainAgent(api_key=api_key)
            elif agent_type == "autogpt":
                logger.info("Creating new AutoGPT agent")
                agent = AutoGPTAgent(api_key=api_key)
            elif agent_type == "hybrid":
                logger.info("Creating new Hybrid agent")
                agent = HybridAgent(api_key=api_key)
            elif agent_type == "langgraph":
                if not LANGGRAPH_AVAILABLE:
                    logger.warning("LangGraph agent requested but not available, falling back to hybrid")
                    return self.get_agent("hybrid", api_key)
                logger.info("Creating new LangGraph agent")
                agent = LangGraphAgent(api_key=api_key)
            elif agent_type == "pyg":
                if not PYG_AVAILABLE:
                    logger.warning("Py-g agent requested but not available, falling back to hybrid")
                    return self.get_agent("hybrid", api_key)
                logger.info("Creating new Py-g agent")
                agent = PyGAgent(api_key=api_key)
            elif agent_type == "assistant":
                if not ASSISTANT_AVAILABLE:
                    logger.warning("OpenAI Assistant agent requested but not available, falling back to hybrid")
                    return self.get_agent("hybrid", api_key)
                logger.info("Creating new OpenAI Assistant agent")
                agent = OpenAIAssistantAgent(api_key=api_key)
            else:
                logger.warning(f"Unknown agent type: {agent_type}, using default")
                return self.get_agent(self.default_agent_type, api_key)
            
            # Store the agent for reuse
            self.agents[agent_key] = agent
            return agent
            
        except Exception as e:
            logger.error(f"Error creating {agent_type} agent: {e}")
            # Fall back to default agent type if different
            if agent_type != self.default_agent_type:
                logger.info(f"Falling back to {self.default_agent_type} agent")
                return self.get_agent(self.default_agent_type, api_key)
            raise
    
    def determine_agent_type(self, message: str) -> str:
        """
        Determine the most appropriate agent type for a message.
        
        Args:
            message: The user's message
            
        Returns:
            The recommended agent type ('langchain', 'autogpt', 'hybrid', 'langgraph', 'pyg', or 'assistant')
        """
        # Simple heuristic for now - could be replaced with a more sophisticated classifier
        assistant_task_indicators = [
            "agentic assistant",
            "assistant api",
            "function calling",
            "tool use",
            "assistant thread",
            "thread management",
            "persistent conversation",
            "code interpreter",
            "retrieval",
            "openai assistant"
        ]
        
        langgraph_task_indicators = [
            "multi-actor workflow",
            "state management",
            "explicit state",
            "workflow graph",
            "complex workflow",
            "state machine",
            "error recovery",
            "multi-step planning",
            "tool orchestration",
            "structured workflow"
        ]
        
        pyg_task_indicators = [
            "declarative agent",
            "declarative definition",
            "agent definition",
            "workflow-based",
            "state-based agent",
            "explicit workflow",
            "agent workflow",
            "declarative approach",
            "structured agent",
            "agent orchestration"
        ]
        
        hybrid_task_indicators = [
            "complex analysis",
            "multi-step task",
            "categorize and analyze",
            "optimize and improve",
            "evaluate and suggest",
            "compare and contrast",
            "plan and execute",
            "reasoning",
            "reflection",
            "metacognition"
        ]
        
        complex_task_indicators = [
            "create a plan",
            "develop a strategy",
            "design a system",
            "build a comprehensive",
            "analyze and report",
            "research and summarize",
            "investigate",
            "autonomous",
            "step by step"
        ]
        
        message_lower = message.lower()
        
        # Check for OpenAI Assistant task indicators first (if available)
        if ASSISTANT_AVAILABLE:
            for indicator in assistant_task_indicators:
                if indicator in message_lower:
                    logger.info(f"Selected OpenAI Assistant agent based on indicator: '{indicator}'")
                    return "assistant"
        
        # Check for LangGraph task indicators (if available)
        if LANGGRAPH_AVAILABLE:
            for indicator in langgraph_task_indicators:
                if indicator in message_lower:
                    logger.info(f"Selected LangGraph agent based on indicator: '{indicator}'")
                    return "langgraph"
        
        # Check for Py-g task indicators (if available)
        if PYG_AVAILABLE:
            for indicator in pyg_task_indicators:
                if indicator in message_lower:
                    logger.info(f"Selected Py-g agent based on indicator: '{indicator}'")
                    return "pyg"
        
        # Check for hybrid task indicators
        for indicator in hybrid_task_indicators:
            if indicator in message_lower:
                logger.info(f"Selected hybrid agent based on indicator: '{indicator}'")
                return "hybrid"
        
        # Check for complex task indicators
        for indicator in complex_task_indicators:
            if indicator in message_lower:
                logger.info(f"Selected AutoGPT agent based on indicator: '{indicator}'")
                return "autogpt"
        
        # Default to LangChain for simpler tasks
        logger.info("No specific indicators found, using default agent: LangChain")
        return self.default_agent_type

    async def process_message(
        self, 
        messages: List[Dict[str, str]], 
        api_key: Optional[str] = None,
        agent_type: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> str:
        """
        Process a message using the appropriate agent based on content.
        
        Args:
            messages: List of message objects with role and content keys
            api_key: Optional OpenAI API key
            agent_type: Optional specific agent type to use
            session_id: Optional session ID for persistent conversations
            
        Returns:
            Agent response
        """
        if not messages:
            return "No messages provided"
        
        # Get the latest user message content for agent selection
        latest_user_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                latest_user_message = msg.get("content", "")
                break
        
        # Determine agent type based on message content if not specified
        if not agent_type:
            agent_type = self.determine_agent_type(latest_user_message)
        
        # Get the appropriate agent
        agent = self.get_agent(agent_type, api_key)
        
        # Process the message
        try:
            if agent_type == "assistant":
                # OpenAI Assistant agent has a different interface
                response = await agent.process_message(messages, session_id)
            else:
                # Legacy agent processing
                response = await agent.process_message(messages)
                
            return response
        except Exception as e:
            logger.error(f"Error processing message with {agent_type} agent: {e}")
            # Fall back to default agent on error
            if agent_type != self.default_agent_type:
                logger.info(f"Falling back to {self.default_agent_type} agent")
                agent = self.get_agent(self.default_agent_type, api_key)
                return await agent.process_message(messages)
            raise


# Create a singleton instance
agent_factory = AgentFactory()

# Async process_message function for backward compatibility
async def process_message(messages, api_key=None):
    """
    Process a message using the agent factory.
    
    Args:
        messages: List of message objects with role and content keys
        api_key: Optional OpenAI API key
        
    Returns:
        Agent response
    """
    return await agent_factory.process_message(messages, api_key)
