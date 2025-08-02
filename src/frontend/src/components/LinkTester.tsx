import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { useTheme } from '../hooks/useTheme';

interface TestResult {
  route: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  timestamp: Date;
}

interface LinkTest {
  name: string;
  route: string;
  expectedStatus: 'success' | 'protected' | 'redirect';
  description: string;
}

const LinkTester: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  // Define all routes to test
  const linkTests: LinkTest[] = [
    // Public Routes
    { name: 'Login', route: ROUTES.LOGIN, expectedStatus: 'success', description: 'Login page should be accessible' },
    { name: 'Register', route: ROUTES.REGISTER, expectedStatus: 'success', description: 'Registration page should be accessible' },
    
    // Main Navigation (Protected)
    { name: 'Dashboard', route: ROUTES.DASHBOARD, expectedStatus: 'protected', description: 'Main dashboard page' },
    { name: 'Scripts', route: ROUTES.SCRIPTS, expectedStatus: 'protected', description: 'Script management page' },
    { name: 'Script Upload', route: ROUTES.UPLOAD, expectedStatus: 'protected', description: 'Script upload functionality' },
    { name: 'Editor', route: ROUTES.EDITOR, expectedStatus: 'protected', description: 'Script editor interface' },
    { name: 'Analysis', route: ROUTES.ANALYSIS, expectedStatus: 'protected', description: 'Script analysis page' },
    
    // AI Features
    { name: 'AI Chat', route: ROUTES.AI_CHAT, expectedStatus: 'protected', description: 'AI chat assistant' },
    { name: 'Chat History', route: ROUTES.CHAT_HISTORY, expectedStatus: 'protected', description: 'Chat history page' },
    { name: 'AI Features', route: ROUTES.AI_FEATURES, expectedStatus: 'protected', description: 'AI features overview' },
    { name: 'Agentic AI', route: ROUTES.AGENTIC_AI, expectedStatus: 'protected', description: 'Agentic AI interface' },
    { name: 'Agent Orchestration', route: ROUTES.AGENT_ORCHESTRATION, expectedStatus: 'protected', description: 'Agent orchestration page' },
    
    // Documentation
    { name: 'Documentation', route: ROUTES.DOCUMENTATION, expectedStatus: 'protected', description: 'Documentation pages' },
    { name: 'Documentation Crawl', route: ROUTES.DOCUMENTATION_CRAWL, expectedStatus: 'protected', description: 'Documentation crawler' },
    
    // Settings
    { name: 'Settings', route: ROUTES.SETTINGS, expectedStatus: 'redirect', description: 'Settings (redirects to profile)' },
    { name: 'Profile Settings', route: ROUTES.SETTINGS_PROFILE, expectedStatus: 'protected', description: 'User profile settings' },
    { name: 'Appearance Settings', route: ROUTES.SETTINGS_APPEARANCE, expectedStatus: 'protected', description: 'Theme and appearance' },
    { name: 'Security Settings', route: ROUTES.SETTINGS_SECURITY, expectedStatus: 'protected', description: 'Security configuration' },
    { name: 'Notification Settings', route: ROUTES.SETTINGS_NOTIFICATIONS, expectedStatus: 'protected', description: 'Notification preferences' },
    { name: 'API Settings', route: ROUTES.SETTINGS_API, expectedStatus: 'protected', description: 'API configuration' },
    { name: 'User Management', route: ROUTES.SETTINGS_USERS, expectedStatus: 'protected', description: 'User management (admin)' },
    
    // Demo
    { name: 'UI Demo', route: ROUTES.UI_DEMO, expectedStatus: 'protected', description: 'UI components demo' },
    
    // Error Routes
    { name: 'Unauthorized', route: '/unauthorized', expectedStatus: 'success', description: 'Unauthorized access page' },
    { name: '404 Test', route: '/non-existent-route', expectedStatus: 'success', description: 'Should show 404 page' },
  ];

  // Test a single route
  const testRoute = async (test: LinkTest): Promise<TestResult> => {
    return new Promise((resolve) => {
      const originalPath = location.pathname;
      
      try {
        // Attempt navigation
        navigate(test.route);
        
        // Simulate async check
        setTimeout(() => {
          const currentPath = window.location.pathname;
          let status: 'success' | 'error' | 'warning' = 'success';
          let message = `Route accessible: ${test.route}`;
          
          // Check if route exists (basic check)
          if (test.route !== '/non-existent-route' && currentPath === test.route) {
            status = 'success';
            message = `✓ Route works correctly: ${test.route}`;
          } else if (test.expectedStatus === 'redirect' && currentPath !== test.route) {
            status = 'success';
            message = `✓ Route redirects as expected: ${test.route} → ${currentPath}`;
          } else if (test.expectedStatus === 'protected' && currentPath === '/login') {
            status = 'warning';
            message = `⚠ Route requires authentication: ${test.route}`;
          } else if (test.route === '/non-existent-route' && currentPath !== test.route) {
            status = 'success';
            message = `✓ 404 handling works correctly`;
          } else {
            status = 'error';
            message = `✗ Route failed or behaved unexpectedly: ${test.route}`;
          }
          
          resolve({
            route: test.route,
            status,
            message,
            timestamp: new Date()
          });
        }, 500);
      } catch (error) {
        resolve({
          route: test.route,
          status: 'error',
          message: `✗ Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        });
      }
    });
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    for (const test of linkTests) {
      setCurrentTest(test.name);
      const result = await testRoute(test);
      setTestResults(prev => [...prev, result]);
    }
    
    setIsRunning(false);
    setCurrentTest('');
  };

  // Clear results
  const clearResults = () => {
    setTestResults([]);
  };

  // Get status color
  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'pending': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get background color for status
  const getStatusBg = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 dark:bg-green-900/20';
      case 'error': return 'bg-red-100 dark:bg-red-900/20';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'pending': return 'bg-blue-100 dark:bg-blue-900/20';
      default: return 'bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // Count results by status
  const resultCounts = testResults.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">PSScript Link & Navigation Tester</h1>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Comprehensive testing tool for all navigation links, routes, and UI components
          </p>
        </div>

        {/* Controls */}
        <div className={`p-6 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isRunning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </button>
              
              <button
                onClick={clearResults}
                disabled={isRunning}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Clear Results
              </button>
            </div>

            {/* Status Summary */}
            {testResults.length > 0 && (
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 dark:text-green-400">
                  ✓ {resultCounts.success || 0} Passed
                </span>
                <span className="text-yellow-600 dark:text-yellow-400">
                  ⚠ {resultCounts.warning || 0} Warnings
                </span>
                <span className="text-red-600 dark:text-red-400">
                  ✗ {resultCounts.error || 0} Failed
                </span>
              </div>
            )}
          </div>

          {/* Current Test */}
          {isRunning && currentTest && (
            <div className="mt-4 p-3 rounded bg-blue-100 dark:bg-blue-900/20">
              <p className="text-blue-800 dark:text-blue-200">
                Currently testing: <span className="font-medium">{currentTest}</span>
              </p>
            </div>
          )}
        </div>

        {/* Test Plan */}
        <div className={`p-6 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className="text-xl font-semibold mb-4">Test Plan ({linkTests.length} tests)</h2>
          <div className="grid gap-3">
            {linkTests.map((test, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  test.expectedStatus === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                  test.expectedStatus === 'protected' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' :
                  'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {test.description}
                    </p>
                    <code className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {test.route}
                    </code>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    test.expectedStatus === 'success' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
                    test.expectedStatus === 'protected' ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200' :
                    'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                  }`}>
                    {test.expectedStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.status === 'success' ? 'border-green-500' :
                    result.status === 'error' ? 'border-red-500' :
                    result.status === 'warning' ? 'border-yellow-500' :
                    'border-blue-500'
                  } ${getStatusBg(result.status)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`font-medium ${getStatusColor(result.status)}`}>
                        {result.message}
                      </p>
                      <code className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {result.route}
                      </code>
                    </div>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Navigation Links */}
        <div className={`p-6 rounded-lg mt-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className="text-xl font-semibold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {linkTests.slice(0, 12).map((test, index) => (
              <button
                key={index}
                onClick={() => navigate(test.route)}
                className={`p-3 rounded text-left transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                <div className="font-medium text-sm">{test.name}</div>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {test.route}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkTester;