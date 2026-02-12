import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Express middleware that validates req.body against a Zod schema.
 * On failure, returns 400 with structured error messages.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          message: 'Validation failed',
          errors: messages,
        });
      }
      next(error);
    }
  };
}

/**
 * Sanitize HTML-like content from string fields to prevent XSS.
 * Strips <script> tags and on* event handlers.
 */
export function sanitizeStrings(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: Record<string, any>) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      // Strip <script> tags
      obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      // Strip on* event handlers from HTML attributes
      obj[key] = obj[key].replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// ==================== Common Schemas ====================

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1, 'Name is required').max(255),
  role: z.enum(['candidate', 'company'], { message: 'Role must be candidate or company' }),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required').max(255).optional(),
  username: z.string().max(255).optional(),
  password: z.string().min(1, 'Password is required').max(128),
}).refine((data) => data.email || data.username, {
  message: 'Email or username is required',
});

export const applicationSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  coverLetter: z.string().max(5000).optional(),
});

export const jobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  department: z.string().max(255).optional().default(''),
  locationType: z.enum(['onsite', 'hybrid', 'remote']).optional().default('onsite'),
  country: z.string().max(255).optional().default(''),
  city: z.string().max(255).optional().default(''),
  description: z.string().min(1, 'Description is required').max(50000),
  mustHaveSkills: z.array(z.string().max(100)).optional().default([]),
  niceToHaveSkills: z.array(z.string().max(100)).optional().default([]),
  minYearsExperience: z.number().int().min(0).max(50).optional().default(0),
  seniorityLevel: z.enum(['internship', 'junior', 'mid', 'senior', 'lead', 'principal']).optional().default('mid'),
  status: z.enum(['draft', 'published', 'closed']).optional().default('draft'),
  deadline: z.string().optional().nullable(),
});

export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
});

export const inviteSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  role: z.enum(['admin', 'recruiter', 'viewer']).optional().default('recruiter'),
});
