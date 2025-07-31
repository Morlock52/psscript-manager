import { useEffect } from 'react';

export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Skip if user is typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' ||
                      activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isTyping && e.key !== 'Escape') {
        return;
      }

      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input') || 
                          document.querySelector('[role="search"] input');
        if (searchInput instanceof HTMLElement) {
          searchInput.focus();
        }
      }
      
      // Escape to clear search
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        if (searchInput && searchInput.value) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      // / to focus search (when not typing)
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input') || 
                          document.querySelector('[role="search"] input');
        if (searchInput instanceof HTMLElement) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
};

// Hook for announcing changes to screen readers
export const useAriaLiveRegion = () => {
  useEffect(() => {
    // Create a visually hidden live region if it doesn't exist
    let liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'aria-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    return () => {
      // Clean up on unmount if no other components are using it
      const region = document.getElementById('aria-live-region');
      if (region && !document.querySelector('[data-uses-live-region]')) {
        region.remove();
      }
    };
  }, []);

  const announce = (message: string) => {
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  };

  return { announce };
};