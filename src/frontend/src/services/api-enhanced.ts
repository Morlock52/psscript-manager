// Enhanced API service with additional methods for the PSScript application
import { scriptService as baseScriptService, categoryService, analyticsService } from './api';
import { AxiosResponse } from 'axios';

// Define types for the enhanced API
interface Script {
  id: string;
  title: string;
  description: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
  category_id: number;
  category_name?: string;
  tags?: string[];
  is_public: boolean;
  version: number;
  security_score?: number;
  quality_score?: number;
  views?: number;
  executions?: number;
  file_hash?: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  count?: number;
  color?: string;
}

interface DashboardStats {
  totalScripts: number;
  scriptsChange: number;
  totalCategories: number;
  avgSecurityScore: number;
  securityScoreChange: number;
  totalAnalyses: number;
  analysesChange: number;
  recentScripts?: Script[];
  popularScripts?: Script[];
}

interface SecurityMetrics {
  securityScores: {
    score: number;
    count: number;
    percentage: number;
  }[];
  commonIssues: {
    issue: string;
    count: number;
    percentage: number;
  }[];
  averageScore: number;
  totalScripts: number;
}

interface Activity {
  id: string;
  type: 'create' | 'update' | 'execute' | 'analyze' | 'delete';
  script_id?: string;
  script_title?: string;
  user_id: string;
  username: string;
  timestamp: string;
  details?: any;
}

// Enhanced script service
export const scriptService = {
  ...baseScriptService,
  
  // Get scripts by category
  getScriptsByCategory: async (categoryId: number): Promise<Script[]> => {
    try {
      const response = await baseScriptService.getScripts({ category_id: categoryId });
      return response.scripts || [];
    } catch (error) {
      console.error(`Error fetching scripts for category ${categoryId}:`, error);
      return [];
    }
  },
  
  // Get recent scripts
  getRecentScripts: async (limit: number = 10): Promise<Script[]> => {
    try {
      const response = await baseScriptService.getScripts({ 
        sort: 'created_at',
        order: 'desc',
        limit
      });
      return response.scripts || [];
    } catch (error) {
      console.error('Error fetching recent scripts:', error);
      return [];
    }
  },
  
  // Get popular scripts
  getPopularScripts: async (limit: number = 10): Promise<Script[]> => {
    try {
      const response = await baseScriptService.getScripts({ 
        sort: 'views',
        order: 'desc',
        limit
      });
      return response.scripts || [];
    } catch (error) {
      console.error('Error fetching popular scripts:', error);
      return [];
    }
  },
  
  // Get dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      // Use the new dashboard-stats endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/analytics/dashboard-stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const stats = await response.json();
      
      return {
        totalScripts: stats.totalScripts || 0,
        scriptsChange: stats.scriptsChange || 0,
        totalCategories: stats.totalCategories || 0,
        avgSecurityScore: stats.avgSecurityScore || 0,
        securityScoreChange: stats.securityScoreChange || 0,
        totalAnalyses: stats.totalAnalyses || 0,
        analysesChange: stats.analysesChange || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalScripts: 0,
        scriptsChange: 0,
        totalCategories: 0,
        avgSecurityScore: 0,
        securityScoreChange: 0,
        totalAnalyses: 0,
        analysesChange: 0
      };
    }
  },
  
  // Get recent activity
  getRecentActivity: async (limit: number = 10): Promise<Activity[]> => {
    try {
      // Try to get from analytics service first
      try {
        const usageStats = await analyticsService.getUsageStats();
        if (usageStats.recentActivity && Array.isArray(usageStats.recentActivity)) {
          return usageStats.recentActivity.slice(0, limit);
        }
      } catch (analyticsError) {
        console.warn('Failed to get activity from analytics service:', analyticsError);
      }
      
      // Fallback to mock data
      return Array(limit).fill(0).map((_, i) => ({
        id: `activity-${i}`,
        type: ['create', 'update', 'execute', 'analyze'][Math.floor(Math.random() * 4)] as any,
        script_id: `script-${i}`,
        script_title: `Example Script ${i}`,
        user_id: 'user-1',
        username: 'User',
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        details: {}
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  },
  
  // Get script trends data
  getScriptTrends: async (period: 'week' | 'month' | 'year' = 'week'): Promise<{
    uploads: { date: string; count: number }[];
    executions: { date: string; count: number }[];
    analyses: { date: string; count: number }[];
  }> => {
    try {
      // In a real implementation, this would fetch from the backend
      // For now, generate mock data based on the period
      
      const now = new Date();
      const data = {
        uploads: [] as { date: string; count: number }[],
        executions: [] as { date: string; count: number }[],
        analyses: [] as { date: string; count: number }[]
      };
      
      let days = 7;
      if (period === 'month') days = 30;
      if (period === 'year') days = 12; // For year, we'll do months instead of days
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        
        if (period === 'year') {
          // For year period, go back by months
          date.setMonth(now.getMonth() - (days - i - 1));
          date.setDate(1); // First day of month
        } else {
          // For week/month periods, go back by days
          date.setDate(now.getDate() - (days - i - 1));
        }
        
        // Format date as ISO string (YYYY-MM-DD)
        const dateStr = date.toISOString().split('T')[0];
        
        // Generate random counts (higher for more recent dates)
        const factor = 0.5 + (i / days) * 0.5; // 0.5 to 1.0
        const uploadCount = Math.floor(Math.random() * 10 * factor) + 1;
        const executionCount = Math.floor(Math.random() * 20 * factor) + 2;
        const analysisCount = Math.floor(Math.random() * 15 * factor) + 1;
        
        data.uploads.push({ date: dateStr, count: uploadCount });
        data.executions.push({ date: dateStr, count: executionCount });
        data.analyses.push({ date: dateStr, count: analysisCount });
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching script trends for ${period}:`, error);
      return {
        uploads: [],
        executions: [],
        analyses: []
      };
    }
  }
};

// Enhanced analytics service
export const analysisService = {
  ...analyticsService,
  
  // Get security metrics
  getSecurityMetrics: async (): Promise<SecurityMetrics> => {
    try {
      const metrics = await analyticsService.getSecurityMetrics();
      
      // Transform to the expected format
      return {
        securityScores: [
          { score: 8, count: metrics.highSecurityCount || 0, percentage: metrics.highSecurityPercentage || 0 },
          { score: 5, count: metrics.mediumSecurityCount || 0, percentage: metrics.mediumSecurityPercentage || 0 },
          { score: 2, count: metrics.lowSecurityCount || 0, percentage: metrics.lowSecurityPercentage || 0 }
        ],
        commonIssues: metrics.commonIssues || [],
        averageScore: (metrics.highSecurityCount * 8 + metrics.mediumSecurityCount * 5 + metrics.lowSecurityCount * 2) / 
                     (metrics.highSecurityCount + metrics.mediumSecurityCount + metrics.lowSecurityCount) || 0,
        totalScripts: metrics.highSecurityCount + metrics.mediumSecurityCount + metrics.lowSecurityCount || 0
      };
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      return {
        securityScores: [
          { score: 8, count: 0, percentage: 0 },
          { score: 5, count: 0, percentage: 0 },
          { score: 2, count: 0, percentage: 0 }
        ],
        commonIssues: [],
        averageScore: 0,
        totalScripts: 0
      };
    }
  }
};

// Re-export other services
export { categoryService, analyticsService };
