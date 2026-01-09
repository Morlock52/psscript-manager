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

/**
 * AI Service client for handling all AI-related operations
 */
class AiServiceClient {
  private getApiHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (process.env.AI_SERVICE_API_KEY) {
      headers['x-api-key'] = process.env.AI_SERVICE_API_KEY;
    }

    return headers;
  }

  private async postChat(messages: Array<{ role: string; content: string }>, options?: {
    systemPrompt?: string;
    agentType?: string;
    sessionId?: string;
  }) {
    const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
      messages,
      system_prompt: options?.systemPrompt,
      agent_type: options?.agentType,
      session_id: options?.sessionId
    }, {
      timeout: 60000,
      headers: this.getApiHeaders()
    });

    return response.data;
  }

  /**
   * Ask a question to the AI assistant
   */
  async askQuestion(question: string, context?: string, useAgent: boolean = true) {
    try {
      const content = context
        ? `Context:\n${context}\n\nQuestion:\n${question}`
        : question;

      return await this.postChat([
        { role: 'user', content }
      ], {
        agentType: useAgent ? 'assistant' : undefined
      });
    } catch (error) {
      logger.error('Error calling AI service for question:', error);
      throw new Error('AI service is unavailable. Please ensure the AI service is running and configured with a valid API key.');
    }
  }

  /**
   * Generate a PowerShell script based on description
   */
  async generateScript(description: string) {
    try {
      const systemPrompt = 'Generate a PowerShell script that matches the user description. ' 
        + 'Return only the script content without additional commentary.';

      return await this.postChat([
        { role: 'user', content: description }
      ], {
        systemPrompt,
        agentType: 'assistant'
      });
    } catch (error) {
      logger.error('Error calling AI service for script generation:', error);
      throw new Error('AI service is unavailable. Please ensure the AI service is running and configured with a valid API key.');
    }
  }

  /**
   * Analyze a script using the AI assistant
   */
  async analyzeScript(content: string, filename?: string, requestType: string = 'standard', analysisOptions?: any) {
    try {
      const includeCommandDetails = analysisOptions?.includeCommandDetails
        ?? requestType === 'detailed';
      const fetchMsDocs = analysisOptions?.includeInternetSearch ?? false;

      const response = await axios.post(`${AI_SERVICE_URL}/analyze`, {
        content,
        script_name: filename
      }, {
        timeout: 60000,
        headers: this.getApiHeaders(),
        params: {
          include_command_details: includeCommandDetails,
          fetch_ms_docs: fetchMsDocs
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error calling AI service for script analysis:', error);
      throw new Error('AI service is unavailable. Please ensure the AI service is running and configured with a valid API key.');
    }
  }

  /**
   * Explain a script or command using the AI assistant
   */
  async explainScript(content: string, type: string = 'simple') {
    try {
      const systemPrompt = type === 'detailed'
        ? 'Explain the following PowerShell script in detail, including key commands and behavior.'
        : 'Explain the following PowerShell script in simple terms.';

      return await this.postChat([
        { role: 'user', content }
      ], {
        systemPrompt
      });
    } catch (error) {
      logger.error('Error calling AI service for explanation:', error);
      throw new Error('AI service is unavailable. Please ensure the AI service is running and configured with a valid API key.');
    }
  }

  /**
   * Get script examples similar to a description
   */
  async getSimilarExamples(description: string, limit: number = 5) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/similar`, {
        content: description,
        limit
      }, {
        timeout: 60000,
        headers: this.getApiHeaders()
      });

      return response.data;
    } catch (error) {
      logger.error('Error calling AI service for examples:', error);
      throw new Error('AI service is unavailable. Please ensure the AI service is running and configured with a valid API key.');
    }
  }
}

export default new AiServiceClient();
