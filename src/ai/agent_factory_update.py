"""
Agent Factory Update

This module provides an updated agent factory that supports LangGraph and
Py-g agents.
"""

import os
import logging
import json
from typing import Dict, List, Any, Optional, Union, Type

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("agent_factory_update")

class AgentFactoryUpdate:
    """
    Factory for creating different types of agents with support for LangGraph and Py-g.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the agent factory.
        
        Args:
            api_key: OpenAI API key (optional, will use environment variable if not provided)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("No OpenAI API key provided. Agents will attempt to use environment variable.")
        
        # Import agent classes
        try:
            from .langchain_agent import LangChainAgent
            self.LangChainAgent = LangChainAgent
            logger.info("LangChain agent loaded successfully")
        except ImportError:
            logger.warning("Failed to import LangChain agent")
            self.LangChainAgent = None
        
        try:
            from .autogpt_agent import AutoGPTAgent
            self.AutoGPTAgent = AutoGPTAgent
            logger.info("AutoGPT agent loaded successfully")
        except ImportError:
            logger.warning("Failed to import AutoGPT agent")
            self.AutoGPTAgent = None
        
        try:
            from .hybrid_agent import HybridAgent
            self.HybridAgent = HybridAgent
            logger.info("Hybrid agent loaded successfully")
        except ImportError:
            logger.warning("Failed to import Hybrid agent")
            self.HybridAgent = None
        
        try:
            from .langgraph_agent import LangGraphAgent
            self.LangGraphAgent = LangGraphAgent
            logger.info("LangGraph agent loaded successfully")
        except ImportError:
            logger.warning("Failed to import LangGraph agent")
            self.LangGraphAgent = None
        
        try:
            from .py_g_agent import PyGAgent
            self.PyGAgent = PyGAgent
            logger.info("Py-g agent loaded successfully")
        except ImportError:
            logger.warning("Failed to import Py-g agent")
            self.PyGAgent = None
    
    def create_agent(self, agent_type: str, **kwargs) -> Any:
        """
        Create an agent of the specified type.
        
        Args:
            agent_type: Type of agent to create ('langchain', 'autogpt', 'hybrid', 'langgraph', or 'pyg')
            **kwargs: Additional arguments to pass to the agent constructor
        
        Returns:
            An instance of the requested agent
        
        Raises:
            ValueError: If the agent type is not supported or the agent class is not available
        """
        # Set API key if not provided in kwargs
        if 'api_key' not in kwargs:
            kwargs['api_key'] = self.api_key
        
        # Create the appropriate agent
        if agent_type.lower() == 'langchain':
            if not self.LangChainAgent:
                raise ValueError("LangChain agent is not available")
            return self.LangChainAgent(**kwargs)
        
        elif agent_type.lower() == 'autogpt':
            if not self.AutoGPTAgent:
                raise ValueError("AutoGPT agent is not available")
            return self.AutoGPTAgent(**kwargs)
        
        elif agent_type.lower() == 'hybrid':
            if not self.HybridAgent:
                raise ValueError("Hybrid agent is not available")
            return self.HybridAgent(**kwargs)
        
        elif agent_type.lower() == 'langgraph':
            if not self.LangGraphAgent:
                raise ValueError("LangGraph agent is not available")
            return self.LangGraphAgent(**kwargs)
        
        elif agent_type.lower() == 'pyg':
            if not self.PyGAgent:
                raise ValueError("Py-g agent is not available")
            return self.PyGAgent(**kwargs)
        
        else:
            raise ValueError(f"Unsupported agent type: {agent_type}")
    
    def get_available_agent_types(self) -> List[str]:
        """
        Get a list of available agent types.
        
        Returns:
            A list of available agent types
        """
        available_agents = []
        
        if self.LangChainAgent:
            available_agents.append('langchain')
        
        if self.AutoGPTAgent:
            available_agents.append('autogpt')
        
        if self.HybridAgent:
            available_agents.append('hybrid')
        
        if self.LangGraphAgent:
            available_agents.append('langgraph')
        
        if self.PyGAgent:
            available_agents.append('pyg')
        
        return available_agents
    
    def get_agent_capabilities(self, agent_type: str) -> Dict[str, Any]:
        """
        Get the capabilities of the specified agent type.
        
        Args:
            agent_type: Type of agent to get capabilities for
        
        Returns:
            A dictionary of agent capabilities
        
        Raises:
            ValueError: If the agent type is not supported or the agent class is not available
        """
        if agent_type.lower() == 'langchain':
            if not self.LangChainAgent:
                raise ValueError("LangChain agent is not available")
            return {
                "name": "LangChain Agent",
                "description": "A simple agent based on LangChain",
                "features": [
                    "Basic script analysis",
                    "Simple tool use",
                    "Limited memory"
                ]
            }
        
        elif agent_type.lower() == 'autogpt':
            if not self.AutoGPTAgent:
                raise ValueError("AutoGPT agent is not available")
            return {
                "name": "AutoGPT Agent",
                "description": "An autonomous agent inspired by AutoGPT",
                "features": [
                    "Autonomous task planning",
                    "Long-term memory",
                    "Self-reflection",
                    "Advanced tool use"
                ]
            }
        
        elif agent_type.lower() == 'hybrid':
            if not self.HybridAgent:
                raise ValueError("Hybrid agent is not available")
            return {
                "name": "Hybrid Agent",
                "description": "A hybrid agent combining LangChain and AutoGPT capabilities",
                "features": [
                    "Advanced script analysis",
                    "Autonomous planning",
                    "Self-reflection",
                    "Long-term memory",
                    "Advanced tool use"
                ]
            }
        
        elif agent_type.lower() == 'langgraph':
            if not self.LangGraphAgent:
                raise ValueError("LangGraph agent is not available")
            return {
                "name": "LangGraph Agent",
                "description": "An agent based on LangGraph with explicit state management",
                "features": [
                    "Explicit state management",
                    "Multi-actor workflows",
                    "Advanced planning",
                    "Structured tool use",
                    "Error recovery",
                    "Monitoring and debugging"
                ]
            }
        
        elif agent_type.lower() == 'pyg':
            if not self.PyGAgent:
                raise ValueError("Py-g agent is not available")
            return {
                "name": "Py-g Agent",
                "description": "An agent based on Py-g with declarative agent definitions",
                "features": [
                    "Declarative agent definitions",
                    "Explicit state management",
                    "Advanced planning",
                    "Structured tool use",
                    "Error recovery",
                    "Workflow-based execution"
                ]
            }
        
        else:
            raise ValueError(f"Unsupported agent type: {agent_type}")
    
    async def process_message(self, agent_type: str, messages: List[Dict[str, str]], **kwargs) -> str:
        """
        Process a message using the specified agent type.
        
        Args:
            agent_type: Type of agent to use
            messages: List of message dictionaries with 'role' and 'content' keys
            **kwargs: Additional arguments to pass to the agent constructor
        
        Returns:
            The agent's response as a string
        
        Raises:
            ValueError: If the agent type is not supported or the agent class is not available
        """
        agent = self.create_agent(agent_type, **kwargs)
        
        if hasattr(agent, 'process_message'):
            return await agent.process_message(messages)
        else:
            raise ValueError(f"Agent type {agent_type} does not support process_message")
    
    async def analyze_script(self, agent_type: str, script_id: str, content: str, **kwargs) -> Dict[str, Any]:
        """
        Analyze a script using the specified agent type.
        
        Args:
            agent_type: Type of agent to use
            script_id: ID of the script to analyze
            content: Content of the script
            **kwargs: Additional arguments to pass to the agent constructor
        
        Returns:
            A dictionary containing the analysis results
        
        Raises:
            ValueError: If the agent type is not supported or the agent class is not available
        """
        agent = self.create_agent(agent_type, **kwargs)
        
        if hasattr(agent, 'analyze_script'):
            return await agent.analyze_script(script_id, content, **kwargs)
        else:
            raise ValueError(f"Agent type {agent_type} does not support analyze_script")
