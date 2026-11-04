# STAGEB_report — Giai đoạn B: nạp ĐỊNH MỨC / HỆ SỐ / LƯỚI tháng 9/2026 vào Thống kê Cao Sơn (preview cục bộ)

Hoàn tất nạp + độ phủ: 2026-11-04 ≈ 00:40; tính sản lượng thật: ≈ 00:46 (§5). Đối soát với Excel: xem `DOISOAT_report.md`. Môi trường: `http://localhost:6869/tk-api/api`, DB `thong_ke` (container `dpmm-preview-tk_postgres-1`).
`$XL/load/` = `C:/Users/HOME/AppData/Local/Temp/claude/D--Coding-DU-AN-AI-Software-Factory/b02fa6c3-57ff-4341-ad12-f4da46fe2ce1/scratchpad/xl/load/`. Không in token/mật khẩu/họ tên/số thẻ.
Phạm vi KHÔNG làm (đúng chỉ thị): STD/trắc địa, 5 kỳ, chốt kỳ, `tkeMode=false`, sửa mã nguồn repo, đụng server khác.

## 1. Kết quả nạp (đã ĐỌC LẠI bằng GET và SELECT, khớp nguồn 100%)

| Hạng mục | Cách nạp | Nguồn | Kế hoạch | Thực tế (đọc lại) |
|---|---|---|---|---|
| 4 định nghĩa lưới (`matrix_definitions`) | SQL `seed-matrix-catalogs.sql` (bản sửa 1 dòng, xem §6-1) | repo | 4 | 4 (id 1–4) |
| `HS.THAN.TRUDA` | API `POST /coefficients` | giả định chốt | 0,8938 | 0,893800 |
| `HS.BUN` | API | Excel `$BN$2` | 0,1 | 0,100000 |
| Tỷ trọng (`density-parameters`) | API `POST /bulk` | ướt: `VT69_NLTH_ty_trong_theo_chungloaihang.csv`; khô: `TyTrongKoQA` cache `tinh toan` | 29 dòng (khu vực null, 2026-09-01..09-30) | 29 dòng, lệch nguồn 0 |
| MO_HINH | API (hàng `CLH-xxx` × cột `<chủng loại xe>.CS`) | `VT69_NLTH_luoi_MO_HINH.csv` | 29 hàng × 9 cột, **110 ô** | 110/110, thiếu 0, khác 0, thừa 0 |
| HS_DIEU_CHINH_NLDM | API (cột `T9.CS`) | `VT69_NLTH_luoi_HS_DIEU_CHINH_NLDM.csv` (= `TD_CC_luoi_HS_NLDM`, 0 khác) | 15 hàng × 1 cột, **15 ô** | 15/15 |
| DMNL | API | sheet `DMNL T2-2025` của `Tháng 5 đổi tên xe.xlsx` (ĐẦY ĐỦ) | 28 độ dốc × 1.024 cột = **28.672 ô** | 28.672/28.672 |
| NANG_SUAT_XE | API | sheet `NS XE (3305…)` (= `TD_CC_NS_XE_3305…csv`) | 80 cung độ × 27 cột = **2.160 ô** | 2.160/2.160 |
| Kỳ báo cáo | `GET /report-periods/by-month?year=2026&month=9` (tự tạo) | đúng cách màn hình làm | 1 kỳ cả tháng | **id=1** "Kỳ 01, 1/9 đến 30/9", chưa chốt |

Cả 4 lưới: 1 phiên bản `T9-2026`, hiệu lực **2026-09-01..2026-09-30** (đặt bằng `PUT /versions/{id}` lên chính dòng định nghĩa id 1–4, không sinh phiên bản rỗng thừa). Chạy lại script ở chế độ dry-run: "đã có / cần thêm 0" ở mọi mục (idempotent).
Sao lưu: trước ghi `backup/stB_before_20261104_0015.dump`; sau nạp `backup/stB_after_load_20261104_0038.dump` (cùng thư mục `$SP/backup/`, `pg_dump -Fc`).

