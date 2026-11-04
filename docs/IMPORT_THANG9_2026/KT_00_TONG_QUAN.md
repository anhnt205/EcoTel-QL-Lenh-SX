# KT_00 — Tổng quan nhóm KHAI THÁC (KT1, KT2, KT3, TH.NT, Biểu 2A) — tháng 9/2026

Báo cáo chi tiết: `KT_KT1.md`, `KT_KT2.md`, `KT_KT3.md`, `KT_THNT.md`, `KT_B2A.md`. Thư mục: `<scratchpad>/xl/reports/`.

## 1. Phát hiện quan trọng nhất
Ba file `KT1 30-9`, `KT 2 ngày 30`, `SL KT3 NGÀY 30-9` **trông như pivot của riêng ngày 30, nhưng mỗi file giữ nguyên "pivot cache" = bản chép toàn bộ sheet nhập số** (`NHAP SO` cho KT1/KT2, `ĐẤT` cho KT3) **với dữ liệu thô cả tháng 9**. Đọc thẳng `xl/pivotCache/pivotCacheRecords1.xml` (không cần Excel) cho ra **bản ghi thô theo (Ngày, Ca, Máy xúc, Số xe, Loại hàng) + Số chuyến** — đúng mức chi tiết để dựng bản ghi Khai thác ở khoá (Ngày+Ca+Máy xúc+Số xe). Đã kiểm chứng: pivot ngày 30 hiển thị khớp 100% với bản ghi ngày 30 giải mã từ cache (KT1 312 dòng, KT2 586 chuyến/18.874,5 m3, KT3 1.339 chuyến/37.578,7 m3). `Biểu 2A` còn chứa cache mới hơn (16/10) của KT3 + cache than KT3 (`THAN`).

## 2. Bảng tóm tắt
| File | Là gì | Bản ghi thật | Ngày | Chuyến | m3 đất (T.Kê) | tấn than | Ghi chú |
|---|---|---|---|---|---|---|---|
| `KT1 30-9` | KT1: pivot ngày 30 + cache thô | **6.962** | 3–30/9 | **42.713** | **1.165.944,0** | **135.915,0** (SPNT_CN 124.631,1 + Than NK2 11.283,9) | 10 máy xúc (p9…p30, ht6, ht7), 159 xe; có Volvo chở than |
| `KT 2 ngày 30` | KT2: pivot ngày 30 + cache thô | **2.336** | 3–30/9 | **13.295** | **438.402,1** | 0 | 7 máy xúc (8U2…8U8, EKG12), 151 xe; có Tầng (57% = 0) |
| `SL KT3 NGÀY 30-9` | KT3: pivot ngày 30 + cache thô (bản **01/10**) | **5.685** | 3–30/9 | **33.654** | **972.668,9** | (không có sheet than) | 13 máy xúc (P11…P28, HT4), 164 xe; có Tầng/Vỉa/Nhóm tầng/Mô hình; 2 sheet ẩn rác 2023 |
| `Biểu 2A` | Biểu ngày KT3 + 2 cache (bản **16/10**) | ĐẤT **5.854** (+404 "xít"); THAN **404** | 3–30/9 | ĐẤT **33.660** + THAN **2.207** | **972.900,9** (976.430,9 có xít) | 86.542,6 (gồm xít) / 77.355,2 ròng | **bản KT3 mới nhất, được biểu chính thức dùng** |
| `TH.NT KHAI THAC Tháng 9` | báo cáo quyết toán NL **đầu ra** (12/10/2026) | – | cả tháng | – | **nghiệm thu: KT1 1.238.109; KT2 431.430; KT3 1.007.729 m3qđ (Σ 2.677.268)** | | chỉ để đối chiếu |

Tổng chuyến 3 công trường (KT3 bản 16/10): **89.668** (+ 2.207 chuyến than KT3). Theo đơn vị quản lý xe (KT1+KT2+KT3): VT1 **15.882**, VT3 **16.795**, VT4 **19.376**, VT5 **19.297**, VT9 **18.317**, VT6 1 (+ than KT3: VT4 1.001, VT9 936, VT5 156, VT1 114) — dùng để đối với tổng chuyến của các file Vận tải.

## 3. Phạm vi thời gian (kiểm chứng trên dữ liệu thật)
- Cả ba công trường có đúng **ngày 3 → 30/9**; **không có ngày 1, 2** (còn là "mục không dùng" trong cache) và không có 31. Biểu 2A: sheet ngày 1, 2 trống.
- **Khoảng trống chung 14/9 ca2 → 18/9 ca1** ở cả 3 công trường (14/9 chỉ 158 chuyến KT1, 10 chuyến KT2, 92 chuyến KT3 so với ~1.700/540/1.450 bình thường; 15–17/9 chủ yếu ca3) → nhiều khả năng ngừng sản xuất thật (nguyên nhân chưa xác minh).
- Ca chỉ 1, 2, 3 (không có ca 0/4).

