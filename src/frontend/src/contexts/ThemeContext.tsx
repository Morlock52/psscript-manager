import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define theme type
type Theme = 'light' | 'dark';

// Define context type
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

// Define props for ThemeProvider
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

// Create ThemeProvider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  // Initialize theme state from localStorage or defaultTheme
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get theme from localStorage
    const savedTheme = localStorage.getItem('psscript_theme');
    
    // Check if we have a saved theme
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    
    // Check if user prefers dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Fall back to default theme
    return defaultTheme;
  });

  // Toggle theme function
  const toggleTheme = () => {
    setThemeState(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Set theme function
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Update localStorage and document class when theme changes
  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('psscript_theme', theme);

    // Update document class and data attribute for global styling and CSS variables
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  // Provide theme context to children
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
