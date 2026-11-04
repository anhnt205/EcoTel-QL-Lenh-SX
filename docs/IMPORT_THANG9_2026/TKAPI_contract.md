# HỢP ĐỒNG API — Phần mềm Thống kê Cao Sơn (TK)

Phạm vi: đọc mã nguồn `projects/DIEU-PHOI-MM/ThongKe/` (backend Spring Boot 4.0.7 / Java 21 / Postgres 16) + GET kiểm chứng
trên preview `http://localhost:6869/tk-api/api/...` + SELECT chỉ-đọc vào `dpmm-preview-tk_postgres-1`. Mục đích: nạp dữ
liệu tháng 9/2026 qua API.
**KHÔNG gọi POST/PUT/DELETE nào, không sửa DB.** Mọi con số hiệu năng ghi "ước lượng" là CHƯA ĐO.
Đường dẫn Java dưới đây tính từ `ThongKe/backend/src/main/java/com/ecotel/thong_ke_cao_son/`.

Trạng thái preview lúc đọc (SELECT): 49 bảng, **tất cả trống** (shifts, devices, departments, users, matrix_definitions,
report_periods… đều 0 dòng); Flyway chỉ có V1 baseline; `GET /matrix-catalogs` trả `[]`.

---

## 0. Quy ước chung

| Mục | Nội dung |
|---|---|
| Base URL | `http://localhost:6869/tk-api/api` (nginx cắt tiền tố `/tk-api/`, backend nghe `:8088`, không publish ra host) |
| Xác thực | `Authorization: Bearer <appToken>`; lấy qua Điều phối: `POST http://localhost:6869/api/auth/login` -> `data.token`; `GET http://localhost:6869/api/auth/tk-token` -> `data.appToken` |
| Token (đã giải mã claim, không in token) | HS256, `typ=access`, `app=tkcs`, TTL ~8h (28800 s, `exp` còn ~28.800 s lúc kiểm tra), **`permissions` = c/r/u/d/a đều TRUE cho cả 34 resource**, `departmentId=null`, **`fullDataScope=true`** (thấy mọi đơn vị). Không cần có dòng nào trong bảng `users` cục bộ. Hết hạn -> gọi lại `tk-token`. |
| Chế độ auth | `AUTH_MODE=standalone` (env container). Token refresh (`typ=refresh`) bị từ chối làm access token. |
| Bao gói | `{"status":200,"success":true,"message":"Success","data":...,"timestamp":...}`; lỗi `{"status":4xx,"success":false,"message":"..."}` |
| Phân trang (GET danh sách) | `?page=0&size=N&sort=id,asc&keyword=`; trả `data={content[],page,size,totalElements,totalPages,last}`. **size bị chặn tối đa 2000** (đã thử `size=5000` -> `size:2000`). Mặc định size 10 (production/results mặc định 20). |
| Kiểu dữ liệu | Ngày `"2026-09-01"` (ISO); số thập phân là JSON number (BigDecimal cho định mức/tỷ trọng, Double cho nhiên liệu/cung độ); enum là chuỗi. |
| Tham chiếu | **Hầu hết tham chiếu bằng `id` (Long)**, không bằng code. Ngoại lệ tham chiếu bằng chuỗi: `device-production-attributes/bulk` (code thiết bị), khoá lưới (`rowKey/colKey`), STD (`seamGroupExcavatorKey`), `ModelPeriod.values` (khoá cột), và 2 API import Excel (tên/mã). |
| Mã lỗi hay gặp | 400 nghiệp vụ/validation (`BadRequestException`, `Validation failed` kèm map field), 403 (thiếu quyền hoặc ngoài đơn vị), 404 (`ResourceNotFoundException`), **409 `Data integrity violation, please check your input`** (vi phạm UNIQUE/FK ở DB — không nói cột nào), 500 `Internal server error` (kể cả file upload quá cỡ). |
| Suy quyền từ HTTP | `PermissionFilter`: GET->`r`, POST->`c`, PUT/PATCH->`u`, DELETE->`d`; riêng `a` (duyệt) chỉ ở: `POST /reconciliation/decisions`, `POST /reconciliation/decisions/bulk`, `POST /report-periods/{id}/unlock`. `POST /reconciliation/trips/resubmit` cần `u`. Endpoint thiếu `@RequirePermission` bị chặn 403 (fail-closed). |

**Mẫu CRUD chung** (áp dụng cho các danh mục "phẳng", trừ khi mục riêng nói khác):
`GET /` , `GET /{id}`, `POST /` (1 bản ghi), `POST /bulk` (mảng, **một transaction — 1 phần tử sai thì không lưu gì**; trùng mã
trong chính danh sách bị chặn; trùng mã với DB bị chặn bằng 400 "Mã … đã tồn tại"), `PUT /{id}`, `DELETE /{id}`,
`DELETE /bulk` body `{"ids":[...]}` -> `{requestedCount,deletedCount}`.

---

## 1. Thứ tự nạp đề xuất (phụ thuộc)

```
[SQL, không có API]  shifts · device_types · devices(+department_id) · matrix_definitions(4 lưới)
        │
1. departments -> positions -> users(nhân viên: salaryCode)        (user cần positionId; dùng làm employeeId của phiếu)
2. vehicle-types · vehicle-fuel-classes · vehicle-category-classes · vehicle-rank-groups -> vehicle-ranks
3. device-production-attributes/bulk  (gán fuelClass/vehicleType/rank/bucket… cho devices theo CODE)    ← cần (1),(2) và devices
4. cargo-groups · acceptance-products · ttl-clh-items -> cargo-types
5. excavation-areas (PHẢI có areaGroup CS/KC TRƯỚC khi nhập chuyến) · pickup-points · seam-groups -> receiving-points · unloading-points
6. coefficients (HS.THAN.TRUDA, HS.BUN)
7. density-parameters (cargoTypeId × [excavationAreaId] × khoảng ngày phủ hết kỳ)
8. Lưới matrix: tạo VERSION phủ ngày -> rows/cols -> cells : MO_HINH, NANG_SUAT_XE, DMNL, HS_DIEU_CHINH_NLDM
9. (chỉ khi tkeMode=false) survey-standards (STD) — khoá lấy từ lần tính TKE (xem §4.4)
10. transport-reports / excavation-reports  (POST /bulk hoặc /import)           ← cần 1..5 (id)
11. Đối chiếu: GET reconciliation theo từng NGÀY -> POST decisions/bulk APPROVED (cặp đủ 2 id)
12. report-periods (tạo SAU khi duyệt xong, xem bẫy §9.3) -> POST production/calculate -> GET summary/results -> (lock)
```

---

## 2. Thực thể KHÔNG có API tạo (bắt buộc SQL hoặc cấu hình ngoài)

| Thực thể | Thực trạng trong code | Cách nạp |
|---|---|---|
| **Ca (shifts)** | `ShiftController` chỉ có `GET /` và `GET /{id}`. `name` là **Integer** (1,2,3,4); `start_time/end_time` là chuỗi `'06:00'`. | SQL: `INSERT INTO shifts(id,name,start_time,end_time,created_at,updated_at) VALUES (nextval('shift_seq'),1,'06:00','14:00',now(),now())…` (mẫu: `backend/seed-data.sql`, `seed-data-khai-thac.sql` có Ca 1-4). Importer Excel tra Ca theo `name`. |
| **Thiết bị (devices)** — xe + máy xúc | `DeviceController`: chỉ GET + `POST /devices/sync-from-taisan`. Sync cần env `TAISAN_API_BASE_URL/TAISAN_SERVICE_KEY/TAISAN_ID_CONG_TY` — **cả 3 đều CHƯA đặt** trong container preview (đã kiểm: NOT set). Sync còn không set `group_type`, `department_id`, thuộc tính sản lượng. | SQL `INSERT INTO devices`. Cột NOT NULL không default: `id, code, status` (`status='AVAILABLE'`). Nên set thêm: `name, vehicle_number, category_id, department_id, power`. Sau đó dùng `device-production-attributes` để gán thuộc tính sản lượng. **`devices.code` KHÔNG unique ở DB nhưng toàn bộ code tra `findByCode` (Optional) — mã trùng => lỗi; xe và máy xúc dùng chung 1 không gian mã.** |
| **Loại thiết bị (device_types)** | Không có controller (permission `device-types` có tên nhưng không có endpoint). `group_type` ∈ `XE|MAY`. | SQL (mẫu `seed-data-khai-thac.sql`). Không bắt buộc cho engine; chỉ để lọc XE/MAY ở UI và `vehicleModel()` lùi về tên loại khi chưa có fuelClass. |
| **Định nghĩa 4 lưới (matrix_definitions)** | `MatrixCatalogController` chỉ tạo được PHIÊN BẢN (`POST /{code}/versions`) của lưới đã có; **không tạo được lưới mới**. DB trống => `GET /matrix-catalogs` = `[]`. | SQL chạy `backend/seed-matrix-catalogs.sql` (INSERT 4 dòng id 1-4: `MO_HINH, DMNL, NANG_SUAT_XE, HS_DIEU_CHINH_NLDM`, `effective_from` NULL, rồi `setval('matrix_definition_seq',…)`). |
| `locations`, `materials`, `classifications` | `locations`/`materials`: chỉ GET (legacy, không FK trỏ tới, engine không đọc). `classifications` có CRUD nhưng engine KHÔNG đọc (Phân loại DAT/Than tự suy từ SPNT). | Bỏ qua. |
| `model_periods` (UI "Mô hình" mới) | Có CRUD nhưng **engine KHÔNG đọc** (QĐ-20 ghi "tạm gác"; grep `ModelPeriod` chỉ có controller/service/model). | Bỏ qua; engine đọc lưới `MO_HINH`. |

---

## 3. Hợp đồng từng thực thể

### 3.1 Ca — `GET /api/shifts` (resource `shifts`, chỉ `r`)
- Response phần tử: `id, name(Integer), code, startTime, endTime…`. Sắp tăng dần (`sort=id,asc`).
- Tạo: SQL (xem §2). Dùng `id` của ca làm `shiftId` ở phiếu.

