# BÁO CÁO GIAI ĐOẠN 2 — Nạp phiếu Vận tải + Khai thác tháng 9/2026 vào TK local và duyệt cặp khớp

Phạm vi: **chỉ DB local** (`dpmm-preview-tk_postgres-1`, preview `localhost:6869`), không đụng server gdata. Ghi **chỉ qua API Thống kê** (`POST /transport-reports/bulk`, `POST /excavation-reports/bulk`, `POST /reconciliation/decisions/bulk`); SQL chỉ dùng để SELECT kiểm chứng và `pg_dump`. Không tạo Kỳ báo cáo, không `calculate`. Không in họ tên / số thẻ / mật khẩu / token. Sinh bởi `TR2_report.js` (thư mục `$XL/load/`).

## 1. Tóm tắt
- **Nạp**: Vận tải **9.924 phiếu / 24.368 trip / 111.779 chuyến**; Khai thác **9.597 phiếu / 15.534 trip / 91.728 chuyến** — **khớp 100% payload và TR_summary.json** (28 ngày × 2 loại, 0 lệch, 0 lỗi API trong nạp).
- **Đối chiếu THẬT (API) = mô phỏng, khớp tuyệt đối**: 9.840 cặp khớp & không mơ hồ, 5.344 mơ hồ, 53 lệch 1-1, 9.131 chỉ Vận tải, 297 chỉ Khai thác; 0/14.140 khoá (ngày,ca,xe,máy xúc) khác nhau.
- **Đã duyệt: 9.840 cặp** (APPROVED cả hai bên; 46.045 chuyến VT = 46.045 chuyến KT; 41,2% số chuyến VT). Danh sách cặp đã duyệt trùng đúng `recon_pairs_matched.csv` (chênh lệch 0). Không có cặp nào duyệt một phía (0).
- Mọi dòng còn lại **giữ nguyên PENDING** (lệch, mơ hồ, một phía) — không sửa số liệu, không duyệt SQL, không đổi quy tắc ghép.
- Không có Báo chuyến / bảng sản lượng nào tự phát sinh (xem mục 7). Lỗi API: nạp 0, duyệt 0.

## 2. Cách thực hiện
1. Đổi tên → id bằng `id_maps.json` (ca theo tên; xe/máy xúc theo mã chuẩn hoá + alias; nhân viên theo `salaryCode`/`CHUACO-*`; khu vực, nơi nhận, nơi chất, nơi dỡ, loại hàng theo tên). Dry-run cả 28 ngày: **0 tên không tra được**, 0 khoá phiếu trùng.
2. `TR2_load.js`: mỗi ngày nạp Vận tải rồi Khai thác, lô ≤100 phiếu/`POST /bulk` (1 transaction), nghỉ 0,8 s giữa các lô; trước khi nạp tra `GET` các phiếu đã có trong ngày (idempotent: chỉ nạp phần thiếu); sau khi nạp `GET` lại và so số phiếu/trip/chuyến với payload (dừng nếu lệch). Thử ngày 03 trước, kiểm tra bằng SQL rồi mới nạp ngày 04–30.
3. Đối chiếu: `GET /reconciliation` từng ngày (~1.000 dòng/ngày, ≤ 1,2 s) → chuẩn hoá → so với mô phỏng theo khoá (ngày,ca,xe,máy xúc).
4. Duyệt: `TR2_approve.js` lấy lại danh sách từng ngày, chỉ chọn dòng có đủ hai id ∧ `matched=true` ∧ `pairingAmbiguous=false` ∧ cả hai bên PENDING; **thử 50 cặp** ngày 03 (kiểm tra 50/50 APPROVED hai bên, không có thay đổi nào khác), rồi duyệt theo ngày, lô 100 cặp, nghỉ 1,5 s; sau mỗi ngày đọc lại danh sách để kiểm APPROVED hai bên và không có cặp lệch một bên; dừng ngay nếu có lỗi (không thử lại).
5. Tài nguyên: mỗi lần chỉ một container Node `--rm -m 1500m`; backend TK giữ ~560–620 MiB / 7,6 GiB suốt quá trình (không cần giảm lô).

