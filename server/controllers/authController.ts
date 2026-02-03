import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../db/models/User.js';
import { BaseController } from '../db/base/BaseController.js';
import type { AuthRequest } from '../middleware/auth.js';

export class AuthController extends BaseController {
  protected model = User;

  async login(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { username, password } = req.body;

      if (!username || !password) {
        const error: any = new Error('Username and password required');
        error.status = 400;
        throw error;
      }

      const user = await User.findOne({ where: { username } });
      if (!user) {
        const error: any = new Error('Invalid credentials');
        error.status = 401;
        throw error;
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        const error: any = new Error('Invalid credentials');
        error.status = 401;
        throw error;
      }

      const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret';
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          name: user.name,
        },
        secret,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    });
  }

  async logout(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      // JWT is stateless, so logout is just a success response
      // Client should remove token
      return { message: 'Logged out successfully' };
    });
  }

  async me(req: AuthRequest, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!req.user) {
        const error: any = new Error('Not authenticated');
        error.status = 401;
        throw error;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        const error: any = new Error('User not found');
        error.status = 404;
        throw error;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    });
  }
}

export const authController = new AuthController();