### 3.2 Đơn vị / Phòng ban — `/api/departments` (resource `departments`)
Endpoint: `GET /`, `GET /{id}`, `GET /available-resources`, `POST /`, `PUT /{id}`, `DELETE /{id}` (**không có `/bulk`**).
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `code` | string | ✔ | UNIQUE (cả DB lẫn service: "Mã phòng ban đã tồn tại") |
| `name` | string | ✔ | UNIQUE ở DB |
| `description` | string | | |
| `allowedResources` | string[] | | mỗi phần tử phải thuộc 34 resource (`GET /departments/available-resources`); **trần quyền** của chức vụ. |
| `fullDataScope` | boolean | | true = thấy toàn bộ dữ liệu mọi đơn vị (đơn vị kiểu Thống kê). Mặc định false. |
```json
{"code":"VT7","name":"Phân xưởng Vận tải 7","description":"PXVT 7","allowedResources":["transport-reports"],"fullDataScope":false}
```
Xoá bị chặn nếu còn Chức vụ thuộc phòng ban. `devices.department_id` (đơn vị quản lý thiết bị) trỏ vào bảng này — chỉ set được bằng SQL.

### 3.3 Chức vụ — `/api/positions` (resource `positions`)
`GET /` (lọc `departmentId`), `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}` (**không có /bulk**).
| Trường | Kiểu | BB | Ghi chú |
|---|---|---|---|
| `code` | string | ✔ | unique (service) |
| `name` | string | ✔ | |
| `departmentId` | long | ✔ | id phòng ban |
| `description` | string | | |
| `permissions[]` | `{resource,c,r,u,d,a}` | | THAY THẾ toàn bộ quyền; `resource` phải nằm trong `allowedResources` của phòng ban, nếu không 400 "Phòng ban … chưa được phép dùng các chức năng: …" |
```json
{"code":"TK-GHI","name":"Thống kê ghi chuyến","description":null,"departmentId":1,
 "permissions":[{"resource":"transport-reports","c":true,"r":true,"u":true,"d":false,"a":false}]}
```
Để trống `permissions` => chức vụ **không có quyền nào** (theo `LocalAuthService.permissionsFor`: chỉ tài khoản CHƯA có chức vụ mới được fallback "chỉ đọc"; chức vụ tồn tại mà không có dòng quyền => c/r/u/d/a đều false). Với việc nạp dữ liệu bằng token Điều phối thì quyền chức vụ không liên quan.

### 3.4 Người dùng / nhân viên — `/api/users` (resource `users`)
`GET /` (lọc `keyword`, `departmentId`), `GET /{id}`, `POST /`, `PUT /{id}` (**không có DELETE, không /bulk**).
Tạo (`UserAccountCreateRequest`):
| Trường | BB | Ghi chú |
|---|---|---|
| `username` | ✔ | UNIQUE ("Tên đăng nhập đã tồn tại") |
| `password` | ✔ | ≥ 6 ký tự (BCrypt). User tạo ra đăng nhập được ở `/api/auth/login` của TK — dùng mật khẩu ngẫu nhiên, sau đó `PUT active=false` nếu chỉ là "nhân viên tham chiếu". |
| `salaryCode` | ✔ | **Số thẻ lương, UNIQUE** ("Số thẻ lương đã tồn tại"). Importer Excel tra user theo `salaryCode`. |
| `fullName` | ✔ | |
| `positionId` | ✔ | id chức vụ; **Phòng ban tự suy từ chức vụ**, không có trường `departmentId`/`role` trong request. `role` DB tự = `EMPLOYEE`, `active=true`. |
| `permissions[]` | | quyền riêng; rỗng = thừa kế quyền của chức vụ (chức vụ không có quyền => user không có quyền gì) |
```json
{"username":"nv8753","password":"Zx9!kLm2pQ","salaryCode":"8753","fullName":"Nguyễn Xuân Bằng","positionId":2,"permissions":[]}
```
Sửa (`PUT`): `salaryCode, fullName, positionId, active(BB), password(tuỳ chọn ≥6), permissions`.
`id` của user chính là `employeeId` ở phiếu Khai thác/Vận tải.

### 3.5 Thiết bị + thuộc tính sản lượng

**Danh mục xe (CRUD phẳng + `/bulk`)** — `{code(BB,unique), name(BB), note}`:
| Danh mục | Path | Resource | Dùng ở engine |
|---|---|---|---|
| Chủng loại xe (VehicleType) | `/api/vehicle-types` | `vehicle-types` | khoá cột lưới **MO_HINH** (`<code>.<CS|KC>`) và **NANG_SUAT_XE** (`<code>.<DAT|Than>`) |
| Chủng loại xe (NL) (VehicleFuelClass) | `/api/vehicle-fuel-classes` | `vehicle-fuel-classes` | gốc khoá **DMNL** và dòng **HS_DIEU_CHINH_NLDM**; **thiếu = engine báo thiếu nhánh nhiên liệu => lỗi tổng hợp** |
| Chủng loại xe + phân loại (VehicleCategoryClass) | `/api/vehicle-category-classes` | `vehicle-category-classes` | engine KHÔNG đọc (QĐ-20) |
| Nhóm hạng xe | `/api/vehicle-rank-groups` | `vehicle-rank-groups` | |
| Hạng xe (VehicleRank) | `/api/vehicle-ranks` | `vehicle-ranks` | body `{code(BB), rank(Integer,BB), vehicleRankGroupId(BB), note}`; `code` chữ đầu tạo khoá HS_DIEU_CHINH (`A/B/C1…`); hệ số hạng xe 0,97/1/1,04/1,06 CỨNG trong `FuelCalculator.vehicleClassFactor` |

**Gán thuộc tính sản lượng cho thiết bị** — `/api/device-production-attributes` (resource `device-production-attributes`):
`GET /?categoryGroup=XE|MAY&keyword=`, `PUT /{id}`, `POST /bulk` (= **UPSERT/cập nhật theo `code` thiết bị, không tạo thiết bị**; mã không tồn tại => 400 "Không tìm thấy thiết bị với mã: …" cho toàn lô).
| Trường | Ghi chú |
|---|---|
| `code` | chỉ dùng ở `/bulk` |
| `fuelClassId` | id VehicleFuelClass (BẮT BUỘC cho xe tải nếu có cung độ) |
| `vehicleTypeId` | id VehicleType (BẮT BUỘC cho xe tải — tra lưới Mô hình) |
| `vehicleRankId` | id VehicleRank (khoá HS_DIEU_CHINH dùng chữ đầu) |
| `categoryClassId` | tuỳ chọn |
| `carRenovation` | chuỗi; `"CaiToa"` => ×1,03 |
| `qualityLevel`, `vehicleClass` (deprecated), `bucketCapacity` (máy xúc, m³) | |
**Ngữ nghĩa THAY THẾ**: field không gửi (null) bị **xoá trắng** (trừ `vehicleClass` chỉ ghi khi có giá trị). Luôn gửi đủ.
```json
[{"code":"473","vehicleTypeId":1,"fuelClassId":1,"vehicleRankId":3,"categoryClassId":null,"carRenovation":"CaiToa","qualityLevel":null,"bucketCapacity":null},
 {"code":"P15","bucketCapacity":6.5}]
```

### 3.6 Hàng hoá

| Danh mục | Path (resource) | Body | Ràng buộc |
|---|---|---|---|
| Nhóm hàng (CargoGroup) | `/api/cargo-groups` (`cargo-groups`) | `{code(BB), name(BB), description}` | `name` được engine đọc: bắt đầu "D" => làm tròn Mô hình 1 chữ số; bắt đầu "TCN" => nhánh CTNB |
| Sản phẩm nghiệm thu | `/api/acceptance-products` (`acceptance-products`) | `{code(BB), name(BB), note}` | **engine so theo TÊN**: `Dat_SX, Dat_CN, Than_SX, Than_CN, Dat_TCN` (khác hoa/thường vẫn khớp). Chữ đầu `S`/`D` => phân loại ĐẤT, còn lại THAN. |
| TTL CLH | `/api/ttl-clh-items` (`ttl-clh-items`) | `{code(BB), name(BB), note}` | chỉ dùng sinh mã hoá hàng (không chặn) |
| Chủng loại hàng (CargoType) | `/api/cargo-types` (`cargo-types`) | `{code(BB), name(BB), cargoGroupId(BB), acceptanceProductId, ttlClhId, description}` | `code` UNIQUE (service). **Engine ném lỗi nếu `acceptanceProductId` null** (xem §4). `code` là khoá DÒNG lưới MO_HINH; `name` dùng cho Excel import, khoá STD (`Dthai`, `B.Duot`…) và nhiều nhánh (`SPNT.via`, `DaXit.NK`). |
```json
{"code":"CLH001","name":"Đá xít","cargoGroupId":2,"acceptanceProductId":5,"ttlClhId":3,"description":null}
```
Cột legacy `cargo_types.acceptance_product`/`ttl_clh` (chuỗi) còn trong DB nhưng API không ghi.

### 3.7 Vị trí

| Danh mục | Path (resource) | Body | Dùng ở |
|---|---|---|---|
| Khu vực xúc | `/api/excavation-areas` (`excavation-areas`) (+`GET /area-groups`->`["CS","KC"]`) | `{code(BB), name(BB), areaGroup, note}` — **`areaGroup` chỉ `CS` hoặc `KC`** (400 nếu khác; để trống được nhưng engine lùi về so mã = "CS" ? CS : KC) | Transport trip `excavationAreaId`; quyết định `receiving_floor_group`; khoá STD dùng **code** khu vực |
| Nơi chất tải (PickupPoint) | `/api/pickup-points` (`pickup-points`) | `{code,name,note}` | **Phiếu KHAI THÁC**: `receivingLocationId` trỏ vào bảng này (UI gọi "Nơi nhận tải" ở Excel!) |
| Nhóm vỉa (SeamGroup) | `/api/seam-groups` (`seam-groups`) | `{code,name,note}` | `code` là thành phần đầu của khoá STD |
| Nơi nhận tải (ReceivingPoint) | `/api/receiving-points` (`receiving-points`) | `{code,name,seamGroupId,note}` (`seamGroupId` tuỳ chọn nhưng **cần cho khoá STD**) | **Phiếu VẬN TẢI**: `loadingPointId` trỏ vào bảng này |
| Nơi dỡ tải | `/api/unloading-points` (`unloading-points`) | `{code,name,note}` | Transport `unloadingPointId`; tên `"Băng tải."`/`"Cạp…"` kích hoạt nhánh khoá ĐMNL/hậu tố |
Tất cả có `/bulk`. Mã UNIQUE; **tên KHÔNG unique** nhưng Excel import tra theo tên (xem §6).

> Bẫy tên: Khai thác `receivingLocationId` = **PickupPoint** (Nơi chất tải); Vận tải `loadingPointId` = **ReceivingPoint** (Nơi nhận tải, có nhóm vỉa).

