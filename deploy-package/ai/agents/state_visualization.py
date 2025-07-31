"""
State Visualization Module for Agentic Systems

This module provides tools for visualizing the internal state of agents,
including their memory, reasoning process, and decision-making. It helps
with debugging, understanding, and explaining agent behavior.
"""

import os
import json
import time
import logging
from typing import Dict, List, Any, Optional, Union, Callable, Set, Tuple
from enum import Enum, auto
from datetime import datetime
import uuid
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Patch
import numpy as np
from dataclasses import dataclass, field
import base64
from io import BytesIO
import re
from collections import defaultdict, Counter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("state_visualization")

class VisualizationType(Enum):
    """Types of visualizations available."""
    MEMORY_GRAPH = auto()
    REASONING_TREE = auto()
    DECISION_FLOW = auto()
    TOOL_USAGE = auto()
    STATE_HISTORY = auto()
    ATTENTION_MAP = auto()
    CONVERSATION_FLOW = auto()
    TASK_PROGRESS = auto()
    AGENT_NETWORK = auto()

class MemoryNode:
    """A node in the memory graph representing a piece of information."""
    
    def __init__(
        self,
        id: str,
        content: str,
        node_type: str,
        metadata: Dict[str, Any] = None,
        timestamp: Optional[datetime] = None,
        importance: float = 0.5,
        source: Optional[str] = None
    ):
        """
        Initialize a memory node.
        
        Args:
            id: Unique identifier for the node
            content: Content of the memory
            node_type: Type of the memory node
            metadata: Additional metadata for the node
            timestamp: When the memory was created
            importance: Importance score of the memory (0.0 to 1.0)
            source: Source of the memory
        """
        self.id = id
        self.content = content
        self.node_type = node_type
        self.metadata = metadata or {}
        self.timestamp = timestamp or datetime.now()
        self.importance = importance
        self.source = source
        self.references: List[str] = []
        self.activation = 0.0
        self.last_accessed = self.timestamp
        self.access_count = 0
    
    def add_reference(self, node_id: str) -> None:
        """
        Add a reference to another node.
        
        Args:
            node_id: ID of the node to reference
        """
        if node_id not in self.references:
            self.references.append(node_id)
    
    def remove_reference(self, node_id: str) -> None:
        """
        Remove a reference to another node.
        
        Args:
            node_id: ID of the node to remove reference to
        """
        if node_id in self.references:
            self.references.remove(node_id)
    
    def access(self) -> None:
        """Access the memory node, updating its activation and access statistics."""
        self.last_accessed = datetime.now()
        self.access_count += 1
        self.activation = 1.0
    
    def decay_activation(self, decay_rate: float = 0.1) -> None:
        """
        Decay the activation of the memory node.
        
        Args:
            decay_rate: Rate at which activation decays (0.0 to 1.0)
        """
        time_since_access = (datetime.now() - self.last_accessed).total_seconds()
        decay_factor = np.exp(-decay_rate * time_since_access)
        self.activation *= decay_factor
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the memory node to a dictionary."""
        return {
            "id": self.id,
            "content": self.content,
            "node_type": self.node_type,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
            "importance": self.importance,
            "source": self.source,
            "references": self.references,
            "activation": self.activation,
            "last_accessed": self.last_accessed.isoformat(),
            "access_count": self.access_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MemoryNode':
        """Create a memory node from a dictionary."""
        node = cls(
            id=data["id"],
            content=data["content"],
            node_type=data["node_type"],
            metadata=data["metadata"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            importance=data["importance"],
            source=data["source"]
        )
        
        node.references = data["references"]
        node.activation = data["activation"]
        node.last_accessed = datetime.fromisoformat(data["last_accessed"])
        node.access_count = data["access_count"]
        
        return node

class ReasoningStep:
    """A step in the reasoning process of an agent."""
    
    def __init__(
        self,
        id: str,
        content: str,
        step_type: str,
        parent_id: Optional[str] = None,
        metadata: Dict[str, Any] = None,
        timestamp: Optional[datetime] = None,
        confidence: float = 0.5,
        supporting_evidence: List[str] = None
    ):
        """
        Initialize a reasoning step.
        
        Args:
            id: Unique identifier for the step
            content: Content of the reasoning step
            step_type: Type of the reasoning step
            parent_id: ID of the parent step, if any
            metadata: Additional metadata for the step
            timestamp: When the step was created
            confidence: Confidence score of the step (0.0 to 1.0)
            supporting_evidence: IDs of memory nodes that support this step
        """
        self.id = id
        self.content = content
        self.step_type = step_type
        self.parent_id = parent_id
        self.metadata = metadata or {}
        self.timestamp = timestamp or datetime.now()
        self.confidence = confidence
        self.supporting_evidence = supporting_evidence or []
        self.children: List[str] = []
    
    def add_child(self, step_id: str) -> None:
        """
        Add a child step.
        
        Args:
            step_id: ID of the child step
        """
        if step_id not in self.children:
            self.children.append(step_id)
    
    def remove_child(self, step_id: str) -> None:
        """
        Remove a child step.
        
        Args:
            step_id: ID of the child step to remove
        """
        if step_id in self.children:
            self.children.remove(step_id)
    
    def add_evidence(self, node_id: str) -> None:
        """
        Add supporting evidence.
        
        Args:
            node_id: ID of the memory node to add as evidence
        """
        if node_id not in self.supporting_evidence:
            self.supporting_evidence.append(node_id)
    
    def remove_evidence(self, node_id: str) -> None:
        """
        Remove supporting evidence.
        
        Args:
            node_id: ID of the memory node to remove as evidence
        """
        if node_id in self.supporting_evidence:
            self.supporting_evidence.remove(node_id)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the reasoning step to a dictionary."""
        return {
            "id": self.id,
            "content": self.content,
            "step_type": self.step_type,
            "parent_id": self.parent_id,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
            "confidence": self.confidence,
            "supporting_evidence": self.supporting_evidence,
            "children": self.children
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ReasoningStep':
        """Create a reasoning step from a dictionary."""
        step = cls(
            id=data["id"],
            content=data["content"],
            step_type=data["step_type"],
            parent_id=data["parent_id"],
            metadata=data["metadata"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            confidence=data["confidence"],
            supporting_evidence=data["supporting_evidence"]
        )
        
        step.children = data["children"]
        
        return step

class ToolUsage:
    """A record of a tool usage by an agent."""
    
    def __init__(
        self,
        id: str,
        tool_name: str,
        inputs: Dict[str, Any],
        outputs: Optional[Dict[str, Any]] = None,
        status: str = "pending",
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        error: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ):
        """
        Initialize a tool usage record.
        
        Args:
            id: Unique identifier for the tool usage
            tool_name: Name of the tool
            inputs: Input parameters to the tool
            outputs: Output from the tool
            status: Status of the tool usage
            start_time: When the tool usage started
            end_time: When the tool usage ended
            error: Error message, if any
            metadata: Additional metadata for the tool usage
        """
        self.id = id
        self.tool_name = tool_name
        self.inputs = inputs
        self.outputs = outputs
        self.status = status
        self.start_time = start_time or datetime.now()
        self.end_time = end_time
        self.error = error
        self.metadata = metadata or {}
    
    def complete(self, outputs: Dict[str, Any]) -> None:
        """
        Mark the tool usage as completed.
        
        Args:
            outputs: Output from the tool
        """
        self.outputs = outputs
        self.status = "completed"
        self.end_time = datetime.now()
    
    def fail(self, error: str) -> None:
        """
        Mark the tool usage as failed.
        
        Args:
            error: Error message
        """
        self.error = error
        self.status = "failed"
        self.end_time = datetime.now()
    
    def duration(self) -> float:
        """
        Get the duration of the tool usage in seconds.
        
        Returns:
            Duration in seconds, or None if the tool usage is not completed
        """
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return (datetime.now() - self.start_time).total_seconds()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the tool usage to a dictionary."""
        return {
            "id": self.id,
            "tool_name": self.tool_name,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "status": self.status,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "error": self.error,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ToolUsage':
        """Create a tool usage from a dictionary."""
        return cls(
            id=data["id"],
            tool_name=data["tool_name"],
            inputs=data["inputs"],
            outputs=data["outputs"],
            status=data["status"],
            start_time=datetime.fromisoformat(data["start_time"]),
            end_time=datetime.fromisoformat(data["end_time"]) if data["end_time"] else None,
            error=data["error"],
            metadata=data["metadata"]
        )

class StateSnapshot:
    """A snapshot of an agent's state at a point in time."""
    
    def __init__(
        self,
        id: str,
        timestamp: Optional[datetime] = None,
        memory_nodes: Dict[str, MemoryNode] = None,
        reasoning_steps: Dict[str, ReasoningStep] = None,
        tool_usages: Dict[str, ToolUsage] = None,
        variables: Dict[str, Any] = None,
        metadata: Dict[str, Any] = None
    ):
        """
        Initialize a state snapshot.
        
        Args:
            id: Unique identifier for the snapshot
            timestamp: When the snapshot was created
            memory_nodes: Memory nodes in the snapshot
            reasoning_steps: Reasoning steps in the snapshot
            tool_usages: Tool usages in the snapshot
            variables: Variables in the snapshot
            metadata: Additional metadata for the snapshot
        """
        self.id = id
        self.timestamp = timestamp or datetime.now()
        self.memory_nodes = memory_nodes or {}
        self.reasoning_steps = reasoning_steps or {}
        self.tool_usages = tool_usages or {}
        self.variables = variables or {}
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the state snapshot to a dictionary."""
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "memory_nodes": {node_id: node.to_dict() for node_id, node in self.memory_nodes.items()},
            "reasoning_steps": {step_id: step.to_dict() for step_id, step in self.reasoning_steps.items()},
            "tool_usages": {usage_id: usage.to_dict() for usage_id, usage in self.tool_usages.items()},
            "variables": self.variables,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StateSnapshot':
        """Create a state snapshot from a dictionary."""
        return cls(
            id=data["id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            memory_nodes={node_id: MemoryNode.from_dict(node_data) for node_id, node_data in data["memory_nodes"].items()},
            reasoning_steps={step_id: ReasoningStep.from_dict(step_data) for step_id, step_data in data["reasoning_steps"].items()},
            tool_usages={usage_id: ToolUsage.from_dict(usage_data) for usage_id, usage_data in data["tool_usages"].items()},
            variables=data["variables"],
            metadata=data["metadata"]
        )

class StateVisualizer:
    """A visualizer for agent states."""
    
    def __init__(self, output_dir: Optional[str] = None):
        """
        Initialize a state visualizer.
        
        Args:
            output_dir: Directory to save visualizations to
        """
        self.output_dir = output_dir
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
    
    def visualize_attention_map(
        self,
        attention_weights: Dict[str, Dict[str, float]],
        filename: Optional[str] = None,
        title: str = "Attention Map",
        cmap: str = "viridis"
    ) -> Optional[str]:
        """
        Visualize an attention map.
        
        Args:
            attention_weights: Attention weights to visualize
            filename: Filename to save the visualization to
            title: Title of the visualization
            cmap: Colormap to use
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        # Extract keys and create the attention matrix
        keys = list(attention_weights.keys())
        attention_matrix = np.zeros((len(keys), len(keys)))
        
        for i, source in enumerate(keys):
            for j, target in enumerate(keys):
                attention_matrix[i, j] = attention_weights.get(source, {}).get(target, 0.0)
        
        # Create the figure
        plt.figure(figsize=(10, 8))
        plt.title(title)
        
        # Plot the attention map
        im = plt.imshow(attention_matrix, cmap=cmap)
        plt.colorbar(im, label="Attention Weight")
        
        # Add labels
        plt.xticks(range(len(keys)), [self._truncate_text(k, 10) for k in keys], rotation=90)
        plt.yticks(range(len(keys)), [self._truncate_text(k, 10) for k in keys])
        
        plt.xlabel("Target")
        plt.ylabel("Source")
        
        plt.tight_layout()
        
        # Save or show the visualization
        if filename:
            if self.output_dir:
                filepath = os.path.join(self.output_dir, filename)
            else:
                filepath = filename
            
            plt.savefig(filepath, bbox_inches="tight")
            plt.close()
            return filepath
        else:
            plt.show()
            plt.close()
            return None
    
    def visualize_memory_graph(
        self,
        memory_nodes: Dict[str, MemoryNode],
        highlight_nodes: List[str] = None,
        filename: Optional[str] = None,
        title: str = "Memory Graph",
        show_labels: bool = True,
        node_size_by_importance: bool = True,
        color_by_type: bool = True,
        layout: str = "spring"
    ) -> Optional[str]:
        """
        Visualize the memory graph.
        
        Args:
            memory_nodes: Memory nodes to visualize
            highlight_nodes: IDs of nodes to highlight
            filename: Filename to save the visualization to
            title: Title of the visualization
            show_labels: Whether to show node labels
            node_size_by_importance: Whether to size nodes by importance
            color_by_type: Whether to color nodes by type
            layout: Layout algorithm to use
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        # Create a graph
        G = nx.DiGraph()
        
        # Add nodes
        for node_id, node in memory_nodes.items():
            G.add_node(node_id, **node.to_dict())
        
        # Add edges
        for node_id, node in memory_nodes.items():
            for ref_id in node.references:
                if ref_id in memory_nodes:
                    G.add_edge(node_id, ref_id)
        
        # Create the figure
        plt.figure(figsize=(12, 10))
        plt.title(title)
        
        # Get the layout
        if layout == "spring":
            pos = nx.spring_layout(G)
        elif layout == "circular":
            pos = nx.circular_layout(G)
        elif layout == "kamada_kawai":
            pos = nx.kamada_kawai_layout(G)
        elif layout == "spectral":
            pos = nx.spectral_layout(G)
        else:
            pos = nx.spring_layout(G)
        
        # Get node colors
        if color_by_type:
            node_types = list(set(data["node_type"] for _, data in G.nodes(data=True)))
            color_map = plt.cm.get_cmap("tab10", len(node_types))
            type_to_color = {node_type: color_map(i) for i, node_type in enumerate(node_types)}
            node_colors = [type_to_color[data["node_type"]] for _, data in G.nodes(data=True)]
        else:
            node_colors = ["skyblue" for _ in G.nodes()]
        
        # Highlight nodes
        if highlight_nodes:
            for i, (node_id, _) in enumerate(G.nodes(data=True)):
                if node_id in highlight_nodes:
                    node_colors[i] = "red"
        
        # Get node sizes
        if node_size_by_importance:
            node_sizes = [300 * (data["importance"] + 0.5) for _, data in G.nodes(data=True)]
        else:
            node_sizes = [300 for _ in G.nodes()]
        
        # Draw the graph
        nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=node_sizes, alpha=0.8)
        nx.draw_networkx_edges(G, pos, edge_color="gray", alpha=0.5, arrows=True)
        
        if show_labels:
            # Truncate long labels
            labels = {node_id: self._truncate_text(data["content"], 20) for node_id, data in G.nodes(data=True)}
            nx.draw_networkx_labels(G, pos, labels=labels, font_size=8)
        
        # Add a legend for node types
        if color_by_type:
            legend_elements = [
                Patch(facecolor=type_to_color[node_type], label=node_type)
                for node_type in node_types
            ]
            plt.legend(handles=legend_elements, loc="upper right")
        
        plt.axis("off")
        
        # Save or show the visualization
        if filename:
            if self.output_dir:
                filepath = os.path.join(self.output_dir, filename)
            else:
                filepath = filename
            
            plt.savefig(filepath, bbox_inches="tight")
            plt.close()
            return filepath
        else:
            plt.show()
            plt.close()
            return None
    
    def visualize_conversation_flow(
        self,
        messages: List[Dict[str, Any]],
        filename: Optional[str] = None,
        title: str = "Conversation Flow",
        include_timestamps: bool = True
    ) -> Optional[str]:
        """
        Visualize a conversation flow.
        
        Args:
            messages: List of messages to visualize
            filename: Filename to save the visualization to
            title: Title of the visualization
            include_timestamps: Whether to include timestamps
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        # Sort messages by timestamp if available
        if include_timestamps and all("timestamp" in msg for msg in messages):
            sorted_messages = sorted(messages, key=lambda m: m["timestamp"])
        else:
            sorted_messages = messages
        
        # Create the figure
        plt.figure(figsize=(12, len(sorted_messages) * 0.5 + 2))
        plt.title(title)
        
        # Create a timeline
        y_positions = {}
        roles = list(set(msg["role"] for msg in sorted_messages))
        for i, role in enumerate(roles):
            y_positions[role] = i
        
        # Plot messages
        for i, msg in enumerate(sorted_messages):
            role = msg["role"]
            content = msg["content"]
            y_pos = y_positions[role]
            
            # Plot the message
            plt.scatter(i, y_pos, s=100, color=f"C{y_positions[role]}", alpha=0.8)
            
            # Add content as annotation
            plt.annotate(
                self._truncate_text(content, 30),
                (i, y_pos),
                xytext=(5, 0),
                textcoords="offset points",
                ha="left",
                va="center",
                fontsize=8,
                rotation=45
            )
            
            # Add timestamp if available
            if include_timestamps and "timestamp" in msg:
                timestamp = msg["timestamp"]
                if isinstance(timestamp, str):
                    try:
                        timestamp = datetime.fromisoformat(timestamp)
                    except ValueError:
                        timestamp = None
                
                if timestamp:
                    plt.annotate(
                        timestamp.strftime("%H:%M:%S"),
                        (i, y_pos),
                        xytext=(0, -15),
                        textcoords="offset points",
                        ha="center",
                        va="top",
                        fontsize=6
                    )
        
        # Set y-ticks to role names
        plt.yticks(list(y_positions.values()), list(y_positions.keys()))
        
        # Set x-ticks to message indices
        plt.xticks(range(len(sorted_messages)), [str(i+1) for i in range(len(sorted_messages))])
        
        plt.grid(axis="y", linestyle="--", alpha=0.7)
        plt.tight_layout()
        
        # Save or show the visualization
        if filename:
            if self.output_dir:
                filepath = os.path.join(self.output_dir, filename)
            else:
                filepath = filename
            
            plt.savefig(filepath, bbox_inches="tight")
            plt.close()
            return filepath
        else:
            plt.show()
            plt.close()
            return None
    
    def visualize_task_progress(
        self,
        tasks: Dict[str, Dict[str, Any]],
        filename: Optional[str] = None,
        title: str = "Task Progress",
        sort_by: str = "deadline"
    ) -> Optional[str]:
        """
        Visualize task progress.
        
        Args:
            tasks: Dictionary of tasks to visualize
            filename: Filename to save the visualization to
            title: Title of the visualization
            sort_by: How to sort tasks
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        # Sort tasks
        if sort_by == "deadline":
            sorted_tasks = sorted(
                tasks.items(),
                key=lambda x: x[1].get("deadline", datetime.max)
            )
        elif sort_by == "priority":
            priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            sorted_tasks = sorted(
                tasks.items(),
                key=lambda x: priority_order.get(x[1].get("priority", "medium").lower(), 2)
            )
        elif sort_by == "status":
            status_order = {"completed": 0, "in_progress": 1, "pending": 2, "blocked": 3, "failed": 4}
            sorted_tasks = sorted(
                tasks.items(),
                key=lambda x: status_order.get(x[1].get("status", "pending").lower(), 2)
            )
        else:
            sorted_tasks = list(tasks.items())
        
        # Create the figure
        plt.figure(figsize=(12, len(sorted_tasks) * 0.5 + 2))
        plt.title(title)
        
        # Create a progress chart
        y_ticks = []
        y_labels = []
        
        for i, (task_id, task) in enumerate(sorted_tasks):
            # Get task properties
            name = task.get("name", task_id)
            progress = task.get("progress", 0.0)
            status = task.get("status", "pending").lower()
            
            # Set color based on status
            if status == "completed":
                color = "green"
            elif status == "in_progress":
                color = "blue"
            elif status == "pending":
                color = "gray"
            elif status == "blocked":
                color = "orange"
            elif status == "failed":
                color = "red"
            else:
                color = "lightgray"
            
            # Plot the progress bar
            plt.barh(i, progress, color=color, alpha=0.7)
            
            # Add label
            y_ticks.append(i)
            y_labels.append(name)
            
            # Add progress text
            plt.text(
                progress + 0.01,
                i,
                f"{progress:.0%}",
                va="center",
                ha="left",
                fontsize=8
            )
        
        plt.yticks(y_ticks, y_labels)
        plt.xlim(0, 1.1)
        plt.xlabel("Progress")
        plt.grid(axis="x", linestyle="--", alpha=0.7)
        
        # Add a legend
        legend_elements = [
            Patch(facecolor="green", label="Completed"),
            Patch(facecolor="blue", label="In Progress"),
            Patch(facecolor="gray", label="Pending"),
            Patch(facecolor="orange", label="Blocked"),
            Patch(facecolor="red", label="Failed")
        ]
        plt.legend(handles=legend_elements, loc="upper right")
        
        plt.tight_layout()
        
        # Save or show the visualization
        if filename:
            if self.output_dir:
                filepath = os.path.join(self.output_dir, filename)
            else:
                filepath = filename
            
            plt.savefig(filepath, bbox_inches="tight")
            plt.close()
            return filepath
        else:
            plt.show()
            plt.close()
            return None
    
    def visualize_agent_network(
        self,
        agents: Dict[str, Dict[str, Any]],
        interactions: List[Dict[str, Any]],
        filename: Optional[str] = None,
        title: str = "Agent Network",
        layout: str = "spring"
    ) -> Optional[str]:
        """
        Visualize a network of agents and their interactions.
        
        Args:
            agents: Dictionary of agents to visualize
            interactions: List of interactions between agents
            filename: Filename to save the visualization to
            title: Title of the visualization
            layout: Layout algorithm to use
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        # Create a graph
        G = nx.DiGraph()
        
        # Add nodes for agents
        for agent_id, agent in agents.items():
            G.add_node(agent_id, **agent)
        
        # Add edges for interactions
        for interaction in interactions:
            source = interaction.get("source")
            target = interaction.get("target")
            if source in agents and target in agents:
                G.add_edge(source, target, **interaction)
        
        # Create the figure
        plt.figure(figsize=(12, 10))
        plt.title(title)
        
        # Get the layout
        if layout == "spring":
            pos = nx.spring_layout(G)
        elif layout == "circular":
            pos = nx.circular_layout(G)
        elif layout == "kamada_kawai":
            pos = nx.kamada_kawai_layout(G)
        elif layout == "spectral":
            pos = nx.spectral_layout(G)
        else:
            pos = nx.spring_layout(G)
        
        # Get node colors based on agent type
        agent_types = list(set(data.get("type", "unknown") for _, data in G.nodes(data=True)))
        color_map = plt.cm.get_cmap("tab10", len(agent_types))
        type_to_color = {agent_type: color_map(i) for i, agent_type in enumerate(agent_types)}
        node_colors = [
            type_to_color.get(data.get("type", "unknown"), "gray")
            for _, data in G.nodes(data=True)
        ]
        
        # Get node sizes based on importance
        node_sizes = [
            300 * (data.get("importance", 0.5) + 0.5)
            for _, data in G.nodes(data=True)
        ]
        
        # Get edge colors based on interaction type
        interaction_types = list(set(data.get("type", "unknown") for _, _, data in G.edges(data=True)))
        edge_color_map = plt.cm.get_cmap("Set3", len(interaction_types))
        interaction_to_color = {
            interaction_type: edge_color_map(i)
            for i, interaction_type in enumerate(interaction_types)
        }
        edge_colors = [
            interaction_to_color.get(data.get("type", "unknown"), "gray")
            for _, _, data in G.edges(data=True)
        ]
        
        # Get edge widths based on interaction strength
        edge_widths = [
            data.get("strength", 1.0) * 2
            for _, _, data in G.edges(data=True)
        ]
        
        # Draw the graph
        nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=node_sizes, alpha=0.8)
        nx.draw_networkx_edges(G, pos, edge_color=edge_colors, width=edge_widths, alpha=0.7, arrows=True)
        nx.draw_networkx_labels(G, pos, font_size=10)
        
        # Add a legend for agent types
        agent_legend_elements = [
            Patch(facecolor=type_to_color[agent_type], label=agent_type)
            for agent_type in agent_types
        ]
        
        # Add a legend for interaction types
        interaction_legend_elements = [
            Patch(facecolor=interaction_to_color[interaction_type], label=interaction_type)
            for interaction_type in interaction_types
        ]
        
        # Combine legends
        plt.legend(
            handles=agent_legend_elements + interaction_legend_elements,
            loc="upper right",
            title="Agent & Interaction Types"
        )
        
        plt.axis("off")
        
        # Save or show the visualization
        if filename:
            if self.output_dir:
                filepath = os.path.join(self.output_dir, filename)
            else:
                filepath = filename
            
            plt.savefig(filepath, bbox_inches="tight")
            plt.close()
            return filepath
        else:
            plt.show()
            plt.close()
            return None
    
    def _truncate_text(self, text: str, max_length: int) -> str:
        """
        Truncate text to a maximum length.
        
        Args:
            text: Text to truncate
            max_length: Maximum length
            
        Returns:
            Truncated text
        """
        if len(text) <= max_length:
            return text
        return text[:max_length-3] + "..."

class StateTracker:
    """A tracker for agent state over time."""
    
    def __init__(self, max_snapshots: int = 100):
        """
        Initialize a state tracker.
        
        Args:
            max_snapshots: Maximum number of snapshots to keep
        """
        self.snapshots: List[StateSnapshot] = []
        self.max_snapshots = max_snapshots
        self.visualizer = StateVisualizer()
    
    def add_snapshot(self, snapshot: StateSnapshot) -> None:
        """
        Add a snapshot to the tracker.
        
        Args:
            snapshot: Snapshot to add
        """
        self.snapshots.append(snapshot)
        
        # Remove oldest snapshots if we exceed the maximum
        if len(self.snapshots) > self.max_snapshots:
            self.snapshots = self.snapshots[-self.max_snapshots:]
    
    def get_snapshot(self, snapshot_id: str) -> Optional[StateSnapshot]:
        """
        Get a snapshot by ID.
        
        Args:
            snapshot_id: ID of the snapshot to get
            
        Returns:
            The snapshot, or None if not found
        """
        for snapshot in self.snapshots:
            if snapshot.id == snapshot_id:
                return snapshot
        return None
    
    def get_latest_snapshot(self) -> Optional[StateSnapshot]:
        """
        Get the latest snapshot.
        
        Returns:
            The latest snapshot, or None if there are no snapshots
        """
        if not self.snapshots:
            return None
        return self.snapshots[-1]
    
    def get_snapshots_in_range(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[StateSnapshot]:
        """
        Get snapshots in a time range.
        
        Args:
            start_time: Start of the time range
            end_time: End of the time range
            
        Returns:
            List of snapshots in the time range
        """
        if not start_time and not end_time:
            return self.snapshots
        
        filtered_snapshots = []
        for snapshot in self.snapshots:
            if start_time and snapshot.timestamp < start_time:
                continue
            if end_time and snapshot.timestamp > end_time:
                continue
            filtered_snapshots.append(snapshot)
        
        return filtered_snapshots
    
    def visualize_state_history(
        self,
        metric: str = "memory_count",
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        filename: Optional[str] = None,
        title: str = "State History"
    ) -> Optional[str]:
        """
        Visualize the history of agent state.
        
        Args:
            metric: Metric to visualize
            start_time: Start of the time range
            end_time: End of the time range
            filename: Filename to save the visualization to
            title: Title of the visualization
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        snapshots = self.get_snapshots_in_range(start_time, end_time)
        return self.visualizer.visualize_state_history(snapshots, metric, filename, title)
    
    def visualize_memory_graph(
        self,
        snapshot_id: Optional[str] = None,
        highlight_nodes: List[str] = None,
        filename: Optional[str] = None,
        title: str = "Memory Graph",
        show_labels: bool = True,
        node_size_by_importance: bool = True,
        color_by_type: bool = True,
        layout: str = "spring"
    ) -> Optional[str]:
        """
        Visualize the memory graph for a snapshot.
        
        Args:
            snapshot_id: ID of the snapshot to visualize, or None for the latest
            highlight_nodes: IDs of nodes to highlight
            filename: Filename to save the visualization to
            title: Title of the visualization
            show_labels: Whether to show node labels
            node_size_by_importance: Whether to size nodes by importance
            color_by_type: Whether to color nodes by type
            layout: Layout algorithm to use
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        if snapshot_id:
            snapshot = self.get_snapshot(snapshot_id)
        else:
            snapshot = self.get_latest_snapshot()
        
        if not snapshot:
            return None
        
        return self.visualizer.visualize_memory_graph(
            snapshot.memory_nodes,
            highlight_nodes,
            filename,
            title,
            show_labels,
            node_size_by_importance,
            color_by_type,
            layout
        )
    
    def visualize_reasoning_tree(
        self,
        snapshot_id: Optional[str] = None,
        highlight_steps: List[str] = None,
        filename: Optional[str] = None,
        title: str = "Reasoning Tree",
        show_labels: bool = True,
        color_by_type: bool = True,
        node_size_by_confidence: bool = True
    ) -> Optional[str]:
        """
        Visualize the reasoning tree for a snapshot.
        
        Args:
            snapshot_id: ID of the snapshot to visualize, or None for the latest
            highlight_steps: IDs of steps to highlight
            filename: Filename to save the visualization to
            title: Title of the visualization
            show_labels: Whether to show step labels
            color_by_type: Whether to color steps by type
            node_size_by_confidence: Whether to size nodes by confidence
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        if snapshot_id:
            snapshot = self.get_snapshot(snapshot_id)
        else:
            snapshot = self.get_latest_snapshot()
        
        if not snapshot:
            return None
        
        return self.visualizer.visualize_reasoning_tree(
            snapshot.reasoning_steps,
            highlight_steps,
            filename,
            title,
            show_labels,
            color_by_type,
            node_size_by_confidence
        )
    
    def visualize_tool_usage(
        self,
        snapshot_id: Optional[str] = None,
        filename: Optional[str] = None,
        title: str = "Tool Usage",
        sort_by: str = "start_time"
    ) -> Optional[str]:
        """
        Visualize tool usage for a snapshot.
        
        Args:
            snapshot_id: ID of the snapshot to visualize, or None for the latest
            filename: Filename to save the visualization to
            title: Title of the visualization
            sort_by: How to sort tool usages
            
        Returns:
            Path to the saved visualization, or None if not saved
        """
        if snapshot_id:
            snapshot = self.get_snapshot(snapshot_id)
        else:
            snapshot = self.get_latest_snapshot()
        
        if not snapshot:
            return None
        
        return self.visualizer.visualize_tool_usage(
            snapshot.tool_usages,
            filename,
            title,
            sort_by
        )
    
    def save_snapshots(self, filepath: str) -> bool:
        """
        Save snapshots to a file.
        
        Args:
            filepath: Path to save the snapshots to
            
        Returns:
            True if the snapshots were saved successfully, False otherwise
        """
        try:
            # Create a serializable representation of the snapshots
            snapshots_data = [snapshot.to_dict() for snapshot in self.snapshots]
            
            # Save to file
            with open(filepath, 'w') as f:
                json.dump(snapshots_data, f, indent=2)
            
            logger.info(f"Saved {len(self.snapshots)} snapshots to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error saving snapshots: {e}")
            return False
    
    def load_snapshots(self, filepath: str) -> bool:
        """
        Load snapshots from a file.
        
        Args:
            filepath: Path to load the snapshots from
            
        Returns:
            True if the snapshots were loaded successfully, False otherwise
        """
        try:
            # Load from file
            with open(filepath, 'r') as f:
                snapshots_data = json.load(f)
            
            # Create snapshots from the data
            self.snapshots = [StateSnapshot.from_dict(data) for data in snapshots_data]
            
            logger.info(f"Loaded {len(self.snapshots)} snapshots from {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error loading snapshots: {e}")
            return False
