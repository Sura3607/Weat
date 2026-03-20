/**
 * Demo Fallback Data
 * Used when DB/Redis is unavailable or for demo stability.
 */

export const DEMO_USERS = [
  {
    id: 'demo-user-a',
    displayName: 'Minh (Demo)',
    email: 'minh@weat.demo',
    currentCraving: 'Bún Bò Huế',
    avatarUrl: null,
  },
  {
    id: 'demo-user-b',
    displayName: 'Linh (Demo)',
    email: 'linh@weat.demo',
    currentCraving: 'Phở Bò',
    avatarUrl: null,
  },
  {
    id: 'demo-user-c',
    displayName: 'Hùng (Demo)',
    email: 'hung@weat.demo',
    currentCraving: 'Cơm Tấm',
    avatarUrl: null,
  },
];

export const DEMO_RADAR_ITEMS = [
  {
    userId: 'demo-user-b',
    displayName: 'Linh (Demo)',
    isFriend: true,
    distanceM: 45,
    matchScore: 92,
    currentCraving: 'Phở Bò',
    avatarUrl: null,
  },
  {
    userId: 'demo-user-c',
    displayName: 'Hùng (Demo)',
    isFriend: false,
    distanceM: 120,
    matchScore: 75,
    currentCraving: 'Cơm Tấm',
    avatarUrl: null,
  },
];

export const DEMO_FEED_ITEMS = [
  {
    foodLogId: 'demo-log-1',
    authorName: 'Linh',
    dishName: 'Phở Bò Tái Lăn',
    imageUrl: '/demo/pho-bo.jpg',
    capturedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    foodLogId: 'demo-log-2',
    authorName: 'Minh',
    dishName: 'Bún Bò Huế',
    imageUrl: '/demo/bun-bo.jpg',
    capturedAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    foodLogId: 'demo-log-3',
    authorName: 'Linh',
    dishName: 'Bánh Mì Thịt Nướng',
    imageUrl: '/demo/banh-mi.jpg',
    capturedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

export const DEMO_RESTAURANTS = [
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
];

/**
 * Check if demo mode is enabled via env.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo';
}
