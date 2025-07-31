"""
Tool Integration System for Multi-Agent Framework

This module provides a structured system for defining, registering, and executing
tools within the multi-agent framework. It supports tool composition, chaining,
and result caching for improved performance.
"""

import os
import json
import time
import logging
import inspect
import hashlib
import asyncio
from typing import Dict, List, Any, Optional, Union, Callable, TypedDict, Type
from enum import Enum, auto
from functools import wraps
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("tool_integration")

class ToolCategory(Enum):
    """Categories for organizing tools."""
    ANALYSIS = auto()
    SECURITY = auto()
    DOCUMENTATION = auto()
    CODE_GENERATION = auto()
    EXECUTION = auto()
    UTILITY = auto()
    EXTERNAL_API = auto()
    DATABASE = auto()
    FILE_SYSTEM = auto()
    NETWORK = auto()

class ToolPermission(Enum):
    """Permission levels for tools."""
    READ_ONLY = auto()  # Can only read data, no modifications
    WRITE_LOCAL = auto()  # Can write to local files/database
    EXECUTE_LOCAL = auto()  # Can execute code locally
    NETWORK = auto()  # Can access network resources
    SYSTEM = auto()  # Can modify system settings
    ADMIN = auto()  # Has administrative privileges

class ToolResult(TypedDict, total=False):
    """Result of a tool execution."""
    success: bool
    result: Any
    error: Optional[str]
    execution_time: float
    cached: bool
    metadata: Dict[str, Any]

class ToolDefinition:
    """Definition of a tool in the multi-agent system."""
    
    def __init__(
        self,
        name: str,
        description: str,
        function: Callable,
        category: ToolCategory,
        permissions: List[ToolPermission],
        input_schema: Dict[str, Any],
        output_schema: Dict[str, Any],
        version: str = "1.0.0",
        author: str = "System",
        tags: List[str] = None,
        cache_ttl: Optional[int] = None,  # Time to live in seconds, None for no caching
        rate_limit: Optional[int] = None,  # Max calls per minute, None for no limit
        requires_api_key: bool = False,
        api_key_env_var: Optional[str] = None,
        examples: List[Dict[str, Any]] = None
    ):
        """
        Initialize a tool definition.
        
        Args:
            name: The name of the tool
            description: A description of what the tool does
            function: The function that implements the tool
            category: The category of the tool
            permissions: The permissions required by the tool
            input_schema: JSON schema for the tool's input
            output_schema: JSON schema for the tool's output
            version: The version of the tool
            author: The author of the tool
            tags: Tags for categorizing the tool
            cache_ttl: Time to live for cached results in seconds
            rate_limit: Maximum number of calls per minute
            requires_api_key: Whether the tool requires an API key
            api_key_env_var: Environment variable name for the API key
            examples: Example uses of the tool
        """
        self.name = name
        self.description = description
        self.function = function
        self.category = category
        self.permissions = permissions
        self.input_schema = input_schema
        self.output_schema = output_schema
        self.version = version
        self.author = author
        self.tags = tags or []
        self.cache_ttl = cache_ttl
        self.rate_limit = rate_limit
        self.requires_api_key = requires_api_key
        self.api_key_env_var = api_key_env_var
        self.examples = examples or []
        
        # Metadata for tracking
        self.created_at = datetime.now()
        self.last_updated = self.created_at
        self.call_count = 0
        self.last_called = None
        self.average_execution_time = 0.0
        
        # Validate the function signature against the input schema
        self._validate_function()
    
    def _validate_function(self) -> None:
        """Validate that the function signature matches the input schema."""
        sig = inspect.signature(self.function)
        
        # Check that all required parameters in the schema are in the function signature
        required_params = self.input_schema.get("required", [])
        for param in required_params:
            if param not in sig.parameters:
                raise ValueError(f"Required parameter '{param}' not found in function signature")
        
        # Check that all parameters in the function signature are in the schema
        properties = self.input_schema.get("properties", {})
        for param_name in sig.parameters:
            # Skip self for methods
            if param_name == "self":
                continue
            
            # Skip **kwargs
            if sig.parameters[param_name].kind == inspect.Parameter.VAR_KEYWORD:
                continue
            
            if param_name not in properties:
                raise ValueError(f"Parameter '{param_name}' in function signature not found in input schema")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the tool definition to a dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category.name,
            "permissions": [p.name for p in self.permissions],
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
            "version": self.version,
            "author": self.author,
            "tags": self.tags,
            "cache_ttl": self.cache_ttl,
            "rate_limit": self.rate_limit,
            "requires_api_key": self.requires_api_key,
            "api_key_env_var": self.api_key_env_var,
            "examples": self.examples,
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "call_count": self.call_count,
            "last_called": self.last_called.isoformat() if self.last_called else None,
            "average_execution_time": self.average_execution_time
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], function: Callable) -> 'ToolDefinition':
        """Create a tool definition from a dictionary."""
        tool = cls(
            name=data["name"],
            description=data["description"],
            function=function,
            category=ToolCategory[data["category"]],
            permissions=[ToolPermission[p] for p in data["permissions"]],
            input_schema=data["input_schema"],
            output_schema=data["output_schema"],
            version=data["version"],
            author=data["author"],
            tags=data["tags"],
            cache_ttl=data["cache_ttl"],
            rate_limit=data["rate_limit"],
            requires_api_key=data["requires_api_key"],
            api_key_env_var=data["api_key_env_var"],
            examples=data["examples"]
        )
        
        # Set metadata
        tool.created_at = datetime.fromisoformat(data["created_at"])
        tool.last_updated = datetime.fromisoformat(data["last_updated"])
        tool.call_count = data["call_count"]
        tool.last_called = datetime.fromisoformat(data["last_called"]) if data["last_called"] else None
        tool.average_execution_time = data["average_execution_time"]
        
        return tool

