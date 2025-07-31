import { v4 as uuidv4 } from 'uuid';

/**
 * Available model options for assistants
 */
export type AssistantModel = 
  | 'gpt-4o' 
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo';

/**
 * Tool types supported by assistants
 */
export type ToolType = 
  | 'code_interpreter' 
  | 'retrieval' 
  | 'function';

/**
 * Function parameters definition
 */
export interface FunctionParameterDefinition {
  type: string;
  description?: string;
  enum?: string[];
  properties?: Record<string, FunctionParameterDefinition>;
  required?: string[];
  items?: FunctionParameterDefinition;
}

/**
 * Function definition for function calling
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, FunctionParameterDefinition>;
    required?: string[];
  };
}

/**
 * Tool definition for assistants
 */
export interface AssistantTool {
  type: ToolType;
  function?: FunctionDefinition;
}

/**
 * Assistant interface
 */
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

/**
 * Create assistant parameters
 */
export interface CreateAssistantParams {
  model: AssistantModel;
  name?: string;
  description?: string;
  instructions?: string;
  tools?: AssistantTool[];
  file_ids?: string[];
  metadata?: Record<string, string>;
}

/**
 * Create a new assistant
 */
export function createAssistant(params: CreateAssistantParams): Assistant {
  return {
    id: `asst_${uuidv4().replace(/-/g, '')}`,
    object: 'assistant',
    created_at: Math.floor(Date.now() / 1000),
    name: params.name || null,
    description: params.description || null,
    model: params.model,
    instructions: params.instructions || null,
    tools: params.tools || [],
    file_ids: params.file_ids || [],
    metadata: params.metadata || {},
  };
}

/**
 * Update assistant parameters
 */
export interface UpdateAssistantParams {
  model?: AssistantModel;
  name?: string | null;
  description?: string | null;
  instructions?: string | null;
  tools?: AssistantTool[];
  file_ids?: string[];
  metadata?: Record<string, string>;
}

/**
 * Update an existing assistant
 */
export function updateAssistant(
  assistant: Assistant,
  params: UpdateAssistantParams
): Assistant {
  return {
    ...assistant,
    model: params.model !== undefined ? params.model : assistant.model,
    name: params.name !== undefined ? params.name : assistant.name,
    description: params.description !== undefined ? params.description : assistant.description,
    instructions: params.instructions !== undefined ? params.instructions : assistant.instructions,
    tools: params.tools !== undefined ? params.tools : assistant.tools,
    file_ids: params.file_ids !== undefined ? params.file_ids : assistant.file_ids,
    metadata: {
      ...assistant.metadata,
      ...(params.metadata || {}),
    },
  };
}
