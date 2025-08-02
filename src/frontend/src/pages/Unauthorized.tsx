import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from '../constants/routes';

/**
 * Unauthorized page component - Modern React 18 implementation
 * Displayed when users try to access restricted resources
 */
const Unauthorized: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-md w-full text-center">
        {/* Error illustration */}
        <div className={`mx-auto w-24 h-24 mb-8 rounded-full flex items-center justify-center ${
          theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'
        }`}>
          <svg 
            className={`w-12 h-12 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5C2.962 18.333 3.924 20 5.464 20z" 
            />
          </svg>
        </div>

        {/* Error content */}
        <h1 className={`text-6xl font-bold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          403
        </h1>
        
        <h2 className={`text-2xl font-semibold mb-4 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Access Denied
        </h2>
        
        <p className={`text-lg mb-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          You don't have permission to access this resource. 
          Please contact your administrator if you believe this is an error.
        </p>

        {/* Action buttons */}
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <button
            onClick={handleGoBack}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-2 focus:ring-gray-500'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500'
            } focus:outline-none focus:ring-offset-2`}
            aria-label="Go back to previous page"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
          
          <button
            onClick={handleGoHome}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            } focus:outline-none focus:ring-offset-2`}
            aria-label="Go to dashboard"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Dashboard
          </button>
        </div>

        {/* Help link */}
        <div className="mt-8">
          <Link
            to={ROUTES.DOCUMENTATION}
            className={`text-sm hover:underline transition-colors duration-200 ${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            }`}
            aria-label="View documentation for help"
          >
            Need help? Check our documentation
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;