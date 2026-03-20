import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { signToken } from '../utils/jwt.js';
import { eq } from 'drizzle-orm';

const router = Router();

const registerSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        data: null,
        error: '400_BAD_REQUEST',
        meta: {
          requestId: req.headers['x-request-id'] || '',
          timestamp: new Date().toISOString(),
          details: parsed.error.flatten(),
        },
      });
      return;
    }

    const { displayName, email, password } = parsed.data;

    // Check existing user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        data: null,
        error: '409_CONFLICT',
        meta: {
          requestId: req.headers['x-request-id'] || '',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({ displayName, email, passwordHash })
      .returning({ id: users.id, displayName: users.displayName, email: users.email });

    const token = signToken({ userId: user.id, email: user.email || undefined });

    res.status(201).json({
      success: true,
      data: { user, token },
      error: null,
      meta: {
        requestId: req.headers['x-request-id'] || '',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: '500_INTERNAL_SERVER_ERROR',
      meta: {
        requestId: req.headers['x-request-id'] || '',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        data: null,
        error: '400_BAD_REQUEST',
        meta: {
          requestId: req.headers['x-request-id'] || '',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      res.status(401).json({
        success: false,
        data: null,
        error: '401_UNAUTHORIZED',
        meta: {
          requestId: req.headers['x-request-id'] || '',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({
        success: false,
        data: null,
        error: '401_UNAUTHORIZED',
        meta: {
          requestId: req.headers['x-request-id'] || '',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email || undefined });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
        },
        token,
      },
      error: null,
      meta: {
        requestId: req.headers['x-request-id'] || '',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: '500_INTERNAL_SERVER_ERROR',
      meta: {
        requestId: req.headers['x-request-id'] || '',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
