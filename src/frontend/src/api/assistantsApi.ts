import axios from 'axios';

// Get the hostname dynamically
const API_BASE_URL = `http://${window.location.hostname}:4001/api`;

/**
 * Types matching our backend models
 */

// Assistant Types
export type AssistantModel = 
  | 'gpt-4o' 
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo';

export type ToolType = 
  | 'code_interpreter' 
  | 'retrieval' 
  | 'function';

export interface AssistantTool {
  type: ToolType;
  function?: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface Assistant {
  id: string;
  object: 'assistant';
  created_at: number;
  name: string | null;
  description: string | null;
  model: AssistantModel;
  instructions: string | null;
  tools: AssistantTool[];
  file_ids: string[];
  metadata: Record<string, string>;
}

export interface CreateAssistantParams {
  model: AssistantModel;
  name?: string;
  description?: string;
  instructions?: string;
  tools?: AssistantTool[];
  file_ids?: string[];
  metadata?: Record<string, string>;
}

export interface UpdateAssistantParams {
  model?: AssistantModel;
  name?: string | null;
  description?: string | null;
  instructions?: string | null;
  tools?: AssistantTool[];
  file_ids?: string[];
  metadata?: Record<string, string>;
}

// Thread Types
export interface Thread {
  id: string;
  object: 'thread';
  created_at: number;
  metadata: Record<string, string>;
}

export interface CreateThreadParams {
  metadata?: Record<string, string>;
}

export interface UpdateThreadParams {
  metadata?: Record<string, string>;
}

// Message Types
export type MessageRole = 'user' | 'assistant' | 'system';

export type ContentType = 'text' | 'image_file' | 'file_citation';

export interface TextContent {
  type: 'text';
  text: {
    value: string;
    annotations?: any[];
  };
}

export interface FileCitationContent {
  type: 'file_citation';
  file_citation: {
    file_id: string;
    quote: string;
  };
}

export interface ImageFileContent {
  type: 'image_file';
  image_file: {
    file_id: string;
  };
}

export type MessageContent = TextContent | FileCitationContent | ImageFileContent;

export interface Message {
  id: string;
  object: 'thread.message';
  created_at: number;
  thread_id: string;
  role: MessageRole;
  content: MessageContent[];
  file_ids: string[];
  assistant_id: string | null;
  run_id: string | null;
  metadata: Record<string, string>;
}

export interface CreateMessageParams {
  role: MessageRole;
  content: string | MessageContent[];
  file_ids?: string[];
  metadata?: Record<string, string>;
}

// Run Types
export type RunStatus = 
  | 'queued'
  | 'in_progress'
  | 'requires_action'
  | 'cancelling'
  | 'cancelled'
  | 'failed'
  | 'completed'
  | 'expired';

export interface ToolCall {
  id: string;
  type: 'function' | 'code_interpreter' | 'retrieval';
  function?: {
    name: string;
    arguments: string;
    output?: string;
  };
}

export interface RequiredAction {
  type: 'submit_tool_outputs';
  submit_tool_outputs: {
    tool_calls: ToolCall[];
  };
}

export interface RunError {
  code: string;
  message: string;
}

export interface Run {
  id: string;
  object: 'thread.run';
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status: RunStatus;
  required_action: RequiredAction | null;
  last_error: RunError | null;
  expires_at: number;
  started_at: number | null;
  cancelled_at: number | null;
  failed_at: number | null;
  completed_at: number | null;
  model: string;
  instructions: string | null;
  tools: AssistantTool[];
  file_ids: string[];
  metadata: Record<string, string>;
}

export interface CreateRunParams {
  assistant_id: string;
  model?: string;
  instructions?: string;
  tools?: AssistantTool[];
  metadata?: Record<string, string>;
}

export interface RunStep {
  id: string;
  object: 'thread.run.step';
  created_at: number;
  run_id: string;
  assistant_id: string;
  thread_id: string;
  type: 'message_creation' | 'tool_calls';
  status: RunStatus;
  step_details: {
    type: 'message_creation' | 'tool_calls';
    message_creation?: {
      message_id: string;
    };
    tool_calls?: ToolCall[];
  };
  last_error: RunError | null;
  expired_at: number | null;
  cancelled_at: number | null;
  failed_at: number | null;
  completed_at: number | null;
  metadata: Record<string, string>;
}

export interface SubmitToolOutputsParams {
  tool_outputs: Array<{
    tool_call_id: string;
    output: string;
  }>;
}

/**
 * List response structure
 */
interface ListResponse<T> {
  object: 'list';
  data: T[];
}

/**
 * Assistants API Client
 */
class AssistantsApiClient {
  // Assistants
  async createAssistant(params: CreateAssistantParams): Promise<Assistant> {
    const response = await axios.post(`${API_BASE_URL}/assistants`, params);
    return response.data;
  }

