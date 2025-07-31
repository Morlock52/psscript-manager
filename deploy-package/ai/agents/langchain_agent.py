"""
LangChain Agent Implementation

This module implements advanced agentic capabilities using LangChain,
enabling autonomous reasoning, planning, and execution with real-time
internet data access.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union

from langchain.agents import AgentType, initialize_agent, load_tools
from langchain.agents import AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.tools import BaseTool
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.utilities import GoogleSearchAPIWrapper, WikipediaAPIWrapper
from langchain.tools import DuckDuckGoSearchRun
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("langchain_agent")

class LangChainAgent:
    """
    LangChain-based agent with advanced capabilities for autonomous reasoning,
    planning, and execution with access to external data sources.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the LangChain agent.
        
        Args:
            api_key: OpenAI API key (optional, will use environment variable if not provided)
        """
        # Set API key
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        # Initialize components
        self.llm = self._initialize_llm()
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        self.tools = self._initialize_tools()
        self.agent = self._initialize_agent()
        
        logger.info("LangChain agent initialized")
    
    def _initialize_llm(self) -> ChatOpenAI:
        """Initialize the language model."""
        callback_manager = CallbackManager([StreamingStdOutCallbackHandler()])
        
        return ChatOpenAI(
            openai_api_key=self.api_key,
            temperature=0.7,
            model_name="gpt-4o",
            streaming=True,
            callback_manager=callback_manager,
            verbose=True
        )
    
    def _initialize_tools(self) -> List[BaseTool]:
        """Initialize the tools available to the agent."""
        try:
            # Basic tools
            tools = load_tools(
                ["llm-math", "requests_all"],
                llm=self.llm
            )
            
            # Add search tools if API keys are available
            if os.getenv("GOOGLE_CSE_ID") and os.getenv("GOOGLE_API_KEY"):
                search = GoogleSearchAPIWrapper()
                tools.extend(load_tools(["google-search"], search=search))
            else:
                # Fallback to DuckDuckGo which doesn't require API keys
                tools.append(DuckDuckGoSearchRun())
            
            # Add Wikipedia tool
            tools.extend(load_tools(["wikipedia"]))
            
            # Add weather tool if API key is available
            if os.getenv("OPENWEATHER_API_KEY"):
                # This would be implemented as a custom tool
                # tools.append(WeatherTool())
                pass
            
            # Add financial data tool if API key is available
            if os.getenv("ALPHA_VANTAGE_API_KEY"):
                # This would be implemented as a custom tool
                # tools.append(FinancialDataTool())
                pass
            
            logger.info(f"Initialized {len(tools)} tools for the agent")
            return tools
            
        except Exception as e:
            logger.error(f"Error initializing tools: {e}")
            # Return basic tools if there's an error
            return load_tools(["llm-math"], llm=self.llm)
    
    def _initialize_agent(self) -> AgentExecutor:
        """Initialize the agent with tools and memory."""
        return initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
            memory=self.memory,
            verbose=True,
            max_iterations=10,
            early_stopping_method="generate",
            handle_parsing_errors=True
        )
    
    async def process_message(self, messages: List[Dict[str, str]]) -> str:
        """
        Process a message using the LangChain agent.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            
        Returns:
            The agent's response as a string
        """
        try:
            # Convert messages to LangChain format
            langchain_messages = []
            
            # Extract the last user message
            user_message = None
            for msg in reversed(messages):
                if msg["role"] == "user":
                    user_message = msg["content"]
                    break
            
            if not user_message:
                return "I don't see a question. How can I help you?"
            
            # Run the agent
            logger.info(f"Running agent with input: {user_message[:50]}...")
            response = self.agent.run(input=user_message)
            logger.info(f"Agent response generated: {len(response)} chars")
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing message with LangChain agent: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    def reset_memory(self) -> None:
        """Reset the agent's memory."""
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        self.agent = self._initialize_agent()
        logger.info("Agent memory reset")


# Example custom tool for weather data
class WeatherTool(BaseTool):
    """Tool for getting weather information."""
    
    name: str = "weather"
    description: str = "Get current weather information for a location"
    
    def _run(self, location: str) -> str:
        """Get weather for a location."""
        try:
            import requests
            
            api_key = os.getenv("OPENWEATHER_API_KEY")
            if not api_key:
                return "OpenWeather API key not configured"
            
            url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric"
            response = requests.get(url)
            data = response.json()
            
            if response.status_code != 200:
                return f"Error: {data.get('message', 'Unknown error')}"
            
            weather = data["weather"][0]["description"]
            temp = data["main"]["temp"]
            feels_like = data["main"]["feels_like"]
            humidity = data["main"]["humidity"]
            wind_speed = data["wind"]["speed"]
            
            return (
                f"Weather in {location}: {weather}\n"
                f"Temperature: {temp}°C (feels like {feels_like}°C)\n"
                f"Humidity: {humidity}%\n"
                f"Wind Speed: {wind_speed} m/s"
            )
            
        except Exception as e:
            return f"Error getting weather: {str(e)}"
    
    async def _arun(self, location: str) -> str:
        """Async implementation of the weather tool."""
        import asyncio
        return await asyncio.to_thread(self._run, location)


# Example custom tool for financial data
class FinancialDataTool(BaseTool):
    """Tool for getting financial data."""
    
    name: str = "financial_data"
    description: str = "Get financial data for a stock symbol"
    
    def _run(self, symbol: str) -> str:
        """Get financial data for a stock symbol."""
        try:
            import requests
            
            api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
            if not api_key:
                return "Alpha Vantage API key not configured"
            
            url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}"
            response = requests.get(url)
            data = response.json()
            
            if "Global Quote" not in data or not data["Global Quote"]:
                return f"No data found for symbol {symbol}"
            
            quote = data["Global Quote"]
            price = quote.get("05. price", "N/A")
            change = quote.get("09. change", "N/A")
            change_percent = quote.get("10. change percent", "N/A")
            
            return (
                f"Financial data for {symbol}:\n"
                f"Price: ${price}\n"
                f"Change: {change} ({change_percent})"
            )
            
        except Exception as e:
            return f"Error getting financial data: {str(e)}"
    
    async def _arun(self, symbol: str) -> str:
        """Async implementation of the financial data tool."""
        import asyncio
        return await asyncio.to_thread(self._run, symbol)


# Example usage
if __name__ == "__main__":
    # Set your API key in the environment
    os.environ["OPENAI_API_KEY"] = "your-api-key-here"
    
    # Create an agent
    agent = LangChainAgent()
    
    # Example messages
    messages = [
        {"role": "user", "content": "What's the weather like in New York?"}
    ]
    
    # Process the message
    import asyncio
    response = asyncio.run(agent.process_message(messages))
    
    print(f"Response: {response}")
