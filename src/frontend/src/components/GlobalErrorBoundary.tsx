import React, { Component, ReactNode, ErrorInfo } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Functional component for error recovery UI
const ErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ error, resetError }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    resetError();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Oops! Something went wrong
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We're sorry for the inconvenience. The application encountered an unexpected error.
          </p>
          {error && (
            <details className="mt-4 text-xs text-gray-500 dark:text-gray-500 text-left max-w-full overflow-hidden">
              <summary className="cursor-pointer hover:underline">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {error.message}
              </pre>
            </details>
          )}
        </div>
        <div className="mt-8 space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reload Page
          </button>
          <button
            onClick={handleGoHome}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by GlobalErrorBoundary:', error, errorInfo);
    }
    
    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
    
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false } as State);
  };

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;