import express from 'express';
import { assistantsController } from '../controllers/agentic/AssistantsController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Assistants
 *   description: OpenAI-compatible Assistants API endpoints
 */

/**
 * @swagger
 * /api/assistants:
 *   post:
 *     summary: Create an assistant
 *     tags: [Assistants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model
 *             properties:
 *               model:
 *                 type: string
 *                 description: The model to use for the assistant
 *               name:
 *                 type: string
 *                 description: The name of the assistant
 *               description:
 *                 type: string
 *                 description: The description of the assistant
 *               instructions:
 *                 type: string
 *                 description: The system instructions for the assistant
 *               tools:
 *                 type: array
 *                 description: Tools enabled for the assistant
 *               metadata:
 *                 type: object
 *                 description: Metadata for the assistant
 *     responses:
 *       201:
 *         description: Assistant created successfully
 *       500:
 *         description: Server error
 */
router.post('/', assistantsController.createAssistant.bind(assistantsController));

/**
 * @swagger
 * /api/assistants/{assistantId}:
 *   get:
 *     summary: Retrieve an assistant
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: assistantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assistant retrieved successfully
 *       404:
 *         description: Assistant not found
 *       500:
 *         description: Server error
 */
router.get('/:assistantId', assistantsController.retrieveAssistant.bind(assistantsController));

/**
 * @swagger
 * /api/assistants/{assistantId}:
 *   put:
 *     summary: Update an assistant
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: assistantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               tools:
 *                 type: array
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Assistant updated successfully
 *       404:
 *         description: Assistant not found
 *       500:
 *         description: Server error
 */
router.put('/:assistantId', assistantsController.updateAssistant.bind(assistantsController));

/**
 * @swagger
 * /api/assistants/{assistantId}:
 *   delete:
 *     summary: Delete an assistant
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: assistantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Assistant deleted successfully
 *       404:
 *         description: Assistant not found
 *       500:
 *         description: Server error
 */
router.delete('/:assistantId', assistantsController.deleteAssistant.bind(assistantsController));

/**
 * @swagger
 * /api/assistants:
 *   get:
 *     summary: List assistants
 *     tags: [Assistants]
 *     responses:
 *       200:
 *         description: List of assistants
 *       500:
 *         description: Server error
 */
router.get('/', assistantsController.listAssistants.bind(assistantsController));

// Thread routes

/**
 * @swagger
 * /api/threads:
 *   post:
 *     summary: Create a thread
 *     tags: [Assistants]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metadata:
 *                 type: object
 *                 description: Metadata for the thread
 *     responses:
 *       201:
 *         description: Thread created successfully
 *       500:
 *         description: Server error
 */
router.post('/threads', assistantsController.createThread.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}:
 *   get:
 *     summary: Retrieve a thread
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thread retrieved successfully
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId', assistantsController.retrieveThread.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}:
 *   put:
 *     summary: Update a thread
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Thread updated successfully
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Server error
 */
router.put('/threads/:threadId', assistantsController.updateThread.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}:
 *   delete:
 *     summary: Delete a thread
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Thread deleted successfully
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Server error
 */
router.delete('/threads/:threadId', assistantsController.deleteThread.bind(assistantsController));

// Message routes

/**
 * @swagger
 * /api/threads/{threadId}/messages:
 *   post:
 *     summary: Create a message
 *     tags: [Assistants]
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
 *               - role
 *               - content
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, assistant, system]
 *               content:
 *                 type: string
 *               file_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message created successfully
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Server error
 */
router.post('/threads/:threadId/messages', assistantsController.createMessage.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}/messages/{messageId}:
 *   get:
 *     summary: Retrieve a message
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId/messages/:messageId', assistantsController.retrieveMessage.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}/messages:
 *   get:
 *     summary: List messages
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId/messages', assistantsController.listMessages.bind(assistantsController));

// Run routes

/**
 * @swagger
 * /api/threads/{threadId}/runs:
 *   post:
 *     summary: Create a run
 *     tags: [Assistants]
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
 *               - assistant_id
 *             properties:
 *               assistant_id:
 *                 type: string
 *               model:
 *                 type: string
 *               instructions:
 *                 type: string
 *               tools:
 *                 type: array
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Run created successfully
 *       404:
 *         description: Thread or assistant not found
 *       500:
 *         description: Server error
 */
router.post('/threads/:threadId/runs', assistantsController.createRun.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}/runs/{runId}:
 *   get:
 *     summary: Retrieve a run
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Run retrieved successfully
 *       404:
 *         description: Run not found
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId/runs/:runId', assistantsController.retrieveRun.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}/runs:
 *   get:
 *     summary: List runs
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of runs
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId/runs', assistantsController.listRuns.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}/runs/{runId}/cancel:
 *   post:
 *     summary: Cancel a run
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Run cancelled successfully
 *       404:
 *         description: Run not found
 *       500:
 *         description: Server error
 */
router.post('/threads/:threadId/runs/:runId/cancel', assistantsController.cancelRun.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}/runs/{runId}/submit_tool_outputs:
 *   post:
 *     summary: Submit tool outputs for a run
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: runId
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
 *               - tool_outputs
 *             properties:
 *               tool_outputs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - tool_call_id
 *                     - output
 *                   properties:
 *                     tool_call_id:
 *                       type: string
 *                     output:
 *                       type: string
 *     responses:
 *       200:
 *         description: Tool outputs submitted successfully
 *       404:
 *         description: Run not found
 *       500:
 *         description: Server error
 */
router.post('/threads/:threadId/runs/:runId/submit_tool_outputs', assistantsController.submitToolOutputs.bind(assistantsController));

/**
 * @swagger
 * /api/threads/{threadId}/runs/{runId}/steps:
 *   get:
 *     summary: List run steps
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of run steps
 *       500:
 *         description: Server error
 */
router.get('/threads/:threadId/runs/:runId/steps', assistantsController.listRunSteps.bind(assistantsController));

export default router;
