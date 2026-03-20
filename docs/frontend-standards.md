# Frontend Standards (Weat MVP)

## 1) Mục tiêu frontend
- Mobile-first PWA, tối ưu màn hình dọc.
- Trải nghiệm chính: mở app -> check-in -> chụp món -> xem radar -> invite -> match -> mở maps.
- UI ưu tiên tốc độ thao tác 1 tay, không phụ thuộc bottom nav.

## 2) Quy chuẩn kỹ thuật
- Framework: Next.js (App Router) + TypeScript strict.
- Styling: TailwindCSS + design tokens.
- State:
  - Server state: TanStack Query.
  - UI state local: Zustand hoặc React state.
- Form: React Hook Form + Zod.
- Realtime: socket client tách module riêng (`src/lib/realtime`).
- PWA: bắt buộc có manifest + service worker + offline fallback tối thiểu.

## 3) Cấu trúc thư mục đề xuất
- `src/app`: route + layout
- `src/features/camera`
- `src/features/feed`
- `src/features/radar`
- `src/features/invite`
- `src/features/match`
- `src/features/profile`
- `src/shared/components`
- `src/shared/lib`
- `src/shared/api`
- `src/shared/types`
- `src/shared/config`

Quy tắc:
- Không import chéo giữa các feature nếu không qua `shared`.
- Mỗi feature tự quản lý component, hook, service riêng.

## 4) Naming conventions
- File component: `PascalCase.tsx`
- Hook: `useXxx.ts`
- API service: `xxxApi.ts`
- Type/interface: `PascalCase`
- Biến/hàm: `camelCase`
- Constant global: `UPPER_SNAKE_CASE`

## 5) UI/UX standards
- Max width layout: 400px, canh giữa màn hình.
- Safe area iOS: luôn dùng `env(safe-area-inset-*)`.
- Touch target: tối thiểu 44x44.
- Hạn chế text dài trên CTA, ưu tiên động từ rõ ràng.
- Animation:
  - 120-220ms cho micro interaction.
  - 300-450ms cho transition màn hình.
- Accessibility:
  - Tương phản màu đạt WCAG AA cho text chính.
  - Nút/icon có `aria-label`.
  - Focus state rõ ràng.

## 6) API integration standards
- Tạo API client duy nhất (`src/shared/api/client.ts`).
- Mọi response parse theo envelope:
  - `success = false` => throw domain error.
- Mapping DTO -> UI model thực hiện trong layer `services`, không map trực tiếp trong component.
- Có retry logic cho GET (không retry cho POST tạo side effect trừ khi có idempotency key).

## 7) Error/Loading/Empty states
Mỗi màn chính phải có đủ 3 trạng thái:
- Loading skeleton.
- Error state có nút thử lại.
- Empty state có CTA rõ ràng.

## 8) Realtime UX rules
- Khi nhận `invite.received`: hiển thị popup hành động ngay.
- Nếu đang offline: queue action và báo trạng thái chờ.
- Khi `match.created`: trigger animation + khóa thao tác gây xung đột trong 1-2 giây.

## 9) Performance budget
- First load JS (gzip) mục tiêu dưới 250KB cho màn chính.
- LCP mobile mục tiêu dưới 2.5s trong điều kiện 4G.
- Ảnh upload tự động nén trước khi gửi (long edge ~1280px).

## 10) Testing & quality gate
- Unit test cho util/hook quan trọng.
- E2E tối thiểu cho luồng:
  - chụp món -> upload thành công
  - mở radar -> gửi invite -> accept -> match -> mở maps
- Không merge nếu:
  - Có lỗi TypeScript
  - Có lỗi ESLint mức error
  - E2E smoke fail

## 11) Definition of done cho task frontend
Một ticket chỉ Done khi:
- Đã đúng UI theo luồng mobile-first.
- Đã xử lý loading/error/empty.
- Đã có test tương ứng (nếu là logic quan trọng).
- Đã cập nhật docs nếu thay đổi API contract.
