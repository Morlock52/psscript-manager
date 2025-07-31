import React, { useState } from 'react';
import SettingsLayout from './SettingsLayout';

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  email: boolean;
  web: boolean;
  mobile: boolean;
}

const NotificationSettings: React.FC = () => {
  // Notification settings state
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'script_executions',
      name: 'Script Executions',
      description: 'Get notified when your scripts are executed',
      email: true,
      web: true,
      mobile: true
    },
    {
      id: 'script_comments',
      name: 'Script Comments',
      description: 'Get notified when someone comments on your scripts',
      email: true,
      web: true,
      mobile: false
    },
    {
      id: 'script_ratings',
      name: 'Script Ratings',
      description: 'Get notified when someone rates your scripts',
      email: false,
      web: true,
      mobile: false
    },
    {
      id: 'security_alerts',
      name: 'Security Alerts',
      description: 'Important security notifications about your account',
      email: true,
      web: true,
      mobile: true
    },
    {
      id: 'system_updates',
      name: 'System Updates',
      description: 'Updates about new features and system maintenance',
      email: true,
      web: false,
      mobile: false
    },
  ]);
  
  // Email preferences
  const [emailFrequency, setEmailFrequency] = useState('real-time');
  const [digestDay, setDigestDay] = useState('monday');
  
  // Success message
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Update notification setting
  const updateSetting = (id: string, channel: 'email' | 'web' | 'mobile', value: boolean) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, [channel]: value } 
          : setting
      )
    );
    
    // Show success message
    setSuccessMessage('Notification preferences updated');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Toggle all channels for a setting
  const toggleAll = (id: string, value: boolean) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, email: value, web: value, mobile: value } 
          : setting
      )
    );
    
    // Show success message
    setSuccessMessage('Notification preferences updated');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Handle email frequency change
  const handleEmailFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEmailFrequency(e.target.value);
    
    // Show success message
    setSuccessMessage('Email frequency updated');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Save notification settings
  const handleSaveSettings = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('All notification settings saved successfully');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 800);
  };

  return (
    <SettingsLayout 
      title="Notification Settings" 
      description="Manage how and when you receive notifications"
    >
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-md">
          {successMessage}
        </div>
      )}
      
      {/* Notification preferences */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Choose which notifications you want to receive and how you want to receive them.
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notification Type</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Web</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">All / None</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {settings.map(setting => (
                <tr key={setting.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {setting.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {setting.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={setting.email}
                      onChange={(e) => updateSetting(setting.id, 'email', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={setting.web}
                      onChange={(e) => updateSetting(setting.id, 'web', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={setting.mobile}
                      onChange={(e) => updateSetting(setting.id, 'mobile', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => toggleAll(setting.id, true)}
                        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                      >
                        All
                      </button>
                      <button
                        onClick={() => toggleAll(setting.id, false)}
                        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                      >
                        None
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Email preferences */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Email Delivery Preferences</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Choose how frequently you want to receive email notifications.
        </p>
        
        <div className="max-w-lg space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Frequency
            </label>
            <select
              value={emailFrequency}
              onChange={handleEmailFrequencyChange}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="real-time">Real-time (immediate)</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
              <option value="never">Never (Email disabled)</option>
            </select>
          </div>
          
          {emailFrequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weekly Digest Day
              </label>
              <select
                value={digestDay}
                onChange={(e) => setDigestDay(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          )}
          
          <div className="flex items-start pt-2">
            <div className="flex items-center h-5">
              <input
                id="unsubscribe-all"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="unsubscribe-all" className="font-medium text-gray-700 dark:text-gray-300">
                Unsubscribe from all marketing emails
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                You will still receive important security and account notifications
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Web notification settings */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Web Notification Settings</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Configure browser notifications settings.
        </p>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Browser Notifications</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Receive notifications in your browser when important events happen
              </p>
            </div>
            
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
              Enable in Browser
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>
              Note: You'll need to grant permission in your browser to receive notifications.
            </p>
          </div>
        </div>
      </div>
      
      {/* Save button */}
      <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center"
        >
          {isLoading && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          Save All Settings
        </button>
      </div>
    </SettingsLayout>
  );
};

export default NotificationSettings;