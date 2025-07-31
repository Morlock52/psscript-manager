import { Request, Response } from 'express';
import { assistantsStore } from '../../services/agentic/AssistantsStore';
import { CreateAssistantParams } from '../../models/Agentic/Assistant';
import { CreateThreadParams } from '../../models/Agentic/Thread';
import { CreateMessageParams } from '../../models/Agentic/Message';
import { CreateRunParams, SubmitToolOutputsParams } from '../../models/Agentic/Run';
import { handleAssistantRun } from '../../services/agentic/RunEngine';

/**
 * AssistantsController
 * Handles requests for the Assistants API endpoints
 */
export class AssistantsController {
  // Assistant endpoints
  
  /**
   * Create an assistant
   */
  async createAssistant(req: Request, res: Response) {
    try {
      const params: CreateAssistantParams = req.body;
      const assistant = await assistantsStore.createAssistant(params);
      res.status(201).json(assistant);
    } catch (error) {
      console.error('Error creating assistant:', error);
      res.status(500).json({ error: 'Failed to create assistant' });
    }
  }
  
  /**
   * Retrieve an assistant
   */
  async retrieveAssistant(req: Request, res: Response) {
    try {
      const { assistantId } = req.params;
      const assistant = await assistantsStore.retrieveAssistant(assistantId);
      
      if (!assistant) {
        return res.status(404).json({ error: 'Assistant not found' });
      }
      
      res.json(assistant);
    } catch (error) {
      console.error('Error retrieving assistant:', error);
      res.status(500).json({ error: 'Failed to retrieve assistant' });
    }
  }
  
  /**
   * Update an assistant
   */
  async updateAssistant(req: Request, res: Response) {
    try {
      const { assistantId } = req.params;
      const updatedAssistant = await assistantsStore.updateAssistant(assistantId, req.body);
      
      if (!updatedAssistant) {
        return res.status(404).json({ error: 'Assistant not found' });
      }
      
      res.json(updatedAssistant);
    } catch (error) {
      console.error('Error updating assistant:', error);
      res.status(500).json({ error: 'Failed to update assistant' });
    }
  }
  
