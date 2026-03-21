/**
 * Google Maps backend helper: Direct Google Maps API → Manus Forge fallback
 */
import { ENV } from "./env";

// ─── Types ────────────────────────────────────────────────────────

export type LatLng = { lat: number; lng: number };

export type PlacesSearchResult = {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: { location: LatLng };
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    types: string[];
  }>;
  status: string;
};

export type DirectionsResult = {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
      start_location: LatLng;
      end_location: LatLng;
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        travel_mode: string;
        start_location: LatLng;
        end_location: LatLng;
      }>;
    }>;
    overview_polyline: { points: string };
    summary: string;
  }>;
  status: string;
};

export type GeocodingResult = {
  results: Array<{
    formatted_address: string;
    geometry: { location: LatLng };
    place_id: string;
    types: string[];
  }>;
  status: string;
};

// ─── Core Request ─────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

/**
 * Make request to Google Maps API.
 * Priority: Direct Google Maps API key → Manus Forge proxy
 */
export async function makeRequest<T = unknown>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options: RequestOptions = {}
): Promise<T> {
  // 1. Direct Google Maps API
  if (ENV.googleMapsApiKey) {
    const url = new URL(`https://maps.googleapis.com${endpoint}`);
    url.searchParams.set("key", ENV.googleMapsApiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString(), {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Maps API error (${res.status}): ${errText}`);
    }
    return (await res.json()) as T;
  }

  // 2. Manus Forge proxy fallback
  if (ENV.forgeApiKey && ENV.forgeApiUrl) {
    const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
    const url = new URL(`${baseUrl}/v1/maps/proxy${endpoint}`);
    url.searchParams.set("key", ENV.forgeApiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString(), {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Maps proxy error (${res.status}): ${errText}`);
    }
    return (await res.json()) as T;
  }

  throw new Error("No Maps API configured. Set GOOGLE_MAPS_API_KEY or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY.");
}
