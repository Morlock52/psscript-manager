import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface AIStatus {
  mode: 'mock' | 'real';
  status: 'active' | 'mock' | 'error';
  serviceHealthy: boolean;
  responseTime?: number;
}

const AIStatusIndicator: React.FC = () => {
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    mode: 'real',
    status: 'error',
    serviceHealthy: false
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await apiClient.get('/settings/ai-status');
      setAiStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
      setAiStatus(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isLoading) return 'bg-yellow-500';
    switch (aiStatus.status) {
      case 'active':
        return 'bg-green-500';
      case 'mock':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking...';
    switch (aiStatus.status) {
      case 'active':
        return 'AI Active';
      case 'mock':
        return 'Mock Mode';
      case 'error':
        return 'AI Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-700 bg-opacity-50">
      <div className={`relative flex h-3 w-3`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusColor()}`}></span>
        <span className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor()}`}></span>
      </div>
      <span className="text-xs text-gray-300">
        {getStatusText()}
        {aiStatus.status === 'active' && aiStatus.responseTime && (
          <span className="text-gray-500 ml-1">({aiStatus.responseTime}ms)</span>
        )}
      </span>
    </div>
  );
};

export default AIStatusIndicator;