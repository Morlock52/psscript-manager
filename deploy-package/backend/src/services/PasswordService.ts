import crypto from 'crypto';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

interface PasswordStrength {
  score: number; // 0-4 scale
  feedback: string[];
  isValid: boolean;
}

interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
}

/**
 * Service for password validation and management
 */
export class PasswordService {
  private static readonly DEFAULT_REQUIREMENTS: PasswordRequirements = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventUserInfo: true
  };

  private static readonly COMMON_PASSWORDS = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890',
    'password1', 'qwerty123', 'admin123', 'root', 'toor',
    'pass', 'test', 'guest', 'master', 'dragon', 'football',
    'baseball', 'superman', 'batman', 'trustno1'
  ];

  private static readonly SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;\':",./<>?';

  /**
   * Check password strength and validity
   */
  static checkPasswordStrength(
    password: string,
    userInfo?: { username?: string; email?: string },
    requirements?: Partial<PasswordRequirements>
  ): PasswordStrength {
    const reqs = { ...this.DEFAULT_REQUIREMENTS, ...requirements };
    const feedback: string[] = [];
    let score = 0;

    // Check minimum length
    if (password.length < reqs.minLength) {
      feedback.push(`Password must be at least ${reqs.minLength} characters long`);
    } else {
      score++;
      // Bonus for extra length
      if (password.length >= 16) score++;
      if (password.length >= 20) score++;
    }

    // Check character requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = new RegExp(`[${this.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password);

    if (reqs.requireUppercase && !hasUppercase) {
      feedback.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
      score += 0.5;
    }

    if (reqs.requireLowercase && !hasLowercase) {
      feedback.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
      score += 0.5;
    }

    if (reqs.requireNumbers && !hasNumbers) {
      feedback.push('Password must contain at least one number');
    } else if (hasNumbers) {
      score += 0.5;
    }

    if (reqs.requireSpecialChars && !hasSpecialChars) {
      feedback.push('Password must contain at least one special character');
    } else if (hasSpecialChars) {
      score += 0.5;
    }

    // Check for common passwords
    if (reqs.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (this.COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
        feedback.push('Password is too common or contains common words');
        score = Math.max(0, score - 2);
      }
    }

    // Check for user info in password
    if (reqs.preventUserInfo && userInfo) {
      const lowerPassword = password.toLowerCase();
      
      if (userInfo.username && lowerPassword.includes(userInfo.username.toLowerCase())) {
        feedback.push('Password should not contain your username');
        score = Math.max(0, score - 1);
      }

      if (userInfo.email) {
        const emailPrefix = userInfo.email.split('@')[0].toLowerCase();
        if (lowerPassword.includes(emailPrefix)) {
          feedback.push('Password should not contain parts of your email');
          score = Math.max(0, score - 1);
        }
      }
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Password should not contain repeated characters');
      score = Math.max(0, score - 0.5);
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      feedback.push('Password should not contain sequential characters');
      score = Math.max(0, score - 0.5);
    }

    // Normalize score to 0-4 scale
    score = Math.min(4, Math.max(0, score));

    return {
      score: Math.round(score),
      feedback,
      isValid: feedback.length === 0
    };
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = this.SPECIAL_CHARS;
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one character from each category
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(0, 2) - 1).join('');
  }

  /**
   * Generate a password reset token
   */
  static generateResetToken(): { token: string; hashedToken: string; expires: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiry

    return { token, hashedToken, expires };
  }

  /**
   * Verify a password reset token
   */
  static verifyResetToken(token: string, hashedToken: string): boolean {
    const hashedInput = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    return hashedInput === hashedToken;
  }

  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check for sequential characters
   */
  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
      '1234567890',
      '0987654321'
    ];

    const lowerPassword = password.toLowerCase();
    
    for (const seq of sequences) {
      for (let i = 0; i < lowerPassword.length - 2; i++) {
        const chunk = lowerPassword.substring(i, i + 3);
        if (seq.includes(chunk)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Estimate password crack time
   */
  static estimateCrackTime(password: string): string {
    const charSpace = this.calculateCharacterSpace(password);
    const combinations = Math.pow(charSpace, password.length);
    
    // Assuming 1 billion attempts per second
    const secondsToCrack = combinations / 1e9;
    
    if (secondsToCrack < 60) {
      return 'Less than a minute';
    } else if (secondsToCrack < 3600) {
      return `${Math.round(secondsToCrack / 60)} minutes`;
    } else if (secondsToCrack < 86400) {
      return `${Math.round(secondsToCrack / 3600)} hours`;
    } else if (secondsToCrack < 31536000) {
      return `${Math.round(secondsToCrack / 86400)} days`;
    } else if (secondsToCrack < 31536000 * 100) {
      return `${Math.round(secondsToCrack / 31536000)} years`;
    } else {
      return 'Centuries';
    }
  }

  /**
   * Calculate character space for password
   */
  private static calculateCharacterSpace(password: string): number {
    let space = 0;
    
    if (/[a-z]/.test(password)) space += 26;
    if (/[A-Z]/.test(password)) space += 26;
    if (/\d/.test(password)) space += 10;
    if (new RegExp(`[${this.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
      space += this.SPECIAL_CHARS.length;
    }

    return space;
  }
}

export default PasswordService;