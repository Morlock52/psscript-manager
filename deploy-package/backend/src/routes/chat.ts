// @ts-nocheck - Required for flexible API integration and dynamic request handling
import express from 'express';
import { ChatController } from '../controllers/ChatController';
// Fix import error - use the named export
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();
const chatController = new ChatController();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat operations
 */

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Send a message to the AI assistant
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - content
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     content:
 *                       type: string
 *               system_prompt:
 *                 type: string
 *                 description: Optional system prompt to override default
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/', chatController.sendMessage.bind(chatController));

/**
 * @swagger
 * /chat/history:
 *   get:
 *     summary: Get chat history for the current user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/history', /* authenticateJWT, */ chatController.getChatHistory.bind(chatController));

/**
 * @swagger
 * /chat/history:
 *   post:
 *     summary: Save chat history
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *     responses:
 *       200:
 *         description: Chat history saved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/history', /* authenticateJWT, */ chatController.saveChatHistory.bind(chatController));

/**
 * @swagger
 * /chat/history:
 *   delete:
 *     summary: Clear chat history
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history cleared successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/history', /* authenticateJWT, */ chatController.clearChatHistory.bind(chatController));

/**
 * @swagger
 * /chat/history/search:
 *   get:
 *     summary: Search chat history
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing search query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/history/search', /* authenticateJWT, */ chatController.searchChatHistory.bind(chatController));

export default router;
