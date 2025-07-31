/**
 * AI Agent API Service
 * This module provides services for interacting with the agentic AI assistant.
 */

import { apiClient } from '../services/api';
import axios, { AxiosError } from 'axios';

// Constants for service configuration
const API_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface AIAnalysisRequest {
  content: string;
  filename?: string;
  requestType?: 'standard' | 'detailed';
  analysisOptions?: {
    includeSimilarScripts?: boolean;
    includeInternetSearch?: boolean;
    maxExamples?: number;
  };
}

export interface CommandDetail {
  description: string;
  parameters: Array<{
    name: string;
    description: string;
  }>;
}

export interface MSDocsReference {
  title: string;
  url: string;
}

export interface AIAnalysisResult {
  analysis: {
    purpose: string;
    securityScore: number;
    codeQualityScore: number;
    riskScore: number;
    suggestions: string[];
    commandDetails: Record<string, CommandDetail>;
    msDocsReferences: MSDocsReference[];
    examples: any[];
    rawAnalysis: string;
  };
  metadata: {
    processingTime: number;
    model: string;
    threadId: string;
    assistantId: string;
    requestId: string;
  };
}

export interface AIServiceError {
  message: string;
  code: string;
  status?: number;
  details?: any;
  isRetryable: boolean;
}

/**
 * Helper function to handle API errors consistently
 * 
 * @param {Error | AxiosError} error The caught error
 * @param {string} operation Description of the operation that failed
 * @returns {AIServiceError} Normalized error object
 */
const handleApiError = (error: Error | AxiosError, operation: string): AIServiceError => {
  // Default error structure
  const serviceError: AIServiceError = {
    message: `Failed to ${operation}`,
    code: 'UNKNOWN_ERROR',
    isRetryable: false
  };
  
  if (axios.isAxiosError(error)) {
    // Handle network errors (likely retryable)
    if (error.code === 'ECONNABORTED' || !error.response) {
      serviceError.message = `Network error while ${operation}: ${error.message}`;
      serviceError.code = 'NETWORK_ERROR';
      serviceError.isRetryable = true;
    } 
    // Handle API response errors
    else if (error.response) {
      serviceError.status = error.response.status;
      serviceError.details = error.response.data;
      
      // Specific status code handling
      if (error.response.status === 401 || error.response.status === 403) {
        serviceError.code = 'AUTH_ERROR';
        serviceError.message = `Authentication error while ${operation}. Please check your API key.`;
        serviceError.isRetryable = false;
      } else if (error.response.status === 429) {
        serviceError.code = 'RATE_LIMIT';
        serviceError.message = `Rate limit exceeded while ${operation}`;
        serviceError.isRetryable = true; // Can retry after a delay
      } else if (error.response.status === 404) {
        serviceError.code = 'NOT_FOUND';
        serviceError.message = `The requested resource at ${error.config?.url} was not found`;
        serviceError.isRetryable = false;
        serviceError.details = { originalError: error };
        console.error('API 404 error:', error);
      }
    }
  }
  
  // Log error for debugging
  console.error('AI service error (' + operation + '):', serviceError);
  
  return serviceError;
};

/**
 * Helper function to implement retry logic
 * 
 * @param {Function} apiCall The API call function to retry
 * @param {string} operation Description of the operation
 * @param {number} maxRetries Maximum number of retry attempts
 * @param {number} delayMs Delay between retries in milliseconds
 * @returns {Promise<T>} The API call result
 * @throws {AIServiceError} Normalized error after retries are exhausted
 */
