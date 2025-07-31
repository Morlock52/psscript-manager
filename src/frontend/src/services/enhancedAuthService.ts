import api from './api';

export interface LoginResponse {
  success: boolean;
  message?: string;
  requiresMFA?: boolean;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  user?: any;
}

export interface MFASetupResponse {
  success: boolean;
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

export interface MFAVerifyResponse {
  success: boolean;
  message: string;
  backupCodes: string[];
}

export interface Session {
  sessionId: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
  estimatedCrackTime?: string;
}

class EnhancedAuthService {
  /**
   * Login with email and password
   */
  async login(email: string, password: string, mfaToken?: string): Promise<LoginResponse> {
    const response = await api.post('/api/auth/login', {
      email,
      password,
      mfaToken
    });
    return response.data;
  }

  /**
   * Register new user
   */
  async register(username: string, email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/api/auth/register', {
      username,
      email,
      password
    });
    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await api.post('/api/auth/refresh-token', {
      refreshToken
    });
    return response.data;
  }

  /**
   * Setup MFA for current user
   */
  async setupMFA(): Promise<MFASetupResponse> {
    const response = await api.post('/api/auth/mfa/setup');
    return response.data;
  }

  /**
   * Verify MFA token and enable MFA
   */
  async verifyMFA(token: string, secret: string): Promise<MFAVerifyResponse> {
    const response = await api.post('/api/auth/mfa/verify', {
      token,
      secret
    });
    return response.data;
  }

  /**
   * Disable MFA
   */
  async disableMFA(password: string): Promise<void> {
    await api.post('/api/auth/mfa/disable', {
      password
    });
  }

  /**
   * Get all active sessions
   */
  async getSessions(): Promise<Session[]> {
    const response = await api.get('/api/auth/sessions');
    return response.data.sessions.map((s: any) => ({
      ...s,
      lastActivity: new Date(s.lastActivity),
      expiresAt: new Date(s.expiresAt)
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/api/auth/sessions/${sessionId}`);
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    await api.post('/api/auth/forgot-password', {
      email
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/api/auth/reset-password', {
      token,
      newPassword
    });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
  }

  /**
   * Check password strength
   */
  async checkPasswordStrength(password: string, userInfo?: { username?: string; email?: string }): Promise<PasswordStrength> {
    const response = await api.post('/api/auth/check-password-strength', {
      password,
      userInfo
    });
    return response.data;
  }

  /**
   * Get user's linked OAuth providers
   */
  async getLinkedProviders(): Promise<string[]> {
    const response = await api.get('/api/auth/linked-providers');
    return response.data.providers;
  }

  /**
   * Unlink OAuth provider
   */
  async unlinkProvider(provider: string): Promise<void> {
    await api.delete(`/api/auth/providers/${provider}`);
  }

  /**
   * Get user's permissions
   */
  async getUserPermissions(): Promise<string[]> {
    const response = await api.get('/api/auth/permissions');
    return response.data.permissions;
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    await api.post('/api/auth/verify-email', {
      token
    });
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<void> {
    await api.post('/api/auth/resend-verification');
  }

  /**
   * Get authentication audit log
   */
  async getAuthAuditLog(limit: number = 50): Promise<any[]> {
    const response = await api.get('/api/auth/audit-log', {
      params: { limit }
    });
    return response.data.logs;
  }
}

export const enhancedAuthService = new EnhancedAuthService();
export default enhancedAuthService;