class ToolCache:
    """Cache for tool results to improve performance."""
    
    def __init__(self, max_size: int = 1000):
        """
        Initialize the tool cache.
        
        Args:
            max_size: Maximum number of cached results
        """
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
    
    def _generate_key(self, tool_name: str, args: Dict[str, Any]) -> str:
        """
        Generate a cache key for a tool call.
        
        Args:
            tool_name: The name of the tool
            args: The arguments to the tool
            
        Returns:
            A cache key
        """
        # Sort the arguments to ensure consistent keys
        sorted_args = json.dumps(args, sort_keys=True)
        key_string = f"{tool_name}:{sorted_args}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, tool_name: str, args: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Get a cached result for a tool call.
        
        Args:
            tool_name: The name of the tool
            args: The arguments to the tool
            
        Returns:
            The cached result, or None if not found or expired
        """
        key = self._generate_key(tool_name, args)
        
        if key in self.cache:
            cached_item = self.cache[key]
            
            # Check if the cached item has expired
            if "expiry" in cached_item and cached_item["expiry"] < time.time():
                # Remove expired item
                del self.cache[key]
                self.misses += 1
                return None
            
            self.hits += 1
            return cached_item["result"]
        
        self.misses += 1
        return None
    
    def set(self, tool_name: str, args: Dict[str, Any], result: Any, ttl: Optional[int] = None) -> None:
        """
        Set a cached result for a tool call.
        
        Args:
            tool_name: The name of the tool
            args: The arguments to the tool
            result: The result to cache
            ttl: Time to live in seconds, None for no expiry
        """
        key = self._generate_key(tool_name, args)
        
        # Calculate expiry time if TTL is provided
        expiry = time.time() + ttl if ttl is not None else None
        
        # Store the result with metadata
        self.cache[key] = {
            "result": result,
            "timestamp": time.time(),
            "expiry": expiry,
            "tool_name": tool_name,
            "args": args
        }
        
        # Evict oldest items if cache is full
        if len(self.cache) > self.max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]["timestamp"])
            del self.cache[oldest_key]
    
    def clear(self) -> None:
        """Clear the cache."""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": self.hits / (self.hits + self.misses) if (self.hits + self.misses) > 0 else 0
        }

class RateLimiter:
    """Rate limiter for tool calls."""
    
    def __init__(self):
        """Initialize the rate limiter."""
        self.call_history: Dict[str, List[float]] = {}
    
    def check_rate_limit(self, tool_name: str, limit: int) -> bool:
        """
        Check if a tool call would exceed the rate limit.
        
        Args:
            tool_name: The name of the tool
            limit: Maximum number of calls per minute
            
        Returns:
            True if the call is allowed, False if it would exceed the rate limit
        """
        if tool_name not in self.call_history:
            self.call_history[tool_name] = []
        
        # Get the current time
        now = time.time()
        
        # Remove calls older than 1 minute
        self.call_history[tool_name] = [t for t in self.call_history[tool_name] if now - t < 60]
        
        # Check if we've exceeded the limit
        return len(self.call_history[tool_name]) < limit
    
    def record_call(self, tool_name: str) -> None:
        """
        Record a tool call.
        
        Args:
            tool_name: The name of the tool
        """
        if tool_name not in self.call_history:
            self.call_history[tool_name] = []
        
        self.call_history[tool_name].append(time.time())
    
    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiter statistics."""
        now = time.time()
        stats = {}
        
        for tool_name, calls in self.call_history.items():
            # Remove calls older than 1 minute
            recent_calls = [t for t in calls if now - t < 60]
            self.call_history[tool_name] = recent_calls
            
            stats[tool_name] = {
                "calls_last_minute": len(recent_calls),
                "last_call": max(recent_calls) if recent_calls else None
            }
        
        return stats

