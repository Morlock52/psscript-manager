import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Maximum file size (50MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;

// Allowed file extensions
const ALLOWED_EXTENSIONS = (process.env.ALLOWED_FILE_EXTENSIONS || '.ps1,.psm1,.psd1').split(',');

// Memory storage for small files
const storage = multer.memoryStorage();

// Disk storage for larger files
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    // Ensure upload directory exists
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}-${randomString}${ext}`;
    cb(null, filename);
  }
});

// File filter to validate file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type ${ext} not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
  
  // Additional MIME type validation
  const allowedMimeTypes = ['text/plain', 'application/x-powershell', 'text/x-powershell-script'];
  if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type'));
  }
  
  cb(null, true);
};

// Create multer instances with security configurations
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Maximum 5 files per upload
    fields: 10, // Maximum 10 non-file fields
    headerPairs: 100 // Limit header pairs
  },
  fileFilter
});

const diskUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
    fields: 10,
    headerPairs: 100
  },
  fileFilter
});

/**
 * Enhanced Multer error handler middleware
 */
function handleMulterError(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 5 files allowed' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }
  
  next(err);
}

/**
 * Upload progress tracking middleware
 */
function handleUploadProgress(req: Request, res: Response, next: NextFunction): void {
  let uploadedBytes = 0;
  const contentLength = parseInt(req.headers['content-length'] || '0');
  
  req.on('data', (chunk) => {
    uploadedBytes += chunk.length;
    const progress = contentLength > 0 ? (uploadedBytes / contentLength) * 100 : 0;
    
    // Could emit progress via WebSocket or Server-Sent Events here
    if (progress % 10 === 0) {
      console.log(`Upload progress: ${progress.toFixed(0)}%`);
    }
  });
  
  next();
}

export default upload;
export { handleMulterError, diskUpload, handleUploadProgress };
