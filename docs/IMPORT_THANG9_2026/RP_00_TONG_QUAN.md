# RP_00 — Tổng quan nhóm BÁO CÁO ĐẦU RA (5 file) — tháng 9/2026, Thống kê Cao Sơn

Báo cáo chi tiết: `RP_BC_SL_NGAY30.md`, `RP_SO_TK_17NGAY.md`, `RP_BB_NGHIEM_THU.md`, `RP_CUNG_DO_28N.md`, `RP_THAN_TIEU_THU.md`. Tất cả trong `<scratchpad>/xl/reports/`. Chỉ đọc, không sửa dữ liệu/repo/Docker đang chạy (chỉ `docker run --rm`).

## 1. Phát hiện quan trọng nhất
1. **Hai trong năm file KHÔNG phải "báo cáo" mà là pivot-cache chứa nguyên sheet `tinh toan` của Excel chạy thật** (172 trường, 55.149 bản ghi): `Số thống kê 17 ngày ( pcv )` (làm mới **21/9/2026**, 12.638 dòng thật, ngày 3–17) và `Than tieu thụ th9 ( E Hằng )` (làm mới **14/10/2026**, **24.368 dòng thật, ngày 3–30, 111.779 chuyến**). Đây là **nguồn dữ liệu VẬN TẢI tháng 9 đầy đủ nhất** có trong thư mục (mức Ngày/Ca/Máy xúc/Số xe/Nơi nhận+tầng/Nơi dỡ+tầng/Chủng loại hàng/CĐ/Nâng tải/Số chuyến, có cờ ngày mưa/bổ túc/Roda, cột Trắc địa `TĐ.*`, cột ĐMNL) — **trừ Số thẻ lương & nhiên liệu thực (không có)**. Bản 14/10 thay thế bản 21/9.
2. **Sản lượng nghiệm thu = Σ cột `TĐ.*` (trắc địa) của `tinh toan`** theo `SP N/thu`: BB nghiệm thu VT (Tkm, m3, CĐ) trùng đến chữ số thập phân với tổng `TĐ.Tổng …` theo PXVT (than: VT4 287.958,305 t/377.003,487 Tkm…; đất VT3 547.102,487/7.558.199,174); BB nghiệm thu KT theo từng máy xúc = Σ `TĐ.Tổng m3` theo máy (KT2 trùng 100% mọi máy; KT1 trùng trừ P9 −451,3; đất CN và than trùng 100% mọi máy KT3). Hệ số trắc địa `HSTĐ` trung vị **0,9806** (−1,94%) — chính là việc "Áp Trắc Địa" của TK phải tái tạo.
3. **Báo cáo sản lượng ngày 30 (BC KHAI THÁC) = tổng m3 thống kê KT1/KT2/KT3 cộng-chia lại**: KT1 và KT3 (bản 01/10) khớp từng ngày tuyệt đối; KT2 lệch −195,5 m3 (4 ngày). "Đất CN – cạp đường" của BC là **số gõ tay**; SX = tổng − CN − đá. **VCNB (vận chuyển nội bộ)**: Đất SX+SPNT của từng PXVT từng ngày = Σ `Tổng m3` của `Dat_SX` trong `tinh toan` (khớp tuyệt đối nhiều ô), Đất CN = `Dat_CN`.
4. **Khoảng trống 14/9 ca2 – 18/9 ca1 của Khai thác là NGÀY MƯA**, không phải ngừng sản xuất: cờ `Ngày mưa` = 1 ở 100% dòng ngày 14–17/9 (+ 48 dòng ngày 18, và các ca ngày 22, 24, 26, 27). Trả lời Q6 của nhóm KT.
5. **"Than tiêu thụ"** (89.226,83 tấn, nguyên khai `NKQS.ST` đến Bunke Máng ga Cửa Ông 47.796,02 + Bunke NM tuyển 36.895,53 + Máng ga 4.535,28) là **chỉ tiêu của biên bản STTT**; số này xuất hiện nguyên văn ở BB (`STTT!M53`, `Kiểm Tra!E40`).
6. **Cung độ**: file "Phân tích cung độ VC đất 28 ngày" chỉ là bảng tổng 2×2 (điểm đổ × loại đất), **không phải bảng tra theo máy xúc/nơi nhận/nơi dỡ**. Bảng tuyến → CĐ/nâng tải phải lấy từ `tinh toan` (đã xuất CSV); **CĐ toàn tuyến không cố định theo tuyến** (22% tuyến nhiều giá trị), còn **nâng tải = tầng dỡ − tầng nhận** (85% dòng), chênh cao tính nhiên liệu = 0 khi nâng tải âm.