  /**
   * Delete an assistant
   */
  async deleteAssistant(req: Request, res: Response) {
    try {
      const { assistantId } = req.params;
      const deleted = await assistantsStore.deleteAssistant(assistantId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Assistant not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting assistant:', error);
      res.status(500).json({ error: 'Failed to delete assistant' });
    }
  }
  
  /**
   * List assistants
   */
  async listAssistants(req: Request, res: Response) {
    try {
      const assistants = await assistantsStore.listAssistants();
      res.json({
        object: 'list',
        data: assistants,
      });
    } catch (error) {
      console.error('Error listing assistants:', error);
      res.status(500).json({ error: 'Failed to list assistants' });
    }
  }
  
  // Thread endpoints
  
  /**
   * Create a thread
   */
  async createThread(req: Request, res: Response) {
    try {
      const params: CreateThreadParams = req.body;
      const thread = await assistantsStore.createThread(params);
      res.status(201).json(thread);
    } catch (error) {
      console.error('Error creating thread:', error);
      res.status(500).json({ error: 'Failed to create thread' });
    }
  }
  
  /**
   * Retrieve a thread
   */
  async retrieveThread(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const thread = await assistantsStore.retrieveThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }
      
      res.json(thread);
    } catch (error) {
      console.error('Error retrieving thread:', error);
      res.status(500).json({ error: 'Failed to retrieve thread' });
    }
  }
  
  /**
   * Update a thread
   */
  async updateThread(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const updatedThread = await assistantsStore.updateThread(threadId, req.body);
      
      if (!updatedThread) {
        return res.status(404).json({ error: 'Thread not found' });
      }
      
      res.json(updatedThread);
    } catch (error) {
      console.error('Error updating thread:', error);
      res.status(500).json({ error: 'Failed to update thread' });
    }
  }
  
  /**
   * Delete a thread
   */
  async deleteThread(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const deleted = await assistantsStore.deleteThread(threadId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Thread not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting thread:', error);
      res.status(500).json({ error: 'Failed to delete thread' });
    }
  }
  
  // Message endpoints
  
  /**
   * Create a message
   */
  async createMessage(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const params: CreateMessageParams = {
        ...req.body,
        thread_id: threadId,
      };
      
      const message = await assistantsStore.createMessage(params);
      
      if (!message) {
        return res.status(404).json({ error: 'Thread not found' });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  }
  
  /**
   * Retrieve a message
   */
  async retrieveMessage(req: Request, res: Response) {
    try {
      const { threadId, messageId } = req.params;
      const message = await assistantsStore.retrieveMessage(threadId, messageId);
      
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      res.json(message);
    } catch (error) {
      console.error('Error retrieving message:', error);
      res.status(500).json({ error: 'Failed to retrieve message' });
    }
  }
  
  /**
   * List messages in a thread
   */
  async listMessages(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const messages = await assistantsStore.listMessages(threadId);
      
      res.json({
        object: 'list',
        data: messages,
      });
    } catch (error) {
      console.error('Error listing messages:', error);
      res.status(500).json({ error: 'Failed to list messages' });
    }
  }
  
  // Run endpoints
  
  /**
   * Create a run
   */
  async createRun(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const params: CreateRunParams = {
        ...req.body,
        thread_id: threadId,
      };
      
      const run = await assistantsStore.createRun(params);
      
      if (!run) {
        return res.status(404).json({ error: 'Thread or assistant not found' });
      }
      
      // Start the run asynchronously
      handleAssistantRun(run.id);
      
      res.status(201).json(run);
    } catch (error) {
      console.error('Error creating run:', error);
      res.status(500).json({ error: 'Failed to create run' });
    }
  }
  
  /**
   * Retrieve a run
   */
  async retrieveRun(req: Request, res: Response) {
    try {
      const { runId } = req.params;
      const run = await assistantsStore.retrieveRun(runId);
      
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      
      res.json(run);
    } catch (error) {
      console.error('Error retrieving run:', error);
      res.status(500).json({ error: 'Failed to retrieve run' });
    }
  }
  
  /**
   * List runs for a thread
   */
  async listRuns(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const runs = await assistantsStore.listRuns(threadId);
      
      res.json({
        object: 'list',
        data: runs,
      });
    } catch (error) {
      console.error('Error listing runs:', error);
      res.status(500).json({ error: 'Failed to list runs' });
    }
  }
  
  /**
   * Cancel a run
   */
  async cancelRun(req: Request, res: Response) {
    try {
      const { runId } = req.params;
      const run = await assistantsStore.cancelRun(runId);
      
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      
      res.json(run);
    } catch (error) {
      console.error('Error cancelling run:', error);
      res.status(500).json({ error: 'Failed to cancel run' });
    }
  }
  
  /**
   * Submit tool outputs for a run
   */
  async submitToolOutputs(req: Request, res: Response) {
    try {
      const { runId } = req.params;
      const { tool_outputs }: SubmitToolOutputsParams = req.body;
      
      // Get the run
      const run = await assistantsStore.retrieveRun(runId);
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      
      // Update the run with tool outputs
      const updatedRun = await assistantsStore.updateRunStatus(
        runId,
        'in_progress',
        { 
          required_action: null,
        }
      );
      
      if (!updatedRun) {
        return res.status(404).json({ error: 'Run not found' });
      }
      
      // Resume the run with tool outputs
      handleAssistantRun(runId, tool_outputs);
      
      res.json(updatedRun);
    } catch (error) {
      console.error('Error submitting tool outputs:', error);
      res.status(500).json({ error: 'Failed to submit tool outputs' });
    }
  }
  
  /**
   * List run steps
   */
  async listRunSteps(req: Request, res: Response) {
    try {
      const { runId } = req.params;
      const steps = await assistantsStore.listRunSteps(runId);
      
      res.json({
        object: 'list',
        data: steps,
      });
    } catch (error) {
      console.error('Error listing run steps:', error);
      res.status(500).json({ error: 'Failed to list run steps' });
    }
  }
}

export const assistantsController = new AssistantsController();
