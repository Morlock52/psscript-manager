import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import User from '../models/User';
import logger from '../utils/logger';
import rateLimit from 'express-rate-limit';

// Rate limiting for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Controller for authentication endpoints.
 */
class AuthController {
  /**
   * Handle user login.
   */
  static async login(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || `login-${Date.now()}`;
    
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        logger.warn('Login attempt with missing credentials', {
          email: email ? 'provided' : 'missing',
          password: password ? 'provided' : 'missing',
          ip: req.ip,
          requestId
        });
        res.status(400).json({ 
          error: 'Invalid credentials',
          message: 'Email and password are required' 
        });
        return;
      }
      
      // Find user by email
      const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
      
      if (!user) {
        logger.warn('Login attempt for non-existent user', {
          email: email.toLowerCase().trim(),
          ip: req.ip,
          requestId
        });
        res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Invalid email or password' 
        });
        return;
      }
      
      // Check for account lockout (after 5 failed attempts)
      if (user.loginAttempts && user.loginAttempts >= 5) {
        logger.warn('Login attempt for locked account', {
          userId: user.id,
          username: user.username,
          loginAttempts: user.loginAttempts,
          ip: req.ip,
          requestId
        });
        res.status(423).json({ 
          error: 'Account locked',
          message: 'Account is temporarily locked due to too many failed login attempts. Please contact support.' 
        });
        return;
      }
      
      // Validate password
      const isValidPassword = await user.validatePassword(password, requestId);
      
      if (!isValidPassword) {
        // Track failed login attempt
        await user.trackLoginAttempt(false, requestId);
        
        logger.warn('Failed login attempt - invalid password', {
          userId: user.id,
          username: user.username,
          loginAttempts: (user.loginAttempts || 0) + 1,
          ip: req.ip,
          requestId
        });
        
        res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Invalid email or password' 
        });
        return;
      }
      
      // Generate JWT token
      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        logger.error('JWT_SECRET environment variable is not set', { requestId });
        res.status(500).json({ 
          error: 'Server configuration error',
          message: 'Authentication service is not properly configured' 
        });
        return;
      }
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      const tokenOptions: any = { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'psscript-api',
        audience: 'psscript-frontend'
      };
      const token = jwt.sign(tokenPayload, secretKey, tokenOptions);
      
      // Track successful login
      await user.trackLoginAttempt(true, requestId);
      
      // Prepare user data for response (exclude sensitive fields)
      const userData = {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.createdAt.toISOString()
      };
      
      logger.info('Successful login', {
        userId: user.id,
        username: user.username,
        role: user.role,
        ip: req.ip,
        requestId
      });
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: userData
      });
      
    } catch (error) {
      logger.error('Login error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
        requestId
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred during login. Please try again.' 
      });
    }
  }
  
  /**
   * Handle user registration.
   */
  static async register(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || `register-${Date.now()}`;
    
    try {
      const { username, email, password } = req.body;
      
      // Validate input
      if (!username || !email || !password) {
        logger.warn('Registration attempt with missing data', {
          username: username ? 'provided' : 'missing',
          email: email ? 'provided' : 'missing',
          password: password ? 'provided' : 'missing',
          ip: req.ip,
          requestId
        });
        res.status(400).json({ 
          error: 'Missing required fields',
          message: 'Username, email, and password are required' 
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ 
          error: 'Invalid email',
          message: 'Please provide a valid email address' 
        });
        return;
      }
      
      // Validate password strength
      if (password.length < 8) {
        res.status(400).json({ 
          error: 'Weak password',
          message: 'Password must be at least 8 characters long' 
        });
        return;
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ 
        where: { 
          [Op.or]: [
            { email: email.toLowerCase().trim() },
            { username: username.trim() }
          ]
        } 
      });
      
      if (existingUser) {
        const field = existingUser.email === email.toLowerCase().trim() ? 'email' : 'username';
        logger.warn('Registration attempt with existing user data', {
          field,
          value: field === 'email' ? email : username,
          ip: req.ip,
          requestId
        });
        res.status(409).json({ 
          error: 'User already exists',
          message: `A user with this ${field} already exists` 
        });
        return;
      }
      
      // Create new user
      const newUser = await User.create({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: password, // Will be hashed by the model hook
        role: 'user'
      });
      
      // Generate JWT token
      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        logger.error('JWT_SECRET environment variable is not set', { requestId });
        res.status(500).json({ 
          error: 'Server configuration error',
          message: 'Authentication service is not properly configured' 
        });
        return;
      }
      const tokenPayload = {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      };
      const tokenOptions: any = { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'psscript-api',
        audience: 'psscript-frontend'
      };
      const token = jwt.sign(tokenPayload, secretKey, tokenOptions);
      
      // Prepare user data for response (exclude sensitive fields)
      const userData = {
        id: newUser.id.toString(),
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.createdAt.toISOString()
      };
      
      logger.info('Successful user registration', {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        ip: req.ip,
        requestId
      });
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: userData
      });
      
    } catch (error) {
      logger.error('Registration error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
        requestId
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred during registration. Please try again.' 
      });
    }
  }
  
  /**
   * Get current user information.
   */
  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Not authenticated',
          message: 'Authentication required' 
        });
        return;
      }
      
      // Fetch fresh user data from database
      const user = await User.findByPk(req.user.userId);
      
      if (!user) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account no longer exists' 
        });
        return;
      }
      
      // Prepare user data for response (exclude sensitive fields)
      const userData = {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        created_at: user.createdAt.toISOString()
      };
      
      res.status(200).json({
        success: true,
        user: userData
      });
      
    } catch (error) {
      logger.error('Get user info error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred while fetching user information.' 
      });
    }
  }
  
  /**
   * Handle user logout (client-side token invalidation).
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      logger.info('User logout', {
        userId: req.user?.userId,
        username: req.user?.username,
        ip: req.ip,
        requestId: req.headers['x-request-id']
      });
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
      
    } catch (error) {
      logger.error('Logout error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred during logout.' 
      });
    }
  }
}

export default AuthController;
