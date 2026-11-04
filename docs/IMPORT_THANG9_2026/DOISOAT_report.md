# DOISOAT_report — Đối soát kết quả TÍNH (engine Thống kê, TKE) với Excel `tinh toan` tháng 9/2026

Cập nhật lần 3: 2026-11-04 ≈ 01:50, sau khi (a) đặt `HS.THAN.TRUDA` = 0,893840, (b) backend có cột P / tên hàng / FlushMode / phương án A (KLVC cuối than = tỷ trọng × HS than ở TKE), (c) sửa mức tải Roda (§10). Chỉ ĐỌC trừ các việc được giao (PUT hệ số than, calculate, sửa mức tải 3 cặp qua API). Kỳ id=1, `tkeMode=true&onlyApproved=true`: 9.840 dòng chuyến VT đã duyệt = 46.045 chuyến; 14.528 dòng chưa duyệt không nằm trong số liệu.
`$XL/load/` = `C:/Users/HOME/AppData/Local/Temp/claude/D--Coding-DU-AN-AI-Software-Factory/b02fa6c3-57ff-4341-ad12-f4da46fe2ce1/scratchpad/xl/load/`. Không có họ tên/số thẻ trong báo cáo.

## 0. KẾT LUẬN (đọc phần này trước)

**Engine KHỚP Excel trên cả 9.840 dòng đã duyệt về m³, tấn (total/final/survey), ĐMNL, nhiên liệu BG/BP/BQ và năng suất. Không còn dòng nào lệch ngoài dung sai 1e-6, trừ 11 dòng `final_tkm` chênh ≤ 5e-5 T.km do Excel làm tròn T.km 4 chữ số (xem §4).** Năng suất: 8.532 dòng khớp tuyệt đối + 1.308 dòng engine để trống ↔ Excel `#N/A` (thiếu cột CAT777.DAT / VOLVOA40-GCoi, chờ chủ dự án).

| # | Chỉ tiêu (khớp ≤ 1e-6 / 9.840 dòng) | Lần 1 (HS 0,8938, chưa cột P) | Lần 2 (HS 0,89384, có cột P) | **Lần 3 (hiện tại)** |
|---|---|---|---|---|
| 1 | Ghép chuyến DB ↔ dòng nguồn | 24.368/24.368; đã duyệt 9.840/9.840 | không đổi | không đổi |
| 2 | `density_used`, `model_used`, `total_m3`, `survey_m3` | 9.840 | 9.840 | **9.840** |
| 3 | `total_ton` ↔ AM | 9.522 | 9.840 | **9.840** (lệch lớn nhất 1,07e-7) |
| 4 | `final_ton`, `survey_ton` ↔ AM | — | 9.522 (Than_SX 0/318: không nhân HS) | **9.840** (phương án A) |
| 5 | `total_tkm` ↔ AN | 9.522 | 9.840 | **9.840** (lệch lớn nhất 8,28e-7) |
| 6 | `final_tkm`, `survey_tkm` ↔ AN | — | 9.511 | **9.829** (11 dòng ≤ 5e-5 T.km, làm tròn) |
| 7 | `fuel_norm` (BF) | 9.822 | 9.840 | **9.840** |
| 8 | `fuel_base_consumption` (BG) | 9.504 | 9.840 | **9.840** |
| 9 | `fuel_total_before_adjustment` (BP) | 9.501 | 9.837 (3 dòng Roda) | **9.840** |
| 10 | `fuel_current_norm` (BQ) | 9.501 | 9.837 | **9.840** |
| 11 | `productivity_norm` (BR) | 8.532 + 1.308 `#N/A` | như lần 1 | **8.532 + 1.308 `#N/A`** |
| 12 | Σ tấn `total_ton`: engine − Excel | −2,467 | +0,006 | **+0,006** |
| 13 | Σ tấn `final_ton` − Σ `total_ton` | +6.566 | +6.563,5 | **0,000** |
| 14 | Σ T.km `final_tkm` − `total_tkm` | +25.622 | +25.612,4 | **−0,087** (làm tròn) |
| 15 | Σ BQ: engine − Excel (lít) | −14,2 | +21,4 | **+0,004** |

**Tổng mới (lần 3) so với Excel, cùng 9.840 dòng:**

| Chỉ tiêu | Engine | Excel | Δ |
|---|---|---|---|
| Σ m³ (`total_m3` = `survey_m3`) | 1.335.612,300 | 1.335.612,300 | 0,000 |
| Σ tấn `total_ton` (AM) | 3.348.878,737 | 3.348.878,731 | +0,006 |
| Σ tấn `final_ton` = `survey_ton` | 3.348.878,737 | 3.348.878,731 | +0,006 |
| Σ T.km `total_tkm` (AN) | 17.109.154,475 | 17.109.154,455 | +0,021 |
| Σ T.km `final_tkm` = `survey_tkm` | 17.109.154,388 | 17.109.154,455 | −0,066 |
| Σ nhiên liệu theo ĐM BG (lít) | 2.176.405,116 | 2.176.405,112 | +0,003 |
| Σ nhiên liệu trước điều chỉnh BP (lít) | 2.226.068,960 | 2.226.068,957 | +0,004 |
| Σ nhiên liệu hiện hành BQ (lít) | 2.232.042,568 | 2.232.042,565 | +0,004 |

Lần tính 3: HTTP 200 sau 44,5 s, `tripCount` 9.840, `excludedTripCount` 14.528, `coefficientRowCount` 744, 2 cảnh báo (1.308 lượt tra thiếu ô năng suất `[… × CAT777.DAT]` / kỳ chỉ tính phần đã duyệt). Backup: `$SP/backup/tk_after_calc3_20261104_0144.dump`. Kỳ vẫn `locked=false, stale=false`; hệ số `HS.THAN.TRUDA` = 0,893840 (chủ dự án chốt theo Excel 0,8938399).

## 1. Ánh xạ chuyến DB ↔ dòng nguồn (không đổi, id chuyến giữ nguyên qua các lần tính và sau khi sửa Roda)

