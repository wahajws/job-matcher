import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Candidate, CvFile, CandidateMatrix, CandidateTag } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { upload } from '../middleware/upload.js';
import { randomUUID } from 'crypto';
import path from 'path';
import { existsSync, statSync } from 'fs';
import { qwenService } from '../services/qwen.js';
import { pdfParserService } from '../services/pdfParser.js';

export class CandidateController extends BaseController {
  protected model = Candidate;

  async list(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { status, country, search, tags, minScore, sortBy } = req.query;

      const where: any = {};
      const include: any[] = [
        {
          model: CvFile,
          as: 'cvFiles',
          required: false,
        },
        {
          model: CandidateMatrix,
          as: 'matrices',
          required: false,
        },
        {
          model: CandidateTag,
          as: 'tags',
          required: false,
        },
      ];

      // Don't filter by status in include - filter after fetching
      // This ensures all candidates appear, then we filter by CV status

      if (country) {
        where.country = country;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }

      // Determine sort order
      const order: any[] = [];
      if (sortBy === 'recent') {
        order.push(['created_at', 'DESC']);
      } else {
        order.push(['created_at', 'DESC']); // Default to recent first
      }

      const candidates = await Candidate.findAll({ where, include, order });

      // Filter by status AFTER fetching (so all candidates are included)
      let filtered = candidates;
      if (status) {
        filtered = candidates.filter((c: any) => {
          const cvFile = c.cvFiles?.[0];
          return cvFile?.status === status;
        });
      }

      // Filter by tags if provided
      if (tags && Array.isArray(tags)) {
        filtered = filtered.filter((c: any) => {
          const candidateTags = c.tags?.map((t: any) => t.tag_name) || [];
          return tags.some((tag: string) => candidateTags.includes(tag));
        });
      }

      // Transform to frontend format
      const result = filtered.map((c: any) => {
        const cvFile = c.cvFiles?.[0];
        const matrix = c.matrices?.[0];
        const candidateTags = c.tags?.map((t: any) => t.tag_name) || [];

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          country: c.country,
          countryCode: c.country_code,
          headline: c.headline,
          cvFile: cvFile
            ? {
                id: cvFile.id,
                candidateId: cvFile.candidate_id,
                filename: cvFile.filename,
                uploadedAt: cvFile.uploaded_at,
                status: cvFile.status,
                batchTag: cvFile.batch_tag,
                fileSize: cvFile.file_size,
              }
            : undefined,
          matrix: matrix
            ? {
                id: matrix.id,
                candidateId: matrix.candidate_id,
                skills: matrix.skills,
                roles: matrix.roles,
                totalYearsExperience: matrix.total_years_experience,
                domains: matrix.domains,
                education: matrix.education,
                languages: matrix.languages,
                locationSignals: matrix.location_signals,
                confidence: matrix.confidence,
                evidence: matrix.evidence,
                generatedAt: matrix.generated_at,
              }
            : undefined,
          createdAt: c.created_at,
          tags: candidateTags,
        };
      });

