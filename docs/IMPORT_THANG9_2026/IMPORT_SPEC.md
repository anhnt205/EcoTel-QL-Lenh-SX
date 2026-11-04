# ĐẶC TẢ NHẬP LIỆU THÁNG 9/2026 vào Thống kê Cao Sơn (preview) — quyết định thống nhất

Mọi tác tử nhập liệu làm theo file này. Nếu thấy dữ liệu thực tế MÂU THUẪN với một quyết định ở đây: KHÔNG tự đổi âm thầm — ghi
vào báo cáo của bạn (mục "Sai lệch so với đặc tả") và chọn phương án bảo thủ, có thể đảo ngược.

## 0. Môi trường & an toàn
- Preview chạy ở `http://localhost:6869`. API Thống kê: `http://localhost:6869/tk-api/api/...` (xem `reports/TKAPI_contract.md` — ĐỌC KỸ trước khi viết mã).
  Postgres Thống kê: container `dpmm-preview-tk_postgres-1` (db `thong_ke`, user `postgres`; `docker exec ... psql -U postgres -d thong_ke`).
- Token: `POST /api/auth/login` {"username":"admin","password":"123456"} (tài khoản demo seed của preview cục bộ) -> `data.token`;
  `GET /api/auth/tk-token` (Bearer) -> `data.appToken` (sống ~8h; gọi lại khi 401). KHÔNG in token ra màn hình/báo cáo.
- ĐƯỢC GHI (đây là việc người dùng đã yêu cầu: nhập liệu tháng 9 vào preview): chỉ qua API Thống kê ở trên và INSERT/UPDATE SQL vào DB
  `thong_ke` trong container trên cho các thực thể mà hợp đồng nói "không có API" (Ca, device_types, devices, matrix_definitions) và (nếu được
  yêu cầu riêng) duyệt đối chiếu. TUYỆT ĐỐI KHÔNG đụng: MongoDB/Điều phối, các container/DB khác, repo mã nguồn, file dữ liệu nguồn.
- TRƯỚC khi ghi lần đầu: `pg_dump` DB vào `scratchpad/xl/load/backup_<giờ>.sql` (docker exec ... pg_dump -U postgres thong_ke).
- Mọi script phải IDEMPOTENT (tra trước, bỏ qua cái đã có theo mã), có chế độ `--dry-run` mặc định, in số lượng tạo/bỏ qua/lỗi; nhật ký ra file.
  Gặp lỗi bất thường (400/409/500 lặp lại) thì DỪNG, ghi lỗi + mẫu body, đừng thử mò vô tận.
- Tài nguyên máy dùng chung (RAM ~8GB): Node chạy trong container tạm `--rm -m 1500m` (image `dieuphoimm_backend_img`, có node + axios? nếu không, dùng `fetch` có sẵn Node 18),
  một container mỗi lần; gọi API tuần tự hoặc song song tối đa 4; lô `/bulk` vài chục-vài trăm bản ghi. Đóng UI Thống kê/Điều phối đang mở (WebSocket nặng).
  Từ container tạm gọi API qua host: `--add-host=host.docker.internal:host-gateway` và URL `http://host.docker.internal:6869`.
- Thư mục làm việc: `C:/Users/HOME/AppData/Local/Temp/claude/D--Coding-DU-AN-AI-Software-Factory/b02fa6c3-57ff-4341-ad12-f4da46fe2ce1/scratchpad/xl` (gọi là `$XL`).
  Script của bạn đặt ở `$XL/load/` với tiền tố tên bạn; kết quả/nhật ký/bản đồ id ở `$XL/load/`.

