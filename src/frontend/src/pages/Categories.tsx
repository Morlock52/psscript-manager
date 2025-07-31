import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { categoryService, scriptService } from '../services/api';

interface Category {
  id: number;
  name: string;
  description: string;
  iconName?: string;
}

interface Script {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  user: {
    username: string;
  };
  analysis?: {
    code_quality_score: number;
  };
  executionCount: number;
  updatedAt: string;
}

const Categories: React.FC = () => {
  const { id: categoryId } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch all categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await categoryService.getCategories();
        setCategories(result.categories);
        
        // If we have a categoryId in the URL, set it as selected
        if (categoryId) {
          const selected = result.categories.find(c => c.id.toString() === categoryId);
          if (selected) {
            setSelectedCategory(selected);
          }
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      }
    };
    
    fetchCategories();
  }, [categoryId]);
  
  // Fetch scripts by category
  useEffect(() => {
    const fetchScripts = async () => {
      if (!selectedCategory) {
        setScripts([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await scriptService.getScripts({ 
          categoryId: selectedCategory.id,
          limit: 50
        });
        setScripts(result.scripts);
        setError(null);
      } catch (err) {
        console.error('Error fetching scripts:', err);
        setError('Failed to load scripts for this category');
        setScripts([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScripts();
  }, [selectedCategory]);
  
  // Handle category selection
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };
  
  // Get icon component based on category name
  const getCategoryIcon = (category: Category) => {
    switch (category.iconName || category.name.toLowerCase()) {
      case 'system administration':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'network management':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      case 'security tools':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Script Categories</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category List */}
        <div className="bg-gray-700 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          
          <div className="space-y-1">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category)}
                className={`w-full text-left flex items-center px-3 py-2 rounded-md transition ${
                  selectedCategory?.id === category.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="mr-3">{getCategoryIcon(category)}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Scripts List */}
        <div className="lg:col-span-2 bg-gray-700 rounded-lg shadow overflow-hidden">
          {selectedCategory ? (
            <>
              <div className="p-6 border-b border-gray-600">
                <h2 className="text-xl font-bold">{selectedCategory.name}</h2>
                <p className="text-gray-400 mt-1">{selectedCategory.description || 'No description available'}</p>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-400">
                  <p>{error}</p>
                </div>
              ) : scripts.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <p>No scripts found in this category.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-left text-xs uppercase text-gray-400 bg-gray-800">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Author</th>
                        <th className="px-4 py-3">Quality</th>
                        <th className="px-4 py-3">Executions</th>
                        <th className="px-4 py-3">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {scripts.map(script => (
                        <tr key={script.id} className="hover:bg-gray-600">
                          <td className="px-4 py-3">
                            <Link 
                              to={`/scripts/${script.id}`}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              {script.title}
                            </Link>
                            <p className="text-xs text-gray-400 truncate max-w-xs">
                              {script.description}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{script.user?.username || 'Unknown'}</td>
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
                          <td className="px-4 py-3 text-gray-300">{script.executionCount}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {new Date(script.updatedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-gray-400">
              <p>Select a category from the list to view scripts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;