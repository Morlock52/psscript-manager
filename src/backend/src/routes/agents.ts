import express from 'express';
import { agentController } from '../controllers/Agentic/AgentController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Agents
 *   description: Agentic AI assistant operations
 */

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: Create a new agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the agent
 *               description:
 *                 type: string
 *                 description: Description of the agent's capabilities
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               model:
 *                 type: string
 *                 description: The LLM model to use for this agent
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticateJWT, agentController.createAgent.bind(agentController));

/**
 * @swagger
 * /api/agents/threads:
 *   post:
 *     summary: Create a new thread for an agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: ID of the agent to create a thread for
 *               message:
 *                 type: string
 *                 description: Optional initial message to start the thread
 *     responses:
 *       201:
 *         description: Thread created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post('/threads', authenticateJWT, agentController.createThread.bind(agentController));

/**
 * @swagger
 * /api/agents/threads/{threadId}:
 *   get:
 *     summary: Get a thread by ID
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thread retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId', authenticateJWT, agentController.getThread.bind(agentController));

/**
 * @swagger
 * /api/agents/threads/{threadId}/messages:
 *   get:
 *     summary: Get all messages for a thread
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId/messages', authenticateJWT, agentController.getThreadMessages.bind(agentController));

/**
 * @swagger
 * /api/agents/threads/{threadId}/messages:
 *   post:
 *     summary: Add a message to a thread
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
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
 *                 description: Message content
 *               role:
 *                 type: string
 *                 description: Message role (user or system)
 *                 enum: [user, system]
 *                 default: user
 *     responses:
 *       201:
 *         description: Message added successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Server error
 */
router.post('/threads/:threadId/messages', authenticateJWT, agentController.addMessage.bind(agentController));

/**
 * @swagger
 * /api/agents/threads/{threadId}/runs:
 *   post:
 *     summary: Create a run to process a thread
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Run created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Thread or agent not found
 *       500:
 *         description: Server error
 */
router.post('/threads/:threadId/runs', authenticateJWT, agentController.createRun.bind(agentController));

/**
 * @swagger
 * /api/agents/runs/{runId}:
 *   get:
 *     summary: Get a run by ID
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Run retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Run not found
 *       500:
 *         description: Server error
 */
router.get('/runs/:runId', authenticateJWT, agentController.getRun.bind(agentController));

export default router;
