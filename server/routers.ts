import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { makeRequest, type PlacesSearchResult } from "./_core/map";
import { systemRouter } from "./_core/systemRouter";
import { transcribeAudio } from "./_core/voiceTranscription";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { sendToUser } from "./websocket";
import { signJwt } from "./_core/jwt";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already registered",
          });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Create user
        const userId = await db.createUserWithEmail({
          email: input.email,
          passwordHash,
          name: input.name ?? null,
        });

        // Sign JWT
        const token = await signJwt({ userId, email: input.email });

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        const user = await db.getUserById(userId);
        return {
          success: true,
          user: {
            id: user!.id,
            email: user!.email,
            name: user!.name,
            avatarUrl: user!.avatarUrl,
          },
        };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Find user by email
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Verify password
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Sign JWT
        const token = await signJwt({ userId: user.id, email: user.email });

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
          },
        };
      }),
  }),

  // ─── Profile ─────────────────────────────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      const foodLogCount = await db.countFoodLogsByUser(user.id);
      const friendCount = await db.getFriendCount(user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        foodDna: user.foodDna,
        currentCraving: user.currentCraving,
        isRadarActive: user.isRadarActive,
        foodLogCount,
        friendCount,
      };
    }),

    update: protectedProcedure
      .input(z.object({
        bio: z.string().optional(),
        currentCraving: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    uploadAvatar: protectedProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `avatars/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateUserProfile(ctx.user.id, { avatarUrl: url });
        return { url };
      }),

    getById: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getPublicProfile(input.userId);
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const foodLogCount = await db.countFoodLogsByUser(input.userId);
        const friendCount = await db.getFriendCount(input.userId);
        const isFriend = await db.checkFriendship(ctx.user.id, input.userId);
        const foodLogs = await db.getFoodLogsByAnyUser(input.userId, 20);
        return {
          ...profile,
          foodLogCount,
          friendCount,
          isFriend,
          foodLogs,
        };
      }),
  }),

    // ─── Legacy Client Aliases ───────────────────────────────────────
    craving: router({
      set: protectedProcedure
        .input(z.object({ craving: z.string() }))
        .mutation(async ({ ctx, input }) => {
          await db.updateUserProfile(ctx.user.id, { currentCraving: input.craving });
          return { success: true };
        }),
    }),

    food: router({
      feed: publicProcedure
        .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
        .query(async ({ input }) => {
          const { limit = 50, offset = 0 } = input || {};
          return db.getFeedLogs(limit, offset);
        }),

      myLogs: protectedProcedure
        .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
        .query(async ({ ctx, input }) => {
          const { limit = 50, offset = 0 } = input || {};
          return db.getFoodLogsByUser(ctx.user.id, limit, offset);
        }),
    }),

    location: router({
      radar: protectedProcedure
        .input(z.object({ latitude: z.number(), longitude: z.number() }))
        .query(async ({ ctx, input }) => {
          const nearbyUsers = await db.getNearbyUsers(ctx.user.id, input.latitude, input.longitude, 0.2);
          return nearbyUsers.map((u) => ({
            ...u,
            distanceM: Math.round((u.distance || 0) * 1000),
            compatibility: computeCompatibility(ctx.user.foodDna, u.foodDna),
            isFriend: false,
          }));
        }),
    }),

    venues: router({
      suggest: protectedProcedure
        .input(z.object({
          latitude: z.number(),
          longitude: z.number(),
          query: z.string().optional(),
        }))
        .query(async ({ input }) => {
          const keyword = input.query || "restaurant";
          const result = await makeRequest<PlacesSearchResult>(
            "/maps/api/place/nearbysearch/json",
            {
              location: `${input.latitude},${input.longitude}`,
              radius: 500,
              type: "restaurant",
              keyword,
            }
          );
          return result.results.slice(0, 10).map((p) => ({
            placeId: p.place_id,
            name: p.name,
            address: p.formatted_address,
            lat: p.geometry.location.lat,
            lng: p.geometry.location.lng,
            rating: p.rating,
            totalRatings: p.user_ratings_total,
          }));
        }),
    }),

  // ─── Food Logs ───────────────────────────────────────────────────
  foodLog: router({
    create: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        voiceNote: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        locationName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Upload image to S3
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `food/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url: imageUrl } = await storagePut(key, buffer, input.mimeType);

        // 2. AI analysis
        let aiResult: Record<string, unknown> = {};
        try {
          const systemPrompt = `You are a food analysis AI. Analyze the food image and return JSON with these fields:
- dishName: English name of the dish
- dishNameVi: Vietnamese name of the dish
- category: one of "breakfast", "lunch", "dinner", "snack", "dessert", "drink", "street_food"
- ingredients: array of main ingredient strings
- calories: estimated calorie count (number)
- tags: array of tags like "spicy", "sweet", "healthy", "comfort_food", "vegetarian", etc.
${input.voiceNote ? `The user described this food as: "${input.voiceNote}"` : ""}
Return ONLY valid JSON, no markdown.`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
                  { type: "text", text: "Analyze this food image." },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "food_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    dishName: { type: "string" },
                    dishNameVi: { type: "string" },
                    category: { type: "string" },
                    ingredients: { type: "array", items: { type: "string" } },
                    calories: { type: "integer" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                  required: ["dishName", "dishNameVi", "category", "ingredients", "calories", "tags"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          if (typeof content === "string") {
            aiResult = JSON.parse(content);
          }
        } catch (err) {
          console.error("[AI] Food analysis failed:", err);
        }

        // 3. Save to DB
        const logId = await db.createFoodLog({
          userId: ctx.user.id,
          imageUrl,
          dishName: (aiResult.dishName as string) || null,
          dishNameVi: (aiResult.dishNameVi as string) || null,
          category: (aiResult.category as string) || null,
          ingredients: aiResult.ingredients || null,
          calories: (aiResult.calories as number) || null,
          tags: aiResult.tags || null,
          aiAnalysis: aiResult,
          voiceNote: input.voiceNote || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          locationName: input.locationName || null,
        });

        // 4. Check if Food DNA needs update (every 3 logs)
        const logCount = await db.countFoodLogsByUser(ctx.user.id);
        if (logCount % 3 === 0 && logCount > 0) {
          try {
            await computeFoodDna(ctx.user.id);
          } catch (err) {
            console.error("[FoodDNA] Update failed:", err);
          }
        }

        return { id: logId, imageUrl, analysis: aiResult };
      }),

    feed: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        const { limit = 50, offset = 0 } = input || {};
        return db.getFeedLogs(limit, offset);
      }),

    myLogs: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ ctx, input }) => {
        const { limit = 50, offset = 0 } = input || {};
        return db.getFoodLogsByUser(ctx.user.id, limit, offset);
      }),
  }),

  // ─── Radar ───────────────────────────────────────────────────────
  radar: router({
    updateLocation: protectedProcedure
      .input(z.object({ latitude: z.number(), longitude: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserLocation(ctx.user.id, input.latitude, input.longitude);
        return { success: true };
      }),

    toggleActive: protectedProcedure
      .input(z.object({ active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.setRadarActive(ctx.user.id, input.active);
        return { success: true };
      }),

    nearby: protectedProcedure
      .input(z.object({ latitude: z.number(), longitude: z.number() }))
      .query(async ({ ctx, input }) => {
        const nearbyUsers = await db.getNearbyUsers(ctx.user.id, input.latitude, input.longitude, 0.2);
        return nearbyUsers.map((u) => ({
          ...u,
          foodDnaCompatibility: computeCompatibility(ctx.user.foodDna, u.foodDna),
        }));
      }),
  }),

  // ─── Match ───────────────────────────────────────────────────────
  match: router({
    invite: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        craving: z.string().optional(),
        venueName: z.string().optional(),
        venueAddress: z.string().optional(),
        venueLat: z.number().optional(),
        venueLng: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const inviteId = await db.createMatchInvite({
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          senderCraving: input.craving || null,
          venueName: input.venueName || null,
          venueAddress: input.venueAddress || null,
          venueLat: input.venueLat || null,
          venueLng: input.venueLng || null,
        });

        sendToUser(input.receiverId, {
          type: "match_invite",
          inviteId,
          senderId: ctx.user.id,
          senderName: ctx.user.name,
          senderAvatar: ctx.user.avatarUrl,
          craving: input.craving,
          venueName: input.venueName,
        });

        return { inviteId };
      }),

    sendInvite: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        craving: z.string().optional(),
        venueName: z.string().optional(),
        venueAddress: z.string().optional(),
        venueLat: z.number().optional(),
        venueLng: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const inviteId = await db.createMatchInvite({
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          senderCraving: input.craving || null,
          venueName: input.venueName || null,
          venueAddress: input.venueAddress || null,
          venueLat: input.venueLat || null,
          venueLng: input.venueLng || null,
        });

        // Send real-time notification via WebSocket
        sendToUser(input.receiverId, {
          type: "match_invite",
          inviteId,
          senderId: ctx.user.id,
          senderName: ctx.user.name,
          senderAvatar: ctx.user.avatarUrl,
          craving: input.craving,
          venueName: input.venueName,
        });

        return { inviteId };
      }),

    respond: protectedProcedure
      .input(z.object({
        inviteId: z.number(),
        accept: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const status = input.accept ? "accepted" : "declined";
        await db.updateMatchInviteStatus(input.inviteId, status);

        // Get invite details to notify sender
        const invites = await db.getMatchInvitesForUser(ctx.user.id);
        const invite = invites.find((i) => i.id === input.inviteId);
        if (invite) {
          sendToUser(invite.senderId, {
            type: "match_response",
            inviteId: input.inviteId,
            responderId: ctx.user.id,
            responderName: ctx.user.name,
            accepted: input.accept,
          });

          // Auto-create friendship on accept
          if (input.accept) {
            try {
              await db.createFriendship(invite.senderId, ctx.user.id);
              await db.acceptFriendship(invite.senderId);
            } catch { /* friendship may already exist */ }
          }
        }

        return { success: true, status };
      }),

    invites: protectedProcedure.query(async ({ ctx }) => {
      return db.getMatchInvitesForUser(ctx.user.id);
    }),
  }),

  // ─── Venue ───────────────────────────────────────────────────────
  venue: router({
    search: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        craving: z.string().optional(),
        radius: z.number().default(500),
      }))
      .query(async ({ input }) => {
        const keyword = input.craving || "restaurant";
        const result = await makeRequest<PlacesSearchResult>(
          "/maps/api/place/nearbysearch/json",
          {
            location: `${input.latitude},${input.longitude}`,
            radius: input.radius,
            type: "restaurant",
            keyword,
          }
        );
        return result.results.slice(0, 10).map((p) => ({
          placeId: p.place_id,
          name: p.name,
          address: p.formatted_address,
          lat: p.geometry.location.lat,
          lng: p.geometry.location.lng,
          rating: p.rating,
          totalRatings: p.user_ratings_total,
        }));
      }),
  }),

  // ─── Voice ───────────────────────────────────────────────────────
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload audio to S3 first
        const buffer = Buffer.from(input.audioBase64, "base64");
        const ext = input.mimeType.includes("webm") ? "webm" : "mp3";
        const key = `voice/${ctx.user.id}/${Date.now()}.${ext}`;
        const { url: audioUrl } = await storagePut(key, buffer, input.mimeType);

        const result = await transcribeAudio({ audioUrl, language: "vi" });
        if ("error" in result) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { text: result.text, language: result.language };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── Helpers ─────────────────────────────────────────────────────────