## 3. Số nạp theo ngày — SQL so với payload
| Ngày | VT payload (phiếu/trip/chuyến) | VT DB (SQL) | VT | KT payload | KT DB (SQL) | KT |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 396 / 854 / 4.182 | 396 / 854 / 4.182 | KHỚP | 357 / 523 / 3.673 | 357 / 523 / 3.673 | KHỚP |
| 4 | 402 / 957 / 4.333 | 402 / 957 / 4.333 | KHỚP | 389 / 582 / 3.656 | 389 / 582 / 3.656 | KHỚP |
| 5 | 399 / 1.014 / 4.824 | 399 / 1.014 / 4.824 | KHỚP | 388 / 649 / 4.064 | 388 / 649 / 4.064 | KHỚP |
| 6 | 400 / 1.095 / 4.406 | 400 / 1.095 / 4.406 | KHỚP | 418 / 732 / 4.027 | 418 / 732 / 4.027 | KHỚP |
| 7 | 399 / 1.120 / 4.721 | 399 / 1.120 / 4.721 | KHỚP | 399 / 718 / 3.924 | 399 / 718 / 3.924 | KHỚP |
| 8 | 394 / 982 / 4.274 | 394 / 982 / 4.274 | KHỚP | 391 / 604 / 3.527 | 391 / 604 / 3.527 | KHỚP |
| 9 | 400 / 979 / 4.524 | 400 / 979 / 4.524 | KHỚP | 423 / 638 / 3.788 | 423 / 638 / 3.788 | KHỚP |
| 10 | 395 / 864 / 4.426 | 395 / 864 / 4.426 | KHỚP | 369 / 531 / 3.642 | 369 / 531 / 3.642 | KHỚP |
| 11 | 386 / 1.022 / 4.722 | 386 / 1.022 / 4.722 | KHỚP | 405 / 681 / 3.868 | 405 / 681 / 3.868 | KHỚP |
| 12 | 393 / 1.092 / 4.659 | 393 / 1.092 / 4.659 | KHỚP | 423 / 739 / 3.882 | 423 / 739 / 3.882 | KHỚP |
| 13 | 395 / 1.064 / 4.582 | 395 / 1.064 / 4.582 | KHỚP | 405 / 667 / 3.871 | 405 / 667 / 3.871 | KHỚP |
| 14 | 123 / 258 / 740 | 123 / 258 / 740 | KHỚP | 94 / 137 / 260 | 94 / 137 / 260 | KHỚP |
| 15 | 257 / 488 / 2.135 | 257 / 488 / 2.135 | KHỚP | 206 / 311 / 1.800 | 206 / 311 / 1.800 | KHỚP |
| 16 | 127 / 244 / 1.039 | 127 / 244 / 1.039 | KHỚP | 107 / 161 / 839 | 107 / 161 / 839 | KHỚP |
| 17 | 141 / 342 / 1.323 | 141 / 342 / 1.323 | KHỚP | 108 / 159 / 811 | 108 / 159 / 811 | KHỚP |
| 18 | 278 / 645 / 3.328 | 278 / 645 / 3.328 | KHỚP | 248 / 390 / 2.559 | 248 / 390 / 2.559 | KHỚP |
| 19 | 395 / 901 / 4.822 | 395 / 901 / 4.822 | KHỚP | 375 / 550 / 3.800 | 375 / 550 / 3.800 | KHỚP |
| 20 | 391 / 1.061 / 4.985 | 391 / 1.061 / 4.985 | KHỚP | 397 / 688 / 3.943 | 397 / 688 / 3.943 | KHỚP |
| 21 | 393 / 1.002 / 4.688 | 393 / 1.002 / 4.688 | KHỚP | 370 / 636 / 3.739 | 370 / 636 / 3.739 | KHỚP |
| 22 | 392 / 972 / 4.499 | 392 / 972 / 4.499 | KHỚP | 389 / 634 / 3.680 | 389 / 634 / 3.680 | KHỚP |
| 23 | 387 / 995 / 4.357 | 387 / 995 / 4.357 | KHỚP | 399 / 671 / 3.684 | 399 / 671 / 3.684 | KHỚP |
| 24 | 387 / 822 / 3.578 | 387 / 822 / 3.578 | KHỚP | 343 / 579 / 2.904 | 343 / 579 / 2.904 | KHỚP |
| 25 | 386 / 810 / 4.473 | 386 / 810 / 4.473 | KHỚP | 332 / 518 / 3.654 | 332 / 518 / 3.654 | KHỚP |
| 26 | 392 / 853 / 4.259 | 392 / 853 / 4.259 | KHỚP | 363 / 534 / 3.551 | 363 / 534 / 3.551 | KHỚP |
| 27 | 389 / 951 / 4.189 | 389 / 951 / 4.189 | KHỚP | 354 / 624 / 3.531 | 354 / 624 / 3.531 | KHỚP |
| 28 | 390 / 981 / 4.710 | 390 / 981 / 4.710 | KHỚP | 383 / 625 / 3.817 | 383 / 625 / 3.817 | KHỚP |
| 29 | 369 / 1.000 / 4.452 | 369 / 1.000 / 4.452 | KHỚP | 379 / 605 / 3.547 | 379 / 605 / 3.547 | KHỚP |
| 30 | 368 / 1.000 / 4.549 | 368 / 1.000 / 4.549 | KHỚP | 383 / 648 / 3.687 | 383 / 648 / 3.687 | KHỚP |
| **Cộng** | 9.924 / 24.368 / 111.779 | 9.924 / 24.368 / 111.779 | KHỚP | 9.597 / 15.534 / 91.728 | 9.597 / 15.534 / 91.728 | KHỚP |

