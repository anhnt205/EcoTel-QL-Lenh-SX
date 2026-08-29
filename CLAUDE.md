# THONGKE-CAOSON — Phần mềm thống kê Cao Sơn

Dự án brownfield: source + lịch sử Git có sẵn, được clone về qua
`https://github.com/anhnt205/THONG_KE_CAO_SON.git`. File này bổ sung cho
CLAUDE.md gốc ở root repo factory — đọc cả hai trước khi làm việc.

## Đọc trước khi làm bất cứ việc gì

1. `.factory/context.md` — trạng thái, quyết định, việc còn dang dở (nguồn
   sự thật, tin hơn lịch sử chat).
2. `docs/CODEBASE_MAP.md`, `docs/ARCHITECTURE_CURRENT.md` — bản đồ hệ
   thống, luồng auth qua Portal (đã bật lại).
3. `docs/TECHNICAL_DEBT.md` — phần "Đã sửa" ghi rõ những gì đã thay đổi
   2026-08-29 (lượt 2), phần còn lại là các phát hiện chưa xử lý.

## Bối cảnh quan trọng — đọc trước khi giả định về Mongo/TK-HATU

Dự án này **ĐỘC LẬP**, chạy 100% trên PostgreSQL. Cơ chế đồng bộ MongoDB
Change Streams từ hệ "Lệnh SX" cũ (tồn tại lúc onboarding) **đã bị gỡ bỏ
hoàn toàn khỏi code** theo yêu cầu người dùng (2026-08-29) — không phải chỉ
tắt cấu hình. **Không liên quan TK-HATU.** Sẽ tích hợp lại với DIEU-PHOI-MM
trong tương lai qua cơ chế RIÊNG (chưa thiết kế) — nếu thấy tài liệu cũ
hoặc lịch sử chat nhắc tới `sync/`, `ChangeStreamRunner`, `MONGO_SYNC_URI`
như đang tồn tại, đó là thông tin CŨ, không còn đúng.

## Xác thực — ĐÃ BẬT LẠI (2026-08-29), không phải permitAll nữa

Auth qua Portal SSO hoạt động thật: đăng nhập ở Portal, Portal redirect về
đây kèm 1 one-time `code`, `POST /api/auth/exchange-code` đổi code lấy
`appToken`/`refreshToken` (JWT). JWT có claim `permissions` (map resource →
c/r/u/d/a) — `AppTokenFilter` parse thành `AppUserDetails`, `PermissionFilter`
gate theo `@PublicApi`/`@RequirePermission`. Đã verify sống: public endpoint
(health/swagger/`/api/auth/**`) hoạt động, API nghiệp vụ trả `401` đúng khi
thiếu/token giả.

## Chạy preview local — đã dựng + verify sống

```bash
docker compose -f deployment/preview/preview-docker-compose.yaml up -d --build
```
URL: `http://thongke-caoson.preview.localhost:8080/`

Nếu cần backend gọi được JWKS/refresh thật của PORTAL-PM (nó chạy như 1
preview riêng, không tự cùng network) — chạy thêm (sau mỗi lần container
reverse-proxy của PORTAL-PM bị recreate):
```bash
docker network connect thongke-caoson-preview_portal-link \
  portal-pm-local-reverse-proxy-1 --alias portal-gateway
```
Không có bridge này backend vẫn boot bình thường (JWKS chỉ fetch lazy lúc
có request cần xác thực thật).

## Quy tắc bắt buộc riêng cho dự án này

1. **Không commit thẳng vào `main`.** Làm việc trên `claude-dev`/nhánh
   riêng.
2. **Không xoá/thay thế code nghiệp vụ hiện có** nếu chưa được yêu cầu rõ
   ràng. (Việc gỡ package `sync/` là ngoại lệ đã được người dùng xác nhận
   trực tiếp — không phải tiền lệ để tự ý xoá thứ khác.)
3. **Test backend (`ThongKeCaoSonApplicationTests.contextLoads`) vẫn FAIL
   thật khi chạy độc lập** — `@SpringBootTest` cần Postgres/Redis sống,
   không có H2/Testcontainers (chưa sửa, ngoài phạm vi các lượt vừa qua).
4. **2 lockfile frontend cùng tồn tại** — coi `pnpm-lock.yaml` là nguồn
   thật, đừng chạy `npm install`.
5. **`nginx_preview.conf` (`location /api/`) PHẢI dùng `proxy_pass` TĨNH**,
   không dùng biến (`set $x; proxy_pass $x/api/;`) — đã có lỗi thật do
   dùng biến khiến path bị double-prefix `/api/api/...`, xem
   `docs/TECHNICAL_DEBT.md` mục 5.
6. **Spring relaxed env-var binding bỏ hẳn dấu `-`**, không thay bằng `_`
   — `jwk-set-uri` → `JWKSETURI`, `internal-url` → `INTERNALURL`. Nhầm quy
   tắc này (`JWK_SET_URI`) sẽ khiến biến môi trường không được đọc mà
   không có lỗi rõ ràng.
7. **Có thư mục rác đã bị commit nhầm**: `backend/.graphify/`,
   `frontend/transcript_match.json`, `frontend/@/components/ui/*.tsx`
   (orphan, alias `@` trỏ đúng `src/`) — chỉ ghi nhận, không tự xoá.
8. **Tài khoản `admin` đã seed sẵn** (`backend/seed-data.sql`) nhưng mật
   khẩu lưu dạng BCrypt hash — không rõ mật khẩu gốc, không tự đoán/thử.
9. **`automation.allow_apply_code` vẫn TẮT** dù lý do gốc (lỗ hổng bảo
   mật) đã xử lý — chờ chủ dự án tự bật sau khi review diff lượt sửa lớn
   này (gỡ Mongo + bật lại security).
