# Codebase Map — THONGKE-CAOSON

Bản đồ thư mục nhanh, dựa trên đọc code thật (2026-08-29), không suy đoán.

## Cấu trúc top-level

```
THONGKE-CAOSON/
├── backend/                    Spring Boot 4.0.7 (Java 21), Maven — DB: PostgreSQL only
├── frontend/                   React 19 + Vite 8 + TypeScript, pnpm
├── reverse_proxy/               Nginx: nginx_staging.conf (staging thật) + nginx_preview.conf (MỚI, preview local)
├── deployment/
│   ├── staging/                Compose + script deploy staging (VPS qua SSH) — không đụng
│   └── preview/                 MỚI (2026-08-29): preview-docker-compose.yaml, chạy local qua factory
├── .github/workflows/          deploy-staging.yml (CI, trigger PR → main)
├── docker-compose-build.yml    build 3 image (reverse-proxy/frontend/backend) cho staging/release
└── Makefile                    up/clean/test/staging/release (build+push DockerHub)
```

## Backend (`backend/src/main/java/com/ecotel/thong_ke_cao_son/`)

| Package | Nội dung |
|---|---|
| `controller/` | 11 controller: `AuthController` (exchange-code/refresh qua Portal), `UserController`, `DepartmentController`, `LocationController`, `DeviceController`, `MaterialController`, `CargoGroupController`, `CargoTypeController`, `ShiftController`, `TransportReportController`, `ExcavationReportController`, `ReconciliationController` |
| `model/` | 20 entity JPA: `User`, `Department`, `Position`, `Shift`, `Location`(+`Coordinates`), `Device`(+`DeviceModel`/`DeviceType`/`DeviceFile`), `Material`(+`MaterialValueHistory`), `LoadLevel`, `CargoType`, `CargoGroup`, `TransportReport`(+`TransportReportTrip`), `ExcavationReport`(+`ExcavationReportTrip`), `ReconciliationDecision` |
| `repository/` | 16 Spring Data JPA repository, 1-1 với entity chính (không có repository riêng cho `Coordinates`/`DeviceFile`/`MaterialValueHistory` — có thể là `@Embeddable`/quan hệ owned, cần đọc entity nếu cần chỉnh) |
| `service/`, `dto/{request,response}/`, `mapper/` | Tầng nghiệp vụ + DTO + MapStruct mapper chuẩn layered architecture |
| `security/` | `SecurityConfig` (**ĐÃ BẬT lại JWT + permission 2026-08-29**, xem TECHNICAL_DEBT), `AppTokenFilter` (parse JWT claim `permissions` → `AppUserDetails`), `PermissionFilter` (gate theo `@RequirePermission`/`@PublicApi`), `OtcStore` (lưu one-time-code tạm cho exchange), `AppUserDetails` |
| `permission/` | `AuthenticatedUser`, `PermissionContext`, `PermissionDto` (cờ c/r/u/d/a theo resource) |
| `annotation/` | `@PublicApi`, `@RequirePermission` |
| `excel/` | `TransportReportExcel{Importer,Exporter}`, `ExcavationReportExcel{Importer,Exporter}` (Apache POI) |
| `enums/` | `Role`, `ApprovalStatus`, `DeviceGroup`, `DeviceStatus`, `LoadLevelType`, `PermissionAction` |
| `config/` | `AppConfig`, `JwtConverterConfig`, `OpenApiConfig` (Swagger) |
| `exception/` | Xử lý lỗi tập trung (chưa xác minh chi tiết từng handler) |
| `.graphify/` (2 vị trí) | **Không phải source** — cache của 1 tool phân tích AST code, bị commit nhầm. Xem TECHNICAL_DEBT mục 8. |

**Config** (`src/main/resources/`): `application.yaml` (chọn profile qua `SPRING_PROFILES_ACTIVE`), `application-dev.yaml` (default local, có placeholder dev), `application-prod.yaml` (100% qua env var, không hardcode).

