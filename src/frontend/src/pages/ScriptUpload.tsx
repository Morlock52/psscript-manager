import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { scriptService, categoryService, tagService } from '../services/api';
import DuplicateScriptModal from '../components/DuplicateScriptModal';

const ScriptUpload: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [analyzeWithAI, setAnalyzeWithAI] = useState(true);
  const [customTag, setCustomTag] = useState('');
  const [fileError, setFileError] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAnalysisPreview, setShowAnalysisPreview] = useState(false);
  const [analysisPreview, setAnalysisPreview] = useState<any>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Duplicate script modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateScriptInfo, setDuplicateScriptInfo] = useState<{
    id?: string;
    title?: string;
    message?: string;
  }>({});
  
  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories()
  });
  
  // Fetch tags
  const { data: existingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagService.getTags()
  });
  
  // Script upload mutation
  const uploadMutation = useMutation({
    mutationFn: (scriptData: any) => scriptService.uploadScript(scriptData, isLargeFile),
    onSuccess: (data) => {
        console.log("Script uploaded successfully:", data);
        // Reset states
        setUploadProgress(0);
        setIsNetworkError(false);
        setRetryCount(0);
        
        // Navigate to the script detail page
        const scriptId = data.script?.id || data.id;
        if (scriptId) {
          // Add a small delay to ensure the script is properly added to the mock data
          setTimeout(() => {
            navigate(`/scripts/${scriptId}`);
          }, 300);
        } else {
          navigate('/scripts');
        }
      },
      onError: (error: any) => {
        console.error("Error uploading script:", error);
        setUploadProgress(0);
        
        // Check if it's a duplicate script error
        if (error.isDuplicate || error.status === 409) {
          setDuplicateScriptInfo({
            id: error.existingScriptId,
            title: error.existingScriptTitle,
            message: error.message
          });
          setShowDuplicateModal(true);
          setFileError(''); // Clear file error since we're showing the modal
          return;
        }
        
        // Check if it's a network-related error
        const isNetworkRelated = 
          error.message?.includes('Network error') || 
          error.message?.includes('check your connection') || 
          error.message?.includes('No response received') || 
          error.message?.includes('timeout');
        
        setIsNetworkError(isNetworkRelated);
        setFileError(error.message || "Failed to upload script. Please try again.");
      },
      retry: (failureCount, error: any) => {
        // Only retry for network-related errors and up to MAX_RETRIES times
        const isNetworkRelated = 
          error.message?.includes('Network error') || 
          error.message?.includes('check your connection') || 
          error.message?.includes('No response received') || 
          error.message?.includes('timeout');
        
        return isNetworkRelated && failureCount < MAX_RETRIES;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000), // Exponential backoff
      onMutate: () => {
        setFileError('');
        setIsNetworkError(false);
      }
    }
  );
  
  // AI analysis preview mutation
  const analysisPreviewMutation = useMutation({
    mutationFn: (scriptContent: string) => {
      // Use the existing analyze endpoint instead of a preview-specific one
      return scriptService.analyzeScript(scriptContent);
    }
  });
  
  // Acceptable PowerShell file extensions
  const ALLOWED_EXTENSIONS = ['.ps1', '.psm1', '.psd1', '.ps1xml'];
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Get file extension
    const fileExt = ('.' + file.name.split('.').pop()).toLowerCase();
    
    // Check file extension
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      setFileError(`Only PowerShell files (${ALLOWED_EXTENSIONS.join(', ')}) are allowed`);
      return;
    }
    
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    setFileSize(file.size);
    setFileName(file.name);
    setFileType(fileExt);
    setIsLargeFile(fileSizeInMB > 2); // Files larger than 2MB use the large file upload endpoint
    
    if (fileSizeInMB > 10) {
      setFileError('File size exceeds the maximum limit of 10MB');
      return;
    }
    
    setFileError('');
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setContent(content);
      
      // Try to extract title from filename if not set
      if (!title) {
        const filename = file.name.replace(fileExt, '');
        setTitle(filename);
      }
      
      // Reset analysis preview when file changes
      setShowAnalysisPreview(false);
      setAnalysisPreview(null);
    };
    reader.readAsText(file);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    // Update the file input
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleTagAdd = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  };
  
  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };
  
  const handlePreviewAnalysis = () => {
    if (!content) return;
    
    analysisPreviewMutation.mutate(content, {
      onSuccess: (data) => {
        setAnalysisPreview(data);
        setShowAnalysisPreview(true);
      }
    });
  };
  
  // Track upload progress and retry count
  useEffect(() => {
    if (uploadMutation.isPending) {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const increment = Math.random() * 15;
          const newProgress = prev + increment;
          return newProgress >= 95 ? 95 : newProgress; // Cap at 95% until complete
        });
      }, 500);
      
      return () => clearInterval(interval);
    } else if (uploadMutation.isSuccess) {
      setUploadProgress(100);
    }
    
    // Update retry count when failureCount changes, but never exceed MAX_RETRIES
    if (uploadMutation.failureCount > retryCount && uploadMutation.failureCount <= MAX_RETRIES) {
      setRetryCount(uploadMutation.failureCount);
    }
  }, [uploadMutation.isPending, uploadMutation.isSuccess, uploadMutation.failureCount, retryCount, MAX_RETRIES]);
  
  const validateForm = (): string | null => {
    if (!title || title.trim() === '') {
      return 'Script title is required';
    }
    
    if (!content || content.trim() === '') {
      return 'Script content is required';
    }
    
    if (tags.length > 10) {
      return 'A maximum of 10 tags is allowed';
    }
    
    return null;
  };
  
  // Prepare form data for submission
  const prepareFormData = () => {
    const formData = new FormData();
    
    // Add script metadata
    formData.append('title', title);
    formData.append('description', description);
    formData.append('content', content);
    if (category) {
      formData.append('category_id', category);
    }
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }
    formData.append('is_public', isPublic.toString());
    formData.append('analyze_with_ai', analyzeWithAI.toString());
    
    // If we have a file in the input, append it directly
    if (fileInputRef.current?.files?.[0]) {
      formData.append('script_file', fileInputRef.current.files[0]);
    }
    
    return formData;
  };
  
  // Handle retry after network error
  const handleRetry = () => {
    // Reset error states
    setFileError('');
    setUploadProgress(0);
    setIsNetworkError(false);
    
    // Reset retry count if we're manually retrying
    // This gives the user a fresh set of automatic retries
    setRetryCount(0);
    
    // Prepare and submit form data again
    const formData = prepareFormData();
    uploadMutation.mutate(formData);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setFileError(validationError);
      return;
    }
    
    setFileError('');
    setUploadProgress(0);
    setRetryCount(0);
    
    // Create and submit form data
    const formData = prepareFormData();
    uploadMutation.mutate(formData);
  };
  
  return (
    <div className="container mx-auto pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Upload Script</h1>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            onClick={() => navigate('/')}
          >
            Dashboard
          </button>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Script Upload and Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload */}
              <div 
                className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".ps1,.psm1,.psd1,.ps1xml"
                  onChange={handleFileChange}
                />
                
                <svg 
                  className="mx-auto h-12 w-12 text-gray-400" 
                  stroke="currentColor" 
                  fill="none" 
                  viewBox="0 0 48 48" 
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6" 
                  />
                </svg>
                
                <p className="mt-2 text-sm text-gray-400">
                  Drag and drop your PowerShell script here, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Accepted file types: .ps1, .psm1, .psd1, .ps1xml
                </p>
                
                {fileError && (
                  <div className="mt-2">
                    <p className="text-sm text-red-500">{fileError}</p>
                    {isNetworkError && (
                      <button 
                        onClick={handleRetry} 
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Retry Upload
                      </button>
                    )}
                    {retryCount > 0 && retryCount <= MAX_RETRIES && (
                      <p className="text-xs text-yellow-500 mt-1">
                        Retry attempt {retryCount} of {MAX_RETRIES}
                      </p>
                    )}
                  </div>
                )}
                
                {content && !fileError && (
                  <p className="mt-2 text-sm text-green-500">
                    ✓ Script loaded successfully ({content.length} bytes)
                  </p>
                )}
                
                {fileName && !fileError && (
                  <div className="mt-2 text-sm text-gray-300">
                    <p><span className="font-semibold">File:</span> {fileName}</p>
                    <p><span className="font-semibold">Size:</span> {formatFileSize(fileSize)}</p>
                    <p><span className="font-semibold">Type:</span> {fileType} {isLargeFile && <span className="text-yellow-400">(Large file upload)</span>}</p>
                  </div>
                )}
                
                {uploadMutation.isPending && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-400 text-sm mt-1 text-center">
                      {uploadProgress < 100 ? 'Uploading...' : 'Processing...'} {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}
              </div>
              
              {/* Script Content Preview */}
              {content && (
                <div className="border border-gray-600 rounded-lg overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 border-b border-gray-600 flex justify-between items-center">
                    <h2 className="text-sm font-medium">Script Content Preview</h2>
                    <span className="text-xs text-gray-400">
                      {content.split('\n').length} lines
                    </span>
                  </div>
                  <pre className="p-4 bg-gray-900 text-sm font-mono text-gray-300 overflow-x-auto max-h-60">
                    {content}
                  </pre>
                </div>
              )}
              
              {/* AI Analysis Preview */}
              {showAnalysisPreview && analysisPreview && (
                <div className="border border-gray-600 rounded-lg overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 border-b border-gray-600">
                    <h2 className="text-sm font-medium">AI Analysis Preview</h2>
                  </div>
                  <div className="p-4 bg-gray-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs uppercase text-gray-400 mb-1">Purpose</h3>
                        <p className="text-sm text-white">{analysisPreview.purpose}</p>
                      </div>
                      <div>
                        <h3 className="text-xs uppercase text-gray-400 mb-1">Category</h3>
                        <p className="text-sm text-white">{analysisPreview.category}</p>
                      </div>
                      <div>
                        <h3 className="text-xs uppercase text-gray-400 mb-1">Security Score</h3>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-800 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                analysisPreview.security_score > 7 
                                  ? 'bg-green-500' 
                                  : analysisPreview.security_score > 4 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${analysisPreview.security_score * 10}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{analysisPreview.security_score}/10</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs uppercase text-gray-400 mb-1">Code Quality</h3>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-800 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${analysisPreview.code_quality_score * 10}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{analysisPreview.code_quality_score}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Script Metadata */}
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md text-white px-3 py-2"
                  placeholder="Script title"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md text-white px-3 py-2"
                  placeholder="What does this script do?"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md text-white px-3 py-2"
                >
                  <option value="">-- Select Category --</option>
                  {categories?.categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingTags?.tags?.slice(0, 10).map((tag: any) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.name)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        tags.includes(tag.name)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-l-md text-white px-3 py-2 text-sm"
                    placeholder="Add custom tag"
                  />
                  <button
                    type="button"
                    onClick={handleTagAdd}
                    className="bg-blue-600 text-white px-3 py-2 rounded-r-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  id="is-public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                />
                <label htmlFor="is-public" className="ml-2 block text-sm text-gray-300">
                  Make script public
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="analyze-ai"
                  type="checkbox"
                  checked={analyzeWithAI}
                  onChange={(e) => setAnalyzeWithAI(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                />
                <label htmlFor="analyze-ai" className="ml-2 block text-sm text-gray-300">
                  Analyze with AI
                </label>
              </div>
              
              {content && analyzeWithAI && !showAnalysisPreview && (
                <button
                  type="button"
                  onClick={handlePreviewAnalysis}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md"
                  disabled={analysisPreviewMutation.isPending}
                >
                  {analysisPreviewMutation.isPending ? 'Analyzing...' : 'Preview Analysis'}
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/scripts')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!title || !content || !!fileError || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Script'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Duplicate Script Modal */}
      <DuplicateScriptModal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setDuplicateScriptInfo({});
        }}
        existingScriptId={duplicateScriptInfo.id}
        existingScriptTitle={duplicateScriptInfo.title}
        message={duplicateScriptInfo.message}
      />
    </div>
  );
};

export default ScriptUpload;