import { Router } from 'express';
import { cvController } from '../controllers/cvController.js';

const router = Router();

router.post('/process/:cvFileId', (req, res) => cvController.process(req, res));
router.get('/status/:cvFileId', (req, res) => cvController.getStatus(req, res));
router.get('/:cvFileId/download', (req, res) => cvController.download(req, res));

export default router;
