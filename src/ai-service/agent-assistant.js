/**
 * Agentic AI Assistant Implementation for PowerShell Script Analysis
 * This service connects to OpenAI's Assistant API with agentic capabilities
 * for analyzing PowerShell scripts, searching the internet for relevant information,
 * and providing comprehensive analysis results.
 * 
 * Updated to use the latest OpenAI API features and best practices.
 */

const { OpenAI } = require('openai');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./logger');
const { setTimeout } = require('timers/promises');
const axiosRetry = require('axios-retry');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
const SERVICE_STARTED_AT = Date.now();

const SERVER_VERSION = '1.1.0';
const VALID_MODES = new Set(['live', 'mock']);
const DEFAULT_MODE = (process.env.AI_SERVICE_MODE || '').toLowerCase();

const getInitialMode = () => {
  if (VALID_MODES.has(DEFAULT_MODE)) {
    return DEFAULT_MODE;
  }
  return process.env.OPENAI_API_KEY ? 'live' : 'mock';
};

const createRequestId = () => Math.random().toString(36).substring(2, 10);

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const resolveApiKeyFromRequest = (req) => {
  return req.headers['x-api-key'] ||
    req.headers['x-openai-api-key'] ||
    req.body?.api_key ||
    process.env.OPENAI_API_KEY ||
    null;
};

const sanitizeLimit = (value, fallback = 5) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 1), 25);
};

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && (error.response.status === 429 || error.response.status >= 500));
  }
});

// Default port
const PORT = process.env.AI_SERVICE_PORT || 8000;

// Constants for retry configuration
const MAX_RETRIES = 5;
const MAX_RETRY_DELAY = 10000; // 10 seconds

/**
 * AgentAssistant class for handling script analysis with agentic capabilities
 * Uses OpenAI's Assistant API to create autonomous workflows
 */
class AgentAssistant {
  constructor() {
    this.assistants = new Map();
    this.threads = new Map();
    this.defaultAssistantId = process.env.OPENAI_ASSISTANT_ID;
    this.defaultModel = process.env.OPENAI_MODEL || "gpt-4o";
    this.isConnected = false;
    this.mode = getInitialMode();
  }

  getMode() {
    return this.mode;
  }

  shouldUseMockResponses() {
    return this.mode === 'mock';
  }

  buildMetadata(operation, extra = {}) {
    return {
      operation,
      mode: this.mode,
      timestamp: new Date().toISOString(),
      ...extra
    };
  }

  ensureApiKey(apiKey) {
    if (!apiKey) {
      throw createHttpError(400, 'OpenAI API key is required for live mode');
    }
  }

  extractTextFromResponse(message) {
    if (!message || !message.content) {
      return '';
    }

    return message.content
      .filter(part => part.type === 'text')
      .map(part => part.text.value)
      .join('\n')
      .trim();
  }

  async executeAssistantRun(apiKey, { message, attachments = [], assistantId = null, additionalInstructions = null }) {
    const client = this.initClient(apiKey);
    const actualAssistantId = await this.getAssistant(client, assistantId);
    const threadId = await this.createThread(client);

    const fileIds = [];
    for (const attachment of attachments) {
      const fileId = await this.uploadFile(client, attachment.content, attachment.filename);
      fileIds.push(fileId);
    }

    await this.addMessage(client, threadId, message, fileIds);

    const run = await this.runAssistant(client, actualAssistantId, additionalInstructions);
    await this.waitForRunCompletion(client, threadId, run.id);

    const messages = await this.getMessages(client, threadId);
    const assistantResponses = messages.filter(msg => msg.role === 'assistant');
    const latestResponse = assistantResponses[0];

    return {
      latestResponse,
      threadId,
      assistantId: actualAssistantId
    };
  }

  /**
   * Initialize the OpenAI client with the provided API key
   * @param {string} apiKey - OpenAI API key
   * @returns {OpenAI} OpenAI client instance
   */
  initClient(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    return new OpenAI({ 
      apiKey,
      timeout: 60000, // 60 second timeout
      maxRetries: 3 // Built-in retry mechanism
    });
  }

