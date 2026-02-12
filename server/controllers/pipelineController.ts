import { Response } from 'express';
import { Op } from 'sequelize';
import {
  Application,
  ApplicationHistory,
  Candidate,
  CompanyProfile,
  Job,
  Match,
  PipelineStage,
} from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';
import { notificationService } from '../services/notificationService.js';

// Default pipeline stages created for every new company
const DEFAULT_STAGES = [
  { name: 'Applied', order: 0, color: '#6B7280', is_default: true },
  { name: 'Screening', order: 1, color: '#3B82F6', is_default: true },
  { name: 'Interview', order: 2, color: '#8B5CF6', is_default: true },
  { name: 'Offer', order: 3, color: '#F59E0B', is_default: true },
  { name: 'Hired', order: 4, color: '#10B981', is_default: true },
  { name: 'Rejected', order: 5, color: '#EF4444', is_default: true },
];

export class PipelineController extends BaseController {
  protected model = PipelineStage;

  // ==================== GET pipeline stages for company ====================
  async getStages(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company profile not found'), { status: 404 });

      // Auto-seed default stages if none exist
      const existing = await PipelineStage.count({ where: { company_id: company.id } });
      if (existing === 0) {
        await this.seedDefaultStages(company.id);
      }

      const stages = await PipelineStage.findAll({
        where: { company_id: company.id },
        order: [['order', 'ASC']],
      });

      return stages.map((s: any) => ({
        id: s.id,
        companyId: s.company_id,
        name: s.name,
        order: s.order,
        color: s.color,
        isDefault: s.is_default,
      }));
    });
  }

  // ==================== CREATE custom stage ====================
  async createStage(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company profile not found'), { status: 404 });

      const { name, color, order } = req.body;
      if (!name) throw Object.assign(new Error('Stage name is required'), { status: 400 });

      // If no order provided, put it before the last two (Hired, Rejected)
      let finalOrder = order;
      if (finalOrder === undefined || finalOrder === null) {
        const maxOrder = await PipelineStage.max('order', {
          where: { company_id: company.id },
        }) as number || 0;
        // Insert before Rejected (last stage)
        finalOrder = maxOrder; // Will push Rejected down
        // Shift Rejected stage order up
        await PipelineStage.update(
          { order: maxOrder + 1 },
          { where: { company_id: company.id, name: 'Rejected' } }
        );
      }

      const stage = await PipelineStage.create({
        id: randomUUID(),
        company_id: company.id,
        name,
        color: color || '#6B7280',
        order: finalOrder,
        is_default: false,
      });

      return {
        id: stage.id,
        companyId: stage.company_id,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        isDefault: stage.is_default,
      };
    });
  }

  // ==================== UPDATE stage ====================
  async updateStage(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { id } = req.params;
      const { name, color, order } = req.body;

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company profile not found'), { status: 404 });

      const stage = await PipelineStage.findOne({
        where: { id, company_id: company.id },
      });
      if (!stage) throw Object.assign(new Error('Stage not found'), { status: 404 });

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;
      if (order !== undefined) updateData.order = order;
      updateData.updated_at = new Date();

      await stage.update(updateData);

      return {
        id: stage.id,
        companyId: stage.company_id,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        isDefault: stage.is_default,
      };
    });
  }

  // ==================== DELETE stage ====================
  async deleteStage(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { id } = req.params;

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company profile not found'), { status: 404 });

      const stage = await PipelineStage.findOne({
        where: { id, company_id: company.id },
      });
      if (!stage) throw Object.assign(new Error('Stage not found'), { status: 404 });
      if (stage.is_default) throw Object.assign(new Error('Cannot delete default stages'), { status: 400 });

      // Move applications from this stage to the "Applied" stage
      const appliedStage = await PipelineStage.findOne({
        where: { company_id: company.id, name: 'Applied' },
      });

      if (appliedStage) {
        await Application.update(
          { pipeline_stage_id: appliedStage.id, status: 'applied' },
          { where: { pipeline_stage_id: id } }
        );
      }

      await stage.destroy();
      return { message: 'Stage deleted successfully' };
    });
  }

  // ==================== REORDER stages ====================
  async reorderStages(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company profile not found'), { status: 404 });

      const { stageIds } = req.body; // Array of stage IDs in new order
      if (!Array.isArray(stageIds)) throw Object.assign(new Error('stageIds must be an array'), { status: 400 });

      for (let i = 0; i < stageIds.length; i++) {
        await PipelineStage.update(
          { order: i, updated_at: new Date() },
          { where: { id: stageIds[i], company_id: company.id } }
        );
      }

      return { message: 'Stages reordered successfully' };
    });
  }

  // ==================== GET pipeline for a job ====================
  async getJobPipeline(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { jobId } = req.params;

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company profile not found'), { status: 404 });

      // Verify the job belongs to this company
      const job = await Job.findByPk(jobId);
      if (!job) throw Object.assign(new Error('Job not found'), { status: 404 });
      if (job.company_id !== company.id && req.user.role !== 'admin') {
        throw Object.assign(new Error('Access denied'), { status: 403 });
      }

      // Auto-seed stages if needed
      const stageCount = await PipelineStage.count({ where: { company_id: company.id } });
      if (stageCount === 0) {
        await this.seedDefaultStages(company.id);
      }

      // Get stages
      const stages = await PipelineStage.findAll({
        where: { company_id: company.id },
        order: [['order', 'ASC']],
      });

      // Get applications for this job
      const applications = await Application.findAll({
        where: { job_id: jobId, status: { [Op.ne]: 'withdrawn' } },
        include: [
          {
            model: Candidate,
            as: 'candidate',
            attributes: ['id', 'name', 'email', 'phone', 'headline', 'photo_url', 'country'],
          },
          { model: Match, as: 'match' },
        ],
        order: [['applied_at', 'DESC']],
      });

      // Map applications to stages
      const stageMap = new Map(stages.map((s: any) => [s.id, s]));
      const appliedStage = stages.find((s: any) => s.name === 'Applied');

      // Map status names to stages for apps that don't have pipeline_stage_id yet
      const statusToStageName: Record<string, string> = {
        applied: 'Applied',
        screening: 'Screening',
        interview: 'Interview',
        offer: 'Offer',
        hired: 'Hired',
        rejected: 'Rejected',
      };

      const stageNameMap = new Map(stages.map((s: any) => [s.name, s]));

      const pipeline = stages.map((stage: any) => {
        const stageApps = applications.filter((app: any) => {
          if (app.pipeline_stage_id) {
            return app.pipeline_stage_id === stage.id;
          }
          // Fallback: map status to stage name
          const mappedStageName = statusToStageName[app.status] || 'Applied';
          return mappedStageName === stage.name;
        });

        return {
          id: stage.id,
          name: stage.name,
          order: stage.order,
          color: stage.color,
          isDefault: stage.is_default,
          count: stageApps.length,
          applications: stageApps.map((app: any) => ({
            id: app.id,
            candidateId: app.candidate_id,
            jobId: app.job_id,
            status: app.status,
            appliedAt: app.applied_at,
            updatedAt: app.updated_at,
            matchScore: app.match?.score || null,
            candidate: app.candidate ? {
              id: app.candidate.id,
              name: app.candidate.name,
              email: app.candidate.email,
              phone: app.candidate.phone,
              headline: app.candidate.headline,
              photoUrl: app.candidate.photo_url,
              country: app.candidate.country,
            } : null,
          })),
        };
      });

      return {
        job: {
          id: job.id,
          title: job.title,
          department: job.department,
          status: job.status,
        },
        stages: pipeline,
        totalApplications: applications.length,
      };
    });
  }

  // ==================== MOVE application between stages ====================
  async moveApplication(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { id } = req.params; // application ID
      const { stageId, note } = req.body;

      if (!stageId) throw Object.assign(new Error('stageId is required'), { status: 400 });

      const application = await Application.findByPk(id, {
        include: [{ model: Job, as: 'job' }],
      });
      if (!application) throw Object.assign(new Error('Application not found'), { status: 404 });

      // Verify ownership
      const job = (application as any).job;
      if (req.user.role === 'company') {
        const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
        if (!company || job.company_id !== company.id) {
          throw Object.assign(new Error('Access denied'), { status: 403 });
        }
      }

      // Validate stage exists
      const newStage = await PipelineStage.findByPk(stageId);
      if (!newStage) throw Object.assign(new Error('Pipeline stage not found'), { status: 404 });

      const oldStatus = application.status;
      const oldStageId = application.pipeline_stage_id;

      // Map stage name to application status
      const stageToStatus: Record<string, string> = {
        'Applied': 'applied',
        'Screening': 'screening',
        'Interview': 'interview',
        'Offer': 'offer',
        'Hired': 'hired',
        'Rejected': 'rejected',
      };

      const newStatus = stageToStatus[newStage.name] || application.status;

      // Update application
      await application.update({
        pipeline_stage_id: stageId,
        status: newStatus as any,
        updated_at: new Date(),
      });

      // Create history record
      await ApplicationHistory.create({
        id: randomUUID(),
        application_id: id,
        from_status: oldStatus,
        to_status: newStatus,
        changed_by: req.user.id,
        note: note || null,
      });

      // Trigger notification to candidate
      notificationService.notifyStatusChanged(
        id,
        application.candidate_id,
        application.job_id,
        newStatus
      ).catch(console.error);

      return {
        message: `Application moved to ${newStage.name}`,
        applicationId: id,
        fromStatus: oldStatus,
        toStatus: newStatus,
        stageId,
        stageName: newStage.name,
      };
    });
  }

  // ==================== GET application history ====================
  async getApplicationHistory(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { id } = req.params;

      const history = await ApplicationHistory.findAll({
        where: { application_id: id },
        include: [
          {
            model: (await import('../db/models/index.js')).User,
            as: 'changedByUser',
            attributes: ['id', 'name', 'role'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      return history.map((h: any) => ({
        id: h.id,
        applicationId: h.application_id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        changedBy: h.changedByUser ? {
          id: h.changedByUser.id,
          name: h.changedByUser.name,
          role: h.changedByUser.role,
        } : null,
        note: h.note,
        createdAt: h.created_at,
      }));
    });
  }

  // ==================== HELPER: Seed default stages ====================
  async seedDefaultStages(companyId: string): Promise<void> {
    for (const stage of DEFAULT_STAGES) {
      await PipelineStage.create({
        id: randomUUID(),
        company_id: companyId,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        is_default: stage.is_default,
      });
    }
  }
}

export const pipelineController = new PipelineController();
