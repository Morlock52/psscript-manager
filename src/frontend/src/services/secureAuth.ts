import { apiClient } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface AuthResponse {
  user: User;
  token?: string; // Only for API clients, web uses httpOnly cookies
}

/**
 * Secure authentication service using HttpOnly cookies
 * No tokens stored in localStorage - prevents XSS attacks
 */
class SecureAuthService {
  private currentUser: User | null = null;
  private initialized = false;

  /**
   * Initialize auth service and check current session
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const response = await apiClient.get<{ user: User }>('/api/auth/legacy/me');
      this.currentUser = response.data.user;
      this.initialized = true;
    } catch (error) {
      // User not authenticated
      this.currentUser = null;
      this.initialized = true;
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials, {
        withCredentials: true // Ensure cookies are sent
      });

      this.currentUser = response.data.user;
      
      // Trigger auth state change event
      window.dispatchEvent(new CustomEvent('auth-state-changed', { 
        detail: { user: this.currentUser } 
      }));

      return this.currentUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', data, {
        withCredentials: true
      });

      this.currentUser = response.data.user;
      
      window.dispatchEvent(new CustomEvent('auth-state-changed', { 
        detail: { user: this.currentUser } 
      }));

      return this.currentUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/legacy/logout', {}, {
        withCredentials: true
      });

      this.currentUser = null;
      
      window.dispatchEvent(new CustomEvent('auth-state-changed', { 
        detail: { user: null } 
      }));

      // Clear any client-side data
      this.clearClientData();
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force client-side logout even if request fails
      this.currentUser = null;
      this.clearClientData();
      window.location.href = '/login';
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    try {
      await apiClient.post('/auth/refresh', {}, {
        withCredentials: true
      });
    } catch (error) {
      // Token refresh failed, user needs to login again
      this.currentUser = null;
      throw error;
    }
  }

  /**
   * Clear any client-side data (not tokens - they're in httpOnly cookies)
   */
  private clearClientData(): void {
    // Clear any app-specific client data
    sessionStorage.clear();
    
    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
  }

  /**
   * Setup axios interceptor for authentication
   */
  setupInterceptors(): void {
    // Request interceptor - cookies are automatically sent
    apiClient.interceptors.request.use(
      (config) => {
        // Ensure credentials are included
        config.withCredentials = true;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling auth errors
    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            await this.refreshToken();
            // Retry original request
            return apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.currentUser = null;
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }
}

// Export singleton instance
export const authService = new SecureAuthService();

// Initialize on import
authService.setupInterceptors();

// React hook for auth state
export function useAuth() {
  const [user, setUser] = React.useState<User | null>(authService.getCurrentUser());
  const [loading, setLoading] = React.useState(!authService.initialized);

  React.useEffect(() => {
    // Initialize auth service
    authService.initialize().then(() => {
      setUser(authService.getCurrentUser());
      setLoading(false);
    });

    // Listen for auth state changes
    const handleAuthChange = (event: CustomEvent) => {
      setUser(event.detail.user);
    };

    window.addEventListener('auth-state-changed', handleAuthChange as any);
    
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange as any);
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: authService.isAuthenticated(),
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService),
    hasRole: authService.hasRole.bind(authService)
  };
}

// Secure storage for non-sensitive data using encryption
class SecureStorage {
  private readonly ENCRYPTION_KEY = 'psscript-client-key'; // Should be unique per user

  /**
   * Encrypt and store data in IndexedDB
   */
  async setSecure(key: string, value: any): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(value));
    
    // Store in IndexedDB instead of localStorage
    const db = await this.openDB();
    const tx = db.transaction('secure-store', 'readwrite');
    await tx.objectStore('secure-store').put({ key, value: encrypted });
  }

  /**
   * Retrieve and decrypt data from IndexedDB
   */
  async getSecure(key: string): Promise<any> {
    const db = await this.openDB();
    const tx = db.transaction('secure-store', 'readonly');
    const data = await tx.objectStore('secure-store').get(key);
    
    if (!data) return null;
    
    const decrypted = await this.decrypt(data.value);
    return JSON.parse(decrypted);
  }

  /**
   * Remove secure data
   */
  async removeSecure(key: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction('secure-store', 'readwrite');
    await tx.objectStore('secure-store').delete(key);
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('psscript-secure', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('secure-store')) {
          db.createObjectStore('secure-store', { keyPath: 'key' });
        }
      };
    });
  }

  private async encrypt(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encryptedText: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const key = await this.getKey();
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  private async getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.ENCRYPTION_KEY),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('psscript-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

export const secureStorage = new SecureStorage();