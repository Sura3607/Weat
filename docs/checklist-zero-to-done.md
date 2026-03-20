# Checklist Triển Khai Tuần Tự (Zero -> Done)

## Giai đoạn 0: Chuẩn bị dự án
- [x] Chốt scope MVP (đúng theo plan, không mở rộng tính năng).
- [x] Chốt stack: Next.js + Node.js + PostgreSQL + Redis + WebSocket.
- [x] Tạo repo cấu trúc frontend/backend và branch strategy.
- [x] Thiết lập CI cơ bản (lint, typecheck, test).
- [x] Tạo file env mẫu cho local/staging.

## Giai đoạn 1: Nền tảng backend
- [x] Thiết kế schema DB: users, friendships, food_logs, invites, matches.
- [x] Dựng migration + seed data tối thiểu.
- [x] Dựng auth JWT cơ bản.
- [x] Dựng middleware logging + error handler + requestId.
- [x] Dựng Redis geospatial và key convention.

## Giai đoạn 2: API cốt lõi
- [x] Hoàn thành `POST /pwa-check-in`.
- [x] Hoàn thành `POST /upload-food-locket`.
- [x] Hoàn thành `POST /current-craving`.
- [x] Hoàn thành `GET /radar`.
- [x] Hoàn thành `POST /invite`.
- [x] Hoàn thành `POST /accept-invite`.
- [x] Hoàn thành `GET /matches/{matchId}/restaurant-suggestions`.
- [ ] Viết test API cho happy path + lỗi chính.

## Giai đoạn 3: Realtime
- [ ] Dựng WebSocket gateway + auth handshake.
- [ ] Emit event `invite.received`.
- [ ] Emit event `invite.accepted`.
- [ ] Emit event `match.created`.
- [ ] Test realtime với 2 client đồng thời.

## Giai đoạn 4: Frontend khung chính
- [ ] Dựng layout mobile-first max width 400px.
- [ ] Dựng CameraScreen + nút chụp chính.
- [ ] Dựng FoodFeed dạng bottom sheet.
- [ ] Dựng nút mở Radar và nhập craving.
- [ ] Dựng popup nhận invite + CTA accept/reject.
- [ ] Dựng màn Match success + CTA mở Google Maps.

## Giai đoạn 5: Tích hợp AI và đề xuất quán
- [ ] Tích hợp OpenAI Vision cho nhận diện món.
- [ ] Tạo job Food DNA chạy sau mỗi 3 ảnh.
- [ ] Lưu profile preference text + vector vào Redis.
- [ ] Tích hợp nguồn đề xuất quán (Exa hoặc fallback local).

## Giai đoạn 6: Chất lượng và demo
- [ ] Fix bug feed scroll trên mobile.
- [ ] Kiểm tra bật/tắt location tracking.
- [ ] Tối ưu upload ảnh (nén + retry hợp lý).
- [ ] Test toàn luồng trên 2 thiết bị thật.
- [ ] Chuẩn bị script demo 3-5 phút.
- [ ] Chuẩn bị dữ liệu fallback/hardcode để tránh demo fail.

## Giai đoạn 7: Freeze và bàn giao
- [ ] Freeze feature trước giờ demo.
- [ ] Chốt known issues và workaround.
- [ ] Chốt tài liệu: plan, endpoints, frontend standards, checklist.
- [ ] Tag release demo.

## Tiêu chí Done toàn dự án
- [ ] User A và User B check-in thấy nhau trong radar theo bán kính.
- [ ] User A gửi invite và User B nhận realtime trong vài giây.
- [ ] User B accept và cả hai thấy hiệu ứng Match.
- [ ] Có ít nhất 1 quán gợi ý mở được Google Maps.
- [ ] Demo chạy ổn định ít nhất 3 lần liên tiếp.
