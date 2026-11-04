# Giai đoạn B — KIỂM KÊ nguồn cho hệ số / lưới / tỷ trọng / STD / Kỳ (CHƯA NẠP gì)

Chỉ đọc. Đường dẫn `reports/…`, `work/…` tính từ `$XL` = `C:/Users/HOME/AppData/Local/Temp/claude/D--Coding-DU-AN-AI-Software-Factory/b02fa6c3-57ff-4341-ad12-f4da46fe2ce1/scratchpad/xl/`.
Tài liệu repo: `ThongKe/docs/BAO_CAO_TONG_HOP_LOGIC.md` (§B khoá lưới, §C.4 hằng số), `FACTORY_CONTEXT.md` (lượt 29d, 30, 30b: cách khách đã nạp lưới/hệ số lên server thật), `backend/seed-matrix-catalogs.sql`, `backend/seed-he-so.sql`.
Danh mục giai đoạn A đã có (id trong `load/id_maps.json`): 9 chủng loại xe, 9 lớp NL (`CAT773E, CAT777, CAT777D, CAT777E, HD465-7R, HD785-7, ScaniaP340, VOLVOA40F, VOLVOA40G`), 5 hạng, 29 loại hàng `CLH-001..029`.

## 0. Bảng tóm tắt

| Mục | Nguồn dữ liệu tốt nhất | Đủ? | Thiếu / mâu thuẫn chính |
|---|---|---|---|
| 4 định nghĩa lưới (`matrix_definitions`) | `backend/seed-matrix-catalogs.sql` (SQL) | ĐỦ | cần chạy SQL trước (DB đang 0 dòng) |
| HS.THAN.TRUDA | docs 0,985 | **MÂU THUẪN** | dữ liệu T9 ngụ ý 0,8938 |
| HS.BUN | docs/server thật 0,1; cache T9 xác nhận | ĐỦ | — |
| Tỷ trọng | `VT69_NLTH_ty_trong_theo_chungloaihang.csv` + cache `TyTrongKoQA` | ĐỦ cho 29 loại hàng | cần quyết hiệu lực & khu vực |
| MO_HINH | `VT69_NLTH_luoi_MO_HINH.csv` | ĐỦ (110/110 tổ hợp T9) | 2 ô xung đột nhỏ (Dthai.) |
| DMNL | `TD_CC_DMNL_o_luoi_tu_tinhtoan.csv` (5.631 ô) / sheet Excel `DMNL T2-2025` | **MỘT PHẦN** | thiếu ô lân cận cho nội suy; chưa có bản đầy đủ trong `reports/` |
| NANG_SUAT_XE | `TD_CC_NS_XE_3305_nang_suat_xe_theo_cungdo.csv` (80×27) | **THIẾU 2 loại xe** | CAT777 (hạng A) và VOLVOA40-GCoi không có cột |
| HS_DIEU_CHINH_NLDM | `TD_CC_luoi_HS_NLDM_thang1-9_tu_tinhtoan.csv` | ĐỦ cho T9.CS (15/15 khoá) | KC trống (không có KC) |
| STD | `TD_AP_TDIA_T9_theo_khoa.csv` (667 khoá) | **MỘT PHẦN** | khoá Excel ≠ khoá TK; không có STD(SPNT) trong TK |
| Kỳ báo cáo | cột 54 `tinh toan` (5 kỳ) | ĐỦ để quyết | nhãn kỳ sai tháng; ngày 1–2/9 không có dữ liệu |

## 1. Định nghĩa 4 lưới (SQL)
`backend/seed-matrix-catalogs.sql` INSERT `MO_HINH, DMNL, NANG_SUAT_XE, HS_DIEU_CHINH_NLDM` (id 1–4) + `setval('matrix_definition_seq')`. DB hiện `matrix_definitions` = 0 dòng; `GET /matrix-catalogs` = `[]`. Sau đó mới `POST /matrix-catalogs/{code}/versions` → rows/cols → `PUT cells`. Cả 3 lưới nhiên liệu phải có phiên bản hiệu lực tại ngày đầu kỳ (kể cả `tkeMode=true`).