## 2. Giả định đã dùng (CẦN CHỦ DỰ ÁN XÁC NHẬN)

1. **HS.THAN.TRUDA = 0,8938** (docs ghi 0,985). Kiểm lại trên cache: 559/559 dòng `Than_SX` có tấn = m³ × tỷ trọng × 0,8938 (không dòng nào khác). Nếu dùng 0,985 thì tấn than SX lệch +10,2% so với Excel.
2. **HS.BUN = 0,1** (BSNL bùn / NL theo ĐM = 0,1000 trên cache; trùng server thật).
3. **Tỷ trọng**: hiệu lực chỉ **tháng 9/2026** (không phải cả năm như server thật) vì các số này chỉ có căn cứ ở dữ liệu T9; mỗi loại hàng đúng 1 giá trị ướt + 1 giá trị khô trong cả tháng; hợp đồng API không bắt buộc cả năm. Mở rộng = `PUT` đổi `effectiveTo`. Khu vực = null (T9 chỉ có CS). Lưu ý dữ liệu khách: 2 loại `XitLoai(Tu NK|SPNT)-MayTo` có tỷ trọng khô 2,309 > ướt 1,477 (đúng như `TyTrongKoQA` trong Excel, giữ nguyên; chỉ ảnh hưởng cột "không quy ẩm", không ảnh hưởng chế độ TKE chính).
4. **MO_HINH**: chỉ có cột `.CS` (T9 không có KC). 2 ô xung đột `Dthai.` × `CAT777D.CS` / `HD785-7.CS` chọn giá trị đa số **42,4** (1.167 chuyến; ngoại lệ 28,267 × 2) và **40,1** (1.276; ngoại lệ 26,733 × 1).
5. **HS_DIEU_CHINH_NLDM**: chỉ `T9.CS` (15 khoá, `HD465-7R_C_DAT` = 1,02, còn lại = 1). Các tháng khác và KC để trống.
6. **DMNL — chuẩn hoá khoá cột theo engine** (engine so chuỗi phân biệt hoa/thường, Excel `MATCH` thì không): dấu phẩy thập phân → dấu chấm (`HD785-7.BK_0,05` → `HD785-7.BK_0.05`); `VoLvoA40F/G` → `VOLVOA40F/G` (đúng mã lớp NL đã nạp); hậu tố `than/Than` → `Than`, `Dat/DAT` → `DAT`, `BK`, `Bun`. Thêm bản sao hậu tố `.Dat` (nhánh cạp đất, engine sinh `.Dat` ≠ `.DAT`) cho 3 lớp mà engine có thể sinh (`VOLVOA40F`, `VOLVOA40G`, `HM400-2R`) = 72 cột, cùng giá trị cột `.DAT` (Excel coi hai cách viết là một cột). Tổng 952 cột gốc + 72 = 1.024.
   - Độ dốc trùng khoá: dòng độ dốc `0` xuất hiện 2 lần (dòng 7, 8) và `1000` 6 lần (dòng 35–40). Lấy **dòng đầu** (đúng `MATCH(...,0)` của Excel). Dòng 35–40 giống nhau; dòng 7 ≠ 8 ở 38 ô cột `CAT773E.BK_*` (210,7 vs 251,0 tại 0,05 km): lấy dòng 7 — khớp cache Excel (`CAT773E.BK, 0,8, 0 = 152,1`).
   - Tiêu đề `CAT777D.than_0,0` (có vẻ gõ nhầm của `0,05`) nạp thành khoá `CAT777D.Than_0`; 3 cột ngoài vùng công thức (`AJS:AJU` = `HM400-2R.Than_3,5/4/4,5`) bỏ qua. Cột `HM400-2R.*` nạp đủ dù T9 không có xe HM400.
   - Chọn bản **T2-2025** (cùng QĐ tháng 2/2025 với cột `ĐMNL_xe (QD 1828_25/02/2025)` của Excel T9). Đơn vị lít/1000 T.km (theo tên cột cache). Kiểm chứng ở §4 (V1) cho thấy 4 ô lưới mà Excel đọc cho MỖI một trong 24.368 dòng T9 đều bằng ô trong lưới đã nạp (0 ô lệch).
