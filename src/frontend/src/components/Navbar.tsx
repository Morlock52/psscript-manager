import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ROUTES, matchesRoute } from '../constants/routes';
import AIStatusIndicator from './AIStatusIndicator';
import GlobalSearch from './GlobalSearch';
// import { useAuth } from '../hooks/useAuth'; // Removed

// Define props for Navbar
interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  // const { user, isAuthenticated, logout } = useAuth(); // Removed
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Toggle user menu
  const toggleUserMenu = () => {
    // setShowUserMenu(!showUserMenu); // Removed
    if (showNotifications) setShowNotifications(false);
  };

  // Toggle notifications
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    // if (showUserMenu) setShowUserMenu(false); // Removed
  };

  // Handle logout - Removed
  // const handleLogout = () => { ... };

  // Get page title based on current route - Updated with proper route mappings
  const getPageTitle = () => {
    const path = location.pathname;
    
    // Use constants for consistent routing
    if (path === ROUTES.HOME || path === ROUTES.DASHBOARD) return 'Dashboard';
    if (path === ROUTES.SCRIPTS) return 'Script Management';
    if (matchesRoute(path, ROUTES.SCRIPT_DETAIL)) return 'Script Details';
    if (path === ROUTES.EDITOR || matchesRoute(path, ROUTES.EDITOR_WITH_ID)) return 'Script Editor';
    if (path === ROUTES.UPLOAD) return 'Script Upload';
    if (path === ROUTES.ANALYSIS) return 'Script Analysis';
    if (path === ROUTES.AI_CHAT) return 'AI Assistant';
    if (path === ROUTES.CHAT_HISTORY) return 'Chat History';
    if (path === ROUTES.AI_FEATURES) return 'AI Features';
    if (path === ROUTES.AGENTIC_AI) return 'Agentic AI';
    if (path === ROUTES.AGENT_ORCHESTRATION) return 'Agent Orchestration';
    if (path === ROUTES.DOCUMENTATION) return 'Documentation';
    if (path === ROUTES.DOCUMENTATION_CRAWL) return 'Documentation Crawl';
    if (path === ROUTES.SETTINGS || path.startsWith('/settings')) return 'Settings';
    if (path === ROUTES.UI_DEMO) return 'UI Components Demo';
    if (path === ROUTES.LOGIN) return 'Login';
    if (path === ROUTES.REGISTER) return 'Register';
    if (path === ROUTES.UNAUTHORIZED) return 'Access Denied';
    
    return 'PSScript';
  };
  
  return (
    <header className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900 border-b'}`}>
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and title */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className={`p-2 rounded-md mr-2 ${
              theme === 'dark' 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-100'
            }`}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
        </div>
        
        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* AI Status Indicator */}
          <AIStatusIndicator />
          
          {/* Search button */}
          <button
            className={`p-2 rounded-md ${
              theme === 'dark' 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-100'
            }`}
            aria-label="Open global search"
            onClick={() => setShowSearch(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Theme toggle */}
          <button
            className={`p-2 rounded-md ${
              theme === 'dark' 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-100'
            }`}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          {/* Notifications */}
          <div className="relative">
            <button
              className={`p-2 rounded-md ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={toggleNotifications}
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            
            {/* Notifications dropdown */}
            {showNotifications && (
              <div 
                className={`absolute right-0 mt-2 w-80 rounded-md shadow-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border border-gray-700' 
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium">Notifications</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {/* Notification items would go here */}
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No new notifications
                  </div>
                </div>
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <button 
                    className={`w-full p-2 text-xs text-center rounded ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User menu - Removed */}
          {/* <div className="relative"> ... </div> */}
        </div>
      </div>
      
      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)} 
      />
    </header>
  );
};

export default Navbar;
