import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from '../constants/routes';

/**
 * Search result interface
 */
interface SearchResult {
  id: string;
  title: string;
  description: string;
  route: string;
  category: 'page' | 'script' | 'documentation' | 'setting';
  icon: React.ReactNode;
}

/**
 * Global search component props
 */
interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Global search component with enhanced functionality
 * Provides quick access to pages, scripts, and documentation
 */
const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Mock search data - in real app, this would come from API
  const searchableItems: SearchResult[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Main overview and statistics',
      route: ROUTES.DASHBOARD,
      category: 'page',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'scripts',
      title: 'Script Management',
      description: 'Manage your PowerShell scripts',
      route: ROUTES.SCRIPTS,
      category: 'page',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'editor',
      title: 'Script Editor',
      description: 'Create and edit PowerShell scripts',
      route: ROUTES.EDITOR,
      category: 'page',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      id: 'ai-chat',
      title: 'AI Assistant',
      description: 'Chat with AI for PowerShell help',
      route: ROUTES.AI_CHAT,
      category: 'page',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
    {
      id: 'documentation',
      title: 'Documentation',
      description: 'Browse help and documentation',
      route: ROUTES.DOCUMENTATION,
      category: 'documentation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure application settings',
      route: ROUTES.SETTINGS,
      category: 'setting',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  /**
   * Filter results based on query
   */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const filtered = searchableItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  /**
   * Focus input when opened
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  /**
   * Handle result selection
   */
  const handleSelectResult = (result: SearchResult) => {
    navigate(result.route);
    onClose();
    setQuery('');
  };

  /**
   * Get category color
   */
  const getCategoryColor = (category: SearchResult['category']) => {
    const colors = {
      page: theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
      script: theme === 'dark' ? 'text-green-400' : 'text-green-600',
      documentation: theme === 'dark' ? 'text-purple-400' : 'text-purple-600',
      setting: theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
    };
    return colors[category];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Search Modal */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className={`max-w-2xl mx-auto mt-20 rounded-lg shadow-xl ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg 
                className={`absolute left-3 top-3 w-5 h-5 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, scripts, documentation..."
                className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                aria-label="Search application"
              />
            </div>
          </div>

          {/* Search Results */}
          {results.length > 0 && (
            <div 
              ref={resultsRef}
              className="max-h-96 overflow-y-auto"
              role="listbox"
              aria-label="Search results"
            >
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                    index === selectedIndex
                      ? theme === 'dark'
                        ? 'bg-gray-700'
                        : 'bg-gray-50'
                      : ''
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex items-center">
                    <div className={`mr-3 ${getCategoryColor(result.category)}`}>
                      {result.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {result.title}
                      </div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {result.description}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded capitalize ${
                      theme === 'dark'
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {result.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query && results.length === 0 && (
            <div className="p-8 text-center">
              <svg 
                className={`w-12 h-12 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className={`text-lg font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                No results found
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
              }`}>
                Try searching for pages, scripts, or documentation
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className={`p-3 text-xs border-t ${
            theme === 'dark'
              ? 'border-gray-700 text-gray-500 bg-gray-750'
              : 'border-gray-200 text-gray-600 bg-gray-50'
          }`}>
            <span className="mr-4">↑↓ Navigate</span>
            <span className="mr-4">↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalSearch;