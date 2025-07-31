import { v4 as uuidv4 } from 'uuid';
import { AssistantTool } from './Assistant';

/**
 * Run status types matching OpenAI's Assistants API
 */
export type RunStatus = 
  | 'queued'
  | 'in_progress'
  | 'requires_action'
  | 'cancelling'
  | 'cancelled'
  | 'failed'
  | 'completed'
  | 'expired';

/**
 * Run step types
 */
export type RunStepType = 
  | 'message_creation'
  | 'tool_calls';

/**
 * Tool call types
 */
export type ToolCallType = 
  | 'function' 
  | 'code_interpreter' 
  | 'retrieval';

/**
 * Function tool call
 */
export interface FunctionToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
    output?: string;
  };
}

/**
 * Code interpreter tool call
 */
export interface CodeInterpreterToolCall {
  id: string;
  type: 'code_interpreter';
  code_interpreter: {
    input: string;
    outputs: Array<{
      type: 'logs' | 'image';
      logs?: string;
      image?: {
        file_id: string;
        width?: number;
        height?: number;
      };
    }>;
  };
}

/**
 * Retrieval tool call
 */
export interface RetrievalToolCall {
  id: string;
  type: 'retrieval';
  retrieval: {
    citations: Array<{
      file_id: string;
      quote: string;
    }>;
  };
}

/**
 * Tool call object
 */
export type ToolCall = FunctionToolCall | CodeInterpreterToolCall | RetrievalToolCall;

/**
 * Tool call status
 */
export type SubmittedToolCallOutput = {
  tool_call_id: string;
  output: string;
};

/**
 * Required action for runs that need additional input
 */
export interface RequiredAction {
  type: 'submit_tool_outputs';
  submit_tool_outputs: {
    tool_calls: ToolCall[];
  };
}

/**
 * Last error information
 */
export interface RunError {
  code: string;
  message: string;
}

/**
 * Tool outputs submission
 */
export interface SubmitToolOutputsParams {
  tool_outputs: Array<{
    tool_call_id: string;
    output: string;
  }>;
}

/**
 * Run step object
 */
export interface RunStep {
  id: string;
  object: 'thread.run.step';
  created_at: number;
  run_id: string;
  assistant_id: string;
  thread_id: string;
  type: RunStepType;
  status: RunStatus;
  step_details: {
    type: RunStepType;
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

/**
 * Run object matches OpenAI's Assistants API Run structure
 */
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

/**
 * Create run parameters
 */
export interface CreateRunParams {
  thread_id: string;
  assistant_id: string;
  model?: string;
  instructions?: string;
  tools?: AssistantTool[];
  metadata?: Record<string, string>;
  stream?: boolean;
}

/**
 * Create a new run
 */
export function createRun(params: CreateRunParams): Run {
  const now = Math.floor(Date.now() / 1000);
  
  return {
    id: `run_${uuidv4().replace(/-/g, '')}`,
    object: 'thread.run',
    created_at: now,
    thread_id: params.thread_id,
    assistant_id: params.assistant_id,
    status: 'queued',
    required_action: null,
    last_error: null,
    expires_at: now + 3600, // Expires in 1 hour
    started_at: null,
    cancelled_at: null,
    failed_at: null,
    completed_at: null,
    model: params.model || 'gpt-4o',
    instructions: params.instructions || null,
    tools: params.tools || [],
    file_ids: [],
    metadata: params.metadata || {},
  };
}

/**
 * Create a run step
 */
export function createRunStep(params: {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  type: RunStepType;
  status?: RunStatus;
  message_id?: string;
  tool_calls?: ToolCall[];
  metadata?: Record<string, string>;
}): RunStep {
  const now = Math.floor(Date.now() / 1000);
  
  return {
    id: `step_${uuidv4().replace(/-/g, '')}`,
    object: 'thread.run.step',
    created_at: now,
    run_id: params.run_id,
    assistant_id: params.assistant_id,
    thread_id: params.thread_id,
    type: params.type,
    status: params.status || 'in_progress',
    step_details: {
      type: params.type,
      ...(params.type === 'message_creation' && params.message_id
        ? { message_creation: { message_id: params.message_id } }
        : {}),
      ...(params.type === 'tool_calls' && params.tool_calls
        ? { tool_calls: params.tool_calls }
        : {}),
    },
    last_error: null,
    expired_at: null,
    cancelled_at: null,
    failed_at: null,
    completed_at: null,
    metadata: params.metadata || {},
  };
}
