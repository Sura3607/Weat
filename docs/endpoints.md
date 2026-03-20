# Weat API Endpoints (MVP)

## 1) API conventions
- Base path: `/api/v1`
- Content type: `application/json` (trừ endpoint upload ảnh dùng `multipart/form-data`)
- Timezone: UTC, định dạng ISO-8601
- Authentication: `Authorization: Bearer <jwt>` (trừ auth endpoint)
- Idempotency key: bắt buộc cho các endpoint tạo sự kiện quan trọng (`invite`, `accept-invite`)

### Response envelope (bắt buộc)
Mọi response phải theo đúng format:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "req_xxx",
    "timestamp": "2026-03-20T10:00:00Z"
  }
}
```

### Error codes chuẩn
- `400_BAD_REQUEST`: dữ liệu đầu vào sai format
- `401_UNAUTHORIZED`: thiếu hoặc sai token
- `403_FORBIDDEN`: không đủ quyền
- `404_NOT_FOUND`: không tìm thấy resource
- `409_CONFLICT`: xung đột trạng thái
- `422_UNPROCESSABLE_ENTITY`: validate business rule thất bại
- `429_TOO_MANY_REQUESTS`: vượt rate limit
- `500_INTERNAL_SERVER_ERROR`: lỗi hệ thống

## 2) Endpoint catalogue

## 2.1 Health
### `GET /api/v1/health`
Mục tiêu: kiểm tra server sống.

Response data:
- `status`: `"ok"`
- `version`: string

---

## 2.2 Check-in vị trí
### `POST /api/v1/pwa-check-in`
Mục tiêu: cập nhật vị trí user vào Redis Geospatial.

Request body:
- `lat`: number, range `[-90, 90]`
- `lng`: number, range `[-180, 180]`
- `accuracyM`: number, optional

Business rules:
- Giới hạn 1 request / 10 giây / user.
- Nếu user tắt chia sẻ vị trí, trả `403_FORBIDDEN`.

Response data:
- `locationUpdated`: boolean
- `geoHash`: string

---

## 2.3 Upload ảnh món ăn
### `POST /api/v1/upload-food-locket`
Mục tiêu: nhận ảnh, gọi vision model nhận diện món và lưu food log.

Headers:
- `Content-Type: multipart/form-data`

Form-data:
- `image`: file (jpg/png/webp), tối đa 8MB
- `capturedAt`: string ISO-8601, optional

Response data:
- `foodLogId`: string
- `dishName`: string
- `confidence`: number (0-1)
- `tags`: string[]
- `thumbnailUrl`: string

Side effects:
- Sau mỗi 3 ảnh mới của user, enqueue job `food-dna-refresh`.

---

## 2.4 Cập nhật craving hiện tại
### `POST /api/v1/current-craving`
Mục tiêu: lưu món đang thèm để dùng cho radar + invite.

Request body:
- `cravingText`: string, max 80 chars
- `expiresInMin`: number, default 60

Response data:
- `currentCraving`: string
- `expiresAt`: ISO-8601 string

---

## 2.5 Radar tìm quanh bạn
### `GET /api/v1/radar?radiusM=200&limit=20`
Mục tiêu: trả danh sách user gần đó, ưu tiên bạn bè trước.

Query params:
- `radiusM`: number, default 200, max 1000
- `limit`: number, default 20, max 50

Sort order chuẩn:
1. Bạn bè trước người lạ
2. Khoảng cách gần trước
3. Match score cao trước

Response data:
- `items`: array
- item schema:
  - `userId`: string
  - `displayName`: string
  - `isFriend`: boolean
  - `distanceM`: number
  - `matchScore`: number (0-100)
  - `currentCraving`: string | null
  - `avatarUrl`: string | null

---

## 2.6 Gửi lời mời đi ăn
### `POST /api/v1/invite`
Mục tiêu: tạo invite và bắn realtime event tới người nhận.

Request body:
- `toUserId`: string
- `dishName`: string
- `message`: string, optional, max 120 chars

Business rules:
- Không gửi invite cho chính mình.
- Một cặp user chỉ có tối đa 1 invite pending trong 10 phút.

Response data:
- `inviteId`: string
- `status`: `"pending"`

Realtime event:
- Channel: `user:{toUserId}`
- Event: `invite.received`

---

## 2.7 Chấp nhận lời mời
### `POST /api/v1/accept-invite`
Mục tiêu: chuyển invite sang accepted và bắn event match thành công.

Request body:
- `inviteId`: string

Response data:
- `inviteId`: string
- `status`: `"accepted"`
- `matchId`: string

Realtime events:
- `invite.accepted`
- `match.created`

---

## 2.8 Gợi ý quán ăn sau match
### `GET /api/v1/matches/{matchId}/restaurant-suggestions`
Mục tiêu: trả về 3 quán đề xuất để mở map.

Response data:
- `items`: array (tối đa 3)
- item schema:
  - `name`: string
  - `address`: string
  - `distanceM`: number
  - `rating`: number | null
  - `mapsUrl`: string

---

## 2.9 Lấy feed ảnh món ăn
### `GET /api/v1/feed?limit=20&cursor=...`
Mục tiêu: trả feed món gần nhất của bạn bè.

Response data:
- `items`: array
- item schema:
  - `foodLogId`: string
  - `authorName`: string
  - `dishName`: string
  - `imageUrl`: string
  - `capturedAt`: ISO-8601 string
- `nextCursor`: string | null

## 3) Realtime contract (WebSocket)
- Namespace: `/ws`
- Auth lúc connect: JWT
- Event names (snake-case hoặc dot-case, chọn 1 và thống nhất):
  - `invite.received`
  - `invite.accepted`
  - `match.created`
  - `presence.updated`

Payload tối thiểu nên có:
- `eventId`: string
- `type`: string
- `payload`: object
- `createdAt`: ISO-8601

## 4) Definition of done cho backend endpoint
- Có validation input + unit test cho validator.
- Có log `requestId` và `userId`.
- Có rate limit cho endpoint public/nhạy cảm.
- Có OpenAPI hoặc docs này được cập nhật đồng bộ.
- Có test happy path + 1 case lỗi chính mỗi endpoint.