## 2. HS.THAN.TRUDA — MÂU THUẪN, cần chủ dự án chốt
- Docs: `BAO_CAO_TONG_HOP_LOGIC.md` §C.4 và `RA_SOAT_COT_BAO_CAO_THONGKE.md` dòng 87 ghi **0,985** (ô Excel `$AM$3`, "có sẵn từ trước"); `FACTORY_CONTEXT.md` lượt 30: server thật nạp `HS.THAN.TRUDA=0,985` "theo docs" (không đọc từ T9). `seed-he-so.sql` KHÔNG có mã này (chỉ HS.BUN + HS.DATHAI.*).
- Dữ liệu T9 (`work/RP_than_real.tsv`, cột 25/26/29/30): **559 dòng `Than_SX`** (`NKSXLĐ`, nhóm `THANV`; 81.116,5 m³; 2.494 chuyến): `Tổng KLVC (tấn)` = m³ × tỷ trọng × **0,8938** ở cả 559/559 dòng (Σ tấn 87.441,2; TĐ 87.121). Nếu engine TK nhân HS=0,985 sẽ ra ≈ 96.359 tấn (+10,2% so với Excel) → để khớp Excel cần HS ≈ **0,8938** (hoặc hiểu hệ số này gồm thêm một bước khác trong Excel). Chưa tìm được công thức gốc trong `reports/` (xem `work/RP_formula_than.txt`, `work/RP_coal.txt`).
- Hành động: hỏi chủ dự án giá trị cần dùng; engine ném lỗi ngay chuyến đầu nếu thiếu mã khi có `Than_SX`.

## 3. HS.BUN — ĐỦ
- `seed-he-so.sql`: =0 ("chưa có số thật"). `FACTORY_CONTEXT.md` lượt 30: server thật **HS.BUN = 0,1**, "giá trị THẬT đọc từ Excel `$BN$2`".
- Kiểm trên cache T9 (`work/RP_than_cache.tsv`, trường `BSNL_Bun (xe)`): 3 dòng `B.TRON` đầu: BSNL_Bun/NL tiêu hao theo ĐM = 8,00775/80,0775 = **0,1000**. Nhất quán 0,1.
- Chỉ áp cho hàng có tên bắt đầu `B.Duot/B.Loang/DBChan/B.Chan/B.Tron/DBTron` và xe ≠ HM400-2R (T9 có `B.TRON` 1.084, `DBTron` 1.084, `B.chan` 399, `DBChan` 399, `B.TRON.CN` 20, `DBTron.CN` 20).
- Các mã `HS.DATHAI.*` (engine chưa đọc): `M3.CS` 2,617 · `M3.KC` 2,625 · `TYLE.CS` 0,10018505 (đọc thật từ Excel, lượt 30) · `TYLE.KC.CS`, `TYLE.KHAC` = 0 — không cần cho T9.

