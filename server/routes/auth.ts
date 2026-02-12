import { Router } from 'express';
import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { validateBody, registerSchema, loginSchema } from '../middleware/validate.js';

const router = Router();

router.post('/register', registerLimiter, express.json(), validateBody(registerSchema), (req, res) => authController.register(req, res));
router.post('/login', loginLimiter, express.json(), validateBody(loginSchema), (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req as any, res));
router.get('/me', authenticateToken, (req, res) => authController.me(req as any, res));

export default router;
