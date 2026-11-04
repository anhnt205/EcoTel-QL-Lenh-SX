# BÁO CÁO GIAI ĐOẠN 1 — Dựng phiếu Vận tải / Khai thác tháng 9/2026

Tác tử: DỰNG PHIẾU. **Không ghi vào DB/API Thống kê** — chỉ đọc file + tính toán trong container tạm `--rm -m 1500m`. Sinh bởi `TR_main.js` / `TR_report.js` (thư mục `$XL/load/`). Không in họ tên / số thẻ / token.

## 1. Tóm tắt
- **Vận tải**: 24.368 dòng tinh toán (14/10) → **9.924 phiếu / 24.368 chuyến-dòng / 111.779 chuyến** (= đúng 111.779, 0 dòng 0 chuyến bị bỏ). Khớp nguồn theo từng (PX, ngày): 168 ô, lệch 0.
- **Khai thác**: 15.960 dòng nguồn → **9.597 phiếu / 15.534 chuyến-dòng / 91.728 chuyến**; bỏ 426 dòng (404 "xít" không có số chuyến, 13 dòng 0 chuyến, 9 dòng "Đá sàng (Máy to)" = 147 chuyến chưa ánh xạ được). Khớp nguồn theo (công trường, ngày): 109 ô, lệch 0.
- **Nhân viên**: tra được số thẻ cho **99,2% số chuyến của 4 PX có sổ (VT3/5/6/9)** và **63,2% toàn bộ chuyến VT**; VT1 và VT4 (36% chuyến) không có sổ ⇒ `CHUACO-VT1` / `CHUACO-VT4`.
- **Đối chiếu mô phỏng**: 92,3% khoá VT có cả hai phía; **9.840 cặp khớp & duyệt được = 41,2% số chuyến VT** (50,2% chuyến KT); 0,3% cặp lệch 1-1 (53 cặp); 35,1% cặp mơ hồ (VT tách tuyến nhiều dòng trong khi KT gộp 1 dòng). Chi tiết: `recon_simulation.md`.
- **Kiểm tra giá trị (f)**: không có ngày/ca ngoài phạm vi, số chuyến ≤0, tầng không phải số, tên rỗng, hay CĐ phi lý (CĐ lớn nhất 12,15 km; dòng "425 km" của sổ VT3 không còn trong bản tinh toán 14/10). Tên/mã trong payload **khớp 100%** tập kế hoạch của tác tử danh mục (`catA_plan.json`) (0 tên thiếu; xem mục 7).

## 2. File xuất (`$XL/load/`)
| File | Nội dung |
| --- | --- |
| `TR_*.js`, `TR_run.sh` | script (lib, core, px, cargomap, model, payload, sim, analyze, validate, main, report); chạy: `bash TR_run.sh TR_main.js` rồi `TR_report.js` |
| `payload_transport_03..30.json`, `payload_excavation_03..30.json` | phiếu theo ngày (tham chiếu bằng TÊN/MÃ; trường `_src`/`_meta` là truy vết, bỏ trước khi POST); `payload_index.json` = số phiếu/trip/chuyến mỗi file |
| `cargo_mapping.csv` | ánh xạ Loại hàng KT → Chủng loại hàng VT (mục 4) |
| `recon_simulation.md`, `recon_pairs_matched.csv`, `recon_mismatch_summary.csv`, `recon_by_day.csv`, `recon_vt_khong_co_kt_theo_may_xuc.csv` | mô phỏng đối chiếu; `recon_pairs_matched.csv` = 9.840 cặp sẽ duyệt (khoá + dòng nguồn + khoá phiếu hai bên) |
| `TR_summary.json`, `TR_distinct_names.json`, `TR_counts_by_group_day.csv`, `TR_kt_dong_bi_bo.csv` | số liệu tổng hợp; tập tên phân biệt thực dùng; đếm phiếu/trip/chuyến theo (PX|công trường, ngày); KT dòng bị bỏ |