Phương pháp (`stB_ds_map.js`): `payload_transport_*.json` mang `_src.row` = số thứ tự dòng 1-based trong `RP_than_real.tsv` (24.368 dòng thật `tinh toan`). Với từng phiếu (ngày, ca, xe, số thẻ) lấy các chuyến DB theo `id` tăng dần và chuyến payload theo thứ tự; **xác minh 13 trường** của từng cặp (máy xúc, tầng nhận, nơi chất, tầng dỡ, nơi dỡ, loại hàng, số chuyến, cung độ, nâng tải, dốc cục bộ km/m, mức tải). Dự phòng: khoá đầy đủ (ngày, ca, xe, máy xúc, tầng nhận, nơi chất, tầng dỡ, nơi dỡ, loại hàng, số chuyến, cung độ) theo thứ tự xuất hiện — không phải dùng đến. (Sau khi sửa mức tải 3 chuyến sang `OTHER 2/3` bản đồ id vẫn đúng; bước xác minh mức tải chỉ khác ở 3 chuyến đó.)

| Chỉ số | Giá trị |
|---|---|
| Chuyến DB / phiếu | 24.368 / 9.924 (payload: 24.368 / 9.924, trùng) |
| Ghép được (theo phiếu + thứ tự, qua xác minh trường) | **24.368 (100%)**; dự phòng khoá đầy đủ: 0 |
| Đã duyệt ghép được | **9.840/9.840** |
| Dòng không ghép / lý do | 0 |
| Dòng nguồn bị ghép hai lần / không dùng | 0 / 0 |
| Cache 172 trường ↔ `real.tsv` | cùng thứ tự, 0/24.368 dòng lệch (14 trường khoá) → dùng chỉ số dòng để lấy trường nhiên liệu |

## 2. Sản lượng: 9.840 dòng đã duyệt (dung sai: |engine − Excel| ≤ 1e-6 × max(1, |Excel|))

| Chỉ tiêu (engine ↔ cột Excel) | Khớp ≤ 1e-6 | Lệch > 1e-6 | Lệch lớn nhất | Σ engine | Σ Excel |
|---|---|---|---|---|---|
| `density_used` ↔ Tỷ trọng (tấn/m3) | 9.840 | 0 | 0 | — | — |
| `model_used` ↔ Mô hình (m3/ch) | 9.840 | 0 | 0 | — | — |
| `total_m3`, `survey_m3` ↔ Tổng m3 (AL) | 9.840 | 0 | 0 | 1.335.612,300 | 1.335.612,300 |
| `total_ton`, `final_ton`, `survey_ton` ↔ Tổng KLVC (tấn) (AM) | **9.840** | 0 | 1,07e-7 | 3.348.878,737 | 3.348.878,731 |
| `total_tkm` ↔ Tổng Tkm (AN) | **9.840** | 0 | 8,28e-7 | 17.109.154,475 | 17.109.154,455 |
| `final_tkm`, `survey_tkm` ↔ Tổng Tkm (AN) | 9.829 | 11 | 1,85e-6 | 17.109.154,388 | 17.109.154,455 |

Theo sản phẩm nghiệm thu, `total_ton` = `final_ton` = `survey_ton` khớp AM trên mọi dòng: Dat_SX 9.077/9.077 (3.186.370,77), Dat_CN 373/373 (75.184,12), **Than_SX 318/318 (55.263,26)**, Than_CN 72/72 (32.060,58). Các cột phụ khớp 9.840/9.840: `density_original`, `density_no_moisture`, `total_m3_original`, `total_ton_no_moisture`, `total_tkm_no_moisture`; `bulk_density_used` ↔ Tỷ trọng. Cột Excel dùng là AL/AM/AN (chưa áp trắc địa, AM đã nhân hệ số than và trừ vơi/đá thải). Không còn dòng lệch tấn: `DOISOAT_lech_sanluong.csv` chỉ còn dòng tiêu đề (bản lần 1, 318 dòng: `DOISOAT_lech_sanluong_truoc.csv`).

## 3. Nhiên liệu và năng suất (trường Excel xác định bằng so khớp số liệu trên 9.840 dòng)

| Chỉ tiêu engine | Trường Excel (cache `tinh toan`) | Khớp | Lệch | Σ engine | Σ Excel |
|---|---|---|---|---|---|
| `fuel_norm` (BF) | `ĐMNL_xe (Đ/C tháng)` | 9.840 | 0 | — | — |
| `fuel_base_consumption` (BG) | `NhienLieu_TieuHaoTheoĐM (lit)` | 9.840 | 0 | 2.176.405,116 | 2.176.405,112 |
| `fuel_total_before_adjustment` (BP) | `ĐMNL_xe (QD 1828_25/02/2025)-SoTke` | 9.840 | 0 | 2.226.068,960 | 2.226.068,957 |
| `fuel_current_norm` (BQ) | `NLDM HienHanh_SoTke` | 9.840 | 0 | 2.232.042,568 | 2.232.042,565 |
| `productivity_norm` (BR) | `Định mức năng suất Xe tải (ch/ca)` | 8.532 | 0 | Σ 85.850 | Σ 85.850 |

`productivity_norm` null ở 1.308 dòng (CAT777 hạng A 1.198, VOLVOA40-GCoi 110) ↔ Excel `#N/A` — đúng (thiếu 3 cột năng suất trong lưới, `STAGEB_report.md` §3). `DOISOAT_lech_nhienlieu.csv`: 0 dòng lệch. Từng nguyên nhân lệch ở các lần trước đã hết:

| Nguyên nhân | Số dòng | Lần 1 (BQ, lít) | Lần 2 | Lần 3 |
|---|---|---|---|---|
| Hệ số than 0,8938 → 0,893840 | 318 | −1,657 | +0,004 | +0,004 (làm tròn) |
| Cột P "Chênh cao thanh toán NL" (dốc cục bộ) | 18 | −33,977 | 0,000 | 0,000 |
| Phụ cấp Roda với ô số 0,667 | 3 | +21,404 | +21,404 | **0,000** (đã sửa dữ liệu, §10) |
| **Tổng BQ (9.840 dòng)** | 9.840 | −14,2 | +21,4 | **+0,004** |

## 4. Tổng hợp engine vs Excel — cùng 9.840 dòng đã duyệt (m³, tấn, T.km của `total_*` ↔ AL/AM/AN)

