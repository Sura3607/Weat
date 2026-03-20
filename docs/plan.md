### Kế Hoạch Triển Khai MVP "Weat" (Hackathon 36 Giờ)

[cite_start]Dự án Weat là một ứng dụng hẹn hò ăn uống trên nền tảng Mobile Web PWA[cite: 67]. [cite_start]Lấy cảm hứng từ Locket, ứng dụng tập trung vào tương tác tức thì theo thời gian thực mà không cần hệ thống chat truyền thống[cite: 69, 71]. Dưới đây là kế hoạch phát triển chi tiết để tối ưu thời gian code.

#### 1. Kiến Trúc & Tech Stack
Toàn bộ hệ thống được thiết kế theo hướng tinh gọn, triển khai trên hạ tầng AWS (EC2 & RDS) để đảm bảo tốc độ và tính ổn định.

* [cite_start]**Frontend**: Sử dụng NextJS với giao diện ưu tiên thiết bị di động (Mobile-first), ứng dụng dạng PWA và dùng TailwindCSS[cite: 73]. [cite_start]Giao diện giới hạn chiều rộng tối đa 400px[cite: 197].
* [cite_start]**Backend**: Sử dụng Node.js (thay thế FastAPI) để xử lý logic và đồng bộ hệ sinh thái JavaScript/TypeScript[cite: 74]. [cite_start]Các lời gọi API phải xử lý bất đồng bộ (async) và có thiết kế module sạch[cite: 207, 210].
* [cite_start]**Database (Chính)**: Dùng PostgreSQL để lưu trữ thông tin người dùng, danh sách bạn bè và lịch sử món ăn[cite: 76].
* [cite_start]**Database (Vector/Geo)**: Sử dụng Redis để quản lý vị trí người dùng (Geospatial) và lưu trữ embedding sở thích ăn uống (Vector Search)[cite: 77, 78, 79].
* [cite_start]**Realtime**: Tích hợp WebSocket để xử lý các sự kiện ghép đôi tức thì[cite: 80].
* [cite_start]**AI & External API**: Dùng OpenAI (Vision + LLM) thông qua model `gpt-4o-mini` để phân tích ảnh và sở thích[cite: 75]. [cite_start]Dùng Exa.ai để đề xuất quán ăn[cite: 81].

#### 2. Cấu Trúc Giao Diện (UI/UX)
[cite_start]Ứng dụng sử dụng thiết kế single-page, hoàn toàn không có thanh điều hướng bên dưới (Bottom Nav)[cite: 3, 70, 199]. 

* [cite_start]**Màn Hình Chính (CameraScreen)**: Khung camera hiển thị full-screen với một nút chụp ảnh lớn ở dưới cùng [cite: 5, 6, 84-86, 201].
* [cite_start]**Bản Tin Đồ Ăn (FoodFeed)**: Vuốt từ dưới lên để xem ảnh món ăn gần nhất của bạn bè (dạng bottom sheet)[cite: 7, 8, 87, 202]. [cite_start]Feed chỉ hiển thị ảnh, tên món do AI nhận diện, tên người chụp và thời gian [cite: 88-92].
* [cite_start]**Các Nút Hành Động**: Góc trên bên trái là nút "Cạ Cứng 🤝" để mở Radar (RadarSheet)[cite: 10, 94, 203]. [cite_start]Góc trên bên phải là nút "Thèm Gì? 🤤" để nhập món ăn mong muốn[cite: 11, 95].

#### 3. Các Tính Năng Cốt Lõi (Core Features)

* **Food DNA (Phân Tích Sở Thích AI)**:
    * [cite_start]Người dùng chụp ảnh, hệ thống gọi OpenAI Vision để nhận diện món ăn và lưu vào bảng FoodLogs [cite: 15, 99-101].
    * [cite_start]Có một AI Job chạy tự động sau mỗi 3 bức ảnh[cite: 16, 102, 103]. [cite_start]Job này gọi LLM tổng hợp "Gu" ăn uống (ví dụ: `["Thích ăn nước", "Bún/Phở", "Vị thanh"]`) [cite: 16, 104-106].
    * [cite_start]Sở thích dạng text được lưu vào Profile, còn dạng Vector được lưu vào Redis[cite: 17, 108, 109].
* **Radar Tìm Kiếm (Không Chat)**:
    * [cite_start]Người dùng nhập món đang thèm, trạng thái `currentCraving` được lưu lại [cite: 113-116].
    * [cite_start]Khi mở Radar, Backend quét Redis Geospatial trong bán kính 200m[cite: 23, 120]. [cite_start]Danh sách trả về ưu tiên bạn bè trước, sau đó là người lạ[cite: 24, 121, 122].
    * [cite_start]Thông tin hiển thị bao gồm: tên, trạng thái bạn bè, khoảng cách, điểm tương đồng (match score) và món đang thèm [cite: 125-131].
