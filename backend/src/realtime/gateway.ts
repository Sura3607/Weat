import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

let io: Server;

export interface RealtimeEvent {
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/**
 * Initialize WebSocket gateway with JWT auth handshake.
 */
export function initWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    path: '/ws',
  });

  // Auth middleware for WebSocket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn({ socketId: socket.id }, 'WebSocket auth failed: no token');
      return next(new Error('401_UNAUTHORIZED'));
    }

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      next();
    } catch {
      logger.warn({ socketId: socket.id }, 'WebSocket auth failed: invalid token');
      next(new Error('401_UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    // Join user's personal channel
    socket.join(`user:${userId}`);

    logger.info({ userId, socketId: socket.id }, 'WebSocket connected');

    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'WebSocket disconnected');
    });
  });

  logger.info('WebSocket gateway initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket not initialized. Call initWebSocket first.');
  }
  return io;
}

/**
 * Emit event to a specific user.
 */
export function emitToUser(userId: string, event: RealtimeEvent): void {
  const server = getIO();
  server.to(`user:${userId}`).emit(event.type, event);
  logger.debug({ userId, eventType: event.type, eventId: event.eventId }, 'Event emitted');
}

/**
 * Emit event to multiple users.
 */
export function emitToUsers(userIds: string[], event: RealtimeEvent): void {
  for (const userId of userIds) {
    emitToUser(userId, event);
  }
}
