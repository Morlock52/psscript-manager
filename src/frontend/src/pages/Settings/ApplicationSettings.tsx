import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AI_MODELS, loadSettings, saveSettings, setAiModel } from '../../services/settings';
import ReadmeViewer from '../../components/ReadmeViewer';

const ApplicationSettings: React.FC = () => {
  const [settings, setSettings] = useState(loadSettings());
  const [restartRequired, setRestartRequired] = useState(false);
  const [showReadme, setShowReadme] = useState(false);

  // Update settings when they change
  const handleSettingChange = (settingName: string, value: any) => {
    let newSettings;
    
    if (settingName === 'aiModel') {
      newSettings = setAiModel(value);
    } else {
      newSettings = saveSettings({ [settingName]: value });
    }
    
    setSettings(newSettings);
    
    // Check if restart is needed for certain settings
    if (['aiModel'].includes(settingName)) {
      setRestartRequired(true);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        {/* Back to Dashboard link */}
        <div className="mb-4">
          <Link 
            to="/dashboard"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Application Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configure advanced application features and settings
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Application Information</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Version</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                PowerShell Script Management App v1.0.4
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-2">Documentation</h3>
              <button
                onClick={() => setShowReadme(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View README Documentation
              </button>
            </div>
          </div>
        </div>

        {/* Database Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Database Settings</h2>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Database Mode: <span className="text-green-500 font-semibold">Production Database</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This application is configured to use the production database. Mock data functionality has been removed.
            </p>
          </div>
        </div>
        
        {/* AI Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">AI Settings</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">AI Model Selection</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Select the AI model to use for script analysis and suggestions
              </p>
              <label htmlFor="aiModelSelect" className="sr-only">Select AI Model</label>
              <div>
                <select
                  id="aiModelSelect"
                  value={settings.aiModel}
                  onChange={(e) => handleSettingChange('aiModel', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  aria-label="Select AI Model"
                >
                  {AI_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Show selected model description */}
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {AI_MODELS.find(model => model.id === settings.aiModel)?.description}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-medium">Auto-Run AI Analysis</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically analyze scripts with AI when uploaded
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="autoRunAnalysisToggle"
                  type="checkbox"
                  checked={settings.autoRunAnalysis}
                  onChange={(e) => handleSettingChange('autoRunAnalysis', e.target.checked)}
                  className="sr-only peer"
                  aria-label="Auto-Run AI Analysis"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        {/* Execution Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Execution Settings</h2>
          
          <div>
            <h3 className="font-medium mb-2">Script Execution Timeout</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Maximum time (in seconds) that a script is allowed to run
            </p>
            
            <label htmlFor="executionTimeoutSlider" className="sr-only">Script Execution Timeout</label>
            <div className="flex items-center space-x-4">
              <input
                id="executionTimeoutSlider"
                type="range"
                min="10"
                max="600"
                step="10"
                value={settings.executionTimeout}
                onChange={(e) => handleSettingChange('executionTimeout', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                aria-label="Script Execution Timeout"
              />
              <span className="w-16 text-center font-medium">
                {settings.executionTimeout}s
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Restart Notice */}
      {restartRequired && (
        <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>Some settings changes require a page reload to take effect.</span>
          </div>
          <div className="mt-2 text-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-lg hover:bg-yellow-300 dark:hover:bg-yellow-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      
      {/* README Viewer Modal */}
      <ReadmeViewer isOpen={showReadme} onClose={() => setShowReadme(false)} />
    </div>
  );
};

export default ApplicationSettings;