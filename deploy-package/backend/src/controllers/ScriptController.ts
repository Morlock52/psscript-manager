/**
 * Controller for script management
 */
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken'; // Assuming jsonwebtoken is used
import { Script, ScriptAnalysis, Category, User, Tag, ScriptTag, ScriptVersion, ExecutionLog, sequelize } from '../models';
import { Op, Sequelize, Transaction } from 'sequelize';
import db from '../db';
import * as path from 'path';
import fs from 'fs';
import axios from 'axios';
import logger from '../utils/logger';
import { cache } from '../index';
import { calculateBufferMD5, checkFileExists } from '../utils/fileIntegrity';
// Corrected import: findSimilarScripts is imported as findSimilarScriptsByVector alias, but the function in vectorUtils is findSimilarScripts
import { generateEmbedding, findSimilarScripts, deleteEmbedding } from '../utils/vectorUtils'; // Import deleteEmbedding, use correct function name
import { analyzeScriptSecurity, enhanceAnalysisWithOWASP } from '../utils/powershellSecurityUtils';
import crypto from 'crypto'; // Import crypto properly
import sanitizeHtml from 'sanitize-html';
import shellEscape from 'shell-escape'; // Added for parameter escaping

// Determine AI service URL based on environment
const isDocker = process.env.DOCKER_ENV === 'true';
const AI_SERVICE_URL = isDocker
  ? (process.env.AI_SERVICE_URL || 'http://ai-service:8000')
  : (process.env.AI_SERVICE_URL || 'http://localhost:8000');

// Import the AuthenticatedUser interface from authMiddleware
interface AuthenticatedUser {
  userId: number;
  username: string;
  email: string;
  role: string;
}

class ScriptController {
  // Use Sequelize's built-in transaction isolation levels
  static ISOLATION_LEVELS = Transaction.ISOLATION_LEVELS;

  // Get all scripts with pagination and filtering
  getScripts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const categoryId = req.query.categoryId as string;
      const userId = req.query.userId as string;

      // Handle 'updated' sort parameter for backward compatibility
      let sortField = req.query.sort as string || 'updatedAt';
      if (sortField === 'updated') {
        sortField = 'updatedAt';
      }
      const order = req.query.order as string || 'DESC';

