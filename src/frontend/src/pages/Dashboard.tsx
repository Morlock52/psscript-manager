import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
// import { useAuth } from '../hooks/useAuth'; // Removed
import { scriptService, categoryService, analysisService } from '../services/api-enhanced';

// Components
import ScriptCard from '../components/ScriptCard';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import SecurityScoreChart from '../components/charts/SecurityScoreChart';
import ScriptTrendChart from '../components/charts/ScriptTrendChart';
import ActivityFeed from '../components/ActivityFeed';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  // const { isAuthenticated, user } = useAuth(); // Removed
  const isAuthenticated = true; // Assume authenticated
  // const user = { username: 'User' }; // Mock user object - Removed
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month' | 'year'>('week');

  // Fetch scripts
  const { 
    data: scripts, 
    isLoading: isLoadingScripts,
    error: scriptsError
  } = useQuery({
    queryKey: ['scripts', selectedCategory], 
    queryFn: () => selectedCategory 
      ? scriptService.getScriptsByCategory(selectedCategory)
      : scriptService.getRecentScripts(8),
    // enabled: isAuthenticated, // Removed auth check
    staleTime: 60000,
  });

  // Fetch categories
  const { 
    data: categories, 
    isLoading: isLoadingCategories 
  } = useQuery({
    queryKey: ['categories'], 
    queryFn: () => categoryService.getCategories(),
    staleTime: 300000, // 5 minutes
  });

  // Fetch statistics
  const { 
    data: stats, 
    isLoading: isLoadingStats 
  } = useQuery({
    queryKey: ['dashboard-stats'], 
    queryFn: () => scriptService.getDashboardStats(),
    staleTime: 300000, // 5 minutes
  });

  // Fetch recent activity
  const { 
    data: activity, 
    isLoading: isLoadingActivity 
  } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => scriptService.getRecentActivity(),
    // enabled: isAuthenticated, // Removed auth check
    staleTime: 60000,
  });

  // Fetch security metrics
  const { 
    data: securityMetrics, 
    isLoading: isLoadingSecurityMetrics 
  } = useQuery({
    queryKey: ['security-metrics'], 
    queryFn: () => analysisService.getSecurityMetrics(),
    staleTime: 300000, // 5 minutes
  });

  // Fetch trend data
  const { 
    data: trendData, 
    isLoading: isLoadingTrendData,
    refetch: refetchTrendData
  } = useQuery({
    queryKey: ['script-trends', trendPeriod],
    queryFn: () => scriptService.getScriptTrends(trendPeriod),
    staleTime: 300000, // 5 minutes
  });

  const isLoading = isLoadingScripts || isLoadingCategories || isLoadingStats || isLoadingActivity || isLoadingSecurityMetrics || isLoadingTrendData;

  return (
    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {/* Removed personalized welcome */}
          Welcome to PSScript
        </h1>
        <p className="text-lg opacity-75">
          AI-powered PowerShell script management and analysis platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Scripts" 
          value={stats?.totalScripts || 0} 
          icon="script" 
          change={stats?.scriptsChange || 0}
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="Categories" 
          value={stats?.totalCategories || 0} 
          icon="category" 
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="Avg. Security Score" 
          value={stats?.avgSecurityScore?.toFixed(1) || '0.0'} 
          icon="security"
          suffix="/10"
          change={stats?.securityScoreChange || 0}
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="AI Analyses" 
          value={stats?.totalAnalyses || 0} 
          icon="analysis"
          change={stats?.analysesChange || 0} 
          isLoading={isLoadingStats}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Scripts */}
        <div className="lg:col-span-2">
          <div className={`p-6 rounded-lg shadow-md mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Scripts</h2>
              <Link 
                to="/scripts" 
                className={`text-sm px-3 py-1 rounded ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                }`}
              >
                View All
              </Link>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedCategory === null
                    ? theme === 'dark' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                All
              </button>
              
              {categories?.categories?.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    selectedCategory === category.id
                      ? theme === 'dark' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Scripts Grid */}
            {isLoadingScripts ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : scriptsError ? (
              <div className="text-center py-8 text-red-500">
                Error loading scripts. Please try again.
              </div>
            ) : scripts?.length === 0 ? (
              <div className="text-center py-8 opacity-70">
                {selectedCategory 
                  ? "No scripts found in this category." 
                  : "No scripts found. Create your first script!"}
                <div className="mt-4">
                  <Link 
                    to="/chat" 
                    className={`inline-block px-4 py-2 rounded ${
                      theme === 'dark' 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                        : 'bg-blue-500 hover:bg-blue-400 text-white'
                    }`}
                  >
                    Create with AI
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scripts?.map(script => (
                  <ScriptCard 
                    key={script.id} 
                    script={script} 
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Security Metrics */}
          <div className={`p-6 rounded-lg shadow-md mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Security Metrics</h2>
            
            {isLoadingSecurityMetrics ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="h-64">
                <SecurityScoreChart data={securityMetrics?.securityScores || []} theme={theme} />
              </div>
            )}
          </div>

          {/* Script Trends */}
          <div className={`p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Script Activity Trends</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTrendPeriod('week')}
                  className={`px-2 py-1 text-xs rounded ${
                    trendPeriod === 'week'
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTrendPeriod('month')}
                  className={`px-2 py-1 text-xs rounded ${
                    trendPeriod === 'month'
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setTrendPeriod('year')}
                  className={`px-2 py-1 text-xs rounded ${
                    trendPeriod === 'year'
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Year
                </button>
              </div>
            </div>
            
            {isLoadingTrendData ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="h-64">
                <ScriptTrendChart 
                  data={trendData || {
                    uploads: [],
                    executions: [],
                    analyses: []
                  }} 
                  theme={theme}
                  period={trendPeriod}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Activity & Stats */}
        <div>
          {/* Category Distribution */}
          <div className={`p-6 rounded-lg shadow-md mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">Script Categories</h2>
            
            {isLoadingCategories ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="h-64">
                <CategoryPieChart data={categories?.categories || []} theme={theme} />
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className={`p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Activity</h2>
              {/* Removed isAuthenticated check */}
              {/* {isAuthenticated && ( */}
                <Link
                  to="/scripts"
                  className={`text-sm px-3 py-1 rounded ${
                    theme === 'dark' 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                  }`}
                >
                  View All
                </Link>
              {/* )} */}
            </div>

            {/* Removed !isAuthenticated block */}
            {isLoadingActivity ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <ActivityFeed activities={activity || []} theme={theme} />
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`mt-8 p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            to="/chat" 
            className={`p-4 rounded-lg flex flex-col items-center text-center transition-transform transform hover:scale-105 ${
              theme === 'dark' 
                ? 'bg-blue-900 hover:bg-blue-800' 
                : 'bg-blue-100 hover:bg-blue-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              theme === 'dark' ? 'bg-blue-800' : 'bg-blue-200'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="font-medium">Chat with AI</h3>
            <p className="text-sm opacity-75 mt-1">Get help with PowerShell scripts</p>
          </Link>
          
          <Link 
            to="/scripts" 
            className={`p-4 rounded-lg flex flex-col items-center text-center transition-transform transform hover:scale-105 ${
              theme === 'dark' 
                ? 'bg-green-900 hover:bg-green-800' 
                : 'bg-green-100 hover:bg-green-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              theme === 'dark' ? 'bg-green-800' : 'bg-green-200'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-medium">Manage Scripts</h3>
            <p className="text-sm opacity-75 mt-1">Browse and organize your scripts</p>
          </Link>
          
          <Link 
            to="/documentation" 
            className={`p-4 rounded-lg flex flex-col items-center text-center transition-transform transform hover:scale-105 ${
              theme === 'dark' 
                ? 'bg-purple-900 hover:bg-purple-800' 
                : 'bg-purple-100 hover:bg-purple-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              theme === 'dark' ? 'bg-purple-800' : 'bg-purple-200'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-medium">Documentation</h3>
            <p className="text-sm opacity-75 mt-1">PowerShell reference and guides</p>
          </Link>

          <Link
            to={"/settings"} // Always link to settings
            className={`p-4 rounded-lg flex flex-col items-center text-center transition-transform transform hover:scale-105 ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-medium">Settings</h3> {/* Changed text */}
            <p className="text-sm opacity-75 mt-1">Configure your account</p> {/* Changed text */}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
