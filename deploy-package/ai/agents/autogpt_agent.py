"""
AutoGPT-inspired Agent Implementation

This module implements an autonomous agent inspired by AutoGPT,
capable of breaking down complex tasks into steps, planning,
and executing those steps with minimal human intervention.
"""

import os
import json
import logging
import time
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum

import openai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autogpt_agent")

class AgentState(Enum):
    """Possible states of the agent."""
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    REFLECTING = "reflecting"
    ERROR = "error"

class AutoGPTAgent:
    """
    AutoGPT-inspired agent capable of autonomous planning and execution.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "o3-mini"):
        """
        Initialize the AutoGPT agent.
        
        Args:
            api_key: OpenAI API key (optional, will use environment variable if not provided)
            model: The OpenAI model to use
        """
        # Set API key
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        openai.api_key = self.api_key
        self.model = model
        self.state = AgentState.IDLE
        self.memory = []
        self.task_queue = []
        self.current_task = None
        self.task_results = []
        self.max_steps = 10
        self.step_count = 0
        
        logger.info(f"AutoGPT agent initialized with model {model}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_exception_type(
            (Exception)  # Simplified error handling for compatibility
        )
    )
    async def _call_openai_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """
        Call the OpenAI API with retry logic.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            temperature: Temperature parameter for the API call
            
        Returns:
            The model's response as a string
        """
        try:
            response = await openai.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=1500
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            raise
    
    async def create_plan(self, task: str) -> List[str]:
        """
        Create a plan for accomplishing a task.
        
        Args:
            task: The task to plan for
            
        Returns:
            A list of steps to accomplish the task
        """
        self.state = AgentState.PLANNING
        logger.info(f"Creating plan for task: {task}")
        
        system_prompt = """
        You are an autonomous planning agent. Your job is to break down complex tasks into 
        a series of smaller, actionable steps. Create a detailed plan with numbered steps.
        Each step should be specific and actionable. The plan should be comprehensive and
        cover all aspects of the task.
        """
        
        user_prompt = f"""
        Task: {task}
        
        Create a detailed plan with numbered steps to accomplish this task.
        Each step should be specific and actionable.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = await self._call_openai_api(messages, temperature=0.7)
            
            # Extract steps from the response
            steps = []
            for line in response.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('- ')):
                    # Remove numbering and leading dash
                    step = line.split('.', 1)[-1].strip() if '.' in line else line
                    step = step[2:].strip() if step.startswith('- ') else step
                    steps.append(step)
            
            if not steps:
                # If no steps were extracted, use the whole response
                steps = [response]
            
            logger.info(f"Created plan with {len(steps)} steps")
            self.task_queue = steps
            self.state = AgentState.IDLE
            return steps
            
        except Exception as e:
            logger.error(f"Error creating plan: {e}")
            self.state = AgentState.ERROR
            return [f"Error creating plan: {str(e)}"]
    
    async def execute_step(self, step: str) -> str:
        """
        Execute a single step in the plan.
        
        Args:
            step: The step to execute
            
        Returns:
            The result of executing the step
        """
        self.state = AgentState.EXECUTING
        logger.info(f"Executing step: {step}")
        
        system_prompt = """
        You are an autonomous execution agent. Your job is to execute a specific step in a plan.
        You have access to various tools and capabilities. Describe in detail how you would execute
        this step, what tools you would use, and what the expected outcome would be.
        
        When executing a step, consider:
        1. What information you need
        2. What tools or APIs you would use
        3. How you would handle potential errors
        4. What the success criteria are
        
        Provide a detailed execution plan and the expected result.
        """
        
        user_prompt = f"""
        Step to execute: {step}
        
        Previous steps completed: {json.dumps(self.task_results)}
        
        Provide a detailed execution of this step and the result.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = await self._call_openai_api(messages, temperature=0.7)
            logger.info(f"Step executed: {len(response)} chars")
            self.state = AgentState.IDLE
            return response
            
        except Exception as e:
            logger.error(f"Error executing step: {e}")
            self.state = AgentState.ERROR
            return f"Error executing step: {str(e)}"
    
    async def reflect_on_result(self, step: str, result: str) -> str:
        """
        Reflect on the result of executing a step.
        
        Args:
            step: The step that was executed
            result: The result of executing the step
            
        Returns:
            A reflection on the result
        """
        self.state = AgentState.REFLECTING
        logger.info(f"Reflecting on result for step: {step[:50]}...")
        
        system_prompt = """
        You are an autonomous reflection agent. Your job is to reflect on the result of executing
        a step in a plan. Analyze whether the step was successful, what was learned, and what
        adjustments might be needed for future steps.
        
        In your reflection, consider:
        1. Was the step successful? Why or why not?
        2. What was learned from executing this step?
        3. Are there any adjustments needed to the overall plan?
        4. What are the implications for the next steps?
        
        Provide a thoughtful reflection that will help improve the execution of future steps.
        """
        
        user_prompt = f"""
        Step executed: {step}
        
        Result: {result}
        
        Reflect on this result and provide insights for future steps.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = await self._call_openai_api(messages, temperature=0.7)
            logger.info(f"Reflection complete: {len(response)} chars")
            self.state = AgentState.IDLE
            return response
            
        except Exception as e:
            logger.error(f"Error reflecting on result: {e}")
            self.state = AgentState.ERROR
            return f"Error reflecting on result: {str(e)}"
    
    async def process_task(self, task: str) -> Dict[str, Any]:
        """
        Process a task autonomously from planning to execution.
        
        Args:
            task: The task to process
            
        Returns:
            A dictionary containing the plan, results, and overall summary
        """
        logger.info(f"Processing task: {task}")
        
        start_time = time.time()
        self.task_results = []
        self.step_count = 0
        
        try:
            # Create a plan
            plan = await self.create_plan(task)
            
            # Execute each step in the plan
            for i, step in enumerate(plan):
                if self.step_count >= self.max_steps:
                    logger.warning(f"Reached maximum number of steps ({self.max_steps})")
                    break
                
                logger.info(f"Executing step {i+1}/{len(plan)}: {step[:50]}...")
                result = await self.execute_step(step)
                reflection = await self.reflect_on_result(step, result)
                
                self.task_results.append({
                    "step": step,
                    "result": result,
                    "reflection": reflection
                })
                
                self.step_count += 1
            
            # Generate a summary of the task execution
            summary = await self._generate_summary(task, plan, self.task_results)
            
            elapsed_time = time.time() - start_time
            logger.info(f"Task completed in {elapsed_time:.2f} seconds with {len(self.task_results)} steps executed")
            
            return {
                "task": task,
                "plan": plan,
                "results": self.task_results,
                "summary": summary,
                "steps_executed": len(self.task_results),
                "elapsed_time": elapsed_time
            }
            
        except Exception as e:
            logger.error(f"Error processing task: {e}")
            elapsed_time = time.time() - start_time
            
            return {
                "task": task,
                "error": str(e),
                "steps_executed": len(self.task_results),
                "elapsed_time": elapsed_time
            }
    
    async def _generate_summary(self, task: str, plan: List[str], results: List[Dict[str, str]]) -> str:
        """
        Generate a summary of the task execution.
        
        Args:
            task: The original task
            plan: The plan that was created
            results: The results of executing each step
            
        Returns:
            A summary of the task execution
        """
        system_prompt = """
        You are an autonomous summary agent. Your job is to create a comprehensive summary
        of a task execution. The summary should include what was accomplished, any challenges
        encountered, and the overall outcome.
        
        Your summary should be clear, concise, and informative.
        """
        
        user_prompt = f"""
        Task: {task}
        
        Plan:
        {json.dumps(plan, indent=2)}
        
        Results:
        {json.dumps([{
            "step": r["step"],
            "result": r["result"][:200] + "..." if len(r["result"]) > 200 else r["result"]
        } for r in results], indent=2)}
        
        Please provide a comprehensive summary of this task execution.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = await self._call_openai_api(messages, temperature=0.7)
            logger.info(f"Summary generated: {len(response)} chars")
            return response
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return f"Error generating summary: {str(e)}"
    
    async def process_message(self, messages: List[Dict[str, str]]) -> str:
        """
        Process a message using the AutoGPT agent.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            
        Returns:
            The agent's response as a string
        """
        try:
            # Extract the last user message
            user_message = None
            for msg in reversed(messages):
                if msg["role"] == "user":
                    user_message = msg["content"]
                    break
            
            if not user_message:
                return "I don't see a question or task. How can I help you?"
            
            # Check if this is a task that requires autonomous processing
            is_task = await self._is_autonomous_task(user_message)
            
            if is_task:
                # Process as an autonomous task
                logger.info(f"Processing as autonomous task: {user_message[:50]}...")
                result = await self.process_task(user_message)
                
                # Format the response
                response = f"""
                # Task Execution Summary

                **Task**: {result['task']}

                ## Plan
                {self._format_plan(result.get('plan', []))}

                ## Execution Results
                {self._format_results(result.get('results', []))}

                ## Summary
                {result.get('summary', 'No summary available.')}
                """
                
                return response.strip()
            else:
                # Process as a regular message
                logger.info(f"Processing as regular message: {user_message[:50]}...")
                
                system_prompt = """
                You are an AI assistant specializing in PowerShell scripting and system administration.
                Provide helpful, accurate, and concise responses to the user's questions.
                """
                
                api_messages = [
                    {"role": "system", "content": system_prompt},
                ]
                
                # Add the conversation history
                for msg in messages:
                    api_messages.append({"role": msg["role"], "content": msg["content"]})
                
                response = await self._call_openai_api(api_messages, temperature=0.7)
                return response
            
        except Exception as e:
            logger.error(f"Error processing message with AutoGPT agent: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    async def _is_autonomous_task(self, message: str) -> bool:
        """
        Determine if a message is an autonomous task.
        
        Args:
            message: The message to check
            
        Returns:
            True if the message is an autonomous task, False otherwise
        """
        system_prompt = """
        You are a task classifier. Your job is to determine if a message represents a complex task
        that would benefit from autonomous planning and execution, or if it's a simple question
        that can be answered directly.
        
        Examples of complex tasks:
        - Create a PowerShell script to monitor system performance and alert when thresholds are exceeded
        - Develop a backup strategy for a small business with multiple servers
        - Design a network architecture for a new office with 50 employees
        
        Examples of simple questions:
        - What is PowerShell?
        - How do I list running processes in PowerShell?
        - What's the syntax for a foreach loop in PowerShell?
        
        Respond with "TASK" if the message represents a complex task, or "QUESTION" if it's a simple question.
        """
        
        user_prompt = f"""
        Message: {message}
        
        Is this a complex task or a simple question?
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = await self._call_openai_api(messages, temperature=0.3)
            return "TASK" in response.upper()
            
        except Exception as e:
            logger.error(f"Error classifying message: {e}")
            return False
    
    def _format_plan(self, plan: List[str]) -> str:
        """Format the plan for display."""
        if not plan:
            return "No plan was created."
        
        return "\n".join([f"{i+1}. {step}" for i, step in enumerate(plan)])
    
    def _format_results(self, results: List[Dict[str, str]]) -> str:
        """Format the results for display."""
        if not results:
            return "No steps were executed."
        
        formatted = []
        for i, result in enumerate(results):
            formatted.append(f"### Step {i+1}: {result['step']}")
            formatted.append(f"**Result**: {result['result'][:300]}..." if len(result['result']) > 300 else f"**Result**: {result['result']}")
            formatted.append("")
        
        return "\n".join(formatted)


# Example usage
if __name__ == "__main__":
    # Set your API key in the environment
    os.environ["OPENAI_API_KEY"] = "your-api-key-here"
    
    # Create an agent
    agent = AutoGPTAgent()
    
    # Example messages
    messages = [
        {"role": "user", "content": "Create a PowerShell script to monitor CPU and memory usage and send an alert if they exceed 80%"}
    ]
    
    # Process the message
    import asyncio
    response = asyncio.run(agent.process_message(messages))
    
    print(f"Response: {response}")