      const cacheKey = `scripts:${page}:${limit}:${categoryId || ''}:${userId || ''}:${sortField}:${order}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for getScripts`, { cacheKey }); // Structured log
        return res.json(cachedData);
      }
      logger.debug(`Cache miss for getScripts`, { cacheKey }); // Structured log

      const whereClause: any = {};

      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

      if (userId) {
        whereClause.userId = userId;
      }

      const { count, rows } = await Script.findAndCountAll({
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username'] },
          { model: Category, as: 'category', attributes: ['id', 'name'] }
          // Analysis fetched separately below
        ],
        limit,
        offset,
        order: [[sortField, order]],
        distinct: true
      });

      // Fetch all analysis data in a single query to avoid N+1 problem
      if (rows.length > 0) {
        const scriptIds = rows.map(script => script.id);
        try {
          const analyses: any[] = await sequelize.query(
            `SELECT * FROM script_analysis WHERE script_id IN (:scriptIds)`,
            {
              replacements: { scriptIds },
              type: 'SELECT',
              raw: true
            }
          );

          // Create a map for O(1) lookup
          const analysisMap = new Map();
          analyses.forEach(analysis => {
            analysisMap.set(analysis.script_id, {
              id: analysis.id,
              scriptId: analysis.script_id,
              purpose: analysis.purpose,
              parameters: analysis.parameter_docs, // Assuming parameter_docs is the correct field
              securityScore: analysis.security_score,
              codeQualityScore: analysis.quality_score, // Assuming quality_score is correct
              riskScore: analysis.risk_score,
              optimizationSuggestions: analysis.suggestions, // Assuming suggestions is correct
              commandDetails: analysis.command_details,
              msDocsReferences: analysis.ms_docs_references,
              createdAt: analysis.created_at,
              updatedAt: analysis.updated_at
            });
          });

          // Assign analysis data to scripts
          for (const script of rows) {
            const analysis = analysisMap.get(script.id);
            script.setDataValue('analysis', analysis || null);
          }
        } catch (analysisError) {
          // Log error once for the batch
          logger.error(`Error fetching analyses for scripts`, { 
            scriptIds: scriptIds, 
            error: analysisError.message, 
            stack: analysisError.stack 
          });
          
          // Set error for all scripts
          for (const script of rows) {
            script.setDataValue('analysis', { error: 'Failed to load analysis' });
          }
        }
      }

      const response = {
        scripts: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };

      cache.set(cacheKey, response, 300); // Cache for 5 minutes

      res.json(response);
    } catch (error) {
      // Structured log for general error
      logger.error('Error in getScripts:', {
          error: error.message,
          stack: error.stack,
          query: req.query // Include query params for context
      });
      next(error);
    }
  }

  // Get a single script by ID
  getScript = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scriptId = req.params.id;
      const cacheKey = `script:${scriptId}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for getScript`, { cacheKey, scriptId }); // Structured log
        return res.json(cachedData);
      }
      logger.debug(`Cache miss for getScript`, { cacheKey, scriptId }); // Structured log

      const script = await this._getScriptWithAssociations(scriptId); // Use helper

      if (!script) {
        logger.warn(`Script not found`, { scriptId }); // Structured log
        return res.status(404).json({ message: 'Script not found' });
      }

      const analysisData = script.getDataValue('analysis');
      if (!analysisData) {
        // Structured log for missing analysis
        logger.warn(`Analysis data missing for script`, { scriptId });
      }

      cache.set(cacheKey, script, 300); // Cache for 5 minutes
      res.json(script);
    } catch (error) {
      // Structured log for general error
      logger.error(`Error in getScript`, {
          scriptId: req.params.id,
          error: error.message,
          stack: error.stack
      });
      next(error);
    }
  }

  // Create a new script with enhanced transaction management
  createScript = async (req: Request, res: Response, next: NextFunction) => {
      let transaction;
      try {
          // Start transaction with serializable isolation level for better consistency
          transaction = await sequelize.transaction({
              isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
          });

          const { title, description, content, categoryId, tags } = req.body;
          const userId = req.user?.userId; // Now correctly typed

          if (!userId) {
              // Rollback transaction before returning
              if (transaction) await transaction.rollback();
              return res.status(401).json({ message: 'Unauthorized' });
          }

          // Validate required fields and content
          if (!title || !content) {
              if (transaction) await transaction.rollback();
              return res.status(400).json({ message: 'Title and content are required' });
          }
          if (!ScriptController.validatePowerShellContent(content)) {
              if (transaction) await transaction.rollback();
              return res.status(400).json({ message: 'Script content failed validation (e.g., contains disallowed commands or appears unsafe).' });
          }

          // Sanitize title and description
          const sanitizedTitle = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} });
          const sanitizedDescription = description ? sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} }) : '';

          // Create the script
          const script = await Script.create({
              title: sanitizedTitle,
              description: sanitizedDescription,
              content,
              userId,
              categoryId: categoryId || null,
              version: 1,
              executionCount: 0,
              isPublic: true // Default to public, consider making this configurable
          }, { transaction });

          logger.info(`Created new script with ID ${script.id}`, { scriptId: script.id, userId });

          // Handle tags efficiently
          await this._updateTags(script.id, tags, transaction, true); // Pass true for initial creation

          // Analyze the script using the separated method
          // Ensure categoryId is passed as string or null
          const categoryIdString = categoryId === undefined || categoryId === null ? null : String(categoryId);
          await this._analyzeAndSaveScript(req, script, content, categoryIdString, transaction);

          // Commit the transaction
          await transaction.commit();
          logger.info(`Transaction committed successfully for script ${script.id}`, { scriptId: script.id });

          // Clear relevant caches *after* successful commit
          this._clearCaches(String(script.id)); // Pass as string

          // Fetch the complete script with associations to return to the client
          const completeScript = await this._getScriptWithAssociations(String(script.id)); // Convert ID to string

          res.status(201).json(completeScript);
      } catch (error) {
          // Ensure transaction is rolled back on any error
          if (transaction && !transaction.finished) {
              try {
                  await transaction.rollback();
                  logger.info('Transaction rolled back due to error during script creation.', { error: error.message });
              } catch (rollbackError) {
                  logger.error('Critical: Error rolling back transaction after script creation failure:', rollbackError);
              }
          }

          // Use the centralized error handler
          this._handleCreateScriptError(res, error);
          // Optionally call next(error) if you have a global error middleware that needs to run
          // next(error);
      }
  }

  // Update a script
  updateScript = async (req: Request, res: Response, next: NextFunction) => {
    let transaction;
    try {
      // Start transaction
      transaction = await sequelize.transaction();

      const scriptId = req.params.id;
      const { title, description, content, categoryId, isPublic, tags } = req.body;
      const userId = req.user?.userId; // Now correctly typed

      // Retrieve the script
      const script = await Script.findByPk(scriptId, { transaction }); // Lock row within transaction

      if (!script) {
        // Rollback before returning
        if(transaction) await transaction.rollback();
        return res.status(404).json({ message: 'Script not found' });
      }

      // Check ownership permission
      if (script.userId !== userId && req.user?.role !== 'admin') {
        // Rollback before returning
        if(transaction) await transaction.rollback();
        return res.status(403).json({ message: 'Not authorized to update this script' });
      }

      // Determine if content has changed
      const contentChanged = content && content !== script.content;

      // Prepare update data, sanitizing if provided
      const updateData: Partial<Script> = {}; // Use Partial<Script> for type safety

      if (title !== undefined) {
        updateData.title = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} });
      }
      if (description !== undefined) {
        updateData.description = sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} });
      }
      // Ensure categoryId is handled correctly (it's a number in the model)
      if (categoryId !== undefined) {
        // Assuming categoryId from request body is intended to be a number or null
        updateData.categoryId = categoryId === null ? null : parseInt(String(categoryId), 10);
        if (isNaN(updateData.categoryId)) updateData.categoryId = null; // Handle potential NaN
      }
      if (isPublic !== undefined) {
        updateData.isPublic = isPublic;
      }

      if (contentChanged) {
        // Validate new content before updating
        if (!ScriptController.validatePowerShellContent(content)) {
            if(transaction) await transaction.rollback();
            return res.status(400).json({ message: 'New script content failed validation (e.g., contains disallowed commands or appears unsafe).' });
        }
        updateData.content = content;
        updateData.version = script.version + 1; // Increment version
      }

      // Perform the script update
      await script.update(updateData, { transaction });
      logger.info(`Updated script record ${scriptId}`, { scriptId });

      // Conditional AI analysis upon content change
      if (contentChanged) {
        logger.info(`Content changed for script ${scriptId}, triggering re-analysis.`, { scriptId });
        // Use the separated analysis method - pass req for potential API key access
        // Ensure categoryId is passed as string or null
        const categoryIdString = updateData.categoryId === undefined || updateData.categoryId === null ? null : String(updateData.categoryId);
        await this._analyzeAndSaveScript(req, script, content, categoryIdString, transaction);
      }

      // Update tags if provided
      await this._updateTags(scriptId, tags, transaction); // Use helper

      // Commit the transaction
      await transaction.commit();
      logger.info(`Transaction committed successfully for script update ${scriptId}`, { scriptId });

      // Clear relevant caches after successful commit
      this._clearCaches(String(scriptId)); // Pass as string

      // Fetch and return the updated script with associations
      const updatedScript = await this._getScriptWithAssociations(scriptId); // Use helper
      return res.json(updatedScript);

    } catch (error) {
      // Ensure rollback on error
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
          logger.info('Transaction rolled back due to error during script update.', { scriptId: req.params.id, error: error.message });
        } catch (rollbackError) {
          logger.error('Critical: Error rolling back transaction after script update failure:', rollbackError);
        }
      }

      // Delegate to a centralized error handler (reuse from createScript)
      this._handleCreateScriptError(res, error);
      // next(error); // Optional
    }
  }

  // Delete a script with improved error handling and transaction management
  deleteScript = async (req: Request, res: Response, next: NextFunction) => {
      let transaction;
      try {
          const scriptId = req.params.id;
          // Get user ID from authenticated request
          const userId = req.user?.userId;
          if (!userId) {
              // This should ideally be caught by authenticateJWT, but double-check
              return res.status(401).json({ message: 'Unauthorized', success: false });
          }

          // Start a transaction to ensure atomicity
          transaction = await sequelize.transaction();

          // Fetch the script within the transaction
          const script = await Script.findByPk(scriptId, { transaction });
          if (!script) {
              await transaction.rollback(); // Rollback if script not found
              return res.status(404).json({
                  message: 'Script not found',
                  success: false
              });
          }

          // Check ownership unless admin
          if (script.userId !== userId && req.user?.role !== 'admin') {
              await transaction.rollback(); // Rollback if unauthorized
              return res.status(403).json({
                  message: 'Not authorized to delete this script',
                  success: false
              });
          }

          logger.info(`Starting deletion process for script ${scriptId}`, { scriptId });

          // Execute deletions in a safe order
          await ScriptAnalysis.destroy({ where: { scriptId }, transaction });
          await ScriptVersion.destroy({ where: { scriptId }, transaction });
          await ExecutionLog.destroy({ where: { scriptId }, transaction }); // Changed script_id to scriptId for consistency
          // Delete tags
          await ScriptTag.destroy({ where: { scriptId }, transaction });

          // Delete the vector embedding
          await deleteEmbedding(script.id, transaction); // Call deleteEmbedding with number ID

          // Finally delete the script itself
          await script.destroy({ transaction });
          logger.info(`Successfully deleted script ${scriptId}, related records, and embedding`, { scriptId });

          // Commit the transaction
          await transaction.commit();
          logger.info(`Transaction committed for script deletion ${scriptId}`, { scriptId });

          // Clear relevant caches *after* successful commit
          this._clearCaches(String(scriptId)); // Pass as string

          res.json({
              message: 'Script deleted successfully',
              id: scriptId,
              success: true
          });
      } catch (error) {
          // Rollback transaction if there was an error and it's still active
          if (transaction && !transaction.finished) { // Check if transaction exists and is not finished
              try {
                  await transaction.rollback();
                  logger.info('Transaction rolled back due to error during script deletion.', {
                      scriptId: req.params.id,
                      error: error?.message || error // Log more details if available
                  });
              } catch (rollbackError) {
                  logger.error('Critical: Error rolling back transaction after script deletion failure:', rollbackError);
              }
          }

          logger.error(`Error deleting script ${req.params.id}:`, error);
          // Implement your error handling strategy here
          this._handleCreateScriptError(res, error); // Reuse or adapt the error handler
          // Optional: Call next(error) for global error handling if applicable
      }
  }

  // Delete multiple scripts
  deleteMultipleScripts = async (req: Request, res: Response, next: NextFunction) => {
    let transaction;
    const { ids } = req.body; // Expect an array of script IDs
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const deletedIds: number[] = [];
    const failedIds: { id: number; reason: string }[] = [];

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized', success: false });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid input: "ids" must be a non-empty array.', success: false });
    }

    // Ensure all IDs are numbers
    const numericIds = ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
                          .filter(id => !isNaN(id) && Number.isInteger(id));
    
    if (numericIds.length !== ids.length) {
        return res.status(400).json({ 
          message: 'Invalid input: All IDs must be valid integers.', 
          success: false,
          invalidIds: ids.filter(id => {
            const num = typeof id === 'string' ? parseInt(id, 10) : id;
            return isNaN(num) || !Number.isInteger(num);
          })
        });
    }

    try {
      // Start a single transaction for the entire bulk operation
      transaction = await sequelize.transaction();

      logger.info(`Starting bulk deletion for ${numericIds.length} scripts by user ${userId}`, { scriptIds: numericIds, userId });

      for (const scriptId of numericIds) {
        try {
          const script = await Script.findByPk(scriptId, { transaction });

          if (!script) {
            logger.warn(`Script ${scriptId} not found during bulk delete.`, { scriptId });
            failedIds.push({ id: scriptId, reason: 'Not found' });
            continue; // Skip to the next ID
          }

          // Check ownership unless admin
          if (script.userId !== userId && userRole !== 'admin') {
            logger.warn(`User ${userId} not authorized to delete script ${scriptId} during bulk delete.`, { scriptId, userId });
            failedIds.push({ id: scriptId, reason: 'Unauthorized' });
            continue; // Skip to the next ID
          }

          // Execute deletions in a safe order within the loop, but part of the same transaction
          await ScriptAnalysis.destroy({ where: { scriptId }, transaction });
          await ScriptVersion.destroy({ where: { scriptId }, transaction });
          await ExecutionLog.destroy({ where: { scriptId }, transaction });
          await ScriptTag.destroy({ where: { scriptId }, transaction });
          await deleteEmbedding(scriptId, transaction); // *** ADDED: Delete embedding ***
          await script.destroy({ transaction }); // Delete the script itself

          deletedIds.push(scriptId);
          logger.debug(`Successfully marked script ${scriptId} for deletion within transaction.`, { scriptId });

        } catch (individualError) {
          // Log the error for the specific script but continue the loop
          logger.error(`Error deleting script ${scriptId} during bulk operation: ${individualError.message}`, { scriptId, error: individualError });
          failedIds.push({ id: scriptId, reason: individualError.message || 'Internal error during deletion' });
          // Do NOT rollback here, let the loop finish and decide at the end
        }
      } // End of loop

      // Decide whether to commit or rollback based on failures
      if (failedIds.length > 0 && deletedIds.length === 0) {
        // If all specified scripts failed, rollback the entire transaction
        await transaction.rollback();
        logger.warn(`Bulk delete failed for all specified scripts. Transaction rolled back.`, { failedIds });
        return res.status(400).json({
          message: 'Bulk deletion failed for all specified scripts.',
          success: false,
          failed: failedIds
        });
      } else if (failedIds.length > 0) {
        // If some scripts failed, commit the successful ones and report failures
        await transaction.commit();
        logger.warn(`Bulk delete partially completed. Some scripts failed.`, { deletedIds, failedIds });
        // Clear caches for successfully deleted scripts
        deletedIds.forEach(id => this._clearCaches(String(id)));
        return res.status(207).json({ // Multi-Status
          message: 'Bulk deletion partially completed.',
          success: true, // Indicate overall operation started, but check details
          deleted: deletedIds,
          failed: failedIds
        });
      } else {
        // If all scripts were deleted successfully, commit the transaction
        await transaction.commit();
        logger.info(`Bulk delete completed successfully for ${deletedIds.length} scripts. Transaction committed.`, { deletedIds });
        // Clear caches for all deleted scripts
        deletedIds.forEach(id => this._clearCaches(String(id)));
        return res.status(200).json({
          message: 'All specified scripts deleted successfully.',
          success: true,
          deleted: deletedIds
        });
      }

    } catch (error) {
      // Rollback transaction if there was an error and it's still active
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
          logger.info('Transaction rolled back due to error during bulk script deletion.', { error: error.message });
        } catch (rollbackError) {
          logger.error('Critical: Error rolling back transaction after bulk script deletion failure:', rollbackError);
        }
      }
      logger.error('Error during bulk script deletion:', error);
      this._handleCreateScriptError(res, error); // Reuse or adapt error handler
    }
  }


  /**
   * Helper function to analyze a script and save the analysis.
   * Handles errors during AI interaction and ensures a basic analysis record exists.
   * Accepts Request object to potentially access headers like API keys.
   */
  private _analyzeAndSaveScript = async (req: Request, script: Script, content: string, categoryId: string | null, transaction: Transaction) => {
      let analysisData;
      try {
          const openaiApiKey = req.headers['x-openai-api-key'] as string; // Get key from request
          const analysisConfig = {
              headers: {},
              timeout: 15000 // 15 second timeout
          };

          if (openaiApiKey) {
              analysisConfig.headers['x-api-key'] = openaiApiKey;
          }

          logger.info(`Sending script ${script.id} for AI analysis`, { scriptId: script.id });

          // Construct URL with query parameters
          const analysisUrl = new URL(`${AI_SERVICE_URL}/analyze`);
          analysisUrl.searchParams.append('include_command_details', 'true');
          analysisUrl.searchParams.append('fetch_ms_docs', 'true');

          // Use Promise.race for timeout handling
          const analysisResponse = await Promise.race([
              axios.post(analysisUrl.toString(), { // Send URL with query params
                  script_id: script.id, // Ensure script_id is a number
                  script_content: content // Use script_content key based on error message
              }, analysisConfig),
              new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Analysis request timed out after 15 seconds')), 15000); // Keep timeout
              })
          ]) as any; // Cast needed because Promise.race return type is broad

          analysisData = analysisResponse.data;

          // Check if analysis exists for this script
          const existingAnalysis = await ScriptAnalysis.findOne({
              where: { scriptId: script.id },
              transaction
          });

          if (existingAnalysis) {
              // Sanitize AI response fields before updating
              await existingAnalysis.update({
                  purpose: sanitizeHtml(analysisData.purpose || 'No purpose provided', { allowedTags: [], allowedAttributes: {} }),
                  parameters: analysisData.parameters || {}, // Assuming parameters structure is safe or handled elsewhere
                  securityScore: analysisData.security_score ?? 5.0,
                  codeQualityScore: analysisData.code_quality_score ?? 5.0,
                  riskScore: analysisData.risk_score ?? 5.0,
                  optimizationSuggestions: (analysisData.optimization || []).map((s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} })),
                  commandDetails: (analysisData.command_details || []).map((s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} })), // Adjust if structure is different
                  msDocsReferences: (analysisData.ms_docs_references || []).map((s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} })) // Adjust if structure is different
                  // Add other fields from analysisData as needed
              }, { transaction });
          } else {
              // Sanitize AI response fields before creating - use raw SQL to avoid schema mismatch
              const createQuery = `
                INSERT INTO script_analysis (
                  script_id, purpose, parameter_docs, security_score, 
                  quality_score, risk_score, suggestions, command_details, 
                  ms_docs_references, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
              `;
              await db.query(createQuery, [
                  script.id,
                  sanitizeHtml(analysisData.purpose || 'No purpose provided', { allowedTags: [], allowedAttributes: {} }),
                  JSON.stringify(analysisData.parameters || {}),
                  analysisData.security_score ?? 5.0,
                  analysisData.code_quality_score ?? 5.0,
                  analysisData.risk_score ?? 5.0,
                  JSON.stringify((analysisData.optimization || []).map((s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }))),
                  JSON.stringify((analysisData.command_details || []).map((s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }))),
                  JSON.stringify((analysisData.ms_docs_references || []).map((s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} })))
              ], { transaction });
          }


          logger.info(`Upserted analysis record for script ${script.id}`, { scriptId: script.id });

          // Update the script category if determined by AI and not manually set
          if (!categoryId && analysisData.category_id) {
              // Ensure script object is updated if category changes
              await script.update({ categoryId: analysisData.category_id }, { transaction });
              logger.info(`Updated script ${script.id} category based on AI analysis`, { scriptId: script.id, categoryId: analysisData.category_id });
          }
      } catch (analysisError) {
          // Enhanced error logging for AI analysis failure
          let errorDetails = analysisError.message;
          if (axios.isAxiosError(analysisError) && analysisError.response) {
              errorDetails = JSON.stringify(analysisError.response.data); // Log the full response data
          }
          logger.error(`AI analysis failed for script ${script.id}: ${analysisError.message}`, {
              scriptId: script.id,
              error: analysisError.message,
              responseData: errorDetails, // Add response data to log
              // stack: analysisError.stack // Optional: include stack trace if needed
          });

          // Attempt to create/update a basic analysis record even if AI analysis fails
          try {
              // Check if analysis exists for this script
              const existingAnalysisFallback = await ScriptAnalysis.findOne({
                  where: { scriptId: script.id },
                  transaction
              });

              if (existingAnalysisFallback) {
                  // Update existing analysis
                  await existingAnalysisFallback.update({
                      purpose: 'Analysis pending due to service error',
                      parameters: {},
                      securityScore: 5.0,
                      codeQualityScore: 5.0,
                      riskScore: 5.0,
                      optimizationSuggestions: [],
                      commandDetails: [],
                      msDocsReferences: []
                  }, { transaction });
              } else {
                  // Create new analysis - use raw SQL to avoid schema mismatch
                  const fallbackQuery = `
                    INSERT INTO script_analysis (
                      script_id, purpose, parameter_docs, security_score, 
                      quality_score, risk_score, suggestions, command_details, 
                      ms_docs_references, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                  `;
                  await db.query(fallbackQuery, [
                      script.id,
                      'Analysis pending due to service error',
                      JSON.stringify({}),
                      5.0,
                      5.0,
                      5.0,
                      JSON.stringify([]),
                      JSON.stringify([]),
                      JSON.stringify([])
                  ], { transaction });
              }
              logger.info(`Upserted default analysis record for script ${script.id} due to AI service failure`, { scriptId: script.id });
          } catch (fallbackError) {
              logger.error(`Failed to upsert fallback analysis record for script ${script.id}: ${fallbackError.message}`, { scriptId: script.id });
              // If saving fallback analysis fails, it might indicate a deeper DB issue.
              // Consider re-throwing the error to ensure the main transaction rolls back.
              // throw fallbackError;
          }
      }
  }

  /**
   * Centralized error handler for script creation/update failures.
   * Logs the error and sends an appropriate response.
   */
  private _handleCreateScriptError = (res: Response, error: any) => {
      logger.error('Error during script operation:', {
          errorMessage: error.message,
          errorStack: error.stack,
          errorDetails: error // Log the full error object for more context
      });

      // Check for specific Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
          const messages = error.errors.map((e: any) => e.message);
          return res.status(400).json({ message: 'Validation failed', errors: messages });
      }

      // Check for specific Sequelize unique constraint errors
      if (error.name === 'SequelizeUniqueConstraintError') {
          const messages = error.errors.map((e: any) => `${e.path} must be unique.`);
          return res.status(409).json({ message: 'Conflict', errors: messages }); // 409 Conflict
      }

      // Generic internal server error
      return res.status(500).json({ message: 'Internal server error during script operation' });
  }

  /**
   * Helper function to update tags for a script within a transaction.
   * Handles creation of new tags and association/disassociation.
   */
  private _updateTags = async (scriptId: string | number, tags: string[] | undefined, transaction: Transaction, isCreating: boolean = false) => {
      if (!tags || !Array.isArray(tags)) {
          if (!isCreating) {
              // If updating and no tags provided, remove existing associations
              await ScriptTag.destroy({ where: { scriptId }, transaction });
              logger.debug(`Removed all tags for script ${scriptId} as none were provided during update.`, { scriptId });
          }
          return []; // No tags to process
      }

      // Sanitize and validate tags: ensure they are strings, trim whitespace, remove empty tags, limit length
      const validTags = tags
          .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
          .map(tag => tag.trim().substring(0, 50)) // Limit tag length
          .slice(0, 20); // Limit number of tags

      if (tags.length > validTags.length) {
          logger.warn(`Some tags were invalid or exceeded limits for script ${scriptId}. Original: ${tags.length}, Valid: ${validTags.length}`, { scriptId });
      }

      if (validTags.length === 0) {
          if (!isCreating) {
              await ScriptTag.destroy({ where: { scriptId }, transaction });
              logger.debug(`Removed all tags for script ${scriptId} as no valid tags were provided during update.`, { scriptId });
          }
          return [];
      }

      // Find or create tags
      const tagInstances = await Promise.all(
          validTags.map(tagName => Tag.findOrCreate({ where: { name: tagName }, defaults: { name: tagName }, transaction }))
      );

      const tagIds = tagInstances.map(([tag]) => tag.id);

      // Efficiently update associations: remove old, add new
      await ScriptTag.destroy({ where: { scriptId }, transaction }); // Remove all existing first
      const scriptTagAssociations = tagIds.map(tagId => ({ scriptId, tagId }));
      await ScriptTag.bulkCreate(scriptTagAssociations, { transaction }); // Add new ones

      logger.info(`Updated tags for script ${scriptId}`, { scriptId, tagIds });
      return tagIds; // Return the IDs of the associated tags
  }


  /**
   * Helper function to fetch a script with all its associations.
   */
  private _getScriptWithAssociations = async (scriptId: string | number): Promise<Script | null> => {
      const id = typeof scriptId === 'string' ? parseInt(scriptId, 10) : scriptId;
      if (isNaN(id)) {
          logger.warn('Invalid script ID provided for fetching associations', { scriptId });
          return null;
      }

      return Script.findByPk(id, {
          include: [
              { model: User, as: 'user', attributes: ['id', 'username'] },
              { model: Category, as: 'category', attributes: ['id', 'name'] },
              { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } } // Include tags
              // Temporarily removed ScriptAnalysis and ScriptVersion until database schema matches models
          ]
      });
  }

  /**
   * Helper function to clear relevant caches for a script ID.
   */
  private _clearCaches = (scriptIdStr: string) => { // Changed parameter type to string
      cache.del(`script:${scriptIdStr}`);
      cache.clearPattern('scripts:'); // Clear list caches
      logger.debug(`Cleared caches related to script ID ${scriptIdStr}`, { scriptId: scriptIdStr });
  }

  // Search scripts with keyword matching (Vector search removed due to incorrect usage)
  searchScripts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.q as string || '';
      const categoryId = req.query.categoryId as string;
      const qualityThreshold = parseFloat(req.query.qualityThreshold as string);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const cacheKey = `search:${query}:${categoryId || ''}:${qualityThreshold || ''}:${page}:${limit}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for searchScripts`, { cacheKey });
        return res.json(cachedData);
      }
      logger.debug(`Cache miss for searchScripts`, { cacheKey });

      // Build the main query conditions
      const whereClause: any = {};
      const includeClause: any[] = [
        { model: User, as: 'user', attributes: ['id', 'username'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: ScriptAnalysis, as: 'analysis', required: false } // Left join analysis
      ];

      // Apply keyword condition if query exists
      if (query) {
        const keywordCondition = {
          [Op.or]: [
            { title: { [Op.iLike]: `%${query}%` } },
            { description: { [Op.iLike]: `%${query}%` } },
            // Add content search if needed, but be mindful of performance
            // { content: { [Op.iLike]: `%${query}%` } }
          ]
        };
         whereClause[Op.or] = [keywordCondition];
      }

      // Add other filters
      if (categoryId) {
        whereClause.categoryId = categoryId;
      }
      if (!isNaN(qualityThreshold)) {
        // Ensure we filter based on the analysis table using Sequelize's syntax
        const analysisInclude = includeClause.find(inc => inc.as === 'analysis');
        if (analysisInclude) {
            analysisInclude.where = {
                quality_score: { [Op.gte]: qualityThreshold }
            };
            // Make the include required if filtering by quality score
            analysisInclude.required = true;
        }
      }

      const { count, rows } = await Script.findAndCountAll({
        where: whereClause,
        include: includeClause,
        limit,
        offset,
        order: [
          ['updatedAt', 'DESC']
        ],
        distinct: true // Ensure count is correct with includes
      });

      const response = {
        results: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };

      cache.set(cacheKey, response, 300); // Cache search results for 5 minutes
      res.json(response);

    } catch (error) {
      logger.error('Error searching scripts:', {
          error: error.message,
          stack: error.stack,
          query: req.query
      });
      next(error);
    }
  }

  // Get script analysis
  getScriptAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scriptId = req.params.id;
      const cacheKey = `analysis:${scriptId}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for getScriptAnalysis`, { cacheKey, scriptId });
        return res.json(cachedData);
      }
      logger.debug(`Cache miss for getScriptAnalysis`, { cacheKey, scriptId });

      // Temporarily use raw query to avoid model schema mismatch
      const analysisQuery = `
        SELECT id, script_id, purpose, security_score, quality_score, risk_score, 
               parameter_docs, suggestions, command_details, ms_docs_references, 
               created_at, updated_at
        FROM script_analysis 
        WHERE script_id = $1
      `;
      const analysisResult = await db.query(analysisQuery, [scriptId]);
      
      if (!analysisResult[0]) {
        logger.warn(`Analysis not found for script`, { scriptId });
        // Return 200 with null to avoid browser console errors
        return res.status(200).json(null);
      }
      
      const analysis = analysisResult[0];
      cache.set(cacheKey, analysis, 300); // Cache for 5 minutes
      res.json(analysis);
    } catch (error) {
      logger.error(`Error getting script analysis for script ${req.params.id}:`, error);
      next(error);
    }
  }

  // Upload a script file with metadata and handle potential duplicates
  uploadScript = async (req: Request, res: Response, next: NextFunction) => {
    let transaction;
    try {
      // Start transaction
      transaction = await sequelize.transaction();

      if (!req.file) {
        return res.status(400).json({ error: 'no_file', message: 'No script file uploaded' });
      }

      const { title, description, category_id, tags: tagsJson, is_public, analyze_with_ai } = req.body;
      const userId = req.user?.userId;

      // Sanitize title and description from form data
      const sanitizedTitle = title ? sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} }) : 'Untitled Script'; // Use default if title missing
      const sanitizedDescription = description ? sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} }) : 'No description provided'; // Use default if description missing


      if (!userId) {
        if (transaction) await transaction.rollback();
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Calculate MD5 hash of the file buffer
      const fileBuffer = req.file.buffer;
      const fileHash = calculateBufferMD5(fileBuffer);

      // Check for existing script with the same hash for this user
      const existingScript = await Script.findOne({
        where: {
          userId: userId,
          fileHash: fileHash
        },
        transaction // Include in transaction for consistent read
      });

      if (existingScript) {
        logger.warn(`Duplicate script upload detected for user ${userId} with hash ${fileHash}. Script ID: ${existingScript.id}`);
        if (transaction) await transaction.rollback();
        // Return a specific error or the existing script details
        return res.status(409).json({ // 409 Conflict
          error: 'duplicate_script',
          message: 'This script content has already been uploaded. You can update the existing script instead.',
          existingScriptId: existingScript.id,
          existingScriptTitle: existingScript.title,
          suggestion: 'Use PUT /api/scripts/' + existingScript.id + ' to update the existing script'
        });
      }

      // Read file content (already in buffer)
      let scriptContent: string;
      try {
        scriptContent = fileBuffer.toString('utf8'); // Assuming UTF-8 encoding

        // Basic check for binary content (e.g., presence of many null bytes)
        if (fileBuffer.includes('\0\0')) { // Simple heuristic
          if (transaction) await transaction.rollback();
          logger.warn(`Uploaded file ${req.file.originalname} appears to be binary.`);
          return res.status(400).json({
            error: 'binary_file_detected',
            message: 'The file appears to be binary, not a text-based script'
          });
        }

        // Limit size of very large files
        const MAX_SCRIPT_SIZE = 1 * 1024 * 1024; // 1MB limit
        if (req.file.size > MAX_SCRIPT_SIZE) {
          if (transaction) await transaction.rollback();
          logger.warn(`Script upload rejected due to size (${req.file.size} bytes > ${MAX_SCRIPT_SIZE} bytes)`);
          return res.status(413).json({ // Payload Too Large
             error: 'file_too_large',
             message: `Script size exceeds the limit of ${MAX_SCRIPT_SIZE / 1024 / 1024}MB.`
          });
        }
      } catch (readError) {
        if (transaction) await transaction.rollback();
        logger.error('Error reading file content:', readError);
        return res.status(400).json({
          error: 'file_read_error',
          message: 'Could not read file contents'
        });
      }

      const fileName = req.file.originalname;
      const fileType = path.extname(fileName).toLowerCase();

      // Validate script content (apply to all uploads for consistency)
      if (!ScriptController.validatePowerShellContent(scriptContent)) {
          if (transaction) await transaction.rollback();
          logger.warn(`Uploaded script ${fileName} failed content validation.`);
          return res.status(400).json({ message: 'Script content failed validation (e.g., contains disallowed commands or appears unsafe).' });
      }

      // Parse tags if provided with validation
      let tagsArray: string[] = []; // Ensure it's always an array
      if (tagsJson) {
        try {
          const parsedTags = typeof tagsJson === 'string' ? JSON.parse(tagsJson) : tagsJson;
          if (Array.isArray(parsedTags)) {
             tagsArray = parsedTags.filter(tag => typeof tag === 'string' && tag.trim().length > 0).slice(0, 10); // Filter valid tags & limit
             if (parsedTags.length > 10) {
                 logger.warn(`Received ${parsedTags.length} tags, but limited to 10.`);
             }
          } else {
             logger.warn('Received tags are not in a valid array format, ignoring tags.', { receivedTags: tagsJson });
          }
        } catch (e) {
          logger.warn('Failed to parse tags JSON, ignoring tags:', { error: e.message, receivedTags: tagsJson });
        }
      }

      // Create the script record in the database
      // Use sanitized title and description
      const script = await Script.create({
        title: sanitizedTitle, // Use sanitized title
        description: sanitizedDescription, // Use sanitized description
        content: scriptContent,
        userId,
        categoryId: category_id || null,
        version: 1,
        executionCount: 0,
        isPublic: is_public === 'true' || is_public === true,
        fileHash: fileHash // Save the file hash
      }, { transaction });

      logger.info(`Created script record with ID ${script.id}`);

      // Create initial script version
      await ScriptVersion.create({
        scriptId: script.id,
        version: 1,
        content: scriptContent,
        changelog: 'Initial upload',
        userId
      }, { transaction });

      logger.info(`Created initial script version for script ${script.id}`);

      // Add tags using the helper method
      await this._updateTags(script.id, tagsArray, transaction, true);

      // Commit the transaction *before* sending response and starting async analysis
      await transaction.commit();
      logger.info(`Transaction committed for script upload ${script.id}`);

      // Clear relevant caches
      this._clearCaches(String(script.id)); // Pass as string

      // Send the response immediately
      const responseData = {
        success: true,
        script: {
          id: script.id,
          title: script.title,
          description: script.description,
          userId: script.userId,
          categoryId: script.categoryId,
          version: script.version,
          isPublic: script.isPublic,
          fileHash: script.fileHash,
          createdAt: script.createdAt,
          updatedAt: script.updatedAt,
          tags: tagsArray // Return the processed tags
        },
        message: 'Script uploaded successfully. Analysis will run in the background.'
      };
      res.status(201).json(responseData);

      // Trigger background analysis if requested (AFTER sending response)
      if (analyze_with_ai === 'true' || analyze_with_ai === true) {
        logger.info(`Queueing background analysis for script ${script.id}`);
        // Use setImmediate or process.nextTick to ensure it runs after the current event loop cycle
        setImmediate(async () => {
          let analysisTransaction;
          try {
            // Start a new transaction specifically for the analysis update
            analysisTransaction = await sequelize.transaction();
            logger.info(`Starting background analysis transaction for script ${script.id}`);

            // Fetch the script again within the new transaction to ensure consistency
            const scriptForAnalysis = await Script.findByPk(script.id, { transaction: analysisTransaction });
            if (!scriptForAnalysis) {
              logger.error(`Script ${script.id} not found for background analysis.`);
              await analysisTransaction.rollback(); // Rollback if script vanished
              return;
            }

            // Ensure categoryId is passed as string or null
            const categoryIdString = scriptForAnalysis.categoryId === null ? null : String(scriptForAnalysis.categoryId);
            await this._analyzeAndSaveScript(req, scriptForAnalysis, scriptContent, categoryIdString, analysisTransaction);

            await analysisTransaction.commit();
            logger.info(`Background analysis transaction committed for script ${script.id}`);
            // Optionally clear analysis cache here if needed
            cache.del(`analysis:${script.id}`);

          } catch (backgroundError) {
            logger.error(`Background analysis failed for script ${script.id}:`, backgroundError);
            if (analysisTransaction && !analysisTransaction.finished) {
              try {
                await analysisTransaction.rollback();
                logger.info(`Background analysis transaction rolled back for script ${script.id}`);
              } catch (rollbackError) {
                logger.error(`Error rolling back background analysis transaction for script ${script.id}:`, rollbackError);
              }
            }
            // Optionally: Update script status to indicate analysis failure
          }
        });
      }

    } catch (error) {
      // Rollback main transaction if it exists and hasn't finished
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
          logger.info('Main transaction rolled back due to error during script upload.');
        } catch (rollbackError) {
          logger.error('Critical: Error rolling back main transaction after script upload failure:', rollbackError);
        }
      }
      // Use the centralized error handler
      this._handleCreateScriptError(res, error);
      // next(error); // Optional
    }
  }


  // Execute a script
  executeScript = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // --- CRITICAL SECURITY WARNING ---
      logger.crit(`[SECURITY RISK] Executing script ID ${req.params.id} without sandboxing! Direct execution of untrusted code is highly dangerous and can lead to Remote Code Execution (RCE). Implement sandboxing immediately.`, { scriptId: req.params.id, userId: req.user?.userId });
      // --- END CRITICAL SECURITY WARNING ---

      const scriptId = req.params.id;
      const params = req.body.params || {}; // Get parameters from request body
      const userId = req.user?.userId; // Get user ID from JWT

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const script = await Script.findByPk(scriptId);
      if (!script) {
        return res.status(404).json({ message: 'Script not found' });
      }

      // --- SECURITY ENHANCEMENT: Parameter Sanitization ---
      const sanitizedParams: { [key: string]: string } = {};
      const paramWarnings: string[] = [];
      for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
          const value = params[key];
          // Basic validation: Allow only strings or numbers for parameters
          if (typeof value === 'string' || typeof value === 'number') {
             // Escape the value for safe inclusion in the PowerShell command string
             sanitizedParams[key] = shellEscape([String(value)]); // shellEscape expects an array
          } else {
             paramWarnings.push(`Parameter '${key}' has an invalid type (${typeof value}) and was ignored.`);
             logger.warn(`Invalid parameter type for key '${key}' during script execution`, { scriptId, userId, key, type: typeof value });
          }
        }
      }
      if (paramWarnings.length > 0) {
         // Optionally return an error or just log if invalid params are critical
         // return res.status(400).json({ message: "Invalid parameter types provided.", warnings: paramWarnings });
         logger.warn(`Some parameters were ignored due to invalid types`, { scriptId, userId, warnings: paramWarnings });
      }
      logger.warn(`Executing script ${scriptId}. Sandboxing is NOT implemented. Ensure script content is trusted.`, { scriptId, userId });


      // Log the execution attempt with original (unsanitized) params for audit trail
      const logEntry = await ExecutionLog.create({
        scriptId: script.id,
        userId: userId,
        parameters: params, // Log original params
        status: 'pending',
        executedAt: new Date()
      });

      // Use node-powershell (ensure it's configured securely)
      const PowerShell = require('node-powershell');
      const ps = new PowerShell({
        executionPolicy: 'Bypass', // Consider if 'RemoteSigned' or other policy is more appropriate
        noProfile: true,
        verbose: true // Enable verbose logging from node-powershell
      });

      // Construct the PowerShell command with sanitized parameters
      // Option 2: Define parameters directly in the script block (Simpler for node-powershell)
      // Create parameter definitions string
      const paramDefinitions = Object.keys(sanitizedParams)
          .map(key => `$${key}=${sanitizedParams[key]}`) // Value is already escaped
          .join('; ');

      // Prepend parameter definitions to the script content
      const command = `${paramDefinitions ? paramDefinitions + '; ' : ''}${script.content}`;

      logger.debug(`Constructed PowerShell command for execution`, { scriptId, command }); // Log the command for debugging (be careful with sensitive data)

      // Add the constructed command
      await ps.addCommand(command);

      // Invoke the command (no separate parameters needed here as they are part of the command string)
      logger.info(`Attempting to execute script ${scriptId} for user ${userId}`, { scriptId, userId });
      const output = await ps.invoke();
      logger.info(`Script ${scriptId} execution completed`, { scriptId, userId });

      // Update the log entry with results
      await logEntry.update({
        status: 'completed',
        output: output,
        errorOutput: null, // Assuming no error for now
        completedAt: new Date()
      });

      // Increment execution count (consider doing this atomically)
      await script.increment('executionCount');

      res.json({
        message: 'Script executed successfully',
        output: output,
        logId: logEntry.id
      });

    } catch (error) {
      logger.error(`Error executing script ${req.params.id}:`, error);

      // Attempt to update log entry with error status
      try {
        const scriptId = parseInt(req.params.id, 10);
        const userId = req.user?.userId;
        if (!isNaN(scriptId) && userId) {
          // Find the most recent pending log for this script/user combo
          const logEntry = await ExecutionLog.findOne({
            where: { scriptId, userId, status: 'pending' },
            order: [['executedAt', 'DESC']]
          });
          if (logEntry) {
            await logEntry.update({
              status: 'failed',
              errorOutput: error.message || JSON.stringify(error), // Store error message
              completedAt: new Date()
            });
          }
        }
      } catch (logError) {
        logger.error(`Failed to update execution log with error status for script ${req.params.id}:`, logError);
      }

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.includes('timed out')) { // Example check
          statusCode = 504; // Gateway Timeout
      }
      // Add more specific error checks if needed

      res.status(statusCode).json({
        message: 'Script execution failed',
        error: error.message || 'Unknown error',
        details: error // Include full error details for debugging if appropriate
      });
      // next(error); // Pass to global error handler if desired
    }
  }


  // Analyze script content without saving
  analyzeScript = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, apiKey } = req.body; // Accept API key from body to avoid CORS issues
      if (!content) {
        return res.status(400).json({ message: 'content is required' });
      }

      // Get API key from body first (to avoid CORS), then fallback to header
      const openaiApiKey = apiKey || req.headers['x-openai-api-key'] as string;
      const analysisConfig = {
          headers: {},
          timeout: 15000 // 15 second timeout
      };
      if (openaiApiKey) {
          analysisConfig.headers['x-api-key'] = openaiApiKey;
      }

      logger.info('Sending ad-hoc script content for AI analysis');

      // Construct URL with query parameters
      const analysisUrl = new URL(`${AI_SERVICE_URL}/analyze`);
      analysisUrl.searchParams.append('include_command_details', 'true');
      analysisUrl.searchParams.append('fetch_ms_docs', 'true');

      // Use Promise.race for timeout handling
      const analysisResponse = await Promise.race([
          axios.post(analysisUrl.toString(), {
              script_content: content // Send content with correct key for AI service
          }, analysisConfig),
          new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Analysis request timed out after 15 seconds')), 15000);
          })
      ]) as any;

      res.json(analysisResponse.data);

    } catch (error) {
      logger.error('Error analyzing script content:', error);
      let errorDetails = error.message;
      let statusCode = 500;
      if (axios.isAxiosError(error)) {
          if (error.response) {
              errorDetails = JSON.stringify(error.response.data);
              statusCode = error.response.status; // Use status from AI service if available
          } else if (error.request) {
              errorDetails = 'No response received from AI service.';
              statusCode = 504; // Gateway Timeout
          }
      } else if (error.message?.includes('timed out')) {
          statusCode = 504; // Gateway Timeout
      }

      res.status(statusCode).json({
          message: 'Failed to analyze script content',
          error: errorDetails
      });
      // next(error); // Optional
    }
  }

  // Analyze a specific script and save the analysis
  analyzeScriptAndSave = async (req: Request, res: Response, next: NextFunction) => {
    let transaction;
    try {
      const scriptId = req.params.id;

      // Start transaction
      transaction = await sequelize.transaction();

      const script = await Script.findByPk(scriptId, { transaction }); // Fetch within transaction
      if (!script) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Script not found' });
      }

      // Ensure categoryId is passed as string or null
      const categoryIdString = script.categoryId === null ? null : String(script.categoryId);
      await this._analyzeAndSaveScript(req, script, script.content, categoryIdString, transaction);

      // Commit transaction
      await transaction.commit();

      // Fetch the updated analysis to return
      const analysisQuery = `
        SELECT 
          id,
          script_id as "scriptId",
          purpose,
          parameter_docs as parameters,
          security_score as "securityScore",
          quality_score as "codeQualityScore",
          risk_score as "riskScore",
          suggestions as "optimizationSuggestions",
          command_details as "commandDetails",
          ms_docs_references as "msDocsReferences",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM script_analysis
        WHERE script_id = $1
      `;
      const analysisResults = await db.query(analysisQuery, [scriptId]);
      const updatedAnalysis = analysisResults[0];

      // Clear relevant caches
      cache.del(`analysis:${scriptId}`);
      this._clearCaches(String(scriptId)); // Clear script list/detail caches too

      res.json(updatedAnalysis || { message: 'Analysis completed, but no data returned.' }); // Return updated analysis or confirmation

    } catch (error) {
      // Rollback transaction on error
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
          logger.info(`Transaction rolled back for analyzeScriptAndSave script ${req.params.id}`);
        } catch (rollbackError) {
          logger.error(`Error rolling back transaction for analyzeScriptAndSave script ${req.params.id}:`, rollbackError);
        }
      }
      logger.error(`Error analyzing and saving script ${req.params.id}:`, error);
      this._handleCreateScriptError(res, error); // Reuse error handler
      // next(error); // Optional
    }
  }

  // Find similar scripts using vector embeddings
  findSimilarScripts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scriptId = parseInt(req.params.id, 10);
      if (isNaN(scriptId)) {
        return res.status(400).json({ message: 'Invalid script ID' });
      }

      const script = await Script.findByPk(scriptId, { attributes: ['id', 'content'] });
      if (!script) {
        return res.status(404).json({ message: 'Script not found' });
      }

      // Use the script's ID to find similar ones based on its pre-computed embedding
      let similarScriptIds;
      try {
        similarScriptIds = await findSimilarScripts(scriptId, 0.7, 10); // Pass scriptId (number) instead of content
      } catch (error: any) {
        // If script has no embedding, return empty array with 200 status
        if (error.message && error.message.includes('no embedding')) {
          logger.info(`Script ${scriptId} has no embedding for similarity search`);
          return res.status(200).json({ similar_scripts: [] });
        }
        throw error; // Re-throw other errors
      }

      if (similarScriptIds.length === 0) {
        return res.json({ similar_scripts: [] });
      }

      // Fetch details of similar scripts (excluding the original script itself)
      const similarScripts = await Script.findAll({
        where: {
          id: {
            [Op.in]: similarScriptIds,
            [Op.ne]: scriptId // Exclude the original script
          }
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username'] },
          { model: Category, as: 'category', attributes: ['id', 'name'] }
        ],
        limit: 10 // Limit the final result set
      });

      res.json({
        similar_scripts: similarScripts.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          user: s.user,
          category: s.category,
          // Add similarity score if returned by findSimilarScripts
        }))
      });

    } catch (error) {
      logger.error(`Error finding similar scripts for script ${req.params.id}:`, error);
      next(error);
    }
  }

  // Analyze script using the AI Assistant flow (potentially more detailed)
  analyzeScriptWithAssistant = async (req: Request, res: Response, next: NextFunction) => {
      try {
          const { script_content, script_id } = req.body; // Allow providing content or ID
          let contentToAnalyze = script_content;
          const scriptIdForContext = script_id;

          if (!contentToAnalyze && scriptIdForContext) {
              const script = await Script.findByPk(scriptIdForContext);
              if (!script) {
                  return res.status(404).json({ message: 'Script not found for the provided ID' });
              }
              contentToAnalyze = script.content;
          } else if (!contentToAnalyze) {
              return res.status(400).json({ message: 'Either script_content or script_id must be provided' });
          }

          const openaiApiKey = req.headers['x-openai-api-key'] as string;
          const analysisConfig = {
              headers: {},
              timeout: 60000 // Longer timeout for potentially complex assistant interaction (60s)
          };
          if (openaiApiKey) {
              analysisConfig.headers['x-api-key'] = openaiApiKey;
          }

          logger.info('Sending script for AI Assistant analysis', { scriptId: scriptIdForContext });

          // Construct URL for the assistant endpoint
          const assistantAnalysisUrl = new URL(`${AI_SERVICE_URL}/analyze/assistant`);

          // Use Promise.race for timeout handling
          const analysisResponse = await Promise.race([
              axios.post(assistantAnalysisUrl.toString(), {
                  script_content: contentToAnalyze,
                  script_id: scriptIdForContext // Pass ID for context if available
              }, analysisConfig),
              new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Assistant analysis request timed out after 60 seconds')), 60000);
              })
          ]) as any;

          // --- SECURITY CONSIDERATION ---
          // Sanitize the response from the AI assistant before sending to the client?
          // Depending on what the assistant returns, it might contain executable code or HTML.
          const sanitizedData = analysisResponse.data;
          if (typeof sanitizedData === 'object' && sanitizedData !== null) {
              // Example: Sanitize a field named 'explanation' if it exists
              if (sanitizedData.explanation && typeof sanitizedData.explanation === 'string') {
                  sanitizedData.explanation = sanitizeHtml(sanitizedData.explanation, {
                      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'], // Allow basic formatting
                      allowedAttributes: {}
                  });
              }
              // Add sanitization for other potentially risky fields (e.g., code examples, suggestions)
              if (sanitizedData.code_example && typeof sanitizedData.code_example === 'string') {
                 sanitizedData.code_example = sanitizeHtml(sanitizedData.code_example, { allowedTags: ['code', 'pre'], allowedAttributes: {} });
              }
               if (sanitizedData.suggestions && Array.isArray(sanitizedData.suggestions)) {
                 sanitizedData.suggestions = sanitizedData.suggestions.map((s: any) => typeof s === 'string' ? sanitizeHtml(s, { allowedTags: ['code'], allowedAttributes: {} }) : s);
              }
          }
          // --- END SECURITY CONSIDERATION ---


          res.json(sanitizedData); // Send potentially sanitized data

      } catch (error) {
          logger.error('Error analyzing script with assistant:', error);
          let errorDetails = error.message;
          let statusCode = 500;
          if (axios.isAxiosError(error)) {
              if (error.response) {
                  errorDetails = JSON.stringify(error.response.data);
                  statusCode = error.response.status;
              } else if (error.request) {
                  errorDetails = 'No response received from AI service (assistant).';
                  statusCode = 504;
              }
          } else if (error.message?.includes('timed out')) {
              statusCode = 504;
          }

          res.status(statusCode).json({
              message: 'Failed to analyze script with assistant',
              error: errorDetails
          });
          // next(error); // Optional
      }
  }


  /**
   * Basic validation for PowerShell content.
   * Tries to detect non-text or obviously incorrect formats and disallowed commands.
   * @param content The script content as a string.
   * @returns boolean True if it seems like valid text content, false otherwise.
   */
  static validatePowerShellContent(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }
    // Check for excessive null bytes (simple binary detection)
    if (content.includes('\0\0\0')) {
      logger.warn('Potential binary content detected due to null bytes.');
      return false;
    }

    // Example: Disallow Invoke-Expression (case-insensitive regex)
    const dangerousPatterns = [
        /Invoke-Expression/i,
        /iex/i, // Alias for Invoke-Expression
        /Start-Process/i,
        /Remove-Item/i,
        // Add other potentially dangerous commands or patterns here (e.g., registry edits, network calls)
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
            logger.warn('Potential dangerous pattern detected in script content.', { pattern: pattern.toString() });
            return false;
        }
    }

    // Check for common script starting characters or keywords (very basic, keep if desired)
    // const trimmedContent = content.trim();
    // if (trimmedContent.length > 0 && !trimmedContent.startsWith('<#') && !trimmedContent.startsWith('#') && !trimmedContent.startsWith('function') && !trimmedContent.startsWith('param') && !trimmedContent.startsWith('$') && !trimmedContent.startsWith('Write-') && !trimmedContent.startsWith('Get-') && !trimmedContent.startsWith('Set-') && !trimmedContent.startsWith('New-') && !trimmedContent.startsWith('Invoke-')) {
    //   // logger.debug('Script content does not start with common PowerShell patterns.');
    // }

    // Add more sophisticated checks if needed (e.g., regex for common structures)
    return true; // Assume valid text if basic checks pass
  }

}

export default new ScriptController();
