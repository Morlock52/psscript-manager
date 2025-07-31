import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface PageLoadingFallbackProps {
  pageName?: string;
}

const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({ pageName }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="large" message={pageName ? `Loading ${pageName}...` : 'Loading page...'} />
        <div className="mt-8 space-y-2">
          <div className="h-2 bg-gray-200 rounded-full max-w-xs mx-auto overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-progress-bar"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoadingFallback;