import React, { useState } from 'react';
import SettingsLayout from './SettingsLayout';

const AppearanceSettings: React.FC = () => {
  // Theme settings
  const [theme, setTheme] = useState('dark');
  const [accentColor, setAccentColor] = useState('blue');
  const [fontScale, setFontScale] = useState('medium');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Available accent colors
  const accentColors = [
    { name: 'Blue', value: 'blue' },
    { name: 'Purple', value: 'purple' },
    { name: 'Indigo', value: 'indigo' },
    { name: 'Teal', value: 'teal' },
    { name: 'Green', value: 'green' },
    { name: 'Red', value: 'red' },
    { name: 'Orange', value: 'orange' }
  ];
  
  // Font size options
  const fontSizes = [
    { name: 'Small', value: 'small' },
    { name: 'Medium', value: 'medium' },
    { name: 'Large', value: 'large' },
    { name: 'Extra Large', value: 'xl' }
  ];
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call to update settings
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Appearance settings updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 800);
  };
  
  // Reset to default settings
  const handleResetDefaults = () => {
    setTheme('dark');
    setAccentColor('blue');
    setFontScale('medium');
    setReducedMotion(false);
    setHighContrast(false);
    
    setSuccessMessage('Settings reset to defaults');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <SettingsLayout 
      title="Appearance Settings" 
      description="Customize the look and feel of the application"
    >
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-md">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Theme Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className={`border rounded-lg p-4 cursor-pointer relative ${
                theme === 'light' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setTheme('light')}
            >
              <div className="h-24 mb-3 bg-white border border-gray-200 rounded-md overflow-hidden">
                <div className="h-6 bg-gray-100 border-b border-gray-200"></div>
                <div className="p-2">
                  <div className="h-3 w-1/2 bg-gray-200 rounded mb-2"></div>
                  <div className="h-2 w-full bg-gray-100 rounded mb-1"></div>
                  <div className="h-2 w-full bg-gray-100 rounded mb-1"></div>
                  <div className="h-2 w-3/4 bg-gray-100 rounded"></div>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={theme === 'light'}
                  onChange={() => setTheme('light')}
                  className="mr-2"
                />
                <span>Light Mode</span>
              </div>
            </div>
            
            <div 
              className={`border rounded-lg p-4 cursor-pointer relative ${
                theme === 'dark' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setTheme('dark')}
            >
              <div className="h-24 mb-3 bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
                <div className="h-6 bg-gray-900 border-b border-gray-700"></div>
                <div className="p-2">
                  <div className="h-3 w-1/2 bg-gray-700 rounded mb-2"></div>
                  <div className="h-2 w-full bg-gray-700 rounded mb-1"></div>
                  <div className="h-2 w-full bg-gray-700 rounded mb-1"></div>
                  <div className="h-2 w-3/4 bg-gray-700 rounded"></div>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={() => setTheme('dark')}
                  className="mr-2"
                />
                <span>Dark Mode</span>
              </div>
            </div>
            
            <div 
              className={`border rounded-lg p-4 cursor-pointer relative ${
                theme === 'system' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setTheme('system')}
            >
              <div className="h-24 mb-3 bg-gradient-to-r from-white to-gray-800 border border-gray-300 rounded-md overflow-hidden">
                <div className="h-6 bg-gradient-to-r from-gray-100 to-gray-800 border-b border-gray-300"></div>
                <div className="p-2 flex justify-between">
                  <div className="w-1/2">
                    <div className="h-3 w-3/4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 w-full bg-gray-100 rounded mb-1"></div>
                    <div className="h-2 w-full bg-gray-100 rounded mb-1"></div>
                  </div>
                  <div className="w-1/2 pl-2">
                    <div className="h-3 w-3/4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-2 w-full bg-gray-700 rounded mb-1"></div>
                    <div className="h-2 w-full bg-gray-700 rounded mb-1"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={theme === 'system'}
                  onChange={() => setTheme('system')}
                  className="mr-2"
                />
                <span>Use System Settings</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Accent Color */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Accent Color</h3>
          <div className="flex flex-wrap gap-3">
            {accentColors.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => setAccentColor(color.value)}
                className={`w-10 h-10 rounded-full ${
                  accentColor === color.value 
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600' 
                    : ''
                }`}
                style={{ backgroundColor: `var(--color-${color.value}-500)` }}
                title={color.name}
              >
                {accentColor === color.value && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Font Size */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Font Size</h3>
          <div className="flex items-center">
            <span className="mr-4 text-sm">A</span>
            <input
              type="range"
              min="0"
              max="3"
              value={fontSizes.findIndex(f => f.value === fontScale)}
              onChange={(e) => setFontScale(fontSizes[parseInt(e.target.value)].value)}
              className="w-full max-w-md mx-2"
            />
            <span className="ml-4 text-xl">A</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Selected: {fontSizes.find(f => f.value === fontScale)?.name}
          </div>
        </div>
        
        {/* Accessibility Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Accessibility</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="reducedMotion"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="reducedMotion" className="ml-2 block">
                <div className="font-medium">Reduce Motion</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Minimize animations and transitions
                </p>
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="highContrast"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="highContrast" className="ml-2 block">
                <div className="font-medium">High Contrast</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Increase contrast for better readability
                </p>
              </label>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium"
          >
            Reset to Defaults
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center"
            disabled={isLoading}
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Save Changes
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
};

export default AppearanceSettings;