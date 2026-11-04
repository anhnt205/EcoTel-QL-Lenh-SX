# CAT_report — Giai đoạn A: nạp DANH MỤC vào Thống kê Cao Sơn (preview cục bộ)

Thời điểm hoàn tất: 2026-11-03 (≈23:05 giờ máy). Môi trường: `http://localhost:6869/tk-api/api`, DB `thong_ke` (container `dpmm-preview-tk_postgres-1`).
Thư mục: `$XL/load/` = `C:/Users/HOME/AppData/Local/Temp/claude/D--Coding-DU-AN-AI-Software-Factory/b02fa6c3-57ff-4341-ad12-f4da46fe2ce1/scratchpad/xl/load/`.
Không in/ghi token, mật khẩu, họ tên, số thẻ trong báo cáo này (chỉ số lượng).

## 1. Kết quả (đã nạp THẬT và kiểm lại bằng GET + SELECT)

| Danh mục | Cách nạp | Kế hoạch | Thực tế (GET totalElements / SELECT) |
|---|---|---|---|
| Ca (shifts) | SQL | 3 (1: 06-14, 2: 14-22, 3: 22-06) | 3 |
| Loại thiết bị (device_types) | SQL | 10 (1 `MAY-XUC` group MAY + 9 theo chủng loại xe, group XE) | 10 |
| Phòng ban | API | 10 (`PXVT1,3,4,5,6,9` · `KT1,2,3` · `THONGKE`) | 10 |
| Chức vụ | API | 9 (`LX-VT1,3,4,5,6,9` = "Lái xe"; `NVKT-1,2,3` = "Nhân viên khai thác") | 9 |
| Người dùng | API | 465 = 456 nhân viên từ sổ PX + 9 giả định (`CHUACO-VT1,3,4,5,6,9`, `CHUACO-KT1,2,3`) | 465, **active=false: 465** |
| Chủng loại xe (vehicle-types) | API bulk | 9 | 9 |
| Chủng loại xe (NL) (fuel-classes) | API bulk | 9 | 9 |
| Nhóm hạng xe / Hạng xe | API bulk | 3 (`NHX-A/B/C`) / 5 (`A,B,C1,C2,C3`) | 3 / 5 |
| Thiết bị (devices) | SQL | 206 = 172 xe + 34 máy xúc | 206; mã duy nhất; 0 thiếu loại; 4 máy xúc không có phòng ban (xem §3-k) |
| Thuộc tính sản lượng (`device-production-attributes/bulk`) | API | 206 | 206 (172 xe đủ chủng loại xe + chủng loại NL; 170 xe có hạng; 20 máy xúc có dung tích gầu) |
| Nhóm hàng | API bulk | 14 | 14 |
| Sản phẩm nghiệm thu | API bulk | 5 (`Dat_SX, Dat_CN, Than_SX, Than_CN, Dat_TCN`) | 5 |
| TTL CLH | API bulk | 18 | 18 |
| Chủng loại hàng (CargoType) | API bulk | 29 (`CLH-001..029`, đủ nhóm hàng + SPNT + TTL) | 29 (29/29 đủ cả 3 liên kết) |
| Khu vực xúc | API bulk | 2 (`CS`→CS, `KC`→KC) | 2 |
| Nhóm vỉa | API bulk | 18 (`NV-<slug>`) | 18 |
| Nơi nhận tải | API bulk | 53 (`NNT-001..053`; 33 có nhóm vỉa) | 53 (33 có vỉa) |
| Nơi chất tải (PickupPoint) | API bulk | 54 = 53 trùng tên Nơi nhận tải (`NCT-001..053`) + `Chưa ghi nơi chất tải` (`NCT-000`) | 54 |
| Nơi dỡ tải | API bulk | 50 (`NDT-001..050`) | 50 |

Kiểm tự động: `catA_checks.json` = 22/22 đạt. Tra cứu mẫu qua API (xe 906, máy xúc P27, loại hàng `Nomin.`, nơi nhận `10.ĐCS` → nhóm vỉa `10.`, `CS`, ca, `CHUACO-*`) đều đúng.
Phủ nguồn: đã chạy thử `catA_cover.js` — **mọi** xe/máy xúc/loại hàng/nơi nhận/nơi dỡ/khu vực/ca của 24.368 dòng `tinh toan`, 4 file Khai thác, 4 sổ PX đều tra được trong `id_maps.json` (cần dùng bảng alias, §3-d); duy nhất `ST1` (máy xúc trong sổ VT9 bản "NhapSo", 44 dòng) không có — theo `VT69_00_TONG_QUAN.md` (câu hỏi 5) có thể là `XL.STTT-1`, chưa xác nhận nên không tự gán.