Tổng: **m³ 1.335.612,3 = 1.335.612,3 · tấn 3.348.878,74 vs 3.348.878,73 (+0,006) · T.km 17.109.154,48 vs 17.109.154,45 (+0,021)**. Tất cả các bảng theo ngày/nhóm hàng/PX/sản phẩm dưới đây có Δ tấn và Δ T.km ≈ 0 (≤ 0,1; làm tròn). 11 dòng `final_tkm` lệch ≤ 5e-5 T.km (6 `Dat_CN`, 5 `Than_CN`, T.km nhỏ 27–45): Excel AN = ROUND(AM×L, 4) còn engine `final_tkm` giữ 5–6 chữ số thập phân; Σ `final_tkm` − `total_tkm` = −0,087 T.km.


### Theo ngày
| nhóm | dòng | chuyến | m³ engine | m³ Excel | tấn engine | tấn Excel | Δ tấn | Tkm engine | Tkm Excel | Δ Tkm |
| 03 | 291 | 1518 | 48,338.7 | 48,338.7 | 121,637.9 | 121,637.9 | 0.000 | 542,555.3 | 542,555.3 | 0.000 |
| 04 | 356 | 1702 | 52,719.8 | 52,719.8 | 131,489.4 | 131,489.4 | 0.000 | 579,055.5 | 579,055.5 | 0.001 |
| 05 | 380 | 1855 | 54,613.1 | 54,613.1 | 137,570.0 | 137,570.0 | 0.000 | 631,049.1 | 631,049.1 | 0.000 |
| 06 | 415 | 1699 | 49,125.9 | 49,125.9 | 121,659.0 | 121,659.0 | 0.000 | 686,454.9 | 686,454.9 | 0.001 |
| 07 | 491 | 2142 | 55,774.1 | 55,774.1 | 140,734.9 | 140,734.9 | 0.000 | 738,611.4 | 738,611.4 | 0.001 |
| 08 | 374 | 1622 | 47,639.8 | 47,639.8 | 120,792.1 | 120,792.1 | 0.000 | 630,497.4 | 630,497.4 | 0.001 |
| 09 | 456 | 2206 | 62,917.9 | 62,917.9 | 159,647.4 | 159,647.4 | 0.000 | 796,930.0 | 796,930.0 | 0.001 |
| 10 | 343 | 1829 | 55,203.3 | 55,203.3 | 137,677.3 | 137,677.3 | 0.000 | 700,141.0 | 700,141.0 | 0.002 |
| 11 | 476 | 2205 | 60,743.7 | 60,743.7 | 152,747.1 | 152,747.1 | 0.000 | 797,583.5 | 797,583.5 | 0.001 |
| 12 | 532 | 2241 | 63,196.5 | 63,196.5 | 160,699.7 | 160,699.7 | 0.000 | 805,909.1 | 805,909.1 | 0.001 |
| 13 | 424 | 1896 | 54,214.4 | 54,214.4 | 134,711.4 | 134,711.4 | 0.000 | 737,583.6 | 737,583.6 | 0.002 |
| 14 | 112 | 141 | 4,142.4 | 4,142.4 | 10,450.9 | 10,450.9 | 0.000 | 75,322.6 | 75,322.6 | 0.000 |
| 15 | 206 | 1009 | 31,320.3 | 31,320.3 | 78,472.2 | 78,472.2 | 0.000 | 553,147.3 | 553,147.3 | 0.001 |
| 16 | 121 | 520 | 16,268.0 | 16,268.0 | 41,192.9 | 41,192.9 | 0.000 | 201,570.7 | 201,570.7 | 0.000 |
| 17 | 59 | 203 | 5,675.3 | 5,675.3 | 12,962.7 | 12,962.7 | 0.000 | 64,831.1 | 64,831.1 | 0.000 |
| 18 | 235 | 1197 | 35,654.6 | 35,654.6 | 84,954.0 | 84,954.0 | 0.000 | 487,380.7 | 487,380.7 | 0.001 |
| 19 | 355 | 2068 | 60,858.3 | 60,858.3 | 149,705.2 | 149,705.2 | 0.000 | 755,277.8 | 755,277.8 | 0.001 |
| 20 | 456 | 2020 | 51,964.7 | 51,964.7 | 129,293.1 | 129,293.1 | 0.000 | 718,675.6 | 718,675.6 | 0.001 |
| 21 | 380 | 1693 | 45,516.0 | 45,516.0 | 117,311.0 | 117,311.0 | 0.000 | 620,403.9 | 620,403.9 | 0.000 |
| 22 | 371 | 1696 | 46,652.3 | 46,652.3 | 116,756.1 | 116,756.1 | 0.000 | 618,604.4 | 618,604.4 | 0.001 |
| 23 | 464 | 2078 | 63,151.0 | 63,151.0 | 160,969.0 | 160,969.0 | 0.000 | 751,552.9 | 751,552.9 | 0.001 |
| 24 | 390 | 1877 | 59,659.3 | 59,659.3 | 150,545.3 | 150,545.3 | 0.000 | 663,290.5 | 663,290.5 | 0.000 |
| 25 | 298 | 1898 | 59,428.7 | 59,428.7 | 143,663.5 | 143,663.5 | 0.000 | 645,778.7 | 645,778.7 | 0.001 |
| 26 | 323 | 1793 | 55,123.0 | 55,123.0 | 136,361.5 | 136,361.5 | 0.000 | 690,160.0 | 690,160.0 | 0.000 |
| 27 | 385 | 1632 | 47,087.5 | 47,087.5 | 119,199.7 | 119,199.7 | 0.000 | 628,205.2 | 628,205.2 | 0.001 |
| 28 | 399 | 1973 | 56,700.8 | 56,700.8 | 143,848.4 | 143,848.4 | 0.000 | 719,870.4 | 719,870.4 | 0.001 |
| 29 | 361 | 1550 | 45,781.7 | 45,781.7 | 114,404.5 | 114,404.5 | 0.000 | 636,699.7 | 636,699.7 | 0.000 |
| 30 | 387 | 1782 | 46,141.2 | 46,141.2 | 119,422.5 | 119,422.5 | 0.000 | 632,012.3 | 632,012.3 | 0.000 |

