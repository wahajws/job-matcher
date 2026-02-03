import { Request, Response } from 'express';
import { Match, Candidate, Job, CandidateMatrix, JobMatrix } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { matchingService } from '../services/matching.js';
import { qwenService } from '../services/qwen.js';
import { randomUUID } from 'crypto';

export class MatchController extends BaseController {
  protected model = Match;

  async getForJob(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { jobId } = req.params;

      const matches = await Match.findAll({
        where: { job_id: jobId },
        include: [{ model: Candidate, as: 'candidate' }],
        order: [['score', 'DESC']],
      });

      // Filter out low-quality matches (score < 30)
      const filteredMatches = matches.filter((m: any) => {
        const score = typeof m.score === 'number' ? m.score : 0;
        return score >= 30; // Only show matches with score >= 30
      });

      return filteredMatches.map((m: any) => ({
        id: m.id,
        candidateId: m.candidate_id,
        jobId: m.job_id,
        score: m.score,
        breakdown: m.breakdown,
        explanation: m.explanation,
        gaps: m.gaps,
        status: m.status,
        calculatedAt: m.calculated_at,
      }));
    });
  }

  async getForCandidate(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { candidateId } = req.params;

      const matches = await Match.findAll({
        where: { candidate_id: candidateId },
        include: [{ model: Job, as: 'job' }],
        order: [['score', 'DESC']],
      });

      return matches.map((m: any) => ({
          id: m.id,
          candidateId: m.candidate_id,
          jobId: m.job_id,
          score: m.score,
          breakdown: m.breakdown,
          explanation: m.explanation,
          gaps: m.gaps,
          status: m.status,
          calculatedAt: m.calculated_at,
          job: m.job
            ? {
                id: m.job.id,
                title: m.job.title,
                department: m.job.department,
                company: m.job.company,
                locationType: m.job.location_type,
                country: m.job.country,
                city: m.job.city,
                description: m.job.description,
                mustHaveSkills: m.job.must_have_skills,
                niceToHaveSkills: m.job.nice_to_have_skills,
                minYearsExperience: m.job.min_years_experience,
                seniorityLevel: m.job.seniority_level,
                status: m.job.status,
                createdAt: m.job.created_at,
              }
            : undefined,
      }));
    });
  }

  async calculate(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Process in background
      this.calculateMatchesAsync(jobId).catch(console.error);

      return { message: 'Match calculation started', jobId };
    });
  }

  async calculateMatchForCandidateAndJob(candidateId: string, jobId: string) {
    try {
      const candidate = await Candidate.findByPk(candidateId, {
        include: [
          {
            model: CandidateMatrix,
            as: 'matrices',
            required: true,
          },
        ],
      });

      const job = await Job.findByPk(jobId, {
        include: [{ model: JobMatrix, as: 'matrix', required: true }],
      });

      if (!candidate || !job) {
        console.error('Candidate or job not found');
        return;
      }

      const candidateMatrix = (candidate as any).matrices?.[0];
      const jobMatrix = (job as any).matrix;

      if (!candidateMatrix || !jobMatrix) {
        console.error('Candidate or job matrix not found');
        return;
      }

      // STRICT FILTERING: Check if candidate should be considered at all
      const shouldConsider = matchingService.shouldConsiderCandidate(
        candidateMatrix,
        jobMatrix,
        candidateMatrix.total_years_experience,
        (job as any).min_years_experience,
        (job as any).seniority_level as 'junior' | 'mid' | 'senior' | 'lead' | 'principal',
        candidate.headline, // candidate headline (e.g., "Data Analyst Intern")
        candidateMatrix.roles // candidate roles array
      );
      
      if (!shouldConsider) {
        // Candidate doesn't meet basic requirements - don't create match
        console.log(`[MatchController] Skipping candidate ${candidateId} for job ${jobId} - doesn't meet basic requirements`);
        return;
      }

      // Calculate score with location matching and experience matching
      const { score, breakdown } = matchingService.calculateMatchScore(
        candidateMatrix,
        jobMatrix,
        candidate.country, // candidate country
        job.country, // job country
        job.location_type as 'onsite' | 'hybrid' | 'remote', // job location type
        (job as any).min_years_experience, // job minimum years experience
        (job as any).seniority_level as 'junior' | 'mid' | 'senior' | 'lead' | 'principal', // job seniority level
        candidate.headline, // candidate headline for intern detection
        candidateMatrix.roles // candidate roles for intern detection
      );
      
      // STRICT: Only create match if score is above minimum threshold (30)
      if (score < 30) {
        console.log(`[MatchController] Skipping candidate ${candidateId} for job ${jobId} - score too low: ${score}`);
        return;
      }

      // Generate explanation and gaps using Qwen
      const { explanation, gaps } = await qwenService.generateMatchExplanation(
        {
          skills: candidateMatrix.skills,
          totalYearsExperience: candidateMatrix.total_years_experience,
          domains: candidateMatrix.domains,
          locationSignals: candidateMatrix.location_signals,
        },
        {
          requiredSkills: jobMatrix.required_skills,
          preferredSkills: jobMatrix.preferred_skills,
          minYearsExperience: (job as any).min_years_experience,
        },
        score
      );

      // Upsert match
      const [match] = await Match.findOrCreate({
        where: {
          candidate_id: candidateId,
          job_id: jobId,
        },
        defaults: {
          id: randomUUID(),
          candidate_id: candidateId,
          job_id: jobId,
          score,
          breakdown,
          explanation,
          gaps,
          status: 'pending',
        },
      });

      // Update if exists
      if (!match.isNewRecord) {
        await match.update({
          score,
          breakdown,
          explanation,
          gaps,
          calculated_at: new Date(),
        });
      }
    } catch (error: any) {
      console.error('Match calculation failed:', error);
    }
  }

  private async calculateMatchesAsync(jobId: string) {
    try {
      const job = await Job.findByPk(jobId, {
        include: [{ model: JobMatrix, as: 'matrix', required: true }],
      });

      if (!job || !(job as any).matrix) {
        console.error('Job or job matrix not found');
        return;
      }

      const jobMatrix = (job as any).matrix;

      // Get all candidates with matrix_ready status
      const candidates = await Candidate.findAll({
        include: [
          {
            model: CandidateMatrix,
            as: 'matrices',
            required: true,
          },
        ],
      });

      for (const candidate of candidates) {
        await this.calculateMatchForCandidateAndJob(candidate.id, jobId);
      }
    } catch (error: any) {
      console.error('Match calculation failed:', error);
    }
  }

  async shortlist(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
      if (!matchId) {
        throw new Error('Match ID is required');
      }

      const match = await Match.findByPk(matchId);
      if (!match) {
        const error: any = new Error('Match not found');
        error.status = 404;
        throw error;
      }

      await match.update({ status: 'shortlisted' });

      return {
        id: match.id,
        candidateId: match.candidate_id,
        jobId: match.job_id,
        score: match.score,
        breakdown: match.breakdown,
        explanation: match.explanation,
        gaps: match.gaps,
        status: match.status,
        calculatedAt: match.calculated_at,
      };
    });
  }

  async reject(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
      if (!matchId) {
        throw new Error('Match ID is required');
      }

      const match = await Match.findByPk(matchId);
      if (!match) {
        const error: any = new Error('Match not found');
        error.status = 404;
        throw error;
      }

      await match.update({ status: 'rejected' });

      return {
        id: match.id,
        candidateId: match.candidate_id,
        jobId: match.job_id,
        score: match.score,
        breakdown: match.breakdown,
        explanation: match.explanation,
        gaps: match.gaps,
        status: match.status,
        calculatedAt: match.calculated_at,
      };
    });
  }
}

export const matchController = new MatchController();