class ToolRegistry:
    """Registry for tools in the multi-agent system."""
    
    def __init__(self):
        """Initialize the tool registry."""
        self.tools: Dict[str, ToolDefinition] = {}
        self.cache = ToolCache()
        self.rate_limiter = RateLimiter()
    
    def register_tool(self, tool: ToolDefinition) -> None:
        """
        Register a tool in the registry.
        
        Args:
            tool: The tool to register
        """
        if tool.name in self.tools:
            logger.warning(f"Tool '{tool.name}' already registered. Overwriting.")
        
        self.tools[tool.name] = tool
        logger.info(f"Registered tool '{tool.name}' (version {tool.version})")
    
    def unregister_tool(self, tool_name: str) -> bool:
        """
        Unregister a tool from the registry.
        
        Args:
            tool_name: The name of the tool to unregister
            
        Returns:
            True if the tool was unregistered, False if it wasn't registered
        """
        if tool_name in self.tools:
            del self.tools[tool_name]
            logger.info(f"Unregistered tool '{tool_name}'")
            return True
        
        logger.warning(f"Tool '{tool_name}' not found in registry")
        return False
    
    def get_tool(self, tool_name: str) -> Optional[ToolDefinition]:
        """
        Get a tool from the registry.
        
        Args:
            tool_name: The name of the tool to get
            
        Returns:
            The tool, or None if not found
        """
        return self.tools.get(tool_name)
    
    def list_tools(self, category: Optional[ToolCategory] = None, tags: Optional[List[str]] = None) -> List[ToolDefinition]:
        """
        List tools in the registry, optionally filtered by category and tags.
        
        Args:
            category: The category to filter by
            tags: The tags to filter by
            
        Returns:
            A list of tools
        """
        tools = list(self.tools.values())
        
        # Filter by category
        if category:
            tools = [t for t in tools if t.category == category]
        
        # Filter by tags
        if tags:
            tools = [t for t in tools if all(tag in t.tags for tag in tags)]
        
        return tools
    
    async def execute_tool(
        self,
        tool_name: str,
        args: Dict[str, Any],
        use_cache: bool = True,
        api_key: Optional[str] = None
    ) -> ToolResult:
        """
        Execute a tool.
        
        Args:
            tool_name: The name of the tool to execute
            args: The arguments to pass to the tool
            use_cache: Whether to use cached results
            api_key: API key to use for the tool, if required
            
        Returns:
            The result of the tool execution
        """
        # Get the tool
        tool = self.get_tool(tool_name)
        if not tool:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' not found",
                "execution_time": 0.0,
                "cached": False,
                "metadata": {}
            }
        
        # Check if the tool requires an API key
        if tool.requires_api_key:
            if not api_key:
                # Try to get the API key from the environment
                if tool.api_key_env_var:
                    api_key = os.environ.get(tool.api_key_env_var)
                
                if not api_key:
                    return {
                        "success": False,
                        "error": f"Tool '{tool_name}' requires an API key",
                        "execution_time": 0.0,
                        "cached": False,
                        "metadata": {}
                    }
        
        # Check rate limit
        if tool.rate_limit and not self.rate_limiter.check_rate_limit(tool_name, tool.rate_limit):
            return {
                "success": False,
                "error": f"Rate limit exceeded for tool '{tool_name}'",
                "execution_time": 0.0,
                "cached": False,
                "metadata": {
                    "rate_limit": tool.rate_limit,
                    "rate_limiter_stats": self.rate_limiter.get_stats().get(tool_name, {})
                }
            }
        
        # Check cache
        if use_cache and tool.cache_ttl is not None:
            cached_result = self.cache.get(tool_name, args)
            if cached_result:
                return {
                    "success": True,
                    "result": cached_result,
                    "execution_time": 0.0,
                    "cached": True,
                    "metadata": {
                        "cache_stats": self.cache.get_stats()
                    }
                }
        
        # Execute the tool
        start_time = time.time()
        try:
            # Add API key to args if required
            if tool.requires_api_key and api_key:
                args["api_key"] = api_key
            
            # Check if the function is async
            if asyncio.iscoroutinefunction(tool.function):
                result = await tool.function(**args)
            else:
                result = tool.function(**args)
            
            execution_time = time.time() - start_time
            
            # Update tool metadata
            tool.call_count += 1
            tool.last_called = datetime.now()
            tool.average_execution_time = (
                (tool.average_execution_time * (tool.call_count - 1) + execution_time) / tool.call_count
            )
            
            # Record the call for rate limiting
            self.rate_limiter.record_call(tool_name)
            
            # Cache the result if caching is enabled
            if use_cache and tool.cache_ttl is not None:
                self.cache.set(tool_name, args, result, tool.cache_ttl)
            
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time,
                "cached": False,
                "metadata": {
                    "tool_stats": {
                        "call_count": tool.call_count,
                        "average_execution_time": tool.average_execution_time
                    }
                }
            }
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Error executing tool '{tool_name}': {e}")
            
            return {
                "success": False,
                "error": str(e),
                "execution_time": execution_time,
                "cached": False,
                "metadata": {}
            }
    
    async def execute_tool_chain(
        self,
        chain: List[Dict[str, Any]],
        use_cache: bool = True,
        api_key: Optional[str] = None
    ) -> List[ToolResult]:
        """
        Execute a chain of tools, where the output of each tool is passed to the next.
        
        Args:
            chain: A list of tool specifications, each with 'name' and 'args' keys
            use_cache: Whether to use cached results
            api_key: API key to use for the tools, if required
            
        Returns:
            A list of tool execution results
        """
        results = []
        
        for i, step in enumerate(chain):
            tool_name = step["name"]
            args = step["args"].copy()
            
            # If this isn't the first step, add the previous result to the args
            if i > 0 and results[-1]["success"]:
                args["previous_result"] = results[-1]["result"]
            
            # Execute the tool
            result = await self.execute_tool(tool_name, args, use_cache, api_key)
            results.append(result)
            
            # If the tool failed, stop the chain
            if not result["success"]:
                break
        
        return results
    
    def save_registry(self, filepath: str) -> bool:
        """
        Save the tool registry to a file.
        
        Args:
            filepath: The path to save the registry to
            
        Returns:
            True if the registry was saved successfully, False otherwise
        """
        try:
            # Create a serializable representation of the registry
            registry_data = {
                "tools": {name: tool.to_dict() for name, tool in self.tools.items()},
                "timestamp": datetime.now().isoformat()
            }
            
            # Save to file
            with open(filepath, 'w') as f:
                json.dump(registry_data, f, indent=2)
            
            logger.info(f"Saved tool registry to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error saving tool registry: {e}")
            return False
    
    def load_registry(self, filepath: str, function_map: Dict[str, Callable]) -> bool:
        """
        Load the tool registry from a file.
        
        Args:
            filepath: The path to load the registry from
            function_map: A mapping of tool names to their implementation functions
            
        Returns:
            True if the registry was loaded successfully, False otherwise
        """
        try:
            # Load from file
            with open(filepath, 'r') as f:
                registry_data = json.load(f)
            
            # Clear the current registry
            self.tools.clear()
            
            # Load tools
            for name, tool_data in registry_data["tools"].items():
                if name in function_map:
                    tool = ToolDefinition.from_dict(tool_data, function_map[name])
                    self.tools[name] = tool
                else:
                    logger.warning(f"Function for tool '{name}' not found in function map")
            
            logger.info(f"Loaded tool registry from {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error loading tool registry: {e}")
            return False

