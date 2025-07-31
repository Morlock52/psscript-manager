import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import documentationApi, { DocItem } from '../services/documentationApi';

// Mock data for demonstration purposes
const mockRecentDocs: DocItem[] = [
  {
    id: '1',
    title: 'Working with PowerShell Modules',
    url: 'https://learn.microsoft.com/en-us/powershell/scripting/developer/module/understanding-a-windows-powershell-module',
    content: 'A PowerShell module is a package that contains PowerShell commands, such as cmdlets, providers, functions, workflows, variables, and aliases...',
    source: 'Microsoft Learn',
    crawledAt: '2025-03-08T14:30:00Z',
    tags: ['modules', 'packages', 'basics']
  },
  {
    id: '2',
    title: 'Error Handling Best Practices',
    url: 'https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-exceptions',
    content: 'PowerShell has several ways to handle errors and exceptions. This article covers the different approaches and when to use each one...',
    source: 'Microsoft Learn',
    crawledAt: '2025-03-08T15:45:00Z',
    tags: ['error-handling', 'exceptions', 'best-practices']
  },
  {
    id: '3',
    title: 'Advanced Function Parameters',
    url: 'https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-parameter-binding',
    content: 'Parameter binding is how PowerShell maps command line parameters to the parameters in a function or cmdlet definition...',
    source: 'Microsoft Learn',
    crawledAt: '2025-03-08T16:20:00Z',
    tags: ['functions', 'parameters', 'advanced']
  }
];

// Mock search results
const mockSearchResults: DocItem[] = [
  {
    id: '4',
    title: 'Get-Process | Sort-Object -Property WS -Descending | Select-Object -First 5',
    url: 'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process',
    content: 'This PowerShell command gets all running processes, sorts them by working set (memory usage) in descending order, and selects the top 5 processes using the most memory.',
    similarity: 0.92,
    source: 'Microsoft Learn',
    crawledAt: '2025-03-07T10:15:00Z',
    tags: ['processes', 'memory', 'sorting']
  },
  {
    id: '5',
    title: 'Get-Process | Where-Object {$_.WorkingSet -gt 50MB} | Sort-Object -Property WorkingSet -Descending',
    url: 'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object',
    content: 'This PowerShell command gets all processes with a working set (memory usage) greater than 50MB and sorts them by working set in descending order.',
    similarity: 0.87,
    source: 'Microsoft Learn',
    crawledAt: '2025-03-07T11:30:00Z',
    tags: ['processes', 'filtering', 'memory']
  },
  {
    id: '6',
    title: 'Get-Process | Sort-Object CPU -Descending | Format-Table -Property ID,ProcessName,CPU,WS -AutoSize',
    url: 'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/format-table',
    content: 'This PowerShell command gets all processes, sorts them by CPU usage in descending order, and formats the output as a table showing ID, process name, CPU usage, and working set (memory usage).',
    similarity: 0.81,
    source: 'Microsoft Learn',
    crawledAt: '2025-03-07T12:45:00Z',
    tags: ['processes', 'cpu', 'formatting']
  }
];

const PowerShellDocExplorer: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<DocItem[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocItem[]>(mockRecentDocs);
  const [showResults, setShowResults] = useState<boolean>(false);

  // Fetch recent documentation on component mount
  useEffect(() => {
    const fetchRecentDocs = async () => {
      try {
        const docs = await documentationApi.getRecentDocumentation(3);
        setRecentDocs(docs);
      } catch (error) {
        console.error('Error fetching recent documentation:', error);
        // Keep the mock data as fallback
      }
    };
    
    fetchRecentDocs();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    // Use the documentation API service
    documentationApi.searchDocumentation({ query, limit: 5 })
      .then(results => {
        setSearchResults(results);
        setIsSearching(false);
      })
      .catch(error => {
        console.error('Error searching documentation:', error);
        // Fallback to mock data in case of error
        setSearchResults(mockSearchResults);
        setIsSearching(false);
      });
  };

  return (
    <div className="bg-gray-700 rounded-lg p-6 shadow mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">PowerShell Documentation Explorer</h2>
        <div className="flex space-x-4">
          <Link
            to="/documentation"
            className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition duration-150"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            Explore Documentation
          </Link>
          <Link
            to="/documentation/crawl"
            className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition duration-150"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            Crawl New Content
          </Link>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PowerShell documentation..."
            className="flex-1 bg-gray-800 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Powered by crawl4ai and vector search for semantic understanding of your query
        </p>
      </form>

      {/* Search Results */}
      {showResults && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Search Results</h3>
          {searchResults.length === 0 && !isSearching ? (
            <p className="text-gray-400">No results found. Try a different search term.</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div key={result.id} className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {result.title}
                    </a>
                    <span className="text-sm text-gray-400">
                      Similarity: {result.similarity?.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">
                    Source: {result.source} • Crawled: {new Date(result.crawledAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recently Crawled */}
      {!showResults && (
        <div>
          <h3 className="text-lg font-medium mb-3">Recently Crawled Documentation</h3>
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="bg-gray-800 p-3 rounded-lg">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  {doc.title}
                </a>
                <p className="text-sm text-gray-300 mt-1">
                  Source: {doc.source} • Crawled: {new Date(doc.crawledAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back to Recent Button */}
      {showResults && (
        <button
          onClick={() => setShowResults(false)}
          className="text-sm text-gray-400 hover:text-white flex items-center"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            ></path>
          </svg>
          Back to Recent Documentation
        </button>
      )}
    </div>
  );
};

export default PowerShellDocExplorer;
