import { v4 as uuidv4 } from 'uuid';
import { emitToUser, RealtimeEvent } from './gateway.js';

/**
 * Emit invite.received event to the recipient.
 */
export function emitInviteReceived(
  toUserId: string,
  payload: {
    inviteId: string;
    fromUserId: string;
    fromDisplayName: string;
    dishName: string;
    message?: string | null;
  },
): void {
  const event: RealtimeEvent = {
    eventId: `evt_${uuidv4()}`,
    type: 'invite.received',
    payload,
    createdAt: new Date().toISOString(),
  };
  emitToUser(toUserId, event);
}

/**
 * Emit invite.accepted event to the invite sender.
 */
export function emitInviteAccepted(
  toUserId: string,
  payload: {
    inviteId: string;
    acceptedByUserId: string;
    acceptedByDisplayName: string;
  },
): void {
  const event: RealtimeEvent = {
    eventId: `evt_${uuidv4()}`,
    type: 'invite.accepted',
    payload,
    createdAt: new Date().toISOString(),
  };
  emitToUser(toUserId, event);
}

/**
 * Emit match.created event to both users.
 */
export function emitMatchCreated(
  userIds: [string, string],
  payload: {
    matchId: string;
    inviteId: string;
    userAId: string;
    userBId: string;
    dishName: string;
  },
): void {
  const event: RealtimeEvent = {
    eventId: `evt_${uuidv4()}`,
    type: 'match.created',
    payload,
    createdAt: new Date().toISOString(),
  };

  for (const userId of userIds) {
    emitToUser(userId, event);
  }
}
