# MÔ PHỎNG ĐỐI CHIẾU Vận tải ↔ Khai thác — tháng 9/2026 (chưa ghi gì vào DB)

Sinh tự động bởi `TR_main.js` + `TR_report.js` (đọc `TR_summary.json`). **Không có họ tên / số thẻ** trong file này.

## 1. Phương pháp (bám sát `ReconciliationService`)
- **Khoá ghép** = Ngày + Ca + Máy xúc + Số xe (mã chuẩn hoá: máy xúc HOA, bỏ dấu chấm cuối; xe HOA; alias `V21/V21C→V21 COI`, `V22…`, `V23…`, `0929→S0929`). Hai phía đều lấy từ **dữ liệu payload đã dựng** (VT: 24.368 chuyến-dòng; KT: 15.534 chuyến-dòng đã ánh xạ loại hàng).
- `pairGroup` nhân bản đúng thuật toán Java: nhóm ≤1 chuyến mỗi phía → ghép thẳng (không mơ hồ); nhóm nhiều hơn → **vòng 1** lặp ghép các cặp khớp DUY NHẤT hai chiều (`isMatched`), **vòng 2** ghép tạm phần còn lại theo thứ tự nguồn và đánh dấu **mơ hồ**.
- `isMatched` = cùng chủng loại hàng + cùng số chuyến + cùng mức tải (loại + giá trị tuỳ chọn) + cùng nhân viên (số thẻ). **Duyệt được qua API** = `matched` ∧ ¬`pairingAmbiguous` ∧ (nhóm ≤1/≤1 hoặc `assertValidPair` mutual-unique trên TOÀN BỘ chuyến cùng khoá).
- Nhân viên phiếu Khai thác lấy từ phiếu Vận tải cùng (ngày, ca, xe[, máy xúc]) (IMPORT_SPEC D8) ⇒ điều kiện "cùng nhân viên" **đúng theo cách dựng, không phải bằng chứng độc lập** (file Khai thác không có nhân viên). Mọi "lệch nhân viên" = 0 là hệ quả của quy ước này.

## 2. Kết quả tổng quát (phương án cơ sở = đúng đặc tả: 1 dòng nguồn → 1 chuyến)
| Chỉ tiêu | Giá trị |
| --- | --- |
| Khoá (ngày,ca,máy xúc,xe) có ở Vận tải / Khai thác / cả hai | 14.092 / 13.061 / **13.013** (= 92,3% khoá VT, 99,6% khoá KT) |
| Chuyến-dòng VT / tổng số chuyến VT | 24.368 / 111.779 |
| Chuyến-dòng KT / tổng số chuyến KT (đã nạp) | 15.534 / 91.728 |
| Cặp có CẢ HAI phía | 15.237 |
| — trong đó **khớp & duyệt được** (matched, không mơ hồ) | **9.840** (64,6% số cặp) |
| — **mơ hồ** (nhóm nhiều chuyến cùng khoá, ghép tạm vòng 2) | 5.344 (35,1%); trong đó 181 cặp có nội dung khớp nhưng vẫn mơ hồ nên API chặn |
| — **lệch 1-1** (nhóm chỉ 1 chuyến mỗi phía, khác nội dung) | 53 (0,3%) |
| Chuyến VT chỉ có một phía (không cặp) | 9.131 chuyến-dòng / 38.768 chuyến |
| Chuyến KT chỉ có một phía (không cặp) | 297 chuyến-dòng / 1.477 chuyến |
| **Số chuyến VT duyệt được / tổng** | **46.045 / 111.779 = 41,2%** |
| Số chuyến VT duyệt được / (tổng − chuyến ở máy xúc STTT/MS/H6 không có bên KT) | 49,7%  (loại 19.111 chuyến) |
| **Số chuyến KT duyệt được / tổng** | **46.045 / 91.728 = 50,2%** |

