/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ─── Weat-specific types ─────────────────────────────────────────────

export type FoodDna = {
  categories: Record<string, number>;
  topTags: Array<{ tag: string; weight: number }>;
  avgCalories: number;
  totalLogs: number;
  lastUpdated: number;
};

export type NearbyUser = {
  id: number;
  name: string | null;
  avatarUrl: string | null;
  foodDna: unknown;
  currentCraving: string | null;
  latitude: number | null;
  longitude: number | null;
  isRadarActive: boolean | null;
  locationUpdatedAt: Date | null;
  distance: number;
  foodDnaCompatibility: number;
};

export type VenueSuggestion = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | undefined;
  totalRatings: number | undefined;
};

export type WsMessage =
  | { type: "match_invite"; inviteId: number; senderId: number; senderName: string | null; senderAvatar: string | null; craving: string | null; venueName: string | null }
  | { type: "match_response"; inviteId: number; responderId: number; responderName: string | null; accepted: boolean };
