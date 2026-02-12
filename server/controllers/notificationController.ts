import { Response } from 'express';
import { Op } from 'sequelize';
import { Notification } from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';

export class NotificationController extends BaseController {
  protected model = Notification;

  // ==================== GET notifications for current user ====================
  async list(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { unreadOnly, page = '1', limit = '20' } = req.query;

      const where: any = { user_id: req.user.id };
      if (unreadOnly === 'true') {
        where.read = false;
      }

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = Math.min(parseInt(limit as string, 10) || 20, 50);
      const offset = (pageNum - 1) * limitNum;

      const { rows: notifications, count: total } = await Notification.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset,
      });

      return {
        notifications: notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          read: n.read,
          createdAt: n.created_at,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    });
  }

  // ==================== GET unread count ====================
  async unreadCount(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const count = await Notification.count({
        where: { user_id: req.user.id, read: false },
      });

      return { unreadCount: count };
    });
  }

  // ==================== MARK single notification as read ====================
  async markRead(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { id } = req.params;

      const notification = await Notification.findOne({
        where: { id, user_id: req.user.id },
      });

      if (!notification) throw Object.assign(new Error('Notification not found'), { status: 404 });

      await notification.update({ read: true });

      return { message: 'Notification marked as read' };
    });
  }

  // ==================== MARK ALL as read ====================
  async markAllRead(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const [updatedCount] = await Notification.update(
        { read: true },
        { where: { user_id: req.user.id, read: false } }
      );

      return { message: `${updatedCount} notifications marked as read` };
    });
  }
}

export const notificationController = new NotificationController();