## 1. Nguồn dữ liệu đã chuẩn bị (trong `$XL/reports/` và `$XL/work/`)
- VẬN TẢI (xương sống): `$XL/work/RP_than_real.tsv` = cache `tinh toan` bản 14/10 (24.368 dòng thật, THANG=9, ngày 3-30, 111.779 chuyến, đủ 6 PXVT).
  Cột (1-based): 1 THANG|2 Ngày|3 Ca|4 Khu vực xúc(CS/KC)|5 Máy xúc|6 Tầng nhận tải|7 Nơi nhận tải (vỉa/kho)|8 Tầng dỡ tải|9 Tên gọi nơi dỡ tải|10 Nhom hang|
  11 Chủng loại hàng|12 CĐ toàn tuyến (Km)|13 Nâng tải toàn tuyến (m)|14 CĐ dốc cục bộ|15 Dốc cục bộ|16 Chênh cao thanh toán NL|17 Số xe|18 Số chuyến|19 Ngày mưa|
  20 Klg tấn (Qua cân)|21 Roda ; Khac|22 TheTrong_TĐ|23 Phân loại (Dat/Than)|24 Lái xe bổ túc|25 SP N/thu; Cong Nghe|26 Tỷ trọng|27 Mô hình (m3/ch)|28 Nhóm tầng|29 Tổng m3|
  30 Tổng KLVC (tấn)|31 Tổng Tkm|32 Tổng Km vận chuyển|33 mã hàng TTL|34 Tên Nghiệm thu|35 BBNT-MaHoa|36 Nhóm vỉa|37 Via+NhomTang|38 Số hiệu xe|39 Chủng loại xe|40 Hạng xe|
  41 Chung Loai xe + Hang xe|42 PXVT|43 Chung loai xe (NL)|44 Số hiệu máy|45 GauXuc|46 TaiTrongXe|47 QLY THIET BI|48 CLXe + Loai xe|49 TĐ.Tổng m3|50 TĐ.Tổng KLVC|51 TĐ.Tổng Tkm|
  52 HSDML|53 Số hiệu xe + PXVT|54 TachGiaiDoanGiaDau|55 HSTĐ (m3). (Đã kiểm: header file là nguồn đúng; xem `reports/RP_00_TONG_QUAN.md`, `RP_THAN_TIEU_THU.md`.)
- SỐ THẺ LƯƠNG + NHIÊN LIỆU theo (ngày, ca, xe): `$XL/reports/VT35_VT3_NhapSo_dang_importer.csv`, `VT35_VT5_T9_tu_pivotcache_dang_importer.csv`, `VT69_VT9_NhapSo_dang_importer.csv`,
  `VT69_VT6_NghiemThu_dang_importer.csv` (cột 0-26 theo mẫu importer Vận tải: 0 Thời gian,1 Ca,2 Số thẻ lương,5/6/7 NL,9 Số xe,...). Danh sách người: `VT35_*nhanvien*.csv`, `VT69_*` ds lái xe,
  và (khi có) `TD_*luong*`/`TD_CC_the_luong*` — xem `reports/TD_*.md` nếu đã có.
- KHAI THÁC: `$XL/reports/KT_KT1_raw_clean.tsv`, `KT_KT2_raw_clean.tsv`, `KT_B2A_DAT_raw_clean.tsv` (KT3 bản 16/10 — DÙNG bản này cho KT3), `KT_B2A_THAN_raw_clean.tsv` (than KT3 NK2->STTT).
  Mô tả cột + số tổng: `reports/KT_00_TONG_QUAN.md`, `KT_KT1.md`, `KT_KT2.md`, `KT_KT3.md`, `KT_B2A.md`. Mỗi dòng = (Ngày, Ca, Máy xúc, Số xe, Loại hàng, Số chuyến).
- Bảng tra/danh mục suy từ `tinh toan`: `$XL/reports/RP_TT_distinct_*.csv` (máy xúc, nơi nhận, nơi dỡ, tầng, chủng loại hàng, nhóm hàng, mã TTL, SP nghiệm thu, tỷ trọng, mô hình, loại xe, số xe),
  `RP_TT_tong_chung_loai_hang_nhom_sp.csv`, `RP_TT_cungdo_theo_tuyen.csv`, `KT_may_xuc_distinct.csv`, `KT_xe_distinct.csv`, `KT_mohinh_theo_loaixe_loaihang.csv`.
- Lưới/hệ số: `VT69_*` (MO_HINH, HS_DIEU_CHINH_NLDM, NANG_SUAT_XE, tỷ trọng, DMNL các ma trận), `TD_*`. (Giai đoạn B — xem mục 6.)

