import { Request, Response } from 'express';
import db from '../db';
import { Script, ScriptAnalysis, Category, User } from '../models';
import { sequelize } from '../database/connection';
import { Op } from 'sequelize';
import logger from '../utils/logger';

export default class AnalyticsController {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      // Get current counts using Sequelize models
      const [
        totalScripts,
        totalCategories,
        totalAnalyses,
        avgSecurityResult
      ] = await Promise.all([
        Script.count(),
        Category.count(),
        ScriptAnalysis.count(),
        ScriptAnalysis.findOne({
          attributes: [[sequelize.fn('AVG', sequelize.col('security_score')), 'avgScore']]
        })
      ]);

      const avgSecurityScore = avgSecurityResult?.getDataValue('avgScore') || 0;

      // Get recent counts (last 7 days)
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [recentScripts, recentAnalyses] = await Promise.all([
        Script.count({
          where: {
            created_at: {
              [Op.gte]: lastWeek
            }
          }
        }),
        ScriptAnalysis.count({
          where: {
            created_at: {
              [Op.gte]: lastWeek
            }
          }
        })
      ]);

      // Calculate percentage changes
      const stats = {
        totalScripts,
        scriptsChange: totalScripts > 0 ? Math.round((recentScripts / totalScripts) * 100) : 0,
        totalCategories,
        avgSecurityScore: parseFloat(avgSecurityScore.toFixed(1)),
        securityScoreChange: 0, // Would need historical data to calculate
        totalAnalyses,
        analysesChange: totalAnalyses > 0 ? Math.round((recentAnalyses / totalAnalyses) * 100) : 0
      };

      res.json(stats);
    } catch (error) {
      logger.error('Error getting dashboard stats', { error });
      res.status(500).json({
        error: 'Failed to fetch dashboard statistics'
      });
    }
  }

  /**
   * Get security metrics for scripts
   * Provides aggregated security metrics for analysis
   */
  async getSecurityMetrics(req: Request, res: Response) {
    try {
      // Fetch scripts with security scan results
      const scripts = await db.query(`
        SELECT 
          s.id,
          s.title,
          s.security_score,
          s.created_at,
          COUNT(v.id) as vulnerability_count
        FROM scripts s
        LEFT JOIN vulnerabilities v ON s.id = v.script_id
        WHERE s.security_score IS NOT NULL
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 100
      `);
      
      // Aggregate vulnerability metrics
      const vulnerabilityMetrics = await db.query(`
        SELECT 
          severity,
          COUNT(*) as count
        FROM vulnerabilities
        GROUP BY severity
      `);
      
      // Get average security score
      const avgScore = await db.query(`
        SELECT AVG(security_score) as average_score
        FROM scripts
        WHERE security_score IS NOT NULL
      `);
      
      res.status(200).json({
        average_security_score: avgScore[0]?.average_score || 0,
        total_scripts_analyzed: scripts.length,
        vulnerability_metrics: vulnerabilityMetrics,
        recent_scripts: scripts.map(script => ({
          id: script.id,
          title: script.title,
          security_score: script.security_score,
          vulnerability_count: script.vulnerability_count,
          created_at: script.created_at
        }))
      });
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      res.status(500).json({ message: 'Failed to fetch security metrics' });
    }
  }
  
  /**
   * Get usage analytics
   */
  async getUsageAnalytics(req: Request, res: Response) {
    try {
      // Get script creation count by date
      const scriptsByDate = await db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM scripts
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `);
      
      // Get total scripts
      const totalScripts = await db.query(`
        SELECT COUNT(*) as count FROM scripts
      `);
      
      // Get total users
      const totalUsers = await db.query(`
        SELECT COUNT(*) as count FROM users
      `);
      
      res.status(200).json({
        total_scripts: totalScripts[0]?.count || 0,
        total_users: totalUsers[0]?.count || 0,
        scripts_by_date: scriptsByDate
      });
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      res.status(500).json({ message: 'Failed to fetch usage analytics' });
    }
  }
}
