import { Request, Response, NextFunction } from 'express';
import { Script } from '../models/Script';
import { cacheMiddleware } from '../middleware/cache';

/**
 * Script controller with cache invalidation
 */
export class ScriptController {
  /**
   * Create a new script
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const script = await Script.create({
        ...req.body,
        userId: req.user.id
      });

      // Invalidate relevant caches
      await cacheMiddleware.invalidate([
        'scripts:*',
        `user:${req.user.id}:scripts`
      ]);

      res.status(201).json(script);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a script
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const script = await Script.findByPk(id);

      if (!script) {
        return res.status(404).json({ error: 'Script not found' });
      }

      // Check ownership
      if (script.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await script.update(req.body);

      // Invalidate caches
      await cacheMiddleware.invalidate([
        'scripts:*',
        `script:${id}`,
        `user:${script.userId}:scripts`
      ]);

      res.json(script);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a script
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const script = await Script.findByPk(id);

      if (!script) {
        return res.status(404).json({ error: 'Script not found' });
      }

      // Check ownership
      if (script.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const userId = script.userId;
      await script.destroy();

      // Invalidate caches
      await cacheMiddleware.invalidate([
        'scripts:*',
        `script:${id}`,
        `user:${userId}:scripts`
      ]);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all scripts with pagination and filtering
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        search,
        sortBy = 'createdAt',
        order = 'DESC'
      } = req.query;

      // Use cache key that includes all query params
      const cacheKey = `scripts:list:${JSON.stringify(req.query)}:user:${req.user?.id || 'guest'}`;
      
      const scripts = await Script.findAndCountAll({
        where: {
          // Add filters based on query params
        },
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [[sortBy as string, order as string]]
      });

      res.json({
        data: scripts.rows,
        total: scripts.count,
        page: Number(page),
        totalPages: Math.ceil(scripts.count / Number(limit))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single script by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const script = await Script.findByPk(id, {
        include: ['user', 'category', 'tags']
      });

      if (!script) {
        return res.status(404).json({ error: 'Script not found' });
      }

      // Check access permissions
      if (script.isPrivate && script.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(script);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute a script
   */
  static async execute(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const script = await Script.findByPk(id);

      if (!script) {
        return res.status(404).json({ error: 'Script not found' });
      }

      // Check execution permissions
      if (script.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Execution not allowed' });
      }

      // TODO: Implement actual script execution logic
      // This would involve running the PowerShell script in a sandboxed environment

      res.json({
        success: true,
        message: 'Script execution started',
        executionId: 'exec-' + Date.now()
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ScriptController;