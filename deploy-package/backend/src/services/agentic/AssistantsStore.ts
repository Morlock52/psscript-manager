import { Assistant, CreateAssistantParams, updateAssistant, UpdateAssistantParams, createAssistant } from '../../models/Agentic/Assistant';
import { Thread, CreateThreadParams, updateThread, createThread } from '../../models/Agentic/Thread';
import { Message, CreateMessageParams, createMessage } from '../../models/Agentic/Message';
import { Run, CreateRunParams, createRun, RunStep, createRunStep, RunStatus } from '../../models/Agentic/Run';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Promisify fs operations
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const readdir = promisify(fs.readdir);

/**
 * AssistantsStore class
 * Manages persistence of assistants, threads, messages, and runs
 */
export class AssistantsStore {
  private dataDir: string;
  private assistantsDir: string;
  private threadsDir: string;
  private messagesDir: string;
  private runsDir: string;
  private runStepsDir: string;
  
  private assistants: Map<string, Assistant> = new Map();
  private threads: Map<string, Thread> = new Map();
  private messages: Map<string, Message[]> = new Map(); // Keyed by thread_id
  private runs: Map<string, Run> = new Map();
  private runSteps: Map<string, RunStep[]> = new Map(); // Keyed by run_id
  
  constructor(dataDir = path.join(process.cwd(), 'data', 'assistants')) {
    this.dataDir = dataDir;
    this.assistantsDir = path.join(dataDir, 'assistants');
    this.threadsDir = path.join(dataDir, 'threads');
    this.messagesDir = path.join(dataDir, 'messages');
    this.runsDir = path.join(dataDir, 'runs');
    this.runStepsDir = path.join(dataDir, 'run_steps');
    this.initializeStore();
  }
  
  /**
   * Initialize the data storage directories
   */
  private async initializeStore() {
    const directories = [
      this.dataDir,
      this.assistantsDir,
      this.threadsDir,
      this.messagesDir,
      this.runsDir,
      this.runStepsDir,
    ];
    
    for (const dir of directories) {
      try {
        await access(dir, fs.constants.F_OK);
      } catch (error) {
        await mkdir(dir, { recursive: true });
      }
    }
    
    await this.loadAssistants();
    await this.loadThreads();
    await this.loadMessages();
    await this.loadRuns();
    await this.loadRunSteps();
  }
  
