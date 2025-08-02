// @ts-nocheck - Required for flexible API client configuration
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

// API base URL from environment variable or default
// Define the type for import.meta to include env
interface ImportMeta {
  env: {
    VITE_API_URL?: string;
    [key: string]: any;
  };
}

// Function to determine the correct API URL based on environment
const getApiUrl = (): string => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, use localhost
  if (import.meta.env.DEV || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
    return 'http://localhost:4005/api';
  }
  
  // In production, use relative URL to work with any domain
  return '/api';
};

const API_URL = getApiUrl();

// Log API URL only in development
if (import.meta.env.DEV) {
  console.log('Using API URL:', API_URL);
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with requests
  timeout: 30000, // 30 second timeout
});

// Export apiClient for use in other modules
export { apiClient };

// Also export apiClient as default for backward compatibility
export default apiClient;

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // For file uploads, we should ensure we're not setting both multipart/form-data 
    // and Authorization headers, as this can cause issues with CORS preflight checks
    const isFileUpload = 
      config.url?.includes('/upload') && 
      config.headers['Content-Type'] === 'multipart/form-data';
    
    // Note: OpenAI API key is now sent in request body to avoid CORS issues
    // Previously was sent as x-openai-api-key header for analyze endpoints
    
    // Log requests in development
    if (isDevelopment) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, 
        isFileUpload ? '[File Upload]' : '');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 specifically - could trigger logout context if needed, but avoid refresh logic
    if (error.response?.status === 401) {
      console.error("Authentication error (401):", error.response.data || error.message);
      // Optionally trigger a global logout state update here if using context/redux
      // Example: authContext.triggerLogout();
      // Avoid hard redirect (window.location.href = "/login"); let routing handle it
    }
    // Handle network errors
    if (!error.response) {
      console.error("Network Error:", (error as any).message);
      return Promise.reject({
        message: "Network error. Please check your connection.",
        originalError: error,
      });
    }
    
    // Return specific error from API when available with type safety
    const errorMessage = error.response?.data?.message || (error as any).message || 'Unknown error';
    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      originalError: error,
    });
  }
);

