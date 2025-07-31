import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../services/api';
import { useTheme } from '../hooks/useTheme';
// import { useAuth } from '../hooks/useAuth'; // Removed
import Layout from '../components/Layout';
import ReactMarkdown from 'react-markdown';

interface ChatSession {
  id: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }>;
  timestamp: string;
  category?: string;
}

const ChatHistory: React.FC = () => {
  const { theme } = useTheme();
  // const { isAuthenticated, user } = useAuth(); // Removed
  const navigate = useNavigate();

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  // Load chat history and categories
  useEffect(() => {
    // Removed isAuthenticated check and redirect

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get chat history
        const response = await chatService.getChatHistory();
        const sessions = response.history.map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp || Date.now()).toLocaleString(),
        }));
        setChatSessions(sessions);
        
        // Get categories
        const categoryList = await chatService.getChatCategories();
        setCategories(['all', 'uncategorized', ...categoryList]);
      } catch (error) {
        console.error('Error loading chat history data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]); // Removed isAuthenticated from dependency array

  // Filter chat sessions by category and search query
  const filteredSessions = chatSessions.filter(session => {
    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'uncategorized' && session.category) {
        return false;
      } else if (selectedCategory !== 'uncategorized' && session.category !== selectedCategory) {
        return false;
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const hasMatch = session.messages.some(msg => 
        msg.content.toLowerCase().includes(query)
      );
      return hasMatch;
    }
    
    return true;
  });
  
  // Set category for a chat session
  const setChatCategory = async (sessionId: string, category: string) => {
    try {
      await chatService.setChatCategory(sessionId, category);
      setChatSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, category } 
            : session
        )
      );
    } catch (error) {
      console.error('Error setting chat category:', error);
    }
  };
  
  // Delete chat session
  const deleteSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      try {
        // Check if the method exists
        if (typeof chatService.deleteChatSession === 'function') {
          await chatService.deleteChatSession(sessionId);
        } else {
          console.error('deleteChatSession method not available');
          throw new Error('Delete method not available');
        }
        
        // Update UI regardless of whether the deletion was successful
        setChatSessions(prev => prev.filter(session => session.id !== sessionId));
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      } catch (error) {
        console.error('Error deleting chat session:', error);
        alert('Failed to delete chat session. It will be removed from the view but may still exist on the server.');
        
        // Still update UI even if the API call failed
        setChatSessions(prev => prev.filter(session => session.id !== sessionId));
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      }
    }
  };
  
  // Continue chat from a previous session
  const continueChat = (session: ChatSession) => {
    try {
      // Make sure messages is valid
      if (session && Array.isArray(session.messages)) {
        localStorage.setItem('psscript_chat_history', JSON.stringify(session.messages));
        try {
          navigate('/chat');
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback to regular navigation
          window.location.href = '/chat';
        }
      } else {
        throw new Error('Invalid session data');
      }
    } catch (error) {
      console.error('Error continuing chat:', error);
      alert('Could not continue this chat. Starting a new chat...');
      try {
        localStorage.removeItem('psscript_chat_history');
        navigate('/chat');
      } catch (e) {
        window.location.href = '/chat';
      }
    }
  };
  
  return (
    <Layout>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className="container mx-auto py-6 px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Chat History</h1>
            <button
              onClick={() => navigate('/chat')}
              className={`px-4 py-2 rounded font-medium ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              New Chat
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar with filters and list */}
            <div className={`lg:col-span-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
              {/* Search and filters */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chat history..."
                  className={`w-full p-2 rounded ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-100 border-gray-300'
                  } border focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3`}
                />
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 text-sm rounded-full ${
                        selectedCategory === category
                          ? theme === 'dark' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-500 text-white'
                          : theme === 'dark'
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chat sessions list */}
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {isLoading ? (
                  <div className="py-10 text-center">
                    <div className="inline-block">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300"></div>
                      </div>
                    </div>
                  </div>
                ) : filteredSessions.length > 0 ? (
                  filteredSessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`p-3 mb-2 rounded cursor-pointer ${
                        selectedSession?.id === session.id
                          ? theme === 'dark' 
                            ? 'bg-blue-800 border-blue-700' 
                            : 'bg-blue-100 border-blue-200'
                          : theme === 'dark'
                            ? 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                            : 'bg-white hover:bg-gray-100 border-gray-200'
                      } border`}
                    >
                      <div className="flex justify-between">
                        <span className="text-xs opacity-70">{session.timestamp}</span>
                        {session.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {session.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm truncate">
                        {session.messages[0]?.content.substring(0, 100) || 'No content'}...
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500">
                    No chat sessions found
                  </div>
                )}
              </div>
            </div>
            
            {/* Chat session detail view */}
            <div className={`lg:col-span-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow`}>
              {selectedSession ? (
                <div className="h-full flex flex-col">
                  {/* Session header */}
                  <div className={`p-4 flex justify-between items-center border-b ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div>
                      <span className="text-sm opacity-70">Session: {selectedSession.timestamp}</span>
                      <div className="flex gap-2 mt-2">
                        <select
                          value={selectedSession.category || ''}
                          onChange={(e) => setChatCategory(selectedSession.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                          } border focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        >
                          <option value="">Uncategorized</option>
                          {categories.filter(c => c !== 'all' && c !== 'uncategorized').map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => continueChat(selectedSession)}
                        className={`px-3 py-1 text-sm rounded ${
                          theme === 'dark'
                            ? 'bg-green-700 hover:bg-green-600 text-white'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                      >
                        Continue Chat
                      </button>
                      <button
                        onClick={() => deleteSession(selectedSession.id)}
                        className={`px-3 py-1 text-sm rounded ${
                          theme === 'dark'
                            ? 'bg-red-700 hover:bg-red-600 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Session content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedSession.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`mb-4 ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}
                      >
                        <div
                          className={`p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : theme === 'dark'
                                ? 'bg-gray-700 border border-gray-600'
                                : 'bg-gray-100 shadow'
                          }`}
                        >
                          <ReactMarkdown className="prose prose-sm max-w-none">
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-10 text-center text-gray-500">
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mx-auto mb-4 opacity-20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Chat Session Selected</h3>
                    <p>Select a chat session from the list to view its contents</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatHistory;
