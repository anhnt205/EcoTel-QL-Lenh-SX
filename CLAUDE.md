# THONGKE-CAOSON — Phần mềm thống kê Cao Sơn

Dự án brownfield: source + lịch sử Git có sẵn, được clone về qua
`https://github.com/anhnt205/THONG_KE_CAO_SON.git`. File này bổ sung cho
CLAUDE.md gốc ở root repo factory — đọc cả hai trước khi làm việc.

## Đọc trước khi làm bất cứ việc gì

1. `.factory/context.md` — trạng thái, quyết định, việc còn dang dở (nguồn
   sự thật, tin hơn lịch sử chat).
2. `docs/CODEBASE_MAP.md`, `docs/ARCHITECTURE_CURRENT.md` — bản đồ hệ thống
   (module nghiệp vụ, luồng auth qua Portal, cơ chế đồng bộ MongoDB).
3. `docs/TECHNICAL_DEBT.md` — mục 🔴 1 (BẢO MẬT NGHIÊM TRỌNG) BẮT BUỘC đọc
   trước khi chạm vào bất kỳ endpoint nào.

## 🔴 Phát hiện nghiêm trọng nhất — đọc ngay

`backend/.../security/SecurityConfig.java` hiện có dòng
`.anyRequest().permitAll() // test` — **toàn bộ xác thực/phân quyền API đang
bị tắt hoàn toàn**. `AppTokenFilter`/`PermissionFilter`/OAuth2 resource
server đều bị comment out. Bất kỳ ai cũng gọi được mọi API mà không cần
đăng nhập. Đây rất có thể là cấu hình debug tạm thời quên revert, KHÔNG
phải chủ đích — nhưng đây là hiện trạng thật đang chạy, không phải suy
đoán. **Không tự ý bật lại security** (có thể phá luồng dev đang dùng tạm)
và **không tự ý để nguyên** (rủi ro thật nếu deploy) — hỏi chủ dự án trước.
Vì lý do này, `automation.allow_apply_code` đang **TẮT**.

## Kiến trúc cốt lõi — đọc kỹ trước khi thêm tính năng

- **Auth qua Portal SSO** (giống PORTAL-PM và các app con khác của nó):
  đăng nhập ở Portal, Portal redirect về đây kèm 1 one-time `code`,
  `POST /api/auth/exchange-code` đổi code lấy `appToken`/`refreshToken`
  (JWT). JWT có claim `permissions` (map resource → c/r/u/d/a) —
  `AppTokenFilter` parse claim này thành `AppUserDetails`, `PermissionFilter`
  gate theo annotation `@PublicApi`/`@RequirePermission`. Toàn bộ chuỗi này
  **hiện bị vô hiệu hoá** (xem mục trên) nhưng đây là thiết kế ĐÚNG cần khôi
  phục, không phải thiết kế cần viết lại.
- **Đồng bộ 1 chiều từ MongoDB "Lệnh SX" (hệ cũ) sang Postgres (hệ mới)**
  qua MongoDB Change Streams (`sync/ChangeStreamRunner.java` +
  `sync/handler/*SyncHandler.java`, theo entity: Department, DeviceModel,
  Device, DeviceType, Location, Material, Position, Shift, User). Đây là dữ
  liệu **ĐỌC TỪ** hệ cũ (rất có thể chính là backend TK-HATU/DIEU-PHOI-MM —
  chưa xác nhận chắc chắn 100%, cần hỏi chủ dự án), KHÔNG ghi ngược lại.
  `sync.mongo.enabled=false` ở profile dev, `=true` ở prod.
- **Module đối chiếu (Reconciliation)** — commit gần nhất của repo (trước
  khi onboarding) là 2 commit implement module này
  (`ReconciliationController`/`ReconciliationDecision`) — đối chiếu số liệu
  nhập tay (Transport/Mining entry) với dữ liệu đồng bộ từ hệ cũ, người dùng
  xác nhận quyết định qua UI.

## Quy tắc bắt buộc riêng cho dự án này

1. **Không commit thẳng vào `main`.** Làm việc trên nhánh
   `chore/factory-onboarding` (bước onboarding này) hoặc nhánh riêng.
2. **Không xoá/thay thế code nghiệp vụ hiện có** nếu chưa được yêu cầu rõ
   ràng — kể cả các endpoint hiện KHÔNG có auth thật.
3. **Test backend (`ThongKeCaoSonApplicationTests.contextLoads`) hiện FAIL
   thật khi chạy độc lập** — `@SpringBootTest` cần Postgres/Redis sống,
   không có H2/Testcontainers. Không coi "test FAIL" là do code AI vừa sửa
   trừ khi đã verify lại bằng cách chạy với stack đầy đủ
   (`backend/docker-compose.yaml`).
4. **2 lockfile frontend cùng tồn tại** (`package-lock.json` VÀ
   `pnpm-lock.yaml`) nhưng Dockerfile CHỈ dùng `pnpm` — coi `pnpm-lock.yaml`
   là nguồn thật, đừng chạy `npm install` (sẽ tạo lệch version).
5. **`docker-compose.yaml` (backend) có port healthcheck sai**: map
   `8099:8090` nhưng app thật lắng nghe `8088` (khớp `server.port` +
   Dockerfile `EXPOSE 8088`) — container sẽ không bao giờ healthy qua cổng
   host đó. Xem TECHNICAL_DEBT mục 5.
6. **`reverse_proxy/nginx_staging.conf` có route `/socket.io/`** nhưng
   backend Java hiện không có dependency Socket.IO nào — nhiều khả năng
   config copy từ project khác (TK-HATU dùng Node/Express có Socket.IO
   thật), chưa xác nhận có thật sự dùng WebSocket theo cách khác không. Xem
   TECHNICAL_DEBT mục 6.
7. **Có thư mục rác đã bị commit nhầm**: `backend/.graphify/` +
   `backend/src/main/java/.../thong_ke_cao_son/.graphify/` (cache AST của 1
   tool phân tích code, ~1.2MB, không phải source thật) và
   `frontend/transcript_match.json` (log hội thoại AI, ~28KB) và
   `frontend/@/components/ui/*.tsx` (bản trùng lặp orphan của
   `frontend/src/components/ui/*.tsx` — alias `@` trỏ đúng vào `src/`, thư
   mục `@/` này không được import bởi bất kỳ đâu). Chỉ GHI NHẬN trong
   onboarding này, KHÔNG tự xoá — xem TECHNICAL_DEBT mục 8.
8. **Tài khoản `admin` đã seed sẵn** (`backend/seed-data.sql`) nhưng mật
   khẩu lưu dạng BCrypt hash — **không rõ mật khẩu gốc**, không tự đoán/thử.
   Hỏi chủ dự án nếu cần đăng nhập local admin.
