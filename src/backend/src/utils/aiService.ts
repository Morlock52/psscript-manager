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
  /**
   * Ask a question to the AI assistant
   */
  async askQuestion(question: string, context?: string, useAgent: boolean = true) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ask`, {
        question,
        context,
        useAgent
      }, {
        timeout: 60000, // 60 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
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
      const response = await axios.post(`${AI_SERVICE_URL}/api/generate`, {
        description
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
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
      const response = await axios.post(`${AI_SERVICE_URL}/api/analyze`, {
        content,
        filename,
        requestType,
        analysisOptions
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
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
      const response = await axios.post(`${AI_SERVICE_URL}/api/explain`, {
        content,
        type
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
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
      const response = await axios.post(`${AI_SERVICE_URL}/api/examples`, {
        description,
        limit
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error calling AI service for examples:', error);
      throw new Error('AI service is unavailable. Please ensure the AI service is running and configured with a valid API key.');
    }
  }
}

export default new AiServiceClient();
