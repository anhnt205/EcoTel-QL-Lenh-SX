# TD_00 — Tổng quan 3 file: Trắc địa T9, Chênh cao 2026, Bảng thanh toán lương T9

Báo cáo chi tiết: `TD_TRAC_DIA.md`, `TD_CHENH_CAO.md`, `TD_BANG_LUONG.md` (cùng thư mục `<scratchpad>/xl/reports/`). Tác tử TD, chỉ đọc; mỗi lần một container, trần RAM 1–2 GB.

## 1. Phát hiện quan trọng nhất
1. **`báo cáo gửi trắc địa t9.xlsx` chỉ là 2 pivot (SPNT.VIA; bãi thải Khe Chàm + Bằng Nâu) trên cache = bản `tinh toan` 14/10/2026** — **trùng từng byte** với cache của file "Than tiêu thụ th9 (E Hằng)". Số trắc địa đã nằm trong cột `TĐ.*`/`HSTĐ`; từ đó rút được **667 hệ số trắc địa theo khoá `Nhóm vỉa+M.xuc` × SP nghiệm thu** (Áp Trắc Địa), mỗi khoá một giá trị duy nhất.
2. **`Báo cáo chênh cao năm 2026.xlsx` chứa `tinh toan` cả năm (243.521 dòng, tháng 1–9; tháng 9 là bản 06/10, cũ hơn 14/10 và 16/10: dư 2.830 chuyến đếm kép bùn)**. "Chênh cao" = **chênh lệch cao độ (m) dùng tra định mức nhiên liệu** (chênh cao TT NL = max(0, nâng tải), có công thức trung bình trọng số khi có dốc cục bộ; đã kiểm 100% dòng). Lấy được: **lưới HS điều chỉnh NLĐM T1–T9** (mọi ô có giá trị, tháng 9 hầu hết = 1; HD465-7R_C_DAT = 1,02), **5.631 ô lưới ĐMNL**, bảng `NS XE (QĐ 3305)` 80 cung độ × 27 cột, ĐMNS máy xúc, ĐMNL máy mỏ.
3. **Cache `externalLink` của file chênh cao giữ nguyên danh sách "DSCBCNV/DSXE/DSMAY"** (sheet `KBTC Xe&May Xuc`): **618 người (số thẻ, họ tên, mã chức vụ)**, 340 dòng xe, 93 dòng máy. Nhưng **số thẻ thuộc dải 0–3999 và 0/462 thẻ trùng sổ vận tải tháng 9** (sổ dùng dải 4065–9350 — nhiều khả năng bảng mã cũ hoặc một loại mã khác, chưa kiểm chứng); chỉ nối được theo họ tên (178 người). ⇒ gợi ý cho cả nhóm: **kiểm tra `xl/externalLinks/` và pivot cache của mọi file khác** — có thể còn bảng tra nhúng.
4. **`Bảng thanh toán lương- Tháng 9.xls` KHÔNG phải bảng lương cá nhân**: là *bản thanh toán sản lượng* từng PX (mã hàng TTL × loại xe_hạng × Roda), không có số thẻ/họ tên. Số của nó = Σ cột `TĐ.*` của `tinh toan` 14/10 (VT3 và VT6 trùng tuyệt đối). Trong file còn một bản `tinh toan` tháng 9 trùng cache 14/10 (+3 dòng rác tháng 6).
5. **Khu vực xúc chỉ có `CS` trong cả 9 tháng** (không có `KC`) → cột `KC` của lưới HS để trống.