## 4. Tỷ trọng (`density-parameters`)
- Nguồn: `reports/VT69_NLTH_ty_trong_theo_chungloaihang.csv` (29 loại hàng, mỗi loại đúng 1 giá trị cả tháng), `reports/RP_TT_distinct_ty_trong.csv` (17 giá trị khác nhau). Giá trị: Nomin./Nomin.CN/DBTron/DBChan/DaBunKe 2,617 · B.TRON/B.chan 2,61 · D.UOT 2,641 · Dthai. 2,257 · SPNT.VIA 2,282 · SPNT.BaiChua 1,408 · NKSXLĐ(_CN) 1,206 · NKQS.ST 1,104 · XitLoại(Tu SPNT) 1,661 · XitLoai(…)-MayTo 1,477 · ĐĐLT 1,362 · BaSangNK 1,278 · Cám4a.1 0,982 · Cám7b 1,206 · Cám7c 1,237 · Cám8a 1,308 · NKCụcNhatTay 1,05 · Đá CB Than Sạch 1,452.
- **Tỷ trọng không quy ẩm (`densityDry`, BẮT BUỘC của API)**: có trong cache đầy đủ `work/RP_than_cache.tsv` trường `TyTrongKoQA` (cột 80 0-based), 1 giá trị/loại hàng (vd Nomin. 2,617; Dthai. 2,268; SPNT.BaiChua 1,379; NKSXLĐ 1,183; ĐĐLT 1,342; XitLoại 1,705). Chưa xuất thành CSV riêng.
- Còn lại: khu vực — T9 chỉ có CS (TD_00 §1.5) → 1 dòng/loại hàng với `excavationAreaId=null`; hiệu lực 2026-09-01..2026-09-30 (hoặc cả năm như server thật: 2026-01-01..12-31); 29 dòng. Cache đầy đủ có thêm `DaXit.NK` ×559 (2,617) không nằm trong 24.368 dòng "thật" — bỏ qua. Thể trọng sau trắc địa (`TheTrong_TĐ`, cột 22, vd SPNT.VIA 2,296) thuộc STD, không phải tỷ trọng.

## 5. MO_HINH (m³/chuyến)
- `reports/VT69_NLTH_luoi_MO_HINH.csv`: 29 loại hàng × 9 cột `<chủng loại xe>.CS` (đúng định dạng khoá `<vehicleType.code>.<CS|KC>`), 110 ô. Kiểm: **110/110 tổ hợp (loại hàng × chủng loại xe) xuất hiện trong `tinh toan` T9 đều có ô** (không thiếu). Cột `.KC` không có dữ liệu (không có KC).
- Khoá HÀNG của TK là `cargoType.code` (`CLH-001…`), không phải tên → đổi tên→mã bằng `id_maps.json › cargoTypeCodes`/`plan`. Cột = đúng tên vehicleType đã nạp.
- Xung đột: `reports/VT69_NLTH_luoi_MO_HINH_xungdot.csv` — `Dthai. × CAT777D.CS` = 42,4 (1.167 chuyến) vs 28,267 (2 chuyến); `Dthai. × HD785-7.CS` = 40,1 vs 26,733 → chọn giá trị đa số 42,4 / 40,1 (2–1 chuyến ngoại lệ do dòng tách/gộp).
- Nguồn đối chiếu thêm: `RP_TT_distinct_mo_hinh.csv`; `KT_mohinh_theo_loaixe_loaihang.csv`; `VT69_VT6_MH_CS_raw.csv`/`MH_KC_raw.csv` (VT6); Excel sheet `Mohinh_TheTrong( ko dk xoa)` (đã nạp lên server thật lượt 30 dưới dạng `model_periods`, engine không đọc `model_periods` — phải nạp vào LƯỚI MO_HINH).
- Hàng trộn: B.TRON 11,1 + DBTron 22,2 = 33,3 m³/chuyến (CAT777).

## 6. DMNL (định mức nhiên liệu)
- Có: `reports/TD_CC_DMNL_o_luoi_tu_tinhtoan.csv` — 5.631 ô rút từ cache `tinh toan` (22 cột gốc: `<lớp NL>.<BK|DAT|Than>` × cung độ × nâng tải m, định mức L/1000Tkm; 0 ô mâu thuẫn). Đủ 14/14 gốc cột mà T9 thực dùng (`CAT777D/E/..DAT`, `HD465-7R.Than`, `ScaniaP340.Than`, `VOLVOA40F/G.Than` …); `ScaniaP340` không có `.BK`; không có hậu tố `.Bun`.
- Thiếu: chỉ là các ô **đã bị chạm** (T9 dùng 252 cung độ × 117 mức nâng tải); engine nội suy song tuyến (`Hb/Ha/h1/h2/Nb/Na`) cần ô lân cận → cần bản lưới ĐẦY ĐỦ. Bản đầy đủ: sheet `DMNL T2-2025` của `D:/EcoTel/3. Dự án/TKV Công ty than Cao sơn/Phần mềm thống kê/Dữ liệu/Tháng 5 đổi tên xe.xlsx` (190 MB, 28 độ dốc × 960 cột = 26.880 ô, khách đã nạp lượt 29d lên server thật; khoá cột dấu chấm thập phân, hàng `numeric_row_axis=true`). Ngoài ra `VT69_VT9_DMNL_dat/BT_datbt/than/dat91/datbt91/dat98/datbt98.csv` (8 ma trận nâng tải×cung độ riêng của VT9, trường `ĐMNL_xe (QD 1828_25/02/2025)`).
- Câu hỏi: dùng QĐ nào (T2-2025 hay 1828/2025)? Đơn vị? (câu hỏi 7 của `VT69_00_TONG_QUAN.md`).

