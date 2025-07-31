/**
 * AI Agent Controller
 * Handles AI agent interactions including question answering and script analysis
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import aiService from '../utils/aiService';

class AiAgentController {
  /**
   * Answer a question using the AI agent
   */
  async answerQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { question, context, useAgent = false } = req.body;
      
      if (!question) {
        return res.status(400).json({ 
          message: 'Question is required', 
          status: 'error' 
        });
      }
      
      logger.info(`Processing AI agent question: "${question.substring(0, 50)}..."`);
      
      // Call AI service to answer the question
      const result = await aiService.askQuestion(question, context, useAgent);
      
      return res.json({ response: result.response });
    } catch (error) {
      logger.error('Error in AI agent question endpoint:', error);
      const errorMessage = error instanceof Error && error.message.includes('API key') 
        ? error.message 
        : 'Failed to process your question';
      return res.status(500).json({ 
        message: errorMessage, 
        status: 'error' 
      });
    }
  }

  /**
   * Analyze a script using the AI assistant
   */
  async analyzeScript(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, filename, requestType = 'standard', analysisOptions } = req.body;
      
      if (!content) {
        return res.status(400).json({ 
          message: 'Script content is required', 
          status: 'error' 
        });
      }
      
      logger.info(`Processing AI assistant analysis request: ${filename || 'unnamed script'}`);
      
      // Call AI service to analyze the script
      const analysisResult = await aiService.analyzeScript(content, filename, requestType, analysisOptions);
      
      return res.json(analysisResult);
    } catch (error) {
      logger.error('Error in AI assistant analysis endpoint:', error);
      const errorMessage = error instanceof Error && error.message.includes('API key') 
        ? error.message 
        : 'Failed to analyze the script';
      return res.status(500).json({ 
        message: errorMessage, 
        status: 'error' 
      });
    }
  }

  /**
   * Generate a script based on description
   */
  async generateScript(req: Request, res: Response, next: NextFunction) {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ 
          message: 'Description is required', 
          status: 'error' 
        });
      }
      
      logger.info(`Processing script generation request: "${description.substring(0, 50)}..."`);
      
      // Call AI service to generate the script
      const result = await aiService.generateScript(description);
      
      return res.json(result);
    } catch (error) {
      logger.error('Error in script generation endpoint:', error);
      const errorMessage = error instanceof Error && error.message.includes('API key') 
        ? error.message 
        : 'Failed to generate script';
      return res.status(500).json({ 
        message: errorMessage, 
        status: 'error' 
      });
    }
  }

  /**
   * Explain a script in detail
   */
  async explainScript(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, type = 'simple' } = req.body;
      
      if (!content) {
        return res.status(400).json({ 
          message: 'Script content is required', 
          status: 'error' 
        });
      }
      
      logger.info(`Processing script explanation request (${type})`);
      
      // Call AI service to explain the script
      const result = await aiService.explainScript(content, type);
      
      return res.json(result);
    } catch (error) {
      logger.error('Error in script explanation endpoint:', error);
      const errorMessage = error instanceof Error && error.message.includes('API key') 
        ? error.message 
        : 'Failed to explain the script';
      return res.status(500).json({ 
        message: errorMessage, 
        status: 'error' 
      });
    }
  }

  /**
   * Get similar script examples
   */
  async getSimilarExamples(req: Request, res: Response, next: NextFunction) {
    try {
      const description = req.query.description as string;
      const limit = parseInt(req.query.limit as string || '5', 10);
      
      if (!description) {
        return res.status(400).json({ 
          message: 'Description is required', 
          status: 'error' 
        });
      }
      
      logger.info(`Processing script examples request: "${description.substring(0, 50)}..."`);
      
      // Call AI service to get similar examples
      const result = await aiService.getSimilarExamples(description, limit);
      
      return res.json(result);
    } catch (error) {
      logger.error('Error in script examples endpoint:', error);
      const errorMessage = error instanceof Error && error.message.includes('API key') 
        ? error.message 
        : 'Failed to retrieve script examples';
      return res.status(500).json({ 
        message: errorMessage, 
        status: 'error' 
      });
    }
  }
}

export default new AiAgentController();