### Theo nhóm hàng (CargoGroup)
| nhóm | dòng | chuyến | m³ engine | m³ Excel | tấn engine | tấn Excel | Δ tấn | Tkm engine | Tkm Excel | Δ Tkm |
| D.UOT | 661 | 2425 | 78,177.3 | 78,177.3 | 206,466.2 | 206,466.2 | 0.000 | 1,204,773.2 | 1,204,773.2 | 0.000 |
| DATBU | 874 | 3093 | 36,494.3 | 36,494.3 | 95,250.1 | 95,250.1 | 0.000 | 439,093.9 | 439,093.9 | 0.000 |
| DATNK | 7098 | 35431 | 1,101,393.3 | 1,101,393.3 | 2,848,381.7 | 2,848,381.7 | 0.000 | 14,732,157.0 | 14,732,157.0 | 0.000 |
| DATPABun | 465 | 1459 | 22,687.9 | 22,687.9 | 59,374.2 | 59,374.2 | 0.000 | 262,410.1 | 262,410.1 | 0.000 |
| SPNT.VIA | 352 | 1206 | 22,823.2 | 22,823.2 | 52,082.5 | 52,082.5 | 0.000 | 219,835.3 | 219,835.3 | 0.000 |
| TCN.SPNT | 72 | 854 | 22,770.3 | 22,770.3 | 32,060.6 | 32,060.6 | 0.000 | 35,234.3 | 35,234.3 | 0.000 |
| THANV | 318 | 1577 | 51,266.0 | 51,266.0 | 55,263.3 | 55,263.3 | 0.006 | 215,650.7 | 215,650.7 | 0.021 |

### Theo PX
| nhóm | dòng | chuyến | m³ engine | m³ Excel | tấn engine | tấn Excel | Δ tấn | Tkm engine | Tkm Excel | Δ Tkm |
| VT1 | 1865 | 8504 | 272,668.4 | 272,668.4 | 698,474.1 | 698,474.1 | 0.000 | 3,707,770.8 | 3,707,770.8 | 0.001 |
| VT3 | 1914 | 7660 | 249,368.9 | 249,368.9 | 648,271.8 | 648,271.8 | 0.000 | 3,573,159.4 | 3,573,159.4 | 0.000 |
| VT4 | 1901 | 8625 | 252,661.2 | 252,661.2 | 591,664.8 | 591,664.8 | 0.002 | 2,989,178.9 | 2,989,178.9 | 0.009 |
| VT5 | 1991 | 9140 | 274,169.9 | 274,169.9 | 704,580.0 | 704,580.0 | 0.000 | 3,737,704.7 | 3,737,704.7 | 0.001 |
| VT6 | 1 | 1 | 20.5 | 20.5 | 28.9 | 28.9 | 0.000 | 43.3 | 43.3 | 0.000 |
| VT9 | 2168 | 12115 | 286,723.4 | 286,723.4 | 705,859.1 | 705,859.1 | 0.002 | 3,101,297.4 | 3,101,297.4 | 0.009 |

### Theo sản phẩm nghiệm thu
| nhóm | dòng | chuyến | m³ engine | m³ Excel | tấn engine | tấn Excel | Δ tấn | Tkm engine | Tkm Excel | Δ Tkm |
| Dat_CN | 373 | 1036 | 28,824.3 | 28,824.3 | 75,184.1 | 75,184.1 | 0.000 | 156,651.5 | 156,651.5 | 0.000 |
| Dat_SX | 9077 | 42578 | 1,232,751.7 | 1,232,751.7 | 3,186,370.8 | 3,186,370.8 | 0.000 | 16,701,618.0 | 16,701,618.0 | 0.000 |
| Than_CN | 72 | 854 | 22,770.3 | 22,770.3 | 32,060.6 | 32,060.6 | 0.000 | 35,234.3 | 35,234.3 | 0.000 |
| Than_SX | 318 | 1577 | 51,266.0 | 51,266.0 | 55,263.3 | 55,263.3 | 0.006 | 215,650.7 | 215,650.7 | 0.021 |

### Theo phân loại Đất/Than
| nhóm | dòng | chuyến | m³ engine | m³ Excel | tấn engine | tấn Excel | Δ tấn | Tkm engine | Tkm Excel | Δ Tkm |
| DAT | 9450 | 43614 | 1,261,576.0 | 1,261,576.0 | 3,261,554.9 | 3,261,554.9 | 0.000 | 16,858,269.5 | 16,858,269.5 | 0.000 |
| Than | 390 | 2431 | 74,036.3 | 74,036.3 | 87,323.8 | 87,323.8 | 0.006 | 250,885.0 | 250,885.0 | 0.021 |

### Theo chủng loại hàng
| nhóm | dòng | chuyến | m³ engine | m³ Excel | tấn engine | tấn Excel | Δ tấn | Tkm engine | Tkm Excel | Δ Tkm |
| B.chan | 258 | 692 | 10,877.4 | 10,877.4 | 28,390.0 | 28,390.0 | 0.000 | 138,589.7 | 138,589.7 | 0.000 |
| B.TRON | 604 | 2385 | 25,442.4 | 25,442.4 | 66,404.7 | 66,404.7 | 0.000 | 300,256.5 | 300,256.5 | 0.000 |
| B.TRON.CN | 12 | 16 | 174.5 | 174.5 | 455.4 | 455.4 | 0.000 | 247.6 | 247.6 | 0.000 |
| D.UOT | 660 | 2424 | 78,144.0 | 78,144.0 | 206,378.3 | 206,378.3 | -0.000 | 1,204,746.8 | 1,204,746.8 | 0.000 |
| D.UOT.CN | 1 | 1 | 33.3 | 33.3 | 87.9 | 87.9 | 0.000 | 26.4 | 26.4 | 0.000 |
| DaBunKe | 19 | 218 | 4,796.0 | 4,796.0 | 12,551.1 | 12,551.1 | 0.000 | 39,720.3 | 39,720.3 | 0.000 |
| DBChan | 258 | 692 | 5,972.8 | 5,972.8 | 15,630.8 | 15,630.8 | 0.000 | 76,277.5 | 76,277.5 | 0.000 |
| DBTron | 207 | 767 | 16,715.1 | 16,715.1 | 43,743.4 | 43,743.4 | 0.000 | 186,132.7 | 186,132.7 | 0.000 |
| Dthai. | 459 | 2552 | 93,655.2 | 93,655.2 | 211,379.8 | 211,379.8 | 0.000 | 900,717.1 | 900,717.1 | 0.000 |
| Dthai.CN | 14 | 21 | 690.7 | 690.7 | 1,558.9 | 1,558.9 | 0.000 | 2,503.3 | 2,503.3 | 0.000 |
| NKSXLĐ | 318 | 1577 | 51,266.0 | 51,266.0 | 55,263.3 | 55,263.3 | 0.006 | 215,650.7 | 215,650.7 | 0.021 |
| Nomin. | 6279 | 31860 | 979,121.6 | 979,121.6 | 2,562,361.2 | 2,562,361.2 | 0.000 | 13,675,062.4 | 13,675,062.4 | 0.000 |
| Nomin.CN | 327 | 780 | 23,129.8 | 23,129.8 | 60,530.7 | 60,530.7 | 0.000 | 114,153.9 | 114,153.9 | 0.000 |
| SPNT.BaiChua | 72 | 854 | 22,770.3 | 22,770.3 | 32,060.6 | 32,060.6 | 0.000 | 35,234.3 | 35,234.3 | 0.000 |
| SPNT.VIA | 352 | 1206 | 22,823.2 | 22,823.2 | 52,082.5 | 52,082.5 | 0.000 | 219,835.3 | 219,835.3 | 0.000 |