### 3.8 Hệ số — `/api/coefficients` (resource `coefficients`)
Body `{code(BB,unique), name(BB), value(BB,BigDecimal), note}`. **Engine chỉ đọc 2 mã:**
- `HS.THAN.TRUDA` (nhân tổng tấn khi SPNT = `Than_SX`; thiếu => ném "Danh mục Hệ số chưa có mã "HS.THAN.TRUDA"…" ngay chuyến đầu gặp).
- `HS.BUN` (BSNL bùn: chuyến chở hàng có tên bắt đầu `B.Duot/B.Loang/DBChan/B.Chan/B.Tron/DBTron` mà xe ≠ HM400-2R; thiếu => cảnh báo gộp thành lỗi).
Các mã `HS.DATHAI.*` (seed-he-so.sql) **engine chưa đọc**. Hệ số mùa (T6-9 ×1,03), hệ số hạng xe (0,97/1/1,04/1,06), cải tạo toa (1,03), hệ số mưa/bổ túc… **cứng trong `FuelCalculator`**, không khai báo được qua API. "HS điều chỉnh NLĐM" là LƯỚI (§3.10).
```json
{"code":"HS.THAN.TRUDA","name":"Hệ số than TKE trừ đá","value":0.95,"note":null}
```

### 3.9 Tỷ trọng — `/api/density-parameters` (resource `density-parameters`)
`GET /`, `GET /lookup?cargoTypeId=&excavationAreaId=&date=`, `GET /{id}`, `POST /`, `POST /bulk`, `PUT /{id}`, `DELETE /{id}`, `DELETE /bulk`, `PUT /batch` (xoá `deleteIds` + tạo `creates` trong 1 giao dịch).
| Trường | BB | Ghi chú |
|---|---|---|
| `cargoTypeId` | ✔ | |
| `excavationAreaId` | | null = mọi khu vực; **bản có khu vực thắng bản null** |
| `effectiveFrom`, `effectiveTo` | ✔ | không chồng nhau trên (cargoType, area) — 400 "Đã có Tỷ trọng cho … chồng khoảng ngày" (cả trong cùng lô, kiểm tra O(n²)) |
| `densityWet` | ✔ | tỷ trọng đang dùng (AI) |
| `densityDry` | ✔ | không quy ẩm |
```json
{"cargoTypeId":1,"excavationAreaId":null,"effectiveFrom":"2026-09-01","effectiveTo":"2026-09-30","densityWet":1.30,"densityDry":1.36,"note":null}
```
Engine tra theo **ngày sản xuất của từng chuyến**; trượt (và chuyến không có `provisionalDensity`) => 400 "Chưa khai báo Tỷ trọng có hiệu lực ngày … cho chủng loại hàng id=…".

### 3.10 Lưới tra bảng (matrix) — "Mô hình đầy đủ", ĐMNL, Năng suất xe, HS điều chỉnh NLĐM
Resource `matrix-catalogs`; path `/api/matrix-catalogs/{code}`, `code ∈ MO_HINH | DMNL | NANG_SUAT_XE | HS_DIEU_CHINH_NLDM` (phải đã có trong `matrix_definitions` — §2).
| Endpoint | Ghi chú |
|---|---|
| `GET /` , `GET /{code}[?versionId=|date=]`, `GET /{code}/versions` | xem lưới (mặc định bản mới nhất) |
| `POST /{code}/versions` | body `{effectiveFrom(BB), effectiveTo, versionLabel, note, sourceId, copyCells(mặc định true)}` — tạo phiên bản mới, **đóng phiên bản nguồn** ở ngày trước; 400 "Đã có phiên bản bắt đầu từ ngày …" |
| `PUT /{code}/versions/{versionId}` | sửa meta; `DELETE …` xoá phiên bản (không xoá bản cuối) |
| `POST /{code}/rows?versionId=` / `POST …/cols?versionId=` | body mảng `[{key(BB), label, numericValue, sortOrder}]`; khoá đã có thì bỏ qua; trục số mà `key` không đọc ra số => 400 |
| `PUT /{code}/cells?versionId=` | body `[{rowKey,colKey,value}]`; `value:null` = xoá ô; **dòng/cột phải đã khai trên trục** (400 "Dòng "x" chưa có trong lưới …") |
| `DELETE /{code}/rows?key=` / `cols?key=` | xoá kèm ô |
**Không gửi `versionId` => ghi vào phiên bản MỚI NHẤT.** Engine tra phiên bản **có hiệu lực tại ngày sản xuất** (`effectiveFrom ≤ d ≤ effectiveTo`, NULL = không giới hạn; nhiều bản thoả => `effectiveFrom` MUỘN NHẤT thắng).

Khoá lưới (theo `ProductionKeys`, sai một ký tự là "thiếu khai báo"):
| Lưới | Dòng | Cột | Ví dụ |
|---|---|---|---|
| `MO_HINH` (m³/chuyến) | `cargoType.code` | `<vehicleType.code>.<CS|KC>` (nhóm khu vực của chuyến) | `CLH001` × `CAT777E.CS` |
| `NANG_SUAT_XE` | trục SỐ cung độ (0,1 … 8; engine làm tròn 1 chữ số, >8 lấy 8; tra dòng có `numericValue` == cung độ) | `<vehicleType.code>.<DAT|Than>` | `3.5` × `CAT777E.DAT` |
| `DMNL` | trục SỐ độ dốc (liftHeight) | `<fuelClass.code>.<hậu tố>_<cung độ>`; hậu tố: `.Bun` / `.Dat` / `.BK` / `.DAT|Than` theo quy tắc `fuelNormVehicleKey`; số cung độ **bỏ số 0 cuối** ("3" không phải "3.0"); nội suy song tuyến | `CAT777E.DAT_3` |
| `HS_DIEU_CHINH_NLDM` | `<fuelClass.code>_<chữ đầu hạng xe>_<DAT|Than>` | `T<tháng>.<CS|KC>` (12 tháng × 2) | `CAT777E_C_DAT` × `T9.CS` |
Các tháng/hậu tố/hệ số khác xem `docs/BAO_CAO_TONG_HOP_LOGIC.md` §B và `service/production/ProductionKeys.java`.
Quy mô tham khảo (server thật, docs lượt 29d/30b): DMNL 28 độ dốc × 960 cột = 26.880 ô; NANG_SUAT_XE 80 × 27 = 2.160 ô; HS_DIEU_CHINH 21 hàng × 24 cột (339 ô đã nạp). `matrix_cell_seq` tăng 100/lần. Gửi `PUT …/cells` theo lô vài nghìn ô (một lần gọi nạp lại toàn bộ ô hiện có của phiên bản rồi saveAll).
```http
POST /api/matrix-catalogs/MO_HINH/versions   {"effectiveFrom":"2026-09-01","effectiveTo":"2026-12-31","versionLabel":"T9-2026","copyCells":false}
POST /api/matrix-catalogs/MO_HINH/rows?versionId=5  [{"key":"CLH001","label":"Đá xít"}]
POST /api/matrix-catalogs/MO_HINH/cols?versionId=5  [{"key":"CAT777E.CS"},{"key":"CAT777E.KC"}]
PUT  /api/matrix-catalogs/MO_HINH/cells?versionId=5 [{"rowKey":"CLH001","colKey":"CAT777E.CS","value":34.5}]
```
**Cả 3 lưới nhiên liệu (DMNL, NANG_SUAT_XE, HS_DIEU_CHINH_NLDM) PHẢI có phiên bản hiệu lực tại ngày đầu kỳ** ngay cả khi tkeMode=true (thiếu => cảnh báo gộp thành lỗi). Riêng nhánh nhiên liệu của MỘT chuyến bị bỏ qua nếu `cung độ = 0` (DMNL=0) hoặc `tripCount=0`.

**Model-periods (`/api/model-periods`)** — body `{cargoTypeId, effectiveFrom, effectiveTo, note, values:{"CAT777E.CS":34.5,…}}`, có `/bulk`, `/batch`, `/lookup`; **engine không đọc** => chỉ nạp nếu UI cần.

### 3.11 STD (số trắc địa), AP Tdia, khoá "Nhóm vỉa + Máy xúc"
- **Khoá "Nhóm vỉa + Máy xúc" KHÔNG phải bảng**: là chuỗi `seamGroup.code _ benchGroup _ excavator.code _ [mudMark] _ excavationArea.code _ hậu tố` (bỏ thành phần rỗng, nối bằng `_`). Engine tự suy từng chuyến: `seamGroup`= `receivingPoint.seamGroup.code`; `benchGroup`= `receiving_floor_group` đã lưu của trip; `excavator`= `devices.code` máy xúc; `mudMark` suy từ tên loại hàng (`B.Loan…`->`Bun`…); `excavationArea`= `excavation_areas.code` (KHÔNG phải CS/KC); hậu tố ∈ {`BK`,`SPNT`,`2,25`,`dthai`} suy theo (nơi dỡ tải "Băng tải", nhóm hàng "SPNT.via", tỷ trọng = 2,25, loại hàng "Dthai"). `POST /api/survey-standards/build-key` (body `SeamGroupKeyRequest`) chỉ hỗ trợ ghép; `GET /survey-standards/key-suffixes` -> `["BK","SPNT","2,25","dthai"]`.
- **STD** `/api/survey-standards` (resource `survey-standards`): `GET /` (lọc `catalogType`), `/keys`, `/lookup`, `/{id}`, `POST /`, `POST /bulk`, `PUT /{id}`, `DELETE`, `PUT /batch`.
| Trường | BB | Ghi chú |
|---|---|---|
| `catalogType` | ✔ | `DAT_SX_THAN_SX` hoặc `DAT_CN` (engine dùng `DAT_CN` chỉ khi SPNT = `Dat_CN`; còn lại `DAT_SX_THAN_SX`) |
| `seamGroupExcavatorKey` | ✔ | **phải khớp CHÍNH XÁC khoá engine dựng** |
| `seamGroup,benchGroup,excavator,mudMark,excavationArea,suffix` | | thành phần hiển thị |
| `effectiveFrom,effectiveTo` | ✔ | không chồng trên (catalogType,key); engine tra theo **ngày đầu kỳ** (AP Tdia/Tkm) và theo **ngày chuyến** (Thể trọng) — nên phủ trọn tháng |
| `earthM3, earthDesignVolume, earthDeviation, earthTon, earthHaulDistance, earthBulkDensity, earthTkm, earthAcceptanceProduct` | | khối Đất |
| `coalM3, coalBulkDensity, coalTon, coalDesignVolume, coalDeviation, coalHaulDistance, coalTkm, coalAcceptanceProduct` | | khối Than (bị xoá nếu `DAT_CN`) |
**Mỗi khoá chỉ MỘT dòng STD (cùng catalogType, ngày) và phải điền cả khối Đất lẫn Than** (docs lượt 9, bẫy 2).
- **AP Tdia / Ap Tkm** là **ĐẦU RA** của engine (`survey_coefficients`), không có API nhập: `GET /api/production/survey-coefficients?periodId=` và `GET /api/production/ap-tracdia?year=&month=&excavatorCode=&key=`. Dùng đầu ra của lần tính **tkeMode=true** để lấy danh sách khoá cần khai STD (§4.4).
- TKE mode không cần STD (`buildApTdia` trả hệ số 1 trước khi tra STD; `resolveBulkDensity` dùng tỷ trọng thường).

### 3.12 Kỳ báo cáo — `/api/report-periods` (resource `report-periods`)
`GET /`, `GET /by-month?year&month` (**CÓ TÁC DỤNG PHỤ: nếu tháng chưa có kỳ nào, tự TẠO 1 kỳ cả tháng**), `GET /{id}`, `POST /`, `POST /bulk`, `POST /generate?year&month` (5 kỳ mặc định 1/8/15/22/29; 400 nếu tháng đã có kỳ), `PUT /{id}`, `DELETE /{id}`, `DELETE /bulk`, `POST /{id}/lock`, `POST /{id}/unlock` (cần `a`), `GET /{id}/audits`.
| Trường | BB | Ràng buộc |
|---|---|---|
| `year` (2000-2100), `month` (1-12), `periodIndex` (≥1), `fromDate`, `toDate` | ✔ | khoảng ngày nằm gọn trong tháng đã khai; không chồng kỳ khác; UNIQUE (year,month,periodIndex) |
| `displayName`, `note` | | trống thì tự sinh "Kỳ 01, 1/9 đến 30/9" |
```json
{"year":2026,"month":9,"periodIndex":1,"fromDate":"2026-09-01","toDate":"2026-09-30","displayName":null,"note":null}
```
- `calculatePeriod` còn đòi **tháng không hở** (QĐ-05): mọi ngày của tháng phải thuộc đúng một kỳ.
- `lock`: yêu cầu kỳ đã có kết quả tính (400 "chưa có kết quả tính nào"); kỳ chốt không sửa/xoá/tính lại được. `unlock` body `{"reason":"…"}` (bắt buộc), đặt `stale=true`. `lock/unlock` dùng claim `sub` của token (đã kiểm `sub` là số nên `Long.parseLong` được).

### 3.13 Khai thác — `/api/excavation-reports` (resource `excavation-reports`)
Endpoint: `POST /` , `POST /bulk`, `GET /{id}`, `GET /?fromDate=&toDate=[&shiftIds&excavatorIds&receivingLocationIds&excavationFloors]` (fromDate/toDate BẮT BUỘC), `GET /excavation-floors`, `PUT /{id}` (**thay toàn bộ trips**), `PUT /bulk` (`[{id,data}]`), `DELETE /{id}`, `DELETE /bulk`, `GET|PUT|DELETE /trips/{tripId}`, `PUT /trips/bulk`, `DELETE /trips/bulk`, `GET /export`, `POST /import` (multipart).
Phiếu (1 phiếu = 1 khoá `(reportDate, shiftId, excavatorDeviceId, employeeId)` — **UNIQUE `uk_excavation_report_key`**):
| Trường phiếu | BB | Ghi chú |
|---|---|---|
| `reportDate` | ✔ | |
| `shiftId` | ✔ | id ca |
| `excavatorDeviceId` | ✔ | id thiết bị (máy xúc) |
| `receivingLocationId` | ✔ | **id PickupPoint (Nơi chất tải)** |
| `employeeId` | ✔ | id user (Số thẻ lương) |
| `excavationFloor` | | chuỗi tự do ("Tầng xúc") |
| `fuelBeginning, fuelEnding, fuelReceived` | | Double; `fuelUsed` = begin + received − end, tự tính |
| `trips[]` | ✔ (≥1) | |
Trip: `vehicleId`(BB, id xe), `cargoTypeId`(BB), `loadLevelType`(BB: `FULL_LOAD|RODA_2_3|OTHER`), `loadLevelCustomValue` (regex `^\d+/\d+$`, chỉ giữ khi `OTHER`), `tripCount` (Integer, **không bắt buộc, không @Min**). `cargoGroupId` tự lấy theo loại hàng. Trạng thái trip mặc định `PENDING`.
```json
{"reportDate":"2026-09-01","shiftId":1,"excavatorDeviceId":101,"excavationFloor":"300","receivingLocationId":3,
 "fuelBeginning":1188,"fuelEnding":831,"fuelReceived":590,"employeeId":11,
 "trips":[{"vehicleId":201,"tripCount":6,"cargoTypeId":11,"loadLevelType":"FULL_LOAD","loadLevelCustomValue":null},
          {"vehicleId":203,"tripCount":4,"cargoTypeId":11,"loadLevelType":"OTHER","loadLevelCustomValue":"1/2"}]}
```
**`POST` KHÔNG upsert**: trùng khoá phiếu => 409 và (với `/bulk`) rollback cả lô. Phải gộp mọi trip cùng khoá vào 1 body; muốn chạy lại phải tra trước (`GET …?fromDate&toDate`) hoặc `PUT /{id}`.
Sửa trip đã `APPROVED` bị chặn 400 (QĐ-17) — phải yêu cầu sửa trước.

### 3.14 Vận tải — `/api/transport-reports` (resource `transport-reports`)
Endpoint tương tự Khai thác (`POST /`, `/bulk`, `GET`, `PUT`, `/trips/*`, `/export`, `/import`).
Phiếu (khoá UNIQUE `(reportDate, shiftId, vehicleId, employeeId)`): `reportDate, shiftId, vehicleId (id xe), employeeId` (đều BB), `fuelBeginning/Ending/Received` (tuỳ), `trips[]` (BB ≥1).
Trip:
| Trường | BB | Ghi chú |
|---|---|---|
| `excavationAreaId` | ✔ | id ExcavationArea (**phải có `areaGroup` trước**: `receiving_floor_group` tính tại thời điểm lưu) |
| `excavatorDeviceId` | ✔ | id máy xúc |
| `loadingPointId` | ✔ | **id ReceivingPoint (Nơi nhận tải)** |
| `unloadingPointId` | ✔ | id UnloadingPoint |
| `cargoTypeId` | ✔ | |
| `tripCount` | ✔ | `@Min(1)` |
| `loadLevelType` | ✔ | `FULL_LOAD|RODA_2_3|OTHER`; `loadLevelCustomValue` regex `^\d+/[1-9]\d*$` |
| `receivingFloor` | | Integer (tầng nhận, có thể âm) — tự tính `receivingFloorGroup` |
| `unloadingFloor` | | String |
| `totalRouteDistanceKm, totalRouteLiftM, localSlopeDistanceKm, localSlopeM` | | Double; **cung độ ≠ 0 => engine đòi đủ ĐMNL/Năng suất xe** |
| `rainyDay, supplementaryVehicle` | | boolean (mặc định false) |
| `weighedWeightTon, provisionalModel, provisionalDensity, ctnbDeviationCoefficient, deductionAmount, wasteRockTon` | | 6 trường "(Báo chuyến)": để trống ≠ 0. **Chỉ nhập được qua JSON, KHÔNG có trong Excel import.** `provisionalModel/provisionalDensity` khác 0 thì thay hẳn giá trị tra lưới/danh mục. |
```json
{"reportDate":"2026-09-01","shiftId":1,"vehicleId":201,"employeeId":11,
 "fuelBeginning":200,"fuelEnding":120,"fuelReceived":150,
 "trips":[{"rainyDay":false,"supplementaryVehicle":false,"excavationAreaId":1,"excavatorDeviceId":101,
   "loadingPointId":1,"receivingFloor":120,"unloadingFloor":"0",
   "totalRouteDistanceKm":3.5,"totalRouteLiftM":45,"localSlopeDistanceKm":null,"localSlopeM":null,
   "unloadingPointId":2,"cargoTypeId":11,"tripCount":6,
   "weighedWeightTon":null,"provisionalModel":null,"provisionalDensity":null,
   "ctnbDeviationCoefficient":null,"deductionAmount":null,"wasteRockTon":null,
   "loadLevelType":"FULL_LOAD","loadLevelCustomValue":null}]}
```
Cũng KHÔNG upsert (409 nếu trùng khoá phiếu). Response có `id` phiếu và `trips[].id`.

### 3.15 Đối chiếu + duyệt — `/api/reconciliation` (resource `reconciliation`)
| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `GET /?fromDate&toDate[&shiftIds&deviceIds&excavatorIds&status]&page&size` | r | **Nạp TOÀN BỘ chuyến Vận tải + Khai thác của khoảng ngày vào RAM rồi ghép + phân trang trong bộ nhớ** (mỗi lần gọi). Trả mỗi dòng: `transportReportTripId`, `excavationReportTripId` (null nếu một bên thiếu), `reportDate, shiftName, vehicleCode, excavatorName`, `transportData/excavationData{cargoTypeName,tripCount,loadLevelType,loadLevelCustomValue,employeeSalaryCode,…}`, `matched`, `pairingAmbiguous`, `transportStatus`, `excavationStatus`, `status`. |
| `POST /decisions` (một) / `POST /decisions/bulk` (mảng) | **a** | body `{"decisions":[{transportReportTripId, excavationReportTripId, status, note}]}`; `status ∈ PENDING|APPROVED|REVISION_REQUESTED`. |
| `PUT /trips/bulk` | u | sửa dữ liệu trip từng bên: `[{transportReportTripId XOR excavationReportTripId, cargoTypeId?, tripCount?, loadLevelType?, loadLevelCustomValue?, employeeId?}]`; trip `APPROVED` bị chặn; sửa xong về `PENDING`. |
| `POST /trips/resubmit` | u | `{transportReportTripId?, excavationReportTripId?}` đưa `REVISION_REQUESTED` -> `PENDING`. |
| `GET /history?transportReportTripId&excavationReportTripId` | r | snapshot khi yêu cầu sửa |