Phân bố thiết bị: xe theo PX: VT1 31 · VT3 30 · VT4 34 · VT5 34 · VT6 9 · VT9 34. Xe theo chủng loại: CAT773E 16 · CAT777 15 · CAT777D 21 · CAT777E 43 · HD465-7R 27 · HD785-7 33 · ScaniaP340 9 · VOLVOA40-F 5 · VOLVOA40-GCoi 3. Hạng: A 15 · B 13 · C1 41 · C2 97 · C3 4 · chưa biết 2 (xe `426`, `913`). Máy xúc theo đơn vị: KT1 10 · KT2 7 · KT3 13 · không phòng ban 4.

## 2. Tệp sinh ra (`$XL/load/`)
- `id_maps.json` — bản đồ id (xem §6). `CAT_DONE.txt` — dấu hoàn tất.
- Mã nguồn: `catA_apply.sh` (điều phối), `catA_run.sh` (chạy Node trong container tạm), `catA_plan.js` (dựng kế hoạch từ nguồn → `catA_plan.json`, `catA_anomalies.json`, `catA_plan_summary.txt`), `catA_load.js` (stage `sql1|api1|sql3|sql2|api2|verify`), `catA_lib.js`; phân tích: `catA_profile.js/.out`, `catA_kt.js`, `catA_alias.js`, `catA_people.js`, `catA_cover.js`, `catA_spot.js`.
- SQL đã áp dụng: `catA_sql1.sql` (ca + loại thiết bị), `catA_sql2.sql` (thiết bị), `catA_sql3.sql` (tắt active nhân viên tham chiếu).
- Nhật ký: `catA_load.log`, `catA_results_*.json`, `catA_error_samples.log` (mẫu body lỗi, không có mật khẩu).
- Sao lưu trước khi ghi: `backup_20261103_225226.sql` (pg_dump DB lúc còn trống, chỉ schema + Flyway).

## 3. Quyết định đã áp dụng và SAI LỆCH so với IMPORT_SPEC (mọi cái đều đảo ngược được)

a. **Chủng loại xe (vehicleType)** = cột 39 `Chủng loại xe` **bỏ hậu tố `.CS`** (`CAT777E.CS`→`CAT777E`; `CAT777.CS`→`CAT777`; `VOLVOA40-F`, `VOLVOA40-GCoi`). Khớp đúng tiêu đề cột lưới MO_HINH nguồn (`<loại xe>.CS`), nên khoá `<vehicleType.code>.CS` của engine ra đúng.

b. **Chủng loại xe (NL) (fuelClass)** — **SAI LỆCH so với D2**: spec ghi cột 43, nhưng cột 43 là `LEFT(…,7)` bị cắt cụt (`HD465-7`, `ScaniaP`, `VOLVOA4`, `CAT777.`), gộp nhầm Volvo A40F với A40G và không khớp tên cột/khoá của lưới ĐMNL / HS điều chỉnh nguồn (`HD465-7R.DAT`, `ScaniaP340.Than`, `VOLVOA40F`, `VOLVOA40G`, `CAT777`). Tôi dùng **cột 48 `CLXe + Loai xe` bỏ hậu tố `_<chữ hạng>`** → 9 lớp: `CAT773E, CAT777, CAT777D, CAT777E, HD465-7R, HD785-7, ScaniaP340, VOLVOA40F, VOLVOA40G` — đúng các gốc khoá trong `TD_CC_DMNL_o_luoi_tu_tinhtoan.csv` (22 cột `<lớp>.<BK|DAT|Than>`) và `TD_CC_luoi_HS_NLDM…` (`<lớp>_<hạng>_<DAT|Than>`). Giá trị cột 43 gốc vẫn ghi trong `devices.note` ("CL xe (NL) nguồn: …").

c. **Phòng ban của XE = PX (cột 42)**, không phải cột 47: cột 47 (`QLY THIET BI`: KhaiThac1./2./3./STTT-1/CKCĐ-1) thực ra là đơn vị quản lý của **MÁY XÚC** (mỗi máy chỉ có đúng 1 giá trị; một xe có đủ 3–4 giá trị). Mỗi xe chỉ thuộc 1 PX (0 xe thuộc 2 PX, cả bên Khai thác cũng khớp 100%). Máy xúc → KT1/KT2/KT3 theo cột 47 (đối chiếu với file Khai thác: khớp).

