import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get initial theme from localStorage if available, or use system preference
  const getInitialTheme = (): ThemeMode => {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      return savedTheme as ThemeMode;
    }
    
    // Check for system dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Default to dark theme
    return 'dark';
  };
  
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  
  // Update DOM when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove old theme class
    root.classList.remove('dark', 'light');
    
    // Add new theme class
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Toggle between dark and light mode
  const toggleTheme = () => {
    console.log('Toggle theme called, current theme:', theme);
    // Toggle with debugging
    try {
      setThemeState(prevTheme => {
        const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
        console.log(`Changing theme from ${prevTheme} to ${newTheme}`);
        return newTheme;
      });
      
      // Apply theme directly to document as a fallback
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(newTheme);
      console.log('Applied theme class directly to document');
    } catch (e) {
      console.error('Error toggling theme:', e);
      // Emergency fallback
      document.documentElement.classList.toggle('dark');
      document.documentElement.classList.toggle('light');
    }
  };
  
  // Set theme explicitly
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default useTheme;