**Cách duyệt hàng loạt đúng (đọc từ `ReconciliationService.saveDecisions/buildDecision/assertValidPair`):**
1. Payload duyệt MỘT cặp = `{"transportReportTripId":T,"excavationReportTripId":E,"status":"APPROVED","note":null}` — **BẮT BUỘC cả hai id** (một id + APPROVED => 400 "Không thể duyệt (APPROVED) một phía — cần gửi ĐỦ CẢ HAI id…").
2. Với mỗi cặp, backend kiểm: (a) **cùng khoá ghép** `(reportDate, shiftId, vehicleId của trip, excavatorDeviceId)`; (b) nếu trong khoá đó mỗi bên chỉ có ≤1 trip thì chỉ cần (a)+(c); nếu có >1 trip một bên thì phải **khớp DUY NHẤT hai chiều** theo `isMatched`; (c) với `APPROVED`: `isMatched` = cùng `cargoTypeId` + cùng `tripCount` + cùng loại/giá trị mức tải + **cùng `employeeId` của phiếu hai bên**. Không đạt => 400 kèm "Mục thứ i: …"; **tập hợp lỗi, rồi không lưu GÌ cả (rollback toàn lô)**.
3. Giới hạn kích thước: **không có @Size** trên danh sách; giới hạn thực tế là (i) tham số `IN (...)` của Postgres ≤ ~32.767 id/loại; (ii) chi phí: **mỗi cặp gọi 2 lần `findForReconciliation(date,date)` = nạp lại toàn bộ chuyến CẢ NGÀY của hai bên** => chi phí ~ O(số cặp × số chuyến/ngày). Nên duyệt **theo từng ngày, mỗi request ≤ vài trăm cặp** (đo thử 50 cặp trước), và nginx `/tk-api/` cắt ở `proxy_read_timeout 300s`.
4. Cách lấy cặp: `GET /reconciliation?fromDate=D&toDate=D&size=2000&page=…`; chọn dòng có `transportReportTripId != null && excavationReportTripId != null && matched==true && pairingAmbiguous==false && transportStatus=='PENDING'`.
5. **Dòng chỉ có 1 bên**: không bao giờ APPROVED được qua API (chỉ `REVISION_REQUESTED` một phía được phép). Hệ quả: một chuyến VẬN TẢI không có chuyến KHAI THÁC cùng khoá+khớp nội dung => kỳ không tính được (QĐ-16, xem §4). Chuyến KHAI THÁC lẻ không chặn engine (engine chỉ duyệt trên danh sách chuyến Vận tải).
6. Mỗi lần duyệt thành công, `publishApproved(ngày)` -> `ProductionAutoRecalculateListener` (AFTER_COMMIT, đồng bộ trong request) sẽ thử `calculatePeriod` cho kỳ chứa các ngày đó **nếu kỳ tồn tại** (`findByDate`); "chưa đủ duyệt" được nuốt im lặng, lỗi khác đánh dấu kỳ `stale=true`. => Tạo Kỳ SAU khi duyệt xong để tránh N lần quét cả kỳ.
7. Mỗi lần ghi còn bắn WebSocket `/topic/reconciliation` (UI đang mở sẽ tự gọi lại `GET /reconciliation` nặng) — đóng các tab UI khi nạp lớn.
```json
{"decisions":[
  {"transportReportTripId":9001,"excavationReportTripId":8001,"status":"APPROVED","note":null},
  {"transportReportTripId":9002,"excavationReportTripId":8002,"status":"APPROVED","note":null}]}
```

### 3.16 Tính sản lượng — `/api/production` (resource `production`)
| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `POST /calculate?periodId=&tkeMode=false` | c | đồng bộ; xoá kết quả kỳ cũ rồi tính lại cả kỳ (hệ số trắc địa phụ thuộc cả kỳ). Trả `{tripCount, coefficientRowCount, tkeMode, warnings}`. |
| `GET /summary?periodId=` | r | tổng kỳ (`rowCount=0` = chưa tính) |
| `GET /results?periodId=&keyword=&page&size` , `GET /results/all?periodId=` | r | từng chuyến; `results/all` JSON không phân trang — **xuất Excel do FRONTEND (xlsx) tự dựng từ JSON này** |
| `GET /survey-coefficients?periodId=` , `GET /ap-tracdia?year&month` | r | AP Tdia/Ap Tkm do engine sinh |
- **Chế độ TKE (QĐ-03)** = tham số `tkeMode=true` của `calculate` (không lưu riêng); bỏ hẳn hệ số trắc địa (mọi hệ số =1). Kỳ chưa tính thì auto-recalc dùng mặc định `false`.
- Khoá/mở khoá: §3.12.

---

## 4. Điều kiện để `calculatePeriod` chạy được (thứ tự kiểm tra trong code)

1. Kỳ tồn tại, **chưa chốt** (`locked=false`).
2. **Tháng không hở**: `assertNoGapInMonth` (mọi ngày trong tháng thuộc một kỳ; kể cả ngày ngoài kỳ đang chọn).
3. Có ≥1 chuyến VẬN TẢI trong `[fromDate,toDate]`.
4. **QĐ-16 (PeriodNotFullyApprovedException)**: **MỌI chuyến vận tải** trong kỳ phải: `status=APPROVED` **và** có `reconciliation_decisions` gắn một chuyến KHAI THÁC **và chuyến khai thác đó cũng `APPROVED`**. Một trong ba cái sai => lỗi tổng hợp liệt kê tối đa 15 chuyến.
5. Tính cả kỳ trong 1 transaction; mọi "thiếu khai báo" được GOM vào `warnings` rồi **ném MỘT lỗi tổng hợp và KHÔNG lưu gì** (kết quả cũ giữ nguyên). Ngoại lệ: một số lỗi `BadRequestException` ném thẳng ở chuyến đầu gặp (ghi "NÉM NGAY").

### 4.1 Thông báo lỗi nghiệp vụ -> danh mục thiếu
| Thông báo (rút gọn) | Loại | Cần |
|---|---|---|
| `Kỳ … đã chốt — mở khoá trước khi tính lại` | 400 | mở khoá kỳ |
| `Tháng M/YYYY đang HỞ từ … đến … — chưa có Kỳ báo cáo nào phủ…` | 400 | thêm kỳ cho khoảng hở |
| `Kỳ … chưa có chuyến vận tải nào để tính.` | 400 | nạp chuyến Vận tải |
| `Kỳ … chưa thể tính vì còn N chuyến VẬN TẢI CHƯA ĐƯỢC DUYỆT ĐỐI CHIẾU … Chuyến #id ngày d, xe X — trạng thái đối chiếu: PENDING` / `ĐÃ DUYỆT Vận tải nhưng CHƯA có chuyến Khai thác ghép cặp…` / `chuyến Khai thác ghép cặp #E CHƯA được duyệt` | 400 (PeriodNotFullyApprovedException) | duyệt đủ cặp |
| `Chuyến id=X: chủng loại hàng "<tên>" chưa khai Sản phẩm nghiệm thu` | NÉM NGAY | `cargo_types.acceptance_product_id` |
| `Chuyến id=X: xe "<code>" chưa khai Chủng loại xe (màn Thuộc tính sản lượng — Xe)` | NÉM NGAY | `devices.vehicle_type_id` |
| `Chuyến id=X: phiếu vận tải chưa gắn Số xe nên không tra được lưới Mô hình` | NÉM NGAY | — |
| `Lưới Mô hình (m3/chuyến) chưa khai báo ô [<cargoCode> × <vehicleType>.<CS|KC>]` | NÉM NGAY (BadRequest) | ô `MO_HINH` (hàng+cột phải tồn tại trên trục) |
| `Lưới MO_HINH chưa có phiên bản nào có hiệu lực ngày …` | NÉM NGAY (**404**) | phiên bản lưới phủ ngày |
| `Chưa khai báo Tỷ trọng có hiệu lực ngày … cho chủng loại hàng id=… [, khu vực id=…]` | NÉM NGAY | `density_parameters` (hoặc `provisionalDensity` trên chuyến) |
| `Danh mục Hệ số chưa có mã "HS.THAN.TRUDA" (hệ số Than tke trừ đá) — cần cho sản phẩm nghiệm thu than_sx` | NÉM NGAY | `coefficient_items` |
| `Chuyến id=X: mức tải "Khác" nhưng thiếu giá trị dạng x/y` / `…mẫu số bằng 0` / `…không đọc được thành phân số` | NÉM NGAY | sửa mức tải |
| `Chuyến id=X: có Khối lượng qua cân nhưng Tỷ trọng bằng 0 nên không chia được` | NÉM NGAY | |
| `Chưa khai báo STD cho khoá "<key>" / <SPNT>.` ; `Chưa khai báo STD (Thể trọng) cho khoá "<key>" / <SPNT>.` | gom (chỉ khi tkeMode=false) | `survey_standards` đúng khoá |
| `Chưa dùng được lưới <DMNL|NANG_SUAT_XE|HS_DIEU_CHINH_NLDM> — nhánh nhiên liệu bỏ trống.` | gom | phiên bản lưới phủ ngày đầu kỳ |
| `Chuyến id=X: chưa khai Chủng loại xe + DMNL nên bỏ qua nhánh nhiên liệu.` | gom | `devices.fuel_class_id` |
| `Chuyến id=X: lưới Định mức nhiên liệu chưa có dữ liệu cho cột "<key>" nên bỏ qua nhánh nhiên liệu.` | gom | cột/ô DMNL |
| `Chuyến id=X: lưới HS điều chỉnh NLĐM chưa có ô [<row> × <col>] …` | gom | ô HS_DIEU_CHINH |
| `Chuyến id=X: lưới Năng suất xe chưa có dòng cung độ <d>.` / `…chưa có ô [<row> × <col>].` | gom | NANG_SUAT_XE |
| `Danh mục Hệ số chưa có mã "HS.BUN" (hệ số bùn).` | gom | `coefficient_items` |
| Lỗi tổng hợp bọc ngoài: `Chưa tính được kỳ này vì còn N chỗ thiếu khai báo:\n- …` | 400 | |

> Hệ quả thực tế: nhiều lỗi "NÉM NGAY" chỉ báo **chuyến đầu tiên gặp lỗi** (cả kỳ dừng ở đó), nên nếu chạy `calculate` mò thì sẽ sửa-chạy lại rất nhiều vòng. Nên tự **tiền kiểm** bằng truy vấn trước: mọi xe có `vehicle_type_id/fuel_class_id/vehicle_rank_id`; mọi cargo type có `acceptance_product_id`; mọi (cargo type × ngày) có tỷ trọng; mọi (cargo code × `vehicleType.code.CS|KC`) có ô MO_HINH.