## 2. Quyết định về DANH MỤC (tên/mã dùng thống nhất)
D1 Ca: 1 (06:00-14:00), 2 (14:00-22:00), 3 (22:00-06:00) — SQL `shifts` (name integer). (Kiểm tra `start_time/end_time` mẫu trong `backend/seed-data.sql`; nếu giờ ca thật khác thì ghi chú.)
D2 Thiết bị (`devices`, SQL; mã duy nhất, xe và máy xúc chung không gian mã):
   - XE: `code` = `Số xe` (cột 17 của tinh toan; cột "Số xe" của KT) CHUẨN HOÁ: trim + IN HOA (vd `V05`, `0929`, `106`, `S0912`). `name` = `Số hiệu xe` (cột 38) nếu có (vd `CAT-106`), `vehicle_number` = code.
     `department_id` = phân xưởng quản lý xe (cột 47 QLY THIET BI / cột 42 PXVT, dạng VT1/VT3.. — chuẩn hoá `VT1`..), `category`/device_type `group_type`='XE'.
   - MÁY XÚC: `code` = `Máy xúc` (cột 5) CHUẨN HOÁ: trim + IN HOA + BỎ dấu chấm cuối (`p27.`->`P27`, `XL.STTT-1.`->`XL.STTT-1`, `u5.`->`U5`, `e12.`->`E12`). Dấu chấm giữa giữ nguyên.
     `name` = `Số hiệu máy` (cột 44) nếu có (vd `E12.`/`EKG12.` -> đặt `EKG12`), `group_type`='MAY'. Với KT2: `Mã MX` (u2,u5,e12...) là mã chuẩn hoá, `Máy xúc` (8U2,8U5,EKG12) là tên.
   - Thuộc tính sản lượng (API `device-production-attributes/bulk`): xe: vehicleType = `Chủng loại xe` (cột 39 CAT777E..), fuelClass = `Chung loai xe (NL)` (cột 43), vehicleRank = `Hạng xe` (cột 40; chữ đầu A/B/C/C1); máy xúc: bucketCapacity = `GauXuc` (cột 45).
D3 Phòng ban/Chức vụ/Người dùng: Phòng ban: `PXVT1,PXVT3,PXVT4,PXVT5,PXVT6,PXVT9` (vận tải), `KT1,KT2,KT3` (khai thác), `THONGKE`. Chức vụ: `Lái xe` thuộc mỗi PXVT (mã `LX-VT1`...), `Nhân viên khai thác` thuộc mỗi KTn (`NVKT-1`...).
   Người dùng = tài xế: `salaryCode` = số thẻ lương (từ sổ PX / bảng lương), `fullName`, `username`=`nv<salaryCode>` (thường hoá), mật khẩu NGẪU NHIÊN ≥12 ký tự (KHÔNG ghi ra file/log), sau đó `PUT active=false` (nhân viên tham chiếu, không đăng nhập). Thẻ trùng giữa các PX -> ghi vào báo cáo, giữ 1.
   Tài xế không rõ thẻ (VT1, VT4 không có sổ PX; hoặc dòng thiếu thẻ): tạo người dùng GIẢ ĐỊNH RÕ RÀNG mỗi PX: `salaryCode` = `CHUACO-VT1` (…VT4…), `fullName` = `Chưa có số thẻ – PXVT1`. Tương tự `CHUACO-KT1..3` cho chuyến Khai thác không ghép được tài xế.
D4 Hàng hoá: Nhóm hàng (CargoGroup) = giá trị cột 10 `Nhom hang`; Sản phẩm nghiệm thu (AcceptanceProduct) = cột 25 (`Dat_SX`,`Dat_CN`,`Than_SX`,`Than_CN`,`Dat_TCN` — TÊN ĐÚNG như engine so); TTL CLH = cột 33 `mã hàng TTL`;
   Loại hàng (CargoType) `name` = cột 11 `Chủng loại hàng` NGUYÊN VĂN (kể cả dấu chấm/hoa-thường: `Nomin.`, `SPNT.BaiChua`, `DBTron`, `B.chan`...), `code` = `CLH-<số thứ tự 3 chữ số>`, gắn cargoGroup + acceptanceProduct + ttlClh theo cặp xuất hiện trong dữ liệu (nếu một loại hàng có >1 giá trị SPNT thì báo cáo mâu thuẫn).
