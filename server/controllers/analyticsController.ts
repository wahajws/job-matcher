import { Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import sequelize from '../db/config.js';
import {
  Application,
  ApplicationHistory,
  Candidate,
  CompanyProfile,
  Job,
  Match,
  User,
  CandidateMatrix,
} from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';

export class AnalyticsController extends BaseController {
  protected model = Application; // primary model for queries

  // ==================== COMPANY ANALYTICS ====================
  async getCompanyAnalytics(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company profile not found'), { status: 404 });

      // Get all company jobs
      const companyJobs = await Job.findAll({
        where: { company_id: company.id },
        attributes: ['id', 'title', 'status', 'created_at'],
      });
      const jobIds = companyJobs.map((j: any) => j.id);

      if (jobIds.length === 0) {
        return {
          overview: { activeJobs: 0, totalApplications: 0, avgTimeToHire: 0, conversionRate: 0, hired: 0 },
          applicationsOverTime: [],
          pipelineConversion: { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0 },
          topJobs: [],
          candidateLocations: {},
          skillsDemand: [],
        };
      }

      // Overview metrics
      const activeJobs = companyJobs.filter((j: any) => j.status === 'published').length;

      const totalApplications = await Application.count({
        where: { job_id: { [Op.in]: jobIds }, status: { [Op.ne]: 'withdrawn' } },
      });

      // Pipeline conversion rates
      const statusCounts: Record<string, number> = {};
      const statuses = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
      for (const status of statuses) {
        statusCounts[status] = await Application.count({
          where: { job_id: { [Op.in]: jobIds }, status },
        });
      }

      const hired = statusCounts.hired || 0;
      const conversionRate = totalApplications > 0 ? Math.round((hired / totalApplications) * 100) : 0;

      // Average time to hire (from applied to hired)
      let avgTimeToHire = 0;
      try {
        const hiredApps = await Application.findAll({
          where: { job_id: { [Op.in]: jobIds }, status: 'hired' },
          attributes: ['applied_at', 'updated_at'],
        });
        if (hiredApps.length > 0) {
          const totalDays = hiredApps.reduce((sum: number, app: any) => {
            const applied = new Date(app.applied_at).getTime();
            const updated = new Date(app.updated_at).getTime();
            return sum + (updated - applied) / (1000 * 60 * 60 * 24);
          }, 0);
          avgTimeToHire = Math.round(totalDays / hiredApps.length);
        }
      } catch (e) {
        // ignore
      }

      // Applications over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let applicationsOverTime: { date: string; count: number }[] = [];
      try {
        const dailyApps = await Application.findAll({
          where: {
            job_id: { [Op.in]: jobIds },
            applied_at: { [Op.gte]: thirtyDaysAgo },
            status: { [Op.ne]: 'withdrawn' },
          },
          attributes: [
            [fn('DATE', col('applied_at')), 'date'],
            [fn('COUNT', col('id')), 'count'],
          ],
          group: [fn('DATE', col('applied_at'))],
          order: [[fn('DATE', col('applied_at')), 'ASC']],
          raw: true,
        });
        applicationsOverTime = (dailyApps as any[]).map((d: any) => ({
          date: d.date,
          count: parseInt(d.count, 10),
        }));
      } catch (e) {
        // Fallback if DATE function not supported
      }

      // Top performing jobs (most applications)
      const topJobs = await Promise.all(
        companyJobs.slice(0, 10).map(async (job: any) => {
          const appCount = await Application.count({
            where: { job_id: job.id, status: { [Op.ne]: 'withdrawn' } },
          });
          const avgScore = await Match.findOne({
            where: { job_id: job.id },
            attributes: [[fn('AVG', col('score')), 'avgScore']],
            raw: true,
          }) as any;

          return {
            id: job.id,
            title: job.title,
            status: job.status,
            applicationCount: appCount,
            avgMatchScore: Math.round(parseFloat(avgScore?.avgScore || '0')),
          };
        })
      );

      topJobs.sort((a, b) => b.applicationCount - a.applicationCount);

      // Candidate locations
      const candidateLocations: Record<string, number> = {};
      try {
        const apps = await Application.findAll({
          where: { job_id: { [Op.in]: jobIds }, status: { [Op.ne]: 'withdrawn' } },
          include: [
            { model: Candidate, as: 'candidate', attributes: ['country'] },
          ],
          attributes: ['id'],
        });
        for (const app of apps) {
          const country = (app as any).candidate?.country || 'Unknown';
          candidateLocations[country] = (candidateLocations[country] || 0) + 1;
        }
      } catch (e) {
        // ignore
      }

      // Most in-demand skills
      const skillsDemand: { skill: string; count: number }[] = [];
      const skillMap = new Map<string, number>();
      for (const job of companyJobs) {
        const j = job as any;
        const skills = [
          ...(Array.isArray(j.must_have_skills) ? j.must_have_skills : []),
          ...(Array.isArray(j.nice_to_have_skills) ? j.nice_to_have_skills : []),
        ];
        for (const skill of skills) {
          skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
        }
      }
      for (const [skill, count] of skillMap) {
        skillsDemand.push({ skill, count });
      }
      skillsDemand.sort((a, b) => b.count - a.count);

      return {
        overview: {
          activeJobs,
          totalApplications,
          avgTimeToHire,
          conversionRate,
          hired,
        },
        applicationsOverTime,
        pipelineConversion: statusCounts,
        topJobs: topJobs.slice(0, 5),
        candidateLocations,
        skillsDemand: skillsDemand.slice(0, 10),
      };
    });
  }

  // ==================== CANDIDATE ANALYTICS ====================
  async getCandidateAnalytics(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) {
        return {
          overview: { totalApplications: 0, responseRate: 0, avgMatchScore: 0, interviewRate: 0 },
          applicationsByStatus: {},
          matchScoreTrend: [],
          skillsInDemand: [],
        };
      }

      // Applications breakdown
      const apps = await Application.findAll({
        where: { candidate_id: candidate.id },
        include: [
          { model: Match, as: 'match', attributes: ['score'], required: false },
          { model: Job, as: 'job', attributes: ['id', 'title', 'must_have_skills', 'nice_to_have_skills'] },
        ],
        order: [['applied_at', 'DESC']],
      });

      const totalApplications = apps.length;
      const applicationsByStatus: Record<string, number> = {};
      for (const app of apps) {
        applicationsByStatus[app.status] = (applicationsByStatus[app.status] || 0) + 1;
      }

      // Response rate (how many moved beyond "applied")
      const respondedCount = apps.filter(a => a.status !== 'applied' && a.status !== 'withdrawn').length;
      const responseRate = totalApplications > 0 ? Math.round((respondedCount / totalApplications) * 100) : 0;

      // Interview rate
      const interviewCount = apps.filter(a =>
        ['interview', 'offer', 'hired'].includes(a.status)
      ).length;
      const interviewRate = totalApplications > 0 ? Math.round((interviewCount / totalApplications) * 100) : 0;

      // Average match score
      const scores = apps
        .map((a: any) => a.match?.score)
        .filter((s: any) => s !== null && s !== undefined);
      const avgMatchScore = scores.length > 0
        ? Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length)
        : 0;

      // Match score trend (recent applications with scores)
      const matchScoreTrend = apps
        .filter((a: any) => a.match?.score)
        .slice(0, 10)
        .map((a: any) => ({
          jobTitle: (a as any).job?.title || 'Unknown',
          score: a.match?.score || 0,
          appliedAt: a.applied_at,
        }))
        .reverse();

      // Skills in demand from jobs they applied to
      const skillDemandMap = new Map<string, number>();
      for (const app of apps) {
        const job = (app as any).job;
        if (job) {
          const skills = [
            ...(Array.isArray(job.must_have_skills) ? job.must_have_skills : []),
          ];
          for (const skill of skills) {
            skillDemandMap.set(skill, (skillDemandMap.get(skill) || 0) + 1);
          }
        }
      }
      const skillsInDemand = Array.from(skillDemandMap)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        overview: {
          totalApplications,
          responseRate,
          avgMatchScore,
          interviewRate,
        },
        applicationsByStatus,
        matchScoreTrend,
        skillsInDemand,
      };
    });
  }

  // ==================== ADMIN ANALYTICS ====================
  async getAdminAnalytics(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      // Platform stats
      const totalUsers = await User.count();
      const totalCandidates = await User.count({ where: { role: 'candidate' } });
      const totalCompanies = await User.count({ where: { role: 'company' } });
      const totalJobs = await Job.count();
      const activeJobs = await Job.count({ where: { status: 'published' } });
      const totalApplications = await Application.count({
        where: { status: { [Op.ne]: 'withdrawn' } },
      });
      const totalMatches = await Match.count();

      // Growth over time (last 30 days) - user registrations
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let userGrowth: { date: string; count: number }[] = [];
      try {
        const dailyUsers = await User.findAll({
          where: { created_at: { [Op.gte]: thirtyDaysAgo } },
          attributes: [
            [fn('DATE', col('created_at')), 'date'],
            [fn('COUNT', col('id')), 'count'],
          ],
          group: [fn('DATE', col('created_at'))],
          order: [[fn('DATE', col('created_at')), 'ASC']],
          raw: true,
        });
        userGrowth = (dailyUsers as any[]).map((d: any) => ({
          date: d.date,
          count: parseInt(d.count, 10),
        }));
      } catch (e) {
        // ignore
      }

      // Applications over time (last 30 days)
      let applicationGrowth: { date: string; count: number }[] = [];
      try {
        const dailyApps = await Application.findAll({
          where: {
            applied_at: { [Op.gte]: thirtyDaysAgo },
            status: { [Op.ne]: 'withdrawn' },
          },
          attributes: [
            [fn('DATE', col('applied_at')), 'date'],
            [fn('COUNT', col('id')), 'count'],
          ],
          group: [fn('DATE', col('applied_at'))],
          order: [[fn('DATE', col('applied_at')), 'ASC']],
          raw: true,
        });
        applicationGrowth = (dailyApps as any[]).map((d: any) => ({
          date: d.date,
          count: parseInt(d.count, 10),
        }));
      } catch (e) {
        // ignore
      }

      // Most in-demand skills (from all jobs)
      const allJobs = await Job.findAll({ attributes: ['must_have_skills', 'nice_to_have_skills'] });
      const skillMap = new Map<string, number>();
      for (const job of allJobs) {
        const j = job as any;
        const skills = [
          ...(Array.isArray(j.must_have_skills) ? j.must_have_skills : []),
          ...(Array.isArray(j.nice_to_have_skills) ? j.nice_to_have_skills : []),
        ];
        for (const skill of skills) {
          skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
        }
      }
      const topSkills = Array.from(skillMap)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Active companies (by number of jobs posted)
      const companyJobCounts: { companyName: string; jobCount: number }[] = [];
      try {
        const companies = await CompanyProfile.findAll({
          attributes: ['id', 'company_name'],
        });
        for (const cp of companies) {
          const count = await Job.count({ where: { company_id: (cp as any).id } });
          if (count > 0) {
            companyJobCounts.push({
              companyName: (cp as any).company_name,
              jobCount: count,
            });
          }
        }
        companyJobCounts.sort((a, b) => b.jobCount - a.jobCount);
      } catch (e) {
        // ignore
      }

      // Application status distribution
      const statusDistribution: Record<string, number> = {};
      const statuses = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
      for (const status of statuses) {
        statusDistribution[status] = await Application.count({ where: { status } });
      }

      return {
        overview: {
          totalUsers,
          totalCandidates,
          totalCompanies,
          totalJobs,
          activeJobs,
          totalApplications,
          totalMatches,
        },
        userGrowth,
        applicationGrowth,
        topSkills,
        activeCompanies: companyJobCounts.slice(0, 10),
        statusDistribution,
      };
    });
  }
}

export const analyticsController = new AnalyticsController();
