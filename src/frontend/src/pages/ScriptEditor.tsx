import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Card } from '../components/ui-enhanced';

const ScriptEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [script, setScript] = useState<any>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Placeholder for script loading logic
    // In a real implementation, this would fetch the script from the API
    setIsLoading(false);
    setScript({
      id,
      name: 'Example Script',
      description: 'This is a placeholder for the script editor.',
      content: '# Example PowerShell Script\n\nWrite-Host "Hello, World!"'
    });
    setContent('# Example PowerShell Script\n\nWrite-Host "Hello, World!"');
  }, [id]);
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };
  
  const handleSave = () => {
    // Placeholder for save logic
    console.log('Saving script:', { id, content });
    // In a real implementation, this would send the updated content to the API
  };
  
  const handleCancel = () => {
    navigate(`/scripts/${id}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className={`text-red-500 text-center p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg`}>
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Edit Script: {script?.name}</h1>
          <div className="space-x-2">
            <button
              onClick={handleCancel}
              className={`px-4 py-2 rounded-md ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="description" className="block mb-2 font-medium">
            Description
          </label>
          <input
            type="text"
            id="description"
            value={script?.description || ''}
            readOnly
            className={`w-full px-3 py-2 rounded-md ${
              isDark
                ? 'bg-gray-700 text-white border-gray-600'
                : 'bg-white text-gray-900 border-gray-300'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
        
        <div>
          <label htmlFor="content" className="block mb-2 font-medium">
            Script Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={handleContentChange}
            rows={20}
            className={`w-full px-3 py-2 rounded-md font-mono ${
              isDark
                ? 'bg-gray-800 text-white border-gray-700'
                : 'bg-gray-50 text-gray-900 border-gray-300'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
          ></textarea>
        </div>
      </Card>
    </div>
  );
};

export default ScriptEditor;
