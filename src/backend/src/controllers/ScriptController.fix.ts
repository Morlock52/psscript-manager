// This is a partial file containing only the fixed deleteScript method
// to be applied to the ScriptController.ts file

import { Request, Response, NextFunction } from 'express';
import { Script, ScriptAnalysis, ScriptTag, ScriptVersion, ExecutionLog } from '../models';
import { sequelize } from '../database/connection';
import { cache } from '../index';
import logger from '../utils/logger';

// This is just a reference implementation and not meant to be used directly
// It should be copied into the actual ScriptController.ts file
export class ScriptControllerFix {
  // Delete a script with improved error handling and transaction management
  async deleteScript(req: Request, res: Response, next: NextFunction) {
    let transaction;
    
    try {
      const scriptId = req.params.id;
      const userId = req.user?.id;
      
      // Start a transaction to ensure atomicity
      transaction = await sequelize.transaction();
      
      const script = await Script.findByPk(scriptId);
      
      if (!script) {
        if (transaction) await transaction.rollback();
        return res.status(404).json({ 
          message: 'Script not found',
          success: false
        });
      }
      
      // Check ownership unless admin
      if (script.userId !== userId && req.user?.role !== 'admin') {
        if (transaction) await transaction.rollback();
        return res.status(403).json({ 
          message: 'Not authorized to delete this script',
          success: false
        });
      }
      
      // Delete all related records first
      
      // 1. Delete script analysis
      await ScriptAnalysis.destroy({
        where: { scriptId },
        transaction
      });
      
      // 2. Delete script tags
      await ScriptTag.destroy({
        where: { scriptId },
        transaction
      });
      
      // 3. Delete script versions
      await ScriptVersion.destroy({
        where: { scriptId },
        transaction
      });
      
      // 4. Delete execution logs
      await ExecutionLog.destroy({
        where: { scriptId },
        transaction
      });
      
      // 5. Finally delete the script itself
      await script.destroy({ transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      // Clear relevant caches
      cache.del(`script:${scriptId}`);
      cache.clearPattern('scripts:');
      
      res.json({ 
        message: 'Script deleted successfully', 
        id: scriptId,
        success: true
      });
    } catch (error) {
      // Rollback transaction if there was an error
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
      }
      
      logger.error('Error deleting script:', error);
      res.status(500).json({
        message: 'Failed to delete script',
        error: error.message,
        success: false
      });
    }
  }
}
