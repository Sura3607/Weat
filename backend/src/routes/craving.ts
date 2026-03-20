import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import redis, { REDIS_KEYS } from '../services/redis.js';

const router = Router();

const cravingSchema = z.object({
  cravingText: z.string().min(1).max(80),
  expiresInMin: z.number().min(1).max(1440).default(60),
});

// POST /api/v1/current-craving
router.post('/current-craving', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const parsed = cravingSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, req, '400_BAD_REQUEST', 400);
      return;
    }

    const { cravingText, expiresInMin } = parsed.data;
    const expiresAt = new Date(Date.now() + expiresInMin * 60 * 1000);

    // Update in PostgreSQL
    await db
      .update(users)
      .set({
        currentCraving: cravingText,
        cravingExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Cache in Redis with TTL
    await redis.set(
      REDIS_KEYS.craving(userId),
      cravingText,
      'EX',
      expiresInMin * 60,
    );

    sendSuccess(res, req, {
      currentCraving: cravingText,
      expiresAt: expiresAt.toISOString(),
    });
  } catch {
    sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
  }
});

export default router;
