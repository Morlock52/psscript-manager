import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/api';

const Analytics: React.FC = () => {
  // Mock data for demonstration purposes
  const usageStats = {
    totalScripts: 156,
    executionsLastWeek: 342,
    activeUsers: 28,
    totalExecutions: 1245,
    recentActivity: [
      {
        type: 'execution',
        user: 'admin',
        scriptId: 1,
        scriptTitle: 'Get-SystemInfo',
        timestamp: new Date().toISOString()
      },
      {
        type: 'upload',
        user: 'admin',
        scriptId: 3,
        scriptTitle: 'New-ADUser',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        type: 'execution',
        user: 'sysadmin',
        scriptId: 2,
        scriptTitle: 'Backup-UserFiles',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      }
    ]
  };
  
  const securityMetrics = {
    highSecurityCount: 76,
    highSecurityPercentage: 48,
    mediumSecurityCount: 59,
    mediumSecurityPercentage: 38,
    lowSecurityCount: 21,
    lowSecurityPercentage: 14,
    commonIssues: [
      {
        title: 'Unencrypted Credentials',
        description: 'Scripts contain plaintext credentials that should be secured',
        count: 15
      },
      {
        title: 'Excessive Permissions',
        description: 'Scripts requesting unnecessary admin privileges',
        count: 12
      },
      {
        title: 'Missing Error Handling',
        description: 'Scripts lack proper error handling for network operations',
        count: 23
      }
    ]
  };
  
  const categoryDistribution = {
    categories: [
      { id: 1, name: 'System Administration', count: 42, percentage: 27 },
      { id: 2, name: 'Active Directory', count: 38, percentage: 24 },
      { id: 3, name: 'Backup & Recovery', count: 25, percentage: 16 },
      { id: 4, name: 'Security Tools', count: 19, percentage: 12 },
      { id: 5, name: 'Network Management', count: 17, percentage: 11 },
      { id: 6, name: 'Automation Workflows', count: 15, percentage: 10 }
    ]
  };
  
  return (
    <div className="container mx-auto pb-8">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      
      {/* Usage Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4 shadow">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Total Scripts</h3>
            <p className="text-2xl font-bold">{usageStats.totalScripts}</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 shadow">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Executions (Last 7 Days)</h3>
            <p className="text-2xl font-bold">{usageStats.executionsLastWeek}</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 shadow">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Active Users</h3>
            <p className="text-2xl font-bold">{usageStats.activeUsers}</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 shadow">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Total Executions</h3>
            <p className="text-2xl font-bold">{usageStats.totalExecutions}</p>
          </div>
        </div>
      </div>
      
      {/* Security Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Security Overview</h2>
        <div className="bg-gray-700 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Script Security Distribution */}
            <div>
              <h3 className="text-lg font-medium mb-4">Script Security Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-green-400">High Security (8-10)</span>
                    <span className="text-sm font-medium text-gray-300">
                      {securityMetrics.highSecurityCount} scripts
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full" 
                      style={{ width: `${securityMetrics.highSecurityPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-yellow-400">Medium Security (5-7)</span>
                    <span className="text-sm font-medium text-gray-300">
                      {securityMetrics.mediumSecurityCount} scripts
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div 
                      className="bg-yellow-500 h-2.5 rounded-full" 
                      style={{ width: `${securityMetrics.mediumSecurityPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-red-400">Low Security (1-4)</span>
                    <span className="text-sm font-medium text-gray-300">
                      {securityMetrics.lowSecurityCount} scripts
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div 
                      className="bg-red-500 h-2.5 rounded-full" 
                      style={{ width: `${securityMetrics.lowSecurityPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Security Vulnerabilities */}
            <div>
              <h3 className="text-lg font-medium mb-4">Common Security Issues</h3>
              <ul className="space-y-3">
                {securityMetrics.commonIssues.map((issue: any, index: number) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-white">{issue.title}</h4>
                      <p className="text-xs text-gray-400">{issue.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Found in {issue.count} scripts</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Distribution */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Script Categories</h2>
        <div className="bg-gray-700 rounded-lg shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryDistribution.categories.map((category: any) => (
              <div key={category.id} className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2 truncate">{category.name}</h3>
                <div className="flex items-center">
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mr-2">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full" 
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{category.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-gray-700 rounded-lg shadow">
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Script
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {usageStats.recentActivity.map((activity: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        activity.type === 'execution' 
                          ? 'bg-green-900 text-green-300' 
                          : activity.type === 'upload' 
                          ? 'bg-blue-900 text-blue-300'
                          : 'bg-gray-800 text-gray-300'
                      }`}>
                        {activity.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {activity.user}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a href={`/scripts/${activity.scriptId}`} className="text-blue-400 hover:text-blue-300">
                        {activity.scriptTitle}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;