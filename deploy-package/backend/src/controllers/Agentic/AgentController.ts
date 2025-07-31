import { Request, Response } from 'express';
import { agentOrchestrator, Agent, Thread, Message, Run } from '../../services/agentic/AgentOrchestrator';
import logger from '../../utils/logger';

/**
 * Controller for the Agent Orchestration API
 * Provides endpoints for managing agents, threads, and runs
 */
export class AgentController {
  /**
   * Create a new agent
   * @param req Request object
   * @param res Response object
   */
  public async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, capabilities, model, tools, metadata } = req.body;
      
      // Validate request
      if (!name) {
        res.status(400).json({ error: 'Agent name is required' });
        return;
      }
      
      // Create the agent
      const agent = agentOrchestrator.createAgent({
        name,
        description,
        capabilities,
        model,
        tools: tools || [],
        metadata: metadata || {}
      });
      
      res.status(201).json(agent);
    } catch (error) {
      logger.error('Error creating agent:', error);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  }
  
  /**
   * Create a new thread for conversation with an agent
   * @param req Request object
   * @param res Response object
   */
  public async createThread(req: Request, res: Response): Promise<void> {
    try {
      const { agentId, message } = req.body;
      
      // Validate request
      if (!agentId) {
        res.status(400).json({ error: 'Agent ID is required' });
        return;
      }
      
      // Create the thread
      const thread = agentOrchestrator.createThread(agentId, message);
      
      res.status(201).json(thread);
    } catch (error) {
      logger.error('Error creating thread:', error);
      
      if (error.message.includes('Agent not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ error: 'Failed to create thread' });
    }
  }
  
  /**
   * Add a message to an existing thread
   * @param req Request object
   * @param res Response object
   */
  public async addMessage(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;
      const { content, role = 'user' } = req.body;
      
      // Validate request
      if (!threadId) {
        res.status(400).json({ error: 'Thread ID is required' });
        return;
      }
      
      if (!content) {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }
      
      if (!['user', 'system'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be "user" or "system"' });
        return;
      }
      
      // Add the message
      const message = agentOrchestrator.addMessage(threadId, role as 'user' | 'system', content);
      
      res.status(201).json(message);
    } catch (error) {
      logger.error('Error adding message:', error);
      
      if (error.message.includes('Thread not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ error: 'Failed to add message' });
    }
  }
  
  /**
   * Start a run to process a thread with the associated agent
   * @param req Request object
   * @param res Response object
   */
  public async createRun(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;
      
      // Validate request
      if (!threadId) {
        res.status(400).json({ error: 'Thread ID is required' });
        return;
      }
      
      // Create the run
      const run = await agentOrchestrator.createRun(threadId);
      
      res.status(201).json(run);
    } catch (error) {
      logger.error('Error creating run:', error);
      
      if (error.message.includes('Thread not found') || error.message.includes('Agent not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ error: 'Failed to create run' });
    }
  }
  
  /**
   * Get a thread by ID
   * @param req Request object
   * @param res Response object
   */
  public async getThread(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;
      
      // Validate request
      if (!threadId) {
        res.status(400).json({ error: 'Thread ID is required' });
        return;
      }
      
      // Get the thread
      const thread = agentOrchestrator.getThread(threadId);
      
      if (!thread) {
        res.status(404).json({ error: `Thread not found: ${threadId}` });
        return;
      }
      
      res.status(200).json(thread);
    } catch (error) {
      logger.error('Error getting thread:', error);
      res.status(500).json({ error: 'Failed to get thread' });
    }
  }
  
  /**
   * Get all messages for a thread
   * @param req Request object
   * @param res Response object
   */
  public async getThreadMessages(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;
      
      // Validate request
      if (!threadId) {
        res.status(400).json({ error: 'Thread ID is required' });
        return;
      }
      
      // Get the messages
      const messages = agentOrchestrator.getThreadMessages(threadId);
      
      res.status(200).json(messages);
    } catch (error) {
      logger.error('Error getting thread messages:', error);
      
      if (error.message.includes('Thread not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ error: 'Failed to get thread messages' });
    }
  }
  
  /**
   * Get a run by ID
   * @param req Request object
   * @param res Response object
   */
  public async getRun(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;
      
      // Validate request
      if (!runId) {
        res.status(400).json({ error: 'Run ID is required' });
        return;
      }
      
      // Get the run
      const run = agentOrchestrator.getRun(runId);
      
      if (!run) {
        res.status(404).json({ error: `Run not found: ${runId}` });
        return;
      }
      
      res.status(200).json(run);
    } catch (error) {
      logger.error('Error getting run:', error);
      res.status(500).json({ error: 'Failed to get run' });
    }
  }
}

// Export controller instance
export const agentController = new AgentController();