So với yêu cầu: VT **9.924 / 24.368 / 111.779** và KT **9.597 / 15.534 / 91.728** — DB đúng bằng các số này. Khai thác thấp hơn nguồn thô (42.713 + 13.295 + 33.660 + 2.207 = 91.875 chuyến) đúng **147 chuyến** của 9 dòng KT1 "Đá sàng (Máy to)" chưa ánh xạ được (đã nêu ở Giai đoạn 1); 404 dòng "xít" và 13 dòng 0 chuyến không có chuyến nào.

Sao lưu: `scratchpad/backup/tk_after_catalogs_2308.dump` (trước nạp, do tác tử danh mục), `tk_after_load_2311.dump` (sau nạp, trước duyệt), `tk_after_approve_2311.dump` (sau duyệt) — `pg_dump -Fc`.

## 4. Đối chiếu THẬT do API tính vs mô phỏng
| Loại dòng | API (dòng) | Mô phỏng (dòng) | API (chuyến VT) | Mô phỏng (chuyến VT) | Chênh |
| --- | --- | --- | --- | --- | --- |
| Khớp & không mơ hồ (duyệt được) | 9.840 | 9.840 | 46.045 | 46.045 | 0 |
| Mơ hồ (nhiều chuyến cùng khoá) | 5.344 | 5.344 | 26.654 | 26.654 | 0 |
| Lệch 1-1 | 53 | 53 | 312 | 312 | 0 |
| Chỉ có Vận tải | 9.131 | 9.131 | 38.768 | 38.768 | 0 |
| Chỉ có Khai thác | 297 | 297 | 0 | 0 | 0 |

- **Chênh lệch API − mô phỏng = 0** ở mọi lớp, và 0/14.140 khoá khác nhau. Nguyên nhân khớp hoàn toàn: mô phỏng nhân bản đúng `pairGroup`/`isMatched`/`assertValidPair` của `ReconciliationService` và dùng đúng dữ liệu đã nạp (cùng tên→id, cùng alias, cùng nhân viên); thứ tự sắp xếp của repository chỉ ảnh hưởng *cặp nào* trong nhóm mơ hồ, không ảnh hưởng số lượng theo lớp.
- 181 dòng mơ hồ có `matched=true` (nội dung khớp nhưng nhóm không duyệt được 1-1) — đúng như mô phỏng (181); các dòng này KHÔNG được duyệt.
- Trạng thái trước duyệt: {PENDING/PENDING:15237,PENDING/-:9131,-/PENDING:297} (mọi chuyến PENDING).

## 5. Duyệt
- Thử 50 cặp (ngày 03): API trả OK trong ~9 s, đọc lại: 50/50 APPROVED hai bên, `reconciliation_decisions` = 50, không dòng nào khác đổi.
- Toàn bộ theo ngày (lô 100; ~0,18 s/cặp vì mỗi cặp phải nạp lại cả ngày để kiểm `assertValidPair`):
| Ngày | Cặp duyệt được (mô phỏng) | Cặp APPROVED sau duyệt (API) | Duyệt lượt này đã kiểm | Lệch một bên | So mô phỏng |
| --- | --- | --- | --- | --- | --- |
| 3 | 291 | 291 | 241 | 0 | KHỚP mô phỏng |
| 4 | 356 | 356 | 356 | 0 | KHỚP mô phỏng |
| 5 | 380 | 380 | 380 | 0 | KHỚP mô phỏng |
| 6 | 415 | 415 | 415 | 0 | KHỚP mô phỏng |
| 7 | 491 | 491 | 491 | 0 | KHỚP mô phỏng |
| 8 | 374 | 374 | 374 | 0 | KHỚP mô phỏng |
| 9 | 456 | 456 | 456 | 0 | KHỚP mô phỏng |
| 10 | 343 | 343 | 343 | 0 | KHỚP mô phỏng |
| 11 | 476 | 476 | 476 | 0 | KHỚP mô phỏng |
| 12 | 532 | 532 | 532 | 0 | KHỚP mô phỏng |
| 13 | 424 | 424 | 424 | 0 | KHỚP mô phỏng |
| 14 | 112 | 112 | 112 | 0 | KHỚP mô phỏng |
| 15 | 206 | 206 | 206 | 0 | KHỚP mô phỏng |
| 16 | 121 | 121 | 121 | 0 | KHỚP mô phỏng |
| 17 | 59 | 59 | 59 | 0 | KHỚP mô phỏng |
| 18 | 235 | 235 | 235 | 0 | KHỚP mô phỏng |
| 19 | 355 | 355 | 355 | 0 | KHỚP mô phỏng |
| 20 | 456 | 456 | 456 | 0 | KHỚP mô phỏng |
| 21 | 380 | 380 | 380 | 0 | KHỚP mô phỏng |
| 22 | 371 | 371 | 371 | 0 | KHỚP mô phỏng |
| 23 | 464 | 464 | 464 | 0 | KHỚP mô phỏng |
| 24 | 390 | 390 | 390 | 0 | KHỚP mô phỏng |
| 25 | 298 | 298 | 298 | 0 | KHỚP mô phỏng |
| 26 | 323 | 323 | 323 | 0 | KHỚP mô phỏng |
| 27 | 385 | 385 | 385 | 0 | KHỚP mô phỏng |
| 28 | 399 | 399 | 399 | 0 | KHỚP mô phỏng |
| 29 | 361 | 361 | 361 | 0 | KHỚP mô phỏng |
| 30 | 387 | 387 | 387 | 0 | KHỚP mô phỏng |