D5 Vị trí: Khu vực xúc: 2 bản ghi `CS` (areaGroup CS) và `KC` (areaGroup KC) (cột 4). Nhóm vỉa (SeamGroup) = cột 36; Nơi nhận tải (ReceivingPoint) `name` = cột 7 NGUYÊN VĂN, gắn seamGroup theo cột 36; Nơi chất tải (PickupPoint, dùng cho Khai thác) = CÙNG danh sách tên với Nơi nhận tải
   (cùng một địa điểm vật lý); Nơi dỡ tải (UnloadingPoint) `name` = cột 9 NGUYÊN VĂN. Mã (`code`) tự sinh `NNT-001`/`NCT-001`/`NDT-001`/`NV-<mã nhóm vỉa slug>`; TÊN không trùng trong cùng loại (importer tra theo tên).
D6 Mức tải: cột 21 `Roda ; Khac`: trống/`dutai` => FULL_LOAD; `Roda`/`rd`/`2/3` => RODA_2_3; dạng x/y khác => OTHER + customValue. (Liệt kê giá trị khác nhau thực tế trong báo cáo.)

## 3. Quyết định về PHIẾU
D7 VẬN TẢI: 1 phiếu = (ngày, ca, xe, nhân viên). Ngày = 2026-09-<Ngày>. `employee`: tra theo (ngày, ca, xe) trong các sổ PX (VT3/VT5/VT9/VT6, file `*_dang_importer.csv`) -> số thẻ; nếu không có -> người dùng `CHUACO-<PX>`.
   Nhiên liệu tồn đầu/cuối/lĩnh: lấy từ sổ PX theo (ngày, ca, xe) khi có (đặt ở phiếu); không có thì để trống. Mỗi dòng tinh toan -> 1 trip: excavationAreaId (CS/KC), excavatorDeviceId, loadingPointId (Nơi nhận tải), receivingFloor (cột 6, số nguyên),
   unloadingFloor (cột 8, chuỗi), cung độ (cột 12), nâng tải (13), dốc cục bộ km (14) và m (15), unloadingPointId, cargoTypeId, tripCount (cột 18, >=1; dòng 0 chuyến BỎ và đếm), rainyDay (cột 19=1), supplementaryVehicle (cột 24 nếu >0),
   loadLevel (D6). 6 trường "(Báo chuyến)" (cân, mô hình/tỷ trọng tạm tính...) để TRỐNG, trừ `weighedWeightTon` nếu cột 20 có số > 0 (hỏi: ghi nhận vào báo cáo nếu có).
   Dòng bùn trộn/chặn tách đôi (`B.TRON`+`DBTron`, `B.chan`+`DBChan`, `.CN`) GIỮ NGUYÊN 2 dòng như nguồn.
D8 KHAI THÁC: 1 phiếu = (ngày, ca, máy xúc, nhân viên). Mỗi dòng KT (ngày, ca, máy xúc, số xe, loại hàng, số chuyến) -> 1 trip (vehicleId, cargoTypeId(ÁNH XẠ tên, mục 4), tripCount, loadLevel từ `Đủ tải, Roda`).
   `employee` của phiếu Khai thác = NHÂN VIÊN CỦA PHIẾU VẬN TẢI cùng (ngày, ca, xe) (theo định nghĩa "khớp" của Thống kê: cùng Report.employee hai bên). Không có phiếu vận tải tương ứng -> `CHUACO-KT<n>` của công trường đó.
   `receivingLocationId` (Nơi chất tải) = Nơi nhận tải của chuyến Vận tải ghép cặp (cùng ngày/ca/xe/máy xúc); không có -> PickupPoint `Chưa ghi nơi chất tải` (tạo thêm 1 bản ghi). `excavationFloor` = Tầng nhận tải của chuyến vận tải ghép cặp; không có -> tầng nguồn KT (nếu có) hoặc trống.
   Fuel Khai thác: để trống.
   KT3 dùng bản 16/10 (`KT_B2A_*`). KT3 THAN (404 dòng NK2->STTT): NHẬP, loại hàng ánh xạ theo mục 4. Dòng "xít" của KT3: theo mục 4.