## 2. Bảng 5 file
| File | Bản chất | Quy mô/ phạm vi | Ánh xạ TK | Vấn đề lớn nhất |
|---|---|---|---|---|
| `BÁO CÁO SẢN LƯỢNG  NGÀY 30` | báo cáo đầu ra ĐKSX: BC KHAI THÁC (31 ngày × KT1/2/3 SX+CN, than, đá), VẬN CHUYỂN NỘI BỘ (31 ngày × PXVT1/3/4/5/6/9: m3, CĐ, Tkm), P-A, 3 sheet ẩn rỗng | tháng 9; nội bộ **2.567.284 m3**; Đất SX **2.523.267,4** (VCNB 2.523.450,9; Tkm 33.763.122,9; CĐ 5,138); than SX 97.750,96 t | chỉ đối chiếu | CN gõ tay; VT5 tổng ô lệch 23.610 m3; thể trọng gõ cứng nhiều giá trị |
| `Số thống kê 17 ngày ( pcv )` | pivot + cache `tinh toan` bản 21/9 | 12.638 dòng, ngày 3–17, 56.044 chuyến, 1.562.109,9 m3 (đất 1.291.547,8), 16.958.071,8 Tkm | **nguồn Nhập liệu Vận tải** (bản cũ) | trùng/đếm kép bùn; TĐ chưa hoàn chỉnh; cờ mưa chưa điền; thiếu thẻ lương/NL |
| `BB nghiệm thu CTPX T9.2026` | 12 biên bản (KT1/2/3, VT1/3/4/5/6/9, STTT, CKCĐ, Kiểm Tra) 6/10/2026 | KT: 1.053.434 / 414.334 / 919.723 m3 đất SX; VT Tkm TH ≈ 34,39 triệu; Đất CBSX **2.387.491 m3 / 31.509.693 Tkm** | chỉ đối chiếu (đáp án cuối) | khối A vs B của VT lệch 1–2%; số gõ tay màu tím |
| `Phân tích cung độ VC đất- 28 NGÀY` | bảng tổng 2×2 đã tính | 1.987.256,3 m3; Tkm 26.412.599,7; CĐ 5,138 | chỉ đối chiếu | không có máy xúc/nơi nhận/nơi dỡ; là tập con 6–15% |
| `Than tieu thụ th9 ( E Hằng )` | pivot nhỏ (than tiêu thụ 89.226,83 t) + cache `tinh toan` bản 14/10 | **24.368 dòng, ngày 3–30, 111.779 chuyến**, 3.192.879,1 m3 (đất 2.621.643,2), 34.747.891,6 Tkm | **nguồn Nhập liệu Vận tải (khuyến nghị)** + đáp án trắc địa | đếm kép bùn; máy xúc hoa/thường lẫn; mã loại hàng khác Khai thác; thiếu thẻ lương/NL |

## 3. Số đối chiếu cuối (đáp án) — thu gọn (chi tiết trong từng báo cáo)
- **Khai thác m3 thống kê** (BC/thô): KT1 1.165.944,0 | KT2 438.402,1 | KT3 972.668,9 (01/10) hoặc 972.900,9 (16/10). `tinh toan` 14/10 đất: 1.164.261,1 | 439.973,6 | 972.900,9.
- **Nghiệm thu (BB/TH.NT)**: Đất SX 1.053.434 | 414.334 | 919.723 (Σ 2.387.491); Đất CN 20.335 | 17.096 | 15.917 (Σ 53.348); Đất PA sụt lún 63.915 | – | 22.232 (Σ 86.147); than SX 10.049 | – | 77.072 t (Σ 87.121); m3qđ 1.238.109 | 431.430 | 1.007.729 (Σ 2.677.268).
- **Vận tải (BB, khối B)**: Tkm TH: VT1 6.711.165,5; VT3 7.558.198,8; VT4 7.063.226,7; VT5 7.736.827,7; VT6 128.250,3; VT9 5.191.331,4. CĐ bq đất đá: 5,184 / 5,265 / 5,237 / 5,148 / (0,434 Scania) / 4,476. m3 đất đá: 498.618,1 / 547.102,3 / 493.319,5 / 575.430,5 / 23.717 / 438.104,3.
- **Than**: sản xuất 87.121 t (STTT 87.441,23 stat); tiêu thụ NK 89.226,83 t; v/c than+CN: VT4 287.958,3; VT6 366.907,9; VT9 36.175,8; VT5 5.444,5; VT1 4.196,8.
- **Nhiên liệu định mức vận tải** (cột trong `tinh toan`): Σ NLĐM hiện hành nghiệm thu = 4.526.125,9 lít (VT1 822.199,1; VT3 928.372; VT4 1.027.576,8; VT5 980.337,1; VT6 20.764,8; VT9 746.876,1).
- **Tổng chuyến** `tinh toan` 111.779 (đất 89.035 + than 22.744; ≈106.198 chuyến vật lý nếu bỏ dòng bùn đếm kép); KT 89.668 (+2.207 than KT3).