Hình dạng nhóm khoá (số chuyến-dòng mỗi phía; n = nhiều hơn 1):
| Dạng nhóm | Số khoá | Chuyến VT trong nhóm |
| --- | --- | --- |
| 1VT-1KT | 6.713 | 34.681 |
| nVT-1KT | 4.273 | 37.967 |
| nVT-nKT | 1.821 | 18.538 |
| nVT-0KT | 591 | 16.179 |
| 1VT-0KT | 488 | 3.326 |
| 1VT-nKT | 206 | 1.088 |
| 0VT-1KT | 39 | 0 |
| 0VT-nKT | 9 | 0 |

> **Phát hiện quan trọng nhất:** engine ghép **1 chuyến-dòng VT ↔ 1 chuyến-dòng KT**. Vận tải ghi **nhiều dòng cho cùng (ca, xe, máy xúc, loại hàng)** khi đi nhiều tuyến/điểm dỡ khác nhau (mô hình phiếu-đầu + n-dòng-chuyến bắt buộc phải giữ để tính sản lượng), còn Khai thác chỉ ghi **một dòng gộp** (xe, loại hàng, tổng chuyến). Kết quả: nhóm "nVT-1KT" chiếm 4.273 khoá / 37.967 chuyến VT
> và **không bao giờ duyệt được 1-1** dù tổng số chuyến hai bên bằng nhau. Xem mục 6 (ước lượng nếu đối chiếu ở mức gộp).

## 3. Phân loại chuyến Vận tải (tính theo số chuyến)
### 3.1 Theo phân xưởng vận tải (PXVT)
| PX | Tổng chuyến | KHỚP (duyệt được) | Khớp nhưng API chặn | LỆCH 1-1 | Nhiều chuyến cùng khoá, TỔNG khớp | Nhiều chuyến cùng khoá, tổng lệch/khác loại | Không có phía bên kia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VT1 | 16.077 | 8.504 (52,9%) | 0 (0%) | 68 (0,4%) | 5.723 (35,6%) | 1.640 (10,2%) | 142 (0,9%) |
| VT3 | 16.952 | 7.660 (45,2%) | 0 (0%) | 91 (0,5%) | 7.523 (44,4%) | 1.645 (9,7%) | 33 (0,2%) |
| VT4 | 24.445 | 8.625 (35,3%) | 0 (0%) | 63 (0,3%) | 10.126 (41,4%) | 1.984 (8,1%) | 3.647 (14,9%) |
| VT5 | 19.421 | 9.140 (47,1%) | 0 (0%) | 45 (0,2%) | 8.134 (41,9%) | 1.978 (10,2%) | 124 (0,6%) |
| VT6 | 15.169 | 1 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 15.168 (100%) |
| VT9 | 19.715 | 12.115 (61,5%) | 0 (0%) | 45 (0,2%) | 6.256 (31,7%) | 908 (4,6%) | 391 (2%) |
| **Cộng** | 111.779 | 46.045 (41,2%) | 0 (0%) | 312 (0,3%) | 37.762 (33,8%) | 8.155 (7,3%) | 19.505 (17,4%) |

### 3.2 Theo công trường của máy xúc (cột QLY THIẾT BỊ của VT)
| Công trường | Tổng chuyến | KHỚP (duyệt được) | Khớp nhưng API chặn | LỆCH 1-1 | Nhiều chuyến cùng khoá, TỔNG khớp | Nhiều chuyến cùng khoá, tổng lệch/khác loại | Không có phía bên kia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CKCD | 416 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 416 (100%) |
| KT1 | 41.187 | 17.118 (41,6%) | 0 (0%) | 134 (0,3%) | 18.280 (44,4%) | 5.372 (13%) | 283 (0,7%) |
| KT2 | 13.308 | 7.381 (55,5%) | 0 (0%) | 178 (1,3%) | 5.210 (39,1%) | 428 (3,2%) | 111 (0,8%) |
| KT3 | 38.173 | 21.546 (56,4%) | 0 (0%) | 0 (0%) | 14.272 (37,4%) | 2.355 (6,2%) | 0 (0%) |
| STTT | 18.695 | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 18.695 (100%) |

