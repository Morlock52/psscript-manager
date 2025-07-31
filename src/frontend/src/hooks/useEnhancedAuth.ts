import { useContext } from 'react';
import EnhancedAuthContext from '../contexts/EnhancedAuthContext';

/**
 * Enhanced authentication hook with MFA, OAuth, and permission support
 */
export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);
  
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  
  return context;
};

// Export specific auth utilities
export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useEnhancedAuth();
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};

export const useMFA = () => {
  const { user, setupMFA, verifyMFA, disableMFA } = useEnhancedAuth();
  
  return {
    isMFAEnabled: user?.mfaEnabled || false,
    setupMFA,
    verifyMFA,
    disableMFA
  };
};

export const useSessions = () => {
  const { sessionId, getSessions, revokeSession } = useEnhancedAuth();
  
  return {
    currentSessionId: sessionId,
    getSessions,
    revokeSession
  };
};

export const useAuthState = () => {
  const { user, isLoading, accessToken } = useEnhancedAuth();
  
  return {
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    user
  };
};

export default useEnhancedAuth;