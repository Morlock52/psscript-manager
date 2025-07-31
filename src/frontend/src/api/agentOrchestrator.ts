/**
 * Agent Orchestrator API
 * Provides client-side interfaces for interacting with the agentic framework
 */

import { apiClient } from '../services/api';
import axios, { AxiosError } from 'axios';

// Types matching the backend
export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  model: string;
  tools: Tool[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tool {
  id: string;
  type: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  metadata: Record<string, any>;
}

export interface Thread {
  id: string;
  agentId: string;
  messages: Message[];
  status: ThreadStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCalls?: ToolCall[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  toolId: string;
  name: string;
  arguments: Record<string, any>;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export type ThreadStatus = 'active' | 'completed' | 'failed' | 'cancelled';

export interface Run {
  id: string;
  threadId: string;
  agentId: string;
  status: RunStatus;
  toolCalls: ToolCall[];
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
}

export type RunStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface OrchestrationError {
  message: string;
  code: string;
  status?: number;
  details?: any;
  isRetryable: boolean;
}

// Base URL for API endpoints
const AGENT_API_BASE_URL = '/api/agents';

/**
 * Error handler for agent orchestration API
 */
const handleApiError = (error: Error | AxiosError, operation: string): OrchestrationError => {
  const errorResponse: OrchestrationError = {
    message: `Failed to ${operation}`,
    code: 'UNKNOWN_ERROR',
    isRetryable: false
  };
  
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || !error.response) {
      errorResponse.message = `Network error while ${operation}: ${error.message}`;
      errorResponse.code = 'NETWORK_ERROR';
      errorResponse.isRetryable = true;
    } 
    else if (error.response) {
      errorResponse.status = error.response.status;
      errorResponse.details = error.response.data;
      
      if (error.response.status === 401 || error.response.status === 403) {
        errorResponse.code = 'AUTH_ERROR';
        errorResponse.message = `Authentication error while ${operation}. Please log in again.`;
        errorResponse.isRetryable = false;
      } else if (error.response.status === 404) {
        errorResponse.code = 'NOT_FOUND';
        errorResponse.message = `Resource not found while ${operation}`;
        errorResponse.isRetryable = false;
      }
    }
  }
  
  console.error(`Agent orchestration error (${operation}):`, errorResponse);
  
  return errorResponse;
};

/**
 * Create a new agent
 */
export const createAgent = async (params: Partial<Agent>): Promise<Agent> => {
  try {
    const response = await apiClient.post(AGENT_API_BASE_URL, params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'create agent');
  }
};

/**
 * Create a new thread for conversation with an agent
 */
export const createThread = async (agentId: string, initialMessage?: string): Promise<Thread> => {
  try {
    const response = await apiClient.post(`${AGENT_API_BASE_URL}/threads`, {
      agentId,
      message: initialMessage
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'create thread');
  }
};

/**
 * Get a thread by ID
 */
export const getThread = async (threadId: string): Promise<Thread> => {
  try {
    const response = await apiClient.get(`${AGENT_API_BASE_URL}/threads/${threadId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'get thread');
  }
};

/**
 * Get all messages for a thread
 */
export const getThreadMessages = async (threadId: string): Promise<Message[]> => {
  try {
    const response = await apiClient.get(`${AGENT_API_BASE_URL}/threads/${threadId}/messages`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'get thread messages');
  }
};

/**
 * Add a message to a thread
 */
export const addMessage = async (threadId: string, content: string, role: 'user' | 'system' = 'user'): Promise<Message> => {
  try {
    const response = await apiClient.post(`${AGENT_API_BASE_URL}/threads/${threadId}/messages`, {
      content,
      role
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'add message');
  }
};

/**
 * Create a run to process a thread
 */
export const createRun = async (threadId: string): Promise<Run> => {
  try {
    const response = await apiClient.post(`${AGENT_API_BASE_URL}/threads/${threadId}/runs`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'create run');
  }
};

/**
 * Get a run by ID
 */
export const getRun = async (runId: string): Promise<Run> => {
  try {
    const response = await apiClient.get(`${AGENT_API_BASE_URL}/runs/${runId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'get run');
  }
};

/**
 * Wait for a run to complete
 * Polls the run status until it reaches a terminal state
 */
export const waitForRun = async (runId: string, pollingInterval = 1000, maxAttempts = 60): Promise<Run> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const run = await getRun(runId);
    
    if (['completed', 'failed', 'cancelled'].includes(run.status)) {
      return run;
    }
    
    // Wait for the polling interval
    await new Promise(resolve => setTimeout(resolve, pollingInterval));
    attempts++;
  }
  
  throw new Error(`Run ${runId} did not complete within the timeout period`);
};

/**
 * Helper function to create a thread, add a message, and start a run
 * Simplifies the common pattern of creating a thread and immediately sending a message
 */
export const createThreadAndRun = async (agentId: string, message: string): Promise<{ thread: Thread, run: Run }> => {
  // Create a thread
  const thread = await createThread(agentId);
  
  // Add the message
  await addMessage(thread.id, message);
  
  // Start a run
  const run = await createRun(thread.id);
  
  return { thread, run };
};

/**
 * Helper function to continue a conversation in a thread
 * Adds a message and creates a new run
 */
export const continueThread = async (threadId: string, message: string): Promise<{ message: Message, run: Run }> => {
  // Add the message
  const newMessage = await addMessage(threadId, message);
  
  // Start a run
  const run = await createRun(threadId);
  
  return { message: newMessage, run };
};