# Decorator for creating tools
def tool(
    name: str,
    description: str,
    category: ToolCategory,
    permissions: List[ToolPermission],
    input_schema: Dict[str, Any],
    output_schema: Dict[str, Any],
    version: str = "1.0.0",
    author: str = "System",
    tags: List[str] = None,
    cache_ttl: Optional[int] = None,
    rate_limit: Optional[int] = None,
    requires_api_key: bool = False,
    api_key_env_var: Optional[str] = None,
    examples: List[Dict[str, Any]] = None
):
    """
    Decorator for creating tools.
    
    Args:
        name: The name of the tool
        description: A description of what the tool does
        category: The category of the tool
        permissions: The permissions required by the tool
        input_schema: JSON schema for the tool's input
        output_schema: JSON schema for the tool's output
        version: The version of the tool
        author: The author of the tool
        tags: Tags for categorizing the tool
        cache_ttl: Time to live for cached results in seconds
        rate_limit: Maximum number of calls per minute
        requires_api_key: Whether the tool requires an API key
        api_key_env_var: Environment variable name for the API key
        examples: Example uses of the tool
        
    Returns:
        A decorator function
    """
    def decorator(func):
        # Create the tool definition
        tool_def = ToolDefinition(
            name=name,
            description=description,
            function=func,
            category=category,
            permissions=permissions,
            input_schema=input_schema,
            output_schema=output_schema,
            version=version,
            author=author,
            tags=tags,
            cache_ttl=cache_ttl,
            rate_limit=rate_limit,
            requires_api_key=requires_api_key,
            api_key_env_var=api_key_env_var,
            examples=examples
        )
        
        # Attach the tool definition to the function
        func.tool_definition = tool_def
        
        return func
    
    return decorator

