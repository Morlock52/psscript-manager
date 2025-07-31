import { Router } from 'express';
import AIController from '../controllers/AIController';

const router = Router();

// Documentation generation
router.post('/scripts/:id/documentation', AIController.generateDocumentation);

// Refactoring suggestions
router.get('/scripts/:id/refactor', AIController.getRefactoringSuggestions);

// Natural language to PowerShell
router.post('/nl-to-script', AIController.convertNLToScript);

// Enhanced categorization
router.get('/scripts/:id/categorize', AIController.categorizeWithConfidence);

// Security scanning
router.get('/scripts/:id/security-scan', AIController.scanSecurity);

// Code review
router.get('/scripts/:id/review', AIController.reviewCode);

// Test generation
router.post('/scripts/:id/generate-tests', AIController.generateTests);

// Error explanation
router.post('/explain-error', AIController.explainError);

// Similar scripts with explanations
router.get('/scripts/:id/similar-enhanced', AIController.getSimilarScriptsEnhanced);

// Performance prediction
router.get('/scripts/:id/predict-performance', AIController.predictPerformance);

// Smart merge scripts
router.post('/scripts/merge', AIController.mergeScripts);

// Generate from template
router.post('/scripts/generate-template', AIController.generateFromTemplate);

// Convert to other languages
router.post('/scripts/:id/convert-language', AIController.convertToLanguage);

// Optimize script
router.post('/scripts/:id/optimize', AIController.optimizeScript);

// Dependency analysis
router.get('/scripts/:id/dependencies', AIController.analyzeDependencies);

// Generate PowerShell module
router.post('/scripts/generate-module', AIController.generateModule);

// AI chat assistant
router.post('/chat', AIController.chatAssistant);

// Execution prediction
router.post('/scripts/:id/predict-execution', AIController.predictExecution);

// Code smell detection
router.get('/scripts/:id/code-smells', AIController.detectCodeSmells);

// Generate changelog
router.get('/scripts/:id/changelog', AIController.generateChangelog);

export default router;