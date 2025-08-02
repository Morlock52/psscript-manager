import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ROUTES, matchesRoute } from '../constants/routes';

/**
 * Breadcrumb item interface
 */
interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

/**
 * Breadcrumb navigation component - Modern React 18 implementation
 * Provides hierarchical navigation context for users
 */
const Breadcrumb: React.FC = () => {
  const { theme } = useTheme();
  const location = useLocation();

  /**
   * Generate breadcrumb items based on current path
   */
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const path = location.pathname;
    const items: BreadcrumbItem[] = [];

    // Always start with Home/Dashboard
    items.push({ label: 'Dashboard', path: ROUTES.DASHBOARD });

    // Handle specific routes
    if (path === ROUTES.SCRIPTS) {
      items.push({ label: 'Scripts', isActive: true });
    } else if (matchesRoute(path, ROUTES.SCRIPT_DETAIL)) {
      items.push({ label: 'Scripts', path: ROUTES.SCRIPTS });
      items.push({ label: 'Script Details', isActive: true });
    } else if (path === ROUTES.EDITOR) {
      items.push({ label: 'Script Editor', isActive: true });
    } else if (matchesRoute(path, ROUTES.EDITOR_WITH_ID)) {
      items.push({ label: 'Scripts', path: ROUTES.SCRIPTS });
      items.push({ label: 'Edit Script', isActive: true });
    } else if (path === ROUTES.UPLOAD) {
      items.push({ label: 'Scripts', path: ROUTES.SCRIPTS });
      items.push({ label: 'Upload', isActive: true });
    } else if (path === ROUTES.ANALYSIS) {
      items.push({ label: 'Analysis', isActive: true });
    } else if (path === ROUTES.AI_CHAT) {
      items.push({ label: 'AI Assistant', isActive: true });
    } else if (path === ROUTES.CHAT_HISTORY) {
      items.push({ label: 'AI Assistant', path: ROUTES.AI_CHAT });
      items.push({ label: 'Chat History', isActive: true });
    } else if (path === ROUTES.AI_FEATURES) {
      items.push({ label: 'AI Features', isActive: true });
    } else if (path === ROUTES.AGENTIC_AI) {
      items.push({ label: 'Agentic AI', isActive: true });
    } else if (path === ROUTES.AGENT_ORCHESTRATION) {
      items.push({ label: 'Agent Orchestration', isActive: true });
    } else if (path === ROUTES.DOCUMENTATION) {
      items.push({ label: 'Documentation', isActive: true });
    } else if (path === ROUTES.DOCUMENTATION_CRAWL) {
      items.push({ label: 'Documentation', path: ROUTES.DOCUMENTATION });
      items.push({ label: 'Crawl', isActive: true });
    } else if (path.startsWith('/settings')) {
      items.push({ label: 'Settings', path: ROUTES.SETTINGS });
      
      // Handle settings sub-pages
      if (path === ROUTES.SETTINGS_PROFILE) {
        items.push({ label: 'Profile', isActive: true });
      } else if (path === ROUTES.SETTINGS_APPEARANCE) {
        items.push({ label: 'Appearance', isActive: true });
      } else if (path === ROUTES.SETTINGS_SECURITY) {
        items.push({ label: 'Security', isActive: true });
      } else if (path === ROUTES.SETTINGS_NOTIFICATIONS) {
        items.push({ label: 'Notifications', isActive: true });
      } else if (path === ROUTES.SETTINGS_API) {
        items.push({ label: 'API', isActive: true });
      } else if (path === ROUTES.SETTINGS_USERS) {
        items.push({ label: 'User Management', isActive: true });
      } else if (path === ROUTES.SETTINGS) {
        items[items.length - 1].isActive = true;
      }
    } else if (path === ROUTES.UI_DEMO) {
      items.push({ label: 'UI Components Demo', isActive: true });
    } else if (path === ROUTES.UNAUTHORIZED) {
      items.push({ label: 'Access Denied', isActive: true });
    } else if (path === ROUTES.DASHBOARD || path === ROUTES.HOME) {
      items[0].isActive = true;
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  // Don't show breadcrumb for certain pages
  const hideBreadcrumbPaths = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.UNAUTHORIZED];
  if (hideBreadcrumbPaths.includes(location.pathname as any)) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb navigation"
      className={`px-6 py-3 border-b ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}
    >
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg 
                  className={`w-4 h-4 mx-2 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              )}
              
              {item.path && !item.isActive ? (
                <Link
                  to={item.path}
                  className={`hover:underline transition-colors duration-200 ${
                    theme === 'dark' 
                      ? 'text-blue-400 hover:text-blue-300' 
                      : 'text-blue-600 hover:text-blue-800'
                  }`}
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span 
                  className={`${
                    item.isActive
                      ? theme === 'dark' 
                        ? 'text-white font-medium' 
                        : 'text-gray-900 font-medium'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-gray-600'
                  }`}
                  aria-current={item.isActive ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;