/**
 * AI Routes (Legacy)
 * Routes redirected to ai-agent routes for backwards compatibility
 */
import express from 'express';
import AiAgentController from '../controllers/AiAgentController';
import { corsMiddleware } from '../middleware/corsMiddleware';
import logger from '../utils/logger';

const router = express.Router();

// Apply CORS middleware
router.use(corsMiddleware);

/**
 * @swagger
 * /api/ai/please:
 *   post:
 *     summary: Ask the AI agent a PowerShell-related question
 *     description: Uses the agentic AI assistant to answer PowerShell related questions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 description: The question to ask
 *               context:
 *                 type: string
 *                 description: Optional context (like script content)
 *               useAgent:
 *                 type: boolean
 *                 description: Whether to use the agentic framework
 *     responses:
 *       200:
 *         description: Successfully answered question
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/please', AiAgentController.answerQuestion);

/**
 * @swagger
 * /api/ai/analyze:
 *   post:
 *     summary: Analyze a script using an AI assistant
 *     description: Uses the agentic AI assistant to analyze PowerShell scripts in detail
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: The script content to analyze
 *               filename:
 *                 type: string
 *                 description: Optional filename
 *               requestType:
 *                 type: string
 *                 enum: [standard, detailed]
 *                 description: Analysis detail level
 *               analysisOptions:
 *                 type: object
 *                 properties:
 *                   includeSimilarScripts:
 *                     type: boolean
 *                   includeInternetSearch:
 *                     type: boolean
 *                   maxExamples:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Successfully analyzed script
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/analyze', AiAgentController.analyzeScript);

/**
 * Redirect new endpoints to ai-agent controller for consistency
 */
router.post('/generate', AiAgentController.generateScript);
router.post('/explain', AiAgentController.explainScript);
router.get('/examples', AiAgentController.getSimilarExamples);

export default router;