### 4.2 Danh mục BẮT BUỘC trước khi NHẬP CHUYẾN (API chấp nhận phiếu)
- **Ca** (shifts), **Thiết bị** (xe + máy xúc), **Người dùng** (employee/salaryCode) => (Phòng ban -> Chức vụ).
- Vận tải: **Khu vực xúc** (+`areaGroup` nên có trước), **Nơi nhận tải** (ReceivingPoint), **Nơi dỡ tải**, **Chủng loại hàng** (-> Nhóm hàng).
- Khai thác: **Nơi chất tải** (PickupPoint), **Chủng loại hàng**.
- (Excel import: tra theo TÊN — xem §6.)

### 4.3 Danh mục BẮT BUỘC trước khi TÍNH sản lượng (mọi kỳ, kể cả tkeMode=true)
1. Mỗi **xe tải** có: `vehicleType` + `fuelClass` (+ `vehicleRank` để khoá HS_DIEU_CHINH; thiếu hạng -> chữ đầu rỗng -> thiếu ô).
2. Mỗi **chủng loại hàng** có `acceptanceProduct` (tên đúng Dat_SX/Dat_CN/Than_SX/Than_CN/Dat_TCN); nhóm hàng.
3. **Tỷ trọng** phủ ngày cho mọi (loại hàng[,khu vực]) — trừ chuyến có `provisionalDensity`.
4. **MO_HINH**: ô (cargoType.code × vehicleType.code.CS|KC) — trừ chuyến có `provisionalModel` hoặc `tripCount=0`.
5. **Ba lưới nhiên liệu** có phiên bản hiệu lực ngày đầu kỳ; ô DMNL/NANG_SUAT_XE/HS_DIEU_CHINH cho từng chuyến có cung độ ≠ 0.
6. **Hệ số** `HS.THAN.TRUDA` (nếu có chuyến Than_SX), `HS.BUN` (nếu có hàng bùn).
7. Excavation area có `areaGroup` đúng; receiving point có `seamGroup` (cho khoá STD).
8. **Kỳ báo cáo** phủ kín tháng + **đối chiếu đã duyệt 100% chuyến vận tải**.
9. Chỉ khi `tkeMode=false`: **STD** đúng khoá cho mọi nhóm (khoá, SPNT).

### 4.4 Quy trình lấy khoá STD đúng
`tkeMode=true` không cần STD và **vẫn lưu `survey_coefficients`** với khoá engine dựng => `GET /production/survey-coefficients?periodId=` (hoặc `ap-tracdia`) cho danh sách `seamGroupExcavatorKey` + SPNT. Khai STD cho từng khoá rồi tính lại `tkeMode=false`. (Cách "tính một lượt rồi mới có khoá" ở `seed-mau-sanluong-4-std.sql` chỉ còn đúng cho TKE; ở chế độ thường lượt đầu sẽ ném lỗi và không lưu gì.)

---

## 5. Danh mục & phụ thuộc — bảng tổng hợp

| Thực thể | Endpoint tạo | Resource | Phụ thuộc | Nhập Excel (server) |
|---|---|---|---|---|
| Ca | **SQL** | shifts | — | — |
| Phòng ban | `POST /departments` | departments | — | không |
| Chức vụ | `POST /positions` | positions | phòng ban | không |
| Người dùng | `POST /users` | users | chức vụ | không |
| Thiết bị | **SQL** (hoặc sync TaiSan) | devices | device_types, departments | không |
| Thuộc tính SL thiết bị | `POST /device-production-attributes/bulk` | device-production-attributes | thiết bị, 4 danh mục xe | không |
| Chủng loại xe / xe NL / xe+phân loại / nhóm hạng / hạng | `POST /vehicle-*` (+`/bulk`) | vehicle-* | hạng -> nhóm hạng | không (UI tự parse Excel -> `/bulk`) |
| Nhóm hàng / SPNT / TTL CLH | `POST /cargo-groups` … | cargo-groups / acceptance-products / ttl-clh-items | — | không |
| Chủng loại hàng | `POST /cargo-types` | cargo-types | nhóm hàng (+SPNT, TTL) | không |
| Khu vực xúc | `POST /excavation-areas` | excavation-areas | — | không |
| Nơi chất tải / Nơi dỡ tải / Nhóm vỉa | `POST /pickup-points` … | pickup-points / unloading-points / seam-groups | — | không |
| Nơi nhận tải | `POST /receiving-points` | receiving-points | nhóm vỉa (tuỳ chọn, cần cho STD) | không |
| Hệ số | `POST /coefficients` | coefficients | — | không |
| Tỷ trọng | `POST /density-parameters(/bulk)` | density-parameters | loại hàng, khu vực | không |
| Lưới (4) | `POST …/versions|rows|cols`, `PUT …/cells` | matrix-catalogs | định nghĩa lưới (SQL), loại hàng/xe để đặt khoá | không (UI parse Excel) |
| STD | `POST /survey-standards(/bulk)` | survey-standards | khoá engine | không |
| AP Tdia | không (đầu ra) | production (r) | — | UI xuất xlsx |
| Kỳ báo cáo | `POST /report-periods` | report-periods | — | không |
| Khai thác | `POST /excavation-reports(/bulk)` | excavation-reports | ca, máy xúc, nơi chất tải, user, xe, loại hàng | **`POST /excavation-reports/import`** |
| Vận tải | `POST /transport-reports(/bulk)` | transport-reports | ca, xe, user, khu vực xúc, máy xúc, nơi nhận tải, nơi dỡ tải, loại hàng | **`POST /transport-reports/import`** |
| Đối chiếu | `POST /reconciliation/decisions/bulk` | reconciliation (**a**) | phiếu hai bên | — |
| Tính SL | `POST /production/calculate` | production | tất cả trên | — |

---

## 6. Nhập Excel hàng loạt phía server

Chỉ 2 endpoint: `POST /api/excavation-reports/import` và `POST /api/transport-reports/import`.
`Content-Type: multipart/form-data`, field **`file`**, đọc **sheet đầu tiên**, bỏ qua dòng đầu (tiêu đề), dòng trống = 5 (Khai thác) / 3 (Vận tải) ô đầu đều rỗng. Cột "Thời gian": ô ngày thật HOẶC chuỗi `dd/MM/yyyy`. Trả `{totalRows, successReportCount, errorRowCount, errors:["Dòng 5: Không tìm thấy Số xe 'XE-999'"]}`.
Hành vi: gom **các dòng LIÊN TIẾP** có cùng khoá phiếu thành một phiếu (nên xếp kề nhau; dòng không liên tiếp thường vẫn gộp được vì phiếu vừa lưu được tra lại theo khoá, nhưng không có gì bảo đảm); **UPSERT phiếu theo khoá** (khác API JSON), trip giống hệt (so sánh bộ trường rút gọn) bị bỏ qua; mọi tra cứu bằng **tên/mã** (không dùng id):
- Ca: `shifts.name` (số) · Máy xúc / Số xe: `devices.code` · Số thẻ lương: `users.salary_code`
- Khai thác: Nơi nhận tải -> `pickup_points.name`; Loại hàng -> `cargo_types.name`
- Vận tải: Khu vực xúc -> `excavation_areas.name`; Nơi nhận tải -> `receiving_points.name`; Nơi dỡ tải -> `unloading_points.name`; Loại hàng -> `cargo_types.name`
Tên không unique ở DB => tên trùng làm `findByName` nổ 500/lỗi dòng.

**Layout cột mà importer ĐỌC (chỉ số 0-based)** — *xem bẫy lệch exporter ở §9.1*:
| Khai thác | | Vận tải | |
|---|---|---|---|
| 0 Thời gian | | 0 Thời gian | |
| 1 Ca | | 1 Ca | |
| 2 Máy xúc (code) | | 2 Số thẻ lương | |
| 3 Tầng xúc | | 3 Họ tên (bỏ qua) | |
| 4 Nơi nhận tải (tên PickupPoint) | | 4 (bỏ qua — "Đơn vị") | |
| 5 Số thẻ lương | | 5/6/7 NL tồn đầu / tồn cuối / lĩnh | |
| 6,7 Họ tên, Đơn vị (bỏ qua) | | 8 (bỏ qua — NL sử dụng) | |
| 8/9/10 NL tồn đầu / cuối / lĩnh | | 9 Số xe (code) | |
| 11 NL sử dụng (bỏ qua, tự tính) | | 10 Ngày mưa (`x`) · 11 Xe bổ túc (`x`) | |
| 12 Số xe (code) | | 12 Khu vực xúc (tên) · 13 Máy xúc (code) · 14 Nơi nhận tải (tên) | |
| 13 Số chuyến | | 15 Tầng nhận tải · 16 (bỏ qua — nhóm tầng, tự tính) · 17 Tầng dỡ tải | |
| 14 Loại hàng (tên) | | 18/19/20/21 cung độ km / nâng tải m / dốc cục bộ km / dốc cục bộ m | |
| 15 Nhóm hàng (bỏ qua) | | 22 Nơi dỡ tải (tên) · 23 Loại hàng (tên) · 24 (bỏ qua — nhóm hàng) | |
| 16 Mức tải: `Đủ tải` / `Roda (2/3)` / `Khác (x/y)` | | 25 Số chuyến · 26 Mức tải: `Đủ tải` / `Roda (2/3)` / `x/y` | |
| 17,18 (bỏ qua) | | | |
Khoá gom nhóm: Khai thác `(ngày|ca|máy xúc|số thẻ lương)`; Vận tải `(ngày|ca|số xe|số thẻ lương)`.
Vận tải import **không** mang 6 trường "(Báo chuyến)" (cân, mô hình/tỷ trọng tạm tính, CTNB, trừ vơi, đá thải) — phải nhập bằng JSON/UI.
Import KHÔNG gọi `publishChanged`, KHÔNG kiểm tra phạm vi đơn vị.
Lưu ý lỗi: (a) ô ngày sai => ném ngoài vòng try từng nhóm => **cả file thất bại** ("Không đọc được file Excel: …"), không có thông báo theo dòng; (b) lỗi tra cứu ở dòng thứ 2 trở đi của một phiếu ĐÃ TỒN TẠI có thể để lại sửa nhiên liệu của phiếu đó (thực thể managed bị flush khi commit) dù nhóm báo lỗi.

