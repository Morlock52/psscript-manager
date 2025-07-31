import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import AnalyticsController from '../controllers/AnalyticsController';
import logger from '../utils/logger';

const router = express.Router();
const analyticsController = new AnalyticsController();

// Apply authentication middleware to all analytics routes
// router.use(authenticateJWT); // Removed global authentication

/**
 * Endpoint to get security metrics and statistics
 */
router.get('/security', async (req, res) => {
  try {
    // Mock security data for demonstration
    const securityData = {
      totalScriptsAnalyzed: 156,
      averageSecurityScore: 82.5,
      riskDistribution: {
        low: 68,
        medium: 22,
        high: 10
      },
      commonVulnerabilities: [
        { name: "Unvalidated Input", count: 23 },
        { name: "Insecure Credentials", count: 15 },
        { name: "Excessive Permissions", count: 12 },
        { name: "Hardcoded Secrets", count: 8 }
      ],
      securityTrends: [
        { date: "2025-01", score: 76.2 },
        { date: "2025-02", score: 79.8 },
        { date: "2025-03", score: 82.5 }
      ],
      recommendations: [
        "Use ValidateSet for parameter validation",
        "Implement least-privilege execution contexts",
        "Add error handling for network operations",
        "Encrypt sensitive data and credentials"
      ]
    };

    return res.json(securityData);
  } catch (error) {
    logger.error('Error fetching security metrics:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve security metrics', 
      status: 'error' 
    });
  }
});

/**
 * Usage analytics endpoint
 */
router.get('/usage', async (req, res) => {
  try {
    // Mock usage analytics data
    const usageData = {
      totalUsers: 328,
      activeUsers: {
        daily: 42,
        weekly: 156,
        monthly: 274
      },
      scriptUsage: {
        created: 892,
        executed: 3426,
        shared: 215,
        saved: 682
      },
      popularCategories: [
        { name: "System Administration", count: 245 },
        { name: "File Management", count: 187 },
        { name: "Network Management", count: 143 },
        { name: "Security", count: 128 }
      ],
      userGrowth: [
        { date: "2025-01", count: 267 },
        { date: "2025-02", count: 298 },
        { date: "2025-03", count: 328 }
      ],
      deviceStats: {
        desktop: 72,
        mobile: 18,
        tablet: 10
      }
    };

    return res.json(usageData);
  } catch (error) {
    logger.error('Error fetching usage analytics:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve usage analytics', 
      status: 'error' 
    });
  }
});

/**
 * Dashboard statistics endpoint
 */
router.get('/dashboard-stats', analyticsController.getDashboardStats.bind(analyticsController));

/**
 * Security metrics endpoint
 */
router.get('/security-metrics', analyticsController.getSecurityMetrics.bind(analyticsController));

/**
 * Usage analytics endpoint  
 */
router.get('/usage-analytics', analyticsController.getUsageAnalytics.bind(analyticsController));

// General analytics summary
router.get('/summary', (req, res) => {
  // TODO: Implement comprehensive analytics summary
  res.json({ message: 'Analytics summary endpoint (to be implemented)' });
});

export default router;
