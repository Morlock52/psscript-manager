import { Router } from 'express';
import settingsController from '../controllers/SettingsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Get AI service status
router.get('/ai-status', settingsController.getAIServiceStatus);

// Toggle AI mode
router.post('/ai-mode', settingsController.toggleAIMode);

// Save OpenAI API key (optional)
router.post('/openai-key', settingsController.saveOpenAIKey);

// Secure storage endpoints (require authentication)
router.post('/secure-store', authenticateJWT, settingsController.storeSecureData);
router.get('/secure-store/:key', authenticateJWT, settingsController.getSecureData);
router.delete('/secure-store/:key', authenticateJWT, settingsController.deleteSecureData);
router.get('/api-key-status', authenticateJWT, settingsController.getApiKeyStatus);

export default router;