7. **NANG_SUAT_XE**: nạp cả 27 cột của sheet, chuẩn hoá hậu tố (`THAN` → `Than`, `Dat/DAT` → `DAT`, `HM400-2r` → `HM400-2R`) để khớp khoá engine `<chủng loại xe>.<DAT|Than>`. 11 cột T9 dùng đã đối chiếu cache: **0 lệch trên 21.207 dòng**.
8. Kỳ: 1 kỳ cả tháng (như màn hình tự tạo), không chia 5 kỳ.

## 3. ĐỘ PHỦ (mô phỏng đúng khoá engine, trên dữ liệu đã đọc lại qua API)

Mô phỏng: `TripBaseCalculator` (SPNT, tỷ trọng ướt/khô, MO_HINH `CLH × <loại xe>.<CS|KC>`, `HS.THAN.TRUDA`), `FuelCalculator` (khoá DMNL `fuelNormVehicleKey`, nội suy song tuyến `Hb/Ha/h1/h2`, `HS.BUN`, HS_DIEU_CHINH `<lớp NL>_<chữ đầu hạng>_<DAT|Than>` × `T9.<CS|KC>`, NANG_SUAT cung độ làm tròn 1 chữ số / >8→8 × `<loại xe>.<DAT|Than>`). Script: `$XL/load/stB_cover.js` (chỉ GET).

**Phạm vi: 9.840 dòng chuyến VT đã APPROVED = 46.045 chuyến**

| Tham số | Dòng chuyến tra ĐỦ | Chuyến |
|---|---|---|
| Sản phẩm nghiệm thu, chủng loại xe, lớp NL, hạng xe | 9.840 / 9.840 (100%) | 46.045 |
| Tỷ trọng ướt + khô (29 loại hàng; 15 loại có mặt) | 100% | 100% |
| MO_HINH (`CLH` × `<xe>.CS`) | 100% | 100% |
| `HS.THAN.TRUDA` (318 dòng Than_SX) / `HS.BUN` | có | — |
| DMNL (khoá + nội suy) | 100% (313 trúng nút lưới, 9.258 nội suy trong dải, 269 nằm ngoài dải → engine kẹp về biên, như Excel) | 100% |
| HS_DIEU_CHINH_NLDM | 100% | 100% |
| **NANG_SUAT_XE** | **8.532 / 9.840 (86,71%)** | **41.128 / 46.045 (89,32%)** |

**Chỗ thiếu DUY NHẤT còn lại (cần chủ dự án quyết): cột NANG_SUAT_XE**

| Khoá thiếu | Dòng chuyến đã duyệt | Chuyến đã duyệt | (toàn bộ 24.368 dòng) |
|---|---|---|---|
| `CAT777.DAT` (CAT777 hạng A, 15 xe) | 1.198 | 4.179 | 2.578 dòng / 9.113 chuyến |
| `VOLVOA40-GCoi.Than` | 70 | 618 | 509 / 3.351 |
| `VOLVOA40-GCoi.DAT` | 40 | 120 | 74 / 323 |
| **Cộng** | **1.308** | **4.917** | 3.161 / 12.787 |

