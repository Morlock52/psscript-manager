import { v4 as uuidv4 } from 'uuid';

/**
 * Thread object matches OpenAI's Assistants API Thread structure
 */
export interface Thread {
  id: string;
  object: 'thread';
  created_at: number;
  metadata: Record<string, string>;
}

/**
 * Create thread parameters
 */
export interface CreateThreadParams {
  metadata?: Record<string, string>;
}

/**
 * Create a new thread
 */
export function createThread(params: CreateThreadParams = {}): Thread {
  return {
    id: `thread_${uuidv4().replace(/-/g, '')}`,
    object: 'thread',
    created_at: Math.floor(Date.now() / 1000),
    metadata: params.metadata || {},
  };
}

/**
 * Update thread parameters
 */
export interface UpdateThreadParams {
  metadata?: Record<string, string>;
}

/**
 * Update an existing thread
 */
export function updateThread(
  thread: Thread,
  params: UpdateThreadParams
): Thread {
  return {
    ...thread,
    metadata: {
      ...thread.metadata,
      ...(params.metadata || {}),
    },
  };
}
