import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { db } from '../db/index.js';
import { matches, invites } from '../db/schema.js';
import { eq, or, and } from 'drizzle-orm';

const router = Router();

// Fallback restaurant suggestions for demo
const FALLBACK_RESTAURANTS = [
  {
    name: 'Phở Thìn Bờ Hồ',
    address: '13 Lò Đúc, Hai Bà Trưng, Hà Nội',
    distanceM: 120,
    rating: 4.5,
    mapsUrl: 'https://maps.google.com/?q=Pho+Thin+Bo+Ho+Ha+Noi',
  },
  {
    name: 'Bún Bò Huế O Xuân',
    address: '1 Hàng Mành, Hoàn Kiếm, Hà Nội',
    distanceM: 250,
    rating: 4.3,
    mapsUrl: 'https://maps.google.com/?q=Bun+Bo+Hue+O+Xuan+Ha+Noi',
  },
  {
    name: 'Cơm Tấm Sài Gòn',
    address: '22 Tông Đản, Hoàn Kiếm, Hà Nội',
    distanceM: 350,
    rating: 4.2,
    mapsUrl: 'https://maps.google.com/?q=Com+Tam+Sai+Gon+Ha+Noi',
  },
];

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

      // TODO: Integrate Exa.ai for real restaurant suggestions (Phase 5)
      // For now, return fallback data
      sendSuccess(res, req, {
        items: FALLBACK_RESTAURANTS,
      });
    } catch {
      sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
    }
  },
);

export default router;
