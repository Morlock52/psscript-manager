import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scriptService } from '../services/api';
import BatchDownloadButton from '../components/BatchDownloadButton';

interface Script {
  id: string;
  title: string;
  description: string;
  content: string; // Added content property for download
  category?: { 
    name: string;
    id: string;
  };
  tags?: string[];
  analysis?: {
    code_quality_score: number;
    security_score: number;
    ai_suggestions: string[];
  };
  updatedAt: string;
  createdAt: string;
}

const ManageFiles: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedScriptForAI, setSelectedScriptForAI] = useState<Script | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isApplyingAI, setIsApplyingAI] = useState(false);

  // Fetch scripts with React Query
  const { 
    data: scriptsData,
    isLoading,
    error 
  } = useQuery({
    queryKey: ['allScripts'], 
    queryFn: () => scriptService.getScripts({ limit: 100 }),
    staleTime: 30000
  });

  // Delete mutation with improved feedback and error handling
  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => scriptService.bulkDeleteScripts(ids),
    onSuccess: (data, variables) => {
        // variables contains the ids that were passed to the mutation
        const deletedIds = variables;
        
        // Update the local state immediately for a more responsive UI
        if (data && data.success) {
          // Show success notification
          const message = deletedIds.length > 1 
            ? `Successfully deleted ${deletedIds.length} scripts` 
            : 'Script deleted successfully';
          
          // You could add a toast notification here if you have a toast library
          console.log(message);
          
          // Remove deleted scripts from the local state if they exist
          if (scriptsData && scriptsData.scripts) {
            const updatedScripts = scriptsData.scripts.filter(script => !deletedIds.includes(script.id));
            queryClient.setQueryData(['allScripts'], { ...scriptsData, scripts: updatedScripts });
          }
          
          // Invalidate the query to refresh data from server
          queryClient.invalidateQueries({ queryKey: ['allScripts'] });
          
          // Clear selection
          setSelectedScripts([]);
        }
      },
      onError: (error) => {
        console.error('Error deleting scripts:', error);
        alert('Failed to delete script(s). Please try again.');
      }
    }
  );

  // AI analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: (scriptId: string) => scriptService.getScriptAnalysis(scriptId),
    onSuccess: (data) => {
        setAiSuggestions(data.ai_suggestions || []);
        setShowAIModal(true);
        setIsApplyingAI(false);
      },
      onError: () => {
        setIsApplyingAI(false);
      }
    }
  );

  // Apply AI suggestions mutation
  const applyAiSuggestionsMutation = useMutation({
    mutationFn: (params: { scriptId: string, suggestions: string[] }) => 
      scriptService.applyAiSuggestions(params.scriptId, params.suggestions),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['allScripts'] });
        setShowAIModal(false);
        setSelectedScriptForAI(null);
        setAiSuggestions([]);
      }
    }
  );

  const scripts = scriptsData?.scripts || [];

  const filteredScripts = scripts.filter(script => 
    script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (script.description && script.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (script.category?.name && script.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleScriptSelection = (scriptId: string) => {
    if (selectedScripts.includes(scriptId)) {
      setSelectedScripts(selectedScripts.filter(id => id !== scriptId));
    } else {
      setSelectedScripts([...selectedScripts, scriptId]);
    }
  };

  const selectAllScripts = () => {
    if (selectedScripts.length === filteredScripts.length) {
      setSelectedScripts([]);
    } else {
      setSelectedScripts(filteredScripts.map(script => script.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedScripts.length === 0) {
      alert('Please select at least one script to delete.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedScripts.length} script(s)? This action cannot be undone.`)) {
      // Show loading state if needed
      deleteMutation.mutate(selectedScripts);
    }
  };

  const handleAIAnalysis = (script: Script) => {
    setSelectedScriptForAI(script);
    setIsApplyingAI(true);
    aiAnalysisMutation.mutate(script.id);
  };

  const applyAISuggestions = () => {
    if (selectedScriptForAI && aiSuggestions.length > 0) {
      applyAiSuggestionsMutation.mutate({
        scriptId: selectedScriptForAI.id,
        suggestions: aiSuggestions
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 text-white p-4 rounded-lg my-4">
        <h3 className="font-bold mb-2">Error Loading Files</h3>
        <p>There was a problem loading your files. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link
            to="/dashboard"
            className="mr-4 text-blue-400 hover:text-blue-300 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Manage Files</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/scripts/upload')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Upload New
          </button>
          {selectedScripts.length > 0 && (
            <>
              <BatchDownloadButton 
                scripts={selectedScripts.map(id => {
                  const script = filteredScripts.find(s => s.id === id);
                  return {
                    id: parseInt(id),
                    title: script?.title || `Script_${id}`,
                    content: script?.content || '# Script content not available'
                  };
                })}
              />
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Selected
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="bg-gray-700 rounded-lg p-4 shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search scripts..."
                aria-label="Search scripts"
                title="Search scripts"
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <button
              onClick={selectAllScripts}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {selectedScripts.length === filteredScripts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Files table */}
      <div className="bg-gray-700 rounded-lg p-6 shadow">
        {filteredScripts.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <p>No scripts found. Upload your first script to get started!</p>
            <Link
              to="/scripts/upload"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Script
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedScripts.length === filteredScripts.length && filteredScripts.length > 0}
                      aria-label="Select all scripts"
                      title="Select all scripts"
                      onChange={selectAllScripts}
                      className="w-4 h-4 rounded"
                    />
                  </th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Quality</th>
                  <th className="px-4 py-2">Updated</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {filteredScripts.map((script: any) => (
                  <tr key={script.id} className="hover:bg-gray-600">
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        checked={selectedScripts.includes(script.id)}
                        aria-label={`Select script ${script.title}`}
                        title={`Select script ${script.title}`}
                        onChange={() => toggleScriptSelection(script.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/scripts/${script.id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        {script.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{script.category?.name || 'Uncategorized'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            script.analysis?.code_quality_score >= 7
                              ? 'bg-green-500'
                              : script.analysis?.code_quality_score >= 4
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        <span className="text-gray-300">
                          {script.analysis?.code_quality_score?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(script.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/scripts/${script.id}/edit`)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            ></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleAIAnalysis(script)}
                          className="text-green-400 hover:text-green-300"
                          title="AI Enhance"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            ></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const { content, title } = script;
                            const downloadScript = (scriptContent: string, fileName: string) => {
                              const blob = new Blob([scriptContent], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${fileName.replace(/\s+/g, '_')}.ps1`;
                              document.body.appendChild(a);
                              a.click();
                              URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            };
                            downloadScript(content, title);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                          title="Download"
                        >
                          <svg 
                            className="w-5 h-5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
                              // Remove from UI immediately for better UX
                              const updatedScripts = scripts.filter(s => s.id !== script.id);
                              queryClient.setQueryData(['allScripts'], { ...scriptsData, scripts: updatedScripts });
                              
                              // Then perform the actual deletion
                              deleteMutation.mutate([script.id]);
                            }
                          }}
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                          data-testid={`delete-script-${script.id}`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Enhancement Modal */}
      {showAIModal && selectedScriptForAI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">AI Enhancement Suggestions</h2>
            <p className="mb-4 text-gray-300">
              Our AI has analyzed your script "{selectedScriptForAI.title}" and has the following improvement suggestions:
            </p>
            
            {aiSuggestions.length === 0 ? (
              <p className="text-yellow-400 mb-4">No suggestions found. Your script is already well-optimized!</p>
            ) : (
              <div className="mb-4">
                <ul className="list-disc pl-5 space-y-2 text-gray-300 mb-4">
                  {aiSuggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
                <p className="text-gray-400 text-sm mb-4">
                  Applying these suggestions will modify your script to implement the recommended changes.
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              
              {aiSuggestions.length > 0 && (
                <button
                  onClick={applyAISuggestions}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Apply Suggestions
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for AI analysis */}
      {isApplyingAI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-white font-medium">Analyzing script with AI...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageFiles;