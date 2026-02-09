import { Router, Request, Response } from 'express';
import { Candidate, CvFile, CandidateMatrix, Job, JobMatrix } from '../db/models/index.js';
import { qwenService } from '../services/qwen.js';
import { randomUUID } from 'crypto';

const router = Router();

// In-memory progress tracking
interface BulkJobStatus {
  id: string;
  type: 'regenerate-matrices' | 'rerun-matching' | 'regenerate-and-match';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: { candidateId: string; name: string; error: string }[];
  startedAt: Date;
  completedAt?: Date;
  currentCandidate?: string;
}

const bulkJobs = new Map<string, BulkJobStatus>();

// GET /api/bulk-operations/status/:id
router.get('/status/:id', (req: Request, res: Response) => {
  const job = bulkJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ message: 'Bulk job not found' });
  }
  res.json(job);
});

// GET /api/bulk-operations/status - get all recent jobs
router.get('/status', (_req: Request, res: Response) => {
  const jobs = Array.from(bulkJobs.values())
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 10);
  res.json(jobs);
});

// POST /api/bulk-operations/cancel/:id
router.post('/cancel/:id', (req: Request, res: Response) => {
  const job = bulkJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ message: 'Bulk job not found' });
  }
  if (job.status === 'running') {
    job.status = 'cancelled';
    job.completedAt = new Date();
  }
  res.json(job);
});