d. **Alias xe (gộp, KHÔNG tạo thiết bị trùng)** — D2 chỉ trim+HOA nên không gộp được các tên khác nhau của cùng một xe. Bằng chứng giao khoá (ngày, ca, máy xúc): Khai thác dùng `V21/V22/V23` (KT1) và `V21C/V22C/V23C` (KT3), Vận tải dùng `V21 Coi/V22 Coi/V23 Coi`: giao khoá 38/28/35 (đúng số chuyến 36/27/33) và 11/34/13 (đúng 100%); Khai thác `0929` ↔ Vận tải `S0929` (1/1 khoá, bằng chuyến). Sổ PX VT6 ghi `4834, 4821, 4822, 4825, 4828, 1045, 4833` = `S4834…` (7 mã, 1.737 dòng). Đã tạo **1 thiết bị cho mỗi xe vật lý** (mã Vận tải: `V21 COI`…, `S0929`…), và xuất bảng **`vehicleAliases`** (7) và **`soVehicleAliases`** (7) trong `id_maps.json`; tác tử nạp phiếu PHẢI tra `alias → mã chuẩn` trước. **Cần chủ dự án xác nhận** (Q1). Nếu bác bỏ, chỉ cần thêm 7 thiết bị riêng, không ảnh hưởng gì khác.

e. **Xe chỉ có bên Khai thác**: `426` (VT9, HD465-7R, 1 chuyến KT2) và `913` (VT1, CAT777D, 1 chuyến KT3). Đã tạo thiết bị (chủng loại xe/lớp NL suy từ cột `Loại xe` của KT, **chưa có hạng xe**, ghi chú trong `devices.note`) để tra được; không có chuyến Vận tải nên không vào tính sản lượng. Máy xúc chỉ có bên Khai thác: `U6` (tên `8U6`, KT2, 13 dòng ngày 29) — đã tạo.

f. **Tên có khoảng trắng cuối**: nơi nhận tải và nơi dỡ tải `Nghiền ` (nguồn có dấu cách cuối; 212/302 dòng) → lưu bản **đã trim** (`Nghiền`); `id_maps.json › rawVariants` ghi cả hai dạng để tra được bản gốc. Tất cả tên khác giữ nguyên văn (kể cả dấu chấm, hoa/thường, khoảng trắng giữa chữ). Không có tên nào trùng sau chuẩn hoá NFC/hoa-thường (đã kiểm).

g. **Nhóm vỉa `##N/A`** (3.757 dòng) là lỗi công thức Excel: **không** tạo nhóm vỉa này; 20/53 nơi nhận tải (Sàng/Bãi/Nghiền/Băng tải…) để `seamGroupId = null`. Ghi vào ngưỡng STD: khoá STD của các nơi nhận này sẽ không có thành phần nhóm vỉa (cần quyết định ở giai đoạn B).

h. **Nhóm hàng / SPNT / TTL**: `code` = đúng tên nguồn (không đặt mã nhân tạo). Loại hàng `CLH-001..029` theo thứ tự xuất hiện đầu tiên trong `tinh toan`. Không có va chạm: mỗi loại hàng đúng 1 nhóm hàng + 1 SPNT + 1 TTL (0 loại hàng 2 SPNT).

i. **Hạng xe**: nhóm hạng theo chữ đầu (`NHX-A`: A · `NHX-B`: B · `NHX-C`: C1, C2, C3); `rank` = số cuối mã (A,B = 1; C1=1, C2=2, C3=3). Engine chỉ đọc mã hạng (A→0,97; B→1; C1→1,04; còn lại 1,06).

j. **Gầu xúc / tải trọng**: `bucketCapacity` số chỉ khi nguồn là dạng số (`6,7m3`→6,7; `12 m3`→12): 20/34 máy xúc. `XucDien` (E12, U2, U4, U5, U7, U8), `<5m3` (HT4, P12, P28), `##N/A` (H6, MS1, MS3, XL.STTT-1) và `U6` (chỉ có bên Khai thác, không có thông tin gầu) để **trống** và ghi nguyên văn vào `devices.note`. `devices.capacity` (tải trọng) chỉ đặt khi nguồn là số đơn (`40 tan`→40: 17 xe); `>90 tan` / `55-58 tan` ghi vào `note`. Engine không đọc 2 trường này.

k. **Máy xúc không có phòng ban (department_id = NULL)**: `XL.STTT-1, MS1, MS3` (đơn vị `STTT-1`) và `H6` (`CKCĐ-1`) vì D3 không có phòng ban tương ứng; nguyên văn ở `devices.note` (Q2). `H6` và `HT6` là 2 mã khác nhau trong nguồn (H6 ngày 3,11,20-26,30; HT6 ngày 3-5, KT1) — giữ 2 thiết bị (nghi cùng một máy gõ khác nhau).

