/**
 * Advanced AI Routes - 2025 Features
 * Includes RAG, semantic search, and similarity search
 */
import express from 'express';
import axios from 'axios';
import { corsMiddleware } from '../middleware/corsMiddleware';
import logger from '../utils/logger';

const router = express.Router();

// Apply CORS middleware
router.use(corsMiddleware);

// AI service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai:8000';

/**
 * @swagger
 * /api/ai/advanced/rag:
 *   post:
 *     summary: Retrieval-Augmented Generation for PowerShell patterns
 *     description: Uses RAG to find relevant PowerShell patterns and generate comprehensive answers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Query about PowerShell patterns or best practices
 *               context:
 *                 type: string
 *                 description: Additional context for the query
 *               limit:
 *                 type: integer
 *                 default: 5
 *                 description: Number of relevant examples to retrieve
 *     responses:
 *       200:
 *         description: Successfully generated response with sources
 *       500:
 *         description: Server error
 */
router.post('/rag', async (req, res) => {
  try {
    const { query, context, limit = 5 } = req.body;
    
    logger.info('RAG request received', { query, limit });
    
    const response = await axios.post(`${AI_SERVICE_URL}/rag`, {
      query,
      context,
      limit
    });
    
    res.json(response.data);
  } catch (error: any) {
    logger.error('RAG error', error);
    res.status(500).json({ 
      error: 'Failed to process RAG request',
      details: error.response?.data || error.message 
    });
  }
});

/**
 * @swagger
 * /api/ai/advanced/semantic-search:
 *   post:
 *     summary: Semantic search for scripts
 *     description: Search for scripts using natural language queries and vector embeddings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *               limit:
 *                 type: integer
 *                 default: 10
 *                 description: Number of results to return
 *               threshold:
 *                 type: number
 *                 default: 0.7
 *                 description: Similarity threshold (0-1)
 *               category:
 *                 type: string
 *                 description: Filter by script category
 *     responses:
 *       200:
 *         description: Search results with similarity scores
 *       500:
 *         description: Server error
 */
router.post('/semantic-search', async (req, res) => {
  try {
    const { query, limit = 10, threshold = 0.7, category } = req.body;
    
    logger.info('Semantic search request', { query, limit, threshold, category });
    
    const response = await axios.post(`${AI_SERVICE_URL}/semantic-search`, {
      query,
      limit,
      threshold,
      category
    });
    
    res.json(response.data);
  } catch (error: any) {
    logger.error('Semantic search error', error);
    res.status(500).json({ 
      error: 'Failed to perform semantic search',
      details: error.response?.data || error.message 
    });
  }
});

/**
 * @swagger
 * /api/ai/advanced/similarity-search:
 *   post:
 *     summary: Find similar scripts
 *     description: Find scripts similar to a given script using vector embeddings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - script_id
 *             properties:
 *               script_id:
 *                 type: integer
 *                 description: ID of the script to find similar scripts for
 *               limit:
 *                 type: integer
 *                 default: 5
 *                 description: Number of similar scripts to return
 *               threshold:
 *                 type: number
 *                 default: 0.7
 *                 description: Similarity threshold (0-1)
 *     responses:
 *       200:
 *         description: Similar scripts with similarity scores
 *       404:
 *         description: Script not found
 *       500:
 *         description: Server error
 */
router.post('/similarity-search', async (req, res) => {
  try {
    const { script_id, limit = 5, threshold = 0.7 } = req.body;
    
    logger.info('Similarity search request', { script_id, limit, threshold });
    
    const response = await axios.post(`${AI_SERVICE_URL}/similarity-search`, {
      script_id,
      limit,
      threshold
    });
    
    res.json(response.data);
  } catch (error: any) {
    logger.error('Similarity search error', error);
    
    if (error.response?.status === 404) {
      res.status(404).json({ 
        error: 'Script not found or missing embedding' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to find similar scripts',
        details: error.response?.data || error.message 
      });
    }
  }
});

/**
 * @swagger
 * /api/ai/advanced/embeddings/status:
 *   get:
 *     summary: Get embeddings status
 *     description: Check the status of script embeddings and which scripts need updating
 *     responses:
 *       200:
 *         description: Embeddings status information
 *       500:
 *         description: Server error
 */
router.get('/embeddings/status', async (req, res) => {
  try {
    logger.info('Embeddings status request');
    
    const response = await axios.get(`${AI_SERVICE_URL}/embeddings/status`);
    
    res.json(response.data);
  } catch (error: any) {
    logger.error('Embeddings status error', error);
    res.status(500).json({ 
      error: 'Failed to get embeddings status',
      details: error.response?.data || error.message 
    });
  }
});

/**
 * @swagger
 * /api/ai/advanced/regenerate-embeddings:
 *   post:
 *     summary: Regenerate embeddings for scripts
 *     description: Regenerate embeddings using the latest model for scripts that need updating
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               script_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Specific script IDs to regenerate (if not provided, regenerates all that need updating)
 *               batch_size:
 *                 type: integer
 *                 default: 10
 *                 description: Number of scripts to process in each batch
 *     responses:
 *       200:
 *         description: Regeneration started
 *       500:
 *         description: Server error
 */
router.post('/regenerate-embeddings', async (req, res) => {
  try {
    const { script_ids, batch_size = 10 } = req.body;
    
    logger.info('Regenerate embeddings request', { script_ids, batch_size });
    
    // Get scripts that need regeneration
    const scriptsQuery = script_ids 
      ? `SELECT * FROM scripts WHERE id = ANY($1::int[])` 
      : `SELECT s.* FROM scripts s 
         LEFT JOIN script_embeddings se ON s.id = se.script_id
         WHERE se.embedding IS NULL 
            OR se.embedding_model != 'text-embedding-3-large'
            OR se.embedding_dimensions != 3072
         LIMIT $1`;
    
    // This would be implemented in the actual controller
    // For now, we'll return a placeholder response
    res.json({
      message: 'Embedding regeneration started',
      batch_size,
      script_ids: script_ids || 'all scripts needing update'
    });
    
  } catch (error: any) {
    logger.error('Regenerate embeddings error', error);
    res.status(500).json({ 
      error: 'Failed to start embedding regeneration',
      details: error.message 
    });
  }
});

export default router;