import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Schema Validation Tests ─────────────────────────────
// These tests validate the input schemas without requiring a running server.
// Integration tests with supertest require DB/Redis connections.

const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().optional(),
});

const cravingSchema = z.object({
  cravingText: z.string().min(1).max(80),
  expiresInMin: z.number().min(1).max(1440).default(60),
});

const inviteSchema = z.object({
  toUserId: z.string().uuid(),
  dishName: z.string().min(1).max(200),
  message: z.string().max(120).optional(),
});

const acceptInviteSchema = z.object({
  inviteId: z.string().uuid(),
});

const radarQuerySchema = z.object({
  radiusM: z.coerce.number().min(1).max(1000).default(200),
  limit: z.coerce.number().min(1).max(50).default(20),
});

describe('POST /pwa-check-in validation', () => {
  it('should accept valid check-in data', () => {
    const result = checkInSchema.safeParse({ lat: 21.0285, lng: 105.8542 });
    expect(result.success).toBe(true);
  });

  it('should accept check-in with accuracy', () => {
    const result = checkInSchema.safeParse({ lat: 21.0285, lng: 105.8542, accuracyM: 10 });
    expect(result.success).toBe(true);
  });

  it('should reject invalid latitude', () => {
    const result = checkInSchema.safeParse({ lat: 100, lng: 105.8542 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid longitude', () => {
    const result = checkInSchema.safeParse({ lat: 21.0285, lng: 200 });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = checkInSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('POST /current-craving validation', () => {
  it('should accept valid craving', () => {
    const result = cravingSchema.safeParse({ cravingText: 'Bún Bò Huế' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresInMin).toBe(60); // default
    }
  });

  it('should accept craving with custom expiry', () => {
    const result = cravingSchema.safeParse({ cravingText: 'Phở', expiresInMin: 30 });
    expect(result.success).toBe(true);
  });

  it('should reject empty craving text', () => {
    const result = cravingSchema.safeParse({ cravingText: '' });
    expect(result.success).toBe(false);
  });

  it('should reject craving text over 80 chars', () => {
    const result = cravingSchema.safeParse({ cravingText: 'a'.repeat(81) });
    expect(result.success).toBe(false);
  });
});

describe('POST /invite validation', () => {
  it('should accept valid invite', () => {
    const result = inviteSchema.safeParse({
      toUserId: '550e8400-e29b-41d4-a716-446655440000',
      dishName: 'Bún Bò Huế',
    });
    expect(result.success).toBe(true);
  });

  it('should accept invite with message', () => {
    const result = inviteSchema.safeParse({
      toUserId: '550e8400-e29b-41d4-a716-446655440000',
      dishName: 'Phở',
      message: 'Đi ăn không?',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = inviteSchema.safeParse({
      toUserId: 'not-a-uuid',
      dishName: 'Phở',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty dish name', () => {
    const result = inviteSchema.safeParse({
      toUserId: '550e8400-e29b-41d4-a716-446655440000',
      dishName: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject message over 120 chars', () => {
    const result = inviteSchema.safeParse({
      toUserId: '550e8400-e29b-41d4-a716-446655440000',
      dishName: 'Phở',
      message: 'a'.repeat(121),
    });
    expect(result.success).toBe(false);
  });
});

describe('POST /accept-invite validation', () => {
  it('should accept valid invite ID', () => {
    const result = acceptInviteSchema.safeParse({
      inviteId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid invite ID', () => {
    const result = acceptInviteSchema.safeParse({
      inviteId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('GET /radar query validation', () => {
  it('should use defaults when no params', () => {
    const result = radarQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radiusM).toBe(200);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should accept custom radius and limit', () => {
    const result = radarQuerySchema.safeParse({ radiusM: '500', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radiusM).toBe(500);
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject radius over 1000', () => {
    const result = radarQuerySchema.safeParse({ radiusM: '1500' });
    expect(result.success).toBe(false);
  });

  it('should reject limit over 50', () => {
    const result = radarQuerySchema.safeParse({ limit: '100' });
    expect(result.success).toBe(false);
  });
});
