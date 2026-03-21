# Weat

**Discover food together.** Chụp ảnh món ăn, tìm bạn ăn cùng trong bán kính 200m.

## Features

- Camera full-screen UI để chụp ảnh món ăn
- AI phân tích món ăn qua OpenAI Vision API (Food DNA extraction)
- Feed hiển thị danh sách bài post món ăn
- Radar map hiển thị người dùng gần bạn (200m)
- Hệ thống match real-time qua WebSocket
- Gợi ý quán ăn phù hợp dựa trên Food DNA và vị trí
- Profile người dùng với lịch sử món ăn
- PWA - cài đặt app như native
- Voice input - mô tả món ăn bằng giọng nói

## Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Radix UI, Framer Motion
- **Backend**: Express, tRPC, Drizzle ORM, MySQL
- **Real-time**: WebSocket
- **AI**: OpenAI Vision API
- **Storage**: AWS S3
- **Maps**: Google Maps API

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm start
```
