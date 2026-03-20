import OpenAI from 'openai';
import { config } from '../config/env.js';
import { db } from '../db/index.js';
import { foodLogs, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import redis, { REDIS_KEYS } from '../services/redis.js';
import logger from '../utils/logger.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Food DNA Refresh Job
 * Runs after every 3 photos uploaded by a user.
 * Analyzes recent food logs to generate a preference profile.
 */
export async function enqueueFoodDnaRefresh(userId: string): Promise<void> {
  logger.info({ userId }, 'Food DNA refresh job started');

  try {
    // Get recent food logs (last 10)
    const recentLogs = await db
      .select({
        dishName: foodLogs.dishName,
        tags: foodLogs.tags,
      })
      .from(foodLogs)
      .where(eq(foodLogs.userId, userId))
      .orderBy(desc(foodLogs.createdAt))
      .limit(10);

    if (recentLogs.length < 3) {
      logger.info({ userId }, 'Not enough food logs for DNA refresh');
      return;
    }

    // Build food history summary
    const foodHistory = recentLogs
      .map((log) => {
        const tags = log.tags ? JSON.parse(log.tags) : [];
        return `${log.dishName} (${tags.join(', ')})`;
      })
      .join('\n');

    // Call LLM to generate preference profile
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a food preference analyst. Based on the user's recent food history, generate a concise Vietnamese food preference profile.

Respond in JSON format only:
{
  "preferenceText": "Mô tả ngắn gọn gu ăn uống bằng tiếng Việt (max 200 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "vector": [0.1, 0.2, ...] // 8-dimensional preference vector: [spicy, sweet, salty, sour, noodle, rice, meat, seafood] each 0-1
}`,
        },
        {
          role: 'user',
          content: `Lịch sử ăn uống gần đây:\n${foodHistory}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      logger.warn({ userId, content }, 'Food DNA: could not parse LLM response');
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const preferenceText = parsed.preferenceText || '';
    const vector = Array.isArray(parsed.vector) ? parsed.vector : [];

    // Save preference text to PostgreSQL
    await db
      .update(users)
      .set({
        preferenceText,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Save preference vector to Redis
    if (vector.length > 0) {
      await redis.set(
        REDIS_KEYS.foodDna(userId),
        JSON.stringify(vector),
        'EX',
        86400 * 7, // 7 days TTL
      );
    }

    logger.info(
      { userId, preferenceText, vectorLength: vector.length },
      'Food DNA refresh completed',
    );
  } catch (err) {
    logger.error(
      { userId, error: (err as Error).message },
      'Food DNA refresh failed',
    );
  }
}
