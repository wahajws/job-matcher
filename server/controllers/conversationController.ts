import { Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../db/config.js';
import {
  Conversation,
  Message,
  User,
  Job,
  Application,
  Candidate,
  CompanyProfile,
} from '../db/models/index.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';
import { randomUUID } from 'crypto';
import { notificationService } from '../services/notificationService.js';

export class ConversationController extends BaseController {
  protected model = Conversation;

  // ==================== GET all conversations for current user ====================
  async getConversations(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const userId = req.user.id;

      const conversations = await Conversation.findAll({
        where: {
          [Op.or]: [
            { participant_1_id: userId },
            { participant_2_id: userId },
          ],
        },
        include: [
          { model: User, as: 'participant1', attributes: ['id', 'name', 'email', 'role'] },
          { model: User, as: 'participant2', attributes: ['id', 'name', 'email', 'role'] },
          { model: Job, as: 'job', attributes: ['id', 'title'], required: false },
        ],
        order: [['last_message_at', 'DESC']],
      });

      // Get unread counts and last messages for each conversation
      const result = await Promise.all(
        conversations.map(async (conv: any) => {
          const otherUser = conv.participant_1_id === userId ? conv.participant2 : conv.participant1;

          // Get last message
          const lastMessage = await Message.findOne({
            where: { conversation_id: conv.id },
            order: [['created_at', 'DESC']],
            attributes: ['id', 'content', 'sender_id', 'created_at', 'read'],
          });

          // Get unread count for this user
          const unreadCount = await Message.count({
            where: {
              conversation_id: conv.id,
              sender_id: { [Op.ne]: userId },
              read: false,
            },
          });

          // Get profile info for the other user
          let otherProfileInfo: any = null;
          if (otherUser.role === 'candidate') {
            const candidate = await Candidate.findOne({
              where: { user_id: otherUser.id },
              attributes: ['id', 'name', 'photo_url', 'headline'],
            });
            if (candidate) {
              otherProfileInfo = {
                name: candidate.name,
                photoUrl: candidate.photo_url,
                headline: candidate.headline,
              };
            }
          } else if (otherUser.role === 'company') {
            const company = await CompanyProfile.findOne({
              where: { user_id: otherUser.id },
              attributes: ['id', 'company_name', 'logo_url'],
            });
            if (company) {
              otherProfileInfo = {
                name: company.company_name,
                photoUrl: company.logo_url,
              };
            }
          }

          return {
            id: conv.id,
            otherUser: {
              id: otherUser.id,
              name: otherProfileInfo?.name || otherUser.name,
              photoUrl: otherProfileInfo?.photoUrl || null,
              headline: otherProfileInfo?.headline || null,
              role: otherUser.role,
            },
            job: conv.job ? {
              id: conv.job.id,
              title: conv.job.title,
            } : null,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.sender_id,
              createdAt: lastMessage.created_at,
              read: lastMessage.read,
            } : null,
            unreadCount,
            lastMessageAt: conv.last_message_at,
            createdAt: conv.created_at,
          };
        })
      );

      return result;
    });
  }

  // ==================== GET messages for a conversation ====================
  async getMessages(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { id } = req.params;
      const userId = req.user.id;
      const { page = '1', limit = '50' } = req.query;

      // Verify user is a participant
      const conversation = await Conversation.findOne({
        where: {
          id,
          [Op.or]: [
            { participant_1_id: userId },
            { participant_2_id: userId },
          ],
        },
      });

      if (!conversation) throw Object.assign(new Error('Conversation not found'), { status: 404 });

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      // Mark unread messages as read
      await Message.update(
        { read: true },
        {
          where: {
            conversation_id: id,
            sender_id: { [Op.ne]: userId },
            read: false,
          },
        }
      );

      const { rows: messages, count: total } = await Message.findAndCountAll({
        where: { conversation_id: id },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
        ],
        order: [['created_at', 'ASC']],
        limit: limitNum,
        offset,
      });

      return {
        messages: messages.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderName: m.sender?.name || 'Unknown',
          senderRole: m.sender?.role || 'unknown',
          content: m.content,
          read: m.read,
          createdAt: m.created_at,
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

  // ==================== POST send a message ====================
  async sendMessage(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content || !content.trim()) {
        throw Object.assign(new Error('Message content is required'), { status: 400 });
      }

      // Verify user is a participant
      const conversation = await Conversation.findOne({
        where: {
          id,
          [Op.or]: [
            { participant_1_id: userId },
            { participant_2_id: userId },
          ],
        },
      });

      if (!conversation) throw Object.assign(new Error('Conversation not found'), { status: 404 });

      const message = await Message.create({
        id: randomUUID(),
        conversation_id: id,
        sender_id: userId,
        content: content.trim(),
        read: false,
      });

      // Update conversation last_message_at
      await conversation.update({ last_message_at: new Date() });

      // Notify the other participant
      const otherUserId = conversation.participant_1_id === userId
        ? conversation.participant_2_id
        : conversation.participant_1_id;

      notificationService.create({
        userId: otherUserId,
        type: 'message_received',
        title: 'New Message',
        body: `${req.user.name}: ${content.trim().substring(0, 100)}${content.trim().length > 100 ? '...' : ''}`,
        data: {
          conversationId: id,
          senderId: userId,
          senderName: req.user.name,
        },
      }).catch(console.error);

      return {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        senderName: req.user.name,
        senderRole: req.user.role,
        content: message.content,
        read: message.read,
        createdAt: message.created_at,
      };
    });
  }

  // ==================== POST create a new conversation ====================
  async createConversation(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const { candidateUserId, jobId, message } = req.body;

      if (!candidateUserId) {
        throw Object.assign(new Error('candidateUserId is required'), { status: 400 });
      }

      // Verify the target user exists
      const targetUser = await User.findByPk(candidateUserId);
      if (!targetUser) throw Object.assign(new Error('Target user not found'), { status: 404 });

      const userId = req.user.id;

      // Determine participant order: company user is participant_1, candidate is participant_2
      let p1 = userId;
      let p2 = candidateUserId;
      if (req.user.role === 'candidate') {
        p1 = candidateUserId;
        p2 = userId;
      }

      // Check if conversation already exists
      const existing = await Conversation.findOne({
        where: {
          participant_1_id: p1,
          participant_2_id: p2,
          ...(jobId ? { job_id: jobId } : { job_id: null }),
        },
      });

      if (existing) {
        // Conversation exists — send message there instead
        if (message) {
          const msg = await Message.create({
            id: randomUUID(),
            conversation_id: existing.id,
            sender_id: userId,
            content: message.trim(),
            read: false,
          });
          await existing.update({ last_message_at: new Date() });
        }
        return { id: existing.id, isNew: false };
      }

      // Create new conversation
      const conversation = await Conversation.create({
        id: randomUUID(),
        participant_1_id: p1,
        participant_2_id: p2,
        job_id: jobId || null,
        last_message_at: message ? new Date() : null,
      });

      // Send the first message if provided
      if (message) {
        await Message.create({
          id: randomUUID(),
          conversation_id: conversation.id,
          sender_id: userId,
          content: message.trim(),
          read: false,
        });

        // Notify the other user
        const otherUserId = p1 === userId ? p2 : p1;
        notificationService.create({
          userId: otherUserId,
          type: 'message_received',
          title: 'New Message',
          body: `${req.user.name}: ${message.trim().substring(0, 100)}`,
          data: {
            conversationId: conversation.id,
            senderId: userId,
            senderName: req.user.name,
          },
        }).catch(console.error);
      }

      return { id: conversation.id, isNew: true };
    });
  }

  // ==================== GET unread message count ====================
  async getUnreadCount(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Authentication required'), { status: 401 });

      const userId = req.user.id;

      // Get all conversation IDs for this user
      const conversations = await Conversation.findAll({
        where: {
          [Op.or]: [
            { participant_1_id: userId },
            { participant_2_id: userId },
          ],
        },
        attributes: ['id'],
      });

      const conversationIds = conversations.map((c: any) => c.id);
      if (conversationIds.length === 0) return { unreadCount: 0 };

      const unreadCount = await Message.count({
        where: {
          conversation_id: { [Op.in]: conversationIds },
          sender_id: { [Op.ne]: userId },
          read: false,
        },
      });

      return { unreadCount };
    });
  }
}

export const conversationController = new ConversationController();
