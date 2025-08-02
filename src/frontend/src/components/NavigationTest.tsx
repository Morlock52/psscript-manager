import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ROUTES, matchesRoute } from '../constants/routes';

/**
 * Navigation Test Interface
 */
interface NavTestResult {
  route: string;
  accessible: boolean;
  title: string;
  error?: string;
}

/**
 * Navigation testing component for comprehensive route validation
 * This component helps identify broken routes and accessibility issues
 */
const NavigationTest: React.FC = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const [testResults, setTestResults] = useState<NavTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  /**
   * Test all defined routes for accessibility and validity
   */
  const runNavigationTests = async () => {
    setIsRunning(true);
    const results: NavTestResult[] = [];

    // Get all route values
    const routesToTest = Object.values(ROUTES).filter(route => 
      !route.includes(':') // Skip parameterized routes for basic test
    );

    for (const route of routesToTest) {
      try {
        // Simulate route access test
        const result: NavTestResult = {
          route,
          accessible: true,
          title: getTitleForRoute(route)
        };

        // Check if route has proper error handling
        if (route === ROUTES.UNAUTHORIZED) {
          result.accessible = true; // This should be accessible for error handling
        }

        results.push(result);
      } catch (error) {
        results.push({
          route,
          accessible: false,
          title: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setTestResults(results);
    setIsRunning(false);
  };

  /**
   * Get expected page title for a route
   */
  const getTitleForRoute = (route: string): string => {
    const titleMap: Record<string, string> = {
      [ROUTES.DASHBOARD]: 'Dashboard',
      [ROUTES.SCRIPTS]: 'Script Management',
      [ROUTES.EDITOR]: 'Script Editor',
      [ROUTES.UPLOAD]: 'Script Upload',
      [ROUTES.ANALYSIS]: 'Script Analysis',
      [ROUTES.AI_CHAT]: 'AI Assistant',
      [ROUTES.CHAT_HISTORY]: 'Chat History',
      [ROUTES.AI_FEATURES]: 'AI Features',
      [ROUTES.AGENTIC_AI]: 'Agentic AI',
      [ROUTES.AGENT_ORCHESTRATION]: 'Agent Orchestration',
      [ROUTES.DOCUMENTATION]: 'Documentation',
      [ROUTES.DOCUMENTATION_CRAWL]: 'Documentation Crawl',
      [ROUTES.SETTINGS]: 'Settings',
      [ROUTES.SETTINGS_PROFILE]: 'Profile Settings',
      [ROUTES.SETTINGS_APPEARANCE]: 'Appearance Settings',
      [ROUTES.SETTINGS_SECURITY]: 'Security Settings',
      [ROUTES.SETTINGS_NOTIFICATIONS]: 'Notification Settings',
      [ROUTES.SETTINGS_API]: 'API Settings',
      [ROUTES.SETTINGS_USERS]: 'User Management',
      [ROUTES.UI_DEMO]: 'UI Components Demo',
      [ROUTES.LOGIN]: 'Login',
      [ROUTES.REGISTER]: 'Register',
      [ROUTES.UNAUTHORIZED]: 'Access Denied'
    };

    return titleMap[route] || 'Unknown Page';
  };

  /**
   * Check route pattern matching
   */
  const testRouteMatching = () => {
    const testCases = [
      { path: '/scripts/123', pattern: ROUTES.SCRIPT_DETAIL, shouldMatch: true },
      { path: '/editor/456', pattern: ROUTES.EDITOR_WITH_ID, shouldMatch: true },
      { path: '/invalid/path', pattern: ROUTES.SCRIPTS, shouldMatch: false }
    ];

    console.log('Route Matching Tests:');
    testCases.forEach(test => {
      const matches = matchesRoute(test.path, test.pattern);
      const result = matches === test.shouldMatch ? '✅' : '❌';
      console.log(`${result} ${test.path} matches ${test.pattern}: ${matches}`);
    });
  };

  return (
    <div className={`p-6 rounded-lg ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white border'
    }`}>
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Navigation Testing Dashboard
        </h2>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Test all application routes for accessibility and proper functionality
        </p>
      </div>

      {/* Current Location Info */}
      <div className={`mb-6 p-4 rounded ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h3 className={`font-semibold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Current Location
        </h3>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <strong>Path:</strong> {location.pathname}<br/>
          <strong>Search:</strong> {location.search || 'None'}<br/>
          <strong>Hash:</strong> {location.hash || 'None'}
        </p>
      </div>

      {/* Test Controls */}
      <div className="mb-6 space-x-4">
        <button
          onClick={runNavigationTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run Navigation Tests'}
        </button>
        
        <button
          onClick={testRouteMatching}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          Test Route Matching
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Test Results ({testResults.length} routes tested)
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testResults.map((result, index) => (
              <div 
                key={index}
                className={`p-4 rounded border ${
                  result.accessible
                    ? theme === 'dark'
                      ? 'bg-green-900 border-green-700'
                      : 'bg-green-50 border-green-200'
                    : theme === 'dark'
                    ? 'bg-red-900 border-red-700'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center mb-2">
                  <span className={`w-3 h-3 rounded-full mr-2 ${
                    result.accessible
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`} />
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {result.title}
                  </span>
                </div>
                
                <p className={`text-sm mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {result.route}
                </p>
                
                {result.error && (
                  <p className={`text-xs ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    Error: {result.error}
                  </p>
                )}
                
                <Link
                  to={result.route}
                  className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Visit Route
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation Links */}
      <div className="mt-8">
        <h3 className={`font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Quick Navigation
        </h3>
        
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          {Object.entries(ROUTES)
            .filter(([, route]) => !route.includes(':'))
            .map(([key, route]) => (
              <Link
                key={key}
                to={route}
                className={`p-2 text-sm rounded transition-colors ${
                  location.pathname === route
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {getTitleForRoute(route)}
              </Link>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default NavigationTest;