### 3.3 Chuyến Khai thác theo công trường (nguồn KT)
| Công trường | Tổng chuyến | KHỚP (duyệt được) | Khớp nhưng API chặn | LỆCH 1-1 | Nhiều chuyến cùng khoá, TỔNG khớp | Nhiều chuyến cùng khoá, tổng lệch/khác loại | Không có phía bên kia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KT1 | 42.566 | 17.118 (40,2%) | 0 (0%) | 129 (0,3%) | 18.280 (42,9%) | 6.915 (16,2%) | 124 (0,3%) |
| KT2 | 13.295 | 7.381 (55,5%) | 0 (0%) | 179 (1,3%) | 5.210 (39,2%) | 410 (3,1%) | 115 (0,9%) |
| KT3 | 33.660 | 20.202 (60%) | 0 (0%) | 0 (0%) | 13.409 (39,8%) | 49 (0,1%) | 0 (0%) |
| KT3 (than NK2) | 2.207 | 1.344 (60,9%) | 0 (0%) | 0 (0%) | 863 (39,1%) | 0 (0%) | 0 (0%) |

## 4. Theo ngày (chuyến VT)
| Ngày | VT chuyến | KT chuyến | Cặp khớp duyệt được | VT chuyến khớp | % VT khớp | Lệch 1-1 | Nhiều dòng, tổng khớp | Nhiều dòng, tổng lệch | Không có KT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 4.182 | 3.673 | 291 | 1.518 | 36,3% | 0 | 1.990 | 160 | 514 |
| 4 | 4.333 | 3.656 | 356 | 1.702 | 39,3% | 0 | 1.846 | 165 | 620 |
| 5 | 4.824 | 4.064 | 380 | 1.855 | 38,5% | 18 | 1.810 | 404 | 737 |
| 6 | 4.406 | 4.027 | 415 | 1.699 | 38,6% | 8 | 1.720 | 415 | 564 |
| 7 | 4.721 | 3.924 | 491 | 2.142 | 45,4% | 0 | 1.735 | 208 | 636 |
| 8 | 4.274 | 3.527 | 374 | 1.622 | 38% | 4 | 1.832 | 83 | 733 |
| 9 | 4.524 | 3.788 | 456 | 2.206 | 48,8% | 2 | 1.455 | 150 | 711 |
| 10 | 4.426 | 3.642 | 343 | 1.829 | 41,3% | 0 | 1.663 | 237 | 697 |
| 11 | 4.722 | 3.868 | 476 | 2.205 | 46,7% | 0 | 1.505 | 262 | 750 |
| 12 | 4.659 | 3.882 | 532 | 2.241 | 48,1% | 2 | 1.578 | 119 | 719 |
| 13 | 4.582 | 3.871 | 424 | 1.896 | 41,4% | 0 | 1.895 | 139 | 652 |
| 14 | 740 | 260 | 112 | 141 | 19,1% | 0 | 119 | 2 | 478 |
| 15 | 2.135 | 1.800 | 206 | 1.009 | 47,3% | 0 | 766 | 75 | 285 |
| 16 | 1.039 | 839 | 121 | 520 | 50% | 0 | 300 | 18 | 201 |
| 17 | 1.323 | 811 | 59 | 203 | 15,3% | 0 | 584 | 17 | 519 |
| 18 | 3.328 | 2.559 | 235 | 1.197 | 36% | 9 | 1.305 | 131 | 686 |
| 19 | 4.822 | 3.800 | 355 | 2.068 | 42,9% | 10 | 1.547 | 376 | 821 |
| 20 | 4.985 | 3.943 | 456 | 2.020 | 40,5% | 1 | 1.594 | 514 | 856 |
| 21 | 4.688 | 3.739 | 380 | 1.693 | 36,1% | 3 | 1.522 | 430 | 1.040 |
| 22 | 4.499 | 3.680 | 371 | 1.696 | 37,7% | 0 | 1.480 | 446 | 877 |
| 23 | 4.357 | 3.684 | 464 | 2.078 | 47,7% | 0 | 1.338 | 201 | 740 |
| 24 | 3.578 | 2.904 | 390 | 1.877 | 52,5% | 0 | 602 | 278 | 821 |
| 25 | 4.473 | 3.654 | 298 | 1.898 | 42,4% | 29 | 1.206 | 400 | 940 |
| 26 | 4.259 | 3.551 | 323 | 1.793 | 42,1% | 11 | 1.412 | 247 | 796 |
| 27 | 4.189 | 3.531 | 385 | 1.632 | 39% | 17 | 1.483 | 305 | 752 |
| 28 | 4.710 | 3.817 | 399 | 1.973 | 41,9% | 21 | 1.311 | 717 | 688 |
| 29 | 4.452 | 3.547 | 361 | 1.550 | 34,8% | 33 | 1.420 | 629 | 820 |
| 30 | 4.549 | 3.687 | 387 | 1.782 | 39,2% | 144 | 744 | 1.027 | 852 |

