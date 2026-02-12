import { Response } from 'express';
import { CompanyMember } from '../db/models/CompanyMember.js';
import { CompanyProfile } from '../db/models/CompanyProfile.js';
import { User } from '../db/models/User.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class TeamController extends BaseController {
  protected model = CompanyMember;

  // GET /api/company/members
  async listMembers(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company not found'), { status: 404 });

      const members = await CompanyMember.findAll({
        where: { company_id: company.id },
        order: [['invited_at', 'DESC']],
      });

      // Enrich with user info
      const enriched = await Promise.all(
        members.map(async (m) => {
          let userName = null;
          if (m.user_id) {
            const u = await User.findByPk(m.user_id, { attributes: ['id', 'name', 'email'] });
            userName = u?.name || null;
          }
          return {
            id: m.id,
            email: m.email,
            role: m.role,
            status: m.status,
            userName,
            userId: m.user_id || null,
            invitedAt: m.invited_at,
            joinedAt: m.joined_at || null,
          };
        })
      );

      return enriched;
    });
  }

  // POST /api/company/members/invite
  async invite(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const { email, role } = req.body;
      if (!email) throw Object.assign(new Error('Email is required'), { status: 400 });

      const validRoles = ['admin', 'recruiter', 'viewer'];
      if (role && !validRoles.includes(role)) {
        throw Object.assign(new Error(`Role must be one of: ${validRoles.join(', ')}`), { status: 400 });
      }

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company not found'), { status: 404 });

      // Check for existing member/invite with this email
      const existing = await CompanyMember.findOne({
        where: { company_id: company.id, email: email.toLowerCase() },
      });
      if (existing) {
        throw Object.assign(new Error('This email has already been invited'), { status: 409 });
      }

      // Check if the invited user exists in the system
      const invitedUser = await User.findOne({ where: { email: email.toLowerCase() } });

      const member = await CompanyMember.create({
        id: generateUUID(),
        company_id: company.id,
        user_id: invitedUser?.id || undefined,
        email: email.toLowerCase(),
        role: role || 'recruiter',
        invited_by: req.user.id,
        status: invitedUser ? 'active' : 'pending',
        joined_at: invitedUser ? new Date() : undefined,
      });

      return {
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status,
        invitedAt: member.invited_at,
      };
    });
  }

  // PATCH /api/company/members/:id/role
  async updateRole(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['admin', 'recruiter', 'viewer'];
      if (!role || !validRoles.includes(role)) {
        throw Object.assign(new Error(`Role must be one of: ${validRoles.join(', ')}`), { status: 400 });
      }

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company not found'), { status: 404 });

      const member = await CompanyMember.findOne({ where: { id, company_id: company.id } });
      if (!member) throw Object.assign(new Error('Member not found'), { status: 404 });

      if (member.role === 'owner') {
        throw Object.assign(new Error('Cannot change owner role'), { status: 403 });
      }

      await member.update({ role });

      return { message: 'Role updated successfully' };
    });
  }

  // DELETE /api/company/members/:id
  async removeMember(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) throw Object.assign(new Error('Auth required'), { status: 401 });

      const { id } = req.params;

      const company = await CompanyProfile.findOne({ where: { user_id: req.user.id } });
      if (!company) throw Object.assign(new Error('Company not found'), { status: 404 });

      const member = await CompanyMember.findOne({ where: { id, company_id: company.id } });
      if (!member) throw Object.assign(new Error('Member not found'), { status: 404 });

      if (member.role === 'owner') {
        throw Object.assign(new Error('Cannot remove the owner'), { status: 403 });
      }

      await member.destroy();

      return { message: 'Member removed successfully' };
    });
  }
}

export const teamController = new TeamController();
