# Known Issues & Workarounds

## MVP Scope Limitations

Các tính năng sau nằm ngoài scope MVP và sẽ được phát triển ở giai đoạn sau:

| # | Issue | Mức độ | Workaround |
|---|-------|--------|------------|
| 1 | Camera chỉ hỗ trợ camera sau (environment) | Low | Trên desktop sẽ dùng webcam mặc định |
| 2 | Chưa có OAuth (Google/Apple login) | Medium | Dùng email/password đăng ký |
| 3 | Chưa có push notification | Medium | Dùng WebSocket realtime thay thế |
| 4 | Chưa có offline mode | Low | Yêu cầu kết nối internet |
| 5 | Upload ảnh chưa có CDN | Low | Lưu local trên server, đủ cho demo |
| 6 | Food DNA chưa có embedding vector search | Low | Dùng text-based preference + simple matching |
| 7 | Restaurant suggestions dùng fallback data | Medium | Exa API key cần cấu hình, fallback đủ cho demo |

## Bugs Đã Biết

| # | Bug | Trạng thái | Workaround |
|---|-----|-----------|------------|
| 1 | Feed scroll có thể bị stuck trên iOS Safari | Fixed | Đã thêm `-webkit-overflow-scrolling: touch` |
| 2 | Geolocation accuracy thấp trên desktop | Known | Trên mobile sẽ chính xác hơn |
| 3 | Invite có thể bị duplicate nếu nhấn nhanh | Known | Đã có check pending invite trong 10 phút |
| 4 | Match animation có thể không smooth trên thiết bị yếu | Known | Giảm số particle nếu cần |

## Cấu Hình Cần Thiết

| Service | Env Variable | Bắt buộc | Ghi chú |
|---------|-------------|----------|---------|
| PostgreSQL | `DATABASE_URL` | Yes | Cần chạy migration trước |
| Redis | `REDIS_URL` | Yes | Dùng cho geospatial + cache |
| OpenAI | `OPENAI_API_KEY` | No | Nếu không có, food recognition trả "Analyzing..." |
| Exa | `EXA_API_KEY` | No | Nếu không có, dùng fallback restaurants |
| JWT Secret | `JWT_SECRET` | Yes | Bất kỳ string nào, tối thiểu 32 ký tự |
