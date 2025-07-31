import React, { useState } from 'react';
import SettingsLayout from './SettingsLayout';

const SecuritySettings: React.FC = () => {
  // Security state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mocked verification code for demo purposes
  const verificationCode = '123456';
  const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/PSScriptApp:user@example.com?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=PSScriptApp';
  
  // Handle form input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };
  
  // Handle password update
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!passwordData.currentPassword) {
      setErrorMessage('Current password is required');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 1000);
  };
  
  // Toggle MFA
  const handleToggleMfa = () => {
    if (mfaEnabled) {
      if (confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
        setMfaEnabled(false);
        setSuccessMessage('Two-factor authentication disabled');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } else {
      setShowMfaSetup(true);
    }
  };
  
  // Complete MFA setup
  const handleCompleteMfaSetup = () => {
    setMfaEnabled(true);
    setShowMfaSetup(false);
    setSuccessMessage('Two-factor authentication enabled successfully');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Update session timeout
  const handleSessionTimeoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSessionTimeout(parseInt(e.target.value));
    setSuccessMessage('Session timeout updated');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <SettingsLayout 
      title="Security Settings" 
      description="Manage your account security settings and authentication preferences"
    >
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-md">
          {successMessage}
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md">
          {errorMessage}
        </div>
      )}
      
      {/* Password Change Section */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        <form onSubmit={handlePasswordUpdate}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters and include a number and special character
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
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
                Update Password
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Two-Factor Authentication */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication (2FA)</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Add an extra layer of security to your account by requiring a verification code in addition to your password.
        </p>
        
        {showMfaSetup ? (
          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium mb-4">Set up Two-Factor Authentication</h3>
            
            <div className="mb-6">
              <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                1. Scan this QR code with your authentication app (like Google Authenticator, Authy, or 1Password).
              </p>
              
              <div className="flex justify-center bg-white p-4 rounded-lg mb-4 max-w-xs mx-auto">
                <img src={qrCodeUrl} alt="QR Code for Two-Factor Authentication" className="w-40 h-40" />
              </div>
              
              <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                2. Enter the verification code from your app:
              </p>
              
              <div className="flex">
                <input
                  type="text"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center tracking-widest font-mono"
                  maxLength={6}
                  placeholder="000000"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowMfaSetup(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              
              <button
                onClick={handleCompleteMfaSetup}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                Verify and Activate
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <h3 className="font-medium">
                Two-factor authentication is {mfaEnabled ? 'enabled' : 'disabled'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mfaEnabled 
                  ? 'Your account is currently protected with two-factor authentication.' 
                  : 'Enable two-factor authentication for additional security.'}
              </p>
            </div>
            
            <button
              onClick={handleToggleMfa}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                mfaEnabled 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {mfaEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        )}
      </div>
      
      {/* Session Settings */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Session Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Timeout
            </label>
            <select
              value={sessionTimeout}
              onChange={handleSessionTimeoutChange}
              className="w-full max-w-xs border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You will be automatically logged out after this period of inactivity
            </p>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="login-notification"
                type="checkbox"
                checked={loginNotifications}
                onChange={() => setLoginNotifications(!loginNotifications)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="login-notification" className="font-medium text-gray-700 dark:text-gray-300">
                Login Notifications
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Receive email notifications for new sign-ins to your account
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Active Sessions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          These are your active sessions across devices. You can revoke any session you don't recognize.
        </p>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <div className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">Current Session</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Chrome on macOS • IP 192.168.1.1 • Last active just now
                </div>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full">
                Current
              </span>
            </div>
            
            <div className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">Mobile App</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  iPhone • IP 192.168.1.2 • Last active 2 hours ago
                </div>
              </div>
              <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">
                Revoke
              </button>
            </div>
            
            <div className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">Firefox Browser</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Firefox on Windows • IP 192.168.1.3 • Last active yesterday
                </div>
              </div>
              <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default SecuritySettings;