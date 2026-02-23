import { Request, Response } from 'express';
import { Candidate } from '../db/models/Candidate.js';
import { CompanyProfile } from '../db/models/CompanyProfile.js';
import { CvFile } from '../db/models/CvFile.js';
import { CandidateMatrix } from '../db/models/CandidateMatrix.js';
import { Job, JobMatrix, Match } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';
import path from 'path';
import { existsSync, statSync } from 'fs';
import { pdfParserService } from '../services/pdfParser.js';
import { qwenService } from '../services/qwen.js';
import { matchController } from './matchController.js';

export class ProfileController extends BaseController {
  protected model = Candidate;

  // ==================== CANDIDATE PROFILE ====================

  async getCandidateProfile(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const candidate = await Candidate.findOne({
        where: { user_id: req.user.id },
        include: [
          {
            model: CvFile,
            as: 'cvFiles',
            order: [['uploaded_at', 'DESC']],
            limit: 1,
          },
          {
            model: CandidateMatrix,
            as: 'matrices',
            order: [['generated_at', 'DESC']],
            limit: 1,
          },
        ],
      });

      if (!candidate) {
        const error: any = new Error('Candidate profile not found');
        error.status = 404;
        throw error;
      }

      const cvFile = (candidate as any).cvFiles?.[0] || null;
      const matrix = (candidate as any).matrices?.[0] || null;

      return {
        id: candidate.id,
        userId: candidate.user_id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        country: candidate.country,
        countryCode: candidate.country_code,
        headline: candidate.headline,
        photoUrl: candidate.photo_url,
        bio: candidate.bio,
        linkedinUrl: candidate.linkedin_url,
        githubUrl: candidate.github_url,
        portfolioUrl: candidate.portfolio_url,
        createdAt: candidate.created_at,
        cvFile: cvFile ? {
          id: cvFile.id,
          filename: cvFile.filename,
          status: cvFile.status,
          uploadedAt: cvFile.uploaded_at,
        } : null,
        matrix: matrix ? {
          id: matrix.id,
          skills: matrix.skills,
          roles: matrix.roles,
          totalYearsExperience: matrix.total_years_experience,
          domains: matrix.domains,
          education: matrix.education,
          languages: matrix.languages,
          locationSignals: matrix.location_signals,
          confidence: matrix.confidence,
          generatedAt: matrix.generated_at,
        } : null,
      };
    });
  }

  async updateCandidateProfile(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) {
        const error: any = new Error('Candidate profile not found');
        error.status = 404;
        throw error;
      }

      const {
        name, phone, country, countryCode, headline,
        bio, linkedinUrl, githubUrl, portfolioUrl,
      } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (country !== undefined) updates.country = country;
      if (countryCode !== undefined) updates.country_code = countryCode;
      if (headline !== undefined) updates.headline = headline;
      if (bio !== undefined) updates.bio = bio;
      if (linkedinUrl !== undefined) updates.linkedin_url = linkedinUrl;
      if (githubUrl !== undefined) updates.github_url = githubUrl;
      if (portfolioUrl !== undefined) updates.portfolio_url = portfolioUrl;
      updates.updated_at = new Date();

      await candidate.update(updates);

      return { message: 'Profile updated successfully' };
    });
  }

  async uploadCandidatePhoto(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) {
        const error: any = new Error('Candidate profile not found');
        error.status = 404;
        throw error;
      }

      const file = (req as any).file;
      if (!file) {
        const error: any = new Error('No photo file provided');
        error.status = 400;
        throw error;
      }

      // Store relative URL
      const photoUrl = `/uploads/photos/${file.filename}`;
      await candidate.update({ photo_url: photoUrl, updated_at: new Date() });

      return { photoUrl, message: 'Photo uploaded successfully' };
    });
  }

  // ==================== PRIVACY SETTINGS ====================

  async getPrivacySettings(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      return {
        profileVisibility: candidate.profile_visibility || 'public',
        showEmail: candidate.show_email || false,
        showPhone: candidate.show_phone || false,
      };
    });
  }

  async updatePrivacySettings(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      const { profileVisibility, showEmail, showPhone } = req.body;

      const updates: any = {};
      if (profileVisibility !== undefined) {
        if (!['public', 'applied_only', 'hidden'].includes(profileVisibility)) {
          throw Object.assign(new Error('Invalid visibility option'), { status: 400 });
        }
        updates.profile_visibility = profileVisibility;
      }
      if (showEmail !== undefined) updates.show_email = !!showEmail;
      if (showPhone !== undefined) updates.show_phone = !!showPhone;
      updates.updated_at = new Date();

      await candidate.update(updates);

      return { message: 'Privacy settings updated successfully' };
    });
  }

  // ==================== CANDIDATE CV UPLOAD (self) ====================

  async uploadCandidateCv(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const candidate = await Candidate.findOne({ where: { user_id: req.user.id } });
      if (!candidate) {
        const error: any = new Error('Candidate profile not found');
        error.status = 404;
        throw error;
      }

      const file = (req as any).file as Express.Multer.File;
      if (!file) {
        const error: any = new Error('No CV file uploaded');
        error.status = 400;
        throw error;
      }

      const absoluteFilePath = path.isAbsolute(file.path) ? file.path : path.resolve(file.path);

      if (!existsSync(absoluteFilePath)) {
        const error: any = new Error('Uploaded file not found on disk');
        error.status = 500;
        throw error;
      }

      const stats = statSync(absoluteFilePath);
      if (stats.size === 0) {
        const error: any = new Error('Uploaded file is empty');
        error.status = 400;
        throw error;
      }

      // Create CvFile record linked to the authenticated candidate
      const cvFile = await CvFile.create({
        id: randomUUID(),
        candidate_id: candidate.id,
        filename: file.originalname,
        file_path: absoluteFilePath,
        file_size: stats.size,
        status: 'uploaded',
      });

      console.log(`[CandidateCvUpload] CV saved for candidate ${candidate.id} (${candidate.name}), cvFile=${cvFile.id}`);

      // Trigger async processing: matrix generation + matching
      this.processCandidateCvAsync(cvFile.id, candidate.id).catch((err) => {
        console.error(`[CandidateCvUpload] Background processing failed:`, err);
      });

      return {
        message: 'CV uploaded successfully. Processing will begin shortly.',
        cvFile: {
          id: cvFile.id,
          filename: cvFile.filename,
          status: cvFile.status,
          uploadedAt: cvFile.uploaded_at,
        },
      };
    });
  }

  /**
   * Background processing: extract text, generate matrix, run matching
   */
  private async processCandidateCvAsync(cvFileId: string, candidateId: string) {
    try {
      const cvFile = await CvFile.findByPk(cvFileId);
      if (!cvFile) {
        console.error(`[CvProcess] CV file not found: ${cvFileId}`);
        return;
      }

      // Update status
      await cvFile.update({ status: 'parsing' });
      console.log(`[CvProcess] Extracting text from PDF...`);

      // Extract text from PDF
      const cvText = await pdfParserService.extractText(cvFile.file_path);
      if (!cvText || cvText.trim().length === 0) {
        console.error(`[CvProcess] PDF text extraction returned empty content`);
        await cvFile.update({ status: 'failed' });
        return;
      }

      console.log(`[CvProcess] Extracted ${cvText.length} chars. Generating matrix via AI...`);

      // Generate matrix using Qwen
      const matrixData = await qwenService.generateCandidateMatrix(cvText);

      // Delete any old matrices for this candidate (keep latest only)
      await CandidateMatrix.destroy({ where: { candidate_id: candidateId } });

      // Save new matrix
      await CandidateMatrix.create({
        id: randomUUID(),
        candidate_id: candidateId,
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
      await cvFile.update({ status: 'matrix_ready', processed_at: new Date() });
      console.log(`[CvProcess] ✓ Matrix ready for candidate ${candidateId}`);

      // Update candidate headline if not set
      const candidate = await Candidate.findByPk(candidateId);
      if (candidate && !candidate.headline) {
        const topRoles = matrixData.roles?.slice(0, 2) || [];
        if (topRoles.length > 0) {
          await candidate.update({ headline: topRoles.join(' | ') });
        }
      }

      // Trigger match calculation against all published jobs
      console.log(`[CvProcess] Running match calculation against published jobs...`);
      await this.triggerMatchesForCandidate(candidateId);
      console.log(`[CvProcess] ✓ Matching complete for candidate ${candidateId}`);
    } catch (error: any) {
      console.error(`[CvProcess] Processing failed for ${cvFileId}:`, error);
      const cvFile = await CvFile.findByPk(cvFileId);
      if (cvFile) {
        await cvFile.update({ status: 'failed' });
      }
    }
  }

  /**
   * Calculate matches for a candidate against all published jobs
   */
  private async triggerMatchesForCandidate(candidateId: string) {
    try {
      const jobs = await Job.findAll({
        where: { status: 'published' },
        include: [{ model: JobMatrix, as: 'matrix', required: true }],
      });

      console.log(`[CvProcess] Found ${jobs.length} published jobs with matrices`);

      for (const job of jobs) {
        try {
          await matchController.calculateMatchForCandidateAndJob(candidateId, job.id);
        } catch (err) {
          console.error(`[CvProcess] Match failed for job ${job.id}:`, err);
        }
      }
    } catch (error: any) {
      console.error(`[CvProcess] triggerMatchesForCandidate failed:`, error);
    }
  }

  // ==================== CANDIDATE RE-RUN MATCHING (self) ====================

  async rerunCandidateMatching(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const candidate = await Candidate.findOne({
        where: { user_id: req.user.id },
        include: [
          { model: CandidateMatrix, as: 'matrices', required: false },
          { model: CvFile, as: 'cvFiles', required: false },
        ],
      });

      if (!candidate) throw Object.assign(new Error('Candidate not found'), { status: 404 });

      const cvFile = (candidate as any).cvFiles?.[0];
      if (!cvFile) {
        throw Object.assign(new Error('No CV uploaded yet. Upload a CV first.'), { status: 400 });
      }

      // Re-process in background
      this.processCandidateCvAsync(cvFile.id, candidate.id).catch((err) => {
        console.error(`[RerunMatching] Failed:`, err);
      });

      return { message: 'Re-processing started. Skills and matches will update shortly.' };
    });
  }

  // ==================== COMPANY PROFILE ====================

  async getCompanyProfile(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) {
        const error: any = new Error('Company profile not found');
        error.status = 404;
        throw error;
      }

      return {
        id: company.id,
        userId: company.user_id,
        companyName: company.company_name,
        logoUrl: company.logo_url,
        industry: company.industry,
        companySize: company.company_size,
        website: company.website,
        description: company.description,
        country: company.country,
        city: company.city,
        createdAt: company.created_at,
      };
    });
  }

  async updateCompanyProfile(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) {
        const error: any = new Error('Company profile not found');
        error.status = 404;
        throw error;
      }

      const {
        companyName, industry, companySize, website,
        description, country, city,
      } = req.body;

      const updates: any = {};
      if (companyName !== undefined) updates.company_name = companyName;
      if (industry !== undefined) updates.industry = industry;
      if (companySize !== undefined) updates.company_size = companySize;
      if (website !== undefined) updates.website = website;
      if (description !== undefined) updates.description = description;
      if (country !== undefined) updates.country = country;
      if (city !== undefined) updates.city = city;
      updates.updated_at = new Date();

      await company.update(updates);

      return { message: 'Company profile updated successfully' };
    });
  }

  async uploadCompanyLogo(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) {
        const error: any = new Error('Company profile not found');
        error.status = 404;
        throw error;
      }

      const file = (req as any).file;
      if (!file) {
        const error: any = new Error('No logo file provided');
        error.status = 400;
        throw error;
      }

      const logoUrl = `/uploads/logos/${file.filename}`;
      await company.update({ logo_url: logoUrl, updated_at: new Date() });

      return { logoUrl, message: 'Logo uploaded successfully' };
    });
  }
}

export const profileController = new ProfileController();