## 4. Quy ước nghiệp vụ lộ ra (dùng kiểm tra công thức TK)
1. `Tkm = tấn × CĐ toàn tuyến`; `CĐ bq = Tkm / tấn` (không chia theo m3); `tấn = m3 × tỷ trọng(loại hàng)`; `m3 = chuyến × mô hình`; `Tổng Km vận chuyển = chuyến × CĐ`.
2. Tỷ trọng theo loại hàng: đất nổ mìn 2,617; đất thải 2,257; bùn trộn/chặn 2,61; đất ướt 2,641; SPNT vỉa 2,282; than NK (SX) 1,206; NKQS 1,104; SPNT bãi chứa 1,408; xít 1,661; đá máy to 1,477; cám 7b 1,206/8a 1,308/7c 1,237/4a.1 0,982; ĐĐLT 1,362; BaSangNK 1,278. Hệ số quy đổi than → m3qđ nghiệm thu: ÷1,533 (KT1 than NK), ÷1,546 (KT3), SPNT bãi chứa 1,408 (tấn/m3).
3. `TĐ.* = * × HSTĐ` (tách m3, tấn, Tkm), HSTĐ ≈ 0,9806 theo nhóm (Nhóm vỉa + Nhóm tầng + Máy xúc).
4. Nâng tải = tầng dỡ − tầng nhận; chênh cao NL = max(0, nâng tải) (+ hiệu chỉnh khi có dốc cục bộ).
5. Hàng trộn bùn+đất tách thành 2 dòng cùng số chuyến (mô hình 11,1 + 22,2 = 33,3 m3/chuyến).
6. Phân loại sản phẩm nghiệm thu: `Dat_SX`, `Dat_CN` (công nghệ), `Dat_TCN` (STTT công nghệ), `Than_SX`, `Than_CN`; đất PA (phương án xử lý sụt lún/bùn moong) tách riêng ở nơi nhận `.PA`, `.PA.BUN`, `PCMB`.
7. BC sản lượng ngày: SX = thống kê − CN(gõ tay) − đá sàng − đá to bunke; CĐ bq báo cáo dùng thể trọng gõ cứng (2,604 …).
8. Đá quá cỡ bunke (`DaBunKe`, 4.796 m3 / 39.538 Tkm): KHÔNG cộng m3 vào Đất SX, nhưng CỘNG Tkm vào Đất SX và trừ khỏi Tkm Đất CN (comment sheet VT5 của BB). Xít loại từ NK/SPNT: lấy m3 thống kê, tấn/Tkm trắc địa. Than tiêu thụ nguyên khai = `NKQS.ST` chở đến 3 điểm dỡ (Bunke Máng ga Cửa Ông, Bunke than NM tuyển, Máng ga).

## 5. Danh sách CSV/TSV xuất ra (thư mục reports)
`RP_TT_cungdo_theo_tuyen.csv` (1.072 tuyến, cả tháng) · `RP_17n_cungdo_theo_tuyen.csv` (598 tuyến) · `RP_TT_distinct_*.csv` (máy xúc, nơi nhận, nơi dỡ, tầng, chủng loại hàng, nhóm hàng, tên nghiệm thu, số xe, mô hình, loại xe, tỷ trọng, mã TTL, SP nghiệm thu) · `RP_TT_xe_distinct.csv`, `RP_17n_xe_distinct.csv` · `RP_TT_tong_ngay_{pxvt_phanloai,congtruong_phanloai,ca}.csv`, `RP_17N_tong_ngay_*.csv` · `RP_TT_tong_chung_loai_hang_nhom_sp.csv` · `RP_TT_theo_ten_nghiem_thu.csv` · `RP_TT_theo_ct_may_xuc.csv` · `RP_TT_ngay_mua_bo_tuc_roda.csv` · `RP_TT_than_tieu_thu_NKQS_theo_ngay.csv` · `RP_BB_KT_theo_may_xuc.csv` · `RP_BB_VT_tong.csv` · `RP_BC_KHAITHAC_theo_ngay.tsv` · `RP_VCNB_theo_ngay_donvi.tsv` · các `RP_so_sanh_*.txt` và `RP_kiem_tra_cong_thuc_tinhtoan.txt`.

