import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models';
import { Op } from 'sequelize';
import logger from '../utils/logger';

class UserController {
  // Get all users
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Only admins should see all users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You are not authorized to view all users' });
      }
      
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'role', 'createdAt', 'lastLoginAt'],
        order: [['id', 'ASC']]
      });
      
      res.json(users);
    } catch (error) {
      logger.error('Error fetching users:', error);
      next(error);
    }
  }
  
  // Get user by ID
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only see their own profile unless they're admins
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You are not authorized to view this user' });
      }
      
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'email', 'role', 'createdAt', 'lastLoginAt']
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      logger.error('Error fetching user:', error);
      next(error);
    }
  }
  
  // Create a new user
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Only admins can create users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You are not authorized to create users' });
      }
      
      const { username, email, password, role } = req.body;
      
      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
      }
      
      // Check if username already exists
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      
      // Check if email already exists
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      
      // Create the user
      const user = await User.create({
        username,
        email,
        password, // Hashed by the model hook
        role: role || 'user'
      });
      
      // Return user without password
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      next(error);
    }
  }
  
  // Update user
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      const { username, email, password, role } = req.body;
      
      // Get existing user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Users can only update their own profile unless they're admins
      // Also, users can't change their own role
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You are not authorized to update this user' });
      }
      
      // If trying to update role and not an admin
      if (role && role !== user.role && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You are not authorized to change roles' });
      }
      
      // Prevent users from changing their own role
      if (req.user?.userId === userId && role && role !== user.role) {
        return res.status(403).json({ message: 'You cannot change your own role' });
      }
      
      // Check username uniqueness if changed
      if (username && username !== user.username) {
        const existingUsername = await User.findOne({ 
          where: { 
            username,
            id: { [Op.ne]: userId }
          } 
        });
        
        if (existingUsername) {
          return res.status(409).json({ message: 'Username already exists' });
        }
      }
      
      // Check email uniqueness if changed
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ 
          where: { 
            email,
            id: { [Op.ne]: userId }
          } 
        });
        
        if (existingEmail) {
          return res.status(409).json({ message: 'Email already exists' });
        }
      }
      
      // Update user fields
      if (username) user.username = username;
      if (email) user.email = email;
      if (password) user.password = password; // Will be hashed by model hook
      if (role && req.user?.role === 'admin') user.role = role;
      
      // Save user
      await user.save();
      
      // Return updated user without password
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      next(error);
    }
  }
  
  // Delete user
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      
      // Only admins can delete users, and users can't delete themselves
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You are not authorized to delete users' });
      }
      
      if (req.user?.userId === userId) {
        return res.status(403).json({ message: 'You cannot delete your own account' });
      }
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      await user.destroy();
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      logger.error('Error deleting user:', error);
      next(error);
    }
  }
  
  // Reset user password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      
      // Only admins can reset other users' passwords
      // Users can reset their own password
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You are not authorized to reset this password' });
      }
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update password (will be hashed by model hook)
      user.password = password;
      await user.save();
      
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      logger.error('Error resetting password:', error);
      next(error);
    }
  }
}

export default new UserController();