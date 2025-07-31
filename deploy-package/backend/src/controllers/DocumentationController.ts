import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { DocumentationItem } from '../models/DocumentationItem';
import { DocumentationCrawl } from '../models/DocumentationCrawl';
import logger from '../utils/logger';
import { sanitizeUserInput } from '../utils/sanitize';

// Mock data for initial implementation
const MOCK_SOURCES = ['Microsoft Docs', 'PowerShell Gallery', 'GitHub', 'Stack Overflow', 'Dev.to'];
const MOCK_TAGS = ['Core', 'Management', 'Scripting', 'Security', 'Automation', 'Cloud', 'Azure', 'AWS'];

export class DocumentationController {
  /**
   * Get recent documentation items
   */
  static async getRecent(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      // For now, return mock data until database is set up
      const mockItems = Array.from({ length: limit }, (_, i) => ({
        id: `doc-${offset + i + 1}`,
        title: `PowerShell ${['Cmdlet', 'Function', 'Module', 'Script'][i % 4]} Documentation ${offset + i + 1}`,
        url: `https://docs.microsoft.com/powershell/item-${offset + i + 1}`,
        content: `This is comprehensive documentation for PowerShell item ${offset + i + 1}. It includes examples, parameters, and best practices.`,
        source: MOCK_SOURCES[i % MOCK_SOURCES.length],
        tags: [MOCK_TAGS[i % MOCK_TAGS.length], MOCK_TAGS[(i + 1) % MOCK_TAGS.length]],
        crawledAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }));

      res.json({
        items: mockItems,
        total: 100,
        limit,
        offset,
        hasMore: offset + limit < 100
      });
    } catch (error) {
      logger.error('Error fetching recent documentation:', error);
      next(error);
    }
  }

  /**
   * Search documentation
   */
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = sanitizeUserInput(req.query.query as string || '');
      const sources = req.query.sources ? (Array.isArray(req.query.sources) ? req.query.sources : [req.query.sources]) : [];
      const tags = req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : [];
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = req.query.sortBy || 'relevance';

      // Mock search results
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        id: `search-${i + 1}`,
        title: `${query} - Result ${i + 1}`,
        url: `https://docs.microsoft.com/search-${i + 1}`,
        content: `Search result for "${query}". This documentation covers ${query} in detail with examples and best practices.`,
        source: sources.length > 0 ? sources[0] : MOCK_SOURCES[i % MOCK_SOURCES.length],
        tags: tags.length > 0 ? tags : [MOCK_TAGS[i % MOCK_TAGS.length]],
        similarity: Math.random() * 0.5 + 0.5,
        crawledAt: new Date().toISOString()
      }));

      // Apply filters
      let filtered = mockResults;
      if (sources.length > 0) {
        filtered = filtered.filter(item => sources.includes(item.source));
      }
      if (tags.length > 0) {
        filtered = filtered.filter(item => item.tags.some(tag => tags.includes(tag)));
      }

      // Sort
      if (sortBy === 'date') {
        filtered.sort((a, b) => new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime());
      } else if (sortBy === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      }

      res.json({
        query,
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
        limit,
        offset,
        hasMore: offset + limit < filtered.length
      });
    } catch (error) {
      logger.error('Error searching documentation:', error);
      next(error);
    }
  }

  /**
   * Get available sources
   */
  static async getSources(req: Request, res: Response, next: NextFunction) {
    try {
      const sources = MOCK_SOURCES.map((name, i) => ({
        id: `source-${i + 1}`,
        name,
        count: Math.floor(Math.random() * 50) + 10,
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      res.json({ sources });
    } catch (error) {
      logger.error('Error fetching sources:', error);
      next(error);
    }
  }

  /**
   * Get available tags
   */
  static async getTags(req: Request, res: Response, next: NextFunction) {
    try {
      const tags = MOCK_TAGS.map((name, i) => ({
        id: `tag-${i + 1}`,
        name,
        count: Math.floor(Math.random() * 30) + 5
      }));

      res.json({ tags });
    } catch (error) {
      logger.error('Error fetching tags:', error);
      next(error);
    }
  }

  /**
   * Start documentation crawl
   */
  static async startCrawl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, maxPages = 10, depth = 2, includeExternalLinks = false, fileTypes = ['html'] } = req.body;

      // Validate URL
      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL provided' });
      }

      // Create mock crawl job
      const crawlJob = {
        id: `crawl-${Date.now()}`,
        url,
        status: 'pending',
        progress: 0,
        pagesProcessed: 0,
        totalPages: maxPages,
        createdAt: new Date().toISOString(),
        config: {
          maxPages,
          depth,
          includeExternalLinks,
          fileTypes
        }
      };

      // Simulate crawl progress (in real implementation, this would be a background job)
      setTimeout(() => {
        logger.info(`Simulating crawl progress for job ${crawlJob.id}`);
      }, 1000);

      res.status(201).json({
        message: 'Crawl job created successfully',
        job: crawlJob
      });
    } catch (error) {
      logger.error('Error starting crawl:', error);
      next(error);
    }
  }

  /**
   * Get crawl job status
   */
  static async getCrawlStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Mock crawl status
      const mockStatus = {
        id,
        url: 'https://docs.microsoft.com/powershell',
        status: ['pending', 'running', 'completed', 'failed'][Math.floor(Math.random() * 4)] as any,
        progress: Math.floor(Math.random() * 100),
        pagesProcessed: Math.floor(Math.random() * 50),
        totalPages: 50,
        startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        completedAt: Math.random() > 0.5 ? new Date().toISOString() : null,
        error: Math.random() > 0.8 ? 'Connection timeout' : null
      };

      res.json(mockStatus);
    } catch (error) {
      logger.error('Error fetching crawl status:', error);
      next(error);
    }
  }
}

export default DocumentationController;