import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';

const router = Router();

router.get('/stats', (req, res) => dashboardController.getStats(req, res));
router.get('/recent-uploads', (req, res) => dashboardController.getRecentUploads(req, res));
router.get('/recent-jobs', (req, res) => dashboardController.getRecentJobs(req, res));

export default router;