- **Không suy được từ dữ liệu**: trường "Định mức năng suất" trong cache `tinh toan` của đúng các dòng này là `##N/A` ở 100% (Excel của khách cũng không có số), còn mọi cột khác trùng sheet NS XE 100%. Nên KHÔNG bịa số, để trống ô.
- Hệ quả (đã xảy ra thật, §5): engine cũ chặn `calculate`; engine mới (`onlyApproved`) chỉ để trống 1.308 ô năng suất + cảnh báo, sản lượng vẫn tính. Hướng xử lý để chủ dự án chọn: (a) khách cung cấp 3 cột năng suất; (b) coi CAT777 tương đương CAT777E (bảng 3305 có `CAT777E.DAT`) — giả định kỹ thuật cần chủ dự án duyệt, KHÔNG tự làm. Có bảng khác `VT69_VT9_dmns_xe_NANGSUAT_QD816.csv` (QĐ 816/2025, theo lớp_hạng, có `CAT777_A`, `VolvoA40G_A/B/C`) nhưng số KHÁC bảng 3305 ở các cột chung (vd 0,1 km: CAT773E 35 vs 40) nên không trộn.
- File chi tiết: `$XL/load/stB_cover.json`, `$XL/load/stB_cover_missing.csv`.

## 4. Đối chiếu với Excel (cache `tinh toan` T9, 24.368 dòng) — phát hiện lệch giữa engine và Excel

- **V1 — số liệu lưới DMNL**: với cả 24.368 dòng, 4 ô lưới Excel đọc (`Nb-h1, Nb-h2, Na-h1, Na-h2`) = ô lưới đã nạp (**0 lệch**). Nội suy engine so với `Nt-NLĐM tiêu hao cần tìm`: 24.279/24.368 trùng (99,63%), 89 dòng lệch tới 4,1%.
- **Nguyên nhân 89 dòng lệch (engine chưa dựng bước của Excel)**: Excel nội suy độ dốc theo **"Chênh cao thanh toán nhiên liệu" (cột P)**, engine dùng thẳng `totalRouteLiftM`. **Công thức P (trích `ThongKe/docs/REQUIREMENT_SANLUONG_EXCEL.md` §3.6, đã kiểm trên dữ liệu):**
  ```
  P = IF(L=0, 0, IF(O<M, M, ROUND( IF(N<>0, max(M,0) + (O - max(M,0)) * N / L, max(M,0)), 0)))
  L = Cung độ toàn tuyến (totalRouteDistanceKm)   M = Nâng tải toàn tuyến (totalRouteLiftM)
  N = Cung độ dốc cục bộ (localSlopeDistanceKm)    O = Dốc cục bộ (localSlopeM)
  ```
  **Biểu diễn được hoàn toàn bằng 4 trường TK đã có** (cột `total_route_distance_km`, `total_route_lift_m`, `local_slope_distance_km`, `local_slope_m` của `transport_report_trips`); không cần trường mới. Bằng chứng (`$XL/load/stB_chenhcao.js`): (1) công thức P tái tạo đúng cột "Chênh cao thanh toán nhiên liệu" của Excel trên **24.368/24.368 dòng T9** (0 lệch; nhánh dốc cục bộ dùng ở 89 dòng); (2) nội suy DMNL bằng P khớp `Nt` của Excel **24.368/24.368** (bằng nâng tải: 24.279); (3) trên DB chỉ **89 dòng chuyến có dốc cục bộ** làm P ≠ nâng tải, trong đó **18 dòng đã duyệt (23 chuyến)** — chỉ ảnh hưởng chỉ tiêu nhiên liệu, không ảnh hưởng m³/tấn/T.km. Các dòng nâng tải âm / ngoài dải khác không đổi (engine kẹp về dải biên giống Excel). Cột P chưa được dựng trong `FuelCalculator`.
- **V2 — khoá cột DMNL** (ĐÃ được điều phối sửa trong backend mới): `FuelCalculator` từng truyền `cargoType.getCode()` (`CLH-014`) vào `ProductionKeys.fuelNormVehicleKey`, hàm này so với **TÊN** hàng. Trước khi sửa: khoá engine khớp Excel 2.881/3.024 nhóm (xe, loại hàng, nơi dỡ); truyền tên hàng khớp 3.024/3.024. Ảnh hưởng 352 dòng đã duyệt (1.206 chuyến) SPNT.VIA đổ ngoài băng tải (`.DAT` thay vì `.BK`): CAT773E 86, HD465-7R 192, VOLVOA40F 44, VOLVOA40G 30. Chỉ ảnh hưởng nhiên liệu.

