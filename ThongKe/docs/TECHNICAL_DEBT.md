# Technical Debt — THONGKE-CAOSON

Phát hiện từ đọc code thật + build/test/preview thật trong Docker. Cập
nhật 2026-08-29 (lượt 2 — chuyển DB sang Postgres độc lập, bật lại bảo
mật, dựng preview sống thật theo yêu cầu người dùng).

## ✅ Đã sửa trong lượt này (2026-08-29, lượt 2)

### 1. [ĐÃ SỬA] Toàn bộ xác thực/phân quyền API đã ĐƯỢC BẬT LẠI

Trước đây (lượt onboarding 1): `SecurityConfig.java` có
`.anyRequest().permitAll() // test`, mọi API public không cần đăng nhập.

Đã sửa: uncomment `oauth2ResourceServer`, `.anyRequest().authenticated()`,
`addFilterAfter(appTokenFilter, ...)`, `addFilterAfter(permissionFilter,
...)`. Đồng thời phát hiện + sửa 1 lỗi liên quan: `/api/auth/**`
(exchange-code/refresh — endpoint đăng nhập, PHẢI public vì lúc đó chưa có
token) chưa từng nằm trong `PUBLIC_ENDPOINT` ở tầng Spring Security (chỉ có
`@PublicApi`, được `PermissionFilter` đọc — nhưng SAU khi request đã qua
được `.anyRequest().authenticated()`) — nếu không thêm, sẽ không ai đăng
nhập được lần đầu (vòng luẩn quẩn). Đã thêm `/api/auth/**` vào
`PUBLIC_ENDPOINT`.

**Verify THẬT** (không suy đoán, chạy trong preview sống):
- `GET /actuator/health`, `GET /swagger-ui/index.html` → `200` (public, đúng).
- `POST /api/auth/exchange-code` (code giả) → `500` (lỗi nghiệp vụ thật từ
  `OtcStore`, KHÔNG bị chặn bởi security — đúng, endpoint này phải public).
