import { Request, Response } from 'express';
import { Candidate } from '../db/models/Candidate.js';
import { CompanyProfile } from '../db/models/CompanyProfile.js';
import { CvFile } from '../db/models/CvFile.js';
import { CandidateMatrix } from '../db/models/CandidateMatrix.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';

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