Ghi chú: ngày 03 đã duyệt thử 50 cặp trước, lượt chính duyệt nốt 241 cặp (tổng 291).
Tổng: **9.840 cặp APPROVED** (mô phỏng: 9.840).

### Kiểm tra sau duyệt
| Kiểm tra | Kết quả |
| --- | --- |
| Cặp APPROVED hai bên (API) | 9.840 |
| Chuyến VT đã duyệt = chuyến KT đã duyệt | 46.045 = 46.045 |
| Dòng chỉ một bên APPROVED | 0 |
| Khác biệt tập cặp đã duyệt so với `recon_pairs_matched.csv` (so khớp multiset theo ngày, ca, xe, máy xúc, loại hàng, số chuyến) | 0 thiếu / 0 thừa |
| SQL: trip VT APPROVED / PENDING | 9.840 / 14.528 (chuyến 46.045 / 65.734) |
| SQL: trip KT APPROVED / PENDING | 9.840 / 5.694 (chuyến 46.045 / 45.683) |
| SQL: `reconciliation_decisions` (tổng / APPROVED / có đủ 2 id) | 9.840 / 9.840 / 9.840 |
| SQL: trip REVISION_REQUESTED | 0 |

## 6. Còn PENDING theo lý do (giữ nguyên ở Đối chiếu)
Phân loại theo mô phỏng (trùng API 100%), tính theo trip/chuyến Vận tải:
| Lý do | Trip VT | Chuyến VT | % chuyến VT |
| --- | --- | --- | --- |
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

Theo Khai thác:
| Lý do | Trip KT | Chuyến KT | % chuyến KT |
| --- | --- | --- | --- |
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

Tóm lại: VT còn PENDING **14.528 trip / 65.734 chuyến**; KT còn PENDING **5.694 trip / 45.683 chuyến**.

## 7. Báo chuyến / bảng phát sinh
Sau nạp và sau duyệt, các bảng có dữ liệu chỉ gồm danh mục + `transport_reports/_trips`, `excavation_reports/_trips` và `reconciliation_decisions` (9.840 dòng); **không có bảng báo chuyến / sản lượng / kỳ báo cáo nào được tạo tự động** (`report_periods` = 0). Bộ lắng nghe tự tính lại sản lượng chỉ chạy khi kỳ tồn tại — chưa có kỳ nên không làm gì. Danh sách bảng có dữ liệu: `TR2_sql_tables_final.csv`.

## 8. Lỗi gặp và cách xử lý
- **Lỗi API khi nạp/duyệt: không có** (không 400/409/500; không rollback; không phải khôi phục từ backup).
- Công cụ: `pg_dump` qua Git Bash bị đổi đường dẫn `/tmp/...` thành đường dẫn Windows → ghi lỗi "could not open output file"; xử lý bằng `MSYS_NO_PATHCONV=1` (không ảnh hưởng dữ liệu).
- Python không có trên máy chủ; mọi script chạy bằng Node trong container.

## 9. Việc còn lại / quyết định của chủ dự án (không tự làm)
- **Kỳ báo cáo + `calculate` chưa chạy** theo yêu cầu. Khi tạo kỳ, QĐ-16 sẽ từ chối tính vì còn 14.528 trip VT chưa duyệt (58,8% chuyến) — xem các lựa chọn ở `TR_report.md` §9 (đối chiếu mức gộp / duyệt có kiểm soát nhóm "tổng khớp" / loại phần STTT).
- Nhóm "VT tách nhiều dòng/tuyến nhưng tổng chuyến theo loại hàng bằng KT" là phần lớn số PENDING; quy ước hàng trộn (KT3 1 dòng, PA D.UOT) và VT1/VT4 chưa có số thẻ vẫn chờ quyết định.