const withRetry = async <T>(
  apiCall: () => Promise<T>, 
  operation: string,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> => {
  let lastError: AIServiceError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the API call
      return await apiCall();
    } catch (error) {
      // Handle and normalize the error
      const serviceError = handleApiError(error as Error | AxiosError, operation);
      lastError = serviceError;
      
      // If error is not retryable or this was the last attempt, throw
      if (!serviceError.isRetryable || attempt === maxRetries) {
        throw serviceError;
      }
      
      // Wait before the next attempt
      console.warn(`Retry ${attempt + 1}/${maxRetries} for ${operation} (${serviceError.code})`);
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  
  // This should never be reached due to the throw in the loop,
  // but TypeScript needs this to ensure a return value
  throw lastError || new Error(`Unknown error in ${operation}`);
};

/**
 * Submit a script for analysis to the agentic AI assistant
 * This uses the enhanced assistant that can search the internet and find similar scripts
 * 
 * @param {AIAnalysisRequest} request Analysis request details
 * @param {string} apiKey Optional API key to use for the request
 * @returns {Promise<AIAnalysisResult>} Analysis results
 * @throws {AIServiceError} Normalized error object
 */
export const analyzeScriptWithAgent = async (
  request: AIAnalysisRequest,
  apiKey?: string
): Promise<AIAnalysisResult> => {
  const headers: Record<string, string> = {};
  
  if (apiKey) {
    headers['x-openai-api-key'] = apiKey;
  }

  return withRetry(async () => {
    const { data } = await apiClient.post<AIAnalysisResult>(
      '/scripts/analyze/assistant',
      request,
      { 
        headers,
        timeout: API_TIMEOUT
      }
    );
    return data;
  }, 'analyze script with AI agent');
};

/**
 * Get examples of similar scripts from the agentic AI assistant
 * 
 * @param {string} description Description of the script functionality to find similar examples
 * @param {number} limit Maximum number of examples to return
 * @returns {Promise<any[]>} Array of similar script examples
 * @throws {AIServiceError} Normalized error object
 */
export const getSimilarScriptExamples = async (
  description: string,
  limit: number = 10
): Promise<any[]> => {
  return withRetry(async () => {
    const { data } = await apiClient.get('/scripts/examples', {
      params: {
        description,
        limit
      },
      timeout: API_TIMEOUT / 2 // Use shorter timeout for examples
    });
    return data.examples || [];
  }, 'get similar script examples');
};

/**
 * Generate a PowerShell script using the agentic AI assistant
 * 
 * @param {string} description Description of the desired script functionality
 * @param {string} apiKey Optional API key to use for the request
 * @returns {Promise<string>} Generated script content
 * @throws {AIServiceError} Normalized error object
 */
export const generateScript = async (
  description: string,
  apiKey?: string
): Promise<string> => {
  const headers: Record<string, string> = {};
  
  if (apiKey) {
    headers['x-openai-api-key'] = apiKey;
  }

  return withRetry(async () => {
    const { data } = await apiClient.post<{content: string}>(
      '/scripts/generate',
      { description },
      { 
        headers,
        timeout: API_TIMEOUT
      }
    );
    return data.content;
  }, 'generate script');
};

/**
 * Ask the AI agent a question about PowerShell or scripting
 * This implementation uses the 'please' method approach with agentic capabilities
 * 
 * @param {string} question The question to ask
 * @param {string} context Optional context to provide (e.g., script content)
 * @returns {Promise<string>} AI response
 * @throws {AIServiceError} Normalized error object
 */
export const askAgentQuestion = async (
  question: string,
  context?: string
): Promise<string> => {
  return withRetry(async () => {
    const { data } = await apiClient.post<{response: string}>(
      '/scripts/please',
      {
        question,
        context,
        useAgent: true
      },
      { timeout: API_TIMEOUT }
    );
    return data.response;
  }, 'ask AI agent question');
};

/**
 * Explain a PowerShell script or command using the agentic AI assistant
 * 
 * @param {string} content Script or command content to explain
 * @param {string} type Type of explanation (simple, detailed, security, etc.)
 * @returns {Promise<string>} Explanation
 * @throws {AIServiceError} Normalized error object
 */
export const explainWithAgent = async (
  content: string,
  type: 'simple' | 'detailed' | 'security' = 'simple'
): Promise<string> => {
  return withRetry(async () => {
    const { data } = await apiClient.post<{explanation: string}>(
      '/scripts/explain',
      {
        content,
        type,
        useAgent: true
      },
      { timeout: API_TIMEOUT }
    );
    return data.explanation;
  }, 'explain with AI agent');
};
