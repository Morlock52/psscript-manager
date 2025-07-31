import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// Define Script interface
interface Script {
  id: string;
  title: string;
  description: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
  category_id: number;
  category_name?: string;
  tags?: string[];
  is_public: boolean;
  version: number;
  security_score?: number;
  quality_score?: number;
  views?: number;
  executions?: number;
  file_hash?: string;
}

// Define props for ScriptCard
interface ScriptCardProps {
  script: Script;
  theme: 'light' | 'dark';
  showActions?: boolean;
  onExecute?: (id: string) => void;
  onAnalyze?: (id: string) => void;
}

const ScriptCard: React.FC<ScriptCardProps> = ({ 
  script, 
  theme,
  showActions = true,
  onExecute,
  onAnalyze
}) => {
  // Format date with error handling
  let formattedDate = 'Unknown date';
  try {
    const dateString = script.updated_at || script.created_at;
    if (dateString) {
      const date = new Date(dateString);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        formattedDate = formatDistanceToNow(date, { addSuffix: true });
      }
    }
  } catch (error) {
    console.warn('Error formatting date:', error);
  }
  
  // Get security score color
  const getSecurityScoreColor = (score?: number) => {
    if (score === undefined) return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    if (score >= 8) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Get quality score color
  const getQualityScoreColor = (score?: number) => {
    if (score === undefined) return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    if (score >= 8) return 'text-blue-500';
    if (score >= 5) return 'text-blue-400';
    return 'text-blue-300';
  };
  
  // Handle execute click
  const handleExecuteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onExecute) onExecute(script.id);
  };
  
  // Handle analyze click
  const handleAnalyzeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAnalyze) onAnalyze(script.id);
  };
  
  return (
    <Link 
      to={`/scripts/${script.id}`}
      className={`block rounded-lg overflow-hidden shadow-md transition-transform transform hover:scale-105 ${
        theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold truncate">{script.title}</h3>
          <div className="flex items-center">
            {script.is_public ? (
              <span className={`text-xs px-2 py-1 rounded ${
                theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
              }`}>
                Public
              </span>
            ) : (
              <span className={`text-xs px-2 py-1 rounded ${
                theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}>
                Private
              </span>
            )}
          </div>
        </div>
        
        {/* Description */}
        <p className={`text-sm mb-3 line-clamp-2 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {script.description || 'No description provided.'}
        </p>
        
        {/* Tags */}
        {script.tags && script.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {script.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tag}
              </span>
            ))}
            {script.tags.length > 3 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-gray-300' 
                  : 'bg-gray-200 text-gray-700'
              }`}>
                +{script.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Metadata */}
        <div className="flex justify-between items-center text-xs">
          <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
            {script.category_name && (
              <span className="mr-2">
                {script.category_name}
              </span>
            )}
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Security Score */}
            {script.security_score !== undefined && (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${getSecurityScoreColor(script.security_score)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className={`ml-1 ${getSecurityScoreColor(script.security_score)}`}>
                  {script.security_score.toFixed(1)}
                </span>
              </div>
            )}
            
            {/* Quality Score */}
            {script.quality_score !== undefined && (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${getQualityScoreColor(script.quality_score)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`ml-1 ${getQualityScoreColor(script.quality_score)}`}>
                  {script.quality_score.toFixed(1)}
                </span>
              </div>
            )}
            
            {/* Views */}
            {script.views !== undefined && (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className={`ml-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {script.views}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="mt-3 flex justify-end space-x-2">
            {onExecute && (
              <button
                onClick={handleExecuteClick}
                className={`text-xs px-2 py-1 rounded ${
                  theme === 'dark' 
                    ? 'bg-green-900 text-green-300 hover:bg-green-800' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                Execute
              </button>
            )}
            
            {onAnalyze && (
              <button
                onClick={handleAnalyzeClick}
                className={`text-xs px-2 py-1 rounded ${
                  theme === 'dark' 
                    ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                Analyze
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ScriptCard;
