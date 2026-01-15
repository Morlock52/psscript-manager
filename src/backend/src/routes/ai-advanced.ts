/**
 * Advanced AI Routes - 2025 Features
 * Includes RAG, semantic search, and similarity search
 */
import express from 'express';
import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../database/connection';
import { corsMiddleware } from '../middleware/corsMiddleware';
import logger from '../utils/logger';

const router = express.Router();

// Apply CORS middleware
router.use(corsMiddleware);

// AI service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai:8000';
const DEFAULT_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
const DEFAULT_EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS) || 3072;

const formatVectorLiteral = (embedding: number[]): string => `[${embedding.join(',')}]`;

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
    const scriptIds = Array.isArray(script_ids) ? script_ids : undefined;
    const batchSize = Math.max(1, Number(batch_size) || 10);
    const embeddingModel = DEFAULT_EMBEDDING_MODEL;
    const embeddingDimensions = DEFAULT_EMBEDDING_DIMENSIONS;
    
    logger.info('Regenerate embeddings request', { script_ids: scriptIds, batch_size: batchSize });

    if (scriptIds && scriptIds.length === 0) {
      res.json({
        message: 'No script IDs provided for embedding regeneration',
        batch_size: batchSize,
        total_scripts: 0
      });
      return;
    }
    
    // Get scripts that need regeneration
    const scriptsQuery = scriptIds
      ? `SELECT s.id, s.title, s.description, s.content
         FROM scripts s
         WHERE s.id = ANY(:scriptIds::int[])`
      : `SELECT s.id, s.title, s.description, s.content
         FROM scripts s
         LEFT JOIN script_embeddings se ON s.id = se.script_id
         WHERE se.embedding IS NULL
            OR se.embedding_model IS NULL
            OR se.embedding_model != :embeddingModel
            OR se.embedding_dimensions IS NULL
            OR se.embedding_dimensions != :embeddingDimensions
            OR se.updated_at IS NULL
            OR s.updated_at > se.updated_at`;

    const scripts = await sequelize.query<{
      id: number;
      title: string;
      description: string | null;
      content: string;
    }>(scriptsQuery, {
      type: QueryTypes.SELECT,
      replacements: scriptIds
        ? { scriptIds }
        : {
            embeddingModel,
            embeddingDimensions
          }
    });

    if (scripts.length === 0) {
      logger.info('No scripts require embedding regeneration');
      res.json({
        message: 'No scripts require embedding regeneration',
        batch_size: batchSize,
        total_scripts: 0
      });
      return;
    }

    logger.info('Scripts queued for embedding regeneration', {
      totalScripts: scripts.length,
      batchSize
    });

    const failedBatches: Array<{ batch: number; error: string; script_ids: number[] }> = [];
    const failedScripts: Array<{ script_id: number; error: string; batch: number }> = [];
    let processedScripts = 0;

    for (let i = 0; i < scripts.length; i += batchSize) {
      const batch = scripts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const scriptIds = batch.map((script) => script.id);

      logger.info('Processing embedding batch', {
        batch: batchNumber,
        batchSize: batch.length,
        totalScripts: scripts.length
      });

      try {
        const response = await axios.post(`${AI_SERVICE_URL}/generate-embeddings`, {
          scripts: batch.map((script) => ({
            id: script.id,
            name: script.title,
            title: script.title,
            description: script.description,
            content: script.content
          })),
          persist: false,
          model: embeddingModel,
          dimensions: embeddingDimensions
        });

        const batchResults = response.data?.results;
        const batchFailures: Array<{ script_id: number; error: string; batch: number }> = [];
        let persistedCount = 0;
        if (Array.isArray(batchResults)) {
          for (const result of batchResults as Array<{
            script_id: number;
            success: boolean;
            error?: string;
            embedding?: number[];
            model?: string;
            dimensions?: number;
          }>) {
            if (!result.success) {
              batchFailures.push({
                script_id: result.script_id,
                error: result.error || 'Unknown error',
                batch: batchNumber
              });
              continue;
            }

            if (!Array.isArray(result.embedding)) {
              batchFailures.push({
                script_id: result.script_id,
                error: 'Missing embedding payload',
                batch: batchNumber
              });
              continue;
            }

            try {
              await sequelize.query(
                `INSERT INTO script_embeddings (
                  script_id,
                  embedding,
                  embedding_model,
                  embedding_dimensions,
                  created_at,
                  updated_at
                )
                VALUES (
                  :scriptId,
                  :embedding::vector,
                  :embeddingModel,
                  :embeddingDimensions,
                  NOW(),
                  NOW()
                )
                ON CONFLICT (script_id)
                DO UPDATE SET
                  embedding = EXCLUDED.embedding,
                  embedding_model = EXCLUDED.embedding_model,
                  embedding_dimensions = EXCLUDED.embedding_dimensions,
                  updated_at = NOW()`,
                {
                  replacements: {
                    scriptId: result.script_id,
                    embedding: formatVectorLiteral(result.embedding),
                    embeddingModel: result.model || embeddingModel,
                    embeddingDimensions: result.dimensions || embeddingDimensions
                  },
                  type: QueryTypes.INSERT
                }
              );
              persistedCount += 1;
            } catch (persistError: any) {
              batchFailures.push({
                script_id: result.script_id,
                error: persistError.message || 'Failed to persist embedding',
                batch: batchNumber
              });
            }
          }
        }
        failedScripts.push(...batchFailures);

        const successfulCount = response.data?.successful ?? (batch.length - batchFailures.length);
        logger.info('Completed embedding batch', {
          batch: batchNumber,
          successful: successfulCount,
          failed: batch.length - successfulCount,
          persisted: persistedCount
        });
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
        logger.error('Embedding batch failed', {
          batch: batchNumber,
          error: errorMessage
        });
        failedBatches.push({ batch: batchNumber, error: errorMessage, script_ids: scriptIds });
      }

      processedScripts += batch.length;
      logger.info('Embedding regeneration progress', {
        processedScripts,
        totalScripts: scripts.length
      });
    }

    res.json({
      message: 'Embedding regeneration completed',
      batch_size: batchSize,
      total_scripts: scripts.length,
      failed_batches: failedBatches,
      failed_scripts: failedScripts
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