## 7. NANG_SUAT_XE
- Có: `reports/TD_CC_NS_XE_3305_nang_suat_xe_theo_cungdo.csv` (80 dòng cung độ × 27 cột; tên cột ở dòng thứ 2: `CAT773E.DAT/THAN`, `CAT777E.DAT/THAN`, `CAT777D.DAT/THAN`, `VOLVOA40-F.DAT/THAN`, `HD465-7R.DAT/THAN`, `HD785-7.DAT/Than`, `ScaniaP340.DAT/THAN`, `HM400-2R…`, `HD325-7Rcoi…` …) — đúng sheet `NS XE (3305( ko dk xoa))` mà khách đã nạp (2.160 ô). Cột T9 cần (14): CAT773E.DAT/Than, CAT777D.DAT, CAT777E.DAT, CAT777.DAT, HD465-7R.DAT/Than, HD785-7.DAT, ScaniaP340.DAT/Than, VOLVOA40-F.DAT/Than, VOLVOA40-GCoi.DAT/Than.
- **Thiếu**: không có cột `CAT777.DAT` (CAT777 hạng A, 15 xe, 2.578 dòng/9.113 chuyến) và `VOLVOA40-GCoi.DAT/Than` (3 xe, 583 dòng/3.674 chuyến). Bản `reports/VT69_NLTH_luoi_NANG_SUAT_XE.csv` (119 dòng 0,1…12,2 × 12 cột dạng `<lớp>_<hạng>|DAT|Than`, 743 ô) cũng không có hai loại này và có 2 cột `HD785-7_B|DAT` vs `HD785-7_C|DAT` (TK chỉ có 1 cột `HD785-7.DAT`) → cần quyết định gộp. Cache có trường "Định mức năng suất" theo dòng → có thể suy lại 2 cột thiếu (cần phân tích thêm).

## 8. HS_DIEU_CHINH_NLDM
- Có: `reports/TD_CC_luoi_HS_NLDM_thang1-9_tu_tinhtoan.csv` (17 hàng `<lớp>_<hạng>_<DAT|Than>` × `T1..T9` × CS/KC; 140 ô có giá trị; KC toàn trống). T9 cần đúng **15 khoá hàng**, cả 15 có giá trị ở cột `T9.CS`: `HD465-7R_C_DAT=1,02`, tất cả khoá còn lại `=1`. Hai hàng `CAT777E_B_DAT`, `HD785-7_A_DAT` không có giá trị (không dùng ở T9). Các tháng đầu có giá trị khác 1 (0,97/0,95/0,94/…): chỉ cần `T9.CS`.
- `reports/VT69_NLTH_luoi_HS_DIEU_CHINH_NLDM.csv` (15 hàng, cột `CS`) trùng bộ T9. `TD_CC_luoi_HSDML_thang1-9_tu_tinhtoan.csv` (trường `HSDML`) toàn 1 — không dùng.
- Lưu ý: engine tra theo **tháng của ngày sản xuất** (`T9.CS`) và hàng dùng **chữ đầu của hạng** (`C`, không phải `C2`). Server thật hiện để 339 ô = 1,0 TẠM.

