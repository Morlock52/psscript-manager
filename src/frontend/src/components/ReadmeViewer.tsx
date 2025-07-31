import React, { useState, useEffect } from 'react';
import { getReadmeContent } from '../services/readmeService';

interface ReadmeViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ isOpen, onClose }) => {
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      
      // Fetch README content
      getReadmeContent()
        .then(content => {
          setReadmeContent(content);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error loading README:", error);
          setReadmeContent("# Error Loading README\n\nPlease try again later.");
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Convert markdown headings to HTML
  const formatMarkdown = (content: string) => {
    // Replace markdown headings with styled HTML
    const html = content
      // Format h1 headers
      .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">$1</h1>')
      // Format h2 headers
      .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold mt-6 mb-3">$1</h2>')
      // Format h3 headers
      .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-5 mb-2">$1</h3>')
      // Format bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Format italic text
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Format code blocks
      .replace(/```([^`]+)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto text-sm mb-4">$1</pre>')
      // Format inline code
      .replace(/`([^`]+)`/g, '<code class="font-mono bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm">$1</code>')
      // Format links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
      // Format unordered lists (basic)
      .replace(/^\- (.+)$/gm, '<li class="ml-6 list-disc">$1</li>')
      // Format paragraphs (lines not captured by other patterns)
      .replace(/^([^<\n].+)$/gm, '<p class="mb-4">$1</p>')
      // Add blank line after lists
      .replace(/<\/li>\n/g, '</li>\n<div class="mb-2"></div>\n');

    return html;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📄 Project README
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 markdown-body flex-grow text-gray-900 dark:text-gray-100">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(readmeContent) }} />
          )}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadmeViewer;