# Codebase Map — THONGKE-CAOSON

Bản đồ thư mục nhanh, dựa trên đọc code thật (2026-08-29), không suy đoán.

## Cấu trúc top-level

```
THONGKE-CAOSON/
├── backend/            Spring Boot 4.0.7 (Java 21), Maven
├── frontend/           React 19 + Vite 8 + TypeScript, pnpm
├── reverse_proxy/      Nginx (route /, /api/, /socket.io/)
├── deployment/staging/ Compose + script deploy staging (VPS qua SSH)
├── .github/workflows/  deploy-staging.yml (CI, trigger PR → main)
├── docker-compose-build.yml   build 3 image (reverse-proxy/frontend/backend) cho staging/release
└── Makefile            up/clean/test/staging/release (build+push DockerHub)
```

## Backend (`backend/src/main/java/com/ecotel/thong_ke_cao_son/`)

| Package | Nội dung |
|---|---|
| `controller/` | 11 controller: `AuthController` (exchange-code/refresh qua Portal), `UserController`, `DepartmentController`, `LocationController`, `DeviceController`, `MaterialController`, `CargoGroupController`, `CargoTypeController`, `ShiftController`, `TransportReportController`, `ExcavationReportController`, `ReconciliationController` |
| `model/` | 21 entity JPA: `User`, `Department`, `Position`, `Shift`, `Location`(+`Coordinates`), `Device`(+`DeviceModel`/`DeviceType`/`DeviceFile`), `Material`(+`MaterialValueHistory`), `LoadLevel`, `CargoType`, `CargoGroup`, `TransportReport`(+`TransportReportTrip`), `ExcavationReport`(+`ExcavationReportTrip`), `ReconciliationDecision`, `SyncCheckpoint` |
| `repository/` | 17 Spring Data JPA repository, 1-1 với entity chính (không có repository riêng cho `Coordinates`/`DeviceFile`/`MaterialValueHistory` — có thể là `@Embeddable`/quan hệ owned, cần đọc entity nếu cần chỉnh) |
| `service/`, `dto/{request,response}/`, `mapper/` | Tầng nghiệp vụ + DTO + MapStruct mapper chuẩn layered architecture |
| `security/` | `SecurityConfig` (**hiện permitAll toàn bộ**, xem TECHNICAL_DEBT), `AppTokenFilter` (parse JWT claim `permissions` → `AppUserDetails`), `PermissionFilter` (gate theo `@RequirePermission`/`@PublicApi`), `OtcStore` (lưu one-time-code tạm cho exchange), `AppUserDetails` |
| `permission/` | `AuthenticatedUser`, `PermissionContext`, `PermissionDto` (cờ c/r/u/d/a theo resource) |
| `annotation/` | `@PublicApi`, `@RequirePermission` |
| `sync/` | `ChangeStreamRunner` (lắng nghe MongoDB Change Streams), `MongoSyncHandler`, `MongoIdUtils`, `sync/handler/*SyncHandler.java` (9 handler theo entity: Department/DeviceModel/Device/DeviceType/Location/Material/Position/Shift/User), `InitialSyncRunner` (sync lần đầu khi bật) |
| `excel/` | `TransportReportExcel{Importer,Exporter}`, `ExcavationReportExcel{Importer,Exporter}` (Apache POI) |
| `enums/` | `Role`, `ApprovalStatus`, `DeviceGroup`, `DeviceStatus`, `LoadLevelType`, `PermissionAction` |
| `config/` | `AppConfig`, `JwtConverterConfig`, `MongoSyncConfig`, `OpenApiConfig` (Swagger) |
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

- `reverse_proxy/nginx_staging.conf`: route `/` → frontend, `/api/` → backend (strip qua `proxy_pass http://backend/api/`), `/socket.io/` → backend (WebSocket upgrade — **backend Java hiện không có dependency Socket.IO**, xem TECHNICAL_DEBT mục 6).
- `deployment/staging/staging-docker-compose.yml` + `start-app.sh`: stack staging đầy đủ (reverse-proxy/frontend/backend/postgres/pgadmin), image kéo từ DockerHub theo `${DOCKER_REGISTRY}/thong-ke-cs-*-img:${IMAGE_TAG}`, volume Postgres bind mount cứng vào `/mnt/hdd/...` (giả định server đích có sẵn đường dẫn này).
- `.github/workflows/deploy-staging.yml`: trigger khi có PR vào `main`, build 3 image qua `make staging`, transfer + deploy lên VPS qua SSH (toàn bộ credential nằm trong GitHub Actions secrets, không hardcode trong repo — đã xác minh).