## 4. Ánh xạ vào TK (Nhập liệu **Khai thác**, mẫu 19 cột)
| TK | KT1 | KT2 | KT3 |
|---|---|---|---|
| Thời gian | Ngày → dd/09/2026 | idem | idem |
| Ca | Ca | Ca | Ca |
| Máy xúc | `Mã MX` → HOA (P9, HT7…) | `Máy xúc` (8U2, EKG12) | `Số hiệu máy xúc` (P11…) |
| Tầng xúc | **không có** | `Tầng` (nhiều = 0) | `TẦNG XÚC` (+ Vỉa, Nhóm tầng) |
| Nơi nhận tải | không | không | chỉ than: `STTT` |
| Số thẻ lương, Họ tên, NL tồn/lĩnh/sử dụng | **không có (cả 3 file)** | **không có** | **không có** |
| Đơn vị | (đề xuất tên công trường) | idem | idem |
| Số xe | `Số xe` (có V01…V23, `0929`) | `Số xe` | `Số hiệu xe` (có `V21C`…) |
| Số chuyến | `Chuyến` | `Chuyến` | `Số chuyến` |
| Loại hàng | `Loại` (19 tên) | `Loại` (5 tên) | `Chủng loại hàng` (9 tên) |
| Nhóm hàng | `Loại Hàng` | `Loại Hàng` | suy ra |
| Mức tải | dutai/roda | dutai/roda | trống/`rd`/`2/3t` |
| Đơn vị quản lý TB | `Đội xe` PXVT1/3/4/5/9 | idem | `DVQL` VT1/3/4/5/9 |
| Chủng loại xe | `Loại xe` (bỏ hậu tố) | idem | `Chủng loại xe` |
Thiếu bắt buộc: **Số thẻ lương**. Không bịa: cần quyết định (Q1). Tầng xúc KT1 không có (Q7).

## 5. Số đối chiếu quan trọng
- Tổng, theo ngày, theo máy xúc: trong từng báo cáo; CSV: `KT_KT1_tong_ngay_mx.csv`, `KT_KT1_tong_ngay_loai.csv`, `KT_KT2_tong_ngay_mx.csv`, `KT_KT3_tong_ngay_mx.csv`, `KT_B2A_DAT_tong_ngay_mx.csv`.
- **Nghiệm thu (TH.NT) so với thống kê thô** (đã quy đổi than về m3): KT1 1.238.109 vs 1.261.821 (nghiệm thu thấp hơn 1,9%); KT2 431.430 vs 438.402 (−1,6%); KT3 1.007.729 vs 1.022.937 (−1,5%); theo từng máy xúc thường −1…−2%, ngoại lệ P10 −4,3%, P14 −4,2%, P17 +2,1%, 8U7 +2,2%, HT4 +4,1%. Chi tiết `KT_so_sanh_TK_vs_THNT.txt` (ở file đó dấu ngược lại: thô − nghiệm thu).
- **Biểu 2A KT3**: Σ 28 ngày Đất 972.900,9 m3; Than (vỉa) 83.444,3 tấn (ngày 28–29 chưa đồng bộ than).

## 6. Danh sách giá trị khác nhau (CSV)
- `KT_may_xuc_distinct.csv`: mã máy xúc gốc → chuẩn hoá HOA, dòng/chuyến/ngày đầu–cuối/số xe, theo nguồn (KT1 10, KT2 7, KT3 13 máy; không trùng nhau giữa các công trường).
- `KT_xe_distinct.csv`: (nguồn, số xe, đơn vị, loại xe, dòng, chuyến). **167 số xe khác nhau**, 149 xe xuất hiện ở cả 3 công trường, 11 xe chỉ ở 1 công trường; **không xe nào đổi đơn vị quản lý** giữa các công trường.
- `KT_mohinh_theo_loaixe_loaihang.csv`: (nguồn, loại xe, loại hàng, mô hình/sơ đồ m3 hoặc tấn, mức tải, dòng, chuyến).
- Loại hàng: KT1 (19) / KT2 (5) / KT3 (9) — liệt kê trong từng báo cáo.

