import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  InsertUser, users,
  InsertFoodLog, foodLogs,
  InsertCheckIn, checkIns,
  InsertFriendship, friendships,
  InsertMatchInvite, matchInvites,
  InsertChatMessage, chatMessages,
  InsertPostReaction, postReactions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn("[Database] DATABASE_URL is not set");
    return null;
  }

  // Create pool if it doesn't exist
  if (!_pool) {
    try {
      _pool = mysql.createPool(databaseUrl, {
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Test the connection
      const connection = await _pool.getConnection();
      await connection.ping();
      connection.release();
      
      console.log("[Database] Connected successfully");
      
      _db = drizzle(_pool);
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _pool = null;
      _db = null;
      return null;
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
    caption: foodLogs.caption,
    rating: foodLogs.rating,
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

// ─── Public Profile ─────────────────────────────────────────────────

export async function getPublicProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl,
    bio: users.bio,
    foodDna: users.foodDna,
    currentCraving: users.currentCraving,
    isRadarActive: users.isRadarActive,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFoodLogsByAnyUser(userId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: foodLogs.id,
    imageUrl: foodLogs.imageUrl,
    dishName: foodLogs.dishName,
    dishNameVi: foodLogs.dishNameVi,
    category: foodLogs.category,
    calories: foodLogs.calories,
    tags: foodLogs.tags,
    createdAt: foodLogs.createdAt,
  }).from(foodLogs).where(eq(foodLogs.userId, userId)).orderBy(desc(foodLogs.createdAt)).limit(limit).offset(offset);
}

export async function checkFriendship(userId: number, otherUserId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: friendships.id }).from(friendships)
    .where(and(
      sql`((${friendships.userId} = ${userId} AND ${friendships.friendId} = ${otherUserId}) OR (${friendships.userId} = ${otherUserId} AND ${friendships.friendId} = ${userId}))`,
      eq(friendships.status, "accepted"),
    ))
    .limit(1);
  return result.length > 0;
}

export async function getFriendsList(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: users.id,
    name: users.name,
    avatarUrl: users.avatarUrl,
    currentCraving: users.currentCraving,
    isRadarActive: users.isRadarActive,
  }).from(friendships)
    .innerJoin(users, sql`
      CASE
        WHEN ${friendships.userId} = ${userId} THEN ${friendships.friendId} = ${users.id}
        ELSE ${friendships.userId} = ${users.id}
      END
    `)
    .where(and(
      sql`(${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId})`,
      eq(friendships.status, "accepted"),
      ne(users.id, userId),
    ));
  return result;
}

// ─── Chat Messages ─────────────────────────────────────────────────

export async function createChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values(data);
  return result[0].insertId;
}

export async function getChatMessages(userId: number, otherUserId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: chatMessages.id,
    senderId: chatMessages.senderId,
    receiverId: chatMessages.receiverId,
    content: chatMessages.content,
    isRead: chatMessages.isRead,
    createdAt: chatMessages.createdAt,
    senderName: users.name,
    senderAvatar: users.avatarUrl,
  })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(
      sql`((${chatMessages.senderId} = ${userId} AND ${chatMessages.receiverId} = ${otherUserId}) OR (${chatMessages.senderId} = ${otherUserId} AND ${chatMessages.receiverId} = ${userId}))`
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markMessagesAsRead(userId: number, senderId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(chatMessages)
    .set({ isRead: true })
    .where(and(
      eq(chatMessages.receiverId, userId),
      eq(chatMessages.senderId, senderId),
      eq(chatMessages.isRead, false),
    ));
}

// ─── Post Reactions ────────────────────────────────────────────────

export async function addPostReaction(data: InsertPostReaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remove existing reaction from same user on same post, then add new one
  await db.delete(postReactions).where(and(
    eq(postReactions.foodLogId, data.foodLogId),
    eq(postReactions.userId, data.userId),
  ));
  const result = await db.insert(postReactions).values(data);
  return result[0].insertId;
}

export async function removePostReaction(foodLogId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(postReactions).where(and(
    eq(postReactions.foodLogId, foodLogId),
    eq(postReactions.userId, userId),
  ));
}

export async function getPostReactions(foodLogId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: postReactions.id,
    userId: postReactions.userId,
    emoji: postReactions.emoji,
    userName: users.name,
    userAvatar: users.avatarUrl,
    createdAt: postReactions.createdAt,
  })
    .from(postReactions)
    .leftJoin(users, eq(postReactions.userId, users.id))
    .where(eq(postReactions.foodLogId, foodLogId))
    .orderBy(desc(postReactions.createdAt));
}

export async function getReactionsForFeed(foodLogIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (foodLogIds.length === 0) return [];
  return db.select({
    id: postReactions.id,
    foodLogId: postReactions.foodLogId,
    userId: postReactions.userId,
    emoji: postReactions.emoji,
    userName: users.name,
  })
    .from(postReactions)
    .leftJoin(users, eq(postReactions.userId, users.id))
    .where(sql`${postReactions.foodLogId} IN (${sql.join(foodLogIds.map(id => sql`${id}`), sql`, `)})`);
}

// ─── Food Log Deletion ─────────────────────────────────────────────

export async function deleteFoodLog(logId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(foodLogs).where(and(
    eq(foodLogs.id, logId),
    eq(foodLogs.userId, userId),
  ));
  return (result[0] as any).affectedRows > 0;
}

export async function getFoodLogById(logId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(foodLogs).where(eq(foodLogs.id, logId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