Nhận xét: tỷ lệ "lệch 1-1" và "nhiều dòng, tổng lệch" tăng rõ ở ngày 28–30 (ngày 30: 144 chuyến lệch 1-1, 1.027 chuyến nhiều dòng tổng lệch), tập trung ở KT1 và KT2 — khớp với ghi chú RP_00 về KT1/KT2 ngày 30 lệch ±1,6–1,9 nghìn m3 so với tinh toán (nguyên nhân CHƯA xác minh). Ngày 14–17 (mưa) ít chuyến nên tỷ lệ dao động.

## 5. Nguyên nhân chi tiết
### 5.1 Chuyến VT không duyệt được
| Nguyên nhân | Chuyến-dòng | Số chuyến | % tổng chuyến VT |
| --- | --- | --- | --- |
| KHỚP (duyệt được) | 9.840 | 46.045 | 41,2% |
| MƠ HỒ (nhiều chuyến cùng khoá): tổng số chuyến theo (loại hàng, mức tải) KHỚP — VT tách nhiều dòng/tuyến | 4.512 | 22.491 | 20,1% |
| KHÔNG CÓ KT: máy xúc không có bên Khai thác (XL.STTT-1) | 2.935 | 17.346 | 15,5% |
| DƯ trong nhóm nhiều chuyến: tổng số chuyến theo (loại hàng, mức tải) KHỚP — VT tách nhiều dòng/tuyến | 4.681 | 15.271 | 13,7% |
| DƯ trong nhóm nhiều chuyến: loại hàng không có ở phía bên kia trong khoá | 800 | 2.748 | 2,5% |
| MƠ HỒ (nhiều chuyến cùng khoá): tổng số chuyến theo (loại hàng, mức tải) LỆCH | 461 | 2.693 | 2,4% |
| MƠ HỒ (nhiều chuyến cùng khoá): loại hàng không có ở phía bên kia trong khoá | 371 | 1.470 | 1,3% |
| DƯ trong nhóm nhiều chuyến: tổng số chuyến theo (loại hàng, mức tải) LỆCH | 282 | 1.244 | 1,1% |
| KHÔNG CÓ KT: máy xúc không có bên Khai thác (MS3) | 141 | 696 | 0,6% |
| KHÔNG CÓ KT: máy xúc không có bên Khai thác (MS1) | 133 | 653 | 0,6% |
| KHÔNG CÓ KT: máy xúc không có bên Khai thác (H6) | 71 | 416 | 0,4% |
| KHÔNG CÓ KT: KT có xe này trong ca nhưng ở máy xúc khác | 71 | 243 | 0,2% |
| LỆCH 1-1: số chuyến | 25 | 184 | 0,2% |
| KHÔNG CÓ KT: KT không có bản ghi (ngày, ca, xe) này | 17 | 151 | 0,1% |
| LỆCH 1-1: loại hàng | 27 | 126 | 0,1% |
| LỆCH 1-1: loại hàng + số chuyến | 1 | 2 | 0% |

