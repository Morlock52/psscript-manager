import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import User from '../models/User';
import logger from '../utils/logger';
import { sequelize } from '../database/connection';

interface OAuthProfile {
  provider: string;
  id: string;
  email: string;
  displayName: string;
  photos?: Array<{ value: string }>;
}

interface OAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string[];
}

/**
 * Service for handling OAuth authentication
 */
export class OAuthService {
  /**
   * Initialize all OAuth strategies
   */
  static initializeStrategies(): void {
    // Initialize Google OAuth
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.initializeGoogleStrategy();
    }

    // Initialize GitHub OAuth
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.initializeGitHubStrategy();
    }

    // Initialize Microsoft OAuth
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      this.initializeMicrosoftStrategy();
    }

    // Serialize/Deserialize user
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await User.findByPk(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Initialize Google OAuth strategy
   */
  private static initializeGoogleStrategy(): void {
    const config: OAuthConfig = {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.APP_URL}/api/auth/google/callback`,
      scope: ['profile', 'email']
    };

    passport.use(new GoogleStrategy(
      config as any,
      async (accessToken, refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            provider: 'google',
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            displayName: profile.displayName,
            photos: profile.photos
          };

          const user = await this.findOrCreateOAuthUser(oauthProfile);
          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    ));

    logger.info('Google OAuth strategy initialized');
  }

  /**
   * Initialize GitHub OAuth strategy
   */
  private static initializeGitHubStrategy(): void {
    const config: OAuthConfig = {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: `${process.env.APP_URL}/api/auth/github/callback`,
      scope: ['user:email']
    };

    passport.use(new GitHubStrategy(
      config as any,
      async (accessToken, refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            provider: 'github',
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            displayName: profile.displayName || profile.username,
            photos: profile.photos
          };

          const user = await this.findOrCreateOAuthUser(oauthProfile);
          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    ));

    logger.info('GitHub OAuth strategy initialized');
  }

  /**
   * Initialize Microsoft OAuth strategy
   */
  private static initializeMicrosoftStrategy(): void {
    const config = {
      clientID: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      callbackURL: `${process.env.APP_URL}/api/auth/microsoft/callback`,
      tenant: 'common',
      authorizationURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scope: ['user.read']
    };

    passport.use(new MicrosoftStrategy(
      config as any,
      async (accessToken, refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            provider: 'microsoft',
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            displayName: profile.displayName,
            photos: profile.photos
          };

          const user = await this.findOrCreateOAuthUser(oauthProfile);
          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    ));

    logger.info('Microsoft OAuth strategy initialized');
  }

  /**
   * Find or create user from OAuth profile
   */
  private static async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
    const transaction = await sequelize.transaction();

    try {
      // First, check if OAuth provider entry exists
      const [oauthProvider] = await sequelize.query(
        `SELECT user_id FROM oauth_providers WHERE provider = :provider AND provider_user_id = :providerId`,
        {
          replacements: {
            provider: profile.provider,
            providerId: profile.id
          },
          type: 'SELECT',
          transaction
        }
      ) as any[];

      if (oauthProvider && oauthProvider.user_id) {
        // User exists with this OAuth provider
        const user = await User.findByPk(oauthProvider.user_id, { transaction });
        if (user) {
          await transaction.commit();
          return user;
        }
      }

      // Check if user exists with same email
      let user = await User.findOne({
        where: { email: profile.email },
        transaction
      });

      if (!user) {
        // Create new user
        const username = profile.email.split('@')[0] + '_' + profile.provider;
        user = await User.create({
          username: username.substring(0, 50), // Ensure username fits in DB field
          email: profile.email,
          password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
          emailVerified: true, // OAuth emails are pre-verified
          role: 'user'
        }, { transaction });

        logger.info('Created new user from OAuth', {
          userId: user.id,
          provider: profile.provider,
          email: profile.email
        });
      }

      // Create OAuth provider entry
      await sequelize.query(
        `INSERT INTO oauth_providers (user_id, provider, provider_user_id, provider_email, provider_data) 
         VALUES (:userId, :provider, :providerId, :email, :data)`,
        {
          replacements: {
            userId: user.id,
            provider: profile.provider,
            providerId: profile.id,
            email: profile.email,
            data: JSON.stringify({
              displayName: profile.displayName,
              photos: profile.photos
            })
          },
          transaction
        }
      );

      await transaction.commit();
      return user;

    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to find or create OAuth user:', error);
      throw error;
    }
  }

  /**
   * Unlink OAuth provider from user
   */
  static async unlinkProvider(userId: number, provider: string): Promise<void> {
    try {
      await sequelize.query(
        `DELETE FROM oauth_providers WHERE user_id = :userId AND provider = :provider`,
        {
          replacements: { userId, provider }
        }
      );

      logger.info('Unlinked OAuth provider', {
        userId,
        provider
      });
    } catch (error) {
      logger.error('Failed to unlink OAuth provider:', error);
      throw error;
    }
  }

  /**
   * Get linked OAuth providers for a user
   */
  static async getLinkedProviders(userId: number): Promise<string[]> {
    try {
      const providers = await sequelize.query(
        `SELECT provider FROM oauth_providers WHERE user_id = :userId`,
        {
          replacements: { userId },
          type: 'SELECT'
        }
      ) as any[];

      return providers.map(p => p.provider);
    } catch (error) {
      logger.error('Failed to get linked providers:', error);
      return [];
    }
  }
}

// Add crypto import at the top of the file
import crypto from 'crypto';

export default OAuthService;