## 2. Tóm tắt từng file
| File | Là gì | Quy mô | Phạm vi | Ánh xạ TK | Vấn đề lớn nhất |
|---|---|---|---|---|---|
| `báo cáo gửi trắc địa t9.xlsx` | 2 pivot (`spnt `: 59 tổ hợp SPNT.VIA; `bt`: 250 tổ hợp bãi thải, Dat_SX) + cache tinh toan 14/10 | 11,5 MB; 55.149 bản ghi × 172 trường | ngày 3–30/9 | Áp Trắc Địa, STD, đối chiếu; cache = nguồn Nhập liệu Vận tải | chỉ có kết quả đã nhân HSTĐ; thiếu STD(SPNT) trong thiết kế TK |
| `Báo cáo chênh cao năm 2026.xlsx` | báo cáo chênh cao bq + quyết toán NL năm 2026 theo xe | 370 MB, 11 sheet; `tinh toan` 244.806 dòng × 196 cột | T1–T9 (NL thực tế chỉ T1–T7) | HS_DIEU_CHINH_NLDM, ĐMNL, NANG_SUAT_XE, Danh mục Xe/Máy | bản tháng 9 cũ (06/10); khu vực KC không có |
| `Bảng thanh toán lương- Tháng 9.xls` | bản thanh toán sản lượng 6 PX + `tinh toan` T9 | 72 MB, 23 sheet | T9 (nhiều sheet cũ 2024/2025) | chỉ đối chiếu kết quả | **không có nhân sự/số thẻ** |

## 3. Dùng được cho phần nào của TK
| Danh mục / Màn | Nguồn trong 3 file | File CSV |
|---|---|---|
| **Nhân viên** | DSCBCNV (618; dải thẻ 0–3999, lệch sổ) + ánh xạ họ tên → thẻ trong sổ (178) | `TD_CC_DSCBCNV_sothe_hoten_chucvu.csv`, `TD_CC_the_cu_moi_theo_ho_ten.csv`, `TD_CC_the_luong_doi_chieu_so_van_tai.csv`; **không** có operator máy xúc, **không** có thẻ mới đầy đủ |
| **Thiết bị: xe** | 193 xe chạy 2026 (PX/hạng đổi theo tháng: 44 xe); DSXE 340 dòng | `TD_CC_xe_danhmuc_T1-9.csv`, `TD_CC_DSXE_tu_KBTC.csv` |
| **Thiết bị: máy xúc** | 35 máy 2026 (kiểu máy, hạng, gầu, đơn vị quản lý); DSMAY 93 | `TD_CC_maxuc_danhmuc_T1-9.csv`, `TD_CC_DSMAY_tu_KBTC.csv` |
| **Áp Trắc Địa** | HS m3/tấn/Tkm theo (khoá × SP nghiệm thu), 667 dòng | `TD_AP_TDIA_T9_theo_khoa.csv` |
| **STD** | thể trọng TĐ từng dòng; SPNT.VIA 2,296 | (trong cache; không có bảng STD riêng) |
| **HS điều chỉnh NLĐM** | 17 khoá × T1–T9 (CS) | `TD_CC_luoi_HS_NLDM_thang1-9_tu_tinhtoan.csv` (+ `…HSDML…` toàn 1) |
| **ĐMNL** | 5.631 ô (22 loại xe×đích × cung độ × nâng tải) | `TD_CC_DMNL_o_luoi_tu_tinhtoan.csv` |
| **Năng suất xe** | lưới 80×27 (QĐ 3305) + ĐMNS xúc thủy lực + ĐMNL máy mỏ | `TD_CC_NS_XE_3305_…csv`, `TD_CC_DMNS_XucThuyLuc_…csv`, `TD_CC_DM_NL_MayMo_…csv` |
| **Chênh cao** | công thức + bq theo loại xe × tháng | `TD_CC_chenhcao_bq_theo_thang_loaixe.csv`, `TD_CC_kiem_tra_cong_thuc_chenh_cao.txt` |
| Chỉ đối chiếu | bản thanh toán PX; NLĐM theo xe×tháng; NL thực tế T1–T7; quyết toán NL T7 | `TD_luong_*.csv`, `TD_CC_NLDM_theo_xe_thang_T1-9.csv`, `TD_CC_nl_su_dung_T1-12.csv`, `TD_CC_quyet_toan_NL_thang7.csv`, `TD_CC_tong_thang_pxvt.csv` |

