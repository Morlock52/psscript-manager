import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { scriptService, categoryService, tagService } from '../services/api';

interface FilterState {
  query: string;
  category: string;
  tags: string[];
  sortBy: string;
  onlyMine: boolean;
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    category: '',
    tags: [],
    sortBy: 'updated',
    onlyMine: false,
  });
  
  // Prepare query parameters
  const queryParams = {
    query: filters.query,
    category: filters.category || undefined,
    tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
    sort: filters.sortBy,
    mine: filters.onlyMine ? 'true' : undefined,
  };
  
  // Fetch scripts with filters
  const { data: scriptsData, isLoading, refetch } = useQuery({
    queryKey: ['scripts', queryParams],
    queryFn: () => scriptService.getScripts(queryParams),
    placeholderData: previousData => previousData,
  });
  
  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories()
  });
  
  // Fetch popular tags
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagService.getTags()
  });
  
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };
  
  const resetFilters = () => {
    setFilters({
      query: '',
      category: '',
      tags: [],
      sortBy: 'updated',
      onlyMine: false,
    });
  };
  
  return (
    <div className="container mx-auto pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Scripts</h1>
        <button
          onClick={() => navigate('/scripts/upload')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Upload New Script
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-gray-700 rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="query" className="sr-only">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  id="query"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-800 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search scripts..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="category" className="sr-only">
                Category
              </label>
              <select
                id="category"
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-600 rounded-md leading-5 bg-gray-800 text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categoriesData?.categories?.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="sortBy" className="sr-only">
                Sort by
              </label>
              <select
                id="sortBy"
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-600 rounded-md leading-5 bg-gray-800 text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Recently Created</option>
                <option value="name">Name (A-Z)</option>
                <option value="executions">Most Executed</option>
                <option value="quality">Highest Quality</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mr-4">
              {tagsData?.tags?.slice(0, 10).map((tag: any) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`text-xs px-2 py-1 rounded-full ${
                    filters.tags.includes(tag.name)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            
            {/* Only Mine Checkbox */}
            <div className="flex items-center">
              <input
                id="onlyMine"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                checked={filters.onlyMine}
                onChange={(e) => handleFilterChange('onlyMine', e.target.checked)}
              />
              <label htmlFor="onlyMine" className="ml-2 block text-sm text-gray-300">
                Only My Scripts
              </label>
            </div>
            
            <div className="ml-auto flex items-center space-x-2">
              <button
                type="button"
                className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-600"
                onClick={resetFilters}
              >
                Reset
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* View Toggles */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          {scriptsData?.total 
            ? `Showing ${scriptsData.scripts.length} of ${scriptsData.total} scripts`
            : 'No scripts found'}
        </div>
        <div className="flex space-x-2">
          <button
            className={`p-2 rounded-md ${
              view === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'
            }`}
            onClick={() => setView('grid')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            className={`p-2 rounded-md ${
              view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'
            }`}
            onClick={() => setView('list')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* No Results */}
      {!isLoading && (!scriptsData?.scripts || scriptsData.scripts.length === 0) && (
        <div className="bg-gray-700 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-white">No scripts found</h3>
          <p className="mt-2 text-gray-400">
            Try changing your search criteria or upload a new script.
          </p>
          <button
            onClick={() => navigate('/scripts/upload')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload New Script
          </button>
        </div>
      )}
      
      {/* Grid View */}
      {!isLoading && scriptsData?.scripts && scriptsData.scripts.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scriptsData.scripts.map((script: any) => (
            <div
              key={script.id}
              className="bg-gray-700 rounded-lg shadow overflow-hidden hover:bg-gray-650 transition-colors"
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">
                      <a
                        href={`/scripts/${script.id}`}
                        className="text-white hover:text-blue-400"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/scripts/${script.id}`);
                        }}
                      >
                        {script.title}
                      </a>
                    </h3>
                    <p className="text-sm text-gray-400">
                      By {script.user?.username || 'Unknown'} • Updated{' '}
                      {new Date(script.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className={`px-2 py-1 text-xs rounded-full ${
                      script.analysis?.quality_score >= 7
                        ? 'bg-green-900 text-green-300'
                        : script.analysis?.quality_score >= 4
                        ? 'bg-yellow-900 text-yellow-300'
                        : 'bg-red-900 text-red-300'
                    }`}
                  >
                    {script.analysis?.quality_score
                      ? `${script.analysis.quality_score.toFixed(1)}/10`
                      : 'Not Analyzed'}
                  </div>
                </div>
                
                <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                  {script.description || script.analysis?.purpose || 'No description available.'}
                </p>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-300">
                      {script.category?.name || 'Uncategorized'}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-300">
                      v{script.version}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {script.executionCount || 0} executions
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* List View */}
      {!isLoading && scriptsData?.scripts && scriptsData.scripts.length > 0 && view === 'list' && (
        <div className="bg-gray-700 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Author
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Quality
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {scriptsData.scripts.map((script: any) => (
                <tr key={script.id} className="hover:bg-gray-650">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-white">
                          <a
                            href={`/scripts/${script.id}`}
                            className="hover:text-blue-400"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/scripts/${script.id}`);
                            }}
                          >
                            {script.title}
                          </a>
                        </div>
                        <div className="text-sm text-gray-400">
                          {script.description ? script.description.substring(0, 60) + (script.description.length > 60 ? '...' : '') : 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{script.category?.name || 'Uncategorized'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{script.user?.username || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        script.analysis?.quality_score >= 7
                          ? 'bg-green-900 text-green-300'
                          : script.analysis?.quality_score >= 4
                          ? 'bg-yellow-900 text-yellow-300'
                          : script.analysis?.quality_score
                          ? 'bg-red-900 text-red-300'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {script.analysis?.quality_score
                        ? `${script.analysis.quality_score.toFixed(1)}/10`
                        : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(script.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Search;