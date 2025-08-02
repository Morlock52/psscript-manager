import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { requireAuth } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number and special character'
  ),
  name: z.string().min(2).max(100)
});

// Helper function to generate JWT
const generateToken = (user: any): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    jwtSecret,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'psscript',
      audience: 'psscript-users'
    }
  );
};

// Login endpoint
router.post('/login', rateLimiter, async (req, res) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ 
      where: { email: email.toLowerCase() } 
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      // Track failed login attempts
      await user.increment('failedLoginAttempts');
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    // Reset failed login attempts
    await user.update({ 
      failedLoginAttempts: 0,
      lastLoginAt: new Date()
    });

    // Generate token
    const token = generateToken(user);

    // Set secure cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token // Also return token for API clients
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        errors: error.errors 
      });
    }

    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during login'
    });
  }
});

// Register endpoint
router.post('/register', rateLimiter, async (req, res) => {
  try {
    // Validate input
    const { email, password, name } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await User.findOne({ 
      where: { email: email.toLowerCase() } 
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'user',
      isActive: true
    });

    // Generate token
    const token = generateToken(user);

    // Set secure cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        errors: error.errors 
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during registration'
    });
  }
});

// Get current user - PROTECTED
router.get('/me', requireAuth, async (req, res) => {
  try {
    // req.user is set by requireAuth middleware
    const user = await User.findByPk(req.user!.id, {
      attributes: ['id', 'email', 'name', 'role', 'createdAt', 'lastLoginAt']
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User account not found'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred fetching user data'
    });
  }
});

// Logout endpoint
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during logout'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    // Generate new token with extended expiry
    const token = generateToken(req.user);

    // Set new cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      success: true,
      token 
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred refreshing token'
    });
  }
});

export default router;