## 4. Số tổng tháng 9 để đối chiếu (bản 14/10 — chuẩn)
- 24.935 dòng có xe; **111.779 chuyến**; m3 thống kê 3.196.869,3; **m3 TĐ 3.118.525,2**; **Tkm TĐ 34.389.001,6**; than SX TĐ **87.121 t** (Tkm 331.523).
- Theo PX (Tkm TĐ, bản thanh toán): VT1 6.711.166 | VT3 7.558.199 | VT4 7.039.937 (tổng nghiệm thu 7.063.234) | VT5 7.736.828 | VT6 128.250 | VT9 5.191.331.
- Bản 06/10 (file chênh cao): 25.630 dòng, 114.609 chuyến, TĐ m3 3.145.577,8, Tkm TĐ 34.090.408,7, NLĐM hiện hành 4.489.930,1 L.
- SPNT.VIA (file Trắc địa): 1.218 chuyến; m3 23.054,2 → 23.078; Tkm 222.232,1 → 223.806; tấn 52.609,7 → 52.987. Bãi thải Khe Chàm + Bằng Nâu (Dat_SX): m3 TĐ 662.563,31; Tkm TĐ 15.129.951,38.

## 5. Điểm lạ / rủi ro chung
- **Ba phiên bản `tinh toan` tháng 9** (06/10, 14/10, 16/10) khác nhau về chuyến, nơi nhận (31 dòng p11) và HS; cần chọn bản chuẩn trước khi lập "đáp án".
- Số thẻ lương trong sổ tháng 9 (4xxx–9xxx) khác hẳn bảng nhân sự cũ (0–3999): rủi ro nhập sai danh mục nếu dùng DSCBCNV.
- Thuộc tính xe đổi theo tháng (PX7 giải thể; xe đổi PX/hạng); `Khu vực KC` chưa từng có.
- Nhãn cũ (kỳ giá dầu tháng 6, tháng 3/2026, 2024/2025) còn lẫn trong dữ liệu tháng 9.
- Dữ liệu cá nhân (họ tên + số thẻ) nằm trong các CSV — không đưa lên repo/chat.

## 6. CHƯA kiểm chứng
- Chữ "TTL"; "bt" = bãi thải; hướng luồng "gửi Trắc địa"; 3.753 dòng nâng tải ≠ tầng dỡ − tầng nhận; vai trò 162 người không mã chức vụ; vì sao VT4 thiếu 23,3 k Tkm trong bản thanh toán; 94.720 L chênh VT1 trong `NL sử dụng` T7.

## 7. Câu hỏi cho chủ dự án
1. Bản `tinh toan` nào là chuẩn tháng 9 (06/10, 14/10, 16/10)? Dung sai khi đối chiếu?
2. Danh sách nhân viên **số thẻ mới** (4xxx–9xxx) + họ tên + chức vụ (kể cả công nhân vận hành máy xúc KT1/KT2/KT3) do ai cấp? File "bảng lương" thật ở đâu?
3. Áp Trắc Địa: nguồn là file Trắc địa gửi (m3 theo khoá) hay suy từ `tinh toan`? Có cần màn STD(SPNT) (2,296)?
4. HS NLĐM cho khu vực KC và cột NAM.* lấy ở đâu? Có nhập T1–T8 không?
5. Thuộc tính xe (PX, hạng) lưu theo hiệu lực thời gian hay theo dòng chuyến?
6. TK có phải sinh bản thanh toán sản lượng theo PX × mã TTL × loại xe_hạng_Roda không?

## 8. Cách tái lập
```
D="D:/EcoTel/3. Dự án/TKV Công ty than Cao sơn/Phần mềm thống kê/Dữ liệu"; SP=<scratchpad>
# cache: node /xl/KT_cache.js "<xlsx>" <n> dump out.tsv    | cache lọc dòng thật: /xl/TD_cachedump.js <xlsx> <n> out.tsv
# externalLink: /xl/TD_ext2.js <xlsx> <outdir>               | sheet lớn 1 lượt: /xl/TD_sheet3agg.js <xlsx> 3 out.json
# .xls: python:3.12-slim + xlrd, /xl/TD_xls*.py              | phân tích: /xl/TD_a*.py … TD_g*.py (python -I)
```
Danh sách CSV đầy đủ: `ls <scratchpad>/xl/reports/TD_*`.
