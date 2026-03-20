import Redis from 'ioredis';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error({ error: err.message }, 'Redis connection error');
});

// ─── Key Conventions ─────────────────────────────────────
// Geospatial:
//   weat:geo:users          - GEO set of all active user locations
// User presence:
//   weat:presence:{userId}  - Hash with lat, lng, updatedAt
// Craving:
//   weat:craving:{userId}   - String with current craving text (TTL)
// Food DNA vector:
//   weat:dna:{userId}       - String with preference vector JSON
// Rate limit:
//   weat:ratelimit:{endpoint}:{userId} - Counter with TTL

export const REDIS_KEYS = {
  GEO_USERS: 'weat:geo:users',
  presence: (userId: string) => `weat:presence:${userId}`,
  craving: (userId: string) => `weat:craving:${userId}`,
  foodDna: (userId: string) => `weat:dna:${userId}`,
  rateLimit: (endpoint: string, userId: string) => `weat:ratelimit:${endpoint}:${userId}`,
} as const;

export default redis;