### Phần đã duyệt so với cả tháng theo ngày (Excel)
| ngày | dòng cả tháng | đã duyệt | m³ cả tháng | m³ duyệt | % | tấn cả tháng | tấn duyệt | % | Tkm cả tháng | Tkm duyệt | % |
| 3 | 854 | 291 | 130,429 | 48,339 | 37.1 | 307,607 | 121,638 | 39.5 | 1,289,971 | 542,555 | 42.1 |
| 4 | 957 | 356 | 131,192 | 52,720 | 40.2 | 307,144 | 131,489 | 42.8 | 1,298,223 | 579,055 | 44.6 |
| 5 | 1014 | 380 | 133,082 | 54,613 | 41.0 | 310,943 | 137,570 | 44.2 | 1,330,443 | 631,049 | 47.4 |
| 6 | 1095 | 415 | 126,375 | 49,126 | 38.9 | 295,143 | 121,659 | 41.2 | 1,490,641 | 686,455 | 46.1 |
| 7 | 1120 | 491 | 122,279 | 55,774 | 45.6 | 285,460 | 140,735 | 49.3 | 1,372,225 | 738,611 | 53.8 |
| 8 | 982 | 374 | 125,476 | 47,640 | 38.0 | 296,375 | 120,792 | 40.8 | 1,387,926 | 630,497 | 45.4 |
| 9 | 979 | 456 | 127,036 | 62,918 | 49.5 | 298,751 | 159,647 | 53.4 | 1,353,089 | 796,930 | 58.9 |
| 10 | 864 | 343 | 129,653 | 55,203 | 42.6 | 304,690 | 137,677 | 45.2 | 1,386,578 | 700,141 | 50.5 |
| 11 | 1022 | 476 | 128,527 | 60,744 | 47.3 | 303,330 | 152,747 | 50.4 | 1,430,049 | 797,583 | 55.8 |
| 12 | 1092 | 532 | 131,467 | 63,196 | 48.1 | 308,554 | 160,700 | 52.1 | 1,462,017 | 805,909 | 55.1 |
| 13 | 1064 | 424 | 128,322 | 54,214 | 42.2 | 303,711 | 134,711 | 44.4 | 1,503,134 | 737,584 | 49.1 |
| 14 | 258 | 112 | 18,572 | 4,142 | 22.3 | 31,480 | 10,451 | 33.2 | 118,131 | 75,323 | 63.8 |
| 15 | 488 | 206 | 63,343 | 31,320 | 49.4 | 148,701 | 78,472 | 52.8 | 887,197 | 553,147 | 62.3 |
| 16 | 244 | 121 | 31,027 | 16,268 | 52.4 | 70,583 | 41,193 | 58.4 | 298,825 | 201,571 | 67.5 |
| 17 | 342 | 59 | 37,783 | 5,675 | 15.0 | 80,055 | 12,963 | 16.2 | 340,793 | 64,831 | 19.0 |
| 18 | 645 | 235 | 96,528 | 35,655 | 36.9 | 218,828 | 84,954 | 38.8 | 1,083,623 | 487,381 | 45.0 |
| 19 | 901 | 355 | 137,782 | 60,858 | 44.2 | 323,168 | 149,705 | 46.3 | 1,533,389 | 755,278 | 49.3 |
| 20 | 1061 | 456 | 132,298 | 51,965 | 39.3 | 312,647 | 129,293 | 41.4 | 1,567,868 | 718,676 | 45.8 |
| 21 | 1002 | 380 | 129,987 | 45,516 | 35.0 | 302,893 | 117,311 | 38.7 | 1,446,485 | 620,404 | 42.9 |
| 22 | 972 | 371 | 127,356 | 46,652 | 36.6 | 297,630 | 116,756 | 39.2 | 1,458,026 | 618,604 | 42.4 |
| 23 | 995 | 464 | 128,577 | 63,151 | 49.1 | 299,041 | 160,969 | 53.8 | 1,342,068 | 751,553 | 56.0 |
| 24 | 822 | 390 | 107,859 | 59,659 | 55.3 | 247,748 | 150,545 | 60.8 | 1,062,961 | 663,291 | 62.4 |
| 25 | 810 | 298 | 135,505 | 59,429 | 43.9 | 311,320 | 143,663 | 46.1 | 1,348,134 | 645,779 | 47.9 |
| 26 | 853 | 323 | 131,143 | 55,123 | 42.0 | 305,899 | 136,362 | 44.6 | 1,441,652 | 690,160 | 47.9 |
| 27 | 951 | 385 | 123,398 | 47,087 | 38.2 | 289,112 | 119,200 | 41.2 | 1,358,179 | 628,205 | 46.3 |
| 28 | 981 | 399 | 129,575 | 56,701 | 43.8 | 304,499 | 143,848 | 47.2 | 1,423,672 | 719,870 | 50.6 |
| 29 | 1000 | 361 | 126,205 | 45,782 | 36.3 | 290,966 | 114,405 | 39.3 | 1,375,817 | 636,700 | 46.3 |
| 30 | 1000 | 387 | 122,105 | 46,141 | 37.8 | 286,479 | 119,422 | 41.7 | 1,356,774 | 632,012 | 46.6 |


## 5. Phần đã duyệt chiếm bao nhiêu so với cả tháng (Excel `tinh toan`, 24.368 dòng, cùng loại số chưa trắc địa)

