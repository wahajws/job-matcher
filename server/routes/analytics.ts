import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticateToken, requireCompany, requireCandidate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/analytics/company — company analytics
router.get('/company', authenticateToken, requireCompany, (req, res) =>
  analyticsController.getCompanyAnalytics(req, res)
);

// GET /api/analytics/candidate — candidate analytics
router.get('/candidate', authenticateToken, requireCandidate, (req, res) =>
  analyticsController.getCandidateAnalytics(req, res)
);

// GET /api/analytics/admin — admin analytics
router.get('/admin', authenticateToken, requireAdmin, (req, res) =>
  analyticsController.getAdminAnalytics(req, res)
);

export default router;