l. **Phòng ban/Chức vụ**: `allowedResources` PXVT = `transport-reports`; KT = `excavation-reports`; `THONGKE` = transport/excavation/reconciliation/production/report-periods. Chức vụ có quyền `c,r,u` đúng chức năng của đơn vị. **`THONGKE.fullDataScope` vẫn `false`**: API bỏ qua trường này khi tạo (mapper `ignore`), chỉ SQL đặt được; không ảnh hưởng nạp (token Điều phối đã `fullDataScope=true`) — nếu muốn: `UPDATE departments SET full_data_scope=true WHERE code='THONGKE'`.

m. **Chỉ 6 PX Vận tải** (VT1, VT3, VT4, VT5, VT6, VT9) vì dữ liệu T9 chỉ có 6; không tạo VT2/VT7/VT8, nên `CHUACO-VT*` cũng 6 mã.

n. **Người dùng**: `salaryCode` = **số thẻ trong sổ PX** (dải 4065–9350), `username = nv<salaryCode>`; mật khẩu 20 ký tự ngẫu nhiên mỗi người, không ghi đâu cả; tất cả `active=false` (xem §4-2). Phân bổ: VT3 125 thẻ, VT5 144, VT9 147, VT6 40 (không thẻ nào ở 2 PX). Số thẻ lương này **khác hoàn toàn** bảng DSCBCNV (dải 0–3999; 0/462 trùng) — dùng thẻ trong sổ, không dùng DSCBCNV (Q3).

## 4. Va chạm / bất thường phát hiện (GHI, chọn phương án bảo thủ)

1. Nhân viên: 1 số thẻ xuất hiện với 2 tên (giữ tên nhiều dòng nhất); 6 họ tên xuất hiện với 2–3 số thẻ khác nhau (có thể đổi thẻ cũ/mới hoặc trùng tên) → giữ mỗi thẻ là một nhân viên. Dòng sổ thiếu số thẻ: VT3 1 dòng, VT6 108/2.656 dòng → `CHUACO-VT3/VT6`. **VT1 và VT4 không có sổ PX** → toàn bộ (3.683 và 5.363 dòng `tinh toan`, ≈37% tổng dòng Vận tải) sẽ dùng `CHUACO-VT1/VT4`: nhân viên Vận tải và Khai thác (D8) cùng là `CHUACO-VT*` nên vẫn ghép được nhưng báo cáo theo người không có nghĩa cho 2 PX này.
2. **LỖI NỀN TẢNG TK (chưa sửa, chỉ ghi nhận)** — (i) `POST /users` với `permissions: []` trả **500**: `LazyInitializationException ... Department - no session` (`UserService.create`: `userPermissionRepository.deleteByUser_Id` có `@Modifying(clearAutomatically=true)` làm detach proxy `Department` chưa khởi tạo rồi mapper `UserMapper.userDepartmentName` đọc `getName()`). **Cách né**: gửi `permissions` = quyền của chức vụ (có phần tử → `validatePermissionsAgainstDepartment` khởi tạo proxy trước). (ii) `PUT /users/{id}` **luôn 500**: `LazyInitializationException ... User.deviceTokens` (cùng nguyên nhân, collection lazy bị detach) → **không đặt được `active=false` bằng API**. Cách làm: dùng `UPDATE users SET active=false` (SQL, `catA_sql3.sql`, đúng 465 salary_code của lượt nạp này, 465 dòng đổi). Đây là việc lệch khỏi quy ước "PUT active=false" của spec; hoàn tác = `UPDATE users SET active=true WHERE …`. Mẫu lỗi trong `catA_error_samples.log`. Bên mã nguồn: `ThongKe/backend/.../service/UserService.java`, `repository/UserPermissionRepository.java:25`.
3. Thuộc tính xe/máy trong nguồn (PX, hạng) là của tháng 9 (mỗi dòng `tinh toan` đều là THANG=9) — tài liệu TD ghi 44 xe đổi PX/hạng giữa các tháng; không ảnh hưởng T9.
4. Cột 43 (`Chung loai xe (NL)`) bị cắt cụt — xem §3-b.
5. Không có va chạm mã xe ↔ máy xúc (0), không có xe thuộc 2 PX (0), không có loại hàng 2 SPNT (0), `Số hiệu xe` (tên) không trùng.

