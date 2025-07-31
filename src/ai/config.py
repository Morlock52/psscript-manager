"""
Configuration Module

This module provides a centralized configuration system for the AI service,
including API keys, rate limits, and other settings.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("config")

# Default configuration file path
CONFIG_FILE_PATH = os.getenv("CONFIG_FILE_PATH", "config.json")

class APIKeys(BaseModel):
    """API keys configuration."""
    openai: Optional[str] = Field(None, description="OpenAI API key")
    google_search: Optional[str] = Field(None, description="Google Search API key")
    google_cse_id: Optional[str] = Field(None, description="Google Custom Search Engine ID")
    weather: Optional[str] = Field(None, description="OpenWeather API key")
    alpha_vantage: Optional[str] = Field(None, description="Alpha Vantage API key")
    serpapi: Optional[str] = Field(None, description="SerpAPI key")

class RateLimits(BaseModel):
    """Rate limiting configuration."""
    openai_rpm: int = Field(60, description="OpenAI requests per minute")
    openai_tpm: int = Field(40000, description="OpenAI tokens per minute")
    google_search_rpm: int = Field(30, description="Google Search requests per minute")
    weather_rpm: int = Field(60, description="Weather API requests per minute")
    alpha_vantage_rpm: int = Field(5, description="Alpha Vantage requests per minute")

class AgentConfig(BaseModel):
    """Agent configuration."""
    default_agent: str = Field("langchain", description="Default agent type")
    max_steps: int = Field(10, description="Maximum steps for AutoGPT agent")
    memory_size: int = Field(10, description="Number of messages to keep in memory")
    default_model: str = Field("o3-mini", description="Default OpenAI model")
    # Removed fallback_model - only using o3-mini
    temperature: float = Field(0.7, description="Default temperature for OpenAI API calls")
    max_tokens: int = Field(4000, description="Maximum tokens for OpenAI API calls")

class Config(BaseModel):
    """Main configuration."""
    api_keys: APIKeys = Field(default_factory=APIKeys)
    rate_limits: RateLimits = Field(default_factory=RateLimits)
    agent: AgentConfig = Field(default_factory=AgentConfig)
    mock_mode: bool = Field(False, description="Whether to use mock responses")
    debug: bool = Field(False, description="Whether to enable debug logging")

def load_config() -> Config:
    """
    Load configuration from environment variables and config file.
    Environment variables take precedence over config file.
    """
    # Start with default config
    config = Config()
    
    # Try to load from config file
    try:
        if os.path.exists(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, "r") as f:
                file_config = json.load(f)
                
            # Update config with file values
            if "api_keys" in file_config:
                for key, value in file_config["api_keys"].items():
                    if hasattr(config.api_keys, key):
                        setattr(config.api_keys, key, value)
            
            if "rate_limits" in file_config:
                for key, value in file_config["rate_limits"].items():
                    if hasattr(config.rate_limits, key):
                        setattr(config.rate_limits, key, value)
            
            if "agent" in file_config:
                for key, value in file_config["agent"].items():
                    if hasattr(config.agent, key):
                        setattr(config.agent, key, value)
            
            if "mock_mode" in file_config:
                config.mock_mode = file_config["mock_mode"]
            
            if "debug" in file_config:
                config.debug = file_config["debug"]
                
            logger.info(f"Loaded configuration from {CONFIG_FILE_PATH}")
    except Exception as e:
        logger.warning(f"Error loading config file: {e}")
    
    # Override with environment variables
    # API keys
    if os.getenv("OPENAI_API_KEY"):
        config.api_keys.openai = os.getenv("OPENAI_API_KEY")
    
    if os.getenv("GOOGLE_API_KEY"):
        config.api_keys.google_search = os.getenv("GOOGLE_API_KEY")
    
    if os.getenv("GOOGLE_CSE_ID"):
        config.api_keys.google_cse_id = os.getenv("GOOGLE_CSE_ID")
    
    if os.getenv("OPENWEATHER_API_KEY"):
        config.api_keys.weather = os.getenv("OPENWEATHER_API_KEY")
    
    if os.getenv("ALPHA_VANTAGE_API_KEY"):
        config.api_keys.alpha_vantage = os.getenv("ALPHA_VANTAGE_API_KEY")
    
    if os.getenv("SERPAPI_API_KEY"):
        config.api_keys.serpapi = os.getenv("SERPAPI_API_KEY")
    
    # Other settings
    if os.getenv("MOCK_MODE", "").lower() in ("true", "1", "yes"):
        config.mock_mode = True
    
    if os.getenv("DEBUG", "").lower() in ("true", "1", "yes"):
        config.debug = True
        logging.getLogger().setLevel(logging.DEBUG)
    
    # If no OpenAI API key is provided, log a warning but don't automatically enable mock mode
    if not config.api_keys.openai and not config.mock_mode:
        logger.warning("No OpenAI API key provided. The service will require an API key to function properly.")
    
    # Allow environment variable to override default model
    if os.getenv("DEFAULT_MODEL"):
        config.agent.default_model = os.getenv("DEFAULT_MODEL")
        logger.info(f"Using default model from environment variable: {config.agent.default_model}")
    
    return config

def save_config(config: Config) -> None:
    """
    Save configuration to file.
    """
    try:
        with open(CONFIG_FILE_PATH, "w") as f:
            json.dump(config.dict(), f, indent=2)
        logger.info(f"Saved configuration to {CONFIG_FILE_PATH}")
    except Exception as e:
        logger.error(f"Error saving config file: {e}")

# Create a singleton instance
config = load_config()

# Example usage
if __name__ == "__main__":
    print(f"OpenAI API Key: {config.api_keys.openai[:8]}..." if config.api_keys.openai else "No OpenAI API key")
    print(f"Mock Mode: {config.mock_mode}")
    print(f"Default Agent: {config.agent.default_agent}")
    print(f"Default Model: {config.agent.default_model}")