## 5. Tính sản lượng thật (kỳ id=1, `POST /production/calculate?periodId=1&tkeMode=true&onlyApproved=true`)

**THÀNH CÔNG** (backend mới: hết chậm bậc hai, khoá DMNL theo tên hàng, thiếu định mức nhiên liệu/năng suất không còn chặn khi `onlyApproved`). Gọi 1 lần, thẳng backend trong network compose (`tk-backend:8088`, không qua nginx 300 s; script `stB_calc2.js`), HTTP 200 sau **60,7 s**; kết quả thô `$XL/load/stB_calc_run1.json`.

| Chỉ số | Giá trị |
|---|---|
| `tripCount` | **9.840** (= 9.840 dòng chuyến VT đã duyệt, 46.045 chuyến) |
| `excludedTripCount` | **14.528** (chuyến chưa duyệt, không nằm trong số liệu) |
| `coefficientRowCount` | 744 (`survey_coefficients` = 744 dòng, hệ số = 1 do TKE) |
| `production_results` | 9.840 dòng, `tke_mode` = true cả 9.840 |
| Kỳ | id=1, chưa chốt (`locked=false`, `stale=false`) |

`GET /production/summary?periodId=1` (30 ngày; `unapprovedTripCount`=14.528): **tổng m³ = 1.335.612,3** · **tổng tấn (AM, `totalTon`) = 3.348.876,26** · **tổng T.km (`totalTkm`) = 17.109.144,83**; cột quy đổi TKE: `finalTon` = 3.355.442,27, `finalTkm` = 17.134.766,89, `surveyM3` = 1.335.612,3.

Theo sản phẩm nghiệm thu (dòng / m³ / tấn `total_ton` / tấn `final_ton` / T.km `total_tkm` / `final_tkm`):
Dat_SX 9.077 / 1.232.751,7 / 3.186.370,8 / 3.186.370,8 / 16.701.618,0 / 16.701.617,9 · Dat_CN 373 / 28.824,3 / 75.184,1 / 75.184,1 / 156.651,5 / 156.651,5 · Than_CN 72 / 22.770,3 / 32.060,6 / 32.060,6 / 35.234,3 / 35.234,3 · **Than_SX 318 / 51.266,0 / 55.260,8 / 61.826,8 / 215.641,1 / 241.263,2**.

**Lưu ý khi đối soát Excel**: ở chế độ TKE, `final_ton`/`final_tkm` của **Than_SX KHÔNG nhân `HS.THAN.TRUDA`** (61.826,8 = 55.260,8 / 0,8938; lệch +6.566 t, +0,2% tổng), còn `total_ton`/`total_tkm` (cột AM/AN) có nhân. Con số khớp "Tổng KLVC (tấn)" của Excel là `totalTon`; cần quyết định cột nào là "TKE chính thức".

**Cảnh báo trả về (nguyên văn, `warnings` = 2 dòng):**
1. `Nhiên liệu/năng suất để TRỐNG (thiếu định mức, như #N/A của Excel — không phải 0) ở 1308 lượt tra; sản lượng m3/tấn/Tkm không bị ảnh hưởng: lưới Năng suất xe chưa có ô [8 × CAT777.DAT]. (498 chuyến); lưới Năng suất xe chưa có ô [4 × CAT777.DAT]. (136 chuyến); lưới Năng suất xe chưa có ô [4.1 × CAT777.DAT]. (82 chuyến); lưới Năng suất xe chưa có ô [7.2 × CAT777.DAT]. (49 chuyến); lưới Năng suất xe chưa có ô [4.4 × CAT777.DAT]. (35 chuyến) … và 86 nguyên nhân khác.`
2. `Kỳ mới được tính trên phần ĐÃ DUYỆT đối chiếu: 9840 chuyến Vận tải đã tính, 14528 chuyến chưa duyệt đối chiếu KHÔNG nằm trong số liệu (duyệt thêm rồi tính lại kỳ để đưa vào).`