Cả tháng (Excel): 24.368 dòng · 111.779 chuyến · **3.192.879,1 m³ · 7.442.756,2 tấn · 34.747.891,6 T.km**. Phần ĐÃ DUYỆT (= số app đang hiển thị): 9.840 dòng · 46.045 chuyến · **1.335.612,3 m³ · 3.348.878,7 tấn · 17.109.154,5 T.km** = **41,8% m³ · 45,0% tấn · 49,2% T.km**. Chưa duyệt (14.528 dòng): 1.857.266,8 m³ · 4.093.877,5 tấn · 17.638.737,2 T.km.
Phần duyệt KHÔNG đồng đều: **VT6 gần như 0%** (1/2.656 dòng; than công nghệ Scania 410.886 t), **STTT-1 và CKCĐ-1 = 0%**, `Dat_TCN` = 0%, `Than_CN` chỉ 4,6% m³; VT9 59,9% và VT1 53,3% cao nhất. Vì vậy số m³/tấn/T.km của app lệch cấu trúc, không phải co đều.


### Phần đã duyệt so với cả tháng — theo PX
| nhóm | dòng cả tháng | dòng duyệt | % dòng | chuyến cả tháng | chuyến duyệt | % chuyến | m³ cả tháng | m³ duyệt | % m³ | tấn cả tháng | tấn duyệt | % tấn | Tkm cả tháng | Tkm duyệt | % Tkm |
| VT1 | 3683 | 1865 | 50.6 | 16,077 | 8,504 | 52.9 | 512,040 | 272,668 | 53.3 | 1,310,574 | 698,474 | 53.3 | 6,789,968 | 3,707,771 | 54.6 |
| VT3 | 4263 | 1914 | 44.9 | 16,952 | 7,660 | 45.2 | 557,887 | 249,369 | 44.7 | 1,452,421 | 648,272 | 44.6 | 7,647,008 | 3,573,159 | 46.7 |
| VT4 | 5363 | 1901 | 35.4 | 24,445 | 8,625 | 35.3 | 718,597 | 252,661 | 35.2 | 1,574,862 | 591,665 | 37.6 | 7,124,845 | 2,989,179 | 42.0 |
| VT5 | 4473 | 1991 | 44.5 | 19,421 | 9,140 | 47.1 | 591,481 | 274,170 | 46.4 | 1,520,950 | 704,580 | 46.3 | 7,825,811 | 3,737,705 | 47.8 |
| VT6 | 2656 | 1 | 0.0 | 15,169 | 1 | 0.0 | 334,583 | 21 | 0.0 | 410,886 | 29 | 0.0 | 130,103 | 43 | 0.0 |
| VT9 | 3930 | 2168 | 55.2 | 19,715 | 12,115 | 61.5 | 478,290 | 286,723 | 59.9 | 1,173,063 | 705,859 | 60.2 | 5,230,157 | 3,101,297 | 59.3 |

### Phần đã duyệt so với cả tháng — theo công trường (QLY THIET BI)
| nhóm | dòng cả tháng | dòng duyệt | % dòng | chuyến cả tháng | chuyến duyệt | % chuyến | m³ cả tháng | m³ duyệt | % m³ | tấn cả tháng | tấn duyệt | % tấn | Tkm cả tháng | Tkm duyệt | % Tkm |
| CKCĐ-1 | 71 | 0 | 0.0 | 416 | 0 | 0.0 | 11,017 | 0 | 0.0 | 15,512 | 0 | 0.0 | 15,444 | 0 | 0.0 |
| KhaiThac 3. | 8552 | 4476 | 52.3 | 38,173 | 21,546 | 56.4 | 1,044,661 | 573,661 | 54.9 | 2,587,557 | 1,413,461 | 54.6 | 13,301,952 | 7,337,641 | 55.2 |
| KhaiThac1. | 9376 | 3846 | 41.0 | 41,187 | 17,118 | 41.6 | 1,262,748 | 521,047 | 41.3 | 3,159,567 | 1,315,550 | 41.6 | 14,693,787 | 6,195,397 | 42.2 |
| KhaiThac2. | 3160 | 1518 | 48.0 | 13,308 | 7,381 | 55.5 | 439,974 | 240,905 | 54.8 | 1,128,954 | 619,868 | 54.9 | 6,408,158 | 3,576,117 | 55.8 |
| STTT-1 | 3209 | 0 | 0.0 | 18,695 | 0 | 0.0 | 434,479 | 0 | 0.0 | 551,166 | 0 | 0.0 | 328,550 | 0 | 0.0 |

### Phần đã duyệt so với cả tháng — theo sản phẩm nghiệm thu
| nhóm | dòng cả tháng | dòng duyệt | % dòng | chuyến cả tháng | chuyến duyệt | % chuyến | m³ cả tháng | m³ duyệt | % m³ | tấn cả tháng | tấn duyệt | % tấn | Tkm cả tháng | Tkm duyệt | % Tkm |
| Dat_CN | 766 | 373 | 48.7 | 1,840 | 1,036 | 56.3 | 54,292 | 28,824 | 53.1 | 140,694 | 75,184 | 53.4 | 268,366 | 156,652 | 58.4 |
| Dat_SX | 19286 | 9077 | 47.1 | 84,839 | 42,578 | 50.2 | 2,518,104 | 1,232,752 | 49.0 | 6,515,447 | 3,186,371 | 48.9 | 33,668,804 | 16,701,618 | 49.6 |
| Dat_TCN | 442 | 0 | 0.0 | 2,356 | 0 | 0.0 | 49,247 | 0 | 0.0 | 80,868 | 0 | 0.0 | 139,971 | 0 | 0.0 |
| Than_CN | 3315 | 72 | 2.2 | 20,250 | 854 | 4.2 | 490,119 | 22,770 | 4.6 | 618,306 | 32,061 | 5.2 | 338,007 | 35,234 | 10.4 |
| Than_SX | 559 | 318 | 56.9 | 2,494 | 1,577 | 63.2 | 81,117 | 51,266 | 63.2 | 87,441 | 55,263 | 63.2 | 332,743 | 215,651 | 64.8 |

### Phần đã duyệt so với cả tháng — TỔNG
| nhóm | dòng cả tháng | dòng duyệt | % dòng | chuyến cả tháng | chuyến duyệt | % chuyến | m³ cả tháng | m³ duyệt | % m³ | tấn cả tháng | tấn duyệt | % tấn | Tkm cả tháng | Tkm duyệt | % Tkm |
| TỔNG | 24368 | 9840 | 40.4 | 111,779 | 46,045 | 41.2 | 3,192,879 | 1,335,612 | 41.8 | 7,442,756 | 3,348,879 | 45.0 | 34,747,892 | 17,109,154 | 49.2 |


