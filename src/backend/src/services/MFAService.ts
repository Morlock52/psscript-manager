import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import User from '../models/User';
import logger from '../utils/logger';

interface MFASecret {
  base32: string;
  otpauth_url: string;
}

interface BackupCode {
  code: string;
  hashedCode: string;
}

/**
 * Service for handling Multi-Factor Authentication (MFA) operations
 */
export class MFAService {
  private static readonly APP_NAME = 'PSScript';
  private static readonly BACKUP_CODES_COUNT = 10;
  private static readonly BACKUP_CODE_LENGTH = 8;

  /**
   * Generate a new MFA secret for a user
   */
  static generateSecret(username: string, email: string): MFASecret {
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${email})`,
      issuer: this.APP_NAME,
      length: 32
    });

    return {
      base32: secret.base32,
      otpauth_url: secret.otpauth_url || ''
    };
  }

  /**
   * Generate QR code for MFA setup
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      logger.error('Failed to generate QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(secret: string, token: string): boolean {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps in either direction
      });

      return verified;
    } catch (error) {
      logger.error('Failed to verify TOTP token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for MFA recovery
   */
  static generateBackupCodes(): BackupCode[] {
    const codes: BackupCode[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(this.BACKUP_CODE_LENGTH)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,4}/g)
        ?.join('-') || '';

      // Hash the backup code for storage
      const hashedCode = crypto
        .createHash('sha256')
        .update(code)
        .digest('hex');

      codes.push({
        code,
        hashedCode
      });
    }

    return codes;
  }

  /**
   * Verify a backup code
   */
  static verifyBackupCode(code: string, hashedCode: string): boolean {
    const hashedInput = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    return hashedInput === hashedCode;
  }

  /**
   * Enable MFA for a user
   */
  static async enableMFA(userId: number, secret: string, token: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    try {
      // Verify the token first
      if (!this.verifyToken(secret, token)) {
        return { success: false };
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Update user with MFA enabled
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.mfaEnabled = true;
      user.mfaSecret = secret;
      await user.save();

      // Store backup codes (implement in a separate model/table)
      // For now, we'll return them to be stored by the controller

      logger.info('MFA enabled for user', {
        userId,
        username: user.username
      });

      return {
        success: true,
        backupCodes: backupCodes.map(bc => bc.code)
      };
    } catch (error) {
      logger.error('Failed to enable MFA:', error);
      throw error;
    }
  }

  /**
   * Disable MFA for a user
   */
  static async disableMFA(userId: number): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.mfaEnabled = false;
      user.mfaSecret = null;
      await user.save();

      logger.info('MFA disabled for user', {
        userId,
        username: user.username
      });
    } catch (error) {
      logger.error('Failed to disable MFA:', error);
      throw error;
    }
  }

  /**
   * Check if user has MFA enabled
   */
  static async isMFAEnabled(userId: number): Promise<boolean> {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['mfaEnabled']
      });

      return user?.mfaEnabled || false;
    } catch (error) {
      logger.error('Failed to check MFA status:', error);
      return false;
    }
  }

  /**
   * Get user's MFA secret (for verification)
   */
  static async getUserMFASecret(userId: number): Promise<string | null> {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['mfaSecret', 'mfaEnabled']
      });

      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        return null;
      }

      return user.mfaSecret;
    } catch (error) {
      logger.error('Failed to get user MFA secret:', error);
      return null;
    }
  }
}

export default MFAService;