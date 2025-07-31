import axios from 'axios';

// Use the same dynamic API URL pattern as in other services
const API_URL = import.meta.env.VITE_API_URL || 
  `http://${window.location.hostname}:4000/api`; // Fixed port from 4001 to 4000

// Types for documentation API
export interface DocItem {
  id: string;
  title: string;
  url: string;
  content: string;
  similarity?: number;
  source: string;
  crawledAt: string;
  tags: string[];
}

export interface CrawlConfig {
  url: string;
  maxPages: number;
  depth: number;
  includeExternalLinks: boolean;
  fileTypes: string[];
}

export interface CrawlResult {
  pagesProcessed: number;
  totalPages: number;
  scriptsFound: number;
  status: 'completed' | 'error';
  message?: string;
}

export interface SearchParams {
  query?: string;
  sources?: string[];
  tags?: string[];
  sortBy?: 'recent' | 'title' | 'relevance';
  limit?: number;
  offset?: number;
}

// Documentation API service
const documentationApi = {
  // Get recent documentation
  getRecentDocumentation: async (limit = 10): Promise<DocItem[]> => {
    try {
      // In a real implementation, this would be:
      // const response = await axios.get(`${API_URL}/documentation/recent?limit=${limit}`);
      // return response.data;
      
      // Mock implementation for demonstration
      return [
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
    } catch (error) {
      console.error('Error fetching recent documentation:', error);
      throw error;
    }
  },
  
  // Search documentation
  searchDocumentation: async (params: SearchParams): Promise<DocItem[]> => {
    try {
      // In a real implementation, this would be:
      // const queryParams = new URLSearchParams();
      // if (params.query) queryParams.append('query', params.query);
      // if (params.sources) queryParams.append('sources', params.sources.join(','));
      // if (params.tags) queryParams.append('tags', params.tags.join(','));
      // if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      // if (params.limit) queryParams.append('limit', params.limit.toString());
      // if (params.offset) queryParams.append('offset', params.offset.toString());
      // 
      // const response = await axios.get(`${API_URL}/documentation/search?${queryParams.toString()}`);
      // return response.data;
      
      // Mock implementation for demonstration
      return [
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
    } catch (error) {
      console.error('Error searching documentation:', error);
      throw error;
    }
  },
  
  // Get available sources
  getSources: async (): Promise<{ id: string; name: string }[]> => {
    try {
      // In a real implementation, this would be:
      // const response = await axios.get(`${API_URL}/documentation/sources`);
      // return response.data;
      
      // Mock implementation for demonstration
      return [
        { id: '1', name: 'Microsoft Learn' },
        { id: '2', name: 'PowerShell Gallery' },
        { id: '3', name: 'GitHub' }
      ];
    } catch (error) {
      console.error('Error fetching documentation sources:', error);
      throw error;
    }
  },
  
  // Get available tags
  getTags: async (): Promise<string[]> => {
    try {
      // In a real implementation, this would be:
      // const response = await axios.get(`${API_URL}/documentation/tags`);
      // return response.data;
      
      // Mock implementation for demonstration
      return [
        'modules', 'packages', 'basics', 'error-handling', 'exceptions', 
        'best-practices', 'functions', 'parameters', 'advanced', 
        'processes', 'memory', 'sorting', 'filtering', 'cpu', 'formatting'
      ];
    } catch (error) {
      console.error('Error fetching documentation tags:', error);
      throw error;
    }
  },
  
  // Start a crawl
  startCrawl: async (config: CrawlConfig): Promise<CrawlResult> => {
    try {
      // In a real implementation, this would be:
      // const response = await axios.post(`${API_URL}/documentation/crawl`, config);
      // return response.data;
      
      // Mock implementation for demonstration
      return {
        pagesProcessed: config.maxPages,
        totalPages: config.maxPages,
        scriptsFound: Math.floor(Math.random() * 20) + 5, // Random number between 5 and 25
        status: 'completed'
      };
    } catch (error) {
      console.error('Error starting crawl:', error);
      throw error;
    }
  },
  
  // Get crawl status
  getCrawlStatus: async (crawlId: string): Promise<CrawlResult> => {
    try {
      // In a real implementation, this would be:
      // const response = await axios.get(`${API_URL}/documentation/crawl/${crawlId}/status`);
      // return response.data;
      
      // Mock implementation for demonstration
      return {
        pagesProcessed: 10,
        totalPages: 10,
        scriptsFound: 15,
        status: 'completed'
      };
    } catch (error) {
      console.error('Error fetching crawl status:', error);
      throw error;
    }
  }
};

export default documentationApi;