  /**
   * Create or retrieve an assistant based on the provided configuration
   * Uses exponential backoff for retries on failure.
   * @param {OpenAI} client - OpenAI client instance
   * @param {string} assistantId - Optional ID of an existing assistant
   * @returns {Promise<string>} Assistant ID
   */
  async getAssistant(client, assistantId) {
    // Use provided assistant ID or default from environment
    const targetAssistantId = assistantId || this.defaultAssistantId;
    
    // Return from cache if available
    if (this.assistants.has(targetAssistantId)) {
      return targetAssistantId;
    }
    
    let retries = 0;
    let lastError = null;
    
    while (retries < MAX_RETRIES) {
      try {
        // Try to retrieve the existing assistant
        if (targetAssistantId) {
          const assistant = await client.beta.assistants.retrieve(targetAssistantId);
          this.assistants.set(targetAssistantId, assistant);
          this.isConnected = true;
          return targetAssistantId;
        }
        
        // Create a new assistant if no ID provided
        const assistant = await client.beta.assistants.create({
          name: "PowerShell Script Analyzer",
          description: "Assistant for analyzing PowerShell scripts, identifying security issues, and suggesting improvements",
          model: this.defaultModel,
          instructions: `You are a PowerShell script expert. Analyze scripts for:
            1. Security vulnerabilities and risks
            2. Code quality and best practices
            3. Performance optimizations
            4. Command details and parameter documentation
            5. Potential improvements
            
            Use web browsing when necessary to find relevant information, documentation, or examples.
            Format your response clearly with markdown. Include code examples where appropriate.`,
          tools: [
            { type: "code_interpreter" },
            { type: "retrieval" },
            { type: "function", function: {
              name: "search_internet",
              description: "Search the internet for information related to PowerShell commands, security best practices, or documentation",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query"
                  }
                },
                required: ["query"]
              }
            }},
            { type: "function", function: {
              name: "find_similar_scripts",
              description: "Find similar PowerShell scripts to use as reference",
              parameters: {
                type: "object",
                properties: {
                  description: {
                    type: "string", 
                    description: "Description of the script functionality to find similar examples"
                  }
                },
                required: ["description"]
              }
            }}
          ],
          metadata: {
            type: "powershell_expert",
            version: "2.0",
            created_by: "psscript_platform"
          }
        });
        
