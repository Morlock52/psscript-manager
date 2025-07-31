import React, { useState } from 'react';
import { downloadScript, downloadAsModule } from '../services/downloadService';

interface ScriptDownloadButtonProps {
  scriptContent: string;
  scriptTitle: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showOptions?: boolean;
}

const ScriptDownloadButton: React.FC<ScriptDownloadButtonProps> = ({
  scriptContent,
  scriptTitle,
  className = '',
  variant = 'primary',
  size = 'md',
  showOptions = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Determine button styling based on variant
  const getButtonStyle = () => {
    const sizeClasses = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-2 text-lg'
    };
    
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      outline: 'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 dark:text-blue-400 dark:border-blue-400'
    };
    
    return `rounded ${sizeClasses[size]} ${variantClasses[variant]} transition-colors ${className}`;
  };

  // Simple download as .ps1 file
  const handleSimpleDownload = () => {
    downloadScript(scriptContent, scriptTitle);
  };

  // Download as .psm1 module file
  const handleModuleDownload = () => {
    downloadAsModule(scriptContent, scriptTitle);
    setIsOpen(false);
  };

  // If not showing options, just use a simple download button
  if (!showOptions) {
    return (
      <button 
        className={getButtonStyle()}
        onClick={handleSimpleDownload}
        aria-label="Download script"
      >
        <div className="flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download</span>
        </div>
      </button>
    );
  }

  // Show dropdown with options
  return (
    <div className="relative inline-block">
      <button
        className={getButtonStyle()}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleSimpleDownload}
              role="menuitem"
            >
              Download as .ps1 Script
            </button>
            <button
              className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleModuleDownload}
              role="menuitem"
            >
              Download as .psm1 Module
            </button>
          </div>
        </div>
      )}
      
      {/* Overlay to capture clicks outside the dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default ScriptDownloadButton;