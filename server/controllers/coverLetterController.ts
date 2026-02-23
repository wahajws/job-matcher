import { Response } from 'express';
import { Candidate, CoverLetter, Job } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

export class CoverLetterController extends BaseController {
  protected model = CoverLetter;

  // ==================== LIST cover letters for the authenticated candidate ====================
  async listMine(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      const letters = await CoverLetter.findAll({
        where: { candidate_id: candidate.id },
        include: [
          {
            model: Job,
            as: 'job',
            attributes: ['id', 'title', 'company', 'department'],
          },
        ],
        order: [['updated_at', 'DESC']],
      });

      return letters.map((l: any) => ({
        id: l.id,
        jobId: l.job_id,
        content: l.content,
        tone: l.tone,
        version: l.version,
        isActive: l.is_active,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
        job: l.job
          ? {
              id: l.job.id,
              title: l.job.title,
              company: l.job.company,
              department: l.job.department,
            }
          : null,
      }));
    });
  }

  // ==================== GET cover letter for a specific job ====================
  async getForJob(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      const { jobId } = req.params;

      const letter = await CoverLetter.findOne({
        where: { candidate_id: candidate.id, job_id: jobId, is_active: true },
        order: [['version', 'DESC']],
      });

      if (!letter) {
        return null; // No cover letter yet for this job — that's fine
      }

      return {
        id: letter.id,
        jobId: letter.job_id,
        content: letter.content,
        tone: letter.tone,
        version: letter.version,
        isActive: letter.is_active,
        createdAt: letter.created_at,
        updatedAt: letter.updated_at,
      };
    });
  }

  // ==================== SAVE (create or update) cover letter ====================
  async save(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      const { jobId, content, tone } = req.body;

      if (!jobId) throw Object.assign(new Error('jobId is required'), { status: 400 });
      if (!content || content.trim().length === 0) {
        throw Object.assign(new Error('Cover letter content is required'), { status: 400 });
      }

      // Check if there's already an active cover letter for this job
      const existing = await CoverLetter.findOne({
        where: { candidate_id: candidate.id, job_id: jobId, is_active: true },
        order: [['version', 'DESC']],
      });

      if (existing) {
        // Update the existing one
        await existing.update({
          content: content.trim(),
          tone: tone || existing.tone,
          version: existing.version + 1,
          updated_at: new Date(),
        });

        return {
          id: existing.id,
          jobId: existing.job_id,
          content: existing.content,
          tone: existing.tone,
          version: existing.version,
          updatedAt: existing.updated_at,
          message: 'Cover letter updated',
        };
      }

      // Create new
      const letter = await CoverLetter.create({
        id: randomUUID(),
        candidate_id: candidate.id,
        job_id: jobId,
        content: content.trim(),
        tone: tone || 'formal',
        version: 1,
        is_active: true,
      });

      return {
        id: letter.id,
        jobId: letter.job_id,
        content: letter.content,
        tone: letter.tone,
        version: letter.version,
        updatedAt: letter.updated_at,
        message: 'Cover letter saved',
      };
    });
  }

  // ==================== UPDATE cover letter content ====================
  async update(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      const { id } = req.params;
      const { content, tone } = req.body;

      const letter = await CoverLetter.findOne({
        where: { id, candidate_id: candidate.id },
      });

      if (!letter) throw Object.assign(new Error('Cover letter not found'), { status: 404 });

      const updates: any = { updated_at: new Date() };
      if (content !== undefined) updates.content = content.trim();
      if (tone !== undefined) updates.tone = tone;
      updates.version = letter.version + 1;

      await letter.update(updates);

      return {
        id: letter.id,
        jobId: letter.job_id,
        content: letter.content,
        tone: letter.tone,
        version: letter.version,
        updatedAt: letter.updated_at,
        message: 'Cover letter updated',
      };
    });
  }

  // ==================== DELETE cover letter ====================
  async remove(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      const { id } = req.params;

      const letter = await CoverLetter.findOne({
        where: { id, candidate_id: candidate.id },
      });

      if (!letter) throw Object.assign(new Error('Cover letter not found'), { status: 404 });

      await letter.destroy();

      return { message: 'Cover letter deleted' };
    });
  }
}

export const coverLetterController = new CoverLetterController();