## 7. Điểm lạ chính
1. Cache bị dòng mẫu (94.845/101.807 ở KT1; ~15.436 ngày-30 trống ở KT2; 16.807/22.492 ở KT3) → phải lọc.
2. KT3 có **hai phiên bản** (01/10 vs 16/10): ~1.316 chuyến BùnTrộn → ĐấtƯớt; thêm 404 dòng xít.
3. Hàng trộn tách đôi (bùn+đất) ở KT1; 7 khoá trùng hoàn toàn (KT1: 5, KT2: 2) nghi nhập đúp; KT3 35 nhóm trùng (khoá+tầng).
4. Tên Loại xe không nhất quán giữa/ trong công trường (xe 967–981).
5. Xe `0929` (PXVT6, SCANIA, 1 chuyến, 28,9 tấn than) và 13 dòng KT3 Số chuyến = 0.
6. `Hàng` ≠ `Loại` ở ~20 dòng KT1 do tra nhầm; cột Công trường/Công ty không dùng được; các cột dầu/N.Thu của hệ cũ đều `#N/A`/`#REF!`.
7. Hệ số trắc địa KT3 = 1 ở mọi dòng (giữ chỗ) → "Áp Trắc Địa" phải lấy từ file trắc địa khác.
8. TH.NT ô `I124` (D8T-16 NLTH 56.828) nghi dán nhầm.

## 8. Câu hỏi cần chủ dự án quyết
- **Q1** Số thẻ lương/Họ tên/nhiên liệu cho dữ liệu Khai thác: file KT không có → dùng "tài khoản thống kê" đại diện mỗi công trường, hay lấy từ nguồn khác (bảng lương/BB nghiệm thu)? TK sẽ báo LỖI nếu trống.
- **Q2** Ngày 1–2/9 (cả 3 công trường) ở đâu? Kỳ báo cáo T9 có bắt đầu 3/9 không?
- **Q3** Khoá ghép 4 trường nhưng KT1 có dòng "hàng trộn tách đôi" (Bùn trộn + Đất trộn cùng số chuyến) và nhiều Loại hàng/khoá: TK nhập 1 dòng (gộp chuyến, chọn loại nào?) hay nhiều dòng? 7 khoá trùng hoàn toàn: bỏ bớt hay cộng?
- **Q4** KT3: dùng bản 01/10 (`SL KT3`) hay 16/10 (Biểu 2A)? Dòng "xít" (404, 3.530 m3) xử lý thế nào? Dòng THAN (404, NK2→STTT) có nhập không, vào Loại hàng nào?
- **Q5** Bảng quy ước tên: Loại hàng KT1/KT2 (`Đất SX`, `Đất thải Cao Sơn`, `P. Bùn trộn`…) ↔ KT3 (`Đất.nổ`, `Thải`, `BùnTrộn`…) ↔ Danh mục TK; Đơn vị quản lý `PXVT1` hay `VT1`; xe `V21C`/`0929`; Chủng loại xe chuẩn (bỏ hậu tố `_A_VT5`).
- **Q6** Khoảng trống 14/9 ca2–18/9 ca1: ngừng sản xuất thật?
- **Q7** Tầng xúc KT1 (không có), KT2 (57% = 0): lấy từ đâu? Nhóm vỉa + nhóm tầng KT1/KT2 lấy từ đâu (KT3 có sẵn)?
- **Q8** Đối chiếu cuối: số TK phải trùng TH.NT (±?%), hay chấp nhận thống kê thô cao hơn ~2%? Hệ số quy đổi than→m3qđ và thể trọng nghiệm thu?
- **Q9** Sheet ẩn/rác (KT3 `vượt (2)` + `Sheet2` của 2023; TH.NT 10 sheet ẩn các kỳ cũ + `foxz` rất ẩn; Biểu 2A `CTNB NGÀY 2` và 31 sheet `b` trống): xác nhận bỏ qua.

## 9. CHƯA kiểm chứng
- Sheet nguồn gốc (`NHAP SO`, `ĐẤT`, `THAN`) không có trong file; thông tin chỉ qua cache (làm mới 01/10 & 16/10). Chữ cái cột là suy luận từ thứ tự trường.
- Nguyên nhân khoảng trống 14–18/9; nghĩa của `đcs/ttcs/ncs`; quan hệ SPNT (`ĐẤT`) và THAN (`THAN`); hệ số quy đổi than; công thức Gama cuối cùng.
- Chưa so với Danh mục thiết bị/loại hàng thật của TK (chưa mở DB), chưa đối với file Vận tải (agent khác).

## 10. Cách tái lập
```
D="D:/EcoTel/3. Dự án/TKV Công ty than Cao sơn/Phần mềm thống kê/Dữ liệu"; SP=<scratchpad>
docker run --rm -m 1500m --entrypoint node -v "$D":/data:ro -v "$SP/xl":/xl dieuphoimm_backend_img \
  /xl/KT_cache.js "/data/<file>.xlsx" <số cache> def|dump <đường ra>
# rồi lọc bản ghi thật (Ngày ≠ trống; KT2: Công trường = KT2; KT3 bỏ Roda=xít) và tổng hợp bằng /xl/KT_run.js + snippet
```
Script: `KT_cache.js` (giải mã pivot cache), `KT_run.js`/`KT_s*.js` (tổng hợp), `KT_pivotleaf.js` (lá pivot hiển thị), `KT_cols.js` (in cột chọn), `KT_b2a_days.js` (biểu ngày 2A).