Khớp độ phủ §3: đúng **1.308** dòng chuyến thiếu ô NĂNG SUẤT (`productivity_norm` null = 1.308/9.840); mọi thứ khác (ĐMNL, HS điều chỉnh, `fuel_norm`, `fuel_current_norm`) có giá trị ở cả 9.840 dòng. Không có lỗi "chỗ thiếu khai báo" nào khác.

Lần chạy đầu (backend cũ, 00:20–00:35): 504 sau 300 s (nginx), backend chạy >14 phút do engine chậm bậc hai, tự rollback khi container bị tạo lại; không để lại gì. Một lần gọi thẳng backend bằng host `tk_backend_service` bị Tomcat từ chối 400 (tên host có gạch dưới) trước khi tới ứng dụng — dùng alias `tk-backend`.
Sao lưu sau tính: `$SP/backup/tk_after_calc_20261104_0047.dump`.

## 6. Lỗi/bẫy gặp phải và cách xử lý

1. **`backend/seed-matrix-catalogs.sql` hỏng với schema hiện tại**: `ON CONFLICT (code) DO NOTHING` báo "no unique or exclusion constraint matching" vì ràng buộc nay là `uk_matrix_definition_code_from (code, effective_from)` (thêm phiên bản lưới). Cách xử lý: chạy bản sao sửa thành `ON CONFLICT (code, effective_from)` (`$XL/load/stB_seed_matrix_catalogs.sql`; bảng đang 0 dòng nên an toàn; lần chạy lỗi không để lại gì). Không sửa file trong repo (ngoài phạm vi); đề nghị điều phối sửa file seed + ghi `docs/INCIDENTS.md`.
2. **Quy ước khoá cột lưới** (hoa/thường, dấu thập phân, `Than` vs `THAN`): xem §2-6/7 — Excel không phân biệt hoa/thường, engine thì có.
3. **calculate 504** ở nginx 300 s — xem §5.
4. Không có lỗi API 400/409/500 khi nạp (mọi POST/PUT đều 200).

## 7. Việc còn lại / cần quyết định

| # | Vấn đề | Ai quyết |
|---|---|---|
| 1 | 3 cột NANG_SUAT_XE (`CAT777.DAT`, `VOLVOA40-GCoi.DAT/Than`) — 1.308 dòng / 4.917 chuyến đã duyệt | chủ dự án (xem §3) |
| 2 | Xác nhận `HS.THAN.TRUDA` = 0,8938 (không phải 0,985) | chủ dự án |
| 3 | Engine: dựng cột P "Chênh cao thanh toán NL" cho nội suy DMNL (công thức + bằng chứng §4; ảnh hưởng 18 dòng đã duyệt, chỉ nhiên liệu). Khoá DMNL theo tên hàng ĐÃ sửa | điều phối |
| 4 | Hiệu lực tỷ trọng/lưới chỉ tháng 9; mở rộng khi nạp tháng khác | tùy |
| 5 | Chọn cột "TKE chính thức" khi đối soát Excel (`totalTon` có nhân HS.THAN.TRUDA, `finalTon` Than_SX thì không — §5) | điều phối |
| 6 | STD/trắc địa (`tkeMode=false`), 5 kỳ, chốt kỳ — chưa làm theo chỉ thị | — |

## 8. Đường dẫn script (`$XL/load/`)

