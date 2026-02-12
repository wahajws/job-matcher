import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (suitable for single-instance apps)
const stores: Record<string, Map<string, RateLimitEntry>> = {};

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores[name]) {
    stores[name] = new Map();
  }
  return stores[name];
}

function getClientKey(req: Request): string {
  // Use IP address + forwarded-for header as key
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim()
    : req.ip || req.socket?.remoteAddress || 'unknown';
  return ip;
}

interface RateLimitOptions {
  /** Store name to separate different limiters */
  name: string;
  /** Window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
  /** Custom message */
  message?: string;
  /** Use user ID as key instead of IP (requires auth) */
  keyByUser?: boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    name,
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyByUser = false,
  } = options;

  const store = getStore(name);

  // Clean up expired entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }, 60_000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyByUser && (req as any).user?.id
      ? (req as any).user.id
      : getClientKey(req);

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      store.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({ message });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - entry.count);
    next();
  };
}

// Pre-configured rate limiters
export const loginLimiter = createRateLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const registerLimiter = createRateLimiter({
  name: 'register',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many registration attempts. Please try again later.',
});

export const apiLimiter = createRateLimiter({
  name: 'api',
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: 'Too many API requests. Please slow down.',
  keyByUser: true,
});

export const uploadLimiter = createRateLimiter({
  name: 'upload',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads. Please try again later.',
  keyByUser: true,
});
