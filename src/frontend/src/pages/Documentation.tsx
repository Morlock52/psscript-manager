import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DocItem {
  id: string;
  title: string;
  url: string;
  content: string;
  similarity?: number;
  source: string;
  crawledAt: string;
  tags: string[];
}

// Mock data for demonstration purposes
const mockDocItems: DocItem[] = [
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
  },
  {
    id: '4',
    title: 'Get-Process | Sort-Object -Property WS -Descending | Select-Object -First 5',
    url: 'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process',
    content: 'This PowerShell command gets all running processes, sorts them by working set (memory usage) in descending order, and selects the top 5 processes using the most memory.',
    source: 'Microsoft Learn',
    crawledAt: '2025-03-07T10:15:00Z',
    tags: ['processes', 'memory', 'sorting']
  },
  {
    id: '5',
    title: 'Get-Process | Where-Object {$_.WorkingSet -gt 50MB} | Sort-Object -Property WorkingSet -Descending',
    url: 'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object',
    content: 'This PowerShell command gets all processes with a working set (memory usage) greater than 50MB and sorts them by working set in descending order.',
    source: 'Microsoft Learn',
    crawledAt: '2025-03-07T11:30:00Z',
    tags: ['processes', 'filtering', 'memory']
  },
  {
    id: '6',
    title: 'Get-Process | Sort-Object CPU -Descending | Format-Table -Property ID,ProcessName,CPU,WS -AutoSize',
    url: 'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/format-table',
    content: 'This PowerShell command gets all processes, sorts them by CPU usage in descending order, and formats the output as a table showing ID, process name, CPU usage, and working set (memory usage).',
    source: 'Microsoft Learn',
    crawledAt: '2025-03-07T12:45:00Z',
    tags: ['processes', 'cpu', 'formatting']
  }
];

// Mock sources for filtering
const mockSources = [
  { id: '1', name: 'Microsoft Learn' },
  { id: '2', name: 'PowerShell Gallery' },
  { id: '3', name: 'GitHub' }
];

// Mock tags for filtering
const mockTags = [
  'modules', 'packages', 'basics', 'error-handling', 'exceptions', 
  'best-practices', 'functions', 'parameters', 'advanced', 
  'processes', 'memory', 'sorting', 'filtering', 'cpu', 'formatting'
];

const Documentation: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [docItems, setDocItems] = useState<DocItem[]>(mockDocItems);
  const [filteredItems, setFilteredItems] = useState<DocItem[]>(mockDocItems);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Filter items based on search query, selected sources, and selected tags
  useEffect(() => {
    let filtered = [...docItems];
    
    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.content.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Filter by selected sources
    if (selectedSources.length > 0) {
      filtered = filtered.filter(item => selectedSources.includes(item.source));
    }
    
    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => 
        item.tags.some(tag => selectedTags.includes(tag))
      );
    }
    
    // Sort items
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime());
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'relevance':
        // In a real implementation, this would use similarity scores
        filtered.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        break;
      default:
        break;
    }
    
    setFilteredItems(filtered);
  }, [docItems, query, selectedSources, selectedTags, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      // In a real implementation, this would be:
      // api.searchDocumentation(query, selectedSources, selectedTags).then(data => {
      //   setDocItems(data);
      //   setIsSearching(false);
      // });
      setIsSearching(false);
    }, 1000);
  };

  const toggleSource = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source) 
        : [...prev, source]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  return (
    <div className="container mx-auto pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">PowerShell Documentation Explorer</h1>
        <div className="flex space-x-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition duration-150"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              ></path>
            </svg>
            Dashboard
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

      {/* Search and Filters */}
      <div className="bg-gray-700 rounded-lg p-6 shadow mb-6">
        <form onSubmit={handleSearch}>
          <div className="flex mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PowerShell documentation..."
              className="flex-1 bg-gray-800 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSearching}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sources Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Sources</h3>
              <div className="space-y-2">
                {mockSources.map(source => (
                  <label key={source.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source.name)}
                      onChange={() => toggleSource(source.name)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">{source.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {mockTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort and View Options */}
            <div>
              <div className="flex justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">Sort By</h3>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('card')}
                    className={`p-1 rounded-md ${
                      viewMode === 'card' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-800'
                    }`}
                    title="Grid view"
                    aria-label="Switch to grid view"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded-md ${
                      viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-800'
                    }`}
                    title="List view"
                    aria-label="Switch to list view"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <label htmlFor="sort-select" className="sr-only">Sort by</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full bg-gray-800 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Sort documents by"
              >
                <option value="recent">Most Recent</option>
                <option value="title">Title (A-Z)</option>
                <option value="relevance">Relevance</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          {filteredItems.length === 0
            ? 'No results found'
            : `Showing ${filteredItems.length} result${filteredItems.length === 1 ? '' : 's'}`}
        </div>
        <div className="text-sm text-gray-400">
          Powered by crawl4ai and vector search
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* No Results */}
      {!isSearching && filteredItems.length === 0 && (
        <div className="bg-gray-700 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-white">No documentation found</h3>
          <p className="mt-2 text-gray-400">
            Try changing your search criteria or crawl new content.
          </p>
          <Link
            to="/documentation/crawl"
            className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <svg
              className="w-4 h-4 mr-2"
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
      )}

      {/* Card View */}
      {!isSearching && filteredItems.length > 0 && viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-lg shadow overflow-hidden hover:bg-gray-650 transition-colors"
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-400"
                    >
                      {item.title}
                    </a>
                  </h3>
                  {item.similarity && (
                    <span className="text-xs text-gray-400">
                      Similarity: {item.similarity.toFixed(2)}
                    </span>
                  )}
                </div>
                
                <p className="mt-2 text-sm text-gray-300 line-clamp-3">
                  {item.content}
                </p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
                  <span>{item.source}</span>
                  <span>Crawled: {new Date(item.crawledAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!isSearching && filteredItems.length > 0 && viewMode === 'list' && (
        <div className="bg-gray-700 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tags
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Crawled
                  </th>
                  {sortBy === 'relevance' && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Similarity
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-650">
                    <td className="px-6 py-4">
                      <div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-400 font-medium"
                        >
                          {item.title}
                        </a>
                        <p className="mt-1 text-sm text-gray-400 line-clamp-1">
                          {item.content}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item.source}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-800 text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(item.crawledAt).toLocaleDateString()}
                    </td>
                    {sortBy === 'relevance' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {item.similarity ? item.similarity.toFixed(2) : 'N/A'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documentation;
