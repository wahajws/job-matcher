import { Router } from 'express';
import { noteController } from '../controllers/noteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/:candidateId/notes', (req, res) => noteController.list(req, res));
router.post('/:candidateId/notes', authenticateToken, (req, res) => noteController.create(req as any, res));

export default router;