## 3. Chuẩn hoá đã áp dụng
- **Máy xúc**: trim + HOA + bỏ dấu chấm cuối (`p27.`→`P27`, `XL.STTT-1.`→`XL.STTT-1`, `MS1.`→`MS1`); KT dùng `Mã MX` (KT1 `p9`→`P9`, KT2 `u2`→`U2`, `e12`→`E12`) và `Số hiệu máy xúc` (KT3). **34 máy** trong payload (VT 33 + `U6` chỉ có bên KT2). Khớp 2 phía 100% trừ `XL.STTT-1, MS1, MS3, H6` (chỉ VT) và `U6` (chỉ KT2).
- **Xe**: trim + HOA (`s4834`→`S4834`, `V22 Coi`→`V22 COI`). Alias KT→VT **xác định bằng dữ liệu** (trùng khoá (ngày,ca,máy xúc) và số chuyến): `V21, V21C→V21 COI`; `V22, V22C→V22 COI`; `V23, V23C→V23 COI` (≥90% khoá cùng số chuyến); `0929→S0929` (1/1 khoá). Trùng 100% với bảng alias của tác tử danh mục. File VT6 ghi xe dạng số (`4834`, `929`) → thêm tiền tố `S` và đệm 0 (`S0929`) khi tra thẻ. **171 xe** trong payload (426 chỉ có ở KT2; 913 không có chuyến nào).
- **Đội xe / PX**: `PXVT1`→`VT1`. **Mức tải (D6)**: VT cột 21 `0`→FULL_LOAD (110.970 chuyến), `Roda` / `0,6667`→RODA_2_3 (809 chuyến); KT `dutai`/trống→FULL_LOAD, `roda`/`rd`/`2/3t`→RODA_2_3. Không có mức tải OTHER.
- **Tên địa điểm / loại hàng**: chỉ `trim` hai đầu, giữ nguyên khoảng trắng bên trong (ví dụ `S Trượt  B47KMC` 2 dấu cách; `Nghiền ` → `Nghiền`) để trùng tên với danh mục.
- Dốc cục bộ = 0 → `null` (89 dòng có dốc thật, cả km lẫn m cùng >0). `tầng nhận` → số nguyên; `tầng dỡ` → chuỗi. `rainyDay` (cột 19 = 1: 2.541 dòng / 10.477 chuyến); `supplementaryVehicle` (cột 24 > 0: 267 dòng / 992 chuyến).
- `weighedWeightTon` (cột 20 qua cân > 0): **4 dòng**, đều là `NKCụcNhatTay` ở máy STTT: 4/1/S4834/XL.STTT-1/NKCụcNhatTay: klg=26.13, chuyến=1; 14/2/S4822/MS3/NKCụcNhatTay: klg=22.25, chuyến=1; 28/3/S4822/MS3/NKCụcNhatTay: klg=13.09, chuyến=1; 29/1/S4828/XL.STTT-1/NKCụcNhatTay: klg=44.87, chuyến=2. Các trường "(Báo chuyến)" còn lại để trống.

