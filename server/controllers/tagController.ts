import { Request, Response } from 'express';
import { CandidateTag } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import { randomUUID } from 'crypto';

export class TagController extends BaseController {
  protected model = CandidateTag;

  async list(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { candidateId } = req.params;

      const tags = await CandidateTag.findAll({
        where: { candidate_id: candidateId },
      });

      return tags.map((t) => ({
        id: t.id,
        name: t.tag_name,
        color: t.tag_color,
      }));
    });
  }

  async create(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { candidateId } = req.params;
      const { name, color } = req.body;

      const tag = await CandidateTag.create({
        id: randomUUID(),
        candidate_id: candidateId,
        tag_name: name,
        tag_color: color || '#3b82f6',
      });

      return {
        id: tag.id,
        name: tag.tag_name,
        color: tag.tag_color,
      };
    });
  }

  async delete(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { candidateId, tagId } = req.params;

      const tag = await CandidateTag.findOne({
        where: { id: tagId, candidate_id: candidateId },
      });

      if (!tag) {
        const error: any = new Error('Tag not found');
        error.status = 404;
        throw error;
      }

      await tag.destroy();
      return { message: 'Tag deleted successfully' };
    });
  }
}

export const tagController = new TagController();
