import { Router } from 'express';
import { cacheMiddleware } from '../middleware/cache';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Get cache statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  const stats = await cacheMiddleware.getStats();
  res.json(stats);
});

/**
 * Clear cache (admin only)
 */
router.post('/clear', requireAdmin, async (req, res) => {
  const { patterns } = req.body;
  
  if (patterns && Array.isArray(patterns)) {
    await cacheMiddleware.invalidate(patterns);
    res.json({
      success: true,
      message: `Cache cleared for patterns: ${patterns.join(', ')}`
    });
  } else {
    await cacheMiddleware.clearAll();
    res.json({
      success: true,
      message: 'All cache cleared'
    });
  }
});

/**
 * Acquire distributed lock
 */
router.post('/lock/:resource', requireAuth, async (req, res) => {
  const { resource } = req.params;
  const { ttl = 30000 } = req.body;
  
  const lock = await cacheMiddleware.acquireLock(resource, ttl);
  
  if (lock) {
    res.json({
      success: true,
      message: 'Lock acquired',
      resource
    });
    
    // Auto-release lock after TTL
    setTimeout(() => {
      lock.unlock().catch(err => {
        console.error('Failed to unlock resource:', err);
      });
    }, ttl);
  } else {
    res.status(409).json({
      success: false,
      message: 'Resource is already locked',
      resource
    });
  }
});

export default router;