- `GET /api/users` không token → `401`.
- `GET /api/users` với token giả (`Bearer garbage.invalid.token`) → `401`
  (chứng minh JWT decoder thật sự chạy, không chỉ kiểm tra "có header hay
  không").
- `jwk-set-uri` trỏ tới JWKS thật của PORTAL-PM (bridge qua alias
  `portal-gateway`, xem `.factory/context.md`) → `200`, trả về đúng bộ khoá
  RSA thật.

### 2. [ĐÃ SỬA] `jwk-uri` sai tên property trong `application-prod.yaml`

Trước đây: `jwk-uri: ${PORTAL_JWKS_URI}` — SAI tên (Spring cần đúng
`jwk-set-uri`). Vì `oauth2ResourceServer` khi đó bị tắt hoàn toàn nên lỗi
này chưa từng gây hậu quả thật — nhưng nếu bật security mà không sửa, prod
sẽ không bao giờ verify được JWT (thiếu cấu hình, không lỗi rõ ràng ngay).
Đã sửa thành `jwk-set-uri`.

### 3. [ĐÃ GỠ BỎ HOÀN TOÀN] Đồng bộ MongoDB "Lệnh SX"

Theo yêu cầu người dùng (2026-08-29): dự án này ĐỘC LẬP, không còn liên
quan TK-HATU, sẽ tích hợp lại với DIEU-PHOI-MM sau này qua cơ chế RIÊNG
(chưa thiết kế) — không phải Change Streams thẳng vào Mongo như cũ. Đã gỡ:

- Toàn bộ package `sync/` (`ChangeStreamRunner`, `MongoSyncHandler`,
  `MongoIdUtils`, `sync/handler/*.java` — 9 handler + `InitialSyncRunner`).
- `config/MongoSyncConfig.java`, `model/SyncCheckpoint.java`,
  `repository/SyncCheckpointRepository.java`.
- Dependency `mongodb-driver-sync` khỏi `pom.xml`.
- Block `mongo:`/`sync:` khỏi cả 3 file `application*.yaml`.

Đã verify: grep lại toàn repo không còn tham chiếu nào tới
Sync/ChangeStream/Mongo trong source; build backend PASS; preview sống
không có lỗi liên quan.

### 4. [ĐÃ SỬA] Port healthcheck sai trong `backend/docker-compose.yaml`

Trước đây map `8099:8090` trong khi app lắng nghe `8088`. Đã sửa thành
`8099:8088`.

### 5. [PHÁT HIỆN + ĐÃ SỬA — lỗi mới, phát sinh khi dựng preview] nginx `proxy_pass` dùng biến làm sai path `/api/`

Khi viết `deployment/preview/preview-docker-compose.yaml` +
`reverse_proxy/nginx_preview.conf` (file MỚI, cho preview local), ban đầu
viết `location /api/ { set $backend ...; proxy_pass $backend/api/; }` —
nginx quy tắc: **`proxy_pass` dùng biến thì KHÔNG tự strip prefix location
khớp được**, khiến request `/api/auth/exchange-code` bị forward thành
`/api/api/auth/exchange-code` (double prefix) → không khớp allowlist
`/api/auth/**` → rơi vào yêu cầu xác thực nhầm, không ai gọi được endpoint
đăng nhập. Phát hiện qua verify thật (401 sai chỗ), đã sửa bằng
`proxy_pass` TĨNH (không biến): `proxy_pass http://backend-service:8088/api/;`.

### 6. [PHÁT HIỆN — chưa sửa, không thuộc phạm vi "chạy thật"] `SignInPage` không được route nào dùng

`frontend/src/modules/auth/pages/sign-in-page.tsx` (redirect sang
`VITE_PORTAL_URL`) tồn tại nhưng KHÔNG có route nào trong
`modules/main/router.tsx` (hay bất kỳ router nào khác) trỏ tới nó — code
orphan, chưa từng được gọi. Luồng thật hiện tại: `AuthGate` chỉ đọc
`?code=` trên URL lúc app tải (`initializeAppAuth`), không tự động
redirect sang Portal nếu thiếu — người dùng phải bắt đầu từ Portal (bấm
mở app từ ApplicationsPage), không phải từ URL app này trực tiếp. Đây có
thể là chủ đích (Portal luôn là điểm vào duy nhất) hoặc `SignInPage` là
phần dở dang — cần hỏi chủ dự án nếu muốn app này có đường vào trực tiếp
riêng.

---

## 🟡 Còn tồn tại — chưa sửa trong lượt này (ngoài phạm vi được yêu cầu)

### 7. Test backend vẫn FAIL khi chạy độc lập

Không có Testcontainers/H2 — `mvn test` vẫn cần Postgres/Redis sống. Không
nằm trong phạm vi "chuyển DB + chạy thật" của lượt này (yêu cầu là dựng
preview sống, không phải viết test mới).

### 8. `MONGO_SYNC_URI`/mục liên quan Mongo trong TECHNICAL_DEBT lịch sử — không còn áp dụng

Đã gỡ code, không còn rủi ro credential hardcode trong yaml (mục này của
bản TECHNICAL_DEBT trước đã tự động hết hiệu lực cùng việc xoá code).

### 9. Route `/socket.io/` trong `nginx_staging.conf` (staging thật) không khớp backend Java

Vẫn còn nguyên ở `nginx_staging.conf` (không đụng trong lượt này, file
`nginx_preview.conf` MỚI viết không có route này). Cần chủ dự án xác nhận
trước khi sửa file staging thật.

### 10. 2 tầng CORS không nhất quán ở staging (`nginx_staging.conf`)

Không đụng trong lượt này (chỉ tạo `nginx_preview.conf` mới, không sửa
staging). `nginx_preview.conf` mới không có wildcard+credentials cùng lúc
(không set CORS header ở tầng nginx preview — để nguyên cho Spring
`corsConfigurationSource()` xử lý, tránh lặp lại đúng lỗi này).

### 11-13. Artifact rác đã commit nhầm (`~/.graphify/`, `transcript_match.json`, `frontend/@/`), 2 lockfile frontend, `package.json` name "temp-scaffold", mật khẩu admin không rõ

Không đụng — vẫn đúng như lượt onboarding 1, không liên quan tới yêu cầu
lượt này.

## Điều kiện còn thiếu trước khi phát triển tiếp (cập nhật)

1. ~~Quyết định về bảo mật~~ — **ĐÃ XỬ LÝ** lượt này.
2. ~~MongoDB nguồn đồng bộ~~ — **KHÔNG CÒN ÁP DỤNG**, đã gỡ hẳn cơ chế
   đồng bộ; tích hợp DIEU-PHOI-MM sẽ thiết kế lại từ đầu khi tới lúc.
3. Preview sống ĐÃ CHẠY được (`deployment/preview/preview-docker-compose.yaml`)
   nhưng bridge sang Portal (`docker network connect ... --alias
   portal-gateway`) hiện là thao tác TAY sau `up` — nếu muốn Portal luôn
   sẵn sàng ngay từ đầu, cần tự động hoá bước này (ví dụ script wrapper)
   hoặc chấp nhận làm tay mỗi lần preview lại.
4. Vòng đăng nhập ĐẦY ĐỦ qua Portal (redirect thật + nhận code + đổi token
   thật) CHƯA được test end-to-end — cần đăng ký THONGKE-CAOSON như 1
   Application trong PORTAL-PM (qua `ApplicationsPage`, cần tài khoản
   admin Portal — Portal preview vừa dựng là DB rỗng, chưa có admin nào).
   Đây là việc phía Portal, không phải code THONGKE-CAOSON.
5. Test backend vẫn cần Postgres/Redis sống (mục 7) — chưa có hướng dùng
   Testcontainers/H2.
