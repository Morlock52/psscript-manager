/**
 * AI Service Utility
 * Handles communication with the AI service for PowerShell script analysis and generation
 */
import axios from 'axios';
import logger from './logger';

// Determine AI service URL based on environment
const isDocker = process.env.DOCKER_ENV === 'true';
const AI_SERVICE_URL = isDocker 
  ? (process.env.AI_SERVICE_URL || 'http://ai-service:8000')
  : (process.env.AI_SERVICE_URL || 'http://localhost:8000');

type AiServiceResponse<T> =
  | {
      ok: true;
      data: T;
      meta: {
        route: string;
        durationMs: number;
      };
    }
  | {
      ok: false;
      error: string;
      status?: number;
      meta: {
        route: string;
        durationMs: number;
      };
    };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function extractJsonFromText<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/```json([\s\S]*?)```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim()) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * AI Service client for handling all AI-related operations
 */
class AiServiceClient {
  private async request<T>(
    route: string,
    payload: Record<string, unknown>,
    options: {
      timeout?: number;
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<AiServiceResponse<T>> {
    const start = Date.now();
    const url = new URL(route, AI_SERVICE_URL).toString();
    try {
      const response = await axios.post(url, payload, {
        timeout: options.timeout ?? 60000,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        params: options.params
      });

      return {
        ok: true,
        data: response.data,
        meta: {
          route,
          durationMs: Date.now() - start
        }
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.detail || error?.message || 'AI service error';
      logger.error('Error calling AI service', { route, status, message, error });
      return {
        ok: false,
        error: message,
        status,
        meta: {
          route,
          durationMs: Date.now() - start
        }
      };
    }
  }

  async analyzeScript(
    content: string,
    filename?: string,
    requestType: string = 'standard',
    analysisOptions?: {
      includeCommandDetails?: boolean;
      fetchMsDocs?: boolean;
    }
  ): Promise<AiServiceResponse<any>> {
    return this.request('/analyze', {
      content,
      script_name: filename,
      request_type: requestType,
      analysis_options: analysisOptions
    }, {
      params: {
        include_command_details: analysisOptions?.includeCommandDetails,
        fetch_ms_docs: analysisOptions?.fetchMsDocs
      }
    });
  }

  async chat(messages: ChatMessage[], options: { systemPrompt?: string; sessionId?: string } = {}): Promise<AiServiceResponse<{ response: string; session_id?: string }>> {
    return this.request('/chat', {
      messages,
      system_prompt: options.systemPrompt,
      session_id: options.sessionId
    });
  }

  async createEmbedding(content: string): Promise<AiServiceResponse<{ embedding: number[] }>> {
    return this.request('/embedding', {
      content
    });
  }

  async rag(query: string, context?: string, limit: number = 5): Promise<AiServiceResponse<{ generated_response: string; results: any[]; sources: any[] }>> {
    return this.request('/rag', {
      query,
      context,
      limit
    });
  }

  /**
   * Ask a question to the AI assistant
   */
  async askQuestion(question: string, context?: string, useAgent: boolean = true): Promise<AiServiceResponse<{ response: string }>> {
    const systemPrompt = useAgent
      ? 'You are a PowerShell expert. Provide concise, accurate answers.'
      : 'Provide a concise answer.';
    const messages: ChatMessage[] = [
      { role: 'user', content: `${question}${context ? `\n\nContext:\n${context}` : ''}` }
    ];
    const response = await this.chat(messages, { systemPrompt });
    if (!response.ok) {
      return response;
    }
    return {
      ok: true,
      data: { response: response.data.response },
      meta: response.meta
    };
  }

  /**
   * Generate a PowerShell script based on description
   */
  async generateScript(description: string): Promise<AiServiceResponse<{ script: string; explanation?: string }>> {
    const response = await this.chat([
      {
        role: 'user',
        content: `Generate a PowerShell script for the following description. Respond with JSON containing "script" and "explanation".\n\nDescription:\n${description}`
      }
    ], {
      systemPrompt: 'You are a PowerShell expert. Always respond with JSON.'
    });
    if (!response.ok) {
      return response;
    }
    const parsed = extractJsonFromText<{ script: string; explanation?: string }>(response.data.response);
    return {
      ok: true,
      data: parsed || { script: response.data.response },
      meta: response.meta
    };
  }

  /**
   * Explain a script or command using the AI assistant
   */
  async explainScript(content: string, type: string = 'simple'): Promise<AiServiceResponse<{ explanation: string }>> {
    const response = await this.chat([
      {
        role: 'user',
        content: `Explain the following PowerShell script (${type}).\n\n${content}`
      }
    ], {
      systemPrompt: 'You are a PowerShell expert. Provide clear explanations.'
    });
    if (!response.ok) {
      return response;
    }
    return {
      ok: true,
      data: { explanation: response.data.response },
      meta: response.meta
    };
  }

  /**
   * Get script examples similar to a description
   */
  async getSimilarExamples(description: string, limit: number = 5): Promise<AiServiceResponse<{ examples: string }>> {
    const response = await this.rag(`Provide ${limit} example scripts for: ${description}`, undefined, limit);
    if (!response.ok) {
      return response;
    }
    return {
      ok: true,
      data: { examples: response.data.generated_response },
      meta: response.meta
    };
  }
}

export type { AiServiceResponse, ChatMessage };
export default new AiServiceClient();
