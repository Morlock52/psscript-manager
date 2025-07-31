import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface CrawlConfig {
  url: string;
  maxPages: number;
  depth: number;
  includeExternalLinks: boolean;
  fileTypes: string[];
}

interface CrawlStatus {
  status: 'idle' | 'crawling' | 'completed' | 'error';
  message: string;
  progress?: {
    pagesProcessed: number;
    totalPages: number;
    scriptsFound: number;
  };
  error?: string;
}

const DocumentationCrawl: React.FC = () => {
  const [config, setConfig] = useState<CrawlConfig>({
    url: 'https://learn.microsoft.com/en-us/powershell/',
    maxPages: 10,
    depth: 2,
    includeExternalLinks: false,
    fileTypes: ['ps1', 'psm1', 'psd1']
  });

  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus>({
    status: 'idle',
    message: 'Configure your crawl settings and click "Start Crawling" to begin.'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setConfig(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'fileTypes') {
      setConfig(prev => ({ ...prev, [name]: value.split(',').map(t => t.trim()) }));
    } else if (type === 'number') {
      setConfig(prev => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setConfig(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL
    if (!config.url.trim()) {
      setCrawlStatus({
        status: 'error',
        message: 'Please enter a valid URL to crawl.',
        error: 'URL is required'
      });
      return;
    }
    
    // Start crawling
    setCrawlStatus({
      status: 'crawling',
      message: 'Crawling in progress...',
      progress: {
        pagesProcessed: 0,
        totalPages: config.maxPages,
        scriptsFound: 0
      }
    });
    
    // Simulate crawling process
    let pagesProcessed = 0;
    let scriptsFound = 0;
    
    const interval = setInterval(() => {
      pagesProcessed++;
      scriptsFound += Math.floor(Math.random() * 3); // Random number of scripts found per page
      
      if (pagesProcessed <= config.maxPages) {
        setCrawlStatus({
          status: 'crawling',
          message: `Crawling page ${pagesProcessed} of ${config.maxPages}...`,
          progress: {
            pagesProcessed,
            totalPages: config.maxPages,
            scriptsFound
          }
        });
      } else {
        clearInterval(interval);
        setCrawlStatus({
          status: 'completed',
          message: 'Crawling completed successfully!',
          progress: {
            pagesProcessed,
            totalPages: config.maxPages,
            scriptsFound
          }
        });
      }
    }, 1000);
  };

  const renderProgressBar = () => {
    if (!crawlStatus.progress) return null;
    
    const { pagesProcessed, totalPages } = crawlStatus.progress;
    const percentage = Math.min(Math.round((pagesProcessed / totalPages) * 100), 100);
    
    return (
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>{percentage}% Complete</span>
          <span>{pagesProcessed} of {totalPages} pages</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 rounded-lg p-6 mb-8 shadow-lg">
        <h1 className="text-3xl font-bold text-white mb-4">Crawl PowerShell Documentation</h1>
        <p className="text-blue-200 mb-4">
          Use crawl4ai to extract, index, and search PowerShell documentation with semantic understanding.
        </p>
        <div className="flex space-x-4">
          <Link to="/dashboard" className="bg-white text-indigo-700 px-4 py-2 rounded-lg">Dashboard</Link>
          <Link to="/documentation" className="bg-purple-600 text-white px-4 py-2 rounded-lg">View Documentation</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Crawl Configuration</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="url" className="block text-sm font-medium text-blue-300">URL to Crawl</label>
              <input
                type="url"
                id="url"
                name="url"
                value={config.url}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white rounded px-4 py-2"
                placeholder="https://learn.microsoft.com/en-us/powershell/"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="maxPages" className="block text-sm font-medium text-green-300">Max Pages</label>
                <input
                  type="number"
                  id="maxPages"
                  name="maxPages"
                  value={config.maxPages}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="w-full bg-gray-700 text-white rounded px-4 py-2"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="depth" className="block text-sm font-medium text-purple-300">Crawl Depth</label>
                <input
                  type="number"
                  id="depth"
                  name="depth"
                  value={config.depth}
                  onChange={handleInputChange}
                  min="1"
                  max="5"
                  className="w-full bg-gray-700 text-white rounded px-4 py-2"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="fileTypes" className="block text-sm font-medium text-indigo-300">File Types</label>
              <input
                type="text"
                id="fileTypes"
                name="fileTypes"
                value={config.fileTypes.join(', ')}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white rounded px-4 py-2"
                placeholder="ps1, psm1, psd1"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeExternalLinks"
                name="includeExternalLinks"
                checked={config.includeExternalLinks}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="includeExternalLinks" className="ml-2 block text-sm font-medium text-blue-300">
                Include External Links
              </label>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={crawlStatus.status === 'crawling'}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {crawlStatus.status === 'crawling' ? 'Crawling...' : 'Start Crawling'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Crawl Status</h2>
          
          <div className={`p-4 rounded-lg ${
            crawlStatus.status === 'idle' ? 'bg-gray-700' :
            crawlStatus.status === 'crawling' ? 'bg-blue-900' :
            crawlStatus.status === 'completed' ? 'bg-green-900' :
            'bg-red-900'
          }`}>
            <div className="mb-2">
              <span className="font-medium">
                {crawlStatus.status === 'idle' && 'Ready to Crawl'}
                {crawlStatus.status === 'crawling' && 'Crawling in Progress'}
                {crawlStatus.status === 'completed' && 'Crawl Completed'}
                {crawlStatus.status === 'error' && 'Crawl Error'}
              </span>
            </div>
            
            <p className="text-sm">
              {crawlStatus.message}
            </p>
            
            {crawlStatus.error && (
              <p className="mt-2 text-sm text-red-300">
                Error: {crawlStatus.error}
              </p>
            )}
            
            {renderProgressBar()}
            
            {crawlStatus.progress && (
              <div className="mt-4 text-sm">
                <p>PowerShell scripts found: <span className="font-medium">{crawlStatus.progress.scriptsFound}</span></p>
              </div>
            )}
          </div>
          
          {crawlStatus.status === 'completed' && (
            <div className="mt-4">
              <Link
                to="/documentation"
                className="block w-full text-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                View Crawled Documentation
              </Link>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">About crawl4ai</h2>
        <p className="text-gray-300 mb-4">
          crawl4ai is a powerful web crawling tool designed specifically for extracting code and technical content from documentation websites. It uses AI to identify and extract relevant code blocks, making it ideal for building technical documentation databases.
        </p>
        <a 
          href="https://github.com/unclecode/crawl4ai" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          View crawl4ai on GitHub
        </a>
      </div>
    </div>
  );
};

export default DocumentationCrawl;