// Real API service
const scriptService = {
  getScripts: async (params = {}) => {
    try {
      const response = await apiClient.get("/scripts", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching scripts:", error);
      return { scripts: [], total: 0 };
    }
  },
  
  getScript: async (id: string) => {
    try {
      const response = await apiClient.get(`/scripts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching script ${id}:`, error);
      throw error;
    }
  },
  
  uploadScript: async (scriptData: any, isLargeFile: boolean = false) => {
    try {
      // Check if we're dealing with FormData or JSON
       const isFormData = scriptData instanceof FormData;
      
      // Set the correct headers based on data type
      const config: AxiosRequestConfig = {
        headers: isFormData ? {
          'Content-Type': 'multipart/form-data'
        } : {
          'Content-Type': 'application/json'
        },
        // Increase timeout for large files
        timeout: isLargeFile ? 60000 : 30000, // 60 seconds for large files
        // Ensure we don't get CORS errors due to auth headers in preflight
        withCredentials: false
      };
      
      // Debug log
      console.log('[UPLOAD DEBUG] Starting upload:', 
        isFormData ? 'as FormData' : 'as JSON', 
        isLargeFile ? '(large file)' : '', 
        'to API URL:', API_URL);
      
      // Choose the appropriate endpoint based on file size and type
      const endpoint = isFormData
        ? isLargeFile
          ? "/scripts/upload/async" // Use async endpoint for large files
          : "/scripts/upload"
        : "/scripts";

      // Use a single approach for upload with improved error handling
       console.log('[UPLOAD DEBUG] Attempting upload to endpoint:', endpoint);
        
       // Set up a more robust upload configuration
       const uploadConfig = {
         ...config,
         // Increase timeout for all uploads
         timeout: isLargeFile ? 180000 : 120000, // 3 minutes for large files, 2 minutes for regular
         // Ensure proper CORS handling
         withCredentials: true,
         // Set max content length (same as server settings)
         maxContentLength: isLargeFile ? 20 * 1024 * 1024 : 10 * 1024 * 1024, // 20MB or 10MB
         maxBodyLength: isLargeFile ? 20 * 1024 * 1024 : 10 * 1024 * 1024, // 20MB or 10MB
         headers: config.headers
       }; // Close uploadConfig object here
       console.log('[UPLOAD DEBUG] Upload config:', {
         timeout: uploadConfig.timeout,
         withCredentials: uploadConfig.withCredentials,
         hasAuthHeader: !!uploadConfig.headers.Authorization
       });
        
       // Use the main apiClient with our custom config
       const response = await apiClient.post(endpoint, scriptData, uploadConfig).catch(err => {
         console.log('[UPLOAD DEBUG] Upload error details:', {
           message: err.message,
           code: err.code,
           status: err.response?.status,
           statusText: err.response?.statusText,
           responseData: err.response?.data
         });
         throw err;
       });
        
       console.log('[UPLOAD DEBUG] Upload successful');
        
       // Force a refresh of the scripts cache
       try {
         await apiClient.get("/scripts/clear-cache");
       } catch (cacheError) {
         console.warn("Failed to clear scripts cache:", cacheError);
       }
        
       return response.data;
       
     } catch (error) {
      const err = error as AxiosError;
      console.error("[UPLOAD DEBUG] Final error uploading script:", err);
      
      // Enhanced error handling with more detailed messages
      if (err.code === 'ECONNABORTED') {
        console.error('[UPLOAD DEBUG] Timeout Error Details:', JSON.stringify({
          code: err.code,
          message: err.message,
          config: {
            timeout: err.config?.timeout,
            url: err.config?.url,
            method: err.config?.method
          }
        }, null, 2));
        throw new Error('The upload request timed out. Please check your connection and try again with a smaller file or better connection.');
      }
      
      if (err.message && (
          err.message.includes('Network Error') || 
          err.message.includes('network') ||
          err.message.includes('connection') ||
          err.message.includes('socket')
      )) {
        console.error('[UPLOAD DEBUG] Network Error Details:', JSON.stringify({
          code: err.code,
          message: err.message,
          name: err.name
        }, null, 2));
        throw new Error('Network error detected. This could be due to server unavailability or connection problems. Please check your internet connection and try again.');
      }
      
      if (err.code === 'CORS_ERROR' || 
          (err.message && err.message.includes('CORS')) ||
          (err.message && err.message.includes('cross-origin'))
      ) {
        console.error('[UPLOAD DEBUG] CORS Error Details:', JSON.stringify({
          code: err.code,
          message: err.message,
          headers: err.config?.headers
        }, null, 2));
        throw new Error('Cross-Origin Resource Sharing (CORS) error. Please try again or contact support if the issue persists.');
      }
      
      // Handle axios errors with response
      if (err.response) {
        const { status, data } = err.response;
        
        // Type assertion for data
        const responseData = data as any;
        
        if (status === 400 && responseData.error === 'file_read_error') {
          throw new Error('Could not read the uploaded file. Please try again with a different file.');
        }
        
        if (status === 400 && responseData.error === 'invalid_content') {
          throw new Error('The file does not appear to be a valid PowerShell script. Please check the file contents.');
        }
        
        if (status === 400 && responseData.error === 'unsupported_file_type') {
          throw new Error('Unsupported file type. Please upload a PowerShell script (.ps1 file).');
        }
        
        if (status === 400 && responseData.error === 'too_many_tags') {
          throw new Error('A maximum of 10 tags is allowed. Please reduce the number of tags.');
        }
        
        if (status === 413) {
          throw new Error('The file is too large. Maximum file size is 10MB.');
        }
        
        if (status === 409) {
          // Handle duplicate script error
          const duplicateError: any = new Error(responseData.message || 'This script content has already been uploaded.');
          duplicateError.status = 409;
          duplicateError.isDuplicate = true;
          duplicateError.existingScriptId = responseData.existingScriptId;
          duplicateError.existingScriptTitle = responseData.existingScriptTitle;
          duplicateError.suggestion = responseData.suggestion;
          throw duplicateError;
        }
        
        if (status === 429) {
          throw new Error('Too many upload attempts. Please wait a moment and try again.');
        }
        
        if (status >= 500) {
          throw new Error('Server error. The upload service is currently unavailable. Please try again later.');
        }
        
        if (responseData && responseData.message) {
          throw new Error(responseData.message);
        }
      }
      
      // Handle request errors (no response received)
      if ((error as any).request) {
        throw new Error('No response received from the server. Please check your connection and try again.');
      }
      
      // Default error message - preserve the original error if it has custom properties
      if ((error as any).isDuplicate || (error as any).status === 409) {
        throw error;
      }
      
      throw (error as any).message 
        ? new Error((error as any).message) 
        : new Error('An error occurred while uploading the script');
    }
  },
  
  updateScript: async (id: string, scriptData: any) => {
    try {
      const response = await apiClient.put(`/scripts/${id}`, scriptData);
      return response.data;
    } catch (error) {
      console.error(`Error updating script ${id}:`, error);
      throw error;
    }
  },
  
  deleteScript: async (id: string) => {
    try {
      const response = await apiClient.delete(`/scripts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting script ${id}:`, error);
      
      // Provide more specific error messages
      if ((error as any).status === 404) {
        throw new Error('Script not found. It may have been already deleted.');
      }
      
      if ((error as any).status === 403) {
        throw new Error('You do not have permission to delete this script.');
      }
      
      // Return a structured error object
      throw {
        message: (error as any).message || 'Failed to delete script',
        status: (error as any).status || 500,
        success: false
      };
    }
  },
  
  getScriptAnalysis: async (id: string) => {
    try {
      const response = await apiClient.get(`/scripts/${id}/analysis`);
      return response.data;
    } catch (error: any) {
      // Don't log 404 errors - analysis not found is expected for some scripts
      // Check both the transformed error and original error formats
      const status = error.status || error.response?.status;
      if (status === 404) {
        // Return null for missing analysis instead of throwing
        return null;
      }
      console.error(`Error fetching analysis for script ${id}:`, error);
      throw error;
    }
  },
  
  executeScript: async (id: string, params = {}) => {
    try {
      const response = await apiClient.post(`/scripts/${id}/execute`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error executing script ${id}:`, error);
      throw error;
    }
  },
  
  getSimilarScripts: async (id: string) => {
    try {
      const response = await apiClient.get(`/scripts/${id}/similar`);
      return response.data;
    } catch (error: any) {
      // Only log unexpected errors - 500 errors for missing embeddings are expected
      const status = error.status || error.response?.status;
      const message = error.message || error.response?.data?.message || '';
      const stack = error.originalError?.response?.data?.stack || error.response?.data?.stack || '';
      
      if (status === 500 && (message.includes('no embedding') || stack.includes('no embedding'))) {
        // Expected error - script has no embeddings for similarity search
        return { similar_scripts: [] };
      }
      console.error(`Error fetching similar scripts for ${id}:`, error);
      return { similar_scripts: [] };
    }
  },
  
  searchScripts: async (query: string, filters = {}) => {
    try {
      const params = { q: query, ...filters };
      const response = await apiClient.get("/scripts/search", { params });
      return response.data;
    } catch (error) {
      console.error("Error searching scripts:", error);
      return { scripts: [], total: 0 };
    }
  },
  
  analyzeScript: async (content: string) => {
    try {
      // Include API key in request body instead of header to avoid CORS issues
      const openAIKey = localStorage.getItem('openai_api_key');
      const response = await apiClient.post("/scripts/analyze", { 
        content,
        apiKey: openAIKey 
      });
      return response.data;
    } catch (error) {
      console.error("Error analyzing script:", error);
      throw error;
    }
  },
  
  analyzeScriptAndSave: async (id: string) => {
    try {
      const response = await apiClient.post(`/scripts/${id}/analyze`);
      return response.data;
    } catch (error) {
      console.error("Error analyzing and saving script:", error);
      throw error;
    }
  },
  
  getScriptVersions: async (id: string) => {
    try {
      const response = await apiClient.get(`/scripts/${id}/versions`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching versions for script ${id}:`, error);
      return { versions: [] };
    }
  },

  bulkUpdateScripts: async (data: { ids: string[], isPublic: boolean }) => {
    try {
      const response = await apiClient.post("/scripts/bulk-update", data);
      return response.data;
    } catch (error) {
      console.error("Error bulk updating scripts:", error);
      throw error;
    }
  },
  
  bulkDeleteScripts: async (ids: string[]) => {
    try {
      const response = await apiClient.post("/scripts/delete", { ids });
      return response.data;
    } catch (error) {
      console.error("Error bulk deleting scripts:", error);
      throw error;
    }
  },

  deleteScripts: async (ids: string[]) => {
    try {
      const response = await apiClient.post("/scripts/delete", { ids });
      return response.data;
    } catch (error) {
      console.error("Error deleting scripts:", error);
      throw error;
    }
  },
  
  applyAiSuggestions: async (scriptId: string, suggestions: string[]) => {
    try {
      const response = await apiClient.post(`/scripts/${scriptId}/apply-suggestions`, { suggestions });
      return response.data;
    } catch (error) {
      console.error("Error applying AI suggestions:", error);
      throw error;
    }
  },
  
  checkAsyncUploadStatus: async (uploadId: string) => {
    try {
      const response = await apiClient.get(`/scripts/upload/status/${uploadId}`);
      return response.data;
    } catch (error) {
      console.error(`Error checking async upload status for ${uploadId}:`, error);
      throw error;
    }
  }
};

// Category service
export const categoryService = {
  // Get all categories
  getCategories: async () => {
    try {
      const response = await apiClient.get("/categories");
      return response.data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return { categories: [] };
    }
  }
};

// Tag service
export const tagService = {
  // Get all tags
  getTags: async () => {
    try {
      const response = await apiClient.get("/tags");
      return response.data;
    } catch (error) {
      console.error("Error fetching tags:", error);
      return { tags: [] };
    }
  },
  
  // Create a new tag
  createTag: async (name: string) => {
    try {
      const response = await apiClient.post("/tags", { name });
      return response.data;
    } catch (error) {
      console.error("Error creating tag:", error);
      throw error;
    }
  }
};

// Analytics service
export const analyticsService = {
  // Get usage statistics
  getUsageStats: async () => {
    try {
      const response = await apiClient.get("/analytics/usage");
      return response.data;
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      return {
        totalScripts: 0,
        executionsToday: 0,
        userScripts: 0,
        averageQuality: 0,
        executionsLastWeek: 0,
        activeUsers: 0,
        totalExecutions: 0,
        recentActivity: []
      };
    }
  },
  
  // Get security metrics
  getSecurityMetrics: async () => {
    try {
      // Check if the endpoint exists by making a request
      const response = await apiClient.get("/analytics/security");
      return response.data;
    } catch (error) {
      // If we get a 404, the endpoint doesn't exist yet - use mock data instead of showing errors
      if (error.response && error.response.status === 404) {
        console.log("Security metrics endpoint not implemented yet, using mock data");
        // Return mock data that matches the expected structure
        return {
          highSecurityCount: 5,
          highSecurityPercentage: 75,
          mediumSecurityCount: 3,
          mediumSecurityPercentage: 15,
          lowSecurityCount: 2,
          lowSecurityPercentage: 10,
          totalScripts: 10,
          commonIssues: [
            { name: 'Hardcoded credentials', count: 2 },
            { name: 'Insecure function calls', count: 1 },
            { name: 'Missing error handling', count: 3 }
          ]
        };
      } else {
        // For other errors, log them but don't display in UI
        console.error("Error fetching security metrics:", error);
        return {
          highSecurityCount: 0,
          highSecurityPercentage: 0,
          mediumSecurityCount: 0,
          mediumSecurityPercentage: 0,
          lowSecurityCount: 0,
          lowSecurityPercentage: 0,
          totalScripts: 0,
          commonIssues: []
        };
      }
    }
  },
  
  // Get category distribution
  getCategoryDistribution: async () => {
    try {
      const response = await apiClient.get("/analytics/categories");
      return response.data;
    } catch (error) {
      console.error("Error fetching category distribution:", error);
      return {
        categories: []
      };
    }
  }
};

// Define types for chat
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ChatResponse {
  response: string;
}

// AI service URL
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://ai-service:8000";

// Chat service
export const chatService = {
  // Send a chat message to the AI
  sendMessage: async (messages: ChatMessage[]): Promise<ChatResponse> => {
    try {

      // Define mock mode variable
      const useMockMode = localStorage.getItem('psscript_mock_mode') === 'true' || 
                          import.meta.env.DEV;
      
      // Log if we're in mock mode
      if (useMockMode) {
        console.log("Using mock mode for chat service");
      }
      
      console.log(`Sending chat request to ${AI_SERVICE_URL}/chat with ${messages.length} messages`);
      
      // Try using the backend endpoint first
      try {
        const response = await apiClient.post("/chat", { 
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }, {
          timeout: 30000 // 30 second timeout
        });
        
        return response.data;
      } catch (backendError) {
        console.warn("Backend chat service failed, trying direct AI service:", backendError);
        
        // Get API key from localStorage for fallback
        const apiKey = localStorage.getItem('openai_api_key') || '';
        
        // Fall back to direct AI service if backend fails
        const response = await axios.post(`${AI_SERVICE_URL}/chat`, { 
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          api_key: apiKey // Pass the API key in the request body
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        });
        
        return response.data;
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      
      // Return more specific error messages based on error type
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Network error
          throw new Error("Network error. Please check your connection and try again.");
        } else if (error.response.status === 429) {
          // Rate limiting
          throw new Error("You've sent too many messages. Please wait a moment and try again.");
        } else if (error.response.status >= 500) {
          // Server error
          throw new Error("The AI service is currently unavailable. Please try again later.");
        } else if (error.response.status === 401) {
          // Authentication error
          throw new Error("Authentication failed. Please check your API key in settings.");
        }
      }
      
      // Mock response for development or when mock mode is enabled
      const useMockMode = localStorage.getItem('psscript_mock_mode') === 'true' || 
                          import.meta.env.DEV;
      
      if (useMockMode) {
        console.log("Returning mock response in mock/development mode");
        
        // Generate a more helpful mock response based on the last user message
        const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
        
        // Match certain keywords to give more contextual responses
        if (lastUserMessage.toLowerCase().includes('powershell')) {
          return {
            response: "PowerShell is a cross-platform task automation solution made up of a command-line shell, a scripting language, and a configuration management framework. PowerShell runs on Windows, Linux, and macOS."
          };
        } else if (lastUserMessage.toLowerCase().includes('script')) {
          return {
            response: "Scripts are a great way to automate repetitive tasks. In PowerShell, scripts are stored in .ps1 files and can be executed directly from the PowerShell console or scheduled to run at specific times."
          };
        } else if (lastUserMessage.toLowerCase().includes('error') || lastUserMessage.toLowerCase().includes('help')) {
          return {
            response: "I'm sorry you're experiencing an issue. When troubleshooting PowerShell scripts, it's helpful to use Write-Debug statements, try/catch blocks for error handling, and ensuring you have the right execution policy set with 'Set-ExecutionPolicy'."
          };
        }
        
        // Default mock response
        return {
          response: "This is a mock response since the AI service is in mock mode. Your message contained: \"" + lastUserMessage.substring(0, 50) + (lastUserMessage.length > 50 ? '...' : '') + "\""
        };
      }
      
      // Generic error
      throw new Error("Sorry, I encountered an error processing your request. Please try again.");
    }
  },
  
  // Get chat history for current user
  getChatHistory: async (): Promise<{ history: ChatMessage[] }> => {
    try {
      const response = await apiClient.get("/chat/history");
      return response.data;
    } catch (error) {
      console.error("Error fetching chat history:", error);
      return { history: [] };
    }
  },
  
  // Save chat history to server
  saveChatHistory: async (messages: ChatMessage[]): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post("/chat/history", { messages });
      return response.data;
    } catch (error) {
      console.error("Error saving chat history:", error);
      return { success: false };
    }
  },
  
  // Clear chat history from server
  clearChatHistory: async (): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.delete("/chat/history");
      return response.data;
    } catch (error) {
      console.error("Error clearing chat history:", error);
      return { success: false };
    }
  },
  
  // Search chat history with semantic search
  searchChatHistory: async (query: string): Promise<any[]> => {
    try {
      const response = await apiClient.get("/chat/search", { params: { q: query } });
      
      // Handle different potential response formats
      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results.map((result: any) => ({
          id: result.id || String(Math.random()),
          messages: Array.isArray(result.messages) ? result.messages : [],
          score: typeof result.score === 'number' ? result.score : 1.0,
          date: result.date || new Date(result.timestamp || Date.now()).toLocaleDateString(),
          timestamp: result.timestamp || Date.now()
        }));
      } else if (response.data && Array.isArray(response.data)) {
        return response.data.map((result: any) => ({
          id: result.id || String(Math.random()),
          messages: Array.isArray(result.messages) ? result.messages : [],
          score: typeof result.score === 'number' ? result.score : 1.0,
          date: result.date || new Date(result.timestamp || Date.now()).toLocaleDateString(),
          timestamp: result.timestamp || Date.now()
        }));
      }
      
      // Fallback to empty array if no valid data
      return [];
    } catch (error) {
      console.error("Error searching chat history:", error);
      return [];
    }
  },
  
  // Get chat categories for organizing history
  getChatCategories: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get("/chat/categories");
      return response.data.categories || [];
    } catch (error) {
      console.error("Error fetching chat categories:", error);
      return [];
    }
  },
  
  // Set category for a chat session
  setChatCategory: async (chatId: string, category: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post(`/chat/${chatId}/category`, { category });
      return response.data;
    } catch (error) {
      console.error("Error setting chat category:", error);
      return { success: false };
    }
  },
  
  // Delete a specific chat session
  deleteChatSession: async (chatId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.delete(`/chat/history/${chatId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting chat session:", error);
      return { success: false };
    }
  }
};

// Export script service
export { scriptService };
