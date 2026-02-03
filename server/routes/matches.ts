import { Router } from 'express';
import { matchController } from '../controllers/matchController.js';

const router = Router();

router.get('/job/:jobId', (req, res) => matchController.getForJob(req, res));
router.get('/candidate/:candidateId', (req, res) => matchController.getForCandidate(req, res));
router.post('/job/:jobId/calculate', (req, res) => matchController.calculate(req, res));
router.post('/:matchId/shortlist', (req, res) => matchController.shortlist(req, res));
router.post('/:matchId/reject', (req, res) => matchController.reject(req, res));

export default router;
