import { v4 as uuidv4 } from 'uuid';

/**
 * Message roles in a thread
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Content types for message parts
 */
export type ContentType = 'text' | 'image_file' | 'file_citation';

/**
 * Text content part
 */
export interface TextContent {
  type: 'text';
  text: {
    value: string;
    annotations?: any[];
  };
}

/**
 * File citation content part
 */
export interface FileCitationContent {
  type: 'file_citation';
  file_citation: {
    file_id: string;
    quote: string;
  };
}

/**
 * Image file content part
 */
export interface ImageFileContent {
  type: 'image_file';
  image_file: {
    file_id: string;
  };
}

/**
 * Message content can be one of several types
 */
export type MessageContent = TextContent | FileCitationContent | ImageFileContent;

/**
 * File references for attaching files to a message
 */
export interface MessageFileReference {
  file_id: string;
}

/**
 * Message object matches OpenAI's Assistants API Message structure
 */
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

/**
 * Create message parameters
 */
export interface CreateMessageParams {
  thread_id: string;
  role: MessageRole;
  content: string | MessageContent[];
  file_ids?: string[];
  metadata?: Record<string, string>;
  assistant_id?: string;
  run_id?: string;
}

/**
 * Create a new message
 */
export function createMessage(params: CreateMessageParams): Message {
  // Convert string content to structured content format
  const content = Array.isArray(params.content)
    ? params.content
    : [
        {
          type: 'text',
          text: {
            value: params.content,
            annotations: [],
          },
        } as TextContent,
      ];

  return {
    id: `msg_${uuidv4().replace(/-/g, '')}`,
    object: 'thread.message',
    created_at: Math.floor(Date.now() / 1000),
    thread_id: params.thread_id,
    role: params.role,
    content,
    file_ids: params.file_ids || [],
    assistant_id: params.assistant_id || null,
    run_id: params.run_id || null,
    metadata: params.metadata || {},
  };
}

/**
 * Helper function to extract text from message content
 */
export function getMessageText(message: Message): string {
  return message.content
    .filter((part): part is TextContent => part.type === 'text')
    .map(part => part.text.value)
    .join('\n');
}