* **Luồng Rủ Rê & Bùng Nổ (Invite & Match)**:
    * [cite_start]Bên cạnh tên người dùng khác có nút "Rủ đi ăn! ⚡️"[cite: 27, 139]. [cite_start]Bấm vào sẽ bắn sự kiện WebSocket (hoặc Push Notification) đến người kia, không mở khung chat[cite: 28, 29, 141, 142].
    * [cite_start]Người nhận sẽ thấy popup: "User A vừa rủ bạn đi ăn Bún Bò! ⚡️" kèm nút "Đi luôn! 🤤" và "Để sau" [cite: 31, 32, 146-150].
    * [cite_start]Khi đồng ý, màn hình hai bên sẽ nổ pháo hoa kèm dòng chữ "MATCH! 🎉" [cite: 34, 151-155].
* **Đề Xuất Quán Ăn & Dẫn Đường**:
    * [cite_start]Sau khi Match, gọi API Exa.ai để tìm 3 quán ngon nhất [cite: 35, 158-160].
    * [cite_start]Hiển thị nút "Dẫn đường (Google Maps) 🗺️" để mở Deep Link trỏ thẳng tới quán [cite: 36, 37, 166-168].

#### 4. Quy Chuẩn Backend & Thiết Kế API
[cite_start]Tất cả các API Response phải tuân thủ chuẩn định dạng JSON: `{ success: boolean, data: {}, error: string }` [cite: 171-175]. [cite_start]Team Backend cần tuân thủ quy tắc đặt tên camelCase và chia nhỏ các hàm tái sử dụng[cite: 213, 214].

**Các Endpoint Bắt Buộc:**
* [cite_start]`POST /pwa-check-in`: Nhận tọa độ (lat, lng) của user và lưu vào Redis Geospatial [cite: 51, 178-180].
* [cite_start]`POST /upload-food-locket`: Nhận ảnh, gọi OpenAI Vision phân tích và trả về định dạng JSON món ăn [cite: 52, 181-184].
* [cite_start]`GET /radar`: Truy xuất Redis lấy khoảng cách, sắp xếp ưu tiên theo bạn bè, khoảng cách và độ tương đồng [cite: 53, 185-189].
* [cite_start]`POST /invite`: Kích hoạt sự kiện WebSocket rủ đi ăn[cite: 190, 191].
* [cite_start]`POST /accept-invite`: Kích hoạt sự kiện ghép đôi thành công[cite: 192, 193].

#### 5. Các Tính Năng Bổ Sung & Sửa Lỗi (TODO List)
* [cite_start]Thêm tính năng kết bạn bằng cách tạo mã QR, chia sẻ link hoặc liên kết với mạng xã hội[cite: 61].
* [cite_start]Chuyển đổi khu vực hiển thị lịch sử món ăn thành điểm chạm để kết bạn[cite: 62].
* [cite_start]Sửa lỗi cuộn (scroll) trên màn hình Feed món ăn[cite: 59].
* [cite_start]Điều chỉnh và hoàn thiện giao diện khung chụp hình của Frontend[cite: 60].
* [cite_start]Điều chỉnh tính năng ra lệnh bằng giọng nói (Voice interface)[cite: 63].
* [cite_start]Khắc phục lỗi để tính năng theo dõi vị trí (location) có thể bật/tắt linh hoạt[cite: 64].

#### 6. Kế Hoạch Demo Trực Tiếp
* [cite_start]Sử dụng 2 thiết bị (điện thoại iOS) độc lập đóng vai User A và User B[cite: 55, 219]. [cite_start]Có thể hardcode dữ liệu người dùng nếu cần thiết[cite: 220].
* [cite_start]Mục tiêu: Gây ấn tượng với giám khảo bằng tốc độ đồng bộ thời gian thực của WebSocket[cite: 56, 226].
* [cite_start]Tập trung trình diễn: Luồng mời tức thì (instant invite), hiệu ứng bùng nổ khi Match và đề xuất quán ăn bằng Google Maps [cite: 221-224]. [cite_start]Không cần phải build thành một hệ thống production hoàn chỉnh[cite: 227].

---
Bạn có muốn tôi bắt tay vào viết ngay cấu trúc thư mục chuẩn cho Backend Node.js và lược đồ Database (Schema) cho các bảng User, Friend, FoodLogs để team bắt đầu code luôn không?