# Example tool implementations
@tool(
    name="powershell_analysis",
    description="Analyze a PowerShell script to identify its purpose, security risks, and code quality",
    category=ToolCategory.ANALYSIS,
    permissions=[ToolPermission.READ_ONLY],
    input_schema={
        "type": "object",
        "properties": {
            "script_content": {
                "type": "string",
                "description": "The content of the PowerShell script to analyze"
            }
        },
        "required": ["script_content"]
    },
    output_schema={
        "type": "object",
        "properties": {
            "purpose": {
                "type": "string",
                "description": "The purpose of the script"
            },
            "security_score": {
                "type": "number",
                "description": "Security score from 1-10"
            },
            "code_quality_score": {
                "type": "number",
                "description": "Code quality score from 1-10"
            },
            "risk_score": {
                "type": "number",
                "description": "Risk score from 1-10"
            },
            "security_analysis": {
                "type": "string",
                "description": "Security analysis of the script"
            },
            "optimization": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Optimization suggestions"
            },
            "parameters": {
                "type": "object",
                "description": "Parameters used in the script"
            }
        }
    },
    cache_ttl=3600,  # Cache for 1 hour
    tags=["powershell", "analysis", "security"]
)
def analyze_powershell_script(script_content: str) -> Dict[str, Any]:
    """
    Analyze a PowerShell script.
    
    Args:
        script_content: The content of the PowerShell script to analyze
        
    Returns:
        A detailed analysis of the script
    """
    # This would use the ScriptAnalyzer in a real implementation
    # For now, return a mock response
    return {
        "purpose": "This is a mock analysis of a PowerShell script",
        "security_score": 7.5,
        "code_quality_score": 8.0,
        "risk_score": 3.0,
        "security_analysis": "No major security issues found",
        "optimization": [
            "Consider using parameter validation",
            "Add error handling with try/catch blocks"
        ],
        "parameters": {
            "Path": {
                "type": "string",
                "default": "C:\\Logs",
                "description": "Path to the log directory"
            }
        }
    }

