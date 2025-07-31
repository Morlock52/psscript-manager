import React, { useState } from 'react';
import { downloadMultipleScripts } from '../services/downloadService';

interface BatchDownloadButtonProps {
  scripts: Array<{ id: number; title: string; content: string }>;
  className?: string;
  disabled?: boolean;
}

const BatchDownloadButton: React.FC<BatchDownloadButtonProps> = ({
  scripts,
  className = '',
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      
      // Check if we have any scripts to download
      if (scripts.length === 0) {
        console.warn('No scripts selected for download');
        return;
      }
      
      // Generate a timestamp for the zip file name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const zipName = `powershell-scripts-${timestamp}`;
      
      // Download the scripts as a zip file
      await downloadMultipleScripts(scripts, zipName);
    } catch (error) {
      console.error('Failed to download scripts:', error);
      // Here you could show an error toast/notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors ${
        isLoading ? 'opacity-70 cursor-not-allowed' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={handleDownload}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      <span>Download {scripts.length > 0 ? `(${scripts.length})` : 'Selected'}</span>
    </button>
  );
};

export default BatchDownloadButton;