import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scriptService, categoryService } from '../services/api';
import InfoBox from '../components/InfoBox';
import VirtualTable from '../components/VirtualTable';

interface Script {
  id: string;
  title: string;
  description: string;
  author?: string;
  userId?: number;
  version: string;
  content?: string;
  dateCreated?: string;
  dateModified?: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  isPublic: boolean;
  category: { id: number; name: string } | string | null;
  categoryId?: number;
  executionCount: number;
  averageRating?: number;
  analysis?: {
    securityScore: number;
    codeQualityScore: number;
    riskScore?: number;
  };
  user?: {
    id: number;
    username: string;
  };
}

interface Category {
  id: number;
  name: string;
}

const ScriptManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isPublicFilter, setIsPublicFilter] = useState<boolean | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRowsSet, setSelectedRowsSet] = useState<Set<number>>(new Set());

  // Fetch scripts with filters
  const { data: scriptsData, isLoading: isScriptsLoading } = useQuery({
    queryKey: ['scripts', selectedCategory, isPublicFilter, selectedTags, searchQuery],
    queryFn: () => scriptService.getScripts({
      category: selectedCategory,
      isPublic: isPublicFilter,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      search: searchQuery || undefined
    }),
    placeholderData: previousData => previousData,
    staleTime: 10000
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    staleTime: 600000
  });

  // Mock data for tags
  const availableTags = [
    'automation', 'security', 'network', 'utility', 'admin',
    'monitoring', 'backup', 'installation', 'reporting', 'cloud'
  ];

  // Bulk mutate scripts (public/private status)
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { ids: string[], isPublic: boolean }) => 
      scriptService.bulkUpdateScripts(data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['scripts'] });
        setSelectedScripts([]);
        setShowBulkActions(false);
        setSuccessMessage('Scripts updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      onError: (error: any) => {
        console.error('Failed to update scripts:', error);
        setErrorMessage(error.message || 'Failed to update scripts. Please try again.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  );

  // Delete script mutation with improved error handling
  const deleteScriptMutation = useMutation({
    mutationFn: (id: string) => scriptService.deleteScript(id),
    onSuccess: (data) => {
        if (data.success) {
          // Show success toast or notification
          console.log('Script deleted successfully');
          queryClient.invalidateQueries({ queryKey: ['scripts'] });
          setSuccessMessage('Script deleted successfully');
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      },
      onError: (error: any) => {
        // Show error toast or notification
        console.error('Failed to delete script:', error);
        setErrorMessage(error.message || 'Failed to delete script. Please try again.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  );

  // Bulk delete scripts
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => scriptService.bulkDeleteScripts(ids),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['scripts'] });
        setSelectedScripts([]);
        setShowBulkActions(false);
        setSuccessMessage(`${selectedScripts.length} scripts deleted successfully`);
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      onError: (error: any) => {
        console.error('Failed to delete scripts:', error);
        setErrorMessage(error.message || 'Failed to delete scripts. Please try again.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  );

  // Handle selecting all scripts
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && scriptsData?.scripts) {
      setSelectedScripts(scriptsData.scripts.map(script => script.id));
      setShowBulkActions(true);
    } else {
      setSelectedScripts([]);
      setShowBulkActions(false);
    }
  };

  // Handle selecting individual script
  const handleSelectScript = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedScripts(prev => [...prev, id]);
    } else {
      setSelectedScripts(prev => prev.filter(scriptId => scriptId !== id));
    }
  };

  // Effect to show/hide bulk actions based on selection
  useEffect(() => {
    setShowBulkActions(selectedScripts.length > 0);
  }, [selectedScripts]);

  // Toggle tag filter
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Handle bulk make public/private
  const handleBulkVisibility = (isPublic: boolean) => {
    bulkUpdateMutation.mutate({
      ids: selectedScripts,
      isPublic
    });
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedScripts.length} scripts?`)) {
      bulkDeleteMutation.mutate(selectedScripts);
    }
  };

  const scripts: Script[] = scriptsData?.scripts || [];
  const categories: Category[] = categoriesData?.categories || [];

  // Configure virtual table columns
  const virtualTableColumns = useMemo(() => [
    {
      key: 'title',
      header: 'Script',
      width: 300,
      sortable: true,
      render: (script: Script) => (
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              <Link to={`/scripts/${script.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                {script.title}
              </Link>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {script.description}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      width: 150,
      sortable: true,
      render: (script: Script) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {typeof script.category === 'string' 
            ? script.category 
            : script.category?.name || ''}
        </span>
      )
    },
    {
      key: 'version',
      header: 'Version',
      width: 100,
      sortable: true,
      render: (script: Script) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {script.version}
        </span>
      )
    },
    {
      key: 'isPublic',
      header: 'Visibility',
      width: 120,
      sortable: true,
      render: (script: Script) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          script.isPublic 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        }`}>
          {script.isPublic ? 'Public' : 'Private'}
        </span>
      )
    },
    {
      key: 'executionCount',
      header: 'Usage',
      width: 120,
      sortable: true,
      render: (script: Script) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {script.executionCount} executions
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 200,
      render: (script: Script) => (
        <div className="flex space-x-2">
          <Link 
            to={`/scripts/${script.id}`}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            View
          </Link>
          <Link 
            to={`/scripts/${script.id}/edit`}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
          >
            Edit
          </Link>
          <Link 
            to={`/scripts/${script.id}/analysis`}
            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-sm"
          >
            Analyze
          </Link>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${script.title}"?`)) {
                deleteScriptMutation.mutate(script.id);
              }
            }}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>
      )
    }
  ], [deleteScriptMutation]);

  // Handle row selection for virtual table
  const handleRowSelect = (script: Script, index: number, selected: boolean) => {
    const newSet = new Set(selectedRowsSet);
    if (selected) {
      newSet.add(index);
      setSelectedScripts([...selectedScripts, script.id]);
    } else {
      newSet.delete(index);
      setSelectedScripts(selectedScripts.filter(id => id !== script.id));
    }
    setSelectedRowsSet(newSet);
  };

  return (
    <div className="p-6">
      {/* Success and Error Messages */}
      {successMessage && (
        <div className="mb-4">
          <InfoBox 
            type="success"
            title="Success"
            message={successMessage}
            dismissable
            onDismiss={() => setSuccessMessage(null)}
          />
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4">
          <InfoBox 
            type="error"
            title="Error"
            message={errorMessage}
            dismissable
            onDismiss={() => setErrorMessage(null)}
          />
        </div>
      )}
      
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-4">Manage Scripts</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Batch manage your PowerShell scripts, apply bulk actions and organize your collection.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link 
            to="/scripts/upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Upload Script</span>
          </Link>
          <Link 
            to="/"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select 
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={selectedCategory?.toString() || ""}
                aria-label="Filter by category"
                title="Filter by category"
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id.toString()}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visibility
              </label>
              <select 
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={isPublicFilter === null ? "" : isPublicFilter ? "public" : "private"}
                aria-label="Filter by visibility"
                title="Filter by visibility"
                onChange={(e) => {
                  if (e.target.value === "") setIsPublicFilter(null);
                  else setIsPublicFilter(e.target.value === "public");
                }}
              >
                <option value="">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 pl-10 pr-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Search scripts..."
                  aria-label="Search scripts"
                  title="Search scripts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md p-4 z-10 border-t border-gray-200 dark:border-gray-700">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedScripts.length} scripts selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleBulkVisibility(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
              >
                Make Public
              </button>
              <button
                onClick={() => handleBulkVisibility(false)}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium"
              >
                Make Private
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
              >
                Delete Selected
              </button>
              <button
                onClick={() => {
                  setSelectedScripts([]);
                  setShowBulkActions(false);
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scripts Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {isScriptsLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Loading scripts...</p>
          </div>
        ) : scripts.length === 0 ? (
          <div className="p-6">
            <InfoBox
              type="info"
              title="No Scripts Found"
              message={
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mt-2 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  <p className="mb-4">No scripts match your current filters.</p>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setIsPublicFilter(null);
                      setSelectedTags([]);
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <VirtualTable
            data={scripts}
            columns={virtualTableColumns}
            rowHeight={72}
            containerHeight={600}
            className="mt-4"
            onRowSelect={handleRowSelect}
            selectedRows={selectedRowsSet}
            itemKey={(script) => script.id}
            emptyMessage="No scripts found matching your filters"
            isLoading={isScriptsLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ScriptManagement;
