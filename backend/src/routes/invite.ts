import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { db } from '../db/index.js';
import { invites, matches, users } from '../db/schema.js';
import { eq, and, or } from 'drizzle-orm';

const router = Router();

const inviteSchema = z.object({
  toUserId: z.string().uuid(),
  dishName: z.string().min(1).max(200),
  message: z.string().max(120).optional(),
});

const acceptInviteSchema = z.object({
  inviteId: z.string().uuid(),
});

// POST /api/v1/invite
router.post('/invite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const fromUserId = req.user!.userId;

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, req, '400_BAD_REQUEST', 400);
      return;
    }

    const { toUserId, dishName, message } = parsed.data;

    // Cannot invite self
    if (fromUserId === toUserId) {
      sendError(res, req, '422_UNPROCESSABLE_ENTITY', 422);
      return;
    }

    // Check for existing pending invite between this pair (within 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingInvites = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.fromUserId, fromUserId),
          eq(invites.toUserId, toUserId),
          eq(invites.status, 'pending'),
        ),
      )
      .limit(1);

    const hasPending = existingInvites.some(
      (inv) => inv.createdAt > tenMinutesAgo,
    );

    if (hasPending) {
      sendError(res, req, '409_CONFLICT', 409);
      return;
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    const [invite] = await db
      .insert(invites)
      .values({
        fromUserId,
        toUserId,
        dishName,
        message: message || null,
        status: 'pending',
        expiresAt,
      })
      .returning();

    // TODO: Emit WebSocket event invite.received (Phase 3)

    sendSuccess(res, req, {
      inviteId: invite.id,
      status: invite.status,
    }, 201);
  } catch {
    sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/accept-invite
router.post('/accept-invite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, req, '400_BAD_REQUEST', 400);
      return;
    }

    const { inviteId } = parsed.data;

    // Find the invite
    const [invite] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.id, inviteId),
          eq(invites.toUserId, userId),
          eq(invites.status, 'pending'),
        ),
      )
      .limit(1);

    if (!invite) {
      sendError(res, req, '404_NOT_FOUND', 404);
      return;
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      await db
        .update(invites)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(invites.id, inviteId));

      sendError(res, req, '422_UNPROCESSABLE_ENTITY', 422);
      return;
    }

    // Update invite status
    await db
      .update(invites)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(invites.id, inviteId));

    // Create match
    const [match] = await db
      .insert(matches)
      .values({
        inviteId: invite.id,
        userAId: invite.fromUserId,
        userBId: userId,
        status: 'active',
      })
      .returning();

    // TODO: Emit WebSocket events invite.accepted + match.created (Phase 3)

    sendSuccess(res, req, {
      inviteId: invite.id,
      status: 'accepted',
      matchId: match.id,
    });
  } catch {
    sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
  }
});

export default router;