---

## 7. Phương án nạp trực tiếp bằng SQL

### 7.1 Danh sách bảng (49) và số cột (information_schema, preview)
| Nhóm | Bảng (số cột) |
|---|---|
| Hệ thống | departments (8) · department_resources (2) · positions (8) · position_permissions (8) · users (18) · user_permissions (8) · user_device_tokens (2) · shifts (9) |
| Thiết bị | devices (28) · device_types (9) · device_models (7) · device_files (3) · vehicle_types (6) · vehicle_fuel_classes (6) · vehicle_category_classes (6) · vehicle_rank_groups (6) · vehicle_ranks (7) |
| Hàng hoá | cargo_groups (6) · cargo_types (11) · acceptance_products (6) · ttl_clh_items (6) · classifications (6) · materials (8) · material_value_history (5) · locations (10) |
| Vị trí | excavation_areas (7) · pickup_points (6) · receiving_points (8) · unloading_points (6) · seam_groups (6) |
| Tham số/lưới | density_parameters (10) · survey_standards (30) · survey_coefficients (16) · coefficient_items (7) · model_periods (7) · model_period_values (4) · matrix_definitions (17) · matrix_axis_entries (7) · matrix_cells (5) · report_periods (12) · report_period_audits (11) |
| Giao dịch | excavation_reports (13) · excavation_report_trips (12) · transport_reports (11) · transport_report_trips (30) · reconciliation_decisions (7) · reconciliation_data_history (12) · production_results (35) |
| Khác | flyway_schema_history (10) |

Cột bắt buộc (NOT NULL, không default) — để viết INSERT:
`users: id, active, full_name, password(BCrypt), role('EMPLOYEE'), salary_code, username` · `devices: id, code, status` · `shifts: id, name(int)` · `transport_reports: id, report_date, employee_id, shift_id, vehicle_id` · `transport_report_trips: id, load_level_type, rainy_day, supplementary_vehicle, status, cargo_group_id, cargo_type_id, excavation_area_id, excavator_device_id, loading_point_id, transport_report_id, unloading_point_id` · `excavation_reports: id, report_date, employee_id, excavator_device_id, receiving_location_id, shift_id` · `excavation_report_trips: id, load_level_type, status, cargo_group_id, cargo_type_id, excavation_report_id, vehicle_device_id` · `reconciliation_decisions: id, status` (+ 2 FK nullable) · `report_periods: id, from_date, to_date, period_year, period_month, period_index, locked, stale` · `cargo_types: id, name, cargo_group_id` · `density_parameters: id, density_dry, density_wet, effective_from, effective_to, cargo_type_id` · `matrix_definitions: id, code, name, numeric_col_axis, numeric_row_axis, value_scale`.
Ràng buộc UNIQUE then chốt: `uk_transport_report_key (report_date,shift_id,vehicle_id,employee_id)`, `uk_excavation_report_key (report_date,shift_id,excavator_device_id,employee_id)`, `uk_reconciliation_*_trip` (mỗi trip tối đa 1 decision), `uk_report_period_year_month_index`, `uk_matrix_cell (definition_id,row_key,col_key)`, `uk_matrix_definition_code_from (code,effective_from)`, `survey_standards`/`density_parameters` KHÔNG có UNIQUE/EXCLUDE ở DB (chỉ service kiểm chồng lấn).
Lưu ý: UNIQUE dedup của trip chứa cột NULL (vd `load_level_custom_value` với FULL_LOAD) nên **Postgres coi các dòng NULL là khác nhau => ràng buộc gần như không bao giờ bắn** với mức tải ≠ OTHER; API/DB cho phép trip trùng nội dung.
Sequence: mọi `*_seq` `INCREMENT 50` (matrix_cell/model_period_value/production_result: 100). Khi chèn id thủ công phải `setval` hoặc dùng `nextval()`.
Các cột phi chuẩn hoá cần tự tính: `cargo_group_id` (= nhóm của loại hàng), `fuel_used`, `receiving_floor_group` (công thức Nhóm tầng: KC & tầng < −195 -> −200; còn lại `(tầng<0 ? -1+TRUNC((tầng+1)/15) : TRUNC(tầng/15))*15`), `created_at/updated_at` (auditing không chạy khi SQL).

### 7.2 Script seed sẵn trong `backend/*.sql` (đọc, KHÔNG chạy)
| File | Nội dung | Dùng được cho nạp thật? |
|---|---|---|
| `init-db.sql` | tạo sequence ban đầu | không cần (Flyway/Hibernate đã tạo) |
| `seed-data.sql` | 4 phòng ban, 4 chức vụ, Ca 1-3, 3 locations, user `admin` (BCrypt, `salary_code ADMIN001`) | mẫu cho Ca |
| `seed-data-khai-thac.sql` | dữ liệu MẪU: Ca 4, 3 PXVT, device_types, 4 máy xúc + 9 xe (có `department_id`), 2 nhóm hàng, 3 loại hàng, 4 công nhân, 6 phiếu Khai thác/11 trip; **cột `receiving_points.seam_group` kiểu cũ** | chỉ mẫu cú pháp INSERT devices/device_types |
| `seed-danh-muc.sql`, `seed-danh-muc-sanluong.sql` | khu vực xúc/nơi nhận/nơi dỡ/nơi chất mẫu; SPNT (8) + TTL CLH (7) | mẫu |
| `seed-danh-muc-he-thong.sql` | phòng ban ADMIN + chức vụ Quản trị + 34 resource full quyền | tuỳ chọn |
| `seed-he-so.sql` | 6 hệ số (HS.BUN, HS.DATHAI.*) **giá trị = 0 (CHƯA có số thật)**; thiếu HS.THAN.TRUDA | cần chỉnh |
| **`seed-matrix-catalogs.sql`** | **4 định nghĩa lưới — cần chạy (không có API tạo)** | **CÓ** |
| `seed-mau-sanluong-0..4-*.sql` | tài khoản `xemthu` (mật khẩu lộ trong file), danh mục xe, 4 lưới "MAU-2026", 21 chuyến mẫu `APPROVED` thẳng bằng SQL, STD mẫu | chỉ tham khảo kỹ thuật; **bản 3 chèn trip `APPROVED` không có decision Khai thác — nay engine sẽ từ chối** |
| `reset-du-lieu-giao-dich.sql` | xoá dữ liệu giao dịch, giữ danh mục | hữu ích để làm lại |
| `migration-archive/*` | migration lịch sử (tách danh mục địa điểm, phiên bản lưới, khoá kỳ…) | không dùng cho DB mới |

### 7.3 Ưu / nhược
| | Ưu | Nhược |
|---|---|---|
| SQL trực tiếp | nhanh nhất (hàng chục nghìn dòng/giây); không gặp 409/pairing/giới hạn nginx; một transaction; có thể vượt các chốt nghiệp vụ không duyệt được (xem §9) | **bỏ qua mọi kiểm tra** (unique mã, trần quyền, chồng lấn tỷ trọng/STD, `receiving_floor_group`, `cargo_group_id`, `fuel_used`, pair/approval); phải tự quản `setval`, `created_at`; tạo trạng thái duyệt = tự ý bypass QĐ-16 (cần chủ dự án đồng ý); khó audit |
| API | có kiểm tra nghiệp vụ, tự tính trường dẫn xuất, an toàn schema | tốc độ chưa đo; duyệt O(cặp × chuyến/ngày); 409/400 không chỉ rõ chỗ lỗi trong lô; Excel importer lệch cột (§9.1) |
| **Khuyến nghị lai** | Danh mục qua API (nhỏ, có kiểm tra) · Ca / thiết bị / định nghĩa lưới / ô lưới lớn bằng SQL hoặc API chia lô · Phiếu bằng `POST /bulk` theo ngày (hoặc staging table + INSERT…SELECT nếu >100k trip) · Duyệt: API nếu đo đủ nhanh, ngược lại SQL cho cặp đã tự kiểm `isMatched` | Luôn `pg_dump` trước; chạy `reset-du-lieu-giao-dich.sql` để lặp |

Phác SQL duyệt (KHÔNG chạy): `INSERT INTO reconciliation_decisions(id,transport_report_trip_id,excavation_report_trip_id,status,created_at,updated_at) SELECT nextval('reconciliation_decision_seq'),t,e,'APPROVED',now(),now() FROM <bảng cặp>;` rồi `UPDATE transport_report_trips SET status='APPROVED' WHERE id IN (…); UPDATE excavation_report_trips SET status='APPROVED' WHERE id IN (…);` — đúng 3 điều kiện mà `describeProductionApprovalIssue` kiểm (docs lượt 29c cho thấy đã làm cách này trên server thật).

---

## 8. Hiệu năng & giới hạn

| Hạng mục | Kết quả đọc được |
|---|---|
| Upload multipart | **Không có cấu hình override** trong `application*.yaml` hay env container => mặc định Spring: **file ≤ 1 MB, request ≤ 10 MB**. Quá cỡ => `MaxUploadSizeExceededException` rơi vào handler `Exception` chung => **HTTP 500 "Internal server error"** (không nói lý do). nginx `client_max_body_size 50m` (cấp http) nên nginx không phải nút thắt. Ước tính 1 MB .xlsx ≈ vài nghìn dòng (chưa đo). Cách vượt: chia file; hoặc đặt `SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE/MAX_REQUEST_SIZE` cho container (cần recreate, ngoài phạm vi chỉ-đọc). |
| nginx `/tk-api/` (`WebApp/reverse_proxy/nginx_thongke.conf`, cũng `nginx_release_thongke.conf`) | `proxy_read_timeout 300s`; `proxy_connect_timeout`/`proxy_send_timeout` mặc định 60s; WebSocket upgrade bật. |
| Tốc độ importer Excel | **Chưa đo.** Một transaction cho cả file; mỗi nhóm ~5 truy vấn tra cứu + mỗi trip 2-7 truy vấn (`findByName/findByCode` không cache) + insert batch 50 (Hibernate `jdbc.batch_size=50`, `order_inserts`). Ước lượng thô vài trăm trip/giây trên máy local — cần chạy thử file 500 dòng để đo. |
| JSON `POST /bulk` phiếu | Một transaction, `create()` từng phiếu (tra FK bằng `findById`, được cache trong phiên); mỗi phiếu bắn 1 event WebSocket. Chưa đo; khuyến nghị lô ≤ 200-500 phiếu và đo. |
| `GET /reconciliation` | nạp toàn bộ chuyến khoảng ngày vào RAM (9 JOIN FETCH) rồi phân trang trong bộ nhớ; nên gọi **từng ngày**; trang tối đa 2000 dòng. |
| `POST /reconciliation/decisions/bulk` | xem §3.15 mục 3 (nặng, O(cặp × chuyến/ngày)). |
| `POST /production/calculate` | Đồng bộ, cả kỳ trong 1 transaction; mỗi chuyến vài truy vấn riêng (tỷ trọng, ô Mô hình, hệ số, STD) — kỳ chục nghìn chuyến có thể vượt 300s ở nginx (backend vẫn chạy tiếp, client nhận 504). Giảm rủi ro bằng cách chia nhiều Kỳ (tuần) hoặc gọi trực tiếp backend `:8088` trong network docker. JVM `-XX:MaxRAMPercentage=75` (container chưa đặt giới hạn mem, host 7,6 GiB; backend đang dùng ~460 MiB). |
| Pageable | max 2000/trang cho mọi `GET`. |
| Token | ~8h. |