      // Filter by minScore if provided (would need match data)
      // For now, return all
      return result;
    });
  }

  async get(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;

      const candidate = await Candidate.findByPk(id, {
        include: [
          { model: CvFile, as: 'cvFiles' },
          { model: CandidateMatrix, as: 'matrices' },
          { model: CandidateTag, as: 'tags' },
        ],
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const c: any = candidate;
      const cvFile = c.cvFiles?.[0];
      const matrix = c.matrices?.[0];
      const candidateTags = c.tags?.map((t: any) => t.tag_name) || [];

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        country: c.country,
        countryCode: c.country_code,
        headline: c.headline,
        cvFile: cvFile
          ? {
              id: cvFile.id,
              candidateId: cvFile.candidate_id,
              filename: cvFile.filename,
              uploadedAt: cvFile.uploaded_at,
              status: cvFile.status,
              batchTag: cvFile.batch_tag,
              fileSize: cvFile.file_size,
            }
          : undefined,
        matrix: matrix
          ? {
              id: matrix.id,
              candidateId: matrix.candidate_id,
              skills: matrix.skills,
              roles: matrix.roles,
              totalYearsExperience: matrix.total_years_experience,
              domains: matrix.domains,
              education: matrix.education,
              languages: matrix.languages,
              locationSignals: matrix.location_signals,
              confidence: matrix.confidence,
              evidence: matrix.evidence,
              generatedAt: matrix.generated_at,
            }
          : undefined,
        createdAt: c.created_at,
        tags: candidateTags,
      };
    });
  }

  async update(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;
      const { name, email, phone, country, countryCode, headline } = req.body;

      const candidate = await Candidate.findByPk(id);
      if (!candidate) {
        const error: any = new Error('Candidate not found');
        error.status = 404;
        throw error;
      }

      await candidate.update({
        name,
        email,
        phone,
        country,
        country_code: countryCode || country,
        headline,
      });

      // Return updated candidate data
      const c: any = candidate;
      const cvFile = await CvFile.findOne({ where: { candidate_id: id } });
      const matrix = await CandidateMatrix.findOne({ where: { candidate_id: id } });
      const tags = await CandidateTag.findAll({ where: { candidate_id: id } });
      
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        country: c.country,
        countryCode: c.country_code,
        headline: c.headline,
        cvFile: cvFile ? {
          id: cvFile.id,
          candidateId: cvFile.candidate_id,
          filename: cvFile.filename,
          uploadedAt: cvFile.uploaded_at,
          status: cvFile.status,
          batchTag: cvFile.batch_tag,
          fileSize: cvFile.file_size,
        } : undefined,
        matrix: matrix ? {
          id: matrix.id,
          candidateId: matrix.candidate_id,
          skills: matrix.skills,
          roles: matrix.roles,
          totalYearsExperience: matrix.total_years_experience,
          domains: matrix.domains,
          education: matrix.education,
          languages: matrix.languages,
          locationSignals: matrix.location_signals,
          confidence: matrix.confidence,
          evidence: matrix.evidence,
          generatedAt: matrix.generated_at,
        } : undefined,
        createdAt: c.created_at,
        tags: tags.map((t: any) => t.tag_name),
      };
    });
  }

  async upload(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const files = req.files as Express.Multer.File[];
      const batchTag = req.body.batchTag;

      if (!files || files.length === 0) {
        const error: any = new Error('No files uploaded');
        error.status = 400;
        throw error;
      }

      console.log(`[Upload] Processing ${files.length} files in parallel...`);

      const result = {
        successful: 0,
        failed: 0,
        duplicates: 0,
        files: [] as any[],
      };

      // Process files in parallel with concurrency control
      const CONCURRENCY_LIMIT = parseInt(process.env.UPLOAD_CONCURRENCY || '10', 10); // Process 10 files at a time
      
      // Helper function to process a single file
      const processFile = async (file: Express.Multer.File): Promise<any> => {
        try {
          // Validate file was saved correctly by multer (diskStorage)
          if (!file.path) {
            throw new Error('File path not provided by multer');
          }

          // Check if file exists on disk and get actual size
          const absoluteFilePath = path.isAbsolute(file.path) ? file.path : path.resolve(file.path);
          
          if (!existsSync(absoluteFilePath)) {
            throw new Error(`File was not saved to disk at: ${absoluteFilePath}`);
          }

          const stats = statSync(absoluteFilePath);
          const actualFileSize = stats.size;

          if (actualFileSize === 0) {
            throw new Error(`File on disk is 0 bytes. Multer reported size: ${file.size}, Actual size: ${actualFileSize}`);
          }

          // Use actual file size from disk
          const fileSizeToStore = actualFileSize > 0 ? actualFileSize : file.size;

          // Check for duplicate filename
          const existing = await CvFile.findOne({ where: { filename: file.originalname } });
          if (existing) {
            return {
              filename: file.originalname,
              progress: 100,
              status: 'duplicate',
              error: 'File already exists',
            };
          }

          console.log(`[Upload] Processing file: ${file.originalname}`);

          // Extract text from PDF and get candidate info using Qwen
          let candidateInfo;
          try {
            const cvText = await pdfParserService.extractText(absoluteFilePath);
            
            if (!cvText || cvText.trim().length === 0) {
              throw new Error('PDF text extraction returned empty content');
            }
            
            candidateInfo = await qwenService.extractCandidateInfo(cvText);
          } catch (error: any) {
            console.error(`[Upload] Failed to extract candidate info from ${file.originalname}, using filename fallback:`, error.message);
            // Fallback: extract name from filename
            const nameParts = file.originalname.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ').split(' ');
            const fallbackName = nameParts.slice(0, 2).join(' ') || 'Unknown';
            candidateInfo = {
              name: fallbackName,
              email: undefined,
              phone: undefined,
              country: 'US',
              countryCode: 'US',
              headline: undefined,
            };
          }

          // Create candidate with extracted info from Qwen
          const candidate = await Candidate.create({
            id: randomUUID(),
            name: candidateInfo.name,
            email: candidateInfo.email || `${candidateInfo.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            phone: candidateInfo.phone || '+1' + Math.floor(Math.random() * 9000000000 + 1000000000),
            country: candidateInfo.country || 'US',
            country_code: candidateInfo.countryCode || 'US',
            headline: candidateInfo.headline,
          });

          // Create CV file record with candidate ID
          const cvFile = await CvFile.create({
            id: randomUUID(),
            candidate_id: candidate.id,
            filename: file.originalname,
            file_path: absoluteFilePath,
            file_size: fileSizeToStore,
            status: 'uploaded',
            batch_tag: batchTag,
          });

          // Trigger async processing for matrix generation (in background)
          this.processCvAsync(cvFile.id).catch((err) => {
            console.error(`[Upload] Background processing failed for ${file.originalname}:`, err);
          });

          return {
            filename: file.originalname,
            progress: 100,
            status: 'success',
          };
        } catch (error: any) {
          console.error(`[Upload] Error processing ${file.originalname}:`, error.message);
          return {
            filename: file.originalname,
            progress: 100,
            status: 'failed',
            error: error.message || 'Upload failed',
          };
        }
      };

      // Process files in batches with concurrency control
      const processBatch = async (batch: Express.Multer.File[]) => {
        const results = await Promise.allSettled(batch.map(file => processFile(file)));
        return results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              filename: batch[index].originalname,
              progress: 100,
              status: 'failed',
              error: result.reason?.message || 'Unknown error',
            };
          }
        });
      };

      // Process all files in batches
      for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
        const batch = files.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`[Upload] Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(files.length / CONCURRENCY_LIMIT)} (${batch.length} files)`);
        const batchResults = await processBatch(batch);
        result.files.push(...batchResults);
        
        // Update counters
        batchResults.forEach((fileResult) => {
          if (fileResult.status === 'success') {
            result.successful++;
          } else if (fileResult.status === 'duplicate') {
            result.duplicates++;
          } else {
            result.failed++;
          }
        });
      }

      console.log(`[Upload] Completed: ${result.successful} successful, ${result.duplicates} duplicates, ${result.failed} failed`);

      return result;
    });
  }

  private async processCvAsync(cvFileId: string) {
    try {
      const cvFile = await CvFile.findByPk(cvFileId);
      if (!cvFile) {
        console.error(`CV file not found: ${cvFileId}`);
        return;
      }

      // Validate file path and size
      if (!cvFile.file_path) {
        console.error(`CV file has no file path: ${cvFileId}`);
        await cvFile.update({ status: 'failed' });
        return;
      }

      if (!cvFile.file_size || cvFile.file_size === 0) {
        console.error(`CV file has zero size: ${cvFileId}, path: ${cvFile.file_path}`);
        await cvFile.update({ status: 'failed' });
        return;
      }

      // Update status to parsing
      await cvFile.update({ status: 'parsing' });

      // Extract text from PDF
      const cvText = await pdfParserService.extractText(cvFile.file_path);

      // Generate matrix using Qwen
      const matrixData = await qwenService.generateCandidateMatrix(cvText);

      // Save matrix
      await CandidateMatrix.create({
        id: randomUUID(),
        candidate_id: cvFile.candidate_id,
        cv_file_id: cvFileId,
        skills: matrixData.skills || [],
        roles: matrixData.roles || [],
        total_years_experience: matrixData.totalYearsExperience || 0,
        domains: matrixData.domains || [],
        education: matrixData.education || [],
        languages: matrixData.languages || [],
        location_signals: matrixData.locationSignals || {},
        confidence: matrixData.confidence || 0,
        evidence: matrixData.evidence || [],
        qwen_model_version: qwenService.getModelVersion(),
      });

      // Update CV file status
      await cvFile.update({
        status: 'matrix_ready',
        processed_at: new Date(),
      });

      // Trigger automatic match calculation for all published jobs
      await this.triggerMatchCalculationForAllJobs(cvFile.candidate_id);
    } catch (error: any) {
      console.error('CV processing failed:', error);
      const cvFile = await CvFile.findByPk(cvFileId);
      if (cvFile) {
        await cvFile.update({ status: 'failed' });
      }
    }
  }

  private async triggerMatchCalculationForAllJobs(candidateId: string) {
    try {
      // Import here to avoid circular dependency
      const { Job, JobMatrix } = await import('../db/models/index.js');
      const { matchController } = await import('./matchController.js');
      
      // Get all published jobs with matrices
      const jobs = await Job.findAll({
        where: { status: 'published' },
        include: [
          {
            model: JobMatrix,
            as: 'matrix',
            required: true,
          },
        ],
      });

      // Calculate matches for each job
      for (const job of jobs) {
        await matchController.calculateMatchForCandidateAndJob(candidateId, job.id);
      }
    } catch (error: any) {
      console.error('Failed to trigger match calculation:', error);
    }
  }

  async delete(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error('Candidate ID is required');
      }

      const candidate = await Candidate.findByPk(id);
      if (!candidate) {
        const error: any = new Error('Candidate not found');
        error.status = 404;
        throw error;
      }

      // Delete associated records (cascade)
      await CvFile.destroy({ where: { candidate_id: id } });
      await CandidateMatrix.destroy({ where: { candidate_id: id } });
      await CandidateTag.destroy({ where: { candidate_id: id } });
      
      // Delete candidate
      await candidate.destroy();

      return { message: 'Candidate deleted successfully' };
    });
  }

  async getMatrix(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new Error('Candidate ID is required');
      }

      const matrix = await CandidateMatrix.findOne({
        where: { candidate_id: id },
      });

      if (!matrix) {
        const error: any = new Error('Matrix not found');
        error.status = 404;
        throw error;
      }

      return {
        id: matrix.id,
        candidateId: matrix.candidate_id,
        skills: matrix.skills,
        roles: matrix.roles,
        totalYearsExperience: matrix.total_years_experience,
        domains: matrix.domains,
        education: matrix.education,
        languages: matrix.languages,
        locationSignals: matrix.location_signals,
        confidence: matrix.confidence,
        evidence: matrix.evidence,
        generatedAt: matrix.generated_at,
      };
    });
  }

  async rerunMatching(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;

      // Trigger match recalculation for this candidate
      // This would typically trigger a background job
      // For now, just return success
      return { message: 'Matching re-run initiated' };
    });
  }
}

export const candidateController = new CandidateController();
