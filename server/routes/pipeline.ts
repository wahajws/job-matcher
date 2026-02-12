import { Router } from 'express';
import { pipelineController } from '../controllers/pipelineController.js';
import {
  authenticateToken,
  requireCompany,
  requireAnyRole,
} from '../middleware/auth.js';

const router = Router();

// ========== COMPANY — Pipeline Stages ==========
router.get('/stages', authenticateToken, requireAnyRole('company', 'admin'), (req, res) =>
  pipelineController.getStages(req, res)
);
router.post('/stages', authenticateToken, requireCompany, (req, res) =>
  pipelineController.createStage(req, res)
);
router.put('/stages/:id', authenticateToken, requireCompany, (req, res) =>
  pipelineController.updateStage(req, res)
);
router.delete('/stages/:id', authenticateToken, requireCompany, (req, res) =>
  pipelineController.deleteStage(req, res)
);
router.put('/stages/reorder', authenticateToken, requireCompany, (req, res) =>
  pipelineController.reorderStages(req, res)
);

// ========== COMPANY — Job Pipeline (Kanban) ==========
router.get('/job/:jobId', authenticateToken, requireAnyRole('company', 'admin'), (req, res) =>
  pipelineController.getJobPipeline(req, res)
);

// ========== COMPANY — Move application in pipeline ==========
router.patch('/applications/:id/move', authenticateToken, requireAnyRole('company', 'admin'), (req, res) =>
  pipelineController.moveApplication(req, res)
);

// ========== Application History ==========
router.get('/applications/:id/history', authenticateToken, requireAnyRole('company', 'admin'), (req, res) =>
  pipelineController.getApplicationHistory(req, res)
);

export default router;
