import axios from 'axios';
import { secureStorage } from './secureStorage';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define message type to match the one in useChat.tsx
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Define search result type to match the one in useChat.tsx
interface SearchResult {
  id?: string;
  messages: Message[];
  score: number;
  date: string;
  timestamp?: string | Date;
}

// Mock PowerShell responses for common queries
const POWERSHELL_RESPONSES: Record<string, string> = {
  "hello": "Hello! I'm your PowerShell assistant. How can I help you today?",
  "help": "I can help you with PowerShell scripting tasks. You can ask me questions about PowerShell commands, syntax, best practices, or how to accomplish specific tasks.",
  "script": "PowerShell scripts are files with a .ps1 extension containing a series of PowerShell commands. They allow you to automate tasks and create reusable functionality. Would you like to know how to create or run a PowerShell script?",
  "command": "PowerShell has many useful cmdlets. Some common ones include:\n\n- Get-Content: Reads the content of a file\n- Set-Content: Writes content to a file\n- Get-Process: Gets information about running processes\n- Invoke-RestMethod: Makes HTTP requests\n\nIs there a specific command you'd like to learn about?",
  "default": "As a PowerShell assistant, I can help you with PowerShell scripting. For example, I can explain commands, help debug scripts, or suggest how to automate tasks."
};

// Mock chat history for search
const MOCK_CHAT_HISTORY: SearchResult[] = [
  {
    id: 'mock-1',
    messages: [
      { role: 'user', content: 'How do I list running processes in PowerShell?', timestamp: new Date('2025-03-01T12:00:00Z') },
      { role: 'assistant', content: 'You can use the `Get-Process` cmdlet to list running processes in PowerShell. Here\'s a basic example:\n\n```powershell\nGet-Process\n```\n\nYou can also filter the results:\n\n```powershell\nGet-Process -Name chrome\n```\n\nOr sort them by memory usage:\n\n```powershell\nGet-Process | Sort-Object -Property WorkingSet -Descending | Select-Object -First 10\n```', timestamp: new Date('2025-03-01T12:01:00Z') }
    ],
    score: 0.95,
    date: '2025-03-01',
    timestamp: '2025-03-01T12:01:00Z'
  },
  {
    id: 'mock-2',
    messages: [
      { role: 'user', content: 'How do I create a function in PowerShell?', timestamp: new Date('2025-03-02T14:30:00Z') },
      { role: 'assistant', content: 'In PowerShell, you can create functions using the `function` keyword. Here\'s a basic example:\n\n```powershell\nfunction Get-Greeting {\n    param(\n        [string]$Name = "World"\n    )\n    \n    return "Hello, $Name!"\n}\n\n# Call the function\nGet-Greeting\nGet-Greeting -Name "PowerShell"\n```', timestamp: new Date('2025-03-02T14:31:00Z') }
    ],
    score: 0.85,
    date: '2025-03-02',
    timestamp: '2025-03-02T14:31:00Z'
  }
];

// Find the best matching response based on input
const findBestResponse = (input: string): string => {
  // Convert input to lowercase for case-insensitive matching
  const lowerInput = input.toLowerCase();
  
  // Try to find an exact match first
  for (const [key, response] of Object.entries(POWERSHELL_RESPONSES)) {
    if (lowerInput.includes(key)) {
      return response;
    }
  }
  
  // Return default response for unmatched inputs
  return POWERSHELL_RESPONSES.default;
};

// Chat service
export const chatService = {
  // Send a chat message to the AI
  sendMessage: async (messages: Message[], agent_type?: string, session_id?: string) => {
    try {
      // First try the real API
      try {
        // Try to get API key from secure storage first, then localStorage
        let apiKey = "";
        try {
          apiKey = await secureStorage.getSecure('openai_api_key') || "";
        } catch (error) {
          console.warn('Failed to get API key from secure storage, trying localStorage');
          apiKey = localStorage.getItem('openai_api_key') || "";
        }
        
        // Log API key status for debugging (without revealing the key)
        console.log('API key status:', apiKey ? `Found (${apiKey.length} chars)` : 'Not found');
        
        if (apiKey && apiKey.length > 10) {  // Basic validation
          console.log("Attempting to use real AI service");
          // Get API URL from environment variable or use fallback
          const API_URL = import.meta.env.VITE_API_URL || 
            `http://${window.location.hostname}:4000/api`;
          
          console.log('api-simple.ts API URL is set to:', API_URL);
          
          const response = await axios.post(`${API_URL}/chat`, { 
            messages: messages,
            api_key: apiKey,
            agent_type: agent_type || "assistant", // Default to OpenAI Assistants API
            session_id: session_id // Pass session ID for persistent conversations
          }, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout for o3-mini which can be slower
          });
          return response.data;
        }
      } catch (error) {
        console.warn("Real AI service failed, using mock:", error);
      }
      
      // If real API fails or no API key, use mock
      console.log("Using mock response service");
      
      // Simulate network delay (1-2 seconds)
      await delay(1000 + Math.random() * 1000);
      
      // Get the last user message
      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (!lastUserMessage) {
        return { response: "I don't see a question. How can I help you?" };
      }
      
      // Generate a response based on the user's input
      const response = findBestResponse(lastUserMessage.content);
      
      return { response };
    } catch (error) {
      console.error('Error sending chat message:', error);
      return { 
        response: 'Sorry, I encountered an error. Please try again later.'
      };
    }
  },

  // Save chat history to server
  saveChatHistory: async (messages: Message[]) => {
    try {
      // In a real implementation, this would send the chat history to the server
      console.log("Mock: Saving chat history", messages.length, "messages");
      
      // Simulate network delay
      await delay(500 + Math.random() * 500);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving chat history:', error);
      throw new Error('Failed to save chat history');
    }
  },

  // Clear chat history from server
  clearChatHistory: async () => {
    try {
      // In a real implementation, this would clear the chat history from the server
      console.log("Mock: Clearing chat history");
      
      // Simulate network delay
      await delay(300 + Math.random() * 300);
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw new Error('Failed to clear chat history');
    }
  },

  // Search chat history
  searchChatHistory: async (query: string): Promise<SearchResult[]> => {
    try {
      // In a real implementation, this would search the chat history on the server
      console.log("Mock: Searching chat history for", query);
      
      // Simulate network delay
      await delay(800 + Math.random() * 800);
      
      // Simple mock implementation that returns predefined results
      // In a real implementation, this would filter based on the query
      return MOCK_CHAT_HISTORY;
    } catch (error) {
      console.error('Error searching chat history:', error);
      throw new Error('Failed to search chat history');
    }
  }
};

// Script data interface
interface ScriptData {
  name: string;
  content: string;
  description: string;
  isPublic: boolean;
}

// Simple script service
export const scriptService = {
  getScripts: async () => {
    return { scripts: [], total: 0 };
  },
  
  // Upload a script
  uploadScript: async (scriptData: ScriptData) => {
    try {
      // In a real implementation, this would upload the script to the server
      console.log("Mock: Uploading script", scriptData.name);
      
      // Simulate network delay
      await delay(1000 + Math.random() * 1000);
      
      return { 
        id: 'mock-script-' + Date.now(),
        name: scriptData.name,
        content: scriptData.content,
        description: scriptData.description,
        isPublic: scriptData.isPublic,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading script:', error);
      throw new Error('Failed to upload script');
    }
  }
};

// Simplified category service
export const categoryService = {
  getCategories: async () => {
    return { categories: [] };
  }
};

// Simplified tag service
export const tagService = {
  getTags: async () => {
    return { tags: [] };
  }
};
