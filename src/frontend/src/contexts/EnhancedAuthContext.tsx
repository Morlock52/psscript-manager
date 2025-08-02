import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { enhancedAuthService } from '../services/enhancedAuthService';

// Enhanced User interface with MFA and OAuth support
export interface EnhancedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  avatar_url?: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  linkedProviders?: string[];
  permissions?: string[];
}

// Session information
export interface Session {
  sessionId: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

// MFA setup response
export interface MFASetupData {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

// Enhanced auth context type
interface EnhancedAuthContextType {
  // User state
  user: EnhancedUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  isLoading: boolean;
  
  // Auth methods
  login: (email: string, password: string, mfaToken?: string) => Promise<{ requiresMFA?: boolean }>;
  loginWithProvider: (provider: 'google' | 'github' | 'microsoft') => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  
  // MFA methods
  setupMFA: () => Promise<MFASetupData>;
  verifyMFA: (token: string, secret: string) => Promise<{ backupCodes: string[] }>;
  disableMFA: (password: string) => Promise<void>;
  
  // Session methods
  getSessions: () => Promise<Session[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  
  // Password methods
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType>(null as any);

interface EnhancedAuthProviderProps {
  children: ReactNode;
}

export const EnhancedAuthProvider: React.FC<EnhancedAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAccessToken = localStorage.getItem('accessToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const storedSessionId = localStorage.getItem('sessionId');
        const storedUser = localStorage.getItem('user');

        if (storedAccessToken && storedRefreshToken && storedSessionId && storedUser) {
          const parsedUser: EnhancedUser = JSON.parse(storedUser);
          
          // Verify token is still valid
          api.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
          api.defaults.headers.common['X-Session-Id'] = storedSessionId;

          try {
            // Verify session
            const response = await api.get('/api/auth/legacy/me');
            if (response.data.user) {
              setUser({ ...parsedUser, ...response.data.user });
              setAccessToken(storedAccessToken);
              setRefreshToken(storedRefreshToken);
              setSessionId(storedSessionId);
            }
          } catch (error: any) {
            // Try to refresh token
            if (error.response?.status === 401 && storedRefreshToken) {
              await refreshAccessTokenInternal(storedRefreshToken);
            } else {
              clearAuth();
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Clear auth data
  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setSessionId(null);
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['X-Session-Id'];
  };

  // Store auth data
  const storeAuth = (userData: EnhancedUser, tokens: { accessToken: string; refreshToken: string }, sessionId: string) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setSessionId(sessionId);
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    api.defaults.headers.common['X-Session-Id'] = sessionId;
  };

  // Login method
  const login = useCallback(async (email: string, password: string, mfaToken?: string) => {
    try {
      const response = await enhancedAuthService.login(email, password, mfaToken);
      
      if (response.requiresMFA) {
        return { requiresMFA: true };
      }

      storeAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken
      }, response.sessionId);

      return {};
    } catch (error) {
      throw error;
    }
  }, []);

  // Login with OAuth provider
  const loginWithProvider = useCallback((provider: 'google' | 'github' | 'microsoft') => {
    window.location.href = `/api/auth/${provider}`;
  }, []);

  // Logout method
  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await api.post('/api/auth/legacy/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  }, [accessToken]);

  // Refresh access token
  const refreshAccessTokenInternal = async (token: string) => {
    try {
      const response = await enhancedAuthService.refreshToken(token);
      
      if (user) {
        storeAuth(user, {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        }, sessionId!);
      }
    } catch (error) {
      clearAuth();
      throw error;
    }
  };

  const refreshAccessToken = useCallback(async () => {
    if (refreshToken) {
      await refreshAccessTokenInternal(refreshToken);
    }
  }, [refreshToken]);

  // MFA methods
  const setupMFA = useCallback(async () => {
    return enhancedAuthService.setupMFA();
  }, []);

  const verifyMFA = useCallback(async (token: string, secret: string) => {
    const response = await enhancedAuthService.verifyMFA(token, secret);
    if (user) {
      setUser({ ...user, mfaEnabled: true });
    }
    return response;
  }, [user]);

  const disableMFA = useCallback(async (password: string) => {
    await enhancedAuthService.disableMFA(password);
    if (user) {
      setUser({ ...user, mfaEnabled: false });
    }
  }, [user]);

  // Session methods
  const getSessions = useCallback(async () => {
    return enhancedAuthService.getSessions();
  }, []);

  const revokeSession = useCallback(async (sessionIdToRevoke: string) => {
    await enhancedAuthService.revokeSession(sessionIdToRevoke);
    if (sessionIdToRevoke === sessionId) {
      clearAuth();
    }
  }, [sessionId]);

  // Password methods
  const forgotPassword = useCallback(async (email: string) => {
    return enhancedAuthService.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    return enhancedAuthService.resetPassword(token, newPassword);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    return enhancedAuthService.changePassword(currentPassword, newPassword);
  }, []);

  // Permission checks
  const hasPermission = useCallback((permission: string) => {
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string[]) => {
    return permissions.some(p => user?.permissions?.includes(p)) || false;
  }, [user]);

  const hasAllPermissions = useCallback((permissions: string[]) => {
    return permissions.every(p => user?.permissions?.includes(p)) || false;
  }, [user]);

  // Set up token refresh interval
  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    // Refresh token every 10 minutes
    const interval = setInterval(() => {
      refreshAccessToken().catch(console.error);
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken, refreshToken, refreshAccessToken]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const callbackAccessToken = urlParams.get('accessToken');
      const callbackRefreshToken = urlParams.get('refreshToken');

      if (callbackAccessToken && callbackRefreshToken) {
        try {
          // Get user info with the new tokens
          api.defaults.headers.common['Authorization'] = `Bearer ${callbackAccessToken}`;
          const response = await api.get('/api/auth/me');
          
          if (response.data.user) {
            // Create session
            // Session is already created by backend on OAuth callback
            const sessionId = response.data.sessionId || 'oauth-session';
            
            storeAuth(response.data.user, {
              accessToken: callbackAccessToken,
              refreshToken: callbackRefreshToken
            }, sessionResponse.data.sessionId);

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          clearAuth();
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const value = {
    user,
    accessToken,
    refreshToken,
    sessionId,
    isLoading,
    login,
    loginWithProvider,
    logout,
    refreshAccessToken,
    setupMFA,
    verifyMFA,
    disableMFA,
    getSessions,
    revokeSession,
    forgotPassword,
    resetPassword,
    changePassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };

  return <EnhancedAuthContext.Provider value={value}>{children}</EnhancedAuthContext.Provider>;
};

export default EnhancedAuthContext;