  /**
   * Load assistants from disk
   */
  private async loadAssistants() {
    try {
      const files = await readdir(this.assistantsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await readFile(path.join(this.assistantsDir, file), 'utf-8');
          const assistant: Assistant = JSON.parse(content);
          this.assistants.set(assistant.id, assistant);
        }
      }
    } catch (error) {
      console.error('Error loading assistants:', error);
    }
  }
  
  /**
   * Load threads from disk
   */
  private async loadThreads() {
    try {
      const files = await readdir(this.threadsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await readFile(path.join(this.threadsDir, file), 'utf-8');
          const thread: Thread = JSON.parse(content);
          this.threads.set(thread.id, thread);
        }
      }
    } catch (error) {
      console.error('Error loading threads:', error);
    }
  }
  
  /**
   * Load messages from disk
   */
  private async loadMessages() {
    try {
      const threadsDir = await readdir(this.messagesDir);
      for (const threadDir of threadsDir) {
        const threadPath = path.join(this.messagesDir, threadDir);
        if ((await fs.promises.stat(threadPath)).isDirectory()) {
          const files = await readdir(threadPath);
          const threadMessages: Message[] = [];
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const content = await readFile(path.join(threadPath, file), 'utf-8');
              const message: Message = JSON.parse(content);
              threadMessages.push(message);
            }
          }
          
          // Sort messages by creation time
          threadMessages.sort((a, b) => a.created_at - b.created_at);
          this.messages.set(threadDir, threadMessages);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }
  
  /**
   * Load runs from disk
   */
  private async loadRuns() {
    try {
      const files = await readdir(this.runsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await readFile(path.join(this.runsDir, file), 'utf-8');
          const run: Run = JSON.parse(content);
          this.runs.set(run.id, run);
        }
      }
    } catch (error) {
      console.error('Error loading runs:', error);
    }
  }
  
  /**
   * Load run steps from disk
   */
  private async loadRunSteps() {
    try {
      const runsDir = await readdir(this.runStepsDir);
      for (const runDir of runsDir) {
        const runPath = path.join(this.runStepsDir, runDir);
        if ((await fs.promises.stat(runPath)).isDirectory()) {
          const files = await readdir(runPath);
          const runStepsList: RunStep[] = [];
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const content = await readFile(path.join(runPath, file), 'utf-8');
              const step: RunStep = JSON.parse(content);
              runStepsList.push(step);
            }
          }
          
          // Sort steps by creation time
          runStepsList.sort((a, b) => a.created_at - b.created_at);
          this.runSteps.set(runDir, runStepsList);
        }
      }
    } catch (error) {
      console.error('Error loading run steps:', error);
    }
  }
  
  /**
   * Save an assistant to disk
   */
  private async saveAssistant(assistant: Assistant) {
    const filePath = path.join(this.assistantsDir, `${assistant.id}.json`);
    await writeFile(filePath, JSON.stringify(assistant, null, 2), 'utf-8');
  }
  
  /**
   * Save a thread to disk
   */
  private async saveThread(thread: Thread) {
    const filePath = path.join(this.threadsDir, `${thread.id}.json`);
    await writeFile(filePath, JSON.stringify(thread, null, 2), 'utf-8');
  }
  
  /**
   * Save a message to disk
   */
  private async saveMessage(message: Message) {
    const threadDir = path.join(this.messagesDir, message.thread_id);
    try {
      await access(threadDir, fs.constants.F_OK);
    } catch (error) {
      await mkdir(threadDir, { recursive: true });
    }
    
    const filePath = path.join(threadDir, `${message.id}.json`);
    await writeFile(filePath, JSON.stringify(message, null, 2), 'utf-8');
  }
  
  /**
   * Save a run to disk
   */
  private async saveRun(run: Run) {
    const filePath = path.join(this.runsDir, `${run.id}.json`);
    await writeFile(filePath, JSON.stringify(run, null, 2), 'utf-8');
  }
  
  /**
   * Save a run step to disk
   */
  private async saveRunStep(step: RunStep) {
    const runDir = path.join(this.runStepsDir, step.run_id);
    try {
      await access(runDir, fs.constants.F_OK);
    } catch (error) {
      await mkdir(runDir, { recursive: true });
    }
    
    const filePath = path.join(runDir, `${step.id}.json`);
    await writeFile(filePath, JSON.stringify(step, null, 2), 'utf-8');
  }
  
  // Assistant operations
  
  /**
   * Create a new assistant
   */
  async createAssistant(params: CreateAssistantParams): Promise<Assistant> {
    const assistant = createAssistant(params);
    this.assistants.set(assistant.id, assistant);
    await this.saveAssistant(assistant);
    return assistant;
  }
  
  /**
   * Retrieve an assistant by ID
   */
  async retrieveAssistant(assistantId: string): Promise<Assistant | null> {
    return this.assistants.get(assistantId) || null;
  }
  
  /**
   * Update an assistant
   */
  async updateAssistant(
    assistantId: string,
    params: UpdateAssistantParams
  ): Promise<Assistant | null> {
    const assistant = this.assistants.get(assistantId);
    if (!assistant) return null;
    
    const updatedAssistant = updateAssistant(assistant, params);
    this.assistants.set(assistantId, updatedAssistant);
    await this.saveAssistant(updatedAssistant);
    return updatedAssistant;
  }
  
  /**
   * Delete an assistant
   */
  async deleteAssistant(assistantId: string): Promise<boolean> {
    const assistant = this.assistants.get(assistantId);
    if (!assistant) return false;
    
    this.assistants.delete(assistantId);
    try {
      const filePath = path.join(this.assistantsDir, `${assistantId}.json`);
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting assistant ${assistantId}:`, error);
      return false;
    }
  }
  
  /**
   * List all assistants
   */
  async listAssistants(): Promise<Assistant[]> {
    return Array.from(this.assistants.values());
  }
  
  // Thread operations
  
  /**
   * Create a new thread
   */
  async createThread(params: CreateThreadParams = {}): Promise<Thread> {
    const thread = createThread(params);
    this.threads.set(thread.id, thread);
    this.messages.set(thread.id, []);
    await this.saveThread(thread);
    return thread;
  }
  
  /**
   * Retrieve a thread by ID
   */
  async retrieveThread(threadId: string): Promise<Thread | null> {
    return this.threads.get(threadId) || null;
  }
  
  /**
   * Update a thread
   */
  async updateThread(
    threadId: string,
    params: { metadata?: Record<string, string> }
  ): Promise<Thread | null> {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    
    const updatedThread = updateThread(thread, params);
    this.threads.set(threadId, updatedThread);
    await this.saveThread(updatedThread);
    return updatedThread;
  }
  
  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<boolean> {
    const thread = this.threads.get(threadId);
    if (!thread) return false;
    
    this.threads.delete(threadId);
    this.messages.delete(threadId);
    
    try {
      // Delete thread file
      const threadPath = path.join(this.threadsDir, `${threadId}.json`);
      await fs.promises.unlink(threadPath);
      
      // Delete associated messages directory
      const messagesDir = path.join(this.messagesDir, threadId);
      if (fs.existsSync(messagesDir)) {
        const files = await readdir(messagesDir);
        for (const file of files) {
          await fs.promises.unlink(path.join(messagesDir, file));
        }
        await fs.promises.rmdir(messagesDir);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting thread ${threadId}:`, error);
      return false;
    }
  }
  
  // Message operations
  
  /**
   * Create a message in a thread
   */
  async createMessage(params: CreateMessageParams): Promise<Message | null> {
    const thread = this.threads.get(params.thread_id);
    if (!thread) return null;
    
    const message = createMessage(params);
    const threadMessages = this.messages.get(params.thread_id) || [];
    threadMessages.push(message);
    this.messages.set(params.thread_id, threadMessages);
    await this.saveMessage(message);
    return message;
  }
  
  /**
   * Retrieve a message by ID
   */
  async retrieveMessage(threadId: string, messageId: string): Promise<Message | null> {
    const threadMessages = this.messages.get(threadId) || [];
    return threadMessages.find(m => m.id === messageId) || null;
  }
  
  /**
   * List messages in a thread
   */
  async listMessages(threadId: string): Promise<Message[]> {
    return this.messages.get(threadId) || [];
  }
  
  // Run operations
  
  /**
   * Create a run for a thread
   */
  async createRun(params: CreateRunParams): Promise<Run | null> {
    const thread = this.threads.get(params.thread_id);
    const assistant = this.assistants.get(params.assistant_id);
    if (!thread || !assistant) return null;
    
    const run = createRun({
      ...params,
      model: params.model || assistant.model,
      instructions: params.instructions || assistant.instructions || undefined,
      tools: params.tools || assistant.tools,
    });
    
    this.runs.set(run.id, run);
    this.runSteps.set(run.id, []);
    await this.saveRun(run);
    return run;
  }
  
  /**
   * Retrieve a run by ID
   */
  async retrieveRun(runId: string): Promise<Run | null> {
    return this.runs.get(runId) || null;
  }
  
  /**
   * List runs for a thread
   */
  async listRuns(threadId: string): Promise<Run[]> {
    return Array.from(this.runs.values()).filter(run => run.thread_id === threadId);
  }
  
  /**
   * Update a run's status
   */
  async updateRunStatus(
    runId: string,
    status: RunStatus,
    additionalFields: Partial<Run> = {}
  ): Promise<Run | null> {
    const run = this.runs.get(runId);
    if (!run) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const updatedRun: Run = {
      ...run,
      status,
      ...additionalFields,
    };
    
    // Update timestamps based on status
    if (status === 'in_progress' && !updatedRun.started_at) {
      updatedRun.started_at = now;
    } else if (status === 'completed' && !updatedRun.completed_at) {
      updatedRun.completed_at = now;
    } else if (status === 'failed' && !updatedRun.failed_at) {
      updatedRun.failed_at = now;
    } else if (status === 'cancelled' && !updatedRun.cancelled_at) {
      updatedRun.cancelled_at = now;
    }
    
    this.runs.set(runId, updatedRun);
    await this.saveRun(updatedRun);
    return updatedRun;
  }
  
  /**
   * Cancel a run
   */
  async cancelRun(runId: string): Promise<Run | null> {
    return this.updateRunStatus(runId, 'cancelled');
  }
  
  // Run Step operations
  
  /**
   * Create a run step
   */
  async createRunStep(params: {
    run_id: string;
    thread_id: string;
    assistant_id: string;
    type: 'message_creation' | 'tool_calls';
    message_id?: string;
    tool_calls?: any[];
  }): Promise<RunStep | null> {
    const run = this.runs.get(params.run_id);
    if (!run) return null;
    
    const step = createRunStep(params);
    const runSteps = this.runSteps.get(params.run_id) || [];
    runSteps.push(step);
    this.runSteps.set(params.run_id, runSteps);
    await this.saveRunStep(step);
    return step;
  }
  
  /**
   * List steps for a run
   */
  async listRunSteps(runId: string): Promise<RunStep[]> {
    return this.runSteps.get(runId) || [];
  }
  
  /**
   * Update a run step's status
   */
  async updateRunStepStatus(
    stepId: string,
    runId: string,
    status: RunStatus,
    additionalFields: Partial<RunStep> = {}
  ): Promise<RunStep | null> {
    const steps = this.runSteps.get(runId) || [];
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return null;
    
    const step = steps[stepIndex];
    const now = Math.floor(Date.now() / 1000);
    
    const updatedStep: RunStep = {
      ...step,
      status,
      ...additionalFields,
    };
    
    // Update timestamps based on status
    if (status === 'completed' && !updatedStep.completed_at) {
      updatedStep.completed_at = now;
    } else if (status === 'failed' && !updatedStep.failed_at) {
      updatedStep.failed_at = now;
    } else if (status === 'cancelled' && !updatedStep.cancelled_at) {
      updatedStep.cancelled_at = now;
    }
    
    steps[stepIndex] = updatedStep;
    this.runSteps.set(runId, steps);
    await this.saveRunStep(updatedStep);
    return updatedStep;
  }
}

// Create and export a singleton instance
export const assistantsStore = new AssistantsStore();