### 5.2 Chuyến KT không duyệt được
| Nguyên nhân | Chuyến-dòng | Số chuyến | % tổng chuyến KT |
| --- | --- | --- | --- |
| KHỚP (duyệt được) | 9.840 | 46.045 | 50,2% |
| MƠ HỒ (nhiều chuyến cùng khoá): tổng số chuyến theo (loại hàng, mức tải) KHỚP — KT nhiều dòng | 4.525 | 37.724 | 41,1% |
| MƠ HỒ (nhiều chuyến cùng khoá): tổng số chuyến theo (loại hàng, mức tải) LỆCH | 567 | 4.731 | 5,2% |
| MƠ HỒ (nhiều chuyến cùng khoá): loại hàng không có ở phía bên kia trong khoá | 252 | 1.443 | 1,6% |
| DƯ trong nhóm nhiều chuyến: tổng số chuyến theo (loại hàng, mức tải) LỆCH | 175 | 1.034 | 1,1% |
| LỆCH 1-1: số chuyến | 25 | 181 | 0,2% |
| DƯ trong nhóm nhiều chuyến: loại hàng không có ở phía bên kia trong khoá | 51 | 166 | 0,2% |
| KHÔNG CÓ VT: VT có xe này trong ca nhưng ở máy xúc khác | 41 | 146 | 0,2% |
| LỆCH 1-1: loại hàng | 27 | 126 | 0,1% |
| KHÔNG CÓ VT: máy xúc không có bên Vận tải (U6) | 13 | 72 | 0,1% |
| DƯ trong nhóm nhiều chuyến: tổng số chuyến theo (loại hàng, mức tải) KHỚP — KT nhiều dòng | 14 | 38 | 0% |
| KHÔNG CÓ VT: VT không có bản ghi (ngày, ca, xe) này | 3 | 21 | 0% |
| LỆCH 1-1: loại hàng + số chuyến | 1 | 1 | 0% |

### 5.3 Lệch 1-1 theo trường (nhóm chỉ 1 chuyến mỗi phía)
| Trường lệch | Số cặp |
| --- | --- |
| loại hàng | 27 |
| số chuyến | 25 |
| loại hàng + số chuyến | 1 |
Ghi chú: lệch **nhân viên = 0** và lệch **mức tải = 0** (mức tải hai phía cùng nguồn Roda/Đủ tải); lệch loại hàng là **loại hàng bên KT đã ánh xạ ≠ loại hàng VT** (ví dụ KT2 "Đất SX" nhưng VT ghi `Dthai.` — 18 khoá).

### 5.4 Chuyến VT không có Khai thác — theo máy xúc
| Máy xúc | Nguyên nhân | Chuyến-dòng | Số chuyến |
| --- | --- | --- | --- |
| XL.STTT-1 | máy xúc không có bên Khai thác (XL.STTT-1) | 2.935 | 17.346 |
| MS3 | máy xúc không có bên Khai thác (MS3) | 141 | 696 |
| MS1 | máy xúc không có bên Khai thác (MS1) | 133 | 653 |
| H6 | máy xúc không có bên Khai thác (H6) | 71 | 416 |
| P10 | KT không có bản ghi (ngày, ca, xe) này | 10 | 116 |
| P17 | KT có xe này trong ca nhưng ở máy xúc khác | 33 | 106 |
| U7 | KT có xe này trong ca nhưng ở máy xúc khác | 25 | 88 |
| HT7 | KT có xe này trong ca nhưng ở máy xúc khác | 5 | 32 |
| P27 | KT không có bản ghi (ngày, ca, xe) này | 1 | 12 |
| U4 | KT không có bản ghi (ngày, ca, xe) này | 1 | 9 |
| U5 | KT có xe này trong ca nhưng ở máy xúc khác | 2 | 8 |
| P18 | KT không có bản ghi (ngày, ca, xe) này | 2 | 7 |
| HT7 | KT không có bản ghi (ngày, ca, xe) này | 3 | 7 |
| U2 | KT có xe này trong ca nhưng ở máy xúc khác | 2 | 5 |
| P18 | KT có xe này trong ca nhưng ở máy xúc khác | 2 | 2 |
| U8 | KT có xe này trong ca nhưng ở máy xúc khác | 1 | 1 |
Máy xúc `XL.STTT-1`, `MS1`, `MS3`, `H6` (STTT / CKCĐ — dòng than, xít, cám, SPNT bãi chứa; toàn bộ PXVT6 Scania) **không thuộc công trường Khai thác nào** nên không có chuyến Khai thác để ghép. File chi tiết: `recon_vt_khong_co_kt_theo_may_xuc.csv`.

