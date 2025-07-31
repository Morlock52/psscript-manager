import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import UserController from '../controllers/UserController';

const router = express.Router();

// Require authentication for all user routes
// router.use(authenticateJWT); // Removed global authentication

// Get all users (admin only)
router.get('/', UserController.getUsers);

// Get user by ID
router.get('/:id', UserController.getUserById);

// Create new user (admin only)
router.post('/', UserController.createUser);

// Update user
router.put('/:id', UserController.updateUser);

// Delete user (admin only)
router.delete('/:id', UserController.deleteUser);

// Reset user password
router.post('/:id/reset-password', UserController.resetPassword);

export default router;
