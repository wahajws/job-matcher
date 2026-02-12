import { Router } from 'express';
import { savedJobController } from '../controllers/savedJobController.js';
import { authenticateToken, requireCandidate } from '../middleware/auth.js';

const router = Router();

// GET /api/saved-jobs — list saved jobs
router.get('/', authenticateToken, requireCandidate, (req, res) =>
  savedJobController.getSavedJobs(req, res)
);

// POST /api/saved-jobs — save a job
router.post('/', authenticateToken, requireCandidate, (req, res) =>
  savedJobController.saveJob(req, res)
);

// DELETE /api/saved-jobs/:jobId — unsave a job
router.delete('/:jobId', authenticateToken, requireCandidate, (req, res) =>
  savedJobController.unsaveJob(req, res)
);

// GET /api/saved-jobs/:jobId/check — check if job is saved
router.get('/:jobId/check', authenticateToken, requireCandidate, (req, res) =>
  savedJobController.isJobSaved(req, res)
);

export default router;
