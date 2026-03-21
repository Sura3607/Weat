import { and, desc, eq, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertFoodLog, foodLogs,
  InsertCheckIn, checkIns,
  InsertFriendship, friendships,
  InsertMatchInvite, matchInvites,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithEmail(data: {
  email: string;
  passwordHash: string;
  name?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name ?? null,
    loginMethod: "email",
    role: "user",
    lastSignedIn: new Date(),
  });
  return result[0].insertId;
}

export async function updateUserProfile(userId: number, data: {
  avatarUrl?: string | null;
  bio?: string | null;
  currentCraving?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.avatarUrl !== undefined) updateSet.avatarUrl = data.avatarUrl;
  if (data.bio !== undefined) updateSet.bio = data.bio;
  if (data.currentCraving !== undefined) {
    updateSet.currentCraving = data.currentCraving;
    updateSet.cravingUpdatedAt = new Date();
  }
  if (Object.keys(updateSet).length > 0) {
    await db.update(users).set(updateSet).where(eq(users.id, userId));
  }
}

export async function updateUserLocation(userId: number, lat: number, lng: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    latitude: lat,
    longitude: lng,
    locationUpdatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function updateUserFoodDna(userId: number, foodDna: unknown) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ foodDna }).where(eq(users.id, userId));
}

export async function setRadarActive(userId: number, active: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isRadarActive: active }).where(eq(users.id, userId));
}

export async function getNearbyUsers(userId: number, lat: number, lng: number, radiusKm: number = 0.2) {
  const db = await getDb();
  if (!db) return [];
  // Haversine approximation using MySQL
  const result = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl,
    foodDna: users.foodDna,
    currentCraving: users.currentCraving,
    latitude: users.latitude,
    longitude: users.longitude,
    isRadarActive: users.isRadarActive,
    locationUpdatedAt: users.locationUpdatedAt,
    distance: sql<number>`(6371 * acos(cos(radians(${lat})) * cos(radians(${users.latitude})) * cos(radians(${users.longitude}) - radians(${lng})) + sin(radians(${lat})) * sin(radians(${users.latitude}))))`.as("distance"),
  })
    .from(users)
    .where(and(
      ne(users.id, userId),
      eq(users.isRadarActive, true),
      sql`${users.latitude} IS NOT NULL`,
      sql`${users.longitude} IS NOT NULL`,
    ))
    .having(sql`distance <= ${radiusKm}`)
    .orderBy(sql`distance`)
    .limit(20);
  return result;
}

// ─── Food Logs ───────────────────────────────────────────────────────

export async function createFoodLog(data: InsertFoodLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(foodLogs).values(data);
  return result[0].insertId;
}

export async function getFoodLogsByUser(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foodLogs).where(eq(foodLogs.userId, userId)).orderBy(desc(foodLogs.createdAt)).limit(limit).offset(offset);
}

export async function getFeedLogs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const logs = await db.select({
    id: foodLogs.id,
    userId: foodLogs.userId,
    imageUrl: foodLogs.imageUrl,
    dishName: foodLogs.dishName,
    dishNameVi: foodLogs.dishNameVi,
    category: foodLogs.category,
    ingredients: foodLogs.ingredients,
    calories: foodLogs.calories,
    tags: foodLogs.tags,
    voiceNote: foodLogs.voiceNote,
    latitude: foodLogs.latitude,
    longitude: foodLogs.longitude,
    locationName: foodLogs.locationName,
    createdAt: foodLogs.createdAt,
    userName: users.name,
    userAvatar: users.avatarUrl,
  })
    .from(foodLogs)
    .leftJoin(users, eq(foodLogs.userId, users.id))
    .orderBy(desc(foodLogs.createdAt))
    .limit(limit)
    .offset(offset);
  return logs;
}

export async function countFoodLogsByUser(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(foodLogs).where(eq(foodLogs.userId, userId));
  return result[0]?.count ?? 0;
}

// ─── Friendships ─────────────────────────────────────────────────────

export async function createFriendship(userId: number, friendId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(friendships).values({ userId, friendId, status: "pending" });
}

export async function acceptFriendship(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(friendships).set({ status: "accepted" }).where(eq(friendships.id, id));
}

export async function getFriendCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(friendships)
    .where(and(
      sql`(${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId})`,
      eq(friendships.status, "accepted"),
    ));
  return result[0]?.count ?? 0;
}

// ─── Match Invites ───────────────────────────────────────────────────

export async function createMatchInvite(data: InsertMatchInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(matchInvites).values(data);
  return result[0].insertId;
}

export async function getMatchInvitesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: matchInvites.id,
    senderId: matchInvites.senderId,
    receiverId: matchInvites.receiverId,
    senderCraving: matchInvites.senderCraving,
    status: matchInvites.status,
    venueName: matchInvites.venueName,
    venueAddress: matchInvites.venueAddress,
    venueLat: matchInvites.venueLat,
    venueLng: matchInvites.venueLng,
    createdAt: matchInvites.createdAt,
    senderName: users.name,
    senderAvatar: users.avatarUrl,
  })
    .from(matchInvites)
    .leftJoin(users, eq(matchInvites.senderId, users.id))
    .where(eq(matchInvites.receiverId, userId))
    .orderBy(desc(matchInvites.createdAt))
    .limit(50);
}

export async function updateMatchInviteStatus(id: number, status: "accepted" | "declined" | "expired") {
  const db = await getDb();
  if (!db) return;
  await db.update(matchInvites).set({ status }).where(eq(matchInvites.id, id));
}
