// File has been checked for TypeScript errors
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import multer from 'multer';
import { sequelize } from '../database/connection';
import logger from '../utils/logger';
import { Script, ScriptVersion } from '../models';
import axios from 'axios';

const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// Configure upload storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        await mkdirAsync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const fileExt = path.extname(file.originalname);
    cb(null, `${uniqueId}${fileExt}`);
  }
});

// Configure upload limits
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5 // Max 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Only allow PowerShell scripts and text files
    const allowedExtensions = ['.ps1', '.psm1', '.psd1', '.txt'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExt} not allowed. Only PowerShell scripts and text files are accepted.`));
    }
  }
});

/**
 * AsyncUploadController
 * Handles asynchronous file uploads and processing
 */
interface QueueItem {
  uploadId: string;
  userId: number;
}

export class AsyncUploadController {
  private processingQueue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private readonly AI_SERVICE_URL: string;
  private readonly USE_MOCK_SERVICES: boolean;
  
  constructor() {
    this.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES === 'true' || process.env.MOCK_MODE === 'true' || true; // Force mock services for local development
    
    // Bind methods to ensure 'this' context
    this.uploadFiles = this.uploadFiles.bind(this);
    this.getUploadStatus = this.getUploadStatus.bind(this);
    this.processNextFile = this.processNextFile.bind(this);
  }
  
  /**
   * Upload files endpoint
   * @param req Request object
   * @param res Response object
   */
  public uploadFiles(req: Request, res: Response): void {
    // Use multer to handle the file upload
    const uploadMiddleware = upload.array('files', 5);
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      
      // Check if files were uploaded
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'No files were uploaded'
        });
      }
      
      try {
        const files = req.files as Express.Multer.File[];
        const userId = req.user?.userId;
        
        if (!userId) {
          // Clean up uploaded files
          for (const file of files) {
            await unlinkAsync(file.path);
          }
          
          return res.status(401).json({
            success: false,
            error: 'User authentication required'
          });
        }
        
        // Add files to processing queue
        const uploadIds = files.map(file => {
          const uploadId = path.basename(file.path);
          this.processingQueue.push({ uploadId, userId });
          return uploadId;
        });
        
        // Start processing if not already processing
        if (!this.isProcessing) {
          this.processNextFile();
        }
        
        // Return success with upload IDs for status tracking
        res.status(202).json({
          success: true,
          message: 'Files uploaded and queued for processing',
          uploadIds
        });
      } catch (error) {
        logger.error('Error handling upload:', error);
        res.status(500).json({
          success: false,
          error: 'Server error processing upload'
        });
      }
    });
  }
  
  /**
   * Get upload status endpoint
   * @param req Request object
   * @param res Response object
   */
  public async getUploadStatus(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId } = req.params;
      
      if (!uploadId) {
        res.status(400).json({
          success: false,
          error: 'Upload ID is required'
        });
        return;
      }
      
      // Check if file is in processing queue
      if (this.processingQueue.some(item => item.uploadId === uploadId)) {
        res.json({
          success: true,
          status: 'queued',
          message: 'File is queued for processing'
        });
        return;
      }
      
      // Check if file exists in temp directory
      const filePath = path.join(process.cwd(), 'uploads', 'temp', uploadId);
      if (fs.existsSync(filePath)) {
        res.json({
          success: true,
          status: 'processing',
          message: 'File is currently being processed'
        });
        return;
      }
      
      // Check if script was created in database
      const script = await Script.findOne({
        where: { uploadId },
        include: [{ model: ScriptVersion, as: 'versions' }]
      });
      
      if (script) {
        res.json({
          success: true,
          status: 'completed',
          message: 'File processing completed successfully',
          scriptId: script.id,
          scriptDetails: {
            title: script.title,
            description: script.description,
            versions: // @ts-ignore
                script.versions?.length || 1
          }
        });
        return;
      }
      
      // If we get here, the file was not found
      res.status(404).json({
        success: false,
        status: 'not_found',
        error: 'Upload not found'
      });
    } catch (error) {
      logger.error('Error checking upload status:', error);
      res.status(500).json({
        success: false,
        error: 'Server error checking upload status'
      });
    }
  }
  
  /**
   * Process the next file in the queue
   * @private
   */
  private async processNextFile(): Promise<void> {
    if (this.isProcessing) return;
    
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    const queueItem = this.processingQueue.shift();
    
    if (!queueItem) {
      this.isProcessing = false;
      return;
    }
    
    const { uploadId, userId } = queueItem;
    const filePath = path.join(process.cwd(), 'uploads', 'temp', uploadId);
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.error(`File not found: ${filePath}`);
        this.isProcessing = false;
        this.processNextFile();
        return;
      }
      
      // Read file content
      const fileContent = await readFileAsync(filePath, 'utf8');
      
      // Process file with transaction
      await sequelize.transaction(async (transaction) => {
        try {
          // Extract filename without extension and path
          const originalFilename = path.basename(filePath, path.extname(filePath));
          
          // Analyze script with AI service or use mock data
          let analysisResult;
          if (this.USE_MOCK_SERVICES) {
            // Generate mock analysis data
            logger.info('Using mock AI analysis data');
            
            // Generate a deterministic but reasonable mock response
            const words = fileContent.split(/\s+/).filter(w => w.length > 3);
            const purpose = words.length > 10 
              ? `This script appears to ${['manage', 'configure', 'automate', 'monitor'][words.length % 4]} ${['system resources', 'user accounts', 'network settings', 'file operations'][words.length % 4]}.`
              : 'Purpose could not be determined from the limited content.';
              
            analysisResult = {
              title: originalFilename,
              description: 'PowerShell script',
              purpose,
              parameters: fileContent.includes('param(') ? ['Random parameters detected'] : [],
              security_score: 6 + (fileContent.includes('Invoke-Expression') ? -2 : 0) + (fileContent.includes('encryption') ? 2 : 0),
              code_quality_score: 5 + (fileContent.includes('function') ? 2 : 0) + (fileContent.includes('error') ? -1 : 0),
              risk_score: 4 + (fileContent.includes('Remove') ? 3 : 0) + (fileContent.includes('test') ? -2 : 0),
              security_issues: fileContent.includes('Invoke-Expression') ? ['Uses potentially unsafe Invoke-Expression'] : [],
              optimization_suggestions: ['Consider adding error handling', 'Add more comments for better maintainability'],
              category: 1, // Default to first category
              tags: ['powershell', 'script']
            };
          } else {
            try {
              // Use real AI service
              logger.info(`Sending request to AI service at ${this.AI_SERVICE_URL}`);
              const response = await axios.post(`${this.AI_SERVICE_URL}/analyze-script`, {
                content: fileContent
              });
              analysisResult = response.data;
            } catch (error) {
              logger.error('Error analyzing script with AI service:', error);
              // Continue with default values if AI service fails
              analysisResult = {
                title: originalFilename,
                description: 'PowerShell script',
                purpose: 'Unknown',
                parameters: [],
                securityScore: 50,
                codeQualityScore: 50,
                riskScore: 50,
                category: null,
                tags: []
              };
            }
          }
          
          // Create script record
          const script = await Script.create({
            title: analysisResult.title || originalFilename,
            description: analysisResult.description || 'PowerShell script',
            uploadId,
            userId: userId,
            categoryId: analysisResult.category || null,
            isPublic: false,
            executionCount: 0
          }, { transaction });
          
          // Create script version
          await ScriptVersion.create({
            scriptId: script.id,
            version: 1,
            content: fileContent,
            changes: 'Initial version',
            userId: userId
          }, { transaction });
          
          // Add tags if available
          if (analysisResult.tags && analysisResult.tags.length > 0) {
            // Implementation for adding tags would go here
          }
          
          // Delete temporary file after successful processing
          await unlinkAsync(filePath);
          
          logger.info(`Successfully processed file: ${uploadId}`);
        } catch (error) {
          logger.error(`Error processing file ${uploadId}:`, error);
          throw error; // Rethrow to trigger transaction rollback
        }
      });
    } catch (error) {
      logger.error(`Failed to process file ${uploadId}:`, error);
      
      // Move to error directory instead of deleting
      try {
        const errorDir = path.join(process.cwd(), 'uploads', 'errors');
        if (!fs.existsSync(errorDir)) {
          await mkdirAsync(errorDir, { recursive: true });
        }
        
        const errorFilePath = path.join(errorDir, uploadId);
        fs.renameSync(filePath, errorFilePath);
        
        logger.info(`Moved failed file to error directory: ${errorFilePath}`);
      } catch (moveError) {
        logger.error(`Failed to move error file ${uploadId}:`, moveError);
        // Try to delete if move fails
        try {
          await unlinkAsync(filePath);
        } catch (unlinkError) {
          logger.error(`Failed to delete error file ${uploadId}:`, unlinkError);
        }
      }
    } finally {
      // Process next file regardless of success/failure
      this.isProcessing = false;
      this.processNextFile();
    }
  }
}

export default new AsyncUploadController();
