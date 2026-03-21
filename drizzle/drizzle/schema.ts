import { boolean, float, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  foodDna: json("foodDna"),
  latitude: float("latitude"),
  longitude: float("longitude"),
  locationUpdatedAt: timestamp("locationUpdatedAt"),
  currentCraving: varchar("currentCraving", { length: 255 }),
  cravingUpdatedAt: timestamp("cravingUpdatedAt"),
  isRadarActive: boolean("isRadarActive").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Food Logs ───────────────────────────────────────────────────────
export const foodLogs = mysqlTable("food_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  dishName: varchar("dishName", { length: 255 }),
  dishNameVi: varchar("dishNameVi", { length: 255 }),
  category: varchar("category", { length: 100 }),
  ingredients: json("ingredients"),
  calories: int("calories"),
  tags: json("tags"),
  aiAnalysis: json("aiAnalysis"),
  voiceNote: text("voiceNote"),
  latitude: float("latitude"),
  longitude: float("longitude"),
  locationName: varchar("locationName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = typeof foodLogs.$inferInsert;

// ─── Check-ins ───────────────────────────────────────────────────────
export const checkIns = mysqlTable("check_ins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  latitude: float("latitude").notNull(),
  longitude: float("longitude").notNull(),
  locationName: varchar("locationName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;

// ─── Friendships ─────────────────────────────────────────────────────
export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  friendId: int("friendId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

// ─── Match Invites ───────────────────────────────────────────────────
export const matchInvites = mysqlTable("match_invites", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  senderCraving: varchar("senderCraving", { length: 255 }),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "expired"]).default("pending").notNull(),
  venueName: varchar("venueName", { length: 255 }),
  venueAddress: text("venueAddress"),
  venueLat: float("venueLat"),
  venueLng: float("venueLng"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchInvite = typeof matchInvites.$inferSelect;
export type InsertMatchInvite = typeof matchInvites.$inferInsert;
