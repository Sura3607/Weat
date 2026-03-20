import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.js';
import { updateUserLocation } from '../services/geo.js';
import redis, { REDIS_KEYS } from '../services/redis.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().optional(),
});

// POST /api/v1/pwa-check-in
router.post('/pwa-check-in', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Check if user has location enabled
    const [user] = await db
      .select({ locationEnabled: users.locationEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.locationEnabled) {
      sendError(res, req, '403_FORBIDDEN', 403);
      return;
    }

    // Rate limit: 1 request / 10 seconds / user
    const rateLimitKey = REDIS_KEYS.rateLimit('check-in', userId);
    const existing = await redis.get(rateLimitKey);
    if (existing) {
      sendError(res, req, '429_TOO_MANY_REQUESTS', 429);
      return;
    }

    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, req, '400_BAD_REQUEST', 400);
      return;
    }

    const { lat, lng } = parsed.data;

    // Update location in Redis
    await updateUserLocation(userId, { lat, lng });

    // Set rate limit (10 seconds TTL)
    await redis.set(rateLimitKey, '1', 'EX', 10);

    // Generate simple geohash representation
    const geoHash = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    sendSuccess(res, req, {
      locationUpdated: true,
      geoHash,
    });
  } catch {
    sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
  }
});

export default router;
