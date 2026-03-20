import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { findNearbyUsers } from '../services/geo.js';
import redis, { REDIS_KEYS } from '../services/redis.js';
import { db } from '../db/index.js';
import { users, friendships } from '../db/schema.js';
import { eq, or, and, inArray } from 'drizzle-orm';

const router = Router();

const radarQuerySchema = z.object({
  radiusM: z.coerce.number().min(1).max(1000).default(200),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// GET /api/v1/radar
router.get('/radar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const parsed = radarQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, req, '400_BAD_REQUEST', 400);
      return;
    }

    const { radiusM, limit } = parsed.data;

    // Find nearby users from Redis Geospatial
    const nearbyUsers = await findNearbyUsers(userId, radiusM, limit);

    if (nearbyUsers.length === 0) {
      sendSuccess(res, req, { items: [] });
      return;
    }

    const nearbyUserIds = nearbyUsers.map((u) => u.userId);

    // Get user details from DB
    const userDetails = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        currentCraving: users.currentCraving,
      })
      .from(users)
      .where(inArray(users.id, nearbyUserIds));

    // Get friendships
    const friendList = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId),
          ),
          eq(friendships.status, 'accepted'),
        ),
      );

    const friendIds = new Set(
      friendList.map((f) =>
        f.requesterId === userId ? f.addresseeId : f.requesterId,
      ),
    );

    // Build response items
    const userMap = new Map(userDetails.map((u) => [u.id, u]));
    const distanceMap = new Map(nearbyUsers.map((u) => [u.userId, u.distanceM]));

    const items = nearbyUserIds
      .map((uid) => {
        const user = userMap.get(uid);
        if (!user) return null;

        const isFriend = friendIds.has(uid);
        const distanceM = distanceMap.get(uid) || 0;

        // Simple match score: friends get bonus, closer = higher
        const distanceScore = Math.max(0, 100 - (distanceM / radiusM) * 50);
        const friendBonus = isFriend ? 30 : 0;
        const matchScore = Math.min(100, Math.round(distanceScore + friendBonus));

        return {
          userId: user.id,
          displayName: user.displayName,
          isFriend,
          distanceM,
          matchScore,
          currentCraving: user.currentCraving || null,
          avatarUrl: user.avatarUrl || null,
        };
      })
      .filter(Boolean);

    // Sort: friends first, then by distance, then by match score
    items.sort((a, b) => {
      if (!a || !b) return 0;
      if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
      if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
      return b.matchScore - a.matchScore;
    });

    sendSuccess(res, req, { items: items.slice(0, limit) });
  } catch {
    sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
  }
});

export default router;