## 5. Lệnh tái lập / hoàn tác
Tái lập (idempotent, tra trước theo mã/tên, bỏ qua cái đã có; chạy lại đã kiểm: 0 tạo mới, 22/22 đạt):
```
cd $XL/load
./catA_apply.sh            # DRY-RUN mặc định: đọc nguồn, GET kiểm, sinh SQL, in số sẽ tạo
./catA_apply.sh --apply    # pg_dump → sql1 → api1 → sql3 → sql2 → api2 → verify (ghi id_maps.json)
SKIP_BACKUP=1 ./catA_apply.sh --apply   # chạy lại không dump
```
Hoàn tác: toàn bộ DB `thong_ke` trước khi nạp là rỗng nên cách sạch nhất là khôi phục bản sao lưu (cần dừng backend TK để không bị giữ kết nối):
```
docker stop dpmm-preview-tk_backend_service-1
docker exec dpmm-preview-tk_postgres-1 psql -U postgres -d thong_ke -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i dpmm-preview-tk_postgres-1 psql -U postgres -d thong_ke < $XL/load/backup_20261103_225226.sql
docker start dpmm-preview-tk_backend_service-1
```
Hoàn tác từng phần (khi đã có phiếu): `backend/reset-du-lieu-giao-dich.sql` (xoá giao dịch, giữ danh mục) rồi xoá danh mục qua `DELETE /…/bulk` theo thứ tự ngược phụ thuộc (cargo-types trước nhóm hàng/SPNT/TTL; receiving-points trước nhóm vỉa; vehicle-ranks trước nhóm hạng; positions trước departments); ca/thiết bị/loại thiết bị/người dùng không có API xoá → `DELETE` bằng SQL. Chỉ tắt/bật tài khoản: `UPDATE users SET active=… WHERE salary_code IN (…)`.

## 6. `id_maps.json` (cấu trúc)
`shifts{"1","2","3"}` · `vehicles{mã chuẩn→id}` (172) · `excavators{mã chuẩn→id}` (34) · `vehicleAliases{alias KT→mã Vận tải}` · `soVehicleAliases{mã sổ→mã chuẩn}` · `users{salaryCode→id}` (465) · `chuacoUsers{CHUACO-xx→id}` · `userDepartment{salaryCode→PX/KT}` · `cargoTypes{tên→id}` · `cargoTypeCodes{CLH-xxx→id}` (khoá hàng MO_HINH) · `cargoGroups/acceptanceProducts/ttlClh{tên→id}` · `excavationAreas{CS,KC}` · `receivingPoints/pickupPoints/unloadingPoints/seamGroups{tên→id}` · `defaultPickupPoint{name,id}` · `departments/positions/vehicleTypes/fuelClasses/vehicleRanks{mã→id}` · `rawVariants` (tên gốc có dấu cách thừa; mã xe/máy xúc dạng gốc) · `deviceMeta{mã→{loai:XE|MAY, vehicleType, fuelClass, rank, PX, department, name, nguon, id}}`.
Quy tắc tra: xe = `normalize(trim, HOA)` rồi alias; máy xúc = `trim, HOA, bỏ '.' cuối` (`p27.`→`P27`, `XL.STTT-1.`→`XL.STTT-1`, KT2 dùng cột `Mã MX`); tên danh mục = trim.

## 7. Câu hỏi cho chủ dự án
- **Q1** Xác nhận gộp alias xe: `V21/V22/V23` (KT1) và `V21C/V22C/V23C` (KT3) = `V21 Coi/V22 Coi/V23 Coi`; `0929` = `S0929`; sổ VT6 `4834…` = `S4834…`?
- **Q2** Máy xúc của STTT (`XL.STTT-1`, `MS1`, `MS3`) và `H6` (CKCĐ-1) thuộc phòng ban nào? Có cần thêm phòng ban `STTT-1`/`CKCĐ-1`? `H6` có phải `HT6`?
- **Q3** Số thẻ lương: dùng thẻ trong sổ PX (4065–9350) hay thẻ DSCBCNV (0–3999)? Ai cấp danh sách nhân viên VT1/VT4 (không có sổ) và người vận hành máy xúc KT?
- **Q4** Gầu xúc `XucDien`/`<5m3`/`##N/A` nhập con số thật là bao nhiêu (m³)? (engine không dùng)
- **Q5** Có muốn `THONGKE.fullDataScope=true` không (SQL)? Có muốn sửa lỗi nền tảng `UserService` (§4-2) trong repo ThongKe không?
- **Q6** Xe `426`, `913` chỉ thấy bên Khai thác (1 chuyến): gõ nhầm hay xe thật? Cần hạng xe.
