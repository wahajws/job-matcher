import { Request, Response } from 'express';
import { CvFile, Job, Match, Candidate } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { Op } from 'sequelize';

export class DashboardController extends BaseController {
  async getStats(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const totalCvs = await CvFile.count();
      const processedCvs = await CvFile.count({
        where: { status: 'matrix_ready' },
      });
      const needsReviewCvs = await CvFile.count({
        where: { status: 'needs_review' },
      });
      const totalJobs = await Job.count();
      const matchesGenerated = await Match.count();

      return {
        totalCvs,
        processedCvs,
        needsReviewCvs,
        totalJobs,
        matchesGenerated,
      };
    });
  }

  async getRecentUploads(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const cvFiles = await CvFile.findAll({
        include: [{ model: Candidate, as: 'candidate' }],
        order: [['uploaded_at', 'DESC']],
        limit: 5,
      });

      return cvFiles.map((cv: any) => {
          const candidate = cv.candidate;
          return {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            country: candidate.country,
            countryCode: candidate.country_code,
            headline: candidate.headline,
            cvFile: {
              id: cv.id,
              candidateId: cv.candidate_id,
              filename: cv.filename,
              uploadedAt: cv.uploaded_at,
              status: cv.status,
              batchTag: cv.batch_tag,
              fileSize: cv.file_size,
            },
            createdAt: candidate.created_at,
            tags: [],
          };
      });
    });
  }

  async getRecentJobs(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const jobs = await Job.findAll({
        order: [['created_at', 'DESC']],
        limit: 5,
      });

      return jobs.map((j: any) => ({
          id: j.id,
          title: j.title,
          department: j.department,
          locationType: j.location_type,
          country: j.country,
          city: j.city,
          description: j.description,
          mustHaveSkills: j.must_have_skills,
          niceToHaveSkills: j.nice_to_have_skills,
          minYearsExperience: j.min_years_experience,
          seniorityLevel: j.seniority_level,
          status: j.status,
          createdAt: j.created_at,
      }));
    });
  }
}

export const dashboardController = new DashboardController();
