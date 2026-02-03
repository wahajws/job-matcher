import { Request, Response } from 'express';
import { AdminNote } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { randomUUID } from 'crypto';
import type { AuthRequest } from '../middleware/auth.js';

export class NoteController extends BaseController {
  protected model = AdminNote;

  async list(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { candidateId } = req.params;

      const notes = await AdminNote.findAll({
        where: { candidate_id: candidateId },
        order: [['created_at', 'DESC']],
      });

      return notes.map((n) => ({
        id: n.id,
        candidateId: n.candidate_id,
        authorId: n.author_id,
        authorName: n.author_name,
        content: n.content,
        createdAt: n.created_at,
      }));
    });
  }

  async create(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { candidateId } = req.params;
      const { content } = req.body;

      if (!req.user) {
        const error: any = new Error('Authentication required');
        error.status = 401;
        throw error;
      }

      const note = await AdminNote.create({
        id: randomUUID(),
        candidate_id: candidateId,
        author_id: req.user.id,
        author_name: req.user.name,
        content,
      });

      return {
        id: note.id,
        candidateId: note.candidate_id,
        authorId: note.author_id,
        authorName: note.author_name,
        content: note.content,
        createdAt: note.created_at,
      };
    });
  }
}

export const noteController = new NoteController();
