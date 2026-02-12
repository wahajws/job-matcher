import { Response } from 'express';
import { Op } from 'sequelize';
import {
  SavedJob,
  Candidate,
  Job,
  CompanyProfile,
  Match,
} from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

export class SavedJobController extends BaseController {
  protected model = SavedJob;

  // ==================== GET saved jobs ====================
  async getSavedJobs(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) return [];

      const savedJobs = await SavedJob.findAll({
        where: { candidate_id: candidate.id },
        include: [
          {
            model: Job,
            as: 'job',
            include: [
              { model: CompanyProfile, as: 'companyProfile', attributes: ['id', 'company_name', 'logo_url', 'industry'] },
            ],
          },
        ],
        order: [['saved_at', 'DESC']],
      });

      // Get match scores
      const jobIds = savedJobs.map((s: any) => s.job_id);
      const matches = await Match.findAll({
        where: { candidate_id: candidate.id, job_id: { [Op.in]: jobIds } },
        attributes: ['job_id', 'score'],
      });
      const scoreMap = new Map(matches.map((m: any) => [m.job_id, m.score]));

      return savedJobs.map((s: any) => ({
        id: s.id,
        savedAt: s.saved_at,
        job: s.job ? {
          id: s.job.id,
          title: s.job.title,
          department: s.job.department,
          company: s.job.company,
          locationType: s.job.location_type,
          country: s.job.country,
          city: s.job.city,
          seniorityLevel: s.job.seniority_level,
          status: s.job.status,
          deadline: s.job.deadline,
          createdAt: s.job.created_at,
          mustHaveSkills: s.job.must_have_skills,
          companyProfile: s.job.companyProfile ? {
            id: s.job.companyProfile.id,
            companyName: s.job.companyProfile.company_name,
            logoUrl: s.job.companyProfile.logo_url,
            industry: s.job.companyProfile.industry,
          } : null,
          matchScore: scoreMap.get(s.job.id) ?? null,
        } : null,
      }));
    });
  }

  // ==================== POST save a job ====================
  async saveJob(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { jobId } = req.body;
      if (!jobId) throw Object.assign(new Error('jobId is required'), { status: 400 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate profile not found'), { status: 404 });

      const job = await Job.findByPk(jobId);
      if (!job) throw Object.assign(new Error('Job not found'), { status: 404 });

      // Check if already saved
      const existing = await SavedJob.findOne({
        where: { candidate_id: candidate.id, job_id: jobId },
      });
      if (existing) {
        throw Object.assign(new Error('Job already saved'), { status: 409 });
      }

      await SavedJob.create({
        id: randomUUID(),
        candidate_id: candidate.id,
        job_id: jobId,
      });

      return { message: 'Job saved successfully' };
    });
  }

  // ==================== DELETE unsave a job ====================
  async unsaveJob(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { jobId } = req.params;

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate profile not found'), { status: 404 });

      const saved = await SavedJob.findOne({
        where: { candidate_id: candidate.id, job_id: jobId },
      });
      if (!saved) throw Object.assign(new Error('Saved job not found'), { status: 404 });

      await saved.destroy();
      return { message: 'Job unsaved successfully' };
    });
  }

  // ==================== GET check if job is saved ====================
  async isJobSaved(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { jobId } = req.params;

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) return { saved: false };

      const saved = await SavedJob.findOne({
        where: { candidate_id: candidate.id, job_id: jobId },
      });

      return { saved: !!saved };
    });
  }
}

export const savedJobController = new SavedJobController();
