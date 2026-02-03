import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Job, JobMatrix } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { qwenService } from '../services/qwen.js';
import { fetchAndExtractText } from '../utils/htmlParser.js';
import { pdfParserService } from '../services/pdfParser.js';
import { randomUUID } from 'crypto';

export class JobController extends BaseController {
  protected model = Job;

  async list(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { status, locationType, country } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (locationType) where.location_type = locationType;
      if (country) where.country = country;

      const jobs = await Job.findAll({
        where,
        include: [{ model: JobMatrix, as: 'matrix', required: false }],
        order: [['created_at', 'DESC']],
      });

      return jobs.map((j: any) => ({
          id: j.id,
          title: j.title,
          department: j.department,
          company: j.company,
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
          matrix: j.matrix
            ? {
                id: j.matrix.id,
                jobId: j.matrix.job_id,
                requiredSkills: j.matrix.required_skills,
                preferredSkills: j.matrix.preferred_skills,
                experienceWeight: j.matrix.experience_weight,
                locationWeight: j.matrix.location_weight,
                domainWeight: j.matrix.domain_weight,
                generatedAt: j.matrix.generated_at,
              }
            : undefined,
      }));
    });
  }

  async get(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findByPk(id, {
        include: [{ model: JobMatrix, as: 'matrix', required: false }],
      });

      if (!job) {
        const error: any = new Error('Job not found');
        error.status = 404;
        throw error;
      }

      const j: any = job;
      return {
        id: j.id,
        title: j.title,
        department: j.department,
        company: j.company,
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
        matrix: j.matrix
          ? {
              id: j.matrix.id,
              jobId: j.matrix.job_id,
              requiredSkills: j.matrix.required_skills,
              preferredSkills: j.matrix.preferred_skills,
              experienceWeight: j.matrix.experience_weight,
              locationWeight: j.matrix.location_weight,
              domainWeight: j.matrix.domain_weight,
              generatedAt: j.matrix.generated_at,
            }
          : undefined,
      };
    });
  }

  async create(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const {
        title,
        department,
        company,
        locationType,
        country,
        city,
        description,
        mustHaveSkills,
        niceToHaveSkills,
        minYearsExperience,
        seniorityLevel,
        status,
      } = req.body;

      const job = await Job.create({
        id: randomUUID(),
        title,
        department,
        company,
        location_type: locationType,
        country,
        city,
        description,
        must_have_skills: mustHaveSkills || [],
        nice_to_have_skills: niceToHaveSkills || [],
        min_years_experience: minYearsExperience,
        seniority_level: seniorityLevel,
        status: status || 'draft',
      });

      // Generate matrix if published
      if (status === 'published') {
        await this.generateMatrixAsync(job.id);
      }

      // Return created job
      const createdJob = await Job.findByPk(job.id, {
        include: [{ model: JobMatrix, as: 'matrix', required: false }],
      });
      const j: any = createdJob;
      return {
        id: j.id,
        title: j.title,
        department: j.department,
        company: j.company,
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
        matrix: j.matrix ? {
          id: j.matrix.id,
          jobId: j.matrix.job_id,
          requiredSkills: j.matrix.required_skills,
          preferredSkills: j.matrix.preferred_skills,
          experienceWeight: j.matrix.experience_weight,
          locationWeight: j.matrix.location_weight,
          domainWeight: j.matrix.domain_weight,
          generatedAt: j.matrix.generated_at,
        } : undefined,
      };
    });
  }

  async createFromUrl(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      // Debug: Check if body exists
      console.log('[JobController] Request body:', req.body);
      console.log('[JobController] Content-Type:', req.headers['content-type']);
      console.log('[JobController] Request method:', req.method);
      console.log('[JobController] Request headers:', JSON.stringify(req.headers, null, 2));
      
      // Check if body is undefined (not parsed) vs empty object (parsed but empty)
      if (req.body === undefined) {
        throw new Error('Request body is undefined. Body parser middleware may not be running. Ensure Content-Type: application/json header is set.');
      }
      
      const url = req.body?.url;
      const status = req.body?.status;

      console.log('[JobController] Extracted url:', url);
      console.log('[JobController] Extracted status:', status);

      if (!url || typeof url !== 'string') {
        throw new Error('URL is required and must be a string');
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      console.log(`[JobController] Creating job from URL: ${url}`);

      // Step 1: Fetch and extract text from URL
      const jobPostingText = await fetchAndExtractText(url);
      
      if (!jobPostingText || jobPostingText.trim().length < 100) {
        throw new Error('Could not extract sufficient text from the job posting URL');
      }

      // Step 2: Use Qwen to extract structured job information
      console.log(`[JobController] Extracting job info using Qwen...`);
      const jobInfo = await qwenService.extractJobInfoFromPosting(jobPostingText);
      
      console.log(`[JobController] Extracted job info:`, jobInfo);

      // Step 3: Create job in database
      const job = await Job.create({
        id: randomUUID(),
        title: jobInfo.title,
        department: jobInfo.department || 'General',
        company: jobInfo.company,
        location_type: jobInfo.locationType,
        country: jobInfo.countryCode,
        city: jobInfo.city,
        description: jobInfo.description,
        must_have_skills: jobInfo.mustHaveSkills,
        nice_to_have_skills: jobInfo.niceToHaveSkills,
        min_years_experience: jobInfo.minYearsExperience,
        seniority_level: jobInfo.seniorityLevel,
        status: status || 'draft',
      });

      // Step 4: Generate matrix if published
      if (status === 'published') {
        await this.generateMatrixAsync(job.id);
      }

      // Step 5: Return created job with matrix
      const createdJob = await Job.findByPk(job.id, {
        include: [{ model: JobMatrix, as: 'matrix', required: false }],
      });
      
      const j: any = createdJob;
      return {
        id: j.id,
        title: j.title,
        department: j.department,
        company: j.company,
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
        matrix: j.matrix
          ? {
              id: j.matrix.id,
              jobId: j.matrix.job_id,
              requiredSkills: j.matrix.required_skills,
              preferredSkills: j.matrix.preferred_skills,
              experienceWeight: j.matrix.experience_weight,
              locationWeight: j.matrix.location_weight,
              domainWeight: j.matrix.domain_weight,
              generatedAt: j.matrix.generated_at,
            }
          : null,
      };
    });
  }

  async createFromPdf(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      // upload.single() stores file in req.file, not req.files
      const pdfFile = req.file as Express.Multer.File;
      const status = (req.body as any)?.status || 'draft';

      if (!pdfFile) {
        throw new Error('No PDF file uploaded');
      }
      
      if (!pdfFile.path) {
        throw new Error('PDF file path is missing');
      }

      console.log(`[JobController] Creating job from PDF: ${pdfFile.originalname}`);

      // Step 1: Extract text from PDF
      console.log(`[JobController] Extracting text from PDF...`);
      const jobPostingText = await pdfParserService.extractText(pdfFile.path);
      
      if (!jobPostingText || jobPostingText.trim().length < 100) {
        throw new Error('Could not extract sufficient text from the PDF file');
      }

      console.log(`[JobController] Extracted ${jobPostingText.length} characters from PDF`);

      // Step 2: Use Qwen to extract structured job information
      console.log(`[JobController] Extracting job info using Qwen...`);
      const jobInfo = await qwenService.extractJobInfoFromPosting(jobPostingText);
      
      console.log(`[JobController] Extracted job info:`, jobInfo);

      // Step 3: Create job in database
      const job = await Job.create({
        id: randomUUID(),
        title: jobInfo.title,
        department: jobInfo.department || 'General',
        company: jobInfo.company,
        location_type: jobInfo.locationType,
        country: jobInfo.countryCode,
        city: jobInfo.city,
        description: jobInfo.description,
        must_have_skills: jobInfo.mustHaveSkills,
        nice_to_have_skills: jobInfo.niceToHaveSkills,
        min_years_experience: jobInfo.minYearsExperience,
        seniority_level: jobInfo.seniorityLevel,
        status: status,
      });

      // Step 4: Generate matrix if published
      if (status === 'published') {
        await this.generateMatrixAsync(job.id);
      }

      // Step 5: Return created job with matrix
      const createdJob = await Job.findByPk(job.id, {
        include: [{ model: JobMatrix, as: 'matrix', required: false }],
      });

      if (!createdJob) {
        throw new Error('Failed to retrieve created job');
      }

      const j: any = createdJob;
      return {
        id: j.id,
        title: j.title,
        department: j.department,
        company: j.company,
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
        matrix: j.matrix
          ? {
              id: j.matrix.id,
              jobId: j.matrix.job_id,
              requiredSkills: j.matrix.required_skills,
              preferredSkills: j.matrix.preferred_skills,
              experienceWeight: j.matrix.experience_weight,
              locationWeight: j.matrix.location_weight,
              domainWeight: j.matrix.domain_weight,
              generatedAt: j.matrix.generated_at,
            }
          : null,
      };
    });
  }

  async update(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error('Job ID is required');
      }
      const updates = req.body;

      const job = await Job.findByPk(id);
      if (!job) {
        const error: any = new Error('Job not found');
        error.status = 404;
        throw error;
      }

      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.department) updateData.department = updates.department;
      if (updates.company !== undefined) updateData.company = updates.company;
      if (updates.locationType) updateData.location_type = updates.locationType;
      if (updates.country) updateData.country = updates.country;
      if (updates.city) updateData.city = updates.city;
      if (updates.description) updateData.description = updates.description;
      if (updates.mustHaveSkills) updateData.must_have_skills = updates.mustHaveSkills;
      if (updates.niceToHaveSkills) updateData.nice_to_have_skills = updates.niceToHaveSkills;
      if (updates.minYearsExperience) updateData.min_years_experience = updates.minYearsExperience;
      if (updates.seniorityLevel) updateData.seniority_level = updates.seniorityLevel;
      if (updates.status) updateData.status = updates.status;

      await job.update(updateData);

      // Generate matrix if publishing
      if (updates.status === 'published' && !job.status) {
        await this.generateMatrixAsync(job.id);
      }

      // Return updated job
      const updatedJob = await Job.findByPk(id, {
        include: [{ model: JobMatrix, as: 'matrix', required: false }],
      });
      const j: any = updatedJob;
      return {
        id: j.id,
        title: j.title,
        department: j.department,
        company: j.company,
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
        matrix: j.matrix ? {
          id: j.matrix.id,
          jobId: j.matrix.job_id,
          requiredSkills: j.matrix.required_skills,
          preferredSkills: j.matrix.preferred_skills,
          experienceWeight: j.matrix.experience_weight,
          locationWeight: j.matrix.location_weight,
          domainWeight: j.matrix.domain_weight,
          generatedAt: j.matrix.generated_at,
        } : undefined,
      };
    });
  }

  async delete(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findByPk(id);
      if (!job) {
        const error: any = new Error('Job not found');
        error.status = 404;
        throw error;
      }

      await job.destroy();
      return { message: 'Job deleted successfully' };
    });
  }

  async getMatrix(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error('Job ID is required');
      }

      const matrix = await JobMatrix.findOne({ where: { job_id: id } });
      if (!matrix) {
        const error: any = new Error('Job matrix not found');
        error.status = 404;
        throw error;
      }

      return {
        id: matrix.id,
        jobId: matrix.job_id,
        requiredSkills: matrix.required_skills,
        preferredSkills: matrix.preferred_skills,
        experienceWeight: matrix.experience_weight,
        locationWeight: matrix.location_weight,
        domainWeight: matrix.domain_weight,
        generatedAt: matrix.generated_at,
      };
    });
  }

  async generateMatrix(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findByPk(id);
      if (!job) {
        const error: any = new Error('Job not found');
        error.status = 404;
        throw error;
      }

      // Generate in background
      this.generateMatrixAsync(id as string).catch(console.error);

      return { message: 'Matrix generation started', jobId: id };
    });
  }

  private async generateMatrixAsync(jobId: string) {
    try {
      const job = await Job.findByPk(jobId);
      if (!job) return;

      const matrixData = await qwenService.generateJobMatrix(
        job.title,
        job.description,
        job.must_have_skills || [],
        job.nice_to_have_skills || []
      );

      // Delete existing matrix if any
      await JobMatrix.destroy({ where: { job_id: jobId } });

      // Create new matrix
      await JobMatrix.create({
        id: randomUUID(),
        job_id: jobId,
        required_skills: matrixData.requiredSkills || [],
        preferred_skills: matrixData.preferredSkills || [],
        experience_weight: matrixData.experienceWeight || 20,
        location_weight: matrixData.locationWeight || 15,
        domain_weight: matrixData.domainWeight || 10,
        qwen_model_version: qwenService.getModelVersion(),
      });

      // Trigger automatic match calculation for all matrix_ready candidates
      await this.triggerMatchCalculationForAllCandidates(jobId);
    } catch (error: any) {
      console.error('Job matrix generation failed:', error);
    }
  }

  private async triggerMatchCalculationForAllCandidates(jobId: string) {
    try {
      // Import here to avoid circular dependency
      const { Candidate, CandidateMatrix } = await import('../db/models/index.js');
      const { matchController } = await import('./matchController.js');
      
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

      // Calculate matches for each candidate
      for (const candidate of candidates) {
        await matchController.calculateMatchForCandidateAndJob(candidate.id, jobId);
      }
    } catch (error: any) {
      console.error('Failed to trigger match calculation:', error);
    }
  }
}

export const jobController = new JobController();
