import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { db } from '../db/index.js';
import { foodLogs } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { config } from '../config/env.js';
import { analyzeFoodImage } from '../services/vision.js';
import { enqueueFoodDnaRefresh } from '../jobs/foodDna.js';

const router = Router();

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only jpg, png, webp allowed.'));
    }
  },
});

// POST /api/v1/upload-food-locket
router.post(
  '/upload-food-locket',
  authMiddleware,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      if (!req.file) {
        sendError(res, req, '400_BAD_REQUEST', 400);
        return;
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const capturedAt = req.body.capturedAt
        ? new Date(req.body.capturedAt)
        : new Date();

      // AI Vision analysis
      let dishName = 'Analyzing...';
      let confidence = 0;
      let tags: string[] = [];

      try {
        const visionResult = await analyzeFoodImage(req.file.path);
        dishName = visionResult.dishName;
        confidence = visionResult.confidence;
        tags = visionResult.tags;
      } catch {
        // Fallback to placeholder if vision fails
      }

      // Save food log
      const [foodLog] = await db
        .insert(foodLogs)
        .values({
          userId,
          imageUrl,
          thumbnailUrl: imageUrl, // Same as original for now
          dishName,
          confidence,
          tags: JSON.stringify(tags),
          capturedAt,
        })
        .returning();

      // Check if user has 3+ new photos for food-dna-refresh job
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(foodLogs)
        .where(eq(foodLogs.userId, userId));

      const totalPhotos = Number(countResult[0]?.count || 0);
      const shouldRefreshDna = totalPhotos % 3 === 0 && totalPhotos > 0;

      // Enqueue food-dna-refresh job if threshold met
      if (shouldRefreshDna) {
        enqueueFoodDnaRefresh(userId).catch(() => {});
      }

      sendSuccess(res, req, {
        foodLogId: foodLog.id,
        dishName: foodLog.dishName,
        confidence: foodLog.confidence,
        tags,
        thumbnailUrl: foodLog.thumbnailUrl,
        _dnaRefreshQueued: shouldRefreshDna,
      }, 201);
    } catch {
      sendError(res, req, '500_INTERNAL_SERVER_ERROR', 500);
    }
  },
);

export default router;