### 5.5 Chuyến KT không có Vận tải
| Máy xúc | Nguồn | Nguyên nhân | Chuyến-dòng | Số chuyến |
| --- | --- | --- | --- | --- |
| P14 | KT1 | VT có xe này trong ca nhưng ở máy xúc khác | 33 | 103 |
| U6 | KT2 | máy xúc không có bên Vận tải (U6) | 13 | 72 |
| U7 | KT2 | VT có xe này trong ca nhưng ở máy xúc khác | 2 | 14 |
| P27 | KT1 | VT có xe này trong ca nhưng ở máy xúc khác | 1 | 12 |
| U4 | KT2 | VT không có bản ghi (ngày, ca, xe) này | 1 | 9 |
| P18 | KT1 | VT có xe này trong ca nhưng ở máy xúc khác | 2 | 8 |
| U8 | KT2 | VT có xe này trong ca nhưng ở máy xúc khác | 1 | 7 |
| U2 | KT2 | VT không có bản ghi (ngày, ca, xe) này | 1 | 6 |
| U5 | KT2 | VT không có bản ghi (ngày, ca, xe) này | 1 | 6 |
| P10 | KT1 | VT có xe này trong ca nhưng ở máy xúc khác | 1 | 1 |

## 6. Các phương án GIẢ ĐỊNH (chỉ để ước lượng, KHÔNG nạp)
| Phương án | Cặp duyệt được | Chuyến VT duyệt được | % chuyến VT | Ghi chú |
| --- | --- | --- | --- | --- |
| **Cơ sở (đặc tả)** | 9.840 | 46.045 | 41,2% | 1 dòng nguồn = 1 chuyến |
| Tách/gộp nửa "trộn" (KT3 `BùnTrộn` → B.TRON+DBTron; KT1/KT2 cặp "Bùn trộn"+"Đất trộn" → D.UOT khi VT ghi D.UOT) | 10.597 | 49.563 | 44,3% | tách 506 chuyến-dòng KT3, gộp 253 cặp KT1/KT2; **sửa dữ liệu KT cho khớp VT — cần chủ dự án đồng ý** |
| Đối chiếu ở **mức gộp** (gộp các dòng cùng khoá+loại hàng+mức tải+nhân viên ở cả hai phía) | 14.262 | 83.713 | 74,9% | cận trên lý thuyết: 90,3% nếu loại 19.111 chuyến STTT; còn lệch thật: 264 cặp lệch 1-1 + 522 mơ hồ |

## 7. Hệ quả cho bước duyệt & tính sản lượng
- Chỉ **9.840 cặp** (41,2% số chuyến VT) đủ điều kiện duyệt tự động theo D9. Phần còn lại **giữ nguyên PENDING ở Đối chiếu** (đúng yêu cầu "lệch thì để nguyên").
- QĐ-16: kỳ báo cáo **chỉ tính được khi MỌI chuyến VT trong kỳ đã duyệt** ⇒ với dữ liệu này `calculate` sẽ bị từ chối (còn 14.528 chuyến-dòng VT chưa duyệt), kể cả khi chủ dự án chấp nhận phần "tổng khớp".
- Không có cách duyệt qua API cho chuyến VT thiếu bên KT (APPROVED một phía bị chặn). Muốn tính được phải: (a) đổi quy tắc ghép/duyệt ở mã nguồn (đối chiếu mức gộp), hoặc (b) chủ dự án cho phép duyệt bằng SQL có kiểm soát các nhóm "tổng khớp", hoặc (c) sinh phiếu KT bổ sung cho dòng STTT. Đây là quyết định của chủ dự án — tác tử không tự làm.
