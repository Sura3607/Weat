# Weat Demo Script (3-5 phút)

## Chuẩn bị trước demo

- Backend đang chạy (`npm run dev` trong `backend/`)
- Frontend đang chạy (`npm run dev` trong `frontend/`)
- PostgreSQL + Redis đang chạy
- Seed data đã được chạy (`npm run seed`)
- 2 trình duyệt/tab mở sẵn (User A và User B)

---

## Phần 1: Giới thiệu (30 giây)

> "Weat là ứng dụng food-matching giúp bạn tìm người ăn cùng dựa trên vị trí và sở thích ẩm thực. Giống Locket nhưng thay vì ảnh selfie, bạn chụp món ăn."

---

## Phần 2: Check-in và Camera (1 phút)

1. **User A** mở app -> Camera hiện lên full-screen
2. Cấp quyền camera + vị trí -> Check-in tự động
3. **Chụp ảnh** món ăn (nút tròn trắng ở dưới)
4. Thấy preview thumbnail góc phải + AI nhận diện tên món

> "Mỗi ảnh được AI nhận diện tự động. Sau 3 ảnh, hệ thống tạo Food DNA - hồ sơ khẩu vị cá nhân."

---

## Phần 3: Craving và Radar (1 phút)

1. **User A** nhấn "Thèm Gì?" -> Nhập "Bún Bò Huế" -> Xác nhận
2. **User B** mở app ở tab khác -> Cấp quyền -> Check-in
3. **User A** nhấn "Cạ Cứng" -> Radar mở ra
4. Thấy **User B** trong danh sách (khoảng cách + match score)

> "Radar quét bán kính 200m, ưu tiên bạn bè và người có gu ăn tương tự."

---

## Phần 4: Invite và Match (1.5 phút)

1. **User A** nhấn "Rủ đi ăn!" bên cạnh User B
2. **User B** nhận popup invite realtime (WebSocket)
3. **User B** nhấn "Đi luôn!"
4. Cả hai thấy hiệu ứng **MATCH!** với pháo hoa
5. Gợi ý quán ăn hiện ra với link Google Maps

> "Invite hết hạn sau 10 phút. Khi match, AI gợi ý quán dựa trên món đang thèm và vị trí."

---

## Phần 5: Food Feed (30 giây)

1. **User A** nhấn "Vuốt lên xem Feed"
2. Thấy ảnh món ăn từ bạn bè (bottom sheet)

> "Feed hiển thị ảnh món ăn từ bạn bè, giống Locket nhưng focus vào food."

---

## Phần 6: Tổng kết (30 giây)

> "Weat giải quyết bài toán 'Ăn gì? Ăn với ai?' bằng 3 bước: Chụp -> Match -> Đi ăn. Stack: Next.js + Node.js + PostgreSQL + Redis + WebSocket + OpenAI Vision."

---

## Fallback nếu gặp lỗi

| Tình huống | Workaround |
|---|---|
| Camera không mở | Dùng ảnh hardcode, bỏ qua bước chụp |
| Radar trống | Chạy seed data thêm user gần vị trí |
| Invite không nhận | Refresh tab User B, gửi lại |
| AI không nhận diện | Hiển thị "Analyzing..." rồi giải thích đang xử lý |
| Google Maps không mở | Giải thích link sẽ mở trên thiết bị thật |
