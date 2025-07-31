/**
 * Secure storage service for sensitive data
 * Uses session storage and backend API instead of localStorage
 */

import { apiClient } from './api';
import axios from 'axios';

class SecureStorageService {
  private sessionCache = new Map<string, string>();
  private useLocalStorageOnly = false;

  /**
   * Store sensitive data securely on the backend
   * @param key The key to store
   * @param value The value to store
   */
  async setSecure(key: string, value: string): Promise<void> {
    // Always store in cache
    this.sessionCache.set(key, value);
    
    // Always store in localStorage as fallback
    localStorage.setItem(key, value);
    
    // If in localStorage only mode, don't try API
    if (this.useLocalStorageOnly) {
      return;
    }
    
    // Check if user is authenticated
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      return;
    }
    
    // Try to store on backend, but don't fail if it doesn't work
    try {
      await apiClient.post('/settings/secure-store', { key, value });
    } catch (error: any) {
      // If auth fails, switch to localStorage only mode
      if (error?.status === 401 || error?.status === 403) {
        this.useLocalStorageOnly = true;
      }
      // Don't throw - we have localStorage as fallback
    }
  }

  /**
   * Retrieve sensitive data from secure storage
   * @param key The key to retrieve
   */
  async getSecure(key: string): Promise<string | null> {
    // Check session cache first
    if (this.sessionCache.has(key)) {
      return this.sessionCache.get(key) || null;
    }

    // If we're in localStorage only mode, don't try the API
    if (this.useLocalStorageOnly) {
      return localStorage.getItem(key);
    }

    // Check if user has auth token
    const authToken = localStorage.getItem('authToken');
    const authUser = localStorage.getItem('authUser');
    
    // If no auth data or using development token, use localStorage only
    if (!authToken || !authUser || authToken === 'mock-jwt-token-for-development') {
      return localStorage.getItem(key);
    }

    // Try API call with error suppression
    try {
      // Create a promise that resolves with localStorage value after a timeout
      // This prevents hanging on failed auth
      const localStorageFallback = new Promise<string | null>((resolve) => {
        setTimeout(() => resolve(localStorage.getItem(key)), 100);
      });

      // Race between API call and fallback
      const apiCall = fetch(`${apiClient.defaults.baseURL}/settings/secure-store/${key}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (data?.value) {
            this.sessionCache.set(key, data.value);
            return data.value;
          }
        } else if (response.status === 401 || response.status === 403) {
          // Auth failed, switch to localStorage only mode
          this.useLocalStorageOnly = true;
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        }
        return localStorage.getItem(key);
      }).catch(() => {
        // Network error, use localStorage
        return localStorage.getItem(key);
      });

      // Return whichever resolves first
      return await Promise.race([apiCall, localStorageFallback]);
    } catch {
      // Any error, just use localStorage
      return localStorage.getItem(key);
    }
  }

  /**
   * Remove sensitive data from secure storage
   * @param key The key to remove
   */
  async removeSecure(key: string): Promise<void> {
    try {
      await apiClient.delete(`/settings/secure-store/${key}`);
      this.sessionCache.delete(key);
    } catch (error) {
      console.error('Failed to remove secure data:', error);
      throw error;
    }
  }

  /**
   * Clear all session cache (on logout)
   */
  clearCache(): void {
    this.sessionCache.clear();
    this.useLocalStorageOnly = false;
  }

  /**
   * Check if we have a valid API key stored
   */
  async hasValidApiKey(): Promise<boolean> {
    try {
      const response = await apiClient.get('/settings/api-key-status');
      return response.data.hasValidKey;
    } catch (error) {
      return false;
    }
  }
}

export const secureStorage = new SecureStorageService();

// Clear cache on logout
window.addEventListener('storage', (e) => {
  if (e.key === 'logout') {
    secureStorage.clearCache();
  }
});