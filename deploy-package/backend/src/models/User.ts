import { Model, DataTypes, Sequelize } from 'sequelize';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

export default class User extends Model {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public role!: string;
  public lastLoginAt?: Date;
  public loginAttempts?: number;
  public mfaEnabled!: boolean;
  public mfaSecret?: string;
  public emailVerified!: boolean;
  public emailVerificationToken?: string;
  public passwordResetToken?: string;
  public passwordResetExpires?: Date;
  public accountLockedUntil?: Date;
  public failedLoginAttempts!: number;
  public lastFailedLoginAt?: Date;
  public refreshToken?: string;
  public refreshTokenExpires?: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Validate a password against the stored hash
   * @param password The plaintext password to validate
   * @param requestId Optional request ID for logging
   * @returns Promise<boolean> True if password is valid
   */
  public async validatePassword(password: string, requestId?: string): Promise<boolean> {
    const startTime = Date.now();
    
    if (!password) {
      logger.warn('Password validation failed: Empty password provided', {
        userId: this.id,
        username: this.username,
        requestId
      });
      return false;
    }
    
    try {
      // Use bcrypt to compare the provided password with the stored hashed password
      const isValid = await bcrypt.compare(password, this.password);
      
      const processingTime = Date.now() - startTime;
      
      if (isValid) {
        logger.debug('Password validation successful', {
          userId: this.id,
          username: this.username,
          processingTime,
          requestId
        });
      } else {
        logger.warn('Password validation failed: Invalid password', {
          userId: this.id,
          username: this.username,
          processingTime,
          requestId
        });
      }
      
      return isValid;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Password validation error:', {
        userId: this.id,
        username: this.username,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
        requestId
      });
      
      return false;
    }
  }
  
  /**
   * Update the last login timestamp for this user
   * @param requestId Optional request ID for logging
   */
  public async updateLoginTimestamp(requestId?: string): Promise<void> {
    try {
      this.lastLoginAt = new Date();
      await this.save();
      
      logger.debug('Updated user login timestamp', {
        userId: this.id,
        username: this.username,
        lastLoginAt: this.lastLoginAt,
        requestId
      });
    } catch (error) {
      logger.error('Failed to update login timestamp:', {
        userId: this.id,
        username: this.username,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }
  }
  
  /**
   * Track login attempts for this user
   * @param success Whether the login attempt was successful
   * @param requestId Optional request ID for logging
   */
  public async trackLoginAttempt(success: boolean, requestId?: string): Promise<void> {
    try {
      // Initialize login attempts if not set
      if (this.loginAttempts === undefined) {
        this.loginAttempts = 0;
      }
      
      if (success) {
        // Reset login attempts on successful login
        this.loginAttempts = 0;
        await this.updateLoginTimestamp(requestId);
      } else {
        // Increment login attempts on failed login
        this.loginAttempts += 1;
      }
      
      await this.save();
      
      logger.debug('Tracked user login attempt', {
        userId: this.id,
        username: this.username,
        success,
        loginAttempts: this.loginAttempts,
        requestId
      });
    } catch (error) {
      logger.error('Failed to track login attempt:', {
        userId: this.id,
        username: this.username,
        success,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }
  }

  static initialize(sequelize: Sequelize) {
    User.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'password_hash'
      },
      role: {
        type: DataTypes.STRING(20),
        defaultValue: 'user'
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at'
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'login_attempts'
      },
      mfaEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'mfa_enabled'
      },
      mfaSecret: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'mfa_secret'
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'email_verified'
      },
      emailVerificationToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'email_verification_token'
      },
      passwordResetToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'password_reset_token'
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'password_reset_expires'
      },
      accountLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'account_locked_until'
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'failed_login_attempts'
      },
      lastFailedLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_failed_login_at'
      },
      refreshToken: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'refresh_token'
      },
      refreshTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'refresh_token_expires'
      }
    }, { 
      sequelize,
      tableName: 'users',
      underscored: true,
      hooks: {
        beforeCreate: async (user: User) => {
          try {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
            logger.debug('User password hashed for new user', {
              username: user.username,
              email: user.email
            });
          } catch (error) {
            logger.error('Error hashing password during user creation:', {
              username: user.username,
              email: user.email,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
          }
        },
        beforeUpdate: async (user: User) => {
          if (user.changed('password')) {
            try {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
              logger.debug('User password updated and hashed', {
                userId: user.id,
                username: user.username
              });
            } catch (error) {
              logger.error('Error hashing password during user update:', {
                userId: user.id,
                username: user.username,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              throw error;
            }
          }
        },
        afterCreate: (user: User) => {
          logger.info('New user created', {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          });
        },
        afterUpdate: (user: User) => {
          const changedFields = user.changed();
          if (changedFields && changedFields.length > 0) {
            logger.info('User updated', {
              userId: user.id,
              username: user.username,
              changedFields: changedFields.filter(field => field !== 'password')
            });
          }
        }
      }
    });
  }
}
