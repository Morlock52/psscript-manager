/**
 * AI Agent Routes (Legacy)
 * Routes that redirect to the main ai-agent controller
 */
import express from 'express';
import AiAgentController from '../controllers/AiAgentController';
import { corsMiddleware } from '../middleware/corsMiddleware';

const router = express.Router();

// Apply CORS middleware
router.use(corsMiddleware);

/**
 * @swagger
 * /api/aiagent/please:
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
 * /api/aiagent/analyze:
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
 * @swagger
 * /api/aiagent/generate:
 *   post:
 *     summary: Generate a PowerShell script
 *     description: Uses AI to generate a PowerShell script based on a description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Description of the script to generate
 *     responses:
 *       200:
 *         description: Successfully generated script
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/generate', AiAgentController.generateScript);

/**
 * @swagger
 * /api/aiagent/explain:
 *   post:
 *     summary: Explain a PowerShell script or command
 *     description: Uses AI to explain PowerShell code
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
 *                 description: The code to explain
 *               type:
 *                 type: string
 *                 enum: [simple, detailed, security]
 *                 description: Type of explanation
 *     responses:
 *       200:
 *         description: Successfully explained the code
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/explain', AiAgentController.explainScript);

/**
 * @swagger
 * /api/aiagent/examples:
 *   get:
 *     summary: Get examples of similar scripts
 *     description: Retrieves examples of PowerShell scripts similar to a description
 *     parameters:
 *       - in: query
 *         name: description
 *         required: true
 *         schema:
 *           type: string
 *         description: Description of the script functionality
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Maximum number of examples to return
 *     responses:
 *       200:
 *         description: Successfully retrieved examples
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/examples', AiAgentController.getSimilarExamples);

export default router;
