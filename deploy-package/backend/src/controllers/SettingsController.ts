import { Request, Response } from 'express';
import logger from '../utils/logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Path to store AI mode preference
const AI_MODE_FILE = path.join(__dirname, '..', '..', '.ai-mode');

// Load AI mode from file or environment
function loadAIMode(): 'mock' | 'real' {
  try {
    if (fs.existsSync(AI_MODE_FILE)) {
      const mode = fs.readFileSync(AI_MODE_FILE, 'utf-8').trim();
      return mode === 'real' ? 'real' : 'mock';
    }
  } catch (error) {
    logger.warn('Failed to load AI mode from file:', error);
  }
  return process.env.AI_MODE as 'mock' | 'real' || 'real';
}

// Save AI mode to file
function saveAIMode(mode: 'mock' | 'real') {
  try {
    fs.writeFileSync(AI_MODE_FILE, mode);
  } catch (error) {
    logger.error('Failed to save AI mode to file:', error);
  }
}

// Store AI mode globally (in production, this would be in database)
let globalAIMode: 'mock' | 'real' = loadAIMode();

class SettingsController {
  
  // Get current AI service status
  getAIServiceStatus = async (req: Request, res: Response) => {
    try {
      const openAIKey = process.env.OPENAI_API_KEY;
      const hasValidKey = openAIKey && openAIKey.startsWith('sk-') && openAIKey.length > 20;
      
      // Check if AI service is accessible
      const aiServiceUrl = process.env.DOCKER_ENV === 'true' 
        ? 'http://ai-service:8000'
        : 'http://localhost:8000';
      
      let serviceHealthy = false;
      let responseTime = 0;
      
      try {
        const startTime = Date.now();
        // Try to check if AI service is accessible
        const response = await axios.get(`${aiServiceUrl}/`, {
          timeout: 5000, // 5 second timeout
          validateStatus: (status) => status < 500 // Accept any status < 500
        });
        responseTime = Date.now() - startTime;
        serviceHealthy = true; // If we got a response, service is healthy
      } catch (error: any) {
        // If it's a connection error, service is not healthy
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          serviceHealthy = false;
          logger.warn('AI service not accessible:', error.message);
        } else if (error.response) {
          // Got a response, so service is running
          serviceHealthy = true;
          responseTime = error.config?.timeout || 0;
        } else {
          serviceHealthy = false;
          logger.warn('AI service health check error:', error.message);
        }
      }
      
      // For now, allow switching if API key is valid (bypass health check)
      const canUseRealAI = hasValidKey; // Temporarily bypass serviceHealthy check
      
      res.json({
        mode: globalAIMode,
        hasValidKey,
        serviceHealthy,
        responseTime,
        canUseRealAI,
        status: globalAIMode === 'mock' ? 'mock' : (serviceHealthy ? 'active' : 'error')
      });
    } catch (error) {
      logger.error('Error getting AI service status:', error);
      res.status(500).json({ 
        error: 'Failed to get AI service status',
        mode: 'mock',
        status: 'error'
      });
    }
  };
  
  // Toggle AI service mode
  toggleAIMode = async (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      
      if (!['mock', 'real'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Must be "mock" or "real"' });
      }
      
      // Check if we can enable real mode
      if (mode === 'real') {
        const openAIKey = req.headers['x-openai-api-key'] as string || process.env.OPENAI_API_KEY;
        if (!openAIKey || !openAIKey.toString().startsWith('sk-')) {
          return res.status(400).json({ 
            error: 'Cannot enable real AI mode without a valid OpenAI API key',
            currentMode: globalAIMode
          });
        }
        
        // Update the environment variable if key is provided via header
        if (req.headers['x-openai-api-key']) {
          process.env.OPENAI_API_KEY = req.headers['x-openai-api-key'] as string;
        }
      }
      
      globalAIMode = mode;
      
      // Store the mode preference
      saveAIMode(mode);
      process.env.AI_MODE = mode;
      
      logger.info(`AI mode switched to: ${mode}`);
      
      res.json({
        success: true,
        mode: globalAIMode,
        message: `AI service switched to ${mode} mode`
      });
    } catch (error) {
      logger.error('Error toggling AI mode:', error);
      res.status(500).json({ error: 'Failed to toggle AI mode' });
    }
  };
  
  // Save OpenAI API key (optional backend storage)
  saveOpenAIKey = async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || !apiKey.startsWith('sk-')) {
        return res.status(400).json({ error: 'Invalid API key format' });
      }
      
      // In production, encrypt and store in database
      // For now, we'll just validate it
      process.env.OPENAI_API_KEY = apiKey;
      
      res.json({
        success: true,
        message: 'API key saved successfully'
      });
    } catch (error) {
      logger.error('Error saving OpenAI key:', error);
      res.status(500).json({ error: 'Failed to save API key' });
    }
  };

  // Secure storage endpoints
  private secureStore: Map<string, { value: string; userId: number; expires?: Date }> = new Map();
  
  // Encryption helpers
  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.SESSION_SECRET || 'default-secret', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  private decrypt(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.SESSION_SECRET || 'default-secret', 'salt', 32);
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Store secure data
  storeSecureData = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { key, value } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ error: 'Key and value are required' });
      }
      
      // Encrypt the value before storing
      const encryptedValue = this.encrypt(value);
      
      // Store with user association
      const storageKey = `${req.user.userId}:${key}`;
      this.secureStore.set(storageKey, {
        value: encryptedValue,
        userId: req.user.userId,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Error storing secure data:', error);
      res.status(500).json({ error: 'Failed to store secure data' });
    }
  };
  
  // Retrieve secure data
  getSecureData = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({ error: 'Key is required' });
      }
      
      const storageKey = `${req.user.userId}:${key}`;
      const data = this.secureStore.get(storageKey);
      
      if (!data || data.userId !== req.user.userId) {
        return res.status(404).json({ error: 'Data not found' });
      }
      
      // Check expiration
      if (data.expires && data.expires < new Date()) {
        this.secureStore.delete(storageKey);
        return res.status(404).json({ error: 'Data expired' });
      }
      
      // Decrypt the value
      const decryptedValue = this.decrypt(data.value);
      
      res.json({ value: decryptedValue });
    } catch (error) {
      logger.error('Error retrieving secure data:', error);
      res.status(500).json({ error: 'Failed to retrieve secure data' });
    }
  };
  
  // Delete secure data
  deleteSecureData = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({ error: 'Key is required' });
      }
      
      const storageKey = `${req.user.userId}:${key}`;
      this.secureStore.delete(storageKey);
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting secure data:', error);
      res.status(500).json({ error: 'Failed to delete secure data' });
    }
  };
  
  // Check if API key exists (without returning the actual key)
  getApiKeyStatus = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const storageKey = `${req.user.userId}:openai_api_key`;
      const data = this.secureStore.get(storageKey);
      
      res.json({
        hasValidKey: !!data && (!data.expires || data.expires > new Date())
      });
    } catch (error) {
      logger.error('Error checking API key status:', error);
      res.status(500).json({ error: 'Failed to check API key status' });
    }
  };
}

export default new SettingsController();