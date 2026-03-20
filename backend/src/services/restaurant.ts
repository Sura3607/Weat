import { config } from '../config/env.js';
import logger from '../utils/logger.js';

export interface RestaurantSuggestion {
  name: string;
  address: string;
  distanceM: number;
  rating: number | null;
  mapsUrl: string;
}

// Fallback local restaurant data for demo
const FALLBACK_RESTAURANTS: RestaurantSuggestion[] = [
  {
    name: 'Phở Thìn Bờ Hồ',
    address: '13 Lò Đúc, Hai Bà Trưng, Hà Nội',
    distanceM: 120,
    rating: 4.5,
    mapsUrl: 'https://maps.google.com/?q=Pho+Thin+Bo+Ho+Ha+Noi',
  },
  {
    name: 'Bún Bò Huế O Xuân',
    address: '1 Hàng Mành, Hoàn Kiếm, Hà Nội',
    distanceM: 250,
    rating: 4.3,
    mapsUrl: 'https://maps.google.com/?q=Bun+Bo+Hue+O+Xuan+Ha+Noi',
  },
  {
    name: 'Cơm Tấm Sài Gòn',
    address: '22 Tông Đản, Hoàn Kiếm, Hà Nội',
    distanceM: 350,
    rating: 4.2,
    mapsUrl: 'https://maps.google.com/?q=Com+Tam+Sai+Gon+Ha+Noi',
  },
  {
    name: 'Bánh Mì Phượng',
    address: '25 Lý Quốc Sư, Hoàn Kiếm, Hà Nội',
    distanceM: 180,
    rating: 4.4,
    mapsUrl: 'https://maps.google.com/?q=Banh+Mi+Phuong+Ha+Noi',
  },
  {
    name: 'Bún Chả Hương Liên',
    address: '24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội',
    distanceM: 400,
    rating: 4.6,
    mapsUrl: 'https://maps.google.com/?q=Bun+Cha+Huong+Lien+Ha+Noi',
  },
];

/**
 * Try Exa API for restaurant suggestions, fallback to local data.
 */
export async function getRestaurantSuggestions(
  dishName: string,
  lat?: number,
  lng?: number,
  limit: number = 3,
): Promise<RestaurantSuggestion[]> {
  // Try Exa API if key is configured
  if (config.exa?.apiKey) {
    try {
      const results = await fetchFromExa(dishName, lat, lng, limit);
      if (results.length > 0) return results;
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Exa API failed, using fallback');
    }
  }

  // Fallback: filter local restaurants by dish name relevance
  return getFallbackSuggestions(dishName, limit);
}

/**
 * Fetch restaurant suggestions from Exa API.
 */
async function fetchFromExa(
  dishName: string,
  lat?: number,
  lng?: number,
  limit: number = 3,
): Promise<RestaurantSuggestion[]> {
  const query = lat && lng
    ? `quán ăn ${dishName} gần tọa độ ${lat},${lng}`
    : `quán ăn ${dishName} ngon nhất`;

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.exa!.apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: limit,
      type: 'auto',
      useAutoprompt: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];

  return results.slice(0, limit).map((r: Record<string, unknown>) => ({
    name: (r.title as string) || dishName,
    address: (r.text as string)?.slice(0, 100) || '',
    distanceM: 0,
    rating: null,
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent((r.title as string) || dishName)}`,
  }));
}

/**
 * Get fallback restaurant suggestions from local data.
 */
function getFallbackSuggestions(
  dishName: string,
  limit: number,
): RestaurantSuggestion[] {
  // Simple relevance: shuffle and return top N
  const shuffled = [...FALLBACK_RESTAURANTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}