## 4. Ánh xạ Loại hàng Khai thác → Chủng loại hàng Vận tải (bằng dữ liệu) — `cargo_mapping.csv`
Phương pháp: với 13.013 khoá có mặt ở cả hai phía, so (tên KT, số chuyến) với (chủng loại VT, tổng chuyến); phiếu **mạnh** = trùng số chuyến với đúng một chủng loại VT (hòa thì lọc theo mô hình m3/chuyến, rồi loại trừ chủng loại đã bị tên KT khác trong cùng khoá chiếm); phiếu **hòa** = các nửa của chuyến trộn không phân biệt được; phiếu **yếu** = khoá 1-1 nhưng số chuyến khác.
| Nguồn | Tên KT | → Chủng loại VT | Trạng thái | Dòng | Chuyến | Khoá ủng hộ / mâu thuẫn | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KT1 | Bùn chặn | B.chan | OK | 286 | 1.029 | 285 / 0 |  |
| KT1 | Bùn chặn PA | B.chan | OK | 43 | 91 | 43 / 0 |  |
| KT1 | Bùn trộn PA | D.UOT | OK (có mâu thuẫn) | 245 | 1.451 | 172 / 62 | mâu thuẫn: B.TRON=62; |
| KT1 | P. Bùn trộn | B.TRON | OK (có mâu thuẫn) | 428 | 2.208 | 293 / 79 | mâu thuẫn: D.UOT=80, Nomin.=1, Nomin.CN=1; hòa (twin): D.UOT/Nomin./Nomin.CN=1; |
| KT1 | P. Đất trộn | DBTron | OK (có mâu thuẫn) | 428 | 2.208 | 293 / 79 | mâu thuẫn: D.UOT=80, Nomin.=1, Nomin.CN=1; hòa (twin): D.UOT/Nomin./Nomin.CN=1; |
| KT1 | SPNT | SPNT.VIA | OK | 17 | 49 | 17 / 0 |  |
| KT1 | SPNT_CN | SPNT.BaiChua | OK | 218 | 3.326 | 207 / 0 |  |
| KT1 | Than NK2 | NKSXLĐ | OK | 35 | 287 | 35 / 0 |  |
| KT1 | Đá sàng (Máy to) | **(không nạp)** | MƠ HỒ | 9 | 147 | 0 / 7 | mâu thuẫn: XitLoai(Tu NK)-MayTo=3; |
| KT1 | Đá to Bunke | DaBunKe | OK | 19 | 218 | 19 / 0 |  |
| KT1 | Đất SX | Nomin. | OK | 3.849 | 24.423 | 3.617 / 12 | mâu thuẫn: Nomin.CN=12; |
| KT1 | Đất SX- ướt CS | D.UOT | OK | 460 | 2.348 | 453 / 0 |  |
| KT1 | Đất SX- ướt CS- PA | D.UOT | OK | 31 | 119 | 10 / 0 |  |
| KT1 | Đất chặn PA | DBChan | OK | 45 | 93 | 43 / 0 |  |
| KT1 | Đất chặn đuôi(ĐCĐ) | DBChan | OK | 286 | 1.029 | 285 / 0 |  |
| KT1 | Đất phương án ( CS) | Nomin. | OK | 114 | 558 | 99 / 0 |  |
| KT1 | Đất thải Cao Sơn | Dthai. | OK | 172 | 1.438 | 164 / 4 | mâu thuẫn: Dthai.CN=4; |
| KT1 | Đất trộn PA | D.UOT | OK (có mâu thuẫn) | 245 | 1.451 | 172 / 62 | mâu thuẫn: DBTron=62; |
| KT1 | Đất_CN | Nomin. | OK | 32 | 240 | 32 / 0 |  |
| KT2 | SPNT | SPNT.VIA | OK | 7 | 17 | 7 / 0 |  |
| KT2 | Đất SX | Nomin. | OK | 1.972 | 11.549 | 1.884 / 19 | mâu thuẫn: Dthai.=18, Nomin.CN=1; |
| KT2 | Đất thải | Dthai. | OK | 196 | 1.286 | 179 / 0 |  |
| KT2 | Đất thải CN | Dthai.CN | OK | 3 | 3 | 3 / 0 |  |
| KT2 | Đất_CN | Nomin.CN | OK | 158 | 440 | 156 / 0 |  |
| KT3 (than) | THAN:NK2 | NKSXLĐ | OK | 404 | 2.207 | 398 / 0 |  |
| KT3 | BùnTrộn | B.TRON | OK | 494 | 2.290 | 470 / 8 | hòa dữ liệu giữa B.TRON / DBTron -> chọn theo tên; mâu thuẫn: D.UOT=8; hòa (twin): B.TRON/DBTron=470; |
| KT3 | BùnTrộn.CN | B.TRON.CN | OK (có mâu thuẫn) | 12 | 16 | 9 / 2 | hòa dữ liệu giữa B.TRON.CN / DBTron.CN -> chọn theo tên; mâu thuẫn: D.UOT=2; hòa (twin): B.TRON.CN/DBTron.CN=9; |
| KT3 | SPNT | SPNT.VIA | OK | 331 | 1.152 | 331 / 0 |  |
| KT3 | Thải | Dthai. | OK | 360 | 2.572 | 354 / 0 |  |
| KT3 | Thải.CN | Dthai.CN | OK | 15 | 40 | 15 / 0 |  |
| KT3 | Đất.nổ | Nomin. | OK | 4.023 | 25.563 | 3.968 / 0 |  |
| KT3 | Đất.nổ.CN | Nomin.CN | OK | 215 | 546 | 204 / 0 |  |
| KT3 | ĐấtƯớt | D.UOT | OK | 390 | 1.480 | 375 / 0 |  |
| KT3 | ĐấtƯớtCN | D.UOT.CN | YẾU (ít khoá ủng hộ) | 1 | 1 | 1 / 0 |  |

