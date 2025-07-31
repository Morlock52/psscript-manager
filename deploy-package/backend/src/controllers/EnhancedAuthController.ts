import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import User from '../models/User';
import MFAService from '../services/MFAService';
import OAuthService from '../services/OAuthService';
import SessionService from '../services/SessionService';
import PasswordService from '../services/PasswordService';
import logger from '../utils/logger';
import { sequelize } from '../database/connection';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Enhanced authentication controller with MFA, OAuth, and improved security
 */
export class EnhancedAuthController {
  /**
   * Enhanced login with MFA support
   */
  static async login(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || `login-${Date.now()}`;
    
    try {
      const { email, password, mfaToken } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      // Find user
      const user = await User.findOne({ 
        where: { email: email.toLowerCase().trim() } 
      });

      if (!user) {
        res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Invalid email or password' 
        });
        return;
      }

      // Check account lockout
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const remainingTime = Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / 60000);
        res.status(423).json({ 
          error: 'Account locked',
          message: `Account is locked. Please try again in ${remainingTime} minutes.`,
          lockedUntil: user.accountLockedUntil
        });
        return;
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password, requestId);
      
      if (!isValidPassword) {
        await this.handleFailedLogin(user, requestId);
        res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Invalid email or password' 
        });
        return;
      }

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        if (!mfaToken) {
          res.status(200).json({
            requiresMFA: true,
            message: 'Please provide MFA token'
          });
          return;
        }

        // Verify MFA token
        const mfaSecret = await MFAService.getUserMFASecret(user.id);
        if (!mfaSecret || !MFAService.verifyToken(mfaSecret, mfaToken)) {
          await this.handleFailedLogin(user, requestId);
          res.status(401).json({ 
            error: 'Invalid MFA token',
            message: 'Invalid or expired MFA token' 
          });
          return;
        }
      }

      // Reset failed login attempts
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();

      // Generate tokens
      const tokens = await this.generateTokenPair(user);

      // Create session
      const sessionId = await SessionService.createSession({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        ipAddress,
        userAgent
      });

      // Update last login
      await user.updateLoginTimestamp(requestId);

      // Log authentication event
      await this.logAuthEvent(user.id, 'login', { 
        ipAddress, 
        userAgent,
        mfaUsed: user.mfaEnabled 
      }, true);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId,
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          mfaEnabled: user.mfaEnabled,
          emailVerified: user.emailVerified
        }
      });

    } catch (error) {
      logger.error('Enhanced login error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred during login' 
      });
    }
  }

  /**
   * Setup MFA for user
   */
  static async setupMFA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await User.findByPk(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.mfaEnabled) {
        res.status(400).json({ 
          error: 'MFA already enabled',
          message: 'MFA is already enabled for this account' 
        });
        return;
      }

      // Generate MFA secret
      const secret = MFAService.generateSecret(user.username, user.email);
      const qrCode = await MFAService.generateQRCode(secret.otpauth_url);

      // Temporarily store secret (will be confirmed on verification)
      (req as any).session = { mfaSecret: secret.base32 };

      res.status(200).json({
        success: true,
        secret: secret.base32,
        qrCode,
        manualEntryKey: secret.base32
      });

    } catch (error) {
      logger.error('MFA setup error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to setup MFA' 
      });
    }
  }

  /**
   * Verify and enable MFA
   */
  static async verifyMFA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { token, secret } = req.body;

      if (!token || !secret) {
        res.status(400).json({ 
          error: 'Missing parameters',
          message: 'Token and secret are required' 
        });
        return;
      }

      // Enable MFA
      const result = await MFAService.enableMFA(userId, secret, token);

      if (!result.success) {
        res.status(400).json({ 
          error: 'Invalid token',
          message: 'Invalid MFA token. Please try again.' 
        });
        return;
      }

      // Store backup codes
      if (result.backupCodes) {
        await this.storeBackupCodes(userId, result.backupCodes);
      }

      await this.logAuthEvent(userId, 'mfa_enabled', {}, true);

      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully',
        backupCodes: result.backupCodes
      });

    } catch (error) {
      logger.error('MFA verification error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to verify MFA' 
      });
    }
  }

  /**
   * Disable MFA
   */
  static async disableMFA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;

      // Verify password before disabling MFA
      const user = await User.findByPk(userId);
      if (!user || !await user.validatePassword(password)) {
        res.status(401).json({ 
          error: 'Invalid password',
          message: 'Invalid password' 
        });
        return;
      }

      await MFAService.disableMFA(userId);
      await this.logAuthEvent(userId, 'mfa_disabled', {}, true);

      res.status(200).json({
        success: true,
        message: 'MFA disabled successfully'
      });

    } catch (error) {
      logger.error('MFA disable error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to disable MFA' 
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ 
          error: 'Missing refresh token',
          message: 'Refresh token is required' 
        });
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret'
      ) as any;

      // Find user and verify stored refresh token
      const user = await User.findByPk(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        res.status(401).json({ 
          error: 'Invalid refresh token',
          message: 'Invalid or expired refresh token' 
        });
        return;
      }

      // Check if refresh token is expired
      if (user.refreshTokenExpires && user.refreshTokenExpires < new Date()) {
        res.status(401).json({ 
          error: 'Expired refresh token',
          message: 'Refresh token has expired' 
        });
        return;
      }

      // Generate new token pair
      const tokens = await this.generateTokenPair(user);

      res.status(200).json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({ 
        error: 'Invalid refresh token',
        message: 'Failed to refresh token' 
      });
    }
  }

  /**
   * Initiate password reset
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await User.findOne({ 
        where: { email: email.toLowerCase().trim() } 
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.status(200).json({
          success: true,
          message: 'If an account exists, a password reset link has been sent'
        });
        return;
      }

      // Generate reset token
      const resetData = PasswordService.generateResetToken();
      
      user.passwordResetToken = resetData.hashedToken;
      user.passwordResetExpires = resetData.expires;
      await user.save();

      // TODO: Send email with reset link containing resetData.token
      logger.info('Password reset requested', {
        userId: user.id,
        email: user.email
      });

      await this.logAuthEvent(user.id, 'password_reset_requested', {}, true);

      res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset link has been sent'
      });

    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process password reset request' 
      });
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ 
          error: 'Missing parameters',
          message: 'Token and new password are required' 
        });
        return;
      }

      // Find user with valid reset token
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        res.status(400).json({ 
          error: 'Invalid token',
          message: 'Invalid or expired reset token' 
        });
        return;
      }

      // Validate new password
      const passwordCheck = PasswordService.checkPasswordStrength(
        newPassword,
        { username: user.username, email: user.email }
      );

      if (!passwordCheck.isValid) {
        res.status(400).json({ 
          error: 'Weak password',
          message: 'Password does not meet requirements',
          feedback: passwordCheck.feedback 
        });
        return;
      }

      // Update password
      user.password = newPassword; // Will be hashed by model hook
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();

      // Invalidate all existing sessions
      await SessionService.destroyUserSessions(user.id);

      await this.logAuthEvent(user.id, 'password_reset_completed', {}, true);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to reset password' 
      });
    }
  }

  /**
   * Get user sessions
   */
  static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const sessions = await SessionService.getUserSessions(userId);

      res.status(200).json({
        success: true,
        sessions
      });

    } catch (error) {
      logger.error('Get sessions error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve sessions' 
      });
    }
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { sessionId } = req.params;

      // Verify session belongs to user
      const sessions = await SessionService.getUserSessions(userId);
      const session = sessions.find(s => s.sessionId === sessionId);

      if (!session) {
        res.status(404).json({ 
          error: 'Session not found',
          message: 'Session not found or does not belong to user' 
        });
        return;
      }

      await SessionService.destroySession(sessionId);

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully'
      });

    } catch (error) {
      logger.error('Revoke session error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to revoke session' 
      });
    }
  }

  /**
   * Private helper methods
   */

  private static async handleFailedLogin(user: User, requestId: string): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLoginAt = new Date();

    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      const lockDuration = parseInt(process.env.ACCOUNT_LOCK_DURATION || '30'); // minutes
      user.accountLockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
      
      logger.warn('Account locked due to failed login attempts', {
        userId: user.id,
        username: user.username,
        failedAttempts: user.failedLoginAttempts,
        lockedUntil: user.accountLockedUntil,
        requestId
      });
    }

    await user.save();
    await this.logAuthEvent(user.id, 'login_failed', { 
      failedAttempts: user.failedLoginAttempts 
    }, false);
  }

  private static async generateTokenPair(user: User): Promise<TokenPair> {
    const accessTokenPayload = {
      userId: String(user.id),
      username: user.username,
      email: user.email,
      role: String(user.role)
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'psscript-api',
        audience: 'psscript-frontend'
      }
    );

    const refreshTokenPayload = {
      userId: String(user.id),
      type: 'refresh'
    };

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { 
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
      }
    );

    // Store refresh token
    user.refreshToken = refreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await user.save();

    return { accessToken, refreshToken };
  }

  private static async storeBackupCodes(userId: number, codes: string[]): Promise<void> {
    const hashedCodes = codes.map(code => ({
      userId,
      code: crypto.createHash('sha256').update(code).digest('hex')
    }));

    await sequelize.query(
      `INSERT INTO mfa_backup_codes (user_id, code) VALUES ${hashedCodes.map(() => '(?, ?)').join(', ')}`,
      {
        replacements: hashedCodes.flatMap(hc => [hc.userId, hc.code])
      }
    );
  }

  private static async logAuthEvent(
    userId: number | null,
    eventType: string,
    eventData: any,
    success: boolean
  ): Promise<void> {
    try {
      await sequelize.query(
        `INSERT INTO auth_audit_log (user_id, event_type, event_data, success) 
         VALUES (:userId, :eventType, :eventData, :success)`,
        {
          replacements: {
            userId,
            eventType,
            eventData: JSON.stringify(eventData),
            success
          }
        }
      );
    } catch (error) {
      logger.error('Failed to log auth event:', error);
    }
  }
}

export default EnhancedAuthController;