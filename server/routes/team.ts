import { Router } from 'express';
import { teamController } from '../controllers/teamController.js';
import { authenticateToken, requireCompany } from '../middleware/auth.js';

const router = Router();

// All routes require company auth
router.use(authenticateToken, requireCompany);

router.get('/', (req, res) => teamController.listMembers(req as any, res));
router.post('/invite', (req, res) => teamController.invite(req as any, res));
router.patch('/:id/role', (req, res) => teamController.updateRole(req as any, res));
router.delete('/:id', (req, res) => teamController.removeMember(req as any, res));

export default router;