## 9. STD (số trắc địa) và Áp Trắc Địa
- Có: `reports/TD_AP_TDIA_T9_theo_khoa.csv` — **667 khoá** `Nhóm vỉa + Máy xúc` (dạng Excel `10.PA.PCMB.S+90_-165_p18._CS`, kèm các cột tách: nhóm vỉa, nhóm tầng, máy xúc, ký hiệu bùn, phân loại DAT/Than, SP nghiệm thu) với số thống kê, số TĐ (m³, tấn, Tkm) và HS = TĐ/thống kê; `reports/VT69_NLTH_HSTD_theo_nhomvia_tang_mayxuc.csv` (283 dòng); thể trọng TĐ từng dòng trong `tinh toan` (cột 22; vd SPNT.VIA 2,296). Tổng đối chiếu: TĐ m³ 3.118.525,2; Tkm TĐ 34.389.001,6 (`TD_00_TONG_QUAN.md` §4).
- Thiếu/vướng: (1) khoá Excel ≠ khoá TK (TK ghép `seamGroup.code` _ `receiving_floor_group` _ `excavator.code` _ [mudMark] _ `area.code` _ hậu tố `BK/SPNT/2,25/dthai`; mã nhóm vỉa của ta là `NV-<slug>`, 20 nơi nhận không có nhóm vỉa) → làm theo §4.4 hợp đồng: sau khi duyệt xong, `calculate?tkeMode=true` lấy `survey-coefficients` rồi nối với file TD theo (nhóm vỉa, nhóm tầng, máy xúc, bùn, SPNT); (2) mỗi khoá phải điền cả khối Đất lẫn Than, `catalogType` `DAT_CN` chỉ khi SPNT=Dat_CN; (3) `STD(SPNT)` (2,296) không có trong thiết kế TK; (4) STD bắt buộc chỉ cho `tkeMode=false`; `tkeMode=true` không cần. Server thật đang chỉ có 4 dòng STD "DEMO".

## 10. Kỳ báo cáo
- Cột 54 `TachGiaiDoanGiaDau` của `tinh toan` T9: **5 kỳ** nhưng nhãn đề sai tháng ("Kỳ 1, 1/6 đến 4/6"…): Kỳ 1 ngày **3–4**, Kỳ 2 **5–11**, Kỳ 3 **12–18**, Kỳ 4 **19–25**, Kỳ 5 **26–30** (dữ liệu chỉ có ngày 3–30; không có 1–2/9, KT cũng vậy; khoảng trống 14/9–18/9).
- TK: `calculatePeriod` đòi tháng KHÔNG HỞ (mọi ngày 1–30/9 thuộc một kỳ) → đề xuất `POST /report-periods/bulk` 5 kỳ: 1–4, 5–11, 12–18, 19–25, 26–30 (khác `generate` mặc định 1/8/15/22/29, quyết định ảnh hưởng STD "theo ngày đầu kỳ"). Tạo kỳ SAU khi duyệt đối chiếu xong; không mở màn Báo cáo (`GET /report-periods/by-month` tự tạo 1 kỳ cả tháng). Chốt kỳ (`lock`) và mở khoá cần quyền `a`.

## 11. Thứ tự đề xuất giai đoạn B
(1) SQL 4 định nghĩa lưới → (2) hệ số (`HS.BUN`=0,1, `HS.THAN.TRUDA` chờ chốt) → (3) tỷ trọng 29 dòng (wet/dry) → (4) MO_HINH → (5) HS_DIEU_CHINH (T9.CS) → (6) DMNL + NANG_SUAT_XE (cần bản đầy đủ + 2 cột thiếu) → (7) phiếu + đối chiếu duyệt → (8) kỳ → (9) `calculate?tkeMode=true` → lấy khoá → STD → `tkeMode=false`.
Câu hỏi chặn: giá trị HS.THAN.TRUDA; bản DMNL (QĐ) & nguồn đầy đủ; cột Năng suất xe cho CAT777 và VOLVOA40-GCoi; cách chia kỳ.
