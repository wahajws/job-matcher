import { Request, Response } from 'express';
import { CvFile } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { qwenService } from '../services/qwen.js';
import { pdfParserService } from '../services/pdfParser.js';
import { CandidateMatrix } from '../db/models/index.js';
import { randomUUID } from 'crypto';
import path from 'path';

export class CvController extends BaseController {
  protected model = CvFile;

  async process(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const cvFileId = Array.isArray(req.params.cvFileId) ? req.params.cvFileId[0] : req.params.cvFileId;
      if (!cvFileId) {
        throw new Error('CV file ID is required');
      }

      const cvFile = await CvFile.findByPk(cvFileId);
      if (!cvFile) {
        const error: any = new Error('CV file not found');
        error.status = 404;
        throw error;
      }

      // Update status to parsing
      await cvFile.update({ status: 'parsing' });

      // Process in background
      this.processCvAsync(cvFileId as string).catch(console.error);

      return { message: 'Processing started', cvFileId };
    });
  }

  private async processCvAsync(cvFileId: string) {
    try {
      const cvFile = await CvFile.findByPk(cvFileId);
      if (!cvFile) return;

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
    } catch (error: any) {
      console.error('CV processing failed:', error);
      const cvFile = await CvFile.findByPk(cvFileId);
      if (cvFile) {
        await cvFile.update({ status: 'failed' });
      }
    }
  }

  async getStatus(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const cvFileId = Array.isArray(req.params.cvFileId) ? req.params.cvFileId[0] : req.params.cvFileId;
      if (!cvFileId) {
        throw new Error('CV file ID is required');
      }

      const cvFile = await CvFile.findByPk(cvFileId);
      if (!cvFile) {
        const error: any = new Error('CV file not found');
        error.status = 404;
        throw error;
      }

      return {
        id: cvFile.id,
        status: cvFile.status,
        uploadedAt: cvFile.uploaded_at,
        processedAt: cvFile.processed_at,
      };
    });
  }

  async download(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const cvFileId = Array.isArray(req.params.cvFileId) ? req.params.cvFileId[0] : req.params.cvFileId;
      if (!cvFileId) {
        throw new Error('CV file ID is required');
      }

      const cvFile = await CvFile.findByPk(cvFileId);
      if (!cvFile) {
        const error: any = new Error('CV file not found');
        error.status = 404;
        throw error;
      }

      res.download(cvFile.file_path, cvFile.filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Download failed' });
          }
        }
      });
    });
  }
}

export const cvController = new CvController();