**Chưa ánh xạ được (không nạp):** `KT1 | Đá sàng (Máy to)` — 9 dòng / **147 chuyến**: hai ứng viên `XitLoai(Tu SPNT)-MayTo` (4 khoá) và `XitLoai(Tu NK)-MayTo` (3 khoá) không phân biệt được.
**Đáng chú ý:**
- KT1 `Bùn trộn PA` / `Đất trộn PA` → **`D.UOT`** (đa số 73,5% khoá: VT ghi cả mẻ trộn PA là 1 dòng `D.UOT` 33,3 m3, còn KT1 tách 2 dòng 11,1 + 22,2) — hai tên KT cùng ánh xạ một loại hàng nên trong khoá đó có 2 chuyến KT giống hệt nhau (mơ hồ vĩnh viễn). 26,5% khoá còn lại VT ghi `B.TRON`+`DBTron`. KT1 `P. Bùn trộn`/`P. Đất trộn` → `B.TRON`/`DBTron` (78,8%; 21,2% VT ghi `D.UOT`).
- KT3 `BùnTrộn` (1 dòng 33,3 m3) → chọn **`B.TRON`** (hòa dữ liệu với `DBTron`: cả hai nửa cùng số chuyến; chọn theo tên "Bùn"). Nửa `DBTron` của VT sẽ không có KT tương ứng (ước lượng ở `recon_simulation.md` §6).
- KT dòng `Than NK2` (KT1 + KT3 than 404 dòng / 2.207 chuyến) → `NKSXLĐ` (Than_SX); KT3 `SPNT`/KT1 `SPNT`/KT2 `SPNT` → `SPNT.VIA`; KT1 `SPNT_CN` → `SPNT.BaiChua`; `Đá to Bunke` → `DaBunKe`.
- **Chủng loại VT không có tên KT nào ánh xạ tới** (luồng STTT/than, chỉ Vận tải): `NKQS.ST` (5.569), `Cám7b` (2.382), `XitLoại(Tu SPNT)` (2.194), `ĐĐLT (CBDD)` (1.638), `Cám8a` (1.525), `NKSXLĐ_CN` (1.176), `BaSangNK` (821), `Cám4a.1` (582), `XitLoai(Tu SPNT)-MayTo` (98), `XitLoai(Tu NK)-MayTo` (49), `Cám7c` (45), `DBTron.CN` (27), `Đá CB Than Sạch` (15), `NKCụcNhatTay` (5).

## 5. Nhân viên & nhiên liệu
| PX | Sổ PX | Dòng | Chuyến | Dòng có thẻ | % dòng có thẻ | % chuyến có thẻ | Xung đột→phân giải | CHUACO (dòng) | Số phiếu (có thẻ / tổng) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VT1 | — (không có sổ) | 3.683 | 16.077 | 0 | 0% | 0% | 0 | 3.683 | 0 / 1.745 |
| VT3 | VT35 NhapSo | 4.263 | 16.952 | 4.262 | 99,98% | 99,96% | 0 | 1 | 1.761 / 1.762 |
| VT4 | — (không có sổ) | 5.363 | 24.445 | 0 | 0% | 0% | 0 | 5.363 | 0 / 2.074 |
| VT5 | VT35 pivotcache T9 | 4.473 | 19.421 | 4.473 | 100% | 100% | 4 | 0 | 2.006 / 2.006 |
| VT6 | VT69 NghiemThu | 2.656 | 15.169 | 2.548 | 95,93% | 96,28% | 0 | 108 | 413 / 427 |
| VT9 | VT69 NhapSo | 3.930 | 19.715 | 3.929 | 99,97% | 99,98% | 0 | 1 | 1.909 / 1.910 |
| **Cộng** |  | 24.368 | 111.779 | 15.212 | 62,43% | 63,23% | 4 | 9.156 | 6.089 / 9.924 |

