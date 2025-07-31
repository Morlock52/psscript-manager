"""
Enhanced Memory Management for Agentic Systems

This module provides enhanced memory management capabilities for agentic systems,
including working memory, long-term memory, and episodic memory.
"""

import os
import json
import time
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("enhanced_memory")

class MemoryEntry:
    """A single memory entry with metadata."""
    
    def __init__(
        self, 
        content: Any, 
        memory_type: str = "general",
        source: str = "agent",
        importance: float = 0.5,
        timestamp: Optional[float] = None
    ):
        """
        Initialize a memory entry.
        
        Args:
            content: The content of the memory
            memory_type: The type of memory (general, fact, rule, experience, etc.)
            source: The source of the memory (agent, user, tool, etc.)
            importance: The importance of the memory (0.0 to 1.0)
            timestamp: The timestamp of the memory (defaults to current time)
        """
        self.content = content
        self.memory_type = memory_type
        self.source = source
        self.importance = importance
        self.timestamp = timestamp or time.time()
        self.last_accessed = self.timestamp
        self.access_count = 0
        self.id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate a unique ID for the memory entry."""
        content_str = str(self.content)
        timestamp_str = str(self.timestamp)
        hash_input = f"{content_str}_{timestamp_str}_{self.memory_type}_{self.source}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    def access(self) -> None:
        """Record an access to this memory."""
        self.last_accessed = time.time()
        self.access_count += 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the memory entry to a dictionary."""
        return {
            "id": self.id,
            "content": self.content,
            "memory_type": self.memory_type,
            "source": self.source,
            "importance": self.importance,
            "timestamp": self.timestamp,
            "last_accessed": self.last_accessed,
            "access_count": self.access_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MemoryEntry':
        """Create a memory entry from a dictionary."""
        entry = cls(
            content=data["content"],
            memory_type=data["memory_type"],
            source=data["source"],
            importance=data["importance"],
            timestamp=data["timestamp"]
        )
        entry.id = data["id"]
        entry.last_accessed = data["last_accessed"]
        entry.access_count = data["access_count"]
        return entry
    
    def __str__(self) -> str:
        """String representation of the memory entry."""
        return f"MemoryEntry(id={self.id}, type={self.memory_type}, importance={self.importance:.2f})"

class WorkingMemory:
    """
    Working memory for an agent.
    
    Working memory is a short-term memory store that holds information
    that the agent is currently using for reasoning and decision-making.
    """
    
    def __init__(self, capacity: int = 50):
        """
        Initialize working memory.
        
        Args:
            capacity: Maximum number of items to store in working memory
        """
        self.capacity = capacity
        self.memories: Dict[str, MemoryEntry] = {}
        self.priority_queue: List[Tuple[float, str]] = []  # (priority, memory_id)
    
    def add(
        self, 
        content: Any, 
        memory_type: str = "general",
        source: str = "agent",
        importance: float = 0.5
    ) -> str:
        """
        Add an item to working memory.
        
        Args:
            content: The content to add
            memory_type: The type of memory
            source: The source of the memory
            importance: The importance of the memory
            
        Returns:
            The ID of the added memory
        """
        # Create a new memory entry
        entry = MemoryEntry(content, memory_type, source, importance)
        
        # Add to memories
        self.memories[entry.id] = entry
        
        # Add to priority queue
        priority = self._calculate_priority(entry)
        self.priority_queue.append((priority, entry.id))
        self.priority_queue.sort(reverse=True)
        
        # Check capacity
        if len(self.memories) > self.capacity:
            self._evict_lowest_priority()
        
        return entry.id
    
    def get(self, memory_id: str) -> Optional[Any]:
        """
        Get an item from working memory.
        
        Args:
            memory_id: The ID of the memory to get
            
        Returns:
            The content of the memory, or None if not found
        """
        if memory_id in self.memories:
            entry = self.memories[memory_id]
            entry.access()
            
            # Update priority
            self._update_priority(entry)
            
            return entry.content
        
        return None
    
    def get_all(self, memory_type: Optional[str] = None) -> List[Any]:
        """
        Get all items from working memory, optionally filtered by type.
        
        Args:
            memory_type: The type of memories to get, or None for all
            
        Returns:
            A list of memory contents
        """
        results = []
        
        for entry in self.memories.values():
            if memory_type is None or entry.memory_type == memory_type:
                entry.access()
                results.append(entry.content)
        
        # Update priorities
        self._update_all_priorities()
        
        return results
    
    def remove(self, memory_id: str) -> bool:
        """
        Remove an item from working memory.
        
        Args:
            memory_id: The ID of the memory to remove
            
        Returns:
            True if the memory was removed, False otherwise
        """
        if memory_id in self.memories:
            del self.memories[memory_id]
            
            # Update priority queue
            self.priority_queue = [(p, mid) for p, mid in self.priority_queue if mid != memory_id]
            
            return True
        
        return False
    
    def clear(self) -> None:
        """Clear all items from working memory."""
        self.memories.clear()
        self.priority_queue.clear()
    
    def _calculate_priority(self, entry: MemoryEntry) -> float:
        """
        Calculate the priority of a memory entry.
        
        Priority is based on importance, recency, and access frequency.
        
        Args:
            entry: The memory entry
            
        Returns:
            The priority value (higher is more important)
        """
        # Base priority is the importance
        priority = entry.importance
        
        # Recency factor (more recent = higher priority)
        current_time = time.time()
        time_factor = max(0, 1 - ((current_time - entry.timestamp) / (24 * 60 * 60)))  # 1 day decay
        
        # Access frequency factor
        access_factor = min(1, entry.access_count / 10)  # Max out at 10 accesses
        
        # Combine factors
        priority = (0.5 * priority) + (0.3 * time_factor) + (0.2 * access_factor)
        
        return priority
    
    def _update_priority(self, entry: MemoryEntry) -> None:
        """
        Update the priority of a memory entry in the priority queue.
        
        Args:
            entry: The memory entry to update
        """
        # Remove old priority
        self.priority_queue = [(p, mid) for p, mid in self.priority_queue if mid != entry.id]
        
        # Add new priority
        priority = self._calculate_priority(entry)
        self.priority_queue.append((priority, entry.id))
        self.priority_queue.sort(reverse=True)
    
    def _update_all_priorities(self) -> None:
        """Update priorities for all memory entries."""
        self.priority_queue.clear()
        
        for entry in self.memories.values():
            priority = self._calculate_priority(entry)
            self.priority_queue.append((priority, entry.id))
        
        self.priority_queue.sort(reverse=True)
    
    def _evict_lowest_priority(self) -> None:
        """Evict the lowest priority item from working memory."""
        if self.priority_queue:
            _, memory_id = self.priority_queue.pop()
            if memory_id in self.memories:
                del self.memories[memory_id]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert working memory to a dictionary."""
        return {
            "capacity": self.capacity,
            "memories": {mid: entry.to_dict() for mid, entry in self.memories.items()},
            "priority_queue": self.priority_queue
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkingMemory':
        """Create working memory from a dictionary."""
        memory = cls(capacity=data["capacity"])
        memory.memories = {
            mid: MemoryEntry.from_dict(entry_data) 
            for mid, entry_data in data["memories"].items()
        }
        memory.priority_queue = data["priority_queue"]
        return memory

class LongTermMemory:
    """
    Long-term memory for an agent.
    
    Long-term memory stores information that the agent has learned over time
    and may need to recall in the future.
    """
    
    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize long-term memory.
        
        Args:
            storage_path: Path to store memory on disk, or None for in-memory only
        """
        self.storage_path = storage_path
        self.memories: Dict[str, MemoryEntry] = {}
        self.embeddings: Dict[str, List[float]] = {}
        self.last_save_time = 0
        
        # Load from disk if storage path is provided
        if storage_path and os.path.exists(storage_path):
            self.load()
    
    def add(
        self, 
        content: Any, 
        memory_type: str = "general",
        source: str = "agent",
        importance: float = 0.5,
        embedding: Optional[List[float]] = None
    ) -> str:
        """
        Add an item to long-term memory.
        
        Args:
            content: The content to add
            memory_type: The type of memory
            source: The source of the memory
            importance: The importance of the memory
            embedding: Vector embedding for semantic search, if available
            
        Returns:
            The ID of the added memory
        """
        # Create a new memory entry
        entry = MemoryEntry(content, memory_type, source, importance)
        
        # Add to memories
        self.memories[entry.id] = entry
        
        # Add embedding if provided
        if embedding is not None:
            self.embeddings[entry.id] = embedding
        
        # Save to disk if storage path is provided
        self._auto_save()
        
        return entry.id
    
    def get(self, memory_id: str) -> Optional[Any]:
        """
        Get an item from long-term memory.
        
        Args:
            memory_id: The ID of the memory to get
            
        Returns:
            The content of the memory, or None if not found
        """
        if memory_id in self.memories:
            entry = self.memories[memory_id]
            entry.access()
            return entry.content
        
        return None
    
    def search(
        self, 
        query: str, 
        memory_type: Optional[str] = None,
        limit: int = 10,
        embedding_function: Optional[callable] = None
    ) -> List[Tuple[Any, float]]:
        """
        Search for items in long-term memory.
        
        Args:
            query: The search query
            memory_type: The type of memories to search, or None for all
            limit: Maximum number of results to return
            embedding_function: Function to convert query to embedding
            
        Returns:
            A list of (content, score) tuples
        """
        results = []
        
        # If we have embeddings and an embedding function, do semantic search
        if embedding_function is not None and self.embeddings:
            query_embedding = embedding_function(query)
            
            # Calculate similarity scores
            scores = {}
            for memory_id, embedding in self.embeddings.items():
                if memory_id in self.memories:
                    entry = self.memories[memory_id]
                    
                    # Filter by memory type if specified
                    if memory_type is not None and entry.memory_type != memory_type:
                        continue
                    
                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(query_embedding, embedding)
                    scores[memory_id] = similarity
            
            # Sort by similarity score
            sorted_ids = sorted(scores.keys(), key=lambda mid: scores[mid], reverse=True)
            
            # Get top results
            for memory_id in sorted_ids[:limit]:
                entry = self.memories[memory_id]
                entry.access()
                results.append((entry.content, scores[memory_id]))
        
        # Otherwise, do simple keyword search
        else:
            query_lower = query.lower()
            
            for entry in self.memories.values():
                # Filter by memory type if specified
                if memory_type is not None and entry.memory_type != memory_type:
                    continue
                
                # Check if query is in content
                content_str = str(entry.content).lower()
                if query_lower in content_str:
                    # Simple relevance score based on number of occurrences
                    score = content_str.count(query_lower) / len(content_str)
                    results.append((entry.content, score))
            
            # Sort by score and limit results
            results.sort(key=lambda x: x[1], reverse=True)
            results = results[:limit]
        
        # Save to disk if storage path is provided
        self._auto_save()
        
        return results
    
    def remove(self, memory_id: str) -> bool:
        """
        Remove an item from long-term memory.
        
        Args:
            memory_id: The ID of the memory to remove
            
        Returns:
            True if the memory was removed, False otherwise
        """
        if memory_id in self.memories:
            del self.memories[memory_id]
            
            # Remove embedding if it exists
            if memory_id in self.embeddings:
                del self.embeddings[memory_id]
            
            # Save to disk if storage path is provided
            self._auto_save()
            
            return True
        
        return False
    
    def clear(self) -> None:
        """Clear all items from long-term memory."""
        self.memories.clear()
        self.embeddings.clear()
        
        # Save to disk if storage path is provided
        self._auto_save()
    
    def save(self) -> None:
        """Save long-term memory to disk."""
        if self.storage_path:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            
            # Convert to dictionary
            data = {
                "memories": {mid: entry.to_dict() for mid, entry in self.memories.items()},
                "embeddings": self.embeddings
            }
            
            # Save to disk
            with open(self.storage_path, 'w') as f:
                json.dump(data, f)
            
            self.last_save_time = time.time()
    
    def load(self) -> None:
        """Load long-term memory from disk."""
        if self.storage_path and os.path.exists(self.storage_path):
            try:
                # Load from disk
                with open(self.storage_path, 'r') as f:
                    data = json.load(f)
                
                # Convert to memory entries
                self.memories = {
                    mid: MemoryEntry.from_dict(entry_data) 
                    for mid, entry_data in data["memories"].items()
                }
                
                # Load embeddings
                self.embeddings = data.get("embeddings", {})
            except Exception as e:
                logger.error(f"Error loading long-term memory: {e}")
    
    def _auto_save(self) -> None:
        """Automatically save to disk if enough time has passed."""
        if self.storage_path and (time.time() - self.last_save_time) > 60:  # Save every minute
            self.save()
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity (-1 to 1, higher is more similar)
        """
        import numpy as np
        
        # Convert to numpy arrays
        a = np.array(vec1)
        b = np.array(vec2)
        
        # Calculate cosine similarity
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

class EpisodicMemory:
    """
    Episodic memory for an agent.
    
    Episodic memory stores sequences of events or experiences that the agent
    has encountered, allowing it to recall and learn from past experiences.
    """
    
    def __init__(self, max_episodes: int = 100):
        """
        Initialize episodic memory.
        
        Args:
            max_episodes: Maximum number of episodes to store
        """
        self.max_episodes = max_episodes
        self.episodes: Dict[str, Dict[str, Any]] = {}
        self.current_episode: Optional[str] = None
    
    def start_episode(self, name: Optional[str] = None) -> str:
        """
        Start a new episode.
        
        Args:
            name: Optional name for the episode
            
        Returns:
            The ID of the new episode
        """
        # Generate episode ID
        timestamp = time.time()
        episode_id = f"episode_{int(timestamp)}_{hash(str(timestamp))}"
        
        # Create episode
        self.episodes[episode_id] = {
            "id": episode_id,
            "name": name or f"Episode {len(self.episodes) + 1}",
            "start_time": timestamp,
            "end_time": None,
            "events": []
        }
        
        # Set as current episode
        self.current_episode = episode_id
        
        # Check if we need to remove old episodes
        if len(self.episodes) > self.max_episodes:
            self._remove_oldest_episode()
        
        return episode_id
    
    def end_episode(self, episode_id: Optional[str] = None) -> None:
        """
        End an episode.
        
        Args:
            episode_id: The ID of the episode to end, or None for current episode
        """
        # Use current episode if not specified
        if episode_id is None:
            episode_id = self.current_episode
        
        # Check if episode exists
        if episode_id in self.episodes:
            # Set end time
            self.episodes[episode_id]["end_time"] = time.time()
            
            # Clear current episode if it's the one being ended
            if episode_id == self.current_episode:
                self.current_episode = None
    
    def add_event(
        self, 
        event_type: str,
        content: Any,
        metadata: Optional[Dict[str, Any]] = None,
        episode_id: Optional[str] = None
    ) -> str:
        """
        Add an event to an episode.
        
        Args:
            event_type: The type of event
            content: The content of the event
            metadata: Additional metadata for the event
            episode_id: The ID of the episode to add to, or None for current episode
            
        Returns:
            The ID of the added event
        """
        # Use current episode if not specified
        if episode_id is None:
            episode_id = self.current_episode
        
        # Check if we have an active episode
        if episode_id is None:
            # Start a new episode
            episode_id = self.start_episode()
        
        # Check if episode exists
        if episode_id in self.episodes:
            # Generate event ID
            timestamp = time.time()
            event_id = f"event_{int(timestamp)}_{hash(str(timestamp))}"
            
            # Create event
            event = {
                "id": event_id,
                "type": event_type,
                "content": content,
                "timestamp": timestamp,
                "metadata": metadata or {}
            }
            
            # Add to episode
            self.episodes[episode_id]["events"].append(event)
            
            return event_id
        
        # Episode not found
        logger.warning(f"Episode {episode_id} not found")
        return ""
    
    def get_episode(self, episode_id: str) -> Optional[Dict[str, Any]]:
        """
        Get an episode.
        
        Args:
            episode_id: The ID of the episode to get
            
        Returns:
            The episode, or None if not found
        """
        return self.episodes.get(episode_id)
    
    def get_episodes(
        self, 
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get episodes within a time range.
        
        Args:
            start_time: Start time (Unix timestamp), or None for all
            end_time: End time (Unix timestamp), or None for all
            limit: Maximum number of episodes to return, or None for all
            
        Returns:
            A list of episodes
        """
        # Filter episodes by time range
        filtered_episodes = []
        
        for episode in self.episodes.values():
            # Check start time
            if start_time is not None and episode["start_time"] < start_time:
                continue
            
            # Check end time
            if end_time is not None and (
                episode["end_time"] is None or episode["end_time"] > end_time
            ):
                continue
            
            filtered_episodes.append(episode)
        
        # Sort by start time (newest first)
        filtered_episodes.sort(key=lambda e: e["start_time"], reverse=True)
        
        # Apply limit
        if limit is not None:
            filtered_episodes = filtered_episodes[:limit]
        
        return filtered_episodes
    
    def search_events(
        self, 
        event_type: Optional[str] = None,
        query: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for events across all episodes.
        
        Args:
            event_type: The type of events to search for, or None for all
            query: Search query to match against event content, or None for all
            start_time: Start time (Unix timestamp), or None for all
            end_time: End time (Unix timestamp), or None for all
            limit: Maximum number of events to return, or None for all
            
        Returns:
            A list of events with episode information
        """
        # Collect all events
        all_events = []
        
        for episode_id, episode in self.episodes.items():
            for event in episode["events"]:
                # Check event type
                if event_type is not None and event["type"] != event_type:
                    continue
                
                # Check query
                if query is not None:
                    content_str = str(event["content"]).lower()
                    if query.lower() not in content_str:
                        continue
                
                # Check start time
                if start_time is not None and event["timestamp"] < start_time:
                    continue
                
                # Check end time
                if end_time is not None and event["timestamp"] > end_time:
                    continue
                
                # Add episode information
                event_with_episode = event.copy()
                event_with_episode["episode_id"] = episode_id
                event_with_episode["episode_name"] = episode["name"]
                
                all_events.append(event_with_episode)
        
        # Sort by timestamp (newest first)
        all_events.sort(key=lambda e: e["timestamp"], reverse=True)
        
        # Apply limit
        if limit is not None:
            all_events = all_events[:limit]
        
        return all_events
    
    def clear(self) -> None:
        """Clear all episodes."""
        self.episodes.clear()
        self.current_episode = None
    
    def _remove_oldest_episode(self) -> None:
        """Remove the oldest episode."""
        if not self.episodes:
            return
        
        # Find oldest episode
        oldest_id = min(self.episodes.keys(), key=lambda eid: self.episodes[eid]["start_time"])
        
        # Remove it
        del self.episodes[oldest_id]

class EnhancedMemorySystem:
    """
    Enhanced memory system for agentic systems.
    
    This system combines working memory, long-term memory, and episodic memory
    to provide a comprehensive memory management solution for agentic systems.
    """
    
    def __init__(
        self,
        working_memory_capacity: int = 50,
        long_term_storage_path: Optional[str] = None,
        max_episodes: int = 100
    ):
        """
        Initialize the enhanced memory system.
        
        Args:
            working_memory_capacity: Maximum number of items in working memory
            long_term_storage_path: Path to store long-term memory, or None for in-memory only
            max_episodes: Maximum number of episodes in episodic memory
        """
        self.working_memory = WorkingMemory(capacity=working_memory_capacity)
        self.long_term_memory = LongTermMemory(storage_path=long_term_storage_path)
        self.episodic_memory = EpisodicMemory(max_episodes=max_episodes)
        
        # Start a new episode
        self.episodic_memory.start_episode("Initial Episode")
    
    def add_to_working_memory(
        self, 
        content: Any, 
        memory_type: str = "general",
        source: str = "agent",
        importance: float = 0.5
    ) -> str:
        """
        Add an item to working memory.
        
        Args:
            content: The content to add
            memory_type: The type of memory
            source: The source of the memory
            importance: The importance of the memory
            
        Returns:
            The ID of the added memory
        """
        return self.working_memory.add(content, memory_type, source, importance)
    
    def add_to_long_term_memory(
        self, 
        content: Any, 
        memory_type: str = "general",
        source: str = "agent",
        importance: float = 0.5,
        embedding: Optional[List[float]] = None
    ) -> str:
        """
        Add an item to long-term memory.
        
        Args:
            content: The content to add
            memory_type: The type of memory
            source: The source of the memory
            importance: The importance of the memory
            embedding: Vector embedding for semantic search, if available
            
        Returns:
            The ID of the added memory
        """
        return self.long_term_memory.add(content, memory_type, source, importance, embedding)
    
    def add_event(
        self, 
        event_type: str,
        content: Any,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add an event to the current episode.
        
        Args:
            event_type: The type of event
            content: The content of the event
            metadata: Additional metadata for the event
            
        Returns:
            The ID of the added event
        """
        return self.episodic_memory.add_event(event_type, content, metadata)
    
    def get_from_working_memory(self, memory_id: str) -> Optional[Any]:
        """
        Get an item from working memory.
        
        Args:
            memory_id: The ID of the memory to get
            
        Returns:
            The content of the memory, or None if not found
        """
        return self.working_memory.get(memory_id)
    
    def get_from_long_term_memory(self, memory_id: str) -> Optional[Any]:
        """
        Get an item from long-term memory.
        
        Args:
            memory_id: The ID of the memory to get
            
        Returns:
            The content of the memory, or None if not found
        """
        return self.long_term_memory.get(memory_id)
    
    def search_long_term_memory(
        self, 
        query: str, 
        memory_type: Optional[str] = None,
        limit: int = 10,
        embedding_function: Optional[callable] = None
    ) -> List[Tuple[Any, float]]:
        """
        Search for items in long-term memory.
        
        Args:
            query: The search query
            memory_type: The type of memories to search, or None for all
            limit: Maximum number of results to return
            embedding_function: Function to convert query to embedding
            
        Returns:
            A list of (content, score) tuples
        """
        return self.long_term_memory.search(query, memory_type, limit, embedding_function)
    
    def get_recent_events(
        self, 
        event_type: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent events from episodic memory.
        
        Args:
            event_type: The type of events to get, or None for all
            limit: Maximum number of events to return
            
        Returns:
            A list of events with episode information
        """
        return self.episodic_memory.search_events(event_type=event_type, limit=limit)
    
    def start_new_episode(self, name: Optional[str] = None) -> str:
        """
        Start a new episode.
        
        Args:
            name: Optional name for the episode
            
        Returns:
            The ID of the new episode
        """
        # End current episode if there is one
        if self.episodic_memory.current_episode:
            self.episodic_memory.end_episode()
        
        # Start a new episode
        return self.episodic_memory.start_episode(name)
    
    def save_state(self) -> Dict[str, Any]:
        """
        Save the state of the memory system.
        
        Returns:
            A dictionary containing the state
        """
        return {
            "working_memory": self.working_memory.to_dict(),
            "episodic_memory": {
                "max_episodes": self.episodic_memory.max_episodes,
                "episodes": self.episodic_memory.episodes,
                "current_episode": self.episodic_memory.current_episode
            }
        }
    
    def load_state(self, state: Dict[str, Any]) -> None:
        """
        Load the state of the memory system.
        
        Args:
            state: The state to load
        """
        if "working_memory" in state:
            self.working_memory = WorkingMemory.from_dict(state["working_memory"])
        
        if "episodic_memory" in state:
            self.episodic_memory.max_episodes = state["episodic_memory"]["max_episodes"]
            self.episodic_memory.episodes = state["episodic_memory"]["episodes"]
            self.episodic_memory.current_episode = state["episodic_memory"]["current_episode"]