## 6. So với các báo cáo tổng hợp trong file nguồn — KHÔNG so được ở mức tổng

- `BÁO CÁO SẢN LƯỢNG NGÀY 30 tháng 9` (sheet `VẬN CHUYỂN NỘI BỘ`, theo PXVT): tháng 9 Đất SX+SPNT 2.523.450,9 m³ / 33.763.122,9 T.km; Tổng đất SX+CN 2.576.800,0 m³ / 34.029.413,0 T.km; Than 780.875,6 t / 839.229,9 T.km. Các file khác trong thư mục báo cáo hoặc là pivot-cache của chính `tinh toan` (đã dùng làm nguồn đối soát này) hoặc là BB nghiệm thu cùng bản chất trắc địa (`RP_BB_NGHIEM_THU.md`, `RP_00_TONG_QUAN.md`); không có bản "Biểu 2A" nào so được ở mức chuyến. Lý do không so được: (1) các báo cáo này là **số NGHIỆM THU = Σ cột trắc địa `TĐ.*`** (đã kiểm ở `RP_00_TONG_QUAN.md` §1.2: trùng BB nghiệm thu đến chữ số thập phân), còn engine TKE (và cột AL/AM/AN) là số **chưa áp trắc địa**; (2) báo cáo là **cả tháng**, phần đã duyệt chỉ là tập con 40,4% dòng chọn theo kết quả khớp VT↔KT, không theo ngày/PX/công trường; (3) báo cáo gộp theo nhóm riêng (đất SX/băng tải/bãi thải/SPNT/CN, than SX/CN) với thể trọng gõ cứng, không có theo chuyến.
- Phép so có ý nghĩa còn lại đã làm ở trên: engine ↔ chính cột chưa-trắc-địa của Excel trên cùng 9.840 dòng. Muốn so với báo cáo tổng hợp thì phải (a) duyệt hết 14.528 dòng còn lại (hoặc ít nhất VT6/STTT-1/Than_CN) và (b) nạp STD + chạy `tkeMode=false` để có số trắc địa.

## 7. "KLVC cuối" / "Số trắc địa" ở chế độ TKE — đã xử lý bằng phương án A

**Vấn đề (lần tính 2):** `final_ton` = `survey_ton` = 3.355.442,27 t lớn hơn Σ `total_ton` = 3.348.878,74 t là 6.563,53 t (+0,196%), toàn bộ ở 318 dòng `Than_SX` (`final/total` = 1,11877 = 1/0,89384); T.km chênh +25.612,4 (+0,150%). Nguyên nhân: `total_ton` (cột AM) nhân `HS.THAN.TRUDA` cho `than_sx`, còn chuỗi `resolveBulkDensity` → `DW = m³ × tỷ trọng` → `final`/`survey` thì không. Bằng chứng Excel: chuỗi trắc địa (`td.tanL1` = AL × HSTĐ(m³) × `TheTrong_TĐ`; `TĐ.tấn` = `td.tanL1` × `HS TDia.Tan`) đúng 100% mọi dòng kể cả 559/559 `Than_SX` và không có thừa số 0,89384 (thể trọng trắc địa của than gấp 1,27–1,30 lần tỷ trọng, tự mang phần trừ đá); hệ số chỉ nằm trong AM/AN. Excel có hai họ cột TKE cho than: không nhân hệ số (`Tổng KLVC TKE (tấn_koQA)`, `…(tấn)_QA`, `…_BanDau_chưa trừ đá`) và có nhân (AM/AN). Hệ số tên "Than TKE **trừ đá**" nên số TKE của than phải là số đã trừ đá.

**Quyết định của chủ dự án và bản sửa (phương án A):** ở `tkeMode=true`, với `than_sx` bulkDensity = tỷ trọng × `HS.THAN.TRUDA` → `final_*`/`survey_*` = họ cột AM/AN.

**Kết quả kiểm (lần tính 3, 9.840 dòng, `stB_ds_final5.js`):**

| Chỉ tiêu engine | Cột Excel | Khớp ≤ 1e-6 | Lệch lớn nhất | Σ engine | Σ Excel |
|---|---|---|---|---|---|
| `total_ton` | Tổng KLVC (tấn) (AM) | 9.840 | 1,07e-7 | 3.348.878,737 | 3.348.878,731 |
| `final_ton` | AM | 9.840 | 1,07e-7 | 3.348.878,737 | 3.348.878,731 |
| `survey_ton` | AM | 9.840 | 1,07e-7 | 3.348.878,737 | 3.348.878,731 |
| `total_tkm` | Tổng Tkm (AN) | 9.840 | 8,28e-7 | 17.109.154,475 | 17.109.154,455 |
| `final_tkm` = `survey_tkm` | AN | 9.829 | 1,85e-6 | 17.109.154,388 | 17.109.154,455 |

Theo sản phẩm, `final_ton` ↔ AM khớp trên mọi dòng: **Than_SX 318/318 (Σ 55.263,26)**, Dat_SX 9.077/9.077 (3.186.370,77), Dat_CN 373/373 (75.184,12), Than_CN 72/72 (32.060,58). `final − total` = 0,000 t cho mọi sản phẩm (trước: +6.563,53 t ở Than_SX). `final_tkm` ↔ AN: Than_SX 318/318, Dat_SX 9.077/9.077; 11 dòng nhỏ lệch ≤ 5e-5 T.km ở Dat_CN (6) và Than_CN (5) chỉ vì Excel làm tròn AN 4 chữ số (xem §4). Đúng như dự báo, `final_ton` không còn khớp họ cột `…_QA` ở `Than_SX` (0/318; họ này "chưa trừ đá") — hệ quả có chủ đích của phương án A. "Số trắc địa" ở TKE nay bằng KLVC (không phải số trắc địa thật) — nên ghi "không áp dụng" khi TKE.

## 8. Việc còn lại / quyết định