**Test**: chỉ 1 file `ThongKeCaoSonApplicationTests.java` (`contextLoads()`), FAIL thật khi chạy độc lập — xem TECHNICAL_DEBT mục 3.

**SQL** (`backend/*.sql`, chạy tay, không phải Flyway/Liquibase): `init-db.sql` (tạo sequence), `seed-data.sql` (seed phòng ban/chức vụ/ca/1 user admin), `migration-remove-department.sql` (migration thủ công: bỏ cột `department_id` khỏi 2 bảng report).

## Frontend (`frontend/src/`)

| Thư mục | Nội dung |
|---|---|
| `modules/auth/` | `AuthGate`, `useAuth`, `tokenService`, đăng nhập qua Portal OTC exchange |
| `modules/dataentry/` | Nhập liệu Vận tải (`TransportEntryPage`) + Khai thác (`MiningEntryPage`), cột/schema/store riêng — module lớn nhất (có `store/`, `shared/`, `utils/` riêng) |
| `modules/reconciliation/` | `ReconciliationPage`, `StandardTripReportPage` — đối chiếu dữ liệu, component/types riêng |
| `modules/{departments,locations,machine,materials,cargoGroups,cargoTypes,shifts,users,vehicles}/` | 9 module danh mục CRUD, mỗi module có `services/` riêng gọi API tương ứng |
| `modules/report/` | Tiện ích xuất báo cáo (utils) |
| `modules/main/` | `router.tsx` (khai báo toàn bộ route + lazy import + `RoleGuard` theo `ROLE_TRANSPORT` v.v.), `pages/` |
| `components/`, `layouts/`, `hooks/`, `stores/`, `lib/`, `constants/`, `config/`, `types/`, `utils/` | Hạ tầng UI dùng chung (shadcn/ui + MUI trộn lẫn, Zustand cho state, TanStack Query/Table) |
| `@/components/ui/*.tsx` (4 file) | **Bản trùng lặp orphan**, không được import — bản thật ở `src/components/ui/`. Xem TECHNICAL_DEBT mục 8. |
| `transcript_match.json` | **Không phải source** — log hội thoại AI bị commit nhầm. Xem TECHNICAL_DEBT mục 8. |

Alias `@` → `./src` (khai báo cả `tsconfig.app.json` lẫn `vite.config.ts`, khớp nhau).

## Hạ tầng / Deploy

- `reverse_proxy/nginx_staging.conf` (staging thật, KHÔNG đụng): route `/` → frontend, `/api/` → backend, `/socket.io/` → backend (WebSocket upgrade — **backend Java hiện không có dependency Socket.IO**, xem TECHNICAL_DEBT).
- `reverse_proxy/nginx_preview.conf` (MỚI, 2026-08-29): preview local, route `/` → frontend, `/api/` → backend (`proxy_pass` TĨNH, không dùng biến — bài học từ lỗi thật đã sửa, xem TECHNICAL_DEBT). Không có route `/socket.io/`.
- `deployment/preview/preview-docker-compose.yaml` (MỚI, 2026-08-29): preview local đầy đủ qua factory — postgres+redis+backend+frontend+reverse-proxy, join network `factory-preview`, URL `http://thongke-caoson.preview.localhost:8080/`. Đã build + chạy + verify sống thật.
- `deployment/staging/staging-docker-compose.yml` + `start-app.sh` (KHÔNG đụng): stack staging đầy đủ, image kéo từ DockerHub theo `${DOCKER_REGISTRY}/thong-ke-cs-*-img:${IMAGE_TAG}`, volume Postgres bind mount cứng vào `/mnt/hdd/...`.
- `.github/workflows/deploy-staging.yml` (KHÔNG đụng): trigger khi có PR vào `main`, build 3 image qua `make staging`, transfer + deploy lên VPS qua SSH (credential trong GitHub Actions secrets, không hardcode).