        this.assistants.set(assistant.id, assistant);
        logger.info(`Created new assistant: ${assistant.id}`);
        logger.info(`Add this to your .env file: OPENAI_ASSISTANT_ID=${assistant.id}`);
        this.isConnected = true;
        return assistant.id;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          logger.error('Max retries reached for assistant creation/retrieval:', error);
          this.isConnected = false;
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(Math.pow(2, retries) * 1000, MAX_RETRY_DELAY);
        logger.warn(`Retrying assistant creation/retrieval in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`);
        await setTimeout(delay);
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Failed to create/retrieve assistant after max retries');
  }

  /**
   * Create a new thread for conversation with the assistant
   * Uses exponential backoff for retries on failure.
   * @param {OpenAI} client - OpenAI client instance
   * @param {string} sessionId - Optional session identifier
   * @returns {Promise<string>} Thread ID
   */
  async createThread(client, sessionId = null) {
    let retries = 0;
    let lastError = null;
    
    while (retries < MAX_RETRIES) {
      try {
        // Check if we have a cached thread for this session
        if (sessionId && this.threads.has(sessionId)) {
          // Verify the thread still exists
          try {
            await client.beta.threads.retrieve(this.threads.get(sessionId));
            return this.threads.get(sessionId);
          } catch (e) {
            logger.warn(`Thread ${this.threads.get(sessionId)} no longer exists: ${e.message}`);
            // Continue to create a new thread
          }
        }
        
        // Create a new thread with metadata
        const thread = await client.beta.threads.create({
          metadata: {
            session_id: sessionId || `session_${Date.now()}`,
            created_at: new Date().toISOString(),
            client: "psscript_platform"
          }
        });
        
        // Cache the thread ID if we have a session ID
        if (sessionId) {
          this.threads.set(sessionId, thread.id);
        }
        
        return thread.id;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          logger.error('Max retries reached for thread creation:', error);
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(Math.pow(2, retries) * 1000, MAX_RETRY_DELAY);
        logger.warn(`Retrying thread creation in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`);
        await setTimeout(delay);
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Failed to create thread after max retries');
  }

  /**
   * Add a message to a thread
   * Uses exponential backoff for retries on failure.
   * @param {OpenAI} client - OpenAI client instance
   * @param {string} threadId - Thread ID
   * @param {string} content - Message content
   * @param {Array} files - Optional array of file IDs
   * @returns {Promise<object>} Message object
   */
  async addMessage(client, threadId, content, files = []) {
    let retries = 0;
    let lastError = null;
    
    while (retries < MAX_RETRIES) {
      try {
        return await client.beta.threads.messages.create(threadId, {
          role: "user",
          content,
          ...(files.length > 0 && { file_ids: files })
        });
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          logger.error('Max retries reached for adding message:', error);
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(Math.pow(2, retries) * 1000, MAX_RETRY_DELAY);
        logger.warn(`Retrying add message in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`);
        await setTimeout(delay);
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Failed to add message after max retries');
  }

  /**
   * Upload a file to OpenAI
   * Uses exponential backoff for retries on failure.
   * @param {OpenAI} client - OpenAI client instance
   * @param {string} content - File content
   * @param {string} filename - File name
   * @returns {Promise<string>} File ID
   */
  async uploadFile(client, content, filename) {
    let retries = 0;
    let lastError = null;
    
    while (retries < MAX_RETRIES) {
      try {
        // Convert content to Buffer if it's not already
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        
        const file = await client.files.create({
          file: new Blob([buffer], { type: 'text/plain' }),
          purpose: 'assistants'
        });
        
        return file.id;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          logger.error('Max retries reached for file upload:', error);
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(Math.pow(2, retries) * 1000, MAX_RETRY_DELAY);
        logger.warn(`Retrying file upload in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`);
        await setTimeout(delay);
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Failed to upload file after max retries');
  }

  /**
   * Run the assistant on a thread
   * Uses exponential backoff for retries on failure.
   * @param {OpenAI} client - OpenAI client instance
   * @param {string} assistantId - Assistant ID
   * @param {string} threadId - Thread ID
   * @param {object} additionalInstructions - Optional additional instructions
   * @returns {Promise<object>} Run object
   */
  async runAssistant(client, assistantId, threadId, additionalInstructions = null) {
    let retries = 0;
    let lastError = null;
    
    while (retries < MAX_RETRIES) {
      try {
        const runParams = {
          assistant_id: assistantId,
          ...(additionalInstructions && { additional_instructions: additionalInstructions })
        };
        
        return await client.beta.threads.runs.create(threadId, runParams);
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          logger.error('Max retries reached for running assistant:', error);
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(Math.pow(2, retries) * 1000, MAX_RETRY_DELAY);
        logger.warn(`Retrying run assistant in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`);
        await setTimeout(delay);
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Failed to run assistant after max retries');
  }

  /**
   * Poll for the status of a run until it completes
   * @param {OpenAI} client - OpenAI client instance
   * @param {string} threadId - Thread ID
   * @param {string} runId - Run ID
   * @returns {Promise<object>} Run object
   */
  async waitForRunCompletion(client, threadId, runId) {
    const maxTotalWait = 300000; // 5 minutes maximum total wait time
    const startTime = Date.now();
    
    const checkStatus = async () => {
      try {
        // Check if we've waited too long
        if (Date.now() - startTime > maxTotalWait) {
          try {
            await client.beta.threads.runs.cancel(threadId, runId);
          } catch (cancelError) {
            logger.error(`Error cancelling run: ${cancelError.message}`);
          }
          throw new Error(`Run ${runId} timed out after ${maxTotalWait / 1000} seconds`);
        }
        
        const run = await client.beta.threads.runs.retrieve(threadId, runId);
        
        if (run.status === 'completed') {
          return run;
        } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
          throw new Error(`Run ${runId} ended with status: ${run.status}, reason: ${run.last_error?.message || 'Unknown error'}`);
        } else if (run.status === 'requires_action') {
          // Handle tool calls
          const actions = run.required_action.submit_tool_outputs.tool_calls;
          const toolOutputs = [];
          
          for (const action of actions) {
            const { id, function: { name, arguments: args } } = action;
            let output = null;
            
            try {
              // Parse arguments
              const parsedArgs = JSON.parse(args);
              
              logger.info(`Handling tool call: ${name} with args: ${args}`);
              
              if (name === 'search_internet') {
                output = await this.handleInternetSearch(parsedArgs.query);
              } else if (name === 'find_similar_scripts') {
                output = await this.handleSimilarScriptsSearch(parsedArgs.description);
              } else {
                // Unknown function
                output = {
                  error: `Unknown function: ${name}`,
                  message: "This function is not implemented."
                };
              }
            } catch (error) {
              logger.error(`Error handling tool call: ${error.message}`);
              output = {
                error: error.message,
                message: "Failed to process this tool call."
              };
            }
            
            toolOutputs.push({
              tool_call_id: id,
              output: JSON.stringify(output)
            });
          }
          
          // Submit tool outputs
          await client.beta.threads.runs.submitToolOutputs(
            threadId,
            runId,
            { tool_outputs: toolOutputs }
          );
          
          // Continue polling with a delay
          return await setTimeout(1000).then(checkStatus);
        }
        
        // Wait and check again for other statuses (with exponential backoff)
        const waitTime = Math.min(2000, 500 * Math.pow(1.5, Math.floor((Date.now() - startTime) / 5000)));
        return await setTimeout(waitTime).then(checkStatus);
      } catch (error) {
        // If there's an error retrieving the run status, wait a bit and try again
        if (Date.now() - startTime > maxTotalWait) {
          throw error; // Give up after timeout
        }
        
        logger.warn(`Error checking run status: ${error.message}. Retrying...`);
        return await setTimeout(2000).then(checkStatus);
      }
    };
    
    return await checkStatus();
  }

  /**
   * Handle internet search tool call
   * @param {string} query - Search query
   * @returns {Promise<object>} Search results
   */
  async handleInternetSearch(query) {
    try {
      // Try to use DuckDuckGo search if available
      const duckDuckGoEnabled = process.env.USE_DUCKDUCKGO === 'true';
      
      if (duckDuckGoEnabled) {
        try {
          // Use DuckDuckGo search API
          const response = await axios.get('https://api.duckduckgo.com/', {
            params: {
              q: query,
              format: 'json',
              no_html: 1,
              no_redirect: 1
            }
          });
          
          if (response.data && response.data.RelatedTopics) {
            const results = response.data.RelatedTopics
              .filter(topic => topic.Text) // Filter out topics without text
              .slice(0, 5) // Limit to 5 results
              .map(topic => ({
                title: topic.Text.split(' - ')[0] || topic.Text,
                snippet: topic.Text,
                link: topic.FirstURL || ""
              }));
            
            if (results.length > 0) {
              return { results };
            }
          }
        } catch (duckDuckGoError) {
          logger.warn(`DuckDuckGo search failed: ${duckDuckGoError.message}. Falling back to Google.`);
          // Fall back to Google search
        }
      }
      
      // Using Google Custom Search API as fallback
      const searchApiKey = process.env.SEARCH_API_KEY || '';
      const searchEngineId = process.env.SEARCH_ENGINE_ID || '';
      
      if (!searchApiKey || !searchEngineId) {
        return {
          results: [
            {
              title: "Search API not configured",
              snippet: "The search API is not configured. Please provide SEARCH_API_KEY and SEARCH_ENGINE_ID in the environment variables.",
              link: ""
            }
          ]
        };
      }
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: searchApiKey,
          cx: searchEngineId,
          q: query
        }
      });
      
      if (!response.data.items || response.data.items.length === 0) {
        return {
          results: [
            {
              title: "No results found",
              snippet: `No results found for query: ${query}`,
              link: ""
            }
          ]
        };
      }
      
      const results = response.data.items.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link
      }));
      
      return { results };
    } catch (error) {
      logger.error('Error searching internet:', error);
      return {
        results: [
          {
            title: "Error searching the internet",
            snippet: error.message,
            link: ""
          }
        ]
      };
    }
  }

  /**
   * Handle similar scripts search tool call
   * @param {string} description - Script description
   * @returns {Promise<object>} Similar scripts
   */
  async handleSimilarScriptsSearch(description) {
    try {
      // This would typically call a vector database to find similar scripts
      // For now, return some example scripts based on common tasks
      const commonScripts = [
        {
          title: "System Information Collector",
          description: "Collects system information including OS, hardware, installed software",
          script: "Get-ComputerInfo | Format-List",
          similarity: 0.85
        },
        {
          title: "Log Parser",
          description: "Parses log files and extracts errors and warnings",
          script: "Get-Content ./logs/*.log | Where-Object { $_ -match 'ERROR|WARNING' } | Out-File -FilePath ./filtered_logs.txt",
          similarity: 0.78
        },
        {
          title: "User Account Manager",
          description: "Manages user accounts including creation, deletion, and permission updates",
          script: "Get-LocalUser | Where-Object { $_.Enabled -eq $true } | Format-Table Name, FullName, LastLogon",
          similarity: 0.72
        }
      ];
      
      // Filter based on relevance to the description
      const filtered = commonScripts.filter(script => 
        script.description.toLowerCase().includes(description.toLowerCase()) ||
        script.title.toLowerCase().includes(description.toLowerCase())
      );
      
      return { scripts: filtered.length > 0 ? filtered : commonScripts };
    } catch (error) {
      logger.error('Error finding similar scripts:', error);
      return { scripts: [] };
    }
  }

  /**
   * Get messages from a thread
   * @param {OpenAI} client - OpenAI client instance
   * @param {string} threadId - Thread ID
   * @returns {Promise<Array>} Messages
   */
  async getMessages(client, threadId) {
    try {
      const messages = await client.beta.threads.messages.list(threadId);
      return messages.data;
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Analyze a script using the assistant
   * @param {string} apiKey - OpenAI API key
   * @param {string} content - Script content
   * @param {string} filename - Script filename
   * @param {string} assistantId - Optional assistant ID
   * @returns {Promise<object>} Analysis results
   */
  async analyzeScript(apiKey, content, filename = 'script.ps1', assistantId = null, requestType = 'standard', analysisOptions = {}) {
    if (this.shouldUseMockResponses()) {
      return this.buildMockAnalysis(content, requestType, analysisOptions);
    }

    this.ensureApiKey(apiKey);

    try {
      const optionSummary = analysisOptions && Object.keys(analysisOptions).length > 0
        ? `\nOptions: ${JSON.stringify(analysisOptions)}`
        : '';

      const { latestResponse, threadId, assistantId: actualAssistantId } = await this.executeAssistantRun(apiKey, {
        message: `Analyze this PowerShell script (${filename}) with a ${requestType} report. Identify security risks, suggest improvements, and document its functionality.${optionSummary}`,
        attachments: [{ content, filename }]
      });

      const analysis = this.formatAnalysisResponse(latestResponse);

      return {
        analysis,
        threadId,
        assistantId: actualAssistantId,
        metadata: this.buildMetadata('analyze', { requestType })
      };
    } catch (error) {
      logger.error('Error analyzing script:', error);
      throw error;
    }
  }

  /**
   * Format the assistant's response into a structured analysis
   * @param {object} response - Assistant response message
   * @returns {object} Formatted analysis
   */
  formatAnalysisResponse(response) {
    if (!response || !response.content) {
      return {
        purpose: "Could not analyze script",
        securityScore: 0,
        codeQualityScore: 0,
        riskScore: 100,
        suggestions: ["Failed to analyze the script"],
        commandDetails: {},
        msDocsReferences: []
      };
    }
    
    // Extract the content parts
    const textContent = response.content
      .filter(part => part.type === 'text')
      .map(part => part.text.value)
      .join('\n');
    
    // Parse for security score (example: extract values from markdown headings or lists)
    const securityScoreMatch = textContent.match(/security score:?\s*(\d+)/i);
    const securityScore = securityScoreMatch ? parseInt(securityScoreMatch[1]) : 50;
    
    // Parse for code quality score
    const qualityScoreMatch = textContent.match(/quality score:?\s*(\d+)/i);
    const codeQualityScore = qualityScoreMatch ? parseInt(qualityScoreMatch[1]) : 50;
    
    // Parse for risk score
    const riskScoreMatch = textContent.match(/risk score:?\s*(\d+)/i);
    const riskScore = riskScoreMatch ? parseInt(riskScoreMatch[1]) : 50;
    
    // Extract purpose
    const purposeMatch = textContent.match(/purpose:?\s*([^\n]+)/i);
    const purpose = purposeMatch ? purposeMatch[1].trim() : "Script purpose not identified";
    
    // Extract suggestions (look for bullet points)
    const suggestionsRegex = /suggestions?:?\s*((?:\s*[-*]\s*[^\n]+\n?)+)/i;
    const suggestionsMatch = textContent.match(suggestionsRegex);
    const suggestionsText = suggestionsMatch ? suggestionsMatch[1] : "";
    const suggestions = suggestionsText
      .split(/\n/)
      .filter(line => line.match(/^\s*[-*]/))
      .map(line => line.replace(/^\s*[-*]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    // Extract command details
    const commandDetailsRegex = /command details:?\s*([\s\S]+?)(?=\n\s*#|$)/i;
    const commandDetailsMatch = textContent.match(commandDetailsRegex);
    const commandDetailsText = commandDetailsMatch ? commandDetailsMatch[1].trim() : "";
    
    // Extract MS Docs references
    const docsReferencesRegex = /documentation references:?\s*((?:\s*[-*]\s*\[?[^\n]+\]?\n?)+)/i;
    const docsReferencesMatch = textContent.match(docsReferencesRegex);
    const docsReferencesText = docsReferencesMatch ? docsReferencesMatch[1] : "";
    const msDocsReferences = docsReferencesText
      .split(/\n/)
      .filter(line => line.match(/[-*]/))
      .map(line => {
        const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return { title: linkMatch[1], url: linkMatch[2] };
        }
        return { title: line.replace(/^\s*[-*]\s*/, '').trim(), url: "" };
      })
      .filter(ref => ref.title.length > 0);
    
    return {
      purpose,
      securityScore,
      codeQualityScore,
      riskScore,
      suggestions: suggestions.length > 0 ? suggestions : ["No specific suggestions provided"],
      rawAnalysis: textContent,
      commandDetails: this.parseCommandDetails(commandDetailsText),
      msDocsReferences: msDocsReferences.length > 0 ? msDocsReferences : []
    };
  }

  /**
   * Parse command details from text into structured format
   * @param {string} text - Command details text
   * @returns {object} Structured command details
   */
  parseCommandDetails(text) {
    if (!text) {
      return {};
    }
    
    const commandDetails = {};
    const commandSections = text.split(/\n\s*##\s+/);
    
    for (const section of commandSections) {
      if (!section.trim()) continue;
      
      const lines = section.split('\n');
      const commandName = lines[0].replace(/^##\s+/, '').trim();
      
      if (commandName) {
        const details = {
          description: "",
          parameters: []
        };
        
        let currentParam = null;
        let inParamSection = false;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.match(/^parameters:?\s*$/i)) {
            inParamSection = true;
            continue;
          }
          
          if (inParamSection) {
            const paramMatch = line.match(/^[-*]\s+`([^`]+)`\s*:\s*(.+)/);
            if (paramMatch) {
              if (currentParam) {
                details.parameters.push(currentParam);
              }
              currentParam = {
                name: paramMatch[1],
                description: paramMatch[2]
              };
            } else if (currentParam && line) {
              currentParam.description += " " + line;
            }
          } else if (line) {
            details.description += (details.description ? "\n" : "") + line;
          }
        }
        
        if (currentParam) {
          details.parameters.push(currentParam);
        }
        
        commandDetails[commandName] = details;
      }
    }
    
    return commandDetails;
  }

  parseScriptFromText(text) {
    if (!text) {
      return { script: '', explanation: '' };
    }

    const codeBlock = text.match(/```(?:powershell|ps1|shell)?\n([\s\S]*?)```/i);
    if (codeBlock) {
      const script = codeBlock[1].trim();
      const explanation = text.replace(codeBlock[0], '').trim();
      return { script, explanation };
    }

    return { script: text.trim(), explanation: '' };
  }

  buildMockAnalysis(content, requestType) {
    const preview = (content || '').split('\n').slice(0, 5).join('\n');
    return {
      analysis: {
        purpose: 'Mock analysis response',
        securityScore: requestType === 'detailed' ? 92 : 80,
        codeQualityScore: requestType === 'detailed' ? 90 : 78,
        riskScore: requestType === 'detailed' ? 12 : 20,
        suggestions: [
          'Use parameter validation to harden the script inputs.',
          'Prefer Write-Verbose for operational logging over Write-Host.',
          'Document prerequisites at the top of the script.'
        ],
        rawAnalysis: preview || 'No script content provided.',
        commandDetails: {
          'Get-Content': {
            description: 'Reads files from disk',
            parameters: [
              { name: 'Path', description: 'Specifies the file path' }
            ]
          }
        },
        msDocsReferences: [
          { title: 'PowerShell Scripting Best Practices', url: 'https://learn.microsoft.com/powershell/scripting/learn/remoting' }
        ]
      },
      threadId: null,
      assistantId: 'mock-assistant',
      metadata: this.buildMetadata('analyze', { mock: true, requestType })
    };
  }

  buildMockAnswer(question, context) {
    return {
      response: `Mock response: ${question || 'No question provided.'}`,
      contextEcho: context || null,
      threadId: null,
      assistantId: 'mock-assistant',
      metadata: this.buildMetadata('ask', { mock: true })
    };
  }

  buildMockGeneratedScript(description) {
    return {
      script: `# Mock PowerShell script\nWrite-Output "${description || 'Hello from mock mode'}"`,
      explanation: 'Mock mode is enabled. Provide a valid OpenAI API key to generate real scripts.',
      threadId: null,
      assistantId: 'mock-assistant',
      metadata: this.buildMetadata('generate', { mock: true })
    };
  }

  buildMockExplanation(content, type) {
    return {
      explanation: `Mock explanation (${type}): The script appears to manipulate PowerShell content.`,
      originalLength: content ? content.length : 0,
      metadata: this.buildMetadata('explain', { mock: true, type })
    };
  }

  async buildMockExamples(description, limit) {
    const result = await this.handleSimilarScriptsSearch(description || '');
    const scripts = result?.scripts || [];
    return {
      scripts: scripts.slice(0, limit),
      metadata: this.buildMetadata('examples', { mock: true, limit })
    };
  }

  async answerQuestion(apiKey, { question, context, useAgent = true, assistantId = null }) {
    if (this.shouldUseMockResponses()) {
      return this.buildMockAnswer(question, context);
    }

    this.ensureApiKey(apiKey);

    const contextSection = context ? `\nContext:\n${context}` : '';
    const instructions = useAgent
      ? 'Think step-by-step and cross-check PowerShell references before responding.'
      : 'Return a concise answer.';

    const { latestResponse, threadId, assistantId: actualAssistantId } = await this.executeAssistantRun(apiKey, {
      message: `You are a senior PowerShell engineer. Answer the following question with actionable guidance.${contextSection}\n\nQuestion: ${question}`,
      assistantId,
      additionalInstructions: instructions
    });

    const response = this.extractTextFromResponse(latestResponse);

    return {
      response,
      threadId,
      assistantId: actualAssistantId,
      metadata: this.buildMetadata('ask', { useAgent })
    };
  }

  async generateScript(apiKey, description, assistantId = null) {
    if (this.shouldUseMockResponses()) {
      return this.buildMockGeneratedScript(description);
    }

    this.ensureApiKey(apiKey);

    const { latestResponse, threadId, assistantId: actualAssistantId } = await this.executeAssistantRun(apiKey, {
      message: `Generate a production-ready PowerShell script that ${description}. Include clear inline comments and a summary after the code.`,
      assistantId
    });

    const text = this.extractTextFromResponse(latestResponse);
    const parsed = this.parseScriptFromText(text);

    return {
      ...parsed,
      threadId,
      assistantId: actualAssistantId,
      metadata: this.buildMetadata('generate')
    };
  }

  async explainScript(apiKey, content, type = 'simple', assistantId = null) {
    if (this.shouldUseMockResponses()) {
      return this.buildMockExplanation(content, type);
    }

    this.ensureApiKey(apiKey);

    const detailLevel = type === 'detailed'
      ? 'Provide a deeply detailed explanation, include potential risks and remediation steps.'
      : 'Provide a concise explanation suitable for quick reviews.';

    const { latestResponse, threadId, assistantId: actualAssistantId } = await this.executeAssistantRun(apiKey, {
      message: `Explain the following PowerShell script. ${detailLevel}\n\n${content}`,
      assistantId
    });

    const explanation = this.extractTextFromResponse(latestResponse);

    return {
      explanation,
      threadId,
      assistantId: actualAssistantId,
      metadata: this.buildMetadata('explain', { type })
    };
  }

  async getSimilarExamples(description, limit = 5) {
    const cappedLimit = Math.max(1, Math.min(limit, 25));
    if (this.shouldUseMockResponses()) {
      return this.buildMockExamples(description, cappedLimit);
    }

    const result = await this.handleSimilarScriptsSearch(description || '');
    return {
      scripts: (result.scripts || []).slice(0, cappedLimit),
      metadata: this.buildMetadata('examples', { limit: cappedLimit })
    };
  }
}

// Create an instance of the AgentAssistant
const agentAssistant = new AgentAssistant();

const withRequestContext = (handler) => async (req, res) => {
  const requestId = createRequestId();
  const startedAt = Date.now();

  try {
    const result = (await handler(req, res, requestId)) || {};
    const metadata = {
      requestId,
      durationMs: Date.now() - startedAt,
      mode: agentAssistant.getMode(),
      version: SERVER_VERSION,
      ...(result.metadata || {})
    };

    res.json({
      ...result,
      metadata
    });
  } catch (error) {
    const statusCode = error.statusCode || error.status || 500;
    logger.error(`[${requestId}] ${error.message}`, error);
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred',
      requestId
    });
  }
};

const buildAnalyzeHandler = (req) => {
  const body = req.body || {};
  const {
    content,
    filename = 'script.ps1',
    assistant_id,
    assistantId,
    requestType = 'standard',
    analysisOptions = {}
  } = body;

  if (!content) {
    throw createHttpError(400, 'Script content is required');
  }

  const normalizedOptions = (analysisOptions && typeof analysisOptions === 'object' && !Array.isArray(analysisOptions))
    ? analysisOptions
    : {};

  const apiKey = resolveApiKeyFromRequest(req);
  return agentAssistant.analyzeScript(
    apiKey,
    content,
    filename,
    assistant_id || assistantId || null,
    requestType,
    normalizedOptions
  );
};

app.post('/api/ask', withRequestContext((req) => {
  const { question, context, useAgent = true, assistantId } = req.body || {};
  if (!question) {
    throw createHttpError(400, 'Question is required');
  }

  const apiKey = resolveApiKeyFromRequest(req);
  return agentAssistant.answerQuestion(apiKey, { question, context, useAgent, assistantId: assistantId || null });
}));

app.post('/api/analyze', withRequestContext((req) => buildAnalyzeHandler(req)));

app.post('/analyze/assistant', withRequestContext((req) => buildAnalyzeHandler(req)));

app.post('/api/generate', withRequestContext((req) => {
  const { description, assistantId } = req.body || {};
  if (!description) {
    throw createHttpError(400, 'Description is required');
  }

  const apiKey = resolveApiKeyFromRequest(req);
  return agentAssistant.generateScript(apiKey, description, assistantId || null);
}));

app.post('/api/explain', withRequestContext((req) => {
  const { content, type = 'simple', assistantId } = req.body || {};
  if (!content) {
    throw createHttpError(400, 'Script content is required');
  }

  const apiKey = resolveApiKeyFromRequest(req);
  return agentAssistant.explainScript(apiKey, content, type, assistantId || null);
}));

app.post('/api/examples', withRequestContext((req) => {
  const body = req.body || {};
  const description = body.description || req.query?.description;
  if (!description) {
    throw createHttpError(400, 'Description is required');
  }

  const limit = sanitizeLimit(body.limit || req.query?.limit || 5);
  return agentAssistant.getSimilarExamples(description, limit);
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: SERVER_VERSION,
    mode: agentAssistant.getMode(),
    uptimeMs: Date.now() - SERVICE_STARTED_AT,
    openAiConnected: agentAssistant.isConnected
  });
});

let serverInstance = null;
const startServer = () => {
  if (serverInstance) {
    return serverInstance;
  }
  serverInstance = app.listen(PORT, () => {
    logger.info(`AI Service running on port ${PORT} (mode=${agentAssistant.getMode()})`);
  });
  return serverInstance;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, agentAssistant };
