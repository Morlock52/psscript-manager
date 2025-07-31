import express from 'express';
import { authenticateJWT } from '../middleware/auth';
import CacheManager from '../services/CacheManager';
import logger from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     description: Retrieve multi-tier cache performance statistics
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 l1:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: integer
 *                     misses:
 *                       type: integer
 *                     hitRate:
 *                       type: number
 *                     size:
 *                       type: integer
 *                     maxSize:
 *                       type: integer
 *                 l2:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: integer
 *                     misses:
 *                       type: integer
 *                     hitRate:
 *                       type: number
 *                 total:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: integer
 *                     misses:
 *                       type: integer
 *                     hitRate:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticateJWT, (req, res) => {
  try {
    const stats = CacheManager.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting cache stats', { error });
    res.status(500).json({ error: 'Failed to retrieve cache statistics' });
  }
});

/**
 * @swagger
 * /api/cache/clear:
 *   post:
 *     summary: Clear cache by pattern
 *     description: Clear cache entries matching a pattern
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pattern
 *             properties:
 *               pattern:
 *                 type: string
 *                 description: Pattern to match cache keys
 *     responses:
 *       200:
 *         description: Cache cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cleared:
 *                   type: integer
 *                   description: Number of entries cleared
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/clear', authenticateJWT, async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({ error: 'Pattern is required' });
    }

    const cleared = await CacheManager.clearPattern(pattern);
    
    logger.info('Cache cleared by pattern', { pattern, cleared });
    res.json({ 
      cleared, 
      message: `Cleared ${cleared} cache entries matching pattern: ${pattern}` 
    });
  } catch (error) {
    logger.error('Error clearing cache', { error });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * @swagger
 * /api/cache/warm:
 *   post:
 *     summary: Warm cache with common queries
 *     description: Pre-populate cache with frequently accessed data
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keys
 *             properties:
 *               keys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Keys to warm
 *     responses:
 *       200:
 *         description: Cache warmed
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/warm', authenticateJWT, async (req, res) => {
  try {
    const { keys } = req.body;
    
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Keys array is required' });
    }

    // Simple factory that returns a placeholder value
    const factory = async (key: string) => ({ 
      warmed: true, 
      key, 
      timestamp: new Date() 
    });

    await CacheManager.warmCache(keys, factory);
    
    res.json({ 
      message: `Warmed cache with ${keys.length} keys`,
      keys 
    });
  } catch (error) {
    logger.error('Error warming cache', { error });
    res.status(500).json({ error: 'Failed to warm cache' });
  }
});

export default router;