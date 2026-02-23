import { Router } from 'express';
import express from 'express';
import { coverLetterController } from '../controllers/coverLetterController.js';
import { authenticateToken, requireCandidate } from '../middleware/auth.js';

const router = Router();

// All routes require candidate auth
router.use(authenticateToken, requireCandidate);

// List all my cover letters
router.get('/', (req, res) => coverLetterController.listMine(req as any, res));

// Get cover letter for a specific job
router.get('/job/:jobId', (req, res) => coverLetterController.getForJob(req as any, res));

// Save (create or update) a cover letter
router.post('/', express.json(), (req, res) => coverLetterController.save(req as any, res));

// Update a specific cover letter by ID
router.put('/:id', express.json(), (req, res) => coverLetterController.update(req as any, res));

// Delete a cover letter
router.delete('/:id', (req, res) => coverLetterController.remove(req as any, res));

export default router;