- Bảng tra (ngày, ca, xe) lấy từ 4 sổ PX: **6.103 khoá ca-xe**, **456 số thẻ khác nhau**, tất cả 456 thẻ đều được dùng trong payload. Không có thẻ nào xuất hiện ở hai PX.
- **Xung đột** (một (ngày,ca,xe) có ≥2 thẻ khác nhau): 1 khoá thật (`18|2|96`, PX VT5, 4 dòng) — phân giải bằng máy xúc cùng khoá, 4/4 dòng được gán duy nhất; thêm 1 khoá VT3 (ngày 20 ca 1 xe 922) có 1 dòng sổ trống thẻ nhưng cùng ca-xe có thẻ khác → dùng thẻ có (importer cũ báo lỗi dòng này).
- **Không tra được → CHUACO**: VT1 3.683 dòng, VT4 5.363 dòng (không có sổ); VT6 108 dòng / 565 chuyến (**cả ngày 30**: sổ VT6 chỉ đến 29/9); VT3 1 dòng, VT9 1 dòng (xe-ca không có trong sổ). Mã dùng: `CHUACO-VT1` (phiếu VT 1.745, phiếu KT 868), `CHUACO-VT3` (phiếu VT 1, phiếu KT 1), `CHUACO-VT4` (phiếu VT 2.074, phiếu KT 893), `CHUACO-VT9` (phiếu VT 1, phiếu KT 1), `CHUACO-VT6` (phiếu VT 14, phiếu KT 0), `CHUACO-KT2` (phiếu VT 0, phiếu KT 3).
- Nhân viên phiếu Khai thác: lấy từ phiếu VT cùng (ngày,ca,xe,máy xúc): 91.489 chuyến; lấy từ phiếu VT cùng (ngày,ca,xe) ở máy xúc khác: 218 chuyến; không có phiếu VT → CHUACO-KT<n>: 21 chuyến. (Không có khoá nào có >1 nhân viên VT.)
- **Nhiên liệu** (đặt ở phiếu VT, lấy dòng đầu ca-xe của sổ PX; các dòng NL trùng nhau hoàn toàn nên không mất dữ liệu): đủ 3 trường **5.114** phiếu, thiếu một phần (thường trống "lĩnh") **973**, không có **3.837** (chủ yếu VT1, VT4 và VT6 ngày 30) / 9.924 phiếu. Trường trống để `null` (không bịa 0). 15 khoá ca-xe của sổ PX không dùng được cho NL (14 khoá VT6 ngày 30 không có thẻ + 1 khoá VT9 không có chuyến trong tinh toán).
- Phiếu Khai thác: Nơi chất tải = Nơi nhận tải của chuyến VT cùng khoá (mode theo số chuyến): 9.558 phiếu; 39 phiếu dùng `Chưa ghi nơi chất tải`; 1.228 phiếu (12,8%) có chuyến VT ở nhiều nơi nhận khác nhau → chọn nơi chiếm đa số. Tầng xúc: từ VT 9.558 phiếu, từ KT 13, trống 26.

