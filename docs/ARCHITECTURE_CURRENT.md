# Architecture — Hiện trạng thật (2026-08-29)

Ghi lại từ code thật (đọc + build/test thật trong Docker), không suy đoán.
Xem `docs/CODEBASE_MAP.md` cho bản đồ thư mục, `docs/TECHNICAL_DEBT.md` cho
danh sách phát hiện cần xử lý.

## 1. Tổng quan hệ thống

```mermaid
flowchart LR
  U[Người dùng] -->|đăng nhập| Portal[Portal SSO<br/>PORTAL-PM, port 1188]
  Portal -->|redirect + one-time code| FE[Frontend<br/>React + Vite, nginx :80]
  FE -->|POST /api/auth/exchange-code| BE[Backend<br/>Spring Boot :8088]
  BE -->|verify + đọc claim permissions| Portal
  FE -->|Authorization: Bearer appToken| BE
  BE --> PG[(PostgreSQL 16<br/>thong_ke)]
  BE --> Redis[(Redis)]
  Mongo[(MongoDB "Lệnh SX"<br/>hệ cũ — TK-HATU/DIEU-PHOI-MM?)] -->|Change Streams<br/>1 chiều, chỉ đọc| BE
  RP[Nginx reverse-proxy] -->|/| FE
  RP -->|/api/| BE
  RP -.->|/socket.io/, chưa xác nhận dùng| BE
```

## 2. Backend — Spring Boot 4.0.7 / Java 21

- **Layered**: controller → service → repository (Spring Data JPA) → Postgres, dùng MapStruct cho DTO mapping, Lombok cho boilerplate.
- **API docs**: springdoc-openapi tại `/v3/api-docs`, Swagger UI tại `/swagger-ui.html` (public endpoint).
- **Health**: `/actuator/health` (public), Dockerfile có `curl` nên healthcheck container hoạt động đúng — NHƯNG `backend/docker-compose.yaml` map cổng healthcheck sai (xem TECHNICAL_DEBT mục 5).
- **Import/Export Excel**: Apache POI, cho báo cáo Vận tải + Khai thác (import số liệu từ file mẫu, export báo cáo).

## 3. Xác thực & phân quyền — THIẾT KẾ vs THỰC TẾ ĐANG CHẠY

**Thiết kế** (đọc từ code, đúng đắn về mặt kiến trúc):

1. Người dùng đăng nhập ở Portal (app khác, PORTAL-PM) → Portal redirect về THONGKE-CAOSON kèm 1 `code` dùng 1 lần.
2. Frontend gọi `POST /api/auth/exchange-code` → `OtcStore` đổi code lấy `appToken` (JWT) + `refreshToken`.
3. Mỗi request sau đó gắn `Authorization: Bearer <appToken>`.
4. Spring OAuth2 Resource Server verify JWT bằng public key lấy từ Portal (`jwk-set-uri`, dev) / `PORTAL_JWKS_URI` (prod).
5. `AppTokenFilter` đọc claim `permissions` (map `resource → {c,r,u,d,a}`) trong JWT, dựng `AppUserDetails`.
6. `PermissionFilter` chặn theo annotation `@RequirePermission(resource=...)` trên controller/method, cho qua nếu có `@PublicApi`.
7. `POST /api/auth/refresh` gọi ngược Portal (`{portal.internal-url}/api/auth/refresh`) để lấy `appToken` mới khi hết hạn.

**Thực tế đang chạy (`SecurityConfig.java`, xác nhận đọc code trực tiếp)**:

```java
.authorizeHttpRequests(authorize -> authorize
        .requestMatchers(PUBLIC_ENDPOINT).permitAll()
//      .anyRequest().authenticated()
        .anyRequest().permitAll() // test
)
// .addFilterAfter(appTokenFilter, BearerTokenAuthenticationFilter.class)
// .addFilterAfter(permissionFilter, AppTokenFilter.class)
// .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
```

**→ Không có bước 4-6 nào đang thực thi. Mọi endpoint (kể cả CRUD danh mục,
báo cáo, đối chiếu) truy cập được không cần token, không cần đăng nhập.**
Đây là phát hiện nghiêm trọng nhất của lượt onboarding này — xem
`docs/TECHNICAL_DEBT.md` mục 🔴 1.

Frontend VẪN có `RoleGuard`/`ProtectedRoute` chặn theo role ở tầng UI
(`ROLE_TRANSPORT`...) — nghĩa là giao diện trông như có phân quyền, nhưng
API phía sau không thực sự kiểm tra gì, ai gọi thẳng API cũng bỏ qua được
guard này.

## 4. Đồng bộ dữ liệu từ hệ MongoDB cũ

- `sync.mongo.enabled` = `false` (dev) / `true` (prod).
- Khi bật: `ChangeStreamRunner` lắng nghe MongoDB Change Streams trên
  database `Lenh_sx` (biến `MONGO_SYNC_URI`), route sự kiện qua
  `sync/handler/*SyncHandler.java` theo từng loại entity (Department,
  DeviceModel, Device, DeviceType, Location, Material, Position, Shift,
  User) → ghi vào Postgres tương ứng.
- `InitialSyncRunner` chạy đồng bộ toàn bộ 1 lần đầu (bootstrap), sau đó
  Change Streams giữ đồng bộ liên tục — 1 CHIỀU (Mongo → Postgres), không
  ghi ngược.
