import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Sequelize } from 'sequelize';

const router = express.Router();

// Simple login endpoint for debugging
router.post('/simple-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email and password are required' 
      });
    }
    
    // Direct database query
    const sequelize = req.app.get('sequelize');
    const [users] = await sequelize.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email = :email LIMIT 1',
      {
        replacements: { email: email.toLowerCase().trim() },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    const user = users as any;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      });
    }
    
    // Validate password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('Simple login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'An error occurred during login',
      details: error.message 
    });
  }
});

export default router;