// GET /api/bulk-operations/candidates-summary
router.get('/candidates-summary', async (_req: Request, res: Response) => {
  try {
    const totalCandidates = await Candidate.count();
    const withMatrix = await CandidateMatrix.count({
      distinct: true,
      col: 'candidate_id',
    });
    const withCvText = await CvFile.count({
      where: {
        raw_text: { [require('sequelize').Op.not]: null },
      },
    });
    const totalJobs = await Job.count({ where: { status: 'published' } });
    const jobsWithMatrix = await JobMatrix.count({
      distinct: true,
      col: 'job_id',
    });

    res.json({
      totalCandidates,
      withMatrix,
      withoutMatrix: totalCandidates - withMatrix,
      withCvText,
      totalJobs,
      jobsWithMatrix,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/bulk-operations/regenerate-matrices
router.post('/regenerate-matrices', async (req: Request, res: Response) => {
  const { candidateIds, onlyMissing } = req.body;
  
  const jobId = randomUUID();
  const job: BulkJobStatus = {
    id: jobId,
    type: 'regenerate-matrices',
    status: 'running',
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startedAt: new Date(),
  };
  bulkJobs.set(jobId, job);
  
  // Start processing in background
  processRegenerateMatrices(job, candidateIds, onlyMissing).catch(err => {
    console.error('[BulkOps] Fatal error:', err);
    job.status = 'failed';
    job.completedAt = new Date();
  });
  
  res.json({ jobId, message: 'Bulk matrix regeneration started' });
});

// POST /api/bulk-operations/rerun-matching
router.post('/rerun-matching', async (req: Request, res: Response) => {
  const { candidateIds } = req.body;
  
  const jobId = randomUUID();
  const job: BulkJobStatus = {
    id: jobId,
    type: 'rerun-matching',
    status: 'running',
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startedAt: new Date(),
  };
  bulkJobs.set(jobId, job);
  
  processRerunMatching(job, candidateIds).catch(err => {
    console.error('[BulkOps] Fatal error:', err);
    job.status = 'failed';
    job.completedAt = new Date();
  });
  
  res.json({ jobId, message: 'Bulk matching started' });
});

// POST /api/bulk-operations/regenerate-and-match
router.post('/regenerate-and-match', async (req: Request, res: Response) => {
  const { candidateIds, onlyMissing } = req.body;
  
  const jobId = randomUUID();
  const job: BulkJobStatus = {
    id: jobId,
    type: 'regenerate-and-match',
    status: 'running',
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startedAt: new Date(),
  };
  bulkJobs.set(jobId, job);
  
  processRegenerateAndMatch(job, candidateIds, onlyMissing).catch(err => {
    console.error('[BulkOps] Fatal error:', err);
    job.status = 'failed';
    job.completedAt = new Date();
  });
  
  res.json({ jobId, message: 'Bulk regenerate + match started' });
});

// ===== Background processors =====

async function processRegenerateMatrices(
  job: BulkJobStatus,
  candidateIds?: string[],
  onlyMissing?: boolean
) {
  try {
    let candidates: any[];
    
    if (candidateIds && candidateIds.length > 0) {
      candidates = await Candidate.findAll({
        where: { id: candidateIds },
        include: [
          { model: CvFile, as: 'cvFiles', required: false },
          { model: CandidateMatrix, as: 'matrices', required: false },
        ],
      });
    } else {
      candidates = await Candidate.findAll({
        include: [
          { model: CvFile, as: 'cvFiles', required: false },
          { model: CandidateMatrix, as: 'matrices', required: false },
        ],
      });
    }
    
    // Filter to only those with CV text
    candidates = candidates.filter((c: any) => {
      const cvFile = c.cvFiles?.[0];
      if (!cvFile?.raw_text) return false;
      if (onlyMissing && c.matrices?.length > 0) return false;
      return true;
    });
    
    job.total = candidates.length;
    console.log(`[BulkOps] Starting matrix regeneration for ${job.total} candidates`);
    
    for (const candidate of candidates) {
      if (job.status === 'cancelled') break;
      
      job.currentCandidate = candidate.name;
      
      try {
        const cvFile = candidate.cvFiles?.[0];
        const cvText = cvFile.raw_text;
        
        console.log(`[BulkOps] [${job.processed + 1}/${job.total}] Regenerating matrix for: ${candidate.name}`);
        
        const newMatrix = await qwenService.generateCandidateMatrix(cvText);
        
        // Check if matrix exists
        const existingMatrix = candidate.matrices?.[0];
        if (existingMatrix) {
          await existingMatrix.update({
            skills: newMatrix.skills || [],
            roles: newMatrix.roles || [],
            total_years_experience: newMatrix.totalYearsExperience || 0,
            domains: newMatrix.domains || [],
            education: newMatrix.education || [],
            languages: newMatrix.languages || [],
            location_signals: newMatrix.locationSignals || {},
            evidence: newMatrix.evidence || [],
            confidence: newMatrix.confidence || 0,
            generated_at: new Date(),
          });
        } else {
          await CandidateMatrix.create({
            id: randomUUID(),
            candidate_id: candidate.id,
            skills: newMatrix.skills || [],
            roles: newMatrix.roles || [],
            total_years_experience: newMatrix.totalYearsExperience || 0,
            domains: newMatrix.domains || [],
            education: newMatrix.education || [],
            languages: newMatrix.languages || [],
            location_signals: newMatrix.locationSignals || {},
            evidence: newMatrix.evidence || [],
            confidence: newMatrix.confidence || 0,
          });
        }
        
        job.succeeded++;
        console.log(`[BulkOps] ✓ Matrix regenerated for: ${candidate.name} (${newMatrix.skills?.length || 0} skills)`);
      } catch (err: any) {
        job.failed++;
        job.errors.push({
          candidateId: candidate.id,
          name: candidate.name,
          error: err.message,
        });
        console.error(`[BulkOps] ✗ Failed for ${candidate.name}:`, err.message);
      }
      
      job.processed++;
    }
    
    job.status = job.status === 'cancelled' ? 'cancelled' : 'completed';
    job.completedAt = new Date();
    job.currentCandidate = undefined;
    console.log(`[BulkOps] Matrix regeneration complete: ${job.succeeded} succeeded, ${job.failed} failed`);
  } catch (err: any) {
    job.status = 'failed';
    job.completedAt = new Date();
    console.error('[BulkOps] Fatal error in processRegenerateMatrices:', err);
  }
}

async function processRerunMatching(
  job: BulkJobStatus,
  candidateIds?: string[]
) {
  try {
    const { matchController } = await import('../controllers/matchController.js');
    
    let candidates: any[];
    
    if (candidateIds && candidateIds.length > 0) {
      candidates = await Candidate.findAll({
        where: { id: candidateIds },
        include: [
          { model: CandidateMatrix, as: 'matrices', required: true },
        ],
      });
    } else {
      candidates = await Candidate.findAll({
        include: [
          { model: CandidateMatrix, as: 'matrices', required: true },
        ],
      });
    }
    
    // Get all published jobs with matrices
    const jobs = await Job.findAll({
      where: { status: 'published' },
      include: [{ model: JobMatrix, as: 'matrix', required: true }],
    });
    
    job.total = candidates.length;
    console.log(`[BulkOps] Starting matching for ${job.total} candidates against ${jobs.length} jobs`);
    
    for (const candidate of candidates) {
      if (job.status === 'cancelled') break;
      
      job.currentCandidate = candidate.name;
      
      try {
        console.log(`[BulkOps] [${job.processed + 1}/${job.total}] Matching: ${candidate.name} against ${jobs.length} jobs`);
        
        for (const jobItem of jobs) {
          if (job.status === 'cancelled') break;
          await matchController.calculateMatchForCandidateAndJob(candidate.id, jobItem.id);
        }
        
        job.succeeded++;
        console.log(`[BulkOps] ✓ Matching complete for: ${candidate.name}`);
      } catch (err: any) {
        job.failed++;
        job.errors.push({
          candidateId: candidate.id,
          name: candidate.name,
          error: err.message,
        });
        console.error(`[BulkOps] ✗ Matching failed for ${candidate.name}:`, err.message);
      }
      
      job.processed++;
    }
    
    job.status = job.status === 'cancelled' ? 'cancelled' : 'completed';
    job.completedAt = new Date();
    job.currentCandidate = undefined;
    console.log(`[BulkOps] Matching complete: ${job.succeeded} succeeded, ${job.failed} failed`);
  } catch (err: any) {
    job.status = 'failed';
    job.completedAt = new Date();
    console.error('[BulkOps] Fatal error in processRerunMatching:', err);
  }
}

async function processRegenerateAndMatch(
  job: BulkJobStatus,
  candidateIds?: string[],
  onlyMissing?: boolean
) {
  try {
    const { matchController } = await import('../controllers/matchController.js');
    
    let candidates: any[];
    
    if (candidateIds && candidateIds.length > 0) {
      candidates = await Candidate.findAll({
        where: { id: candidateIds },
        include: [
          { model: CvFile, as: 'cvFiles', required: false },
          { model: CandidateMatrix, as: 'matrices', required: false },
        ],
      });
    } else {
      candidates = await Candidate.findAll({
        include: [
          { model: CvFile, as: 'cvFiles', required: false },
          { model: CandidateMatrix, as: 'matrices', required: false },
        ],
      });
    }
    
    // Filter to those with CV text
    candidates = candidates.filter((c: any) => {
      const cvFile = c.cvFiles?.[0];
      if (!cvFile?.raw_text) return false;
      if (onlyMissing && c.matrices?.length > 0) return false;
      return true;
    });
    
    // Get all published jobs with matrices
    const jobs = await Job.findAll({
      where: { status: 'published' },
      include: [{ model: JobMatrix, as: 'matrix', required: true }],
    });
    
    job.total = candidates.length;
    console.log(`[BulkOps] Starting regenerate+match for ${job.total} candidates against ${jobs.length} jobs`);
    
    for (const candidate of candidates) {
      if (job.status === 'cancelled') break;
      
      job.currentCandidate = candidate.name;
      
      try {
        const cvFile = candidate.cvFiles?.[0];
        const cvText = cvFile.raw_text;
        
        console.log(`[BulkOps] [${job.processed + 1}/${job.total}] Regenerate+Match: ${candidate.name}`);
        
        // Step 1: Regenerate matrix
        const newMatrix = await qwenService.generateCandidateMatrix(cvText);
        
        const existingMatrix = candidate.matrices?.[0];
        if (existingMatrix) {
          await existingMatrix.update({
            skills: newMatrix.skills || [],
            roles: newMatrix.roles || [],
            total_years_experience: newMatrix.totalYearsExperience || 0,
            domains: newMatrix.domains || [],
            education: newMatrix.education || [],
            languages: newMatrix.languages || [],
            location_signals: newMatrix.locationSignals || {},
            evidence: newMatrix.evidence || [],
            confidence: newMatrix.confidence || 0,
            generated_at: new Date(),
          });
        } else {
          await CandidateMatrix.create({
            id: randomUUID(),
            candidate_id: candidate.id,
            skills: newMatrix.skills || [],
            roles: newMatrix.roles || [],
            total_years_experience: newMatrix.totalYearsExperience || 0,
            domains: newMatrix.domains || [],
            education: newMatrix.education || [],
            languages: newMatrix.languages || [],
            location_signals: newMatrix.locationSignals || {},
            evidence: newMatrix.evidence || [],
            confidence: newMatrix.confidence || 0,
          });
        }
        
        // Step 2: Run matching against all jobs
        for (const jobItem of jobs) {
          if (job.status === 'cancelled') break;
          await matchController.calculateMatchForCandidateAndJob(candidate.id, jobItem.id);
        }
        
        job.succeeded++;
        console.log(`[BulkOps] ✓ Complete for: ${candidate.name}`);
      } catch (err: any) {
        job.failed++;
        job.errors.push({
          candidateId: candidate.id,
          name: candidate.name,
          error: err.message,
        });
        console.error(`[BulkOps] ✗ Failed for ${candidate.name}:`, err.message);
      }
      
      job.processed++;
    }
    
    job.status = job.status === 'cancelled' ? 'cancelled' : 'completed';
    job.completedAt = new Date();
    job.currentCandidate = undefined;
    console.log(`[BulkOps] Regenerate+Match complete: ${job.succeeded} succeeded, ${job.failed} failed`);
  } catch (err: any) {
    job.status = 'failed';
    job.completedAt = new Date();
    console.error('[BulkOps] Fatal error in processRegenerateAndMatch:', err);
  }
}

export default router;
