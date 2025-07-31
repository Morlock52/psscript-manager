import express from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import EnhancedAuthController from '../controllers/EnhancedAuthController';
import { authenticateJWT } from '../middleware/auth';
import { validateLogin, validateRegister } from '../middleware/validators/authValidators';

const router = express.Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many requests',
    message: 'Too many password reset requests, please try again later.'
  }
});

// Traditional authentication routes
router.post('/login', loginLimiter, validateLogin, EnhancedAuthController.login);
router.post('/refresh-token', EnhancedAuthController.refreshToken);

// MFA routes
router.post('/mfa/setup', authenticateJWT, EnhancedAuthController.setupMFA);
router.post('/mfa/verify', authenticateJWT, EnhancedAuthController.verifyMFA);
router.post('/mfa/disable', authenticateJWT, EnhancedAuthController.disableMFA);

// Password reset routes
router.post('/forgot-password', passwordResetLimiter, EnhancedAuthController.forgotPassword);
router.post('/reset-password', EnhancedAuthController.resetPassword);

// Session management routes
router.get('/sessions', authenticateJWT, EnhancedAuthController.getSessions);
router.delete('/sessions/:sessionId', authenticateJWT, EnhancedAuthController.revokeSession);

// OAuth routes - Google
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as any;
      const controller = new EnhancedAuthController();
      const tokens = await (EnhancedAuthController as any).generateTokenPair(user);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${tokens.accessToken}&` +
        `refreshToken=${tokens.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

// OAuth routes - GitHub
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as any;
      const controller = new EnhancedAuthController();
      const tokens = await (EnhancedAuthController as any).generateTokenPair(user);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${tokens.accessToken}&` +
        `refreshToken=${tokens.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

// OAuth routes - Microsoft
router.get('/microsoft',
  passport.authenticate('microsoft', { 
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as any;
      const controller = new EnhancedAuthController();
      const tokens = await (EnhancedAuthController as any).generateTokenPair(user);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${tokens.accessToken}&` +
        `refreshToken=${tokens.refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     MFASetupResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         secret:
 *           type: string
 *           description: Base32 encoded secret
 *         qrCode:
 *           type: string
 *           description: QR code data URL
 *         manualEntryKey:
 *           type: string
 *           description: Manual entry key for authenticator apps
 *     
 *     MFAVerifyRequest:
 *       type: object
 *       required:
 *         - token
 *         - secret
 *       properties:
 *         token:
 *           type: string
 *           description: 6-digit TOTP token
 *         secret:
 *           type: string
 *           description: Base32 encoded secret from setup
 *     
 *     SessionInfo:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *         userId:
 *           type: number
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         lastActivity:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/auth/mfa/setup:
 *   post:
 *     summary: Setup MFA for authenticated user
 *     tags: [Authentication - MFA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA setup initiated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MFASetupResponse'
 *       400:
 *         description: MFA already enabled
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /api/auth/mfa/verify:
 *   post:
 *     summary: Verify and enable MFA
 *     tags: [Authentication - MFA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MFAVerifyRequest'
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 backupCodes:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid token or missing parameters
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get all active sessions for authenticated user
 *     tags: [Authentication - Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SessionInfo'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /api/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Authentication - Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Not authenticated
 */

export default router;