  async retrieveAssistant(assistantId: string): Promise<Assistant> {
    const response = await axios.get(`${API_BASE_URL}/assistants/${assistantId}`);
    return response.data;
  }

  async updateAssistant(assistantId: string, params: UpdateAssistantParams): Promise<Assistant> {
    const response = await axios.put(`${API_BASE_URL}/assistants/${assistantId}`, params);
    return response.data;
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/assistants/${assistantId}`);
  }

  async listAssistants(): Promise<ListResponse<Assistant>> {
    const response = await axios.get(`${API_BASE_URL}/assistants`);
    return response.data;
  }

  // Threads
  async createThread(params: CreateThreadParams = {}): Promise<Thread> {
    const response = await axios.post(`${API_BASE_URL}/assistants/threads`, params);
    return response.data;
  }

  async retrieveThread(threadId: string): Promise<Thread> {
    const response = await axios.get(`${API_BASE_URL}/assistants/threads/${threadId}`);
    return response.data;
  }

  async updateThread(threadId: string, params: UpdateThreadParams): Promise<Thread> {
    const response = await axios.put(`${API_BASE_URL}/assistants/threads/${threadId}`, params);
    return response.data;
  }

  async deleteThread(threadId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/assistants/threads/${threadId}`);
  }

  // Messages
  async createMessage(threadId: string, params: CreateMessageParams): Promise<Message> {
    const response = await axios.post(`${API_BASE_URL}/assistants/threads/${threadId}/messages`, params);
    return response.data;
  }

  async retrieveMessage(threadId: string, messageId: string): Promise<Message> {
    const response = await axios.get(`${API_BASE_URL}/assistants/threads/${threadId}/messages/${messageId}`);
    return response.data;
  }

  async listMessages(threadId: string): Promise<ListResponse<Message>> {
    const response = await axios.get(`${API_BASE_URL}/assistants/threads/${threadId}/messages`);
    return response.data;
  }

  // Runs
  async createRun(threadId: string, params: CreateRunParams): Promise<Run> {
    const response = await axios.post(`${API_BASE_URL}/assistants/threads/${threadId}/runs`, params);
    return response.data;
  }

  async retrieveRun(threadId: string, runId: string): Promise<Run> {
    const response = await axios.get(`${API_BASE_URL}/assistants/threads/${threadId}/runs/${runId}`);
    return response.data;
  }

  async listRuns(threadId: string): Promise<ListResponse<Run>> {
    const response = await axios.get(`${API_BASE_URL}/assistants/threads/${threadId}/runs`);
    return response.data;
  }

  async cancelRun(threadId: string, runId: string): Promise<Run> {
    const response = await axios.post(`${API_BASE_URL}/assistants/threads/${threadId}/runs/${runId}/cancel`);
    return response.data;
  }

  async submitToolOutputs(threadId: string, runId: string, params: SubmitToolOutputsParams): Promise<Run> {
    const response = await axios.post(
      `${API_BASE_URL}/assistants/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
      params
    );
    return response.data;
  }

  async listRunSteps(threadId: string, runId: string): Promise<ListResponse<RunStep>> {
    const response = await axios.get(`${API_BASE_URL}/assistants/threads/${threadId}/runs/${runId}/steps`);
    return response.data;
  }

  // Utility functions
  async pollRunStatus(threadId: string, runId: string, interval = 1000): Promise<Run> {
    const checkStatus = async (): Promise<Run> => {
      const run = await this.retrieveRun(threadId, runId);
      
      if (['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
        return run;
      }
      
      return new Promise(resolve => {
        setTimeout(async () => {
          resolve(await checkStatus());
        }, interval);
      });
    };
    
    return checkStatus();
  }

  /**
   * Helper function to extract text from message content
   */
  getMessageText(message: Message): string {
    return message.content
      .filter((part): part is TextContent => part.type === 'text')
      .map(part => part.text.value)
      .join('\n');
  }

  /**
   * Send a message and wait for the assistant's response
   */
  async sendMessage(threadId: string, assistantId: string, content: string): Promise<Message | null> {
    // Create a message
    await this.createMessage(threadId, {
      role: 'user',
      content,
    });
    
    // Create a run
    const run = await this.createRun(threadId, {
      assistant_id: assistantId,
    });
    
    // Poll until the run is complete
    const completedRun = await this.pollRunStatus(threadId, run.id);
    
    if (completedRun.status === 'completed') {
      // Get the latest messages
      const messages = await this.listMessages(threadId);
      
      // Find the assistant's response (should be the most recent)
      const assistantMessages = messages.data
        .filter(msg => msg.role === 'assistant' && msg.run_id === run.id);
      
      return assistantMessages.length > 0 ? assistantMessages[0] : null;
    }
    
    return null;
  }
}

// Export a singleton instance
export const assistantsApi = new AssistantsApiClient();
