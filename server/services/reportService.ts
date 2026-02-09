import { Job, JobMatrix, Match, Candidate, CandidateMatrix } from '../db/models/index.js';

export interface ReportStatistics {
  totalMatches: number;
  averageScore: number;
  scoreDistribution: {
    '90-100': number;
    '80-89': number;
    '70-79': number;
    '60-69': number;
    '45-59': number;
  };
  topSkills: Array<{ skill: string; count: number }>;
  experienceDistribution: {
    '0-2': number;
    '3-5': number;
    '6-10': number;
    '11+': number;
  };
  locationDistribution: Record<string, number>;
  domainDistribution: Record<string, number>;
}

export interface JobReportData {
  job: any;
  statistics: ReportStatistics;
  topCandidates: any[];
  recommendations: string[];
}

export class ReportService {
  async generateJobReport(jobId: string): Promise<JobReportData> {
    // Fetch job with matrix
    const job = await Job.findByPk(jobId, {
      include: [{ model: JobMatrix, as: 'matrix', required: true }],
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // Fetch all matches for this job (with candidates and their matrices)
    const matches = await Match.findAll({
      where: { job_id: jobId },
      include: [
        {
          model: Candidate,
          as: 'candidate',
          include: [
            {
              model: CandidateMatrix,
              as: 'matrices',
              required: false,
            },
          ],
        },
      ],
      order: [['score', 'DESC']],
    });

    // Filter out low-quality matches (score < 35)
    const validMatches = matches.filter((m: any) => {
      const score = typeof m.score === 'number' ? m.score : 0;
      return score >= 35;
    });

    // Calculate statistics
    const statistics = this.calculateStatistics(validMatches, job);

    // Get top 10 candidates
    const topCandidates = this.getTopCandidates(validMatches, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(statistics, job, validMatches.length);

    return {
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        company: job.company,
        locationType: job.location_type,
        country: job.country,
        city: job.city,
        description: job.description,
        mustHaveSkills: job.must_have_skills,
        niceToHaveSkills: job.nice_to_have_skills,
        minYearsExperience: job.min_years_experience,
        seniorityLevel: job.seniority_level,
        status: job.status,
        createdAt: job.created_at,
      },
      statistics,
      topCandidates,
      recommendations,
    };
  }

  private calculateStatistics(matches: any[], job: any): ReportStatistics {
    if (matches.length === 0) {
      return {
        totalMatches: 0,
        averageScore: 0,
        scoreDistribution: { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '45-59': 0 },
        topSkills: [],
        experienceDistribution: { '0-2': 0, '3-5': 0, '6-10': 0, '11+': 0 },
        locationDistribution: {},
        domainDistribution: {},
      };
    }

    // Calculate average score
    const scores = matches.map((m: any) => typeof m.score === 'number' ? m.score : 0);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Score distribution
    const scoreDistribution = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '45-59': 0,
    };

    scores.forEach((score) => {
      if (score >= 90) scoreDistribution['90-100']++;
      else if (score >= 80) scoreDistribution['80-89']++;
      else if (score >= 70) scoreDistribution['70-79']++;
      else if (score >= 60) scoreDistribution['60-69']++;
      else scoreDistribution['45-59']++;
    });

    // Top skills (from candidate matrices)
    const skillCounts: Record<string, number> = {};
    matches.forEach((match: any) => {
      const candidate = match.candidate;
      if (candidate && candidate.matrices && candidate.matrices.length > 0) {
        const matrix = candidate.matrices[0];
        if (matrix.skills && Array.isArray(matrix.skills)) {
          matrix.skills.forEach((skill: any) => {
            const skillName = skill.name || skill;
            if (skillName) {
              skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
            }
          });
        }
      }
    });

    const topSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Experience distribution
    const experienceDistribution = { '0-2': 0, '3-5': 0, '6-10': 0, '11+': 0 };
    matches.forEach((match: any) => {
      const candidate = match.candidate;
      if (candidate && candidate.matrices && candidate.matrices.length > 0) {
        const matrix = candidate.matrices[0];
        const years = matrix.total_years_experience || 0;
        if (years <= 2) experienceDistribution['0-2']++;
        else if (years <= 5) experienceDistribution['3-5']++;
        else if (years <= 10) experienceDistribution['6-10']++;
        else experienceDistribution['11+']++;
      }
    });

    // Location distribution
    const locationDistribution: Record<string, number> = {};
    matches.forEach((match: any) => {
      const candidate = match.candidate;
      if (candidate && candidate.country) {
        locationDistribution[candidate.country] = (locationDistribution[candidate.country] || 0) + 1;
      }
    });

    // Domain distribution
    const domainDistribution: Record<string, number> = {};
    matches.forEach((match: any) => {
      const candidate = match.candidate;
      if (candidate && candidate.matrices && candidate.matrices.length > 0) {
        const matrix = candidate.matrices[0];
        if (matrix.domains && Array.isArray(matrix.domains)) {
          matrix.domains.forEach((domain: any) => {
            const domainName = typeof domain === 'string' ? domain : domain.name || domain;
            if (domainName) {
              domainDistribution[domainName] = (domainDistribution[domainName] || 0) + 1;
            }
          });
        }
      }
    });

    return {
      totalMatches: matches.length,
      averageScore: Math.round(averageScore * 10) / 10,
      scoreDistribution,
      topSkills,
      experienceDistribution,
      locationDistribution,
      domainDistribution,
    };
  }

  private getTopCandidates(matches: any[], limit: number = 10): any[] {
    return matches.slice(0, limit).map((match: any) => {
      const candidate = match.candidate;
      const matrix = candidate?.matrices?.[0];

      return {
        id: candidate?.id,
        name: candidate?.name,
        email: candidate?.email,
        phone: candidate?.phone,
        country: candidate?.country,
        headline: candidate?.headline,
        matchScore: match.score,
        matchBreakdown: match.breakdown,
        matchExplanation: match.explanation,
        matchGaps: match.gaps,
        experience: matrix?.total_years_experience || 0,
        skills: matrix?.skills || [],
        domains: matrix?.domains || [],
      };
    });
  }

  private generateRecommendations(
    statistics: ReportStatistics,
    job: any,
    totalMatches: number
  ): string[] {
    const recommendations: string[] = [];

    if (totalMatches === 0) {
      recommendations.push('No matches found. Consider adjusting job requirements or expanding the candidate pool.');
      return recommendations;
    }

    // Score-based recommendations
    if (statistics.averageScore < 60) {
      recommendations.push('Average match score is below 60. Consider reviewing job requirements to attract better-matched candidates.');
    } else if (statistics.averageScore >= 80) {
      recommendations.push('Excellent average match score. You have a strong pool of qualified candidates.');
    }

    // Experience-based recommendations
    const mostCommonExp = Object.entries(statistics.experienceDistribution)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonExp) {
      recommendations.push(`Most candidates (${mostCommonExp[1]}) have ${mostCommonExp[0]} years of experience.`);
    }

    // Location-based recommendations
    const topLocation = Object.entries(statistics.locationDistribution)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topLocation && topLocation[1] > totalMatches * 0.5) {
      recommendations.push(`Most candidates (${topLocation[1]}) are from ${topLocation[0]}. Consider if remote work or relocation support would expand the pool.`);
    }

    // Skills-based recommendations
    if (statistics.topSkills.length > 0) {
      const topSkill = statistics.topSkills[0];
      recommendations.push(`Most common skill among matches: ${topSkill.skill} (${topSkill.count} candidates).`);
    }

    // Score distribution recommendations
    const highScoreCount = statistics.scoreDistribution['90-100'] + statistics.scoreDistribution['80-89'];
    if (highScoreCount >= totalMatches * 0.3) {
      recommendations.push(`Strong candidate pool: ${highScoreCount} candidates have scores above 80.`);
    }

    return recommendations;
  }
}

export const reportService = new ReportService();