## 6. Dựng payload — đối chiếu tổng nguồn
### 6.1 Vận tải (theo PX)
| PX | Chuyến-dòng | Chuyến (đọc từ file) | Chuyến đã biết (VT69 §4) | Phiếu | Chuyến trong payload |
| --- | --- | --- | --- | --- | --- |
| VT1 | 3.683 | 16.077 | 16.077 | 1.745 | 16.077 |
| VT3 | 4.263 | 16.952 | 16.952 | 1.762 | 16.952 |
| VT4 | 5.363 | 24.445 | 24.445 | 2.074 | 24.445 |
| VT5 | 4.473 | 19.421 | 19.421 | 2.006 | 19.421 |
| VT6 | 2.656 | 15.169 | 15.169 | 427 | 15.169 |
| VT9 | 3.930 | 19.715 | 19.715 | 1.910 | 19.715 |
| **Cộng** | 24.368 | 111.779 | 111.779 | 9.924 | 111.779 |
### 6.2 Khai thác (theo công trường)
| Nguồn | Dòng nguồn | Chuyến nguồn | Chuyến đã biết | Dòng bỏ | Chuyến bỏ | Dòng nạp | Chuyến nạp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KT1 | 6.962 | 42.713 | 42.713 | 9 | 147 | 6.953 | 42.566 |
| KT2 | 2.336 | 13.295 | 13.295 | 0 | 0 | 2.336 | 13.295 |
| KT3 | 6.258 | 33.660 | 33.660 | 417 | 0 | 5.841 | 33.660 |
| KT3 than NK2→STTT | 404 | 2.207 | 2.207 | 0 | 0 | 404 | 2.207 |
Lý do bỏ: KT3: Số chuyến = 0 — 13 dòng, 0 chuyến; KT3: dòng "xít" (m3 xít tách từ than, không có Số chuyến) — 404 dòng, 0 chuyến; KT1: loại hàng chưa ánh xạ: Đá sàng (Máy to) — 9 dòng, 147 chuyến. Chi tiết từng dòng: `TR_kt_dong_bi_bo.csv`. **Giữ nguyên** 14 nhóm dòng KT trùng hoàn toàn (nghi nhập đúp: KT1 3, KT2 1, KT3 9, KT3T 1) và tổng cộng 107 nhóm có ≥2 dòng cùng (ngày,ca,máy,xe,loại hàng,mức tải) — mỗi dòng là một chuyến-dòng (không cộng, không bỏ) cho trung thành nguồn; chúng làm cặp mơ hồ ở Đối chiếu.
### 6.3 Theo ngày
| Ngày | VT: phiếu | VT: chuyến-dòng | VT: chuyến | KT: phiếu | KT: chuyến-dòng | KT: chuyến |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 396 | 854 | 4.182 | 357 | 523 | 3.673 |
| 4 | 402 | 957 | 4.333 | 389 | 582 | 3.656 |
| 5 | 399 | 1.014 | 4.824 | 388 | 649 | 4.064 |
| 6 | 400 | 1.095 | 4.406 | 418 | 732 | 4.027 |
| 7 | 399 | 1.120 | 4.721 | 399 | 718 | 3.924 |
| 8 | 394 | 982 | 4.274 | 391 | 604 | 3.527 |
| 9 | 400 | 979 | 4.524 | 423 | 638 | 3.788 |
| 10 | 395 | 864 | 4.426 | 369 | 531 | 3.642 |
| 11 | 386 | 1.022 | 4.722 | 405 | 681 | 3.868 |
| 12 | 393 | 1.092 | 4.659 | 423 | 739 | 3.882 |
| 13 | 395 | 1.064 | 4.582 | 405 | 667 | 3.871 |
| 14 | 123 | 258 | 740 | 94 | 137 | 260 |
| 15 | 257 | 488 | 2.135 | 206 | 311 | 1.800 |
| 16 | 127 | 244 | 1.039 | 107 | 161 | 839 |
| 17 | 141 | 342 | 1.323 | 108 | 159 | 811 |
| 18 | 278 | 645 | 3.328 | 248 | 390 | 2.559 |
| 19 | 395 | 901 | 4.822 | 375 | 550 | 3.800 |
| 20 | 391 | 1.061 | 4.985 | 397 | 688 | 3.943 |
| 21 | 393 | 1.002 | 4.688 | 370 | 636 | 3.739 |
| 22 | 392 | 972 | 4.499 | 389 | 634 | 3.680 |
| 23 | 387 | 995 | 4.357 | 399 | 671 | 3.684 |
| 24 | 387 | 822 | 3.578 | 343 | 579 | 2.904 |
| 25 | 386 | 810 | 4.473 | 332 | 518 | 3.654 |
| 26 | 392 | 853 | 4.259 | 363 | 534 | 3.551 |
| 27 | 389 | 951 | 4.189 | 354 | 624 | 3.531 |
| 28 | 390 | 981 | 4.710 | 383 | 625 | 3.817 |
| 29 | 369 | 1.000 | 4.452 | 379 | 605 | 3.547 |
| 30 | 368 | 1.000 | 4.549 | 383 | 648 | 3.687 |
Chi tiết theo (PX | công trường, ngày): `TR_counts_by_group_day.csv`. Kiểm tra tự động: tổng chuyến theo (PX|công trường, ngày) của payload = nguồn (VT) và = nguồn − dòng bỏ (KT) cho **168 + 109 ô, lệch 0**.

