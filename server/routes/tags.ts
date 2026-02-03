import { Router } from 'express';
import { tagController } from '../controllers/tagController.js';

const router = Router();

router.get('/:candidateId/tags', (req, res) => tagController.list(req, res));
router.post('/:candidateId/tags', (req, res) => tagController.create(req, res));
router.delete('/:candidateId/tags/:tagId', (req, res) => tagController.delete(req, res));

export default router;
