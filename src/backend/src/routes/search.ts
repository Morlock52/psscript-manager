import express from 'express';
import { authenticateJWT } from '../middleware/auth';
import HybridSearchService from '../services/HybridSearchService';
import { query, validationResult } from 'express-validator';
import logger from '../utils/logger';
import { cacheConfigs } from '../middleware/cacheMiddleware';

const router = express.Router();

/**
 * @swagger
 * /api/search/hybrid:
 *   get:
 *     summary: Perform hybrid search (text + vector)
 *     description: Search scripts using both text matching and semantic similarity
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search query
 *       - in: query
 *         name: textWeight
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0.3
 *         description: Weight for text search (0-1)
 *       - in: query
 *         name: vectorWeight
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0.7
 *         description: Weight for vector similarity (0-1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       script_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       text_rank:
 *                         type: number
 *                       vector_similarity:
 *                         type: number
 *                       combined_score:
 *                         type: number
 *                 query:
 *                   type: string
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/hybrid',
  authenticateJWT,
  cacheConfigs.search.results,
  [
    query('q').trim().notEmpty().withMessage('Query is required'),
    query('textWeight').optional().isFloat({ min: 0, max: 1 }),
    query('vectorWeight').optional().isFloat({ min: 0, max: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { q, textWeight, vectorWeight, limit } = req.query;
      
      const results = await HybridSearchService.search(q as string, {
        textWeight: textWeight ? parseFloat(textWeight as string) : undefined,
        vectorWeight: vectorWeight ? parseFloat(vectorWeight as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        results,
        query: q,
        count: results.length
      });
    } catch (error) {
      logger.error('Hybrid search endpoint error', { error });
      res.status(500).json({ 
        error: 'Search failed', 
        message: 'An error occurred while searching' 
      });
    }
  }
);

/**
 * @swagger
 * /api/search/text:
 *   get:
 *     summary: Text-only search
 *     description: Search scripts using only text matching
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid query
 *       401:
 *         description: Unauthorized
 */
router.get('/text',
  authenticateJWT,
  cacheConfigs.search.results,
  [
    query('q').trim().notEmpty().withMessage('Query is required'),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { q, limit } = req.query;
      const results = await HybridSearchService.textSearch(
        q as string, 
        limit ? parseInt(limit as string) : undefined
      );

      res.json({ results, query: q, count: results.length });
    } catch (error) {
      logger.error('Text search endpoint error', { error });
      res.status(500).json({ 
        error: 'Search failed', 
        message: 'An error occurred while searching' 
      });
    }
  }
);

/**
 * @swagger
 * /api/search/vector:
 *   get:
 *     summary: Vector-only search
 *     description: Search scripts using only semantic similarity
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid query
 *       401:
 *         description: Unauthorized
 */
router.get('/vector',
  authenticateJWT,
  cacheConfigs.search.results,
  [
    query('q').trim().notEmpty().withMessage('Query is required'),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { q, limit } = req.query;
      const results = await HybridSearchService.vectorSearch(
        q as string, 
        limit ? parseInt(limit as string) : undefined
      );

      res.json({ results, query: q, count: results.length });
    } catch (error) {
      logger.error('Vector search endpoint error', { error });
      res.status(500).json({ 
        error: 'Search failed', 
        message: 'An error occurred while searching' 
      });
    }
  }
);

/**
 * @swagger
 * /api/search/cache/clear:
 *   post:
 *     summary: Clear search cache
 *     description: Clear all cached search results
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared
 *       401:
 *         description: Unauthorized
 */
router.post('/cache/clear',
  authenticateJWT,
  async (req, res) => {
    try {
      HybridSearchService.clearCache();
      res.json({ message: 'Search cache cleared' });
    } catch (error) {
      logger.error('Clear cache error', { error });
      res.status(500).json({ 
        error: 'Failed to clear cache' 
      });
    }
  }
);

export default router;