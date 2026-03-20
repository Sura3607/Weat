import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { db } from '../db/index.js';
import { foodLogs, friendships, users } from '../db/schema.js';
import { eq, and, or, desc, lt, inArray } from 'drizzle-orm';

const router = Router();

const feedQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

// GET /api/v1/feed
router.get('/feed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, req, '400_BAD_REQUEST', 400);
      return;
    }

    const { limit, cursor } = parsed.data;

    // Get friend IDs
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

    const friendIds = friendList.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    if (friendIds.length === 0) {
      sendSuccess(res, req, { items: [], nextCursor: null });
      return;
    }

    // Build query conditions
    let conditions = inArray(foodLogs.userId, friendIds);

    // Apply cursor-based pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      conditions = and(conditions, lt(foodLogs.capturedAt, cursorDate))!;
    }

    // Get food logs from friends
    const logs = await db
      .select({
        foodLogId: foodLogs.id,
        userId: foodLogs.userId,
        dishName: foodLogs.dishName,
        imageUrl: foodLogs.imageUrl,
        capturedAt: foodLogs.capturedAt,
      })
      .from(foodLogs)
      .where(conditions)
      .orderBy(desc(foodLogs.capturedAt))
      .limit(limit + 1); // +1 to check if there are more

    const hasMore = logs.length > limit;
    const items = logs.slice(0, limit);

    // Get author names
    const authorIds = [...new Set(items.map((l) => l.userId))];
    const authorDetails =
      authorIds.length > 0
        ? await db
            .select({ id: users.id, displayName: users.displayName })
            .from(users)
            .where(inArray(users.id, authorIds))
        : [];

    const authorMap = new Map(authorDetails.map((a) => [a.id, a.displayName]));

    const feedItems = items.map((log) => ({
      foodLogId: log.foodLogId,
      authorName: authorMap.get(log.userId) || 'Unknown',
      dishName: log.dishName,
      imageUrl: log.imageUrl,
      capturedAt: log.capturedAt.toISOString(),
    }));

    const nextCursor = hasMore
      ? items[items.length - 1].capturedAt.toISOString()
      : null;

    sendSuccess(res, req, { items: feedItems, nextCursor });
  } catch {
    sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
  }
});

export default router;