## 7. Kiểm tra giá trị bất thường (f)
| Hạng mục | Kết quả |
| --- | --- |
| Ngày ngoài 3–30 / Ca ∉ {1,2,3} (VT; KT) | 0/0; 0/0 |
| VT: số chuyến không phải số nguyên ≥1 | 0 (max 43/dòng; 221 dòng ≥20 chuyến) |
| KT: số chuyến trống/0/không nguyên | 404 trống (= dòng "xít"), 13 dòng =0, 0 không nguyên (max 78) |
| Tầng nhận không nguyên / tầng dỡ không phải số | 0 / 0 |
| Tên rỗng (khu vực, máy, xe, nơi nhận, nơi dỡ, loại hàng) | 0 / 0 / 0 / 0 / 0 / 0 |
| CĐ toàn tuyến: min–max, =0, trống, >13 km | 0,07–12,15 km; 0; 0; 0 (R2039 "425 km" của sổ VT3 **không có** trong cache tinh toán 14/10) |
| Nâng tải min–max; ≠ (tầng dỡ − tầng nhận) | -90…480 m; 3.757 dòng (15,4%; thông tin, không phải lỗi API) |
| Dốc cục bộ: dòng có / km–m không đồng thời | 89 / 0 |
| Mức tải không nhận diện (VT; KT) | 0; 0 |
| Trùng khoá phiếu trong payload | 0 |
| Tên có khoảng trắng thừa ở nguồn | recv: "Nghiền "×212, "S Trượt  B47KMC"×6; unl: "Nghiền "×302 |
| Tên chỉ khác dấu/chấm/hoa-thường (trùng ngầm) | không |

**Đối chiếu tên với tập kế hoạch của tác tử danh mục (`catA_plan.json`):** cargo: thiếu trong kế hoạch 0; receiving: thiếu trong kế hoạch 0; pickup: thiếu trong kế hoạch 0; unloading: thiếu trong kế hoạch 0; areas: thiếu trong kế hoạch 0; devices: thiếu trong kế hoạch 0; users: thiếu trong kế hoạch 0; shifts: thiếu trong kế hoạch 0
Số tên phân biệt thực dùng: areas=1, machines=34, vehicles=171, receiving=53, unloading=50, cargo=29, employees=462, pickup=27 (kế hoạch: loại hàng 29, nơi nhận 53, nơi chất 54, nơi dỡ 50, thiết bị 206, người dùng 465). Kế hoạch có thừa: khu vực `KC` (không dùng), xe `913` (không chuyến), `CHUACO-KT1/KT3/VT5` (không phiếu nào cần), 27 nơi chất tải (đều là điểm của luồng STTT/than, không có phiếu KT).

## 8. Sai lệch so với đặc tả
1. **D7/D8 – 1 dòng = 1 trip**: giữ nguyên. Phát hiện hệ quả không lường trước ở Đối chiếu (mục 9-1).
2. **D8 – nhân viên phiếu KT**: ưu tiên phiếu VT cùng (ngày,ca,xe,**máy xúc**), rồi mới (ngày,ca,xe). Kết quả giống hệt vì không có khoá nào >1 nhân viên.
3. **Ánh xạ**: KT3 `BùnTrộn(.CN)` → `B.TRON(.CN)` theo **tên** khi dữ liệu hòa; KT1 `Bùn trộn PA`/`Đất trộn PA` → `D.UOT` theo **đa số** (73,5% khoá). Cả hai có thể đảo ngược bằng cách sửa một dòng trong `cargo_mapping.csv` + chạy lại.
4. Không nạp: 404 dòng "xít" KT3 (là m3 xít tách từ than, **không có Số chuyến**; trọng lượng xít đã nằm trong dòng than NK2 — nạp sẽ tính hai lần), 13 dòng KT3 `Số chuyến=0`, 9 dòng KT1 `Đá sàng (Máy to)`.
5. `weighedWeightTon` có cho 4 dòng; dốc cục bộ 0 → `null` (spec không nêu).
6. Cung độ phi lý "425 km" (R2039 VT35) **không còn** trong nguồn dùng (tinh toán 14/10, CĐ max 12,15 km) — không cần sửa; sổ PX chỉ dùng để tra thẻ/nhiên liệu, không lấy chuyến.

