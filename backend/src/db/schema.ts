import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────
export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'blocked',
]);

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'rejected',
  'expired',
]);

export const matchStatusEnum = pgEnum('match_status', [
  'active',
  'completed',
  'cancelled',
]);

// ─── Users ───────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  currentCraving: varchar('current_craving', { length: 80 }),
  cravingExpiresAt: timestamp('craving_expires_at', { withTimezone: true }),
  preferenceText: text('preference_text'),
  locationEnabled: boolean('location_enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Friendships ─────────────────────────────────────────
export const friendships = pgTable('friendships', {
  id: uuid('id').defaultRandom().primaryKey(),
  requesterId: uuid('requester_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  addresseeId: uuid('addressee_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: friendshipStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Food Logs ───────────────────────────────────────────
export const foodLogs = pgTable('food_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  dishName: varchar('dish_name', { length: 200 }),
  confidence: real('confidence'),
  tags: text('tags'), // JSON array stored as text
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Invites ─────────────────────────────────────────────
export const invites = pgTable('invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromUserId: uuid('from_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  toUserId: uuid('to_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  dishName: varchar('dish_name', { length: 200 }).notNull(),
  message: varchar('message', { length: 120 }),
  status: inviteStatusEnum('status').default('pending').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 64 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Matches ─────────────────────────────────────────────
export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  inviteId: uuid('invite_id')
    .references(() => invites.id, { onDelete: 'cascade' })
    .notNull(),
  userAId: uuid('user_a_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  userBId: uuid('user_b_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: matchStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Type exports ────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
export type FoodLog = typeof foodLogs.$inferSelect;
export type NewFoodLog = typeof foodLogs.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