| # | Việc | Loại | Tác động |
|---|---|---|---|
| 1 | 3 cột Năng suất xe (CAT777.DAT, VOLVOA40-GCoi.DAT/Than) | chủ dự án (xem `STAGEB_report.md` §3) | 1.308 dòng để trống, không ảnh hưởng m³/tấn/T.km/nhiên liệu |
| 2 | Duyệt nốt phần chưa duyệt (VT6, STTT-1, CKCĐ-1, Than_CN, Dat_TCN) trước khi dùng số liệu | nghiệp vụ | chưa vào số liệu: 50,8% T.km · 55,0% tấn · 58,2% m³ |
| 3 | Làm tròn T.km: tuỳ chọn làm tròn `final_tkm` 4 chữ số như Excel (11 dòng, ≤ 5e-5 T.km) | tuỳ chọn, không cần | Σ −0,087 T.km |
| 4 | Nạp STD + `tkeMode=false` nếu cần số trắc địa thật | nghiệp vụ | ngoài phạm vi hiện tại |

Đã xong: hệ số than 0,893840 (khớp Excel), cột P, khoá DMNL theo tên hàng, phương án A, Roda theo Excel (dữ liệu §10).

## 9. Tệp và script (`$XL/load/`)

Ghép `stB_ds_map.js` (→ `stB_ds_map.json`) · dữ liệu `stB_ds_data.js` · so sánh `stB_ds_cmp.js` (→ `stB_ds_cmp.json`; bản các lần trước: `stB_ds_cmp_before.json`, `stB_ds_cmp_calc2.json`) · nhận diện trường nhiên liệu `stB_ds_align.js` · nguyên nhân `stB_ds_extra.js`, `stB_ds_roda.js`, `stB_ds_fuelcause.js`, `stB_ds_fuelcsv.js` (→ `DOISOAT_lech_nhienlieu.csv`, nay 0 dòng) · kết quả cuối TKE `stB_ds_final.js`, `stB_ds_final2.js`, `stB_ds_final3.js` (quan hệ cột Excel), `stB_ds_final4.js` (tổng theo SPNT), `stB_ds_final5.js` (final/survey ↔ AM/AN), `stB_ds_tkm11.js` (11 dòng làm tròn) · tỷ lệ duyệt `stB_ds_share.js` · hệ số `stB_coef_update.js` · tính `stB_calc2.js` (→ `stB_calc_run1/2/3.json`; lần 3: HTTP 200, 44,5 s) · xuất DB `stB_ds_db.csv` (SELECT chỉ đọc; `stB_ds_db_before.csv`, `stB_ds_db_calc2.csv` là bản các lần trước). Backup: `$SP/backup/tk_after_calc_20261104_0047.dump` (lần 1), `tk_after_calc2_20261104_0110.dump`, `tk_before_roda_20261104_0139.dump`, `tk_after_roda_20261104_0140.dump`, `tk_after_calc3_20261104_0144.dump`.


## 10. Sửa dữ liệu mức tải Roda theo quyết định của chủ dự án (2026-11-04 ≈ 01:40)

Chủ dự án quyết: ô `Roda ; Khac` là **SỐ** thì là mức tải "Khác" (hệ số = chính số đó), KHÔNG phụ cấp Roda; chỉ ô chữ "Roda" mới cộng 0,5×NLĐM. Lỗi nằm ở bước nạp (`normLoadLevel` coi số ≈ 2/3 là `RODA_2_3`).

- **Phạm vi (quét toàn bộ nguồn)**: Vận tải — ô nguồn là số khác 0 và DB đang `RODA_2_3`: **đúng 3 chuyến, cả 3 APPROVED, 0 PENDING** (trip VT 21806, 21900, 21906; giá trị ô 0,66666666666666663 = 2/3, nguồn dòng 11629, 19675, 19681). 214 chuyến "Roda" chữ giữ nguyên `RODA_2_3`. Khai thác — nguồn KT là chữ (`roda` 75, `rd` 83, `2/3t` 3), không có ô số; 3 chuyến KT ghép cặp (KT 13962, 13960, 13964; nguồn KT3 dòng 5207, 5208, 5206, ô = "2/3t") không thuộc lỗi "ô số" nhưng phải đổi theo để `isMatched` (so cả mức tải hai bên) còn khớp và duyệt lại được. Tổng cần sửa: 3 cặp (VT APPROVED 3, KT APPROVED 3; PENDING 0).
- **Giá trị đúng**: `loadLevelType=OTHER`, `loadLevelCustomValue="2/3"` cả hai phía (hệ số 2/3 y hệt Roda nên **m³ không đổi**, 9.840/9.840 vẫn khớp Excel).
- **Cách sửa (API chính thức, không SQL)**: `POST /reconciliation/decisions/bulk` yêu cầu sửa `REVISION_REQUESTED` cho 3 cặp (sinh 6 dòng lịch sử `reconciliation_data_history`, giữ nguyên dữ liệu cũ `RODA_2_3`) → `PUT /reconciliation/trips/bulk` 6 chuyến (OTHER, "2/3"; trạng thái về PENDING) → `POST /reconciliation/decisions/bulk` duyệt lại `APPROVED` đúng 3 cặp. Chạy 1 lần, không lỗi.
- **Kiểm sau sửa**: cặp APPROVED vẫn **9.840**; chuyến duyệt VT 46.045 = KT 46.045; 0 cặp duyệt một phía; 0 chuyến VT APPROVED thiếu decision APPROVED; checksum của mọi chuyến VT/KT khác (24.365 / 15.531), mọi decision khác (9.837) và toàn bộ `production_results` (9.840 dòng) **không đổi**; kỳ id=1 `locked=false, stale=false`. Chỉ đổi: 6 chuyến (mức tải) và `reconciliation_data_history` 0 → 6 dòng. Mức tải còn lại: VT `RODA_2_3` 214 (đúng bằng số ô chữ "Roda"), `OTHER 2/3` 3, `FULL_LOAD` 24.151; KT `RODA_2_3` 158, `OTHER 2/3` 3, `FULL_LOAD` 15.373.
- **Đã tính lại (lần 3)**: nhiên liệu BP/BQ của 3 dòng này nay khớp Excel (không còn phụ cấp Roda +21,4 lít); Σ BQ lệch +0,004 lít toàn 9.840 dòng.
- Backup: trước `tk_before_roda_20261104_0139.dump`, sau `tk_after_roda_20261104_0140.dump` (`$SP/backup/`). Script: `stB_roda_find.js` (liệt kê), `stB_roda_fix.js` (sửa), `stB_roda_snap.sh` (đếm dòng/checksum trước–sau).
