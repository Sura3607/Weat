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

function extractAssistantText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "type" in part && (part as any).type === "text") {
          return String((part as any).text ?? "");
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

function parseAssistantJson(content: unknown): Record<string, unknown> | null {
  const text = extractAssistantText(content);
  if (!text) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // Fallback: extract JSON object from markdown or extra surrounding text
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybeJson = text.slice(start, end + 1);
      try {
        return JSON.parse(maybeJson) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

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
    // Validate image before upload - check if it's food/drink
    validateImage: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        try {
          const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a food/drink image classifier. Analyze the image and determine if it contains food or drinks.
Return JSON with:
- isFood: boolean (true if the image contains food, drinks, beverages, or anything edible/drinkable)
- confidence: number between 0 and 1
- reason: brief explanation in Vietnamese
Be lenient - if there's any food or drink visible in the image, even partially, return isFood: true.`,
              },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                  { type: "text", text: "Is this image of food or drinks?" },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "food_validation",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    isFood: { type: "boolean" },
                    confidence: { type: "number" },
                    reason: { type: "string" },
                  },
                  required: ["isFood", "confidence", "reason"],
                  additionalProperties: false,
                },
              },
            },
          });

          const result = parseAssistantJson(response.choices[0]?.message?.content);
          if (result) {
            return {
              isFood: Boolean(result.isFood),
              confidence: Number(result.confidence ?? 0.5),
              reason: String(result.reason ?? "Không thể xác định"),
            };
          }
          // If parsing fails, allow upload (fail-open)
          return { isFood: true, confidence: 0.5, reason: "Không thể xác định" };
        } catch (err) {
          console.error("[AI] Food validation failed:", err);
          // Fail-open: allow upload if validation fails
          return { isFood: true, confidence: 0, reason: "Lỗi hệ thống, cho phép upload" };
        }
      }),

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
        // 0. AI Vision Validation - Check if image is food/drink
        try {
          const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
          const validationResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a food/drink image classifier. Return JSON: { "isFood": boolean }. Return true if the image contains any food, drinks, beverages, or edible items. Be lenient.`,
              },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                  { type: "text", text: "Is this food or drink?" },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "food_check",
                strict: true,
                schema: {
                  type: "object",
                  properties: { isFood: { type: "boolean" } },
                  required: ["isFood"],
                  additionalProperties: false,
                },
              },
            },
          });
          const checkResult = parseAssistantJson(validationResponse.choices[0]?.message?.content);
          if (checkResult && !checkResult.isFood) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Ch\u1EC9 \u0111\u01B0\u1EE3c ph\u00E9p \u0111\u0103ng \u1EA3nh \u0111\u1ED3 \u0103n/n\u01B0\u1EDBc u\u1ED1ng!",
              });
          }
        } catch (err) {
          // Re-throw TRPCError (our validation error)
          if (err instanceof TRPCError) throw err;
          // Otherwise fail-open: allow upload if AI validation itself fails
          console.error("[AI] Food validation in create failed:", err);
        }

        // 1. Upload image to S3
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `food/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url: imageUrl } = await storagePut(key, buffer, input.mimeType);

        // 2. AI analysis (use base64 data URL so LLM can always access the image)
        const analysisDataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
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
                  { type: "image_url", image_url: { url: analysisDataUrl, detail: "high" } },
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

          const parsed = parseAssistantJson(response.choices[0]?.message?.content);
          if (parsed) {
            aiResult = parsed;
          } else {
            throw new Error("AI response is not valid JSON");
          }
        } catch (err) {
          console.error("[AI] Food analysis failed (strict schema):", err);

          // Retry with a more permissive response format for models/proxies
          try {
            const retryResponse = await invokeLLM({
              messages: [
                { role: "system", content: "Analyze food image and return a single JSON object with keys: dishName, dishNameVi, category, ingredients, calories, tags." },
                {
                  role: "user",
                  content: [
                    { type: "image_url", image_url: { url: analysisDataUrl, detail: "auto" } },
                    { type: "text", text: "Return ONLY JSON." },
                  ],
                },
              ],
              response_format: { type: "json_object" },
            });

            const retryParsed = parseAssistantJson(retryResponse.choices[0]?.message?.content);
            if (retryParsed) {
              aiResult = retryParsed;
            }
          } catch (retryErr) {
            console.error("[AI] Food analysis fallback failed:", retryErr);
          }
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

    delete: protectedProcedure
      .input(z.object({ logId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await db.deleteFoodLog(input.logId, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Post not found or not yours" });
        }
        return { success: true };
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

  // ─── Chat ────────────────────────────────────────────────────────
  chat: router({
    send: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        content: z.string().min(1).max(2000),
        matchInviteId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const msgId = await db.createChatMessage({
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          content: input.content,
          matchInviteId: input.matchInviteId || null,
        });

        // Send real-time notification via WebSocket
        sendToUser(input.receiverId, {
          type: "chat_message",
          messageId: msgId,
          senderId: ctx.user.id,
          senderName: ctx.user.name,
          senderAvatar: ctx.user.avatarUrl,
          content: input.content,
        });

        return { messageId: msgId };
      }),

    messages: protectedProcedure
      .input(z.object({
        otherUserId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        // Mark messages as read
        await db.markMessagesAsRead(ctx.user.id, input.otherUserId);
        return db.getChatMessages(ctx.user.id, input.otherUserId, input.limit, input.offset);
      }),
  }),

  // ─── Reactions ───────────────────────────────────────────────────
  reaction: router({
    add: protectedProcedure
      .input(z.object({
        foodLogId: z.number(),
        emoji: z.string().min(1).max(32),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.addPostReaction({
          foodLogId: input.foodLogId,
          userId: ctx.user.id,
          emoji: input.emoji,
        });
        return { id };
      }),

    remove: protectedProcedure
      .input(z.object({ foodLogId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removePostReaction(input.foodLogId, ctx.user.id);
        return { success: true };
      }),

    getForPost: protectedProcedure
      .input(z.object({ foodLogId: z.number() }))
      .query(async ({ input }) => {
        return db.getPostReactions(input.foodLogId);
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
