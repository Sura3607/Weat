import redis, { REDIS_KEYS } from './redis.js';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface NearbyUser {
  userId: string;
  distanceM: number;
}

/**
 * Update user location in Redis Geospatial index.
 */
export async function updateUserLocation(userId: string, location: GeoLocation): Promise<void> {
  // GEOADD key longitude latitude member
  await redis.geoadd(REDIS_KEYS.GEO_USERS, location.lng, location.lat, userId);

  // Store presence metadata
  await redis.hset(REDIS_KEYS.presence(userId), {
    lat: location.lat.toString(),
    lng: location.lng.toString(),
    updatedAt: new Date().toISOString(),
  });

  // Set TTL for presence (expire after 30 minutes of inactivity)
  await redis.expire(REDIS_KEYS.presence(userId), 1800);
}

/**
 * Remove user from geospatial index.
 */
export async function removeUserLocation(userId: string): Promise<void> {
  await redis.zrem(REDIS_KEYS.GEO_USERS, userId);
  await redis.del(REDIS_KEYS.presence(userId));
}

/**
 * Find nearby users within a given radius (in meters).
 */
export async function findNearbyUsers(
  userId: string,
  radiusM: number = 200,
  limit: number = 20,
): Promise<NearbyUser[]> {
  // Use georadius with FROMMEMBER approach
  // georadiusbymember returns [member, distance, member, distance, ...]
  const results = await redis.call(
    'GEORADIUSBYMEMBER',
    REDIS_KEYS.GEO_USERS,
    userId,
    radiusM.toString(),
    'm',
    'COUNT',
    (limit + 1).toString(),
    'ASC',
    'WITHDIST',
  ) as string[][];

  const nearby: NearbyUser[] = [];

  if (Array.isArray(results)) {
    for (const item of results) {
      if (Array.isArray(item) && item.length >= 2) {
        const memberId = item[0] as string;
        const distance = parseFloat(item[1] as string);

        // Exclude self
        if (memberId !== userId) {
          nearby.push({
            userId: memberId,
            distanceM: Math.round(distance),
          });
        }
      }
    }
  }

  return nearby.slice(0, limit);
}

/**
 * Get distance between two users in meters.
 */
export async function getDistanceBetweenUsers(
  userIdA: string,
  userIdB: string,
): Promise<number | null> {
  const result = await redis.call(
    'GEODIST',
    REDIS_KEYS.GEO_USERS,
    userIdA,
    userIdB,
    'm',
  ) as string | null;
  return result ? Math.round(parseFloat(result)) : null;
}