---

## 9. Bẫy đã biết / phát hiện khi đọc code

### 9.1 Importer Excel LỆCH cột so với exporter hiện tại (phát hiện mới, chưa chạy thử)
- Khai thác: exporter ghi `0 Thời gian,1 Ca,2 Máy xúc,3 Đơn vị quản lý TB,4 Tầng xúc,5 Nơi nhận tải,6 Số thẻ lương,7 Họ tên,8-11 NL,12 Số xe,13 Đơn vị công tác,14 Chủng loại xe,15 Số chuyến,16 Loại hàng,17 Nhóm hàng,18 Mức tải`; importer đọc `3=Tầng xúc,4=Nơi nhận tải,5=Số thẻ lương,13=Số chuyến,14=Loại hàng,16=Mức tải`.
- Vận tải: exporter `…3 Họ tên,4-7 NL,8 Số xe,9 Đơn vị công tác,10 Chủng loại xe,11 Ngày mưa,12 Xe bổ túc,13 Khu vực xúc,14 Máy xúc,15 Nơi nhận tải,16 Tầng nhận,17 Nhóm tầng,18 Tầng dỡ,19-22 cung độ…,23 Nơi dỡ,24 Loại hàng,25 Nhóm hàng,26 Số chuyến,27 Mức tải`; importer đọc `5-7 NL, 9 Số xe, 10 Ngày mưa, … 22 Nơi dỡ, 23 Loại hàng, 25 Số chuyến, 26 Mức tải`.
=> **File xuất ra từ hệ thống KHÔNG nhập lại đúng được**; không có unit test cho 2 importer. Nếu dùng Excel: dựng file đúng layout importer (§6) và chạy thử 5 dòng; hoặc dùng JSON `/bulk` (khuyến nghị).

### 9.2 Không có upsert ở API JSON
`POST /transport-reports|excavation-reports` (và `/bulk`) trùng khoá phiếu => 409 chung chung và rollback cả lô. Phải gom đúng một phiếu cho mỗi `(ngày, ca, xe|máy xúc, user)`; chạy lại cần tra trước hoặc `PUT /{id}` (PUT thay hết trips).

### 9.3 Duyệt & tính sản lượng — các bẫy lớn
1. **Mỗi chuyến VẬN TẢI phải có chuyến KHAI THÁC cùng (ngày, ca, xe, máy xúc) và KHỚP (loại hàng, số chuyến, mức tải, `employeeId` của phiếu hai bên)** mới duyệt được; không thì cả kỳ không tính được. Nếu nguồn chỉ có dữ liệu vận tải => phải tự sinh phiếu Khai thác tương ứng.
2. **`employeeId` hai phiếu phải GIỐNG NHAU** để `matched=true` (tài xế vs người vận hành máy xúc có thể khác — chưa rõ nghiệp vụ; xem §10).
3. **Trùng nội dung trong một khoá**: nếu 2 chuyến Vận tải cùng (ngày,ca,xe,máy xúc,user) có cùng loại hàng/số chuyến/mức tải (chỉ khác điểm dỡ/cung độ…) thì **không bao giờ khớp duy nhất** -> 400 "không xác định rõ ràng" -> không duyệt được qua API (gộp trip hoặc duyệt bằng SQL).
4. Duyệt một lô => listener tự thử tính kỳ nếu **kỳ đã tồn tại**; do `ReportPeriod` tạo sau cùng nên tránh được. Ngoài ra, listener `@TransactionalEventListener(AFTER_COMMIT)` gọi `calculatePeriod` (`@Transactional` mặc định REQUIRED) — docs lượt 21 ghi "CHƯA test end-to-end đường tự động" => **đừng tin vào tự tính; luôn gọi `POST /production/calculate` và kiểm bằng `GET /summary` (`rowCount>0`)**.
5. `GET /report-periods/by-month` tự tạo kỳ cả tháng nếu chưa có (UI gọi khi mở combobox) — tránh mở màn Báo cáo trước khi nạp xong.
6. Sửa/xoá dữ liệu sau khi duyệt: trip `APPROVED` không sửa được qua API (QĐ-17). Xoá TRIP lẻ (`DELETE /trips/{id}`, `/trips/bulk`) xoá luôn decision; xoá CẢ PHIẾU (`DELETE /{id}`, `/bulk`) KHÔNG xoá decision trước nên có thể dính 409 (FK `reconciliation_decisions` -> trip) nếu phiếu đã có quyết định đối chiếu — chưa thử. Muốn làm lại: dùng `reset-du-lieu-giao-dich.sql` hoặc xoá trip trước.
7. `receiving_floor_group` lưu lúc tạo trip theo `areaGroup` của khu vực lúc đó; đổi `areaGroup` sau không cập nhật trip cũ (khoá STD sẽ sai). Khai `areaGroup` TRƯỚC.

### 9.4 Dữ liệu & khoá
- Khoá STD engine dựng dùng **code** nhóm vỉa/máy xúc/khu vực và `receiving_floor_group`; Excel gốc dùng dạng khác (`10._-120_u7._CS`) -> không copy từ Excel được (FACTORY_CONTEXT lượt 30; TG-01 "Nhóm tầng" còn tạm gác).
- Số xe trong Excel thật có thể là `devices.vehicle_number` chứ không phải `devices.code` (FACTORY_CONTEXT lượt 28 mục 6) — quyết định trước cột nào là `code`.
- Mã thiết bị phải duy nhất giữa xe và máy xúc.
- Tên danh mục không unique nhưng Excel import tra theo tên.
- Số sheet Excel nguồn dịch chuyển giữa các lần lưu (`docs/_source`) — luôn dò `xl/workbook.xml`.
- Hệ số mùa/hạng/cải tạo toa… cứng trong code; `HS.DATHAI.*` chưa dùng; `classifications`, `model_periods` không được engine đọc.
- Giá trị tạm/giả ở server thật (STD DEMO, HS điều chỉnh =1, 160 xe thuê ngoài gán tạm) — không áp cho preview.

### 9.5 Nhỏ nhưng dễ vấp
- Token Điều phối là `fullDataScope=true` nên không bị lọc đơn vị; dùng token tài khoản scoped sẽ nhận 403 "Tài khoản chưa gán đơn vị".
- `PUT /device-production-attributes` xoá trắng field không gửi.
- `DELETE /…/bulk` cần body JSON (một số client bỏ body với DELETE).
- Trước khi nạp cần đóng các tab UI Điều phối/Thống kê (WebSocket kéo `GET /reconciliation` liên tục).
- Hibernate `ddl-auto=update` + Flyway baseline: schema đã đúng; không cần migration.

---

## 10. Điều CHƯA chắc chắn (cần xác minh bằng thử nhỏ trên DB nháp)

1. Tốc độ thật của: Excel import, `POST /bulk` phiếu, `decisions/bulk`, `calculate` (chỉ ước lượng từ đọc code).
2. Nghĩa nghiệp vụ của `employee` hai bên: nếu tài xế (Vận tải) ≠ người vận hành máy xúc (Khai thác) trong dữ liệu thật thì `matched` luôn false và không duyệt được qua API.
3. Importer/exporter lệch cột (§9.1) — suy ra từ code, chưa chạy.
4. Giới hạn multipart 1 MB: suy ra từ mặc định Spring + không thấy override; chưa thử upload (không được phép POST). Cũng chưa biết Boot 4.0.7 trả mã nào khi quá cỡ (xử lý hiện tại: 500).
5. `ProductionAutoRecalculateListener` ghi/commit được hay không (REQUIRED trong AFTER_COMMIT) — docs thừa nhận chưa test E2E.
6. Có bao nhiêu chuyến/ngày thực tế tháng 9 (quyết định chia lô duyệt, chia kỳ).
7. Nguồn của `devices` tháng 9 (SQL hay cấu hình TAISAN) và cột nào là `code`.
8. Khoá STD: cần danh sách khoá thật từ lần chạy TKE; số trắc địa thật phải do chủ dự án cung cấp.
9. Phiên bản lưới nào phủ ngày; dữ liệu ĐMNL/Năng suất xe/HS điều chỉnh thật (preview trống, server thật có bản nạp từ Excel `Tháng 5 đổi tên xe.xlsx`).

---

## 11. Quy trình chạy đề xuất (tóm tắt thao tác)

1. Backup/`pg_dump` DB nháp. Đóng UI.
2. SQL: shifts, device_types, devices, `seed-matrix-catalogs.sql`.
3. API danh mục theo §1 (bước 1-8), `device-production-attributes/bulk`.
4. Phiếu: `POST /transport-reports/bulk` + `POST /excavation-reports/bulk`, theo ngày, mỗi phiếu gộp đủ trips; tra lại bằng `GET` để đối soát số phiếu/trip.
5. Đối chiếu: với mỗi ngày D: `GET /reconciliation?fromDate=D&toDate=D&size=2000` -> lọc cặp hợp lệ -> `POST decisions/bulk` (chia lô). Kiểm: không còn dòng `PENDING` có hai bên; xử lý dòng một bên/mơ hồ/lệch (`PUT /reconciliation/trips/bulk`, sửa dữ liệu, hoặc SQL có phê duyệt).
6. `POST /report-periods` (phủ kín tháng 9) -> `POST /production/calculate?periodId=…&tkeMode=true` -> lấy khoá `survey-coefficients` -> khai STD -> `calculate?tkeMode=false` -> `GET /production/summary` + `/results/all` -> (tuỳ chọn) `POST /report-periods/{id}/lock`.