- `SyncCheckpoint` (entity + repository riêng) lưu vị trí đã đồng bộ tới
  (resume point), tránh sync lại từ đầu khi restart.
- **Chưa xác nhận chắc chắn** MongoDB "Lệnh SX" này có phải chính là
  database mà TK-HATU/DIEU-PHOI-MM (2 project khác trong factory, cùng
  miêu tả nghiệp vụ "Lệnh sản xuất") đang dùng hay không — tên database
  trùng khớp (`Lenh_sx`) nhưng chưa đối chiếu connection string thật. Hỏi
  chủ dự án nếu cần xác nhận.

## 5. Module đối chiếu (Reconciliation) — mới nhất trong lịch sử Git

2 commit gần nhất của repo (trước onboarding) implement module này:
`ReconciliationController` + `ReconciliationDecision` (backend),
`ReconciliationPage`/`StandardTripReportPage` (frontend, có bảng so sánh +
dialog xác nhận tái sử dụng). Suy luận từ tên: đối chiếu số liệu nhập tay
(Transport/Mining entry) với số liệu đồng bộ từ hệ cũ, người vận hành xác
nhận quyết định (giữ số nào) qua UI — **chưa đọc sâu logic nghiệp vụ chi
tiết trong lượt onboarding này** (ngoài phạm vi "chỉ đọc kiến trúc", xem
`docs/REQUIREMENTS_AS_IS.md`).

## 6. Frontend

- React 19 + Vite 8 + TypeScript, UI trộn **shadcn/ui (Radix primitives) VÀ
  MUI** (2 hệ thống component song song — `@mui/material` lẫn
  `@radix-ui/*`/`radix-ui`), cộng `@fortune-sheet/react` (bảng tính kiểu
  Excel, khớp với nhu cầu nhập liệu dạng bảng) + `xlsx` (đọc/ghi Excel phía
  client) + `leaflet`/`react-leaflet` (bản đồ, khớp `Location`+`Coordinates`
  entity).
- State: Zustand (global) + TanStack Query (server state) + TanStack Table.
- Form/validate: React Hook Form + **cả Zod lẫn Yup** (2 thư viện validate
  song song — chưa rõ module nào dùng cái nào).
- Build: `pnpm` (Dockerfile dùng pnpm, có `pnpm-lock.yaml`) — nhưng repo
  CÓ CẢ `package-lock.json`, không dùng tới, dễ gây hiểu lầm dùng npm.
- Không có test nào (`package.json` không có script `test`).

## 7. Hạ tầng / Triển khai

- **Local dev**: `backend/docker-compose.yaml` (postgres + pgadmin +
  backend, healthcheck port sai — xem TECHNICAL_DEBT mục 5), frontend chạy
  riêng qua `pnpm dev` hoặc build Docker riêng.
- **Staging**: GitHub Actions (`deploy-staging.yml`, trigger PR → `main`) →
  `make staging` (build 3 image, push DockerHub) → SSH vào VPS
  (`STAGING_HOST`, credential trong GitHub Secrets, không hardcode) →
  `docker compose -f staging-docker-compose.yml up`. Volume Postgres bind
  mount cứng `/mnt/hdd/thong_ke_cs_postgres_data` (giả định thư mục này có
  sẵn trên VPS đích).
- **CORS**: `reverse_proxy/nginx_staging.conf` set
  `Access-Control-Allow-Origin: '*'` CÙNG LÚC
  `Access-Control-Allow-Credentials: true` — kết hợp này SAI theo spec CORS
  (trình duyệt sẽ từ chối credentialed request với wildcard origin), xem
  TECHNICAL_DEBT mục 7. Tầng Spring Security (`corsConfigurationSource()`)
  lại cấu hình ĐÚNG (`allowCredentials=false` khi wildcard origin) — 2 tầng
  CORS không nhất quán với nhau.

## 8. Biến môi trường (tổng hợp từ `application-prod.yaml` + docker-compose)

| Biến | Vai trò | Có giá trị mặc định dev? |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | Chọn profile (`dev`/`prod`) | `dev` |
| `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` | Kết nối Postgres | Chỉ dev có default (`localhost:5440`, `postgres`/`password`) |
| `REDIS_HOST/PORT/PASSWORD` | Kết nối Redis | Dev: `localhost:6379`, password rỗng |
| `PORTAL_JWKS_URI` | Endpoint public key verify JWT (prod) | Dev hardcode `http://localhost:1188/.well-known/jwks.json` |
| `MONGO_SYNC_URI` | Kết nối MongoDB nguồn đồng bộ | Dev có default chứa credential `root`/`example` (placeholder, không phải secret thật — xem TECHNICAL_DEBT mục 2) |
| `THONG_KE_PORT` | Cổng lắng nghe (prod) | Dev hardcode `8088` |
| `VITE_API_KONG_URL` | Base URL API cho frontend (build-time, staging) | Không có default — inject qua GitHub Secrets lúc CI build `.env` |
| `POSTGRES_USER/PASSWORD/DB`, `PGADMIN_EMAIL/PASSWORD` | Container Postgres/pgAdmin local | Có default dev yếu (`admin@admin.com`/`admin`) |
