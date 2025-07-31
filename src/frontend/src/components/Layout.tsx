import React, { useState, useEffect, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
// DbToggle component removed

interface LayoutProps {
  children?: ReactNode;
  hideSidebar?: boolean;
}

// Interface for Sidebar component props to match its definition
interface SidebarComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

// Interface for Navbar component props to match its definition
interface NavbarComponentProps {
  onMenuClick: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, hideSidebar = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(
    localStorage.getItem('sidebar-open') === 'false' ? false : true
  );
  
  // Debug sidebar state
  useEffect(() => {
    console.log('DEBUG: Layout - Sidebar state:', sidebarOpen ? 'open' : 'closed');
  }, [sidebarOpen]);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('color-theme') as 'dark' | 'light') || 'dark'
  );

  // Save sidebar state to localStorage
  useEffect(() => {
    console.log('DEBUG: Layout - Saving sidebar state to localStorage:', sidebarOpen);
    localStorage.setItem('sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);
  
  // Initialize theme on mount
  useEffect(() => {
    console.log('DEBUG: Layout - Theme initialized:', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const toggleSidebar = () => {
    console.log('DEBUG: Layout - Toggling sidebar from', sidebarOpen, 'to', !sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    console.log('DEBUG: Layout - Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
    localStorage.setItem('color-theme', newTheme);
  };
  
  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300
      ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar with animation */}
      {!hideSidebar && (
        <div 
          className={`transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'w-64' : 'w-0 md:w-16'} 
            ${sidebarOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}
        >
          <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onMenuClick={toggleSidebar} />
        
        <main className={`flex-1 overflow-y-auto p-4 transition-colors duration-300
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