## 9. Điểm cần chủ dự án quyết
1. **(Chặn tính sản lượng) Cơ chế ghép 1-1 không hợp với dữ liệu thật**: chỉ 41,2% chuyến VT duyệt được; 33,8% chuyến VT nằm ở nhóm "VT nhiều dòng/tuyến, **tổng chuyến theo loại hàng bằng KT**" nhưng engine coi là mơ hồ; 17,4% chuyến là máy xúc STTT/MS/H6/PXVT6 (không có bên KT). Theo QĐ-16 kỳ sẽ không tính được. Cần chọn: (a) sửa thuật toán đối chiếu sang mức gộp (cận trên 74,9% chuyến VT khớp), (b) cho phép duyệt hàng loạt các nhóm "tổng khớp" bằng SQL có kiểm soát, (c) hoặc tách KT cho khớp (không khuyến nghị: bịa dữ liệu).
2. **STTT / than / PXVT6**: ~19.100 chuyến VT dùng máy `XL.STTT-1, MS1, MS3, H6` không có công trường KT ⇒ không bao giờ duyệt được qua API. Sinh phiếu KT bổ sung cho các máy này? Hay loại khỏi kỳ?
3. **Hàng trộn**: KT3 ghi 1 dòng, VT/KT1/KT2 tách 2 dòng; PA KT1 hai nửa nhưng VT ghi `D.UOT` 1 dòng. Chọn quy ước chung (tách đôi mọi nơi, hay gộp)? Ước lượng +757 cặp / +3.518 chuyến VT duyệt được nếu thống nhất (mục 6 `recon_simulation.md`).
4. **VT1 và VT4 (36% chuyến) không có sổ thẻ lương** → `CHUACO-VT1/VT4`. Có file `VT1 …`, `VT4 …` giống VT3/VT5 không?
5. VT6 ngày 30: không có thẻ/nhiên liệu (sổ chỉ đến 29/9) → `CHUACO-VT6` (565 chuyến).
6. `Đá sàng (Máy to)` (KT1, 147 chuyến): thuộc `XitLoai(Tu SPNT)-MayTo` hay `XitLoai(Tu NK)-MayTo`?
7. Nhân viên phiếu KT = nhân viên VT là quy ước nhân tạo: bù cho việc file KT không ghi người. Nếu chủ dự án có số thẻ người vận hành máy xúc thật, điều kiện "cùng nhân viên" sẽ lệch gần như mọi cặp.

## 10. Giai đoạn 2 (CHƯA làm, đợi lệnh)
Hiện CHƯA có `id_maps.json` (tác tử danh mục đang nạp danh mục). Khi có: đổi tên → id (ca `name`→id ca; xe/máy xúc theo `code`; nhân viên theo `salaryCode`; khu vực/nơi nhận/nơi chất/nơi dỡ/loại hàng theo `name`);
lô POST ước lượng: VT 123–402 phiếu/ngày (≤1.120 chuyến-dòng), KT 94–423 phiếu/ngày — chia lô ≤ 100–200 phiếu và đo thử trước; `decisions/bulk` chia ≤ 50–100 cặp/lô (trung bình ~350 cặp/ngày, tối đa 532/ngày).
Đổi tên → id bằng `id_maps.json` của tác tử danh mục; POST `/transport-reports/bulk` và `/excavation-reports/bulk` theo ngày (phiếu duy nhất theo khoá; chạy lại phải tra trước vì không có upsert); kiểm chứng GET theo ngày so với `payload_index.json`; duyệt theo D9 chỉ khi được yêu cầu, dùng `recon_pairs_matched.csv` để đối chiếu danh sách cặp mong đợi.