- Chạy trong container tạm: `stB_run.sh <script.js> [args]` (`--rm -m ${MEM:-1500m}`, image `dieuphoimm_backend_img`).
- Nạp: `stB_load.js [--apply] [--stages …]` (mặc định dry-run, idempotent, nhật ký `stB_load.log`, kết quả đọc lại `stB_load_result_dry.json`); dựng dữ liệu nguồn `stB_data.js`; đọc sheet xlsx nhỏ `stB_xl.js` (sheet đã bung ra `xl/work/stB_xlsx/`: `sheet46.xml` = DMNL T2-2025, `sheet125.xml` = NS XE 3305); lib `stB_lib.js`; SQL `stB_seed_matrix_catalogs.sql`.
- Độ phủ & đối chiếu Excel: `stB_cover.js` (→ `stB_cover.json`, `stB_cover_missing.csv`), `stB_trips.csv` (xuất SELECT 24.368 chuyến VT), `stB_cache_slim.tsv`, `stB_ns_an.js`, `stB_dens_an.js`, `stB_hs.js`, `stB_keydiff.js`, `stB_v1dbg*.js`.
- Tính sản lượng: `stB_calc2.js <periodId> <tag>` + `stB_run_net.sh` (gọi thẳng `tk-backend:8088`; → `stB_calc_<tag>.json`; bản cũ qua nginx `stB_calc.js`); tóm tắt `stB_sum.js`.
- Công thức P / nội suy theo P: `stB_chenhcao.js` (+ `stB_trips_slope.csv`).

## 10. Cập nhật 2026-11-04 ≈ 01:10 (sau đối soát lần 1)

- **`HS.THAN.TRUDA` đã đặt lại bằng `PUT /coefficients/1` = 0,8938399** (giả định của điều phối, chưa phải quyết định chủ dự án; 7 chữ số lấy từ 559/559 dòng `Than_SX` của Excel). Cột lưu `numeric(19,6)` nên **thực lưu 0,893840** (GET trả 0,89384; sai số tương đối 1,1e-7). Ghi chú của hệ số đã cập nhật. Mục §2-1 ở trên (0,8938) là giá trị CŨ.
- **Tính lại** kỳ id=1 (`tkeMode=true&onlyApproved=true`, gọi thẳng backend, 1 lần): HTTP 200 sau 64,2 s, `tripCount`=9.840, `excludedTripCount`=14.528, `coefficientRowCount`=744, 2 cảnh báo giống lần 1. Tổng mới: m³ 1.335.612,3 · tấn (`total_ton`) 3.348.878,74 · T.km (`total_tkm`) 17.109.154,48 · `final_ton`/`survey_ton` 3.355.442,27 · `final_tkm`/`survey_tkm` 17.134.766,89 · nhiên liệu hiện hành (BQ) 2.232.063,97 lít.
- Backend đã có cột P (chênh cao thanh toán nhiên liệu). Đối soát lần 2 (`DOISOAT_report.md`): tấn/T.km khớp Excel 9.840/9.840; nhiên liệu chỉ còn lệch 3 dòng Roda (+21,4 lít).
- Backup: `$SP/backup/tk_after_calc2_20261104_0110.dump`.

## 11. Cập nhật 2026-11-04 ≈ 01:50 — tính lần 3 (backend có cột P, tên hàng, phương án A; Roda theo Excel)

- Calculate lần 3 (kỳ id=1, `tkeMode=true&onlyApproved=true`, thẳng backend, 1 lần): HTTP 200 sau 44,5 s; `tripCount` 9.840, `excludedTripCount` 14.528, `coefficientRowCount` 744, 2 cảnh báo như cũ (1.308 lượt tra thiếu ô năng suất `[… × CAT777.DAT]`; kỳ chỉ tính phần đã duyệt). Backup `$SP/backup/tk_after_calc3_20261104_0144.dump`.
- Tổng: m³ 1.335.612,300 · tấn (`total_ton` = `final_ton` = `survey_ton`) 3.348.878,737 · T.km `total_tkm` 17.109.154,475, `final_tkm` = `survey_tkm` 17.109.154,388 · nhiên liệu BG 2.176.405,116 · BP 2.226.068,960 · BQ 2.232.042,568 lít.
- Đối soát với Excel (`DOISOAT_report.md`): m³, tấn (total/final/survey), BG/BP/BQ khớp 9.840/9.840 ở 1e-6; T.km total 9.840/9.840, `final_tkm` 9.829 (11 dòng ≤ 5e-5 do Excel làm tròn 4 chữ số); năng suất 8.532 khớp + 1.308 `#N/A`.
