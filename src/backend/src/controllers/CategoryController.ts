/**
 * Controller for category management
 */
import { Request, Response, NextFunction } from 'express';
import { Category, Script, sequelize } from '../models';
import { Op } from 'sequelize';
import logger from '../utils/logger';
import { cache } from '../index';

class CategoryController {
  // Get all categories
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const cacheKey = 'categories:all';
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const categories = await Category.findAll({
        include: [
          {
            model: Script,
            as: 'scripts',
            attributes: ['id'],
            required: false
          }
        ],
        order: [['name', 'ASC']]
      });
      
      // Transform the data to include script count
      const transformedCategories = categories.map(category => {
        const plainCategory = category.get({ plain: true });
        return {
          ...plainCategory,
          scriptCount: plainCategory.scripts ? plainCategory.scripts.length : 0,
          // Remove the scripts array from the response
          scripts: undefined
        };
      });
      
      const response = {
        categories: transformedCategories
      };
      
      cache.set(cacheKey, response, 300); // Cache for 5 minutes
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
  
  // Get a single category by ID
  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id;
      const cacheKey = `category:${categoryId}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const category = await Category.findByPk(categoryId, {
        include: [
          {
            model: Script,
            as: 'scripts',
            attributes: ['id', 'title', 'description', 'userId', 'executionCount', 'updatedAt'],
            limit: 10,
            order: [['updatedAt', 'DESC']]
          }
        ]
      });
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      cache.set(cacheKey, category, 300); // Cache for 5 minutes
      
      res.json(category);
    } catch (error) {
      next(error);
    }
  }
  
  // Create a new category
  async createCategory(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    
    try {
      const { name, description } = req.body;
      
      if (!name) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Category name is required' });
      }
      
      // Check if category already exists
      const existingCategory = await Category.findOne({
        where: {
          name: {
            [Op.iLike]: name
          }
        }
      });
      
      if (existingCategory) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Category with this name already exists' });
      }
      
      // Create the category
      const category = await Category.create({
        name,
        description: description || null
      }, { transaction });
      
      await transaction.commit();
      
      // Clear relevant caches
      cache.del('categories:all');
      
      res.status(201).json(category);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
  
  // Update a category
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    
    try {
      const categoryId = req.params.id;
      const { name, description } = req.body;
      
      const category = await Category.findByPk(categoryId);
      
      if (!category) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Check if new name already exists (if name is being changed)
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          where: {
            name: {
              [Op.iLike]: name
            },
            id: {
              [Op.ne]: categoryId
            }
          }
        });
        
        if (existingCategory) {
          await transaction.rollback();
          return res.status(409).json({ message: 'Category with this name already exists' });
        }
      }
      
      // Update the category
      await category.update({
        name: name || category.name,
        description: description !== undefined ? description : category.description
      }, { transaction });
      
      await transaction.commit();
      
      // Clear relevant caches
      cache.del('categories:all');
      cache.del(`category:${categoryId}`);
      
      res.json(category);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
  
  // Delete a category
  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    
    try {
      const categoryId = req.params.id;
      
      const category = await Category.findByPk(categoryId);
      
      if (!category) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Check if category has scripts
      const scriptCount = await Script.count({
        where: {
          categoryId
        }
      });
      
      if (scriptCount > 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Cannot delete category with associated scripts',
          scriptCount
        });
      }
      
      await category.destroy({ transaction });
      
      await transaction.commit();
      
      // Clear relevant caches
      cache.del('categories:all');
      cache.del(`category:${categoryId}`);
      
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
  
  // Get scripts by category
  async getCategoryScripts(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      const cacheKey = `category:${categoryId}:scripts:${page}:${limit}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // Check if category exists
      const category = await Category.findByPk(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const { count, rows } = await Script.findAndCountAll({
        where: {
          categoryId
        },
        limit,
        offset,
        order: [['updatedAt', 'DESC']]
      });
      
      const response = {
        scripts: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        category: {
          id: category.id,
          name: category.name,
          description: category.description
        }
      };
      
      cache.set(cacheKey, response, 300); // Cache for 5 minutes
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
  
  // Initialize default categories
  async initializeDefaultCategories() {
    try {
      const defaultCategories = [
        {
          name: 'System Administration',
          description: 'Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring.'
        },
        {
          name: 'Network Management',
          description: 'Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services.'
        },
        {
          name: 'Security & Compliance',
          description: 'Scripts for security auditing, hardening, compliance checks, and implementing security best practices.'
        },
        {
          name: 'Automation & Workflows',
          description: 'Scripts that automate repetitive tasks, create workflows, and streamline processes.'
        },
        {
          name: 'Cloud Management',
          description: 'Scripts for managing cloud resources on AWS, Azure, GCP, and other cloud platforms.'
        },
        {
          name: 'Data Management',
          description: 'Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis.'
        },
        {
          name: 'Development Tools',
          description: 'Scripts for development environments, build processes, CI/CD pipelines, and code management.'
        },
        {
          name: 'Monitoring & Diagnostics',
          description: 'Scripts for system monitoring, logging, diagnostics, and performance analysis.'
        },
        {
          name: 'User Management',
          description: 'Scripts for user account management, permissions, group policies, and directory services.'
        },
        {
          name: 'Utilities & Helpers',
          description: 'General-purpose utility scripts and helper functions for various tasks.'
        }
      ];
      
      // Check existing categories
      const existingCategories = await Category.findAll();
      const existingCategoryNames = existingCategories.map(c => c.name.toLowerCase());
      
      // Create categories that don't exist yet
      for (const category of defaultCategories) {
        if (!existingCategoryNames.includes(category.name.toLowerCase())) {
          await Category.create(category);
          logger.info(`Created default category: ${category.name}`);
        }
      }
      
      logger.info('Default categories initialized');
      
      // Clear categories cache
      cache.del('categories:all');
      
      return true;
    } catch (error) {
      logger.error('Error initializing default categories:', error);
      return false;
    }
  }
}

export default new CategoryController();
