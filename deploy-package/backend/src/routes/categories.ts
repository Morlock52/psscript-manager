import express from 'express';
import CategoryController from '../controllers/CategoryController';
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';
import { cache } from '../index';

const router = express.Router();

// Public routes
router.get('/', CategoryController.getCategories.bind(CategoryController));
router.get('/:id', CategoryController.getCategory.bind(CategoryController));
router.get('/:id/scripts', CategoryController.getCategoryScripts.bind(CategoryController));

// Add a refresh endpoint to clear the cache and reload categories
router.get('/refresh/cache', (req, res) => {
  try {
    // Clear the categories cache
    cache.del('categories:all');
    
    // Return success
    res.json({ 
      success: true, 
      message: 'Categories cache cleared successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear categories cache',
      error: error.message
    });
  }
});

// Protected routes (require authentication) - Authentication removed
router.post('/', /* authenticateJWT, requireAdmin, */ CategoryController.createCategory.bind(CategoryController));
router.put('/:id', /* authenticateJWT, requireAdmin, */ CategoryController.updateCategory.bind(CategoryController));
router.delete('/:id', /* authenticateJWT, requireAdmin, */ CategoryController.deleteCategory.bind(CategoryController));

export default router;
