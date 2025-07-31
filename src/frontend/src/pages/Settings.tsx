import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { apiClient } from '../services/api';
import { secureStorage } from '../services/secureStorage';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  // Theme settings
  const { theme, setTheme } = useTheme();
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    scriptExecutionAlerts: true,
    securityAlerts: true,
    weeklyDigest: false
  });
  
  // API settings
  const [apiSettings, setApiSettings] = useState({
    apiKey: 'sk-••••••••••••••••••••••••',
    showApiKey: false
  });
  
  // OpenAI settings
  const [openAISettings, setOpenAISettings] = useState({
    apiKey: '',
    showApiKey: false
  });
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  
  // AI Service status
  const [aiServiceStatus, setAiServiceStatus] = useState({
    mode: 'real',
    hasValidKey: false,
    serviceHealthy: false,
    responseTime: 0,
    canUseRealAI: false,
    status: 'inactive'
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  
  // Display settings
  const [displaySettings, setDisplaySettings] = useState({
    itemsPerPage: '10',
    defaultSort: 'updated',
    codeEditorTheme: 'vs-dark'
  });
  
  // Handle notification toggle
  const handleNotificationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle display settings change
  const handleDisplayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDisplaySettings(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle API key toggle
  const toggleApiKeyVisibility = () => {
    setApiSettings(prev => ({ ...prev, showApiKey: !prev.showApiKey }));
  };
  
  // Regenerate API key
  const regenerateApiKey = () => {
    // This would call an API to regenerate the key
    const mockNewKey = 'sk-' + Math.random().toString(36).substring(2, 15);
    setApiSettings(prev => ({ ...prev, apiKey: mockNewKey }));
  };
  
  // Handle OpenAI API key change
  const handleOpenAIKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setOpenAISettings(prev => ({ ...prev, apiKey: newKey }));
  };
  
  // Save OpenAI API key securely
  const saveOpenAIKey = async () => {
    setIsLoadingApiKey(true);
    try {
      await secureStorage.setSecure('openai_api_key', openAISettings.apiKey);
      toast.success('OpenAI API key saved securely!');
      // Refresh AI service status
      fetchAIServiceStatus();
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setIsLoadingApiKey(false);
    }
  };
  
  // Toggle OpenAI API key visibility
  const toggleOpenAIKeyVisibility = () => {
    setOpenAISettings(prev => ({ ...prev, showApiKey: !prev.showApiKey }));
  };
  
  // Fetch AI service status
  const fetchAIServiceStatus = async () => {
    try {
      const response = await apiClient.get('/settings/ai-status');
      setAiServiceStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch AI service status:', error);
      setAiServiceStatus(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsLoadingStatus(false);
    }
  };
  
  // Toggle AI service mode
  const toggleAIMode = async (newMode: 'mock' | 'real') => {
    if (newMode === 'real' && !openAISettings.apiKey) {
      toast.error('Please enter an OpenAI API key first');
      return;
    }
    
    setIsTogglingMode(true);
    try {
      const response = await apiClient.post('/settings/ai-mode', { mode: newMode });
      
      // Update local state with the response
      if (response.data.success) {
        setAiServiceStatus(prev => ({ 
          ...prev, 
          mode: response.data.mode,
          status: response.data.mode === 'mock' ? 'mock' : 'active'
        }));
        toast.success(response.data.message);
        
        // Delay status refresh to allow backend to settle
        setTimeout(() => {
          fetchAIServiceStatus();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle AI mode');
    } finally {
      setIsTogglingMode(false);
    }
  };
  
  // Load API key securely on mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const storedKey = await secureStorage.getSecure('openai_api_key');
        if (storedKey) {
          setOpenAISettings(prev => ({ ...prev, apiKey: storedKey }));
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
        // Try localStorage as fallback
        const localKey = localStorage.getItem('openai_api_key');
        if (localKey) {
          setOpenAISettings(prev => ({ ...prev, apiKey: localKey }));
        }
      }
    };
    
    loadApiKey();
  }, []);

  // Fetch status on mount and set up polling
  useEffect(() => {
    fetchAIServiceStatus();
    
    // Poll status every 30 seconds
    const interval = setInterval(fetchAIServiceStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Appearance */}
        <div className="bg-gray-700 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Appearance</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Theme</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-4 py-2 rounded-md transition ${
                    theme === 'light'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-4 py-2 rounded-md transition ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="itemsPerPage" className="block text-sm text-gray-400 mb-2">
                Items Per Page
              </label>
              <select
                id="itemsPerPage"
                name="itemsPerPage"
                value={displaySettings.itemsPerPage}
                onChange={handleDisplayChange}
                className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 w-full"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="defaultSort" className="block text-sm text-gray-400 mb-2">
                Default Sort
              </label>
              <select
                id="defaultSort"
                name="defaultSort"
                value={displaySettings.defaultSort}
                onChange={handleDisplayChange}
                className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 w-full"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Date Created</option>
                <option value="name">Name</option>
                <option value="quality">Quality Score</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="codeEditorTheme" className="block text-sm text-gray-400 mb-2">
                Code Editor Theme
              </label>
              <select
                id="codeEditorTheme"
                name="codeEditorTheme"
                value={displaySettings.codeEditorTheme}
                onChange={handleDisplayChange}
                className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 w-full"
              >
                <option value="vs-dark">Dark (VS Code)</option>
                <option value="vs-light">Light (VS Code)</option>
                <option value="hc-black">High Contrast</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Notifications */}
        <div className="bg-gray-700 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Notifications</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="emailNotifications" className="text-gray-300">
                Email Notifications
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  name="emailNotifications"
                  className="sr-only peer"
                  checked={notifications.emailNotifications}
                  onChange={handleNotificationToggle}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="scriptExecutionAlerts" className="text-gray-300">
                Script Execution Alerts
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="scriptExecutionAlerts"
                  name="scriptExecutionAlerts"
                  className="sr-only peer"
                  checked={notifications.scriptExecutionAlerts}
                  onChange={handleNotificationToggle}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="securityAlerts" className="text-gray-300">
                Security Alerts
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="securityAlerts"
                  name="securityAlerts"
                  className="sr-only peer"
                  checked={notifications.securityAlerts}
                  onChange={handleNotificationToggle}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="weeklyDigest" className="text-gray-300">
                Weekly Digest
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="weeklyDigest"
                  name="weeklyDigest"
                  className="sr-only peer"
                  checked={notifications.weeklyDigest}
                  onChange={handleNotificationToggle}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        {/* API Settings */}
        <div className="bg-gray-700 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">API Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">API Key</label>
              <div className="flex">
                <input
                  type={apiSettings.showApiKey ? "text" : "password"}
                  value={apiSettings.apiKey}
                  readOnly
                  className="bg-gray-800 border border-gray-600 rounded-l-md px-3 py-2 w-full"
                />
                <button
                  onClick={toggleApiKeyVisibility}
                  className="bg-gray-600 text-gray-300 px-3 py-2 rounded-r-md hover:bg-gray-500 transition"
                >
                  {apiSettings.showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            
            <button
              onClick={regenerateApiKey}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition w-full"
            >
              Regenerate API Key
            </button>
            
            <div className="mt-4 p-4 bg-gray-800 rounded-md text-sm">
              <p className="text-gray-400 mb-2">API Usage This Month:</p>
              <div className="flex justify-between mb-1">
                <span className="text-gray-300">Script Analysis</span>
                <span className="text-gray-300">245 / 1000</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: '24.5%' }}
                ></div>
              </div>
              
              <div className="flex justify-between mb-1">
                <span className="text-gray-300">Script Executions</span>
                <span className="text-gray-300">87 / 500</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full"
                  style={{ width: '17.4%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* OpenAI API Settings */}
      <div className="mt-6 bg-gray-700 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">OpenAI API Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">OpenAI API Key</label>
            <p className="text-xs text-gray-500 mb-2">Enter your OpenAI API key to enable AI-powered script analysis</p>
            <div className="flex">
              <input
                type={openAISettings.showApiKey ? "text" : "password"}
                value={openAISettings.apiKey}
                onChange={handleOpenAIKeyChange}
                placeholder="sk-..."
                className="bg-gray-800 border border-gray-600 rounded-l-md px-3 py-2 w-full"
              />
              <button
                onClick={toggleOpenAIKeyVisibility}
                className="bg-gray-600 text-gray-300 px-3 py-2 hover:bg-gray-500 transition"
              >
                {openAISettings.showApiKey ? "Hide" : "Show"}
              </button>
              <button
                onClick={saveOpenAIKey}
                className="bg-green-600 text-white px-4 py-2 rounded-r-md hover:bg-green-700 transition"
              >
                Save
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-md">
            <p className="text-blue-400 text-sm">
              <strong>Note:</strong> Your API key is stored locally in your browser and sent securely to the backend for AI analysis.
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a>.
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-gray-800 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400">AI Service Status:</p>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 animate-pulse ${
                  isLoadingStatus ? 'bg-yellow-500' :
                  aiServiceStatus.status === 'active' ? 'bg-green-500' :
                  aiServiceStatus.status === 'mock' ? 'bg-blue-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-300">
                  {isLoadingStatus ? 'Checking...' :
                   aiServiceStatus.status === 'active' ? 'AI Service Active' :
                   aiServiceStatus.status === 'mock' ? 'Mock Mode' :
                   'Service Error'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="text-gray-300">{aiServiceStatus.mode === 'real' ? 'Real AI' : 'Mock AI'}</span>
              </div>
              <div className="flex justify-between">
                <span>API Key:</span>
                <span className={`text-gray-300 ${aiServiceStatus.hasValidKey ? 'text-green-400' : 'text-red-400'}`}>
                  {aiServiceStatus.hasValidKey ? 'Valid' : 'Not configured'}
                </span>
              </div>
              {aiServiceStatus.mode === 'real' && (
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span className="text-gray-300">{aiServiceStatus.responseTime}ms</span>
                </div>
              )}
            </div>
            
            {/* AI Mode Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Use Real AI Service</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={aiServiceStatus.mode === 'real'}
                    onChange={(e) => {
                      if (!isTogglingMode) {
                        toggleAIMode(e.target.checked ? 'real' : 'mock');
                      }
                    }}
                    disabled={isTogglingMode || (!aiServiceStatus.canUseRealAI && aiServiceStatus.mode === 'mock')}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
                </label>
              </label>
              {!aiServiceStatus.canUseRealAI && aiServiceStatus.mode === 'mock' && (
                <p className="text-xs text-yellow-400 mt-2">
                  {!aiServiceStatus.hasValidKey ? 'Add a valid API key to enable real AI' :
                   !aiServiceStatus.serviceHealthy ? 'AI service is currently unavailable' :
                   'Cannot enable real AI mode'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Account Security */}
      <div className="mt-6 bg-gray-700 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Account Security</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Change Password</h3>
            <form className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm text-gray-400 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm text-gray-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-gray-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2"
                />
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Update Password
              </button>
            </form>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Two-Factor Authentication</h3>
            <p className="text-gray-400 mb-4">
              Enhance your account security by enabling two-factor authentication.
            </p>
            
            <div className="p-4 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-md mb-4">
              <p className="text-yellow-500">
                Two-factor authentication is currently disabled.
              </p>
            </div>
            
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
      
      {/* Save Settings Button */}
      <div className="mt-6 flex justify-end">
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Save All Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;