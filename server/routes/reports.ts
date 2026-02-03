import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';

const router = Router();

// Generate report for a job
router.post('/jobs/:id/generate-report', (req, res) => {
  reportController.generateReport(req, res);
});

// Get report for a job
router.get('/jobs/:id/report', (req, res) => {
  reportController.getReport(req, res);
});

// Delete report for a job
router.delete('/jobs/:id/report', (req, res) => {
  reportController.deleteReport(req, res);
});

export default router;
