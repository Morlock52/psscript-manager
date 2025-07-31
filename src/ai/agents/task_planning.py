"""
Task Planning Module for Agentic Systems

This module provides a structured approach to task planning and decomposition
for agentic systems. It enables agents to break down complex tasks into
manageable subtasks, create execution plans, and adapt to changing conditions.
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Callable, TypedDict, Type, Set, Tuple
from enum import Enum, auto
from datetime import datetime, timedelta
import uuid
import networkx as nx
import matplotlib.pyplot as plt
from dataclasses import dataclass, field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("task_planning")

class TaskStatus(Enum):
    """Status of a task in the planning system."""
    PENDING = auto()
    IN_PROGRESS = auto()
    COMPLETED = auto()
    FAILED = auto()
    BLOCKED = auto()
    CANCELLED = auto()
    DELEGATED = auto()

class TaskPriority(Enum):
    """Priority levels for tasks."""
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3
    BACKGROUND = 4

class TaskType(Enum):
    """Types of tasks in the planning system."""
    GOAL = auto()  # High-level goal
    TASK = auto()  # Regular task
    SUBTASK = auto()  # Component of a larger task
    ACTION = auto()  # Atomic action that can be directly executed
    CONDITION = auto()  # Condition that must be satisfied
    DECISION = auto()  # Decision point in the plan
    LOOP = auto()  # Repeated task
    PARALLEL = auto()  # Tasks that can be executed in parallel

@dataclass
class TaskContext:
    """Context information for a task."""
    variables: Dict[str, Any] = field(default_factory=dict)
    environment: Dict[str, Any] = field(default_factory=dict)
    constraints: List[str] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    history: List[Dict[str, Any]] = field(default_factory=list)
    
    def update_variable(self, name: str, value: Any) -> None:
        """Update a variable in the context."""
        self.variables[name] = value
        self.history.append({
            "type": "variable_update",
            "name": name,
            "value": value,
            "timestamp": datetime.now().isoformat()
        })
    
    def add_constraint(self, constraint: str) -> None:
        """Add a constraint to the context."""
        if constraint not in self.constraints:
            self.constraints.append(constraint)
            self.history.append({
                "type": "constraint_added",
                "constraint": constraint,
                "timestamp": datetime.now().isoformat()
            })
    
    def set_preference(self, name: str, value: Any) -> None:
        """Set a preference in the context."""
        self.preferences[name] = value
        self.history.append({
            "type": "preference_set",
            "name": name,
            "value": value,
            "timestamp": datetime.now().isoformat()
        })
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the context to a dictionary."""
        return {
            "variables": self.variables,
            "environment": self.environment,
            "constraints": self.constraints,
            "preferences": self.preferences,
            "history": self.history
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TaskContext':
        """Create a context from a dictionary."""
        return cls(
            variables=data.get("variables", {}),
            environment=data.get("environment", {}),
            constraints=data.get("constraints", []),
            preferences=data.get("preferences", {}),
            history=data.get("history", [])
        )

class Task:
    """A task in the planning system."""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        task_type: TaskType,
        status: TaskStatus = TaskStatus.PENDING,
        priority: TaskPriority = TaskPriority.MEDIUM,
        parent_id: Optional[str] = None,
        dependencies: List[str] = None,
        estimated_duration: Optional[timedelta] = None,
        deadline: Optional[datetime] = None,
        assignee: Optional[str] = None,
        context: Optional[TaskContext] = None,
        metadata: Dict[str, Any] = None,
        on_complete: Optional[Callable[['Task'], None]] = None,
        on_fail: Optional[Callable[['Task'], None]] = None
    ):
        """
        Initialize a task.
        
        Args:
            id: Unique identifier for the task
            name: Name of the task
            description: Description of the task
            task_type: Type of the task
            status: Status of the task
            priority: Priority of the task
            parent_id: ID of the parent task, if any
            dependencies: IDs of tasks that must be completed before this task
            estimated_duration: Estimated duration of the task
            deadline: Deadline for the task
            assignee: Entity assigned to the task
            context: Context information for the task
            metadata: Additional metadata for the task
            on_complete: Callback function when the task is completed
            on_fail: Callback function when the task fails
        """
        self.id = id
        self.name = name
        self.description = description
        self.task_type = task_type
        self.status = status
        self.priority = priority
        self.parent_id = parent_id
        self.dependencies = dependencies or []
        self.estimated_duration = estimated_duration
        self.deadline = deadline
        self.assignee = assignee
        self.context = context or TaskContext()
        self.metadata = metadata or {}
        self.on_complete = on_complete
        self.on_fail = on_fail
        
        # Tracking information
        self.created_at = datetime.now()
        self.updated_at = self.created_at
        self.started_at = None
        self.completed_at = None
        self.subtasks: List[str] = []
        self.progress = 0.0
        self.result = None
        self.error = None
        self.notes: List[str] = []
        self.history: List[Dict[str, Any]] = []
        
        # Record creation in history
        self._add_history_entry("created", {})
    
    def update_status(self, status: TaskStatus, reason: Optional[str] = None) -> None:
        """
        Update the status of the task.
        
        Args:
            status: New status of the task
            reason: Reason for the status update
        """
        old_status = self.status
        self.status = status
        self.updated_at = datetime.now()
        
        # Update tracking information based on status
        if status == TaskStatus.IN_PROGRESS and self.started_at is None:
            self.started_at = self.updated_at
        elif status == TaskStatus.COMPLETED:
            self.completed_at = self.updated_at
            if self.on_complete:
                self.on_complete(self)
        elif status == TaskStatus.FAILED:
            if self.on_fail:
                self.on_fail(self)
        
        # Record status update in history
        self._add_history_entry("status_updated", {
            "old_status": old_status.name,
            "new_status": status.name,
            "reason": reason
        })
    
    def update_progress(self, progress: float, note: Optional[str] = None) -> None:
        """
        Update the progress of the task.
        
        Args:
            progress: New progress value (0.0 to 1.0)
            note: Note about the progress update
        """
        old_progress = self.progress
        self.progress = max(0.0, min(1.0, progress))
        self.updated_at = datetime.now()
        
        if note:
            self.add_note(note)
        
        # Record progress update in history
        self._add_history_entry("progress_updated", {
            "old_progress": old_progress,
            "new_progress": self.progress
        })
    
    def add_subtask(self, subtask_id: str) -> None:
        """
        Add a subtask to the task.
        
        Args:
            subtask_id: ID of the subtask
        """
        if subtask_id not in self.subtasks:
            self.subtasks.append(subtask_id)
            self.updated_at = datetime.now()
            
            # Record subtask addition in history
            self._add_history_entry("subtask_added", {
                "subtask_id": subtask_id
            })
    
    def remove_subtask(self, subtask_id: str) -> None:
        """
        Remove a subtask from the task.
        
        Args:
            subtask_id: ID of the subtask
        """
        if subtask_id in self.subtasks:
            self.subtasks.remove(subtask_id)
            self.updated_at = datetime.now()
            
            # Record subtask removal in history
            self._add_history_entry("subtask_removed", {
                "subtask_id": subtask_id
            })
    
    def add_dependency(self, dependency_id: str) -> None:
        """
        Add a dependency to the task.
        
        Args:
            dependency_id: ID of the dependency
        """
        if dependency_id not in self.dependencies:
            self.dependencies.append(dependency_id)
            self.updated_at = datetime.now()
            
            # Record dependency addition in history
            self._add_history_entry("dependency_added", {
                "dependency_id": dependency_id
            })
    
    def remove_dependency(self, dependency_id: str) -> None:
        """
        Remove a dependency from the task.
        
        Args:
            dependency_id: ID of the dependency
        """
        if dependency_id in self.dependencies:
            self.dependencies.remove(dependency_id)
            self.updated_at = datetime.now()
            
            # Record dependency removal in history
            self._add_history_entry("dependency_removed", {
                "dependency_id": dependency_id
            })
    
    def set_result(self, result: Any) -> None:
        """
        Set the result of the task.
        
        Args:
            result: Result of the task
        """
        self.result = result
        self.updated_at = datetime.now()
        
        # Record result setting in history
        self._add_history_entry("result_set", {
            "result_type": type(result).__name__
        })
    
    def set_error(self, error: str) -> None:
        """
        Set the error of the task.
        
        Args:
            error: Error message
        """
        self.error = error
        self.updated_at = datetime.now()
        
        # Record error setting in history
        self._add_history_entry("error_set", {
            "error": error
        })
    
    def add_note(self, note: str) -> None:
        """
        Add a note to the task.
        
        Args:
            note: Note to add
        """
        self.notes.append(note)
        self.updated_at = datetime.now()
        
        # Record note addition in history
        self._add_history_entry("note_added", {
            "note": note
        })
    
    def _add_history_entry(self, event_type: str, data: Dict[str, Any]) -> None:
        """
        Add an entry to the task history.
        
        Args:
            event_type: Type of the event
            data: Data associated with the event
        """
        entry = {
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.history.append(entry)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the task to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "task_type": self.task_type.name,
            "status": self.status.name,
            "priority": self.priority.name,
            "parent_id": self.parent_id,
            "dependencies": self.dependencies,
            "estimated_duration": self.estimated_duration.total_seconds() if self.estimated_duration else None,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "assignee": self.assignee,
            "context": self.context.to_dict(),
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "subtasks": self.subtasks,
            "progress": self.progress,
            "result": self.result,
            "error": self.error,
            "notes": self.notes,
            "history": self.history
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create a task from a dictionary."""
        # Convert string representations back to enums
        task_type = TaskType[data["task_type"]]
        status = TaskStatus[data["status"]]
        priority = TaskPriority[data["priority"]]
        
        # Convert ISO format strings back to datetime objects
        estimated_duration = timedelta(seconds=data["estimated_duration"]) if data["estimated_duration"] else None
        deadline = datetime.fromisoformat(data["deadline"]) if data["deadline"] else None
        
        # Create the task
        task = cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            task_type=task_type,
            status=status,
            priority=priority,
            parent_id=data["parent_id"],
            dependencies=data["dependencies"],
            estimated_duration=estimated_duration,
            deadline=deadline,
            assignee=data["assignee"],
            context=TaskContext.from_dict(data["context"]),
            metadata=data["metadata"]
        )
        
        # Set tracking information
        task.created_at = datetime.fromisoformat(data["created_at"])
        task.updated_at = datetime.fromisoformat(data["updated_at"])
        task.started_at = datetime.fromisoformat(data["started_at"]) if data["started_at"] else None
        task.completed_at = datetime.fromisoformat(data["completed_at"]) if data["completed_at"] else None
        task.subtasks = data["subtasks"]
        task.progress = data["progress"]
        task.result = data["result"]
        task.error = data["error"]
        task.notes = data["notes"]
        task.history = data["history"]
        
        return task

class TaskGraph:
    """A graph representation of tasks and their dependencies."""
    
    def __init__(self):
        """Initialize a task graph."""
        self.graph = nx.DiGraph()
    
    def add_task(self, task: Task) -> None:
        """
        Add a task to the graph.
        
        Args:
            task: Task to add
        """
        self.graph.add_node(task.id, task=task)
        
        # Add edges for dependencies
        for dependency_id in task.dependencies:
            self.graph.add_edge(dependency_id, task.id)
        
        # Add edges for parent-child relationships
        if task.parent_id:
            self.graph.add_edge(task.parent_id, task.id, relationship="parent-child")
    
    def remove_task(self, task_id: str) -> None:
        """
        Remove a task from the graph.
        
        Args:
            task_id: ID of the task to remove
        """
        if task_id in self.graph:
            self.graph.remove_node(task_id)
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """
        Get a task from the graph.
        
        Args:
            task_id: ID of the task to get
            
        Returns:
            The task, or None if not found
        """
        if task_id in self.graph:
            return self.graph.nodes[task_id]["task"]
        return None
    
    def get_dependencies(self, task_id: str) -> List[Task]:
        """
        Get the dependencies of a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            List of dependency tasks
        """
        if task_id not in self.graph:
            return []
        
        dependencies = []
        for dependency_id in self.graph.predecessors(task_id):
            dependency = self.get_task(dependency_id)
            if dependency:
                dependencies.append(dependency)
        
        return dependencies
    
    def get_dependents(self, task_id: str) -> List[Task]:
        """
        Get the tasks that depend on a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            List of dependent tasks
        """
        if task_id not in self.graph:
            return []
        
        dependents = []
        for dependent_id in self.graph.successors(task_id):
            dependent = self.get_task(dependent_id)
            if dependent:
                dependents.append(dependent)
        
        return dependents
    
    def get_subtasks(self, task_id: str) -> List[Task]:
        """
        Get the subtasks of a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            List of subtask tasks
        """
        if task_id not in self.graph:
            return []
        
        subtasks = []
        for _, subtask_id, data in self.graph.out_edges(task_id, data=True):
            if data.get("relationship") == "parent-child":
                subtask = self.get_task(subtask_id)
                if subtask:
                    subtasks.append(subtask)
        
        return subtasks
    
    def get_parent(self, task_id: str) -> Optional[Task]:
        """
        Get the parent task of a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            The parent task, or None if not found
        """
        if task_id not in self.graph:
            return None
        
        for parent_id, _, data in self.graph.in_edges(task_id, data=True):
            if data.get("relationship") == "parent-child":
                return self.get_task(parent_id)
        
        return None
    
    def get_root_tasks(self) -> List[Task]:
        """
        Get the root tasks in the graph (tasks with no dependencies).
        
        Returns:
            List of root tasks
        """
        root_tasks = []
        for task_id in self.graph:
            if self.graph.in_degree(task_id) == 0:
                task = self.get_task(task_id)
                if task:
                    root_tasks.append(task)
        
        return root_tasks
    
    def get_leaf_tasks(self) -> List[Task]:
        """
        Get the leaf tasks in the graph (tasks with no dependents).
        
        Returns:
            List of leaf tasks
        """
        leaf_tasks = []
        for task_id in self.graph:
            if self.graph.out_degree(task_id) == 0:
                task = self.get_task(task_id)
                if task:
                    leaf_tasks.append(task)
        
        return leaf_tasks
    
    def get_critical_path(self) -> List[Task]:
        """
        Get the critical path in the graph (longest path from a root to a leaf).
        
        Returns:
            List of tasks in the critical path
        """
        # Find the longest path in the graph
        longest_path = []
        for root_task in self.get_root_tasks():
            for leaf_task in self.get_leaf_tasks():
                try:
                    path = nx.shortest_path(self.graph, root_task.id, leaf_task.id)
                    if len(path) > len(longest_path):
                        longest_path = path
                except nx.NetworkXNoPath:
                    pass
        
        # Convert path of task IDs to list of tasks
        critical_path = []
        for task_id in longest_path:
            task = self.get_task(task_id)
            if task:
                critical_path.append(task)
        
        return critical_path
    
    def get_next_tasks(self) -> List[Task]:
        """
        Get the next tasks that can be executed (tasks with all dependencies satisfied).
        
        Returns:
            List of next tasks
        """
        next_tasks = []
        for task_id in self.graph:
            task = self.get_task(task_id)
            if task and task.status == TaskStatus.PENDING:
                dependencies_satisfied = True
                for dependency in self.get_dependencies(task_id):
                    if dependency.status != TaskStatus.COMPLETED:
                        dependencies_satisfied = False
                        break
                
                if dependencies_satisfied:
                    next_tasks.append(task)
        
        return next_tasks
    
    def check_for_cycles(self) -> bool:
        """
        Check if the graph contains cycles.
        
        Returns:
            True if the graph contains cycles, False otherwise
        """
        try:
            nx.find_cycle(self.graph)
            return True
        except nx.NetworkXNoCycle:
            return False
    
    def visualize(self, filename: Optional[str] = None) -> None:
        """
        Visualize the task graph.
        
        Args:
            filename: Filename to save the visualization to (optional)
        """
        # Create a copy of the graph for visualization
        viz_graph = self.graph.copy()
        
        # Set node colors based on task status
        node_colors = []
        for task_id in viz_graph:
            task = self.get_task(task_id)
            if task:
                if task.status == TaskStatus.COMPLETED:
                    node_colors.append("green")
                elif task.status == TaskStatus.IN_PROGRESS:
                    node_colors.append("yellow")
                elif task.status == TaskStatus.FAILED:
                    node_colors.append("red")
                elif task.status == TaskStatus.BLOCKED:
                    node_colors.append("orange")
                else:
                    node_colors.append("lightblue")
        
        # Set edge colors based on relationship type
        edge_colors = []
        for _, _, data in viz_graph.edges(data=True):
            if data.get("relationship") == "parent-child":
                edge_colors.append("blue")
            else:
                edge_colors.append("black")
        
        # Create labels for nodes
        labels = {}
        for task_id in viz_graph:
            task = self.get_task(task_id)
            if task:
                labels[task_id] = f"{task.name}\n({task.status.name})"
        
        # Draw the graph
        plt.figure(figsize=(12, 8))
        pos = nx.spring_layout(viz_graph)
        nx.draw_networkx_nodes(viz_graph, pos, node_color=node_colors, node_size=500)
        nx.draw_networkx_edges(viz_graph, pos, edge_color=edge_colors, arrows=True)
        nx.draw_networkx_labels(viz_graph, pos, labels=labels, font_size=10)
        plt.axis("off")
        
        # Save or show the visualization
        if filename:
            plt.savefig(filename)
        else:
            plt.show()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the task graph to a dictionary."""
        tasks = {}
        for task_id in self.graph:
            task = self.get_task(task_id)
            if task:
                tasks[task_id] = task.to_dict()
        
        edges = []
        for source, target, data in self.graph.edges(data=True):
            edges.append({
                "source": source,
                "target": target,
                "relationship": data.get("relationship", "dependency")
            })
        
        return {
            "tasks": tasks,
            "edges": edges
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TaskGraph':
        """Create a task graph from a dictionary."""
        graph = cls()
        
        # Add tasks
        for task_id, task_data in data["tasks"].items():
            task = Task.from_dict(task_data)
            graph.add_task(task)
        
        # Add edges
        for edge in data["edges"]:
            if edge["relationship"] == "parent-child":
                graph.graph.add_edge(edge["source"], edge["target"], relationship="parent-child")
            else:
                graph.graph.add_edge(edge["source"], edge["target"])
        
        return graph

class TaskPlanner:
    """A planner for creating and managing task plans."""
    
    def __init__(self):
        """Initialize a task planner."""
        self.task_graph = TaskGraph()
        self.task_history: List[Dict[str, Any]] = []
    
    def create_task(
        self,
        name: str,
        description: str,
        task_type: TaskType,
        status: TaskStatus = TaskStatus.PENDING,
        priority: TaskPriority = TaskPriority.MEDIUM,
        parent_id: Optional[str] = None,
        dependencies: List[str] = None,
        estimated_duration: Optional[timedelta] = None,
        deadline: Optional[datetime] = None,
        assignee: Optional[str] = None,
        context: Optional[TaskContext] = None,
        metadata: Dict[str, Any] = None
    ) -> Task:
        """
        Create a new task.
        
        Args:
            name: Name of the task
            description: Description of the task
            task_type: Type of the task
            status: Status of the task
            priority: Priority of the task
            parent_id: ID of the parent task, if any
            dependencies: IDs of tasks that must be completed before this task
            estimated_duration: Estimated duration of the task
            deadline: Deadline for the task
            assignee: Entity assigned to the task
            context: Context information for the task
            metadata: Additional metadata for the task
            
        Returns:
            The created task
        """
        # Generate a unique ID for the task
        task_id = str(uuid.uuid4())
        
        # Create the task
        task = Task(
            id=task_id,
            name=name,
            description=description,
            task_type=task_type,
            status=status,
            priority=priority,
            parent_id=parent_id,
            dependencies=dependencies,
            estimated_duration=estimated_duration,
            deadline=deadline,
            assignee=assignee,
            context=context,
            metadata=metadata
        )
        
        # Add the task to the graph
        self.task_graph.add_task(task)
        
        # If the task has a parent, add it as a subtask of the parent
        if parent_id:
            parent_task = self.task_graph.get_task(parent_id)
            if parent_task:
                parent_task.add_subtask(task_id)
        
        # Record task creation in history
        self._add_history_entry("task_created", {
            "task_id": task_id,
            "name": name,
            "task_type": task_type.name
        })
        
        return task
    
    def update_task(self, task_id: str, **kwargs) -> Optional[Task]:
        """
        Update a task.
        
        Args:
            task_id: ID of the task to update
            **kwargs: Attributes to update
            
        Returns:
            The updated task, or None if not found
        """
        task = self.task_graph.get_task(task_id)
        if not task:
            return None
        
        # Update task attributes
        for key, value in kwargs.items():
            if hasattr(task, key):
                setattr(task, key, value)
        
        # Update the task's updated_at timestamp
        task.updated_at = datetime.now()
        
        # Record task update in history
        self._add_history_entry("task_updated", {
            "task_id": task_id,
            "updated_fields": list(kwargs.keys())
        })
        
        return task
    
    def delete_task(self, task_id: str) -> bool:
        """
        Delete a task.
        
        Args:
            task_id: ID of the task to delete
            
        Returns:
            True if the task was deleted, False otherwise
        """
        task = self.task_graph.get_task(task_id)
        if not task:
            return False
        
        # Remove the task from its parent's subtasks
        if task.parent_id:
            parent_task = self.task_graph.get_task(task.parent_id)
            if parent_task:
                parent_task.remove_subtask(task_id)
        
        # Remove the task from the graph
        self.task_graph.remove_task(task_id)
        
        # Record task deletion in history
        self._add_history_entry("task_deleted", {
            "task_id": task_id
        })
        
        return True
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """
        Get a task.
        
        Args:
            task_id: ID of the task to get
            
        Returns:
            The task, or None if not found
        """
        return self.task_graph.get_task(task_id)
    
    def get_all_tasks(self) -> List[Task]:
        """
        Get all tasks.
        
        Returns:
            List of all tasks
        """
        tasks = []
        for task_id in self.task_graph.graph:
            task = self.task_graph.get_task(task_id)
            if task:
                tasks.append(task)
        
        return tasks
    
    def get_tasks_by_status(self, status: TaskStatus) -> List[Task]:
        """
        Get tasks by status.
        
        Args:
            status: Status to filter by
            
        Returns:
            List of tasks with the specified status
        """
        return [task for task in self.get_all_tasks() if task.status == status]
    
    def get_tasks_by_priority(self, priority: TaskPriority) -> List[Task]:
        """
        Get tasks by priority.
        
        Args:
            priority: Priority to filter by
            
        Returns:
            List of tasks with the specified priority
        """
        return [task for task in self.get_all_tasks() if task.priority == priority]
    
    def get_tasks_by_assignee(self, assignee: str) -> List[Task]:
        """
        Get tasks by assignee.
        
        Args:
            assignee: Assignee to filter by
            
        Returns:
            List of tasks assigned to the specified assignee
        """
        return [task for task in self.get_all_tasks() if task.assignee == assignee]
    
    def get_tasks_by_type(self, task_type: TaskType) -> List[Task]:
        """
        Get tasks by type.
        
        Args:
            task_type: Type to filter by
            
        Returns:
            List of tasks with the specified type
        """
        return [task for task in self.get_all_tasks() if task.task_type == task_type]
    
    def get_tasks_by_deadline(self, before: Optional[datetime] = None, after: Optional[datetime] = None) -> List[Task]:
        """
        Get tasks by deadline.
        
        Args:
            before: Get tasks with deadline before this time
            after: Get tasks with deadline after this time
            
        Returns:
            List of tasks with deadlines in the specified range
        """
        tasks = self.get_all_tasks()
        
        if before:
            tasks = [task for task in tasks if task.deadline and task.deadline < before]
        
        if after:
            tasks = [task for task in tasks if task.deadline and task.deadline > after]
        
        return tasks
    
    def get_overdue_tasks(self) -> List[Task]:
        """
        Get overdue tasks (tasks with deadline in the past that are not completed).
        
        Returns:
            List of overdue tasks
        """
        now = datetime.now()
        return [
            task for task in self.get_all_tasks() 
            if task.deadline and task.deadline < now and task.status != TaskStatus.COMPLETED
        ]
    
    def get_blocked_tasks(self) -> List[Task]:
        """
        Get blocked tasks (tasks with dependencies that are not completed).
        
        Returns:
            List of blocked tasks
        """
        blocked_tasks = []
        for task in self.get_all_tasks():
            if task.status == TaskStatus.PENDING:
                for dependency_id in task.dependencies:
                    dependency = self.task_graph.get_task(dependency_id)
                    if dependency and dependency.status != TaskStatus.COMPLETED:
                        blocked_tasks.append(task)
                        break
        
        return blocked_tasks
    
    def decompose_task(
        self,
        parent_task_id: str,
        subtasks: List[Dict[str, Any]]
    ) -> List[Task]:
        """
        Decompose a task into subtasks.
        
        Args:
            parent_task_id: ID of the parent task
            subtasks: List of subtask specifications
            
        Returns:
            List of created subtasks
        """
        parent_task = self.task_graph.get_task(parent_task_id)
        if not parent_task:
            return []
        
        created_subtasks = []
        
        for subtask_spec in subtasks:
            # Create the subtask
            subtask = self.create_task(
                name=subtask_spec["name"],
                description=subtask_spec["description"],
                task_type=subtask_spec.get("task_type", TaskType.SUBTASK),
                status=subtask_spec.get("status", TaskStatus.PENDING),
                priority=subtask_spec.get("priority", parent_task.priority),
                parent_id=parent_task_id,
                dependencies=subtask_spec.get("dependencies", []),
                estimated_duration=subtask_spec.get("estimated_duration"),
                deadline=subtask_spec.get("deadline"),
                assignee=subtask_spec.get("assignee", parent_task.assignee),
                context=subtask_spec.get("context"),
                metadata=subtask_spec.get("metadata", {})
            )
            
            created_subtasks.append(subtask)
        
        return created_subtasks
    
    def create_sequential_tasks(
        self,
        tasks: List[Dict[str, Any]],
        parent_id: Optional[str] = None
    ) -> List[Task]:
        """
        Create a sequence of tasks where each task depends on the previous one.
        
        Args:
            tasks: List of task specifications
            parent_id: ID of the parent task, if any
            
        Returns:
            List of created tasks
        """
        created_tasks = []
        previous_task_id = None
        
        for task_spec in tasks:
            # Add dependency on the previous task
            dependencies = task_spec.get("dependencies", [])
            if previous_task_id:
                dependencies.append(previous_task_id)
            
            # Create the task
            task = self.create_task(
                name=task_spec["name"],
                description=task_spec["description"],
                task_type=task_spec.get("task_type", TaskType.TASK),
                status=task_spec.get("status", TaskStatus.PENDING),
                priority=task_spec.get("priority", TaskPriority.MEDIUM),
                parent_id=parent_id,
                dependencies=dependencies,
                estimated_duration=task_spec.get("estimated_duration"),
                deadline=task_spec.get("deadline"),
                assignee=task_spec.get("assignee"),
                context=task_spec.get("context"),
                metadata=task_spec.get("metadata", {})
            )
            
            created_tasks.append(task)
            previous_task_id = task.id
        
        return created_tasks
    
    def create_parallel_tasks(
        self,
        tasks: List[Dict[str, Any]],
        parent_id: Optional[str] = None,
        common_dependencies: List[str] = None
    ) -> List[Task]:
        """
        Create a set of parallel tasks that can be executed simultaneously.
        
        Args:
            tasks: List of task specifications
            parent_id: ID of the parent task, if any
            common_dependencies: IDs of tasks that all created tasks depend on
            
        Returns:
            List of created tasks
        """
        created_tasks = []
        common_dependencies = common_dependencies or []
        
        for task_spec in tasks:
            # Add common dependencies
            dependencies = task_spec.get("dependencies", [])
            dependencies.extend(common_dependencies)
            
            # Create the task
            task = self.create_task(
                name=task_spec["name"],
                description=task_spec["description"],
                task_type=task_spec.get("task_type", TaskType.TASK),
                status=task_spec.get("status", TaskStatus.PENDING),
                priority=task_spec.get("priority", TaskPriority.MEDIUM),
                parent_id=parent_id,
                dependencies=dependencies,
                estimated_duration=task_spec.get("estimated_duration"),
                deadline=task_spec.get("deadline"),
                assignee=task_spec.get("assignee"),
                context=task_spec.get("context"),
                metadata=task_spec.get("metadata", {})
            )
            
            created_tasks.append(task)
        
        return created_tasks
    
    def execute_next_tasks(self) -> List[Task]:
        """
        Execute the next tasks in the plan (tasks with all dependencies satisfied).
        
        Returns:
            List of tasks that were started
        """
        next_tasks = self.task_graph.get_next_tasks()
        started_tasks = []
        
        for task in next_tasks:
            task.update_status(TaskStatus.IN_PROGRESS, "Automatically started by planner")
            started_tasks.append(task)
        
        return started_tasks
    
    def mark_task_completed(self, task_id: str, result: Any = None) -> bool:
        """
        Mark a task as completed.
        
        Args:
            task_id: ID of the task to mark as completed
            result: Result of the task
            
        Returns:
            True if the task was marked as completed, False otherwise
        """
        task = self.task_graph.get_task(task_id)
        if not task:
            return False
        
        # Set the result if provided
        if result is not None:
            task.set_result(result)
        
        # Mark the task as completed
        task.update_status(TaskStatus.COMPLETED, "Marked as completed by planner")
        
        # Record task completion in history
        self._add_history_entry("task_completed", {
            "task_id": task_id,
            "has_result": result is not None
        })
        
        return True
    
    def mark_task_failed(self, task_id: str, error: str) -> bool:
        """
        Mark a task as failed.
        
        Args:
            task_id: ID of the task to mark as failed
            error: Error message
            
        Returns:
            True if the task was marked as failed, False otherwise
        """
        task = self.task_graph.get_task(task_id)
        if not task:
            return False
        
        # Set the error
        task.set_error(error)
        
        # Mark the task as failed
        task.update_status(TaskStatus.FAILED, "Marked as failed by planner")
        
        # Record task failure in history
        self._add_history_entry("task_failed", {
            "task_id": task_id,
            "error": error
        })
        
        return True
    
    def save_plan(self, filepath: str) -> bool:
        """
        Save the task plan to a file.
        
        Args:
            filepath: Path to save the plan to
            
        Returns:
            True if the plan was saved successfully, False otherwise
        """
        try:
            # Create a serializable representation of the plan
            plan_data = {
                "task_graph": self.task_graph.to_dict(),
                "task_history": self.task_history,
                "timestamp": datetime.now().isoformat()
            }
            
            # Save to file
            with open(filepath, 'w') as f:
                json.dump(plan_data, f, indent=2)
            
            logger.info(f"Saved task plan to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error saving task plan: {e}")
            return False
    
    def load_plan(self, filepath: str) -> bool:
        """
        Load a task plan from a file.
        
        Args:
            filepath: Path to load the plan from
            
        Returns:
            True if the plan was loaded successfully, False otherwise
        """
        try:
            # Load from file
            with open(filepath, 'r') as f:
                plan_data = json.load(f)
            
            # Load the task graph
            self.task_graph = TaskGraph.from_dict(plan_data["task_graph"])
            
            # Load the task history
            self.task_history = plan_data["task_history"]
            
            logger.info(f"Loaded task plan from {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error loading task plan: {e}")
            return False
    
    def _add_history_entry(self, event_type: str, data: Dict[str, Any]) -> None:
        """
        Add an entry to the task history.
        
        Args:
            event_type: Type of the event
            data: Data associated with the event
        """
        entry = {
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.task_history.append(entry)

class TaskDecomposer:
    """A utility for decomposing complex tasks into simpler subtasks."""
    
    def __init__(self, planner: TaskPlanner):
        """
        Initialize a task decomposer.
        
        Args:
            planner: The task planner to use
        """
        self.planner = planner
    
    def decompose_by_steps(
        self,
        parent_task_id: str,
        steps: List[Dict[str, Any]],
        sequential: bool = True
    ) -> List[Task]:
        """
        Decompose a task into sequential steps.
        
        Args:
            parent_task_id: ID of the parent task
            steps: List of step specifications
            sequential: Whether the steps should be sequential or parallel
            
        Returns:
            List of created subtasks
        """
        if sequential:
            return self.planner.create_sequential_tasks(steps, parent_task_id)
        else:
            return self.planner.create_parallel_tasks(steps, parent_task_id)
    
    def decompose_by_components(
        self,
        parent_task_id: str,
        components: List[Dict[str, Any]]
    ) -> List[Task]:
        """
        Decompose a task into component subtasks.
        
        Args:
            parent_task_id: ID of the parent task
            components: List of component specifications
            
        Returns:
            List of created subtasks
        """
        return self.planner.decompose_task(parent_task_id, components)
    
    def decompose_by_roles(
        self,
        parent_task_id: str,
        roles: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, List[Task]]:
        """
        Decompose a task by roles.
        
        Args:
            parent_task_id: ID of the parent task
            roles: Dictionary mapping role names to lists of task specifications
            
        Returns:
            Dictionary mapping role names to lists of created tasks
        """
        result = {}
        
        for role, tasks in roles.items():
            role_tasks = []
            
            for task_spec in tasks:
                # Set the assignee to the role
                task_spec["assignee"] = role
                
                # Create the task
                task = self.planner.create_task(
                    name=task_spec["name"],
                    description=task_spec["description"],
                    task_type=task_spec.get("task_type", TaskType.TASK),
                    status=task_spec.get("status", TaskStatus.PENDING),
                    priority=task_spec.get("priority", TaskPriority.MEDIUM),
                    parent_id=parent_task_id,
                    dependencies=task_spec.get("dependencies", []),
                    estimated_duration=task_spec.get("estimated_duration"),
                    deadline=task_spec.get("deadline"),
                    assignee=role,
                    context=task_spec.get("context"),
                    metadata=task_spec.get("metadata", {})
                )
                
                role_tasks.append(task)
            
            result[role] = role_tasks
        
        return result
    
    def decompose_by_time(
        self,
        parent_task_id: str,
        phases: List[Dict[str, Any]]
    ) -> List[Task]:
        """
        Decompose a task into time-based phases.
        
        Args:
            parent_task_id: ID of the parent task
            phases: List of phase specifications, in chronological order
            
        Returns:
            List of created phase tasks
        """
        # Create sequential tasks for the phases
        phase_tasks = self.planner.create_sequential_tasks(phases, parent_task_id)
        
        # Set appropriate deadlines for each phase
        parent_task = self.planner.get_task(parent_task_id)
        if parent_task and parent_task.deadline:
            # Calculate phase durations as fractions of the total duration
            total_duration = sum(
                phase.get("duration_weight", 1.0) for phase in phases
            )
            
            current_time = datetime.now()
            remaining_time = (parent_task.deadline - current_time).total_seconds()
            
            for i, phase in enumerate(phases):
                phase_task = phase_tasks[i]
                weight = phase.get("duration_weight", 1.0)
                phase_duration = timedelta(seconds=remaining_time * weight / total_duration)
                phase_deadline = current_time + phase_duration
                
                # Update the phase task with the calculated deadline
                self.planner.update_task(phase_task.id, deadline=phase_deadline)
                
                # Update current_time for the next phase
                current_time = phase_deadline
        
        return phase_tasks
    
    def create_decision_point(
        self,
        parent_task_id: str,
        name: str,
        description: str,
        options: List[Dict[str, Any]],
        condition: Optional[str] = None
    ) -> Tuple[Task, List[Task]]:
        """
        Create a decision point in the task plan.
        
        Args:
            parent_task_id: ID of the parent task
            name: Name of the decision task
            description: Description of the decision task
            options: List of option specifications
            condition: Condition for making the decision
            
        Returns:
            Tuple of (decision task, option tasks)
        """
        # Create the decision task
        decision_task = self.planner.create_task(
            name=name,
            description=description,
            task_type=TaskType.DECISION,
            parent_id=parent_task_id,
            metadata={"condition": condition} if condition else {}
        )
        
        # Create tasks for each option
        option_tasks = []
        
        for option in options:
            # Create the option task
            option_task = self.planner.create_task(
                name=option["name"],
                description=option["description"],
                task_type=option.get("task_type", TaskType.TASK),
                status=TaskStatus.PENDING,
                priority=option.get("priority", TaskPriority.MEDIUM),
                parent_id=parent_task_id,
                dependencies=[decision_task.id],  # Option depends on the decision
                estimated_duration=option.get("estimated_duration"),
                deadline=option.get("deadline"),
                assignee=option.get("assignee"),
                context=option.get("context"),
                metadata=option.get("metadata", {})
            )
            
            option_tasks.append(option_task)
        
        return decision_task, option_tasks
