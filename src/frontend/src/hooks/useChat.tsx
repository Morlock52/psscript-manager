import { useState, useEffect, useCallback, useRef } from 'react';
// import { useAuth } from './useAuth'; // Removed
import { chatService } from '../services/api-simple';

// Define message type
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Define search result type
export interface SearchResult {
  id?: string;
  messages: Message[];
  score: number;
  date: string;
  timestamp?: string | Date;
}

interface UseChatOptions {
  initialMessages?: Message[];
  autoSave?: boolean;
  mockMode?: boolean;
}

/**
 * Custom hook for chat functionality
 * Handles message state, API communication, and error handling
 */
export const useChat = (options: UseChatOptions = {}) => {
  const { 
    initialMessages = [{ 
      role: 'assistant', 
      content: 'Welcome to PowerShell AI Assistant! I can help you with PowerShell scripting tasks. What would you like help with today?' 
    }],
    autoSave = true,
    mockMode = false
  } = options;

  // State for messages, loading, and search
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [useMockService, setUseMockService] = useState(mockMode);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  // Get auth from context - Removed
  // const { isAuthenticated, user } = useAuth(); // Removed
  const isAuthenticated = true; // Assume authenticated

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to localStorage and server if authenticated
  useEffect(() => {
    if (!autoSave) return;

    try {
      // Always save to localStorage
      localStorage.setItem('psscript_chat_history', JSON.stringify(messages));
    } catch (storageError) {
      console.error('Failed to save chat history to localStorage:', storageError);
      // If localStorage is full or unavailable, try to clear it and retry
      try {
        localStorage.removeItem('psscript_chat_history');
        localStorage.setItem('psscript_chat_history', JSON.stringify(messages.slice(-10))); // Save only last 10 messages
      } catch (retryError) {
        console.error('Failed to save even after clearing:', retryError);
      }
    }
    
    // If authenticated and chat has messages, also save to server
    const saveToServer = async () => {
      // Skip server save if using mock service // Removed !isAuthenticated check
      if (useMockService || messages.length <= 1) {
        return;
      }

      setIsSaving(true);
      try {
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Save operation timed out')), 5000)
        );
        
        // Race the save operation against the timeout
        await Promise.race([
          chatService.saveChatHistory(messages),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('Failed to save chat history to server:', error);
        
        // Switch to mock service if persistent network errors
        if (error instanceof Error && error.message.includes('Network')) {
          setUseMockService(true);
        }
      } finally {
        setIsSaving(false);
      }
    };
    
    // Use a debounce to prevent too many server calls
    const timeoutId = setTimeout(() => {
      saveToServer();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [messages, useMockService, autoSave]); // Removed isAuthenticated from dependency array

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('psscript_chat_history');
      if (saved) {
        try {
          const parsedHistory = JSON.parse(saved);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            setMessages(parsedHistory);
          }
        } catch (e) {
          console.error('Failed to parse saved chat:', e);
          // Clean up corrupted history
          localStorage.removeItem('psscript_chat_history');
        }
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when search is closed
  useEffect(() => {
    if (!showSearch) {
      inputRef.current?.focus();
    }
  }, [showSearch]);

  // Send a message to the AI
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    try {
      // Create a copy of the user message
      const userMessage = { role: 'user' as const, content: messageText, timestamp: new Date() };
      
      // Update state
      setInput('');
      setIsLoading(true);
      setMessages(prev => [...prev, userMessage]);
      
      // Simple fallback message in case API fails
      const fallbackResponse = { response: "I'm having trouble connecting to my backend. Please try again in a moment." };
      
      try {
        // Get the updated messages to send to the API
        const messagesToSend = [...messages, userMessage];
        
        // Call AI service with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 30000)
        );
        
        try {
          // Use the appropriate service based on the useMockService flag
          const response = await Promise.race([
            chatService.sendMessage(messagesToSend, "assistant", sessionId),
            timeoutPromise
          ]) as { response: string, session_id?: string };
          
          // Store session ID for future messages if provided
          if (response.session_id) {
            setSessionId(response.session_id);
          }
          
          // Add AI response
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: response.response, timestamp: new Date() }
          ]);
        } catch (apiError: any) {
          // Switch to mock service if we have persistent network issues
          if (apiError.message && apiError.message.includes('Network') && !useMockService) {
            setUseMockService(true);
            
            // Try again with mock service
            try {
              const mockResponse = await chatService.sendMessage(messagesToSend);
              setMessages(prev => [
                ...prev,
                { role: 'assistant', content: mockResponse.response, timestamp: new Date() }
              ]);
              return; // Exit early since we got a response
            } catch (mockError) {
              console.error('Mock service also failed:', mockError);
            }
          }
          
          // If we reached here, show an error message
          let errorMessage = "I'm having trouble connecting to my backend. Please try again in a moment.";
          
          if (apiError instanceof Error) {
            errorMessage = apiError.message || errorMessage;
          } else if (typeof apiError === 'string') {
            errorMessage = apiError;
          } else if (apiError && typeof apiError === 'object' && 'message' in apiError) {
            errorMessage = apiError.message || errorMessage;
          }
          
          // Add error message to chat
          setMessages(prev => [
            ...prev,
            { 
              role: 'assistant', 
              content: errorMessage,
              timestamp: new Date() 
            }
          ]);
        }
      } catch (error) {
        // Add generic error message to chat
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: "Something went wrong processing your request. Please try again.", 
            timestamp: new Date() 
          }
        ]);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, useMockService, sessionId]);

  // Clear chat history
  const clearChat = useCallback(() => {
    if (window.confirm('Clear chat history?')) {
      setMessages([
        { role: 'assistant', content: '# Chat history cleared.\n\nHow can I help you with PowerShell today?' }
      ]);

      // Also clear from server // Removed isAuthenticated check
      // if (isAuthenticated) {
        chatService.clearChatHistory().catch(error => {
          console.error('Failed to clear chat history from server:', error);
        });
      // }
    }
  }, []); // Removed isAuthenticated from dependency array

  // Read file as text
  const readFileAsText = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }, []);

  // Handle file upload and analysis
  const uploadFile = useCallback(async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Read file content
      let fileContent = '';
      
      try {
        fileContent = await readFileAsText(file);
        
        // Validate content is not binary or corrupted
        if (!fileContent || fileContent.includes('\u0000') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(fileContent)) {
          throw new Error('File appears to be binary or contains invalid characters');
        }
        
        // Limit size of very large files
        if (fileContent.length > 100000) {
          fileContent = fileContent.substring(0, 100000) + '\n\n... [Content truncated due to size] ...';
        }
      } catch (readError) {
        throw new Error('Could not read file contents');
      }
      
      // Create user message
      const userMessageContent = `I'm uploading a PowerShell script named "${file.name}" for analysis. Here's the content:\n\n\`\`\`powershell\n${fileContent}\n\`\`\`\n\nCan you analyze this script and provide feedback?`;
      
      // Send the message
      await sendMessage(userMessageContent);
    } catch (error) {
      console.error('Error uploading file:', error);
      // Add error messages to chat
      setMessages(prev => [
        ...prev,
        { role: 'user', content: `I was trying to upload a file named "${file.name}" but encountered an error.`, timestamp: new Date() },
        { role: 'assistant', content: 'Sorry, I encountered an error processing your file. Please try again or paste the script directly.', timestamp: new Date() }
      ]);
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [readFileAsText, sendMessage]);

  // Extract PowerShell code from message
  const extractPowerShellCode = useCallback((content: string): string => {
    // Look for PowerShell code blocks
    const regex = /```powershell\n([\s\S]*?)```/g;
    const matches = [...content.matchAll(regex)];
    
    if (matches.length > 0) {
      // Return the first match
      return matches[0][1];
    }
    
    // Try generic code blocks
    const genericRegex = /```([\s\S]*?)```/g;
    const genericMatches = [...content.matchAll(genericRegex)];
    
    if (genericMatches.length > 0) {
      return genericMatches[0][1];
    }
    
    return '';
  }, []);

  // Generate a script name based on content
  const generateScriptName = useCallback((content: string): string => {
    // Look for function name or comment header
    const functionMatch = content.match(/function\s+([A-Za-z0-9\-_]+)/);
    if (functionMatch && functionMatch[1]) {
      return `${functionMatch[1]}.ps1`;
    }
    
    // Look for first comment line that might describe the script
    const commentMatch = content.match(/^#\s*(.+)$/m);
    if (commentMatch && commentMatch[1]) {
      const commentWords = commentMatch[1].split(' ').slice(0, 3).join('-');
      return `${commentWords.toLowerCase().replace(/[^a-z0-9\-]/g, '')}.ps1`;
    }
    
    // Default name
    return 'new-script.ps1';
  }, []);

  // Search chat history
  const searchChatHistory = useCallback(async (query: string) => {
    // if (!query.trim() || !isAuthenticated) return; // Removed isAuthenticated check
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const results = await chatService.searchChatHistory(query);
      
      // Ensure the results are in the right format
      const formattedResults = Array.isArray(results) ? results.map(result => {
        return {
          id: result.id || String(Math.random()),
          messages: Array.isArray(result.messages) ? result.messages : [],
          score: typeof result.score === 'number' ? result.score : 1.0,
          date: result.date || new Date(result.timestamp || Date.now()).toLocaleDateString()
        };
      }) : [];
      
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching chat history:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []); // Removed isAuthenticated from dependency array

  // Load a chat history from search results
  const loadChatHistory = useCallback((historyMessages: Message[]) => {
    if (Array.isArray(historyMessages) && historyMessages.length > 0) {
      setMessages(historyMessages);
      setShowSearch(false);
    }
  }, []);

  return {
    // State
    messages,
    input,
    isLoading,
    isSaving,
    searchQuery,
    searchResults,
    isSearching,
    showSearch,
    selectedFile,
    isUploading,
    useMockService,
    sessionId,
    
    // Refs
    messagesEndRef,
    inputRef,
    fileInputRef,
    
    // Actions
    setInput,
    sendMessage,
    clearChat,
    uploadFile,
    setSelectedFile,
    extractPowerShellCode,
    generateScriptName,
    setShowSearch,
    setSearchQuery,
    searchChatHistory,
    loadChatHistory,
    setUseMockService,
    setSessionId
  };
};

export default useChat;
