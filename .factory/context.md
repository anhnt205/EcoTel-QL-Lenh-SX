# Context — THONGKE-CAOSON

Cập nhật lần cuối: 2026-08-29 (lượt 2 — chuyển DB độc lập + bật lại bảo
mật + dựng preview sống thật, theo yêu cầu trực tiếp của người dùng). Đọc
file này TRƯỚC khi tiếp tục — tin file này hơn lịch sử chat đã bị nén.

## Tóm tắt trạng thái

Sau lượt onboarding 1 (chỉ đọc + tài liệu hoá), người dùng yêu cầu 3 việc
cụ thể qua session tương tác (đã hỏi rõ phạm vi bằng AskUserQuestion trước
khi làm, người dùng chọn phương án khuyến nghị cho cả 3):

1. **Gỡ hẳn code sync MongoDB** — dự án độc lập, không liên quan TK-HATU,
   sẽ tích hợp lại với DIEU-PHOI-MM sau này qua cơ chế riêng.
2. **Dựng preview local chạy thật** qua Factory (không chỉ sửa code build
   sạch).
3. **Bật lại JWT + permission** (thay vì giữ nguyên lỗ hổng permitAll).

Cả 3 đã hoàn thành + verify sống thật. Chi tiết đầy đủ từng thay đổi + lý
do: `docs/TECHNICAL_DEBT.md` phần "✅ Đã sửa trong lượt này".

## Đã làm — lượt 2 (2026-08-29)

1. **Gỡ MongoDB**: xoá `sync/` (toàn package), `MongoSyncConfig.java`,
   `SyncCheckpoint.java`+repository, dependency `mongodb-driver-sync`,
   block `mongo:`/`sync:` khỏi cả 3 `application*.yaml`. Verify: grep sạch,
   build PASS, preview chạy không lỗi.
2. **Bật lại security**: uncomment `oauth2ResourceServer`/`.anyRequest()
   .authenticated()`/2 filter trong `SecurityConfig.java`. Phát hiện + sửa
   thêm: (a) `/api/auth/**` thiếu trong `PUBLIC_ENDPOINT` (sẽ khoá luôn cả
   đăng nhập nếu không thêm), (b) `jwk-uri` sai tên property trong
   `application-prod.yaml` (phải là `jwk-set-uri`).
3. **Dựng preview local chạy thật** — file MỚI:
   `deployment/preview/preview-docker-compose.yaml` (postgres+redis+
   backend+frontend+reverse-proxy, join `factory-preview`),
   `reverse_proxy/nginx_preview.conf` (route `/`, `/api/` — không có
   `/socket.io/`), thêm ARG/ENV `VITE_API_KONG_URL`/`VITE_PORTAL_URL` vào
   `frontend/Dockerfile`. Phát hiện + sửa 1 bug thật lúc build: `proxy_pass`
   dùng biến trong `location /api/` làm path bị double-prefix
   `/api/api/...` — sửa bằng `proxy_pass` tĩnh.
4. **Portal integration cho preview**: PORTAL-PM chưa chạy → đã tự khởi
   động preview của nó (`docker compose -f docker-compose.local.yml
   --env-file .env.local up -d --build`, dùng `.env.local` có sẵn từ
   trước). JWKS thật của Portal chỉ reachable qua `reverse-proxy` (Kong),
   KHÔNG qua `portal-service` trực tiếp (verify: gọi thẳng `portal-service`
   trả `401`, qua `reverse-proxy:8888` trả `200` JWKS thật). Bridge bằng
   `docker network connect thongke-caoson-preview_portal-link
   portal-pm-local-reverse-proxy-1 --alias portal-gateway` (runtime, không
   sửa compose PORTAL-PM).
5. **Fix nhỏ khác**: port healthcheck sai trong `backend/docker-compose.yaml`
   (`8099:8090`→`8099:8088`), thêm `backend/.env.example`.
6. **Verify sống đầy đủ qua preview** (`http://thongke-caoson.preview.localhost:8080/`):
   - Frontend load được (title đúng "Phần Mềm Thống Kê Cao Sơn"), `AuthGate`
     hiện đúng màn "Xác thực thất bại — Không tìm thấy token" khi chưa có
     `?code=` (đúng hành vi mong đợi, KHÔNG phải lỗi).
   - `/actuator/health`, `/swagger-ui/index.html` → `200`.
   - `/api/auth/exchange-code` (code giả) → `500` (public, reach được
     controller, lỗi nghiệp vụ thật — KHÔNG bị chặn bởi security).
   - `/api/users` không token → `401`; token giả → `401`.
   - JWKS Portal thật qua bridge → `200`, trả đúng bộ khoá RSA.
7. **Cập nhật toàn bộ tài liệu** phản ánh trạng thái mới: `project.yaml`,
   `CLAUDE.md`, `docs/{CODEBASE_MAP,ARCHITECTURE_CURRENT,REQUIREMENTS_AS_IS,
   TECHNICAL_DEBT}.md`.

## Việc cần làm tiếp (ưu tiên theo thứ tự)

1. Đăng ký THONGKE-CAOSON như 1 Application trong PORTAL-PM (qua
   `ApplicationsPage`) để test vòng đăng nhập ĐẦY ĐỦ thật (Portal preview
   hiện DB rỗng, chưa có admin nào) — việc này thuộc phía Portal, không
   phải code THONGKE-CAOSON.
2. Bridge network Portal (`docker network connect ...`) là thao tác TAY,
   không tự động — cân nhắc script hoá nếu preview cần dựng lại nhiều lần.
3. Test backend vẫn cần Postgres/Redis sống (chưa có Testcontainers/H2) —
   ngoài phạm vi 2 lượt vừa qua.
4. Thiết kế cơ chế tích hợp với DIEU-PHOI-MM (chưa bắt đầu, chỉ mới xác
   nhận hướng "sẽ tích hợp sau này qua cơ chế riêng").
5. `automation.allow_apply_code` vẫn TẮT — chủ dự án tự quyết định bật sau
   khi review diff lượt sửa lớn này.
6. Xác nhận `SignInPage` (orphan, không route nào dùng) là chủ đích hay dở
   dang.

## Nếu phiên sau cần tiếp tục

Đọc theo thứ tự: file này → `docs/TECHNICAL_DEBT.md` (đặc biệt phần "Đã
sửa" để biết trạng thái MỚI NHẤT, đừng tưởng nhầm các mục cũ vẫn còn hiệu
lực) → `docs/ARCHITECTURE_CURRENT.md` → `docs/CODEBASE_MAP.md`. KHÔNG giả
định còn MongoDB hay bảo mật đang tắt — cả 2 đã thay đổi ở lượt này, luôn
đọc trực tiếp `SecurityConfig.java`/`pom.xml` để xác nhận trạng thái hiện
tại nếu nghi ngờ.