@tool(
    name="security_analysis",
    description="Analyze a PowerShell script for security vulnerabilities, risks, and best practices",
    category=ToolCategory.SECURITY,
    permissions=[ToolPermission.READ_ONLY],
    input_schema={
        "type": "object",
        "properties": {
            "script_content": {
                "type": "string",
                "description": "The content of the PowerShell script to analyze"
            }
        },
        "required": ["script_content"]
    },
    output_schema={
        "type": "object",
        "properties": {
            "security_score": {
                "type": "number",
                "description": "Security score from 1-10"
            },
            "security_issues": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Security issues found in the script"
            },
            "security_best_practices": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Security best practices followed in the script"
            },
            "recommendations": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Recommendations for improving security"
            }
        }
    },
    cache_ttl=3600,  # Cache for 1 hour
    tags=["powershell", "security", "analysis"]
)
def analyze_script_security(script_content: str) -> Dict[str, Any]:
    """
    Analyze a PowerShell script for security issues.
    
    Args:
        script_content: The content of the PowerShell script to analyze
        
    Returns:
        A detailed security analysis of the script
    """
    # This would use a security analyzer in a real implementation
    # For now, return a mock response
    return {
        "security_score": 7.5,
        "security_issues": [
            "Uses Invoke-Expression which can lead to code injection vulnerabilities if input is not properly sanitized",
            "Uses ConvertTo-SecureString with plaintext key, which is not secure for production environments"
        ],
        "security_best_practices": [
            "Uses error handling with try/catch blocks",
            "Uses parameter validation to restrict input values"
        ],
        "recommendations": [
            "Avoid using Invoke-Expression with user input",
            "Use SecureString for sensitive data without storing the key in the script",
            "Implement proper error handling for all operations",
            "Use ShouldProcess for functions that make changes",
            "Implement logging for security-relevant actions"
        ]
    }

@tool(
    name="script_categorization",
    description="Categorize a PowerShell script into predefined categories based on its purpose and functionality",
    category=ToolCategory.ANALYSIS,
    permissions=[ToolPermission.READ_ONLY],
    input_schema={
        "type": "object",
        "properties": {
            "script_content": {
                "type": "string",
                "description": "The content of the PowerShell script to categorize"
            }
        },
        "required": ["script_content"]
    },
    output_schema={
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "description": "The category of the script"
            },
            "confidence": {
                "type": "number",
                "description": "Confidence score from 0-1"
            },
            "description": {
                "type": "string",
                "description": "Description of the category"
            },
            "keywords_matched": {
                "type": "number",
                "description": "Number of keywords matched"
            }
        }
    },
    cache_ttl=3600,  # Cache for 1 hour
    tags=["powershell", "categorization", "analysis"]
)
def categorize_script(script_content: str) -> Dict[str, Any]:
    """
    Categorize a PowerShell script.
    
    Args:
        script_content: The content of the PowerShell script to categorize
        
    Returns:
        The category of the script with explanation
    """
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
    
    # Default to Utilities & Helpers if no clear category
    if not category_scores:
        category = "Utilities & Helpers"
        confidence = 0.5
        keywords_matched = 0
    else:
        # Get the category with the highest score
        category = max(category_scores.items(), key=lambda x: x[1])[0]
        confidence = min(0.5 + (category_scores[category] * 0.1), 0.95)
        keywords_matched = category_scores[category]
    
    return {
        "category": category,
        "confidence": confidence,
        "description": categories[category],
        "keywords_matched": keywords_matched
    }

@tool(
    name="ms_docs_reference",
    description="Find Microsoft documentation references for PowerShell commands used in a script",
    category=ToolCategory.DOCUMENTATION,
    permissions=[ToolPermission.NETWORK],
    input_schema={
        "type": "object",
        "properties": {
            "script_content": {
                "type": "string",
                "description": "The content of the PowerShell script to analyze"
            }
        },
        "required": ["script_content"]
    },
    output_schema={
        "type": "object",
        "properties": {
            "commands_found": {
                "type": "number",
                "description": "Number of commands found"
            },
            "references": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "The PowerShell command"
                        },
                        "url": {
                            "type": "string",
                            "description": "URL to the Microsoft documentation"
                        },
                        "description": {
                            "type": "string",
                            "description": "Description of the command"
                        }
                    }
                },
                "description": "Documentation references"
            }
        }
    },
    cache_ttl=86400,  # Cache for 1 day
    tags=["powershell", "documentation", "reference"]
)
def find_ms_docs_references(script_content: str) -> Dict[str, Any]:
    """
    Find Microsoft documentation references for PowerShell commands.
    
    Args:
        script_content: The content of the PowerShell script to analyze
        
    Returns:
        A list of Microsoft documentation references for PowerShell commands
    """
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
    
    return {
        "commands_found": len(unique_commands),
        "references": ms_docs_references
    }

# Create a global tool registry
tool_registry = ToolRegistry()

# Register example tools
tool_registry.register_tool(analyze_powershell_script.tool_definition)
tool_registry.register_tool(analyze_script_security.tool_definition)
tool_registry.register_tool(categorize_script.tool_definition)
tool_registry.register_tool(find_ms_docs_references.tool_definition)
