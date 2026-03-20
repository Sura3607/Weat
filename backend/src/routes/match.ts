import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { db } from '../db/index.js';
import { matches, invites } from '../db/schema.js';
import { eq, or, and } from 'drizzle-orm';
import { getRestaurantSuggestions } from '../services/restaurant.js';

const router = Router();

// GET /api/v1/matches/:matchId/restaurant-suggestions
router.get(
  '/matches/:matchId/restaurant-suggestions',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { matchId } = req.params;

      // Verify user is part of this match
      const [match] = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.id, matchId),
            or(
              eq(matches.userAId, userId),
              eq(matches.userBId, userId),
            ),
          ),
        )
        .limit(1);

      if (!match) {
        sendError(res, req, '404_NOT_FOUND', 404);
        return;
      }

      // Get the invite to find the dish name
      const [invite] = await db
        .select({ dishName: invites.dishName })
        .from(invites)
        .where(eq(invites.id, match.inviteId))
        .limit(1);

      const dishName = invite?.dishName || 'Món ăn';

      // Get restaurant suggestions (Exa API or fallback)
      const items = await getRestaurantSuggestions(dishName, undefined, undefined, 3);

      sendSuccess(res, req, { items });
    } catch {
      sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
    }
  },
);

export default router;