D9 ĐỐI CHIẾU (người dùng đã quyết, nguyên văn: "tải và khai thác khi lệch nhau thì để nguyên ở đối chiếu. Nếu khớp thì duyệt luôn để ra báo cáo"):
   - Cặp Vận tải-Khai thác KHỚP (`matched=true`, `pairingAmbiguous=false`, cả hai id, cả hai `PENDING`) -> DUYỆT (`status=APPROVED`) qua API `POST /reconciliation/decisions/bulk`, theo từng ngày, lô vừa phải (đo thử 50 cặp trước).
   - Dòng LỆCH (khác loại hàng/số chuyến/mức tải/nhân viên), dòng chỉ có một phía, dòng ghép mơ hồ: ĐỂ NGUYÊN ở Đối chiếu (PENDING) — KHÔNG sửa số liệu, KHÔNG duyệt, KHÔNG gửi yêu cầu sửa, KHÔNG bypass bằng SQL.
   - KHÔNG tạo Kỳ báo cáo và KHÔNG chạy `calculate` cho tới khi người điều phối (tôi) yêu cầu (QĐ-16 sẽ từ chối tính khi còn chuyến chưa duyệt; chỉ báo cáo hiện trạng).
   - Chỉ duyệt SAU khi cả hai phía đã nạp xong và đã có mô phỏng đối chiếu; ghi nhật ký số cặp đã duyệt theo ngày.

## 4. Ánh xạ tên Loại hàng Khai thác -> Chủng loại hàng (Vận tải/tinh toan)
KHÔNG đoán: suy bằng DỮ LIỆU. Với mỗi khoá (ngày, ca, máy xúc chuẩn hoá, xe chuẩn hoá) có mặt ở CẢ HAI phía, so (loại hàng KT, số chuyến) với (chủng loại hàng VT, số chuyến) -> bảng đếm; chọn ánh xạ chiếm đa số, ghi tỷ lệ và các trường hợp mơ hồ
(vd bùn trộn tách đôi: `P. Bùn trộn`/`P. Đất trộn` <-> `B.TRON`/`DBTron`). Xuất `$XL/load/cargo_mapping.csv` (nguồn, tên KT, chủng loại hàng đích, số khoá ủng hộ, số khoá mâu thuẫn, ghi chú). Tên KT chưa ánh xạ được: liệt kê, KHÔNG nạp những dòng đó (đếm chuyến bị bỏ).
Cũng ánh xạ/chuẩn hoá: mã máy xúc KT -> mã chuẩn hoá mục D2 (KT1 `p9`->`P9`; KT2 `Mã MX` `u2`->`U2`, `e12`->`E12`; KT3 `P11`), số xe, Đội xe `PXVT1`->`VT1`.

## 5. Kiểm tra bắt buộc (đưa vào báo cáo)
- Sau nạp danh mục: số bản ghi từng danh mục (GET totalElements) khớp số distinct kế hoạch; mã thiết bị duy nhất.
- Sau nạp phiếu: tổng phiếu/trip/chuyến theo (PX, ngày) khớp nguồn (VT: 111.779 chuyến trừ dòng bị bỏ; KT: KT1 42.713 / KT2 13.295 / KT3 33.660 + than 2.207) — nêu mọi chênh lệch.
- Mô phỏng đối chiếu: tỷ lệ khoá ghép cặp được, tỷ lệ `isMatched` (cùng loại hàng + số chuyến + mức tải + nhân viên), theo PX/công trường; danh sách chuyến Vận tải KHÔNG có Khai thác.

## 6. Giai đoạn B (chưa nạp trừ khi được yêu cầu)
Hệ số `HS.THAN.TRUDA`, `HS.BUN`; tỷ trọng (`density-parameters`); lưới MO_HINH, DMNL, NANG_SUAT_XE, HS_DIEU_CHINH_NLDM; STD; Kỳ báo cáo; tính sản lượng. Chỉ KIỂM KÊ: với từng mục nêu nguồn dữ liệu trong `reports/` đã sẵn dùng
(đường dẫn), có đủ không, còn thiếu gì, và giá trị cụ thể đã biết (ví dụ giá trị `HS.THAN.TRUDA`, `HS.BUN` trong Excel/tài liệu `ThongKe/docs`). Ghi `$XL/load/stageB_inventory.md`.