## 6. CHƯA kiểm chứng
- Nghĩa của "pcv" và "E Hằng" (người/phòng); ý nghĩa `7,5`, `3,6`, `4,308` trong file cung độ; tiêu chí chọn dữ liệu của file cung độ; nguyên nhân KT2 −195,5 m3 và KT1/KT2 ±1,6–1,9k ngày 30; nguyên nhân P9 −451 m3 và lệch KT3 giữa BB (6/10) và tinh toan (14/10); công thức chênh cao khi có dốc cục bộ; bảng quy đổi tên Loại hàng Khai thác ↔ Chủng loại hàng tinh toan (chỉ khớp được một số nhóm); sheet ẩn của BB (19 sheet) chỉ liệt kê tên, không đọc; chưa so với Danh mục thiết bị/loại hàng thật trong DB TK; chưa kiểm xe `Số xe` vs mã thiết bị TK.
- Mối quan hệ với file VT3/5/6/9/NLTH Vận tải thuộc agent khác (chưa đối chiếu).

## 7. Câu hỏi cho chủ dự án (tổng hợp)
1. Nguồn Vận tải chính thức cho TK: dùng `tinh toan` bản 14/10 (24.368 dòng) hay các file SL theo đội (VT3/5/6/9)? Có nhập cả STTT (`XL.STTT-1`, `MS1/3`, `H6`, than) không?
2. Số thẻ lương/tài xế & nhiên liệu thực: lấy từ đâu (Bảng thanh toán lương, NLTH)? TK báo lỗi nếu trống.
3. Dòng bùn tách đôi: nhập 1 hay 2 dòng/chuyến? Bảng quy đổi tên Loại hàng (Khai thác ↔ Vận tải `Nomin.`, `B.TRON`/`DBTron`…).
4. Ngày mưa 14–17/9 (và một số ca 18, 22, 24, 26, 27): xác nhận và nhập cờ `Ngày mưa`; "Xe bổ túc" 267 dòng.
5. Đáp án cuối ưu tiên: m3 thống kê (BC sản lượng ngày) hay m3 trắc địa (BB nghiệm thu); độ lệch cho phép; khối A hay B của BB VT.
6. CĐ: nhập theo từng chuyến hay bảng chuẩn (nơi nhận+tầng, nơi dỡ+tầng)? Nâng tải có tự tính (tầng dỡ − tầng nhận) không?
7. Mã thiết bị trong TK: `Số xe` (106, V05, s0912) hay `Số hiệu xe` (CAT-106, Volvo-05, Scan-0912, HD-62)? Máy xúc: `Máy xúc` hay `Số hiệu máy` (`E12.`/`EKG12.`)?
8. KT3: dùng dữ liệu 01/10 hay 16/10 (tinh toan 14/10 khớp 16/10).
9. File cung độ 28 ngày: tiêu chí chọn dữ liệu và ý nghĩa 7,5/3,6/4,308.
10. Xác nhận bỏ qua sheet ẩn/cũ của BB (19 sheet) và các sheet rỗng của BC.

## 8. Cách tái lập
```
D="D:/EcoTel/3. Dự án/TKV Công ty than Cao sơn/Phần mềm thống kê/Dữ liệu"; SP=<scratchpad>
docker run --rm -m 1500m --entrypoint node -v "$D":/data:ro -v "$SP/xl":/xl dieuphoimm_backend_img \
  /xl/KT_cache.js "/data/Báo cáo/Than tieu thụ th9 ( E Hằng ).xlsx" 1 dump /xl/work/RP_than_cache.tsv   # 20 giây
docker run --rm -m 1000m --entrypoint node -v "$SP/xl":/xl dieuphoimm_backend_img /xl/RP_17n_compact.js /xl/work/RP_than_cache.tsv /xl/work/RP_than_real.tsv
# rồi RP_tt_an2.js / RP_export.js / RP_cmp4.js / RP_formula.js / RP_nt.js / RP_coal.js
```
Script: `RP_dump.js` (in ô+công thức), `RP_grid.js`, `RP_prof.js`, `RP_17n_compact.js`, `RP_17n_an1.js`/`RP_tt_an1.js`, `RP_tt_an2.js`, `RP_cmp1..4.js`, `RP_snapdiff.js`, `RP_formula.js`, `RP_nt.js`, `RP_coal.js`, `RP_cd28*.js`, `RP_bb_kt.js`, `RP_bb_vt.js`, `RP_export.js`, `RP_nl.js`.
