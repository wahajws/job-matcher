import { Request, Response } from 'express';
import { JobReport, Job } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { reportService } from '../services/reportService.js';

export class ReportController extends BaseController {
  protected model = JobReport;

  async generateReport(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Check if job exists
      const job = await Job.findByPk(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check if report already exists
      const existingReport = await JobReport.findOne({
        where: { job_id: jobId, status: 'completed' },
        order: [['generated_at', 'DESC']],
      });

      // Generate new report
      const reportData = await reportService.generateJobReport(jobId);

      // Save or update report
      let report: JobReport;
      if (existingReport) {
        // Update existing report
        await existingReport.update({
          report_data: reportData,
          status: 'completed',
          generated_at: new Date(),
          generated_by: (req as any).user?.id,
        });
        report = existingReport;
      } else {
        // Create new report
        report = await JobReport.create({
          job_id: jobId,
          report_data: reportData,
          status: 'completed',
          generated_at: new Date(),
          generated_by: (req as any).user?.id,
        });
      }

      return {
        id: report.id,
        jobId: report.job_id,
        reportData: report.report_data,
        status: report.status,
        generatedAt: report.generated_at,
        generatedBy: report.generated_by,
      };
    });
  }

  async getReport(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!jobId) {
        throw new Error('Job ID is required');
      }

      let report = await JobReport.findOne({
        where: { job_id: jobId, status: 'completed' },
        order: [['generated_at', 'DESC']],
      });

      // Auto-generate report if none exists
      if (!report) {
        console.log(`[Report] No report found for job ${jobId}, auto-generating...`);
        
        // Check if job exists
        const job = await Job.findByPk(jobId);
        if (!job) {
          throw new Error('Job not found');
        }

        const reportData = await reportService.generateJobReport(jobId);
        report = await JobReport.create({
          job_id: jobId,
          report_data: reportData,
          status: 'completed',
          generated_at: new Date(),
          generated_by: (req as any).user?.id,
        });
      }

      return {
        id: report.id,
        jobId: report.job_id,
        reportData: report.report_data,
        status: report.status,
        generatedAt: report.generated_at,
        generatedBy: report.generated_by,
      };
    });
  }

  async deleteReport(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const deleted = await JobReport.destroy({
        where: { job_id: jobId },
      });

      return { message: 'Report deleted successfully', deleted };
    });
  }
}

export const reportController = new ReportController();
