import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DocumentationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Documentation Error:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="flex flex-col items-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Documentation Error
              </h1>
              <p className="text-gray-400 text-center mb-6">
                Something went wrong while loading the documentation.
              </p>
              
              {process.env['NODE_ENV'] === 'development' && this.state.error && (
                <details className="w-full mb-6">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                    Error Details
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-900 rounded text-xs text-red-400 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DocumentationErrorBoundary;