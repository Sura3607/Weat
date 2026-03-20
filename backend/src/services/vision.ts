import OpenAI from 'openai';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export interface VisionResult {
  dishName: string;
  confidence: number;
  tags: string[];
}

/**
 * Analyze a food image using OpenAI Vision (gpt-4o-mini).
 */
export async function analyzeFoodImage(imagePath: string): Promise<VisionResult> {
  try {
    // Read image and convert to base64
    const absolutePath = path.resolve(imagePath);
    const imageBuffer = fs.readFileSync(absolutePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a Vietnamese food recognition expert. Analyze the food image and respond in JSON format only:
{
  "dishName": "Tên món ăn bằng tiếng Việt",
  "confidence": 0.0-1.0,
  "tags": ["tag1", "tag2", "tag3"]
}
Tags should describe: flavor profile (cay, ngọt, mặn, chua, thanh), texture (nước, khô, giòn), main ingredient (bò, gà, heo, hải sản, rau), cooking style (nướng, chiên, hấp, luộc).
If the image is not food, return: {"dishName": "Không phải món ăn", "confidence": 0, "tags": []}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'low',
              },
            },
            {
              type: 'text',
              text: 'Nhận diện món ăn trong ảnh này.',
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ content }, 'Vision: could not parse JSON from response');
      return { dishName: 'Không nhận diện được', confidence: 0, tags: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as VisionResult;
    return {
      dishName: parsed.dishName || 'Không nhận diện được',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (err) {
    logger.error({ error: (err as Error).message }, 'Vision analysis failed');
    return { dishName: 'Lỗi nhận diện', confidence: 0, tags: [] };
  }
}