function computeCompatibility(dna1: unknown, dna2: unknown): number {
  if (!dna1 || !dna2) return 0;
  try {
    const d1 = dna1 as Record<string, number>;
    const d2 = dna2 as Record<string, number>;
    const allKeys = Array.from(new Set([...Object.keys(d1), ...Object.keys(d2)]));
    if (allKeys.length === 0) return 0;
    let matchScore = 0;
    for (let i = 0; i < allKeys.length; i++) {
      const k = allKeys[i];
      const v1 = d1[k] || 0;
      const v2 = d2[k] || 0;
      matchScore += 1 - Math.abs(v1 - v2);
    }
    return Math.round((matchScore / allKeys.length) * 100);
  } catch {
    return 0;
  }
}

async function computeFoodDna(userId: number) {
  const logs = await db.getFoodLogsByUser(userId, 20);
  if (logs.length < 3) return;

  const categories: Record<string, number> = {};
  const allTags: Record<string, number> = {};
  let totalCalories = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (log.category) categories[log.category] = (categories[log.category] || 0) + 1;
    if (log.calories) totalCalories += log.calories;
    const tags = log.tags as string[] | null;
    if (Array.isArray(tags)) {
      for (let j = 0; j < tags.length; j++) {
        allTags[tags[j]] = (allTags[tags[j]] || 0) + 1;
      }
    }
  }

  // Normalize
  const total = logs.length;
  const normalizedCategories: Record<string, number> = {};
  const catKeys = Object.keys(categories);
  for (let i = 0; i < catKeys.length; i++) {
    normalizedCategories[catKeys[i]] = Math.round((categories[catKeys[i]] / total) * 100) / 100;
  }

  const topTags = Object.entries(allTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, weight: Math.round((count / total) * 100) / 100 }));

  const foodDna = {
    categories: normalizedCategories,
    topTags,
    avgCalories: Math.round(totalCalories / total),
    totalLogs: total,
    lastUpdated: Date.now(),
  };

  await db.updateUserFoodDna(userId, foodDna);
}
