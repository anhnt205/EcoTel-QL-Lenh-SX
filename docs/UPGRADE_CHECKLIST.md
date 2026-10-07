# Nâng cấp Điều phối đang chạy thật — rà soát tác động & quy trình (2026-10-07)

Phạm vi: nhánh `claude-dev` so với bản đang chạy thật `origin/main`. Nhánh gồm ~45 commit CHƯA phát hành
(không chỉ phần gộp Thống kê): chốt lệnh/báo cáo khi hoàn thành, tab Cấu hình giao diện, thiết kế lại
Báo cáo / Tổng quan / Lệnh sản xuất, header banner, và phần Thống kê. App Mobile (Flutter, thư mục
`MobileApp/`) dùng cùng REST API + Socket.IO.

## 1. Kết luận
Đọc mã (không có bằng chứng chạy thật với app Mobile): **không có blocker** khi cờ Thống kê để mặc định.
Cần xử lý/ xác nhận các điểm dưới trước khi nâng cấp.

## 2. Phần của Thống kê — mặc định KHÔNG làm gì
- `REACT_APP_TK_EMBED` (build-time frontend): chỉ `"true"` mới bật. Không đặt = không có menu Thống kê.
- `CATALOG_MASTER` (backend): không đặt = `catalogLock.js` là no-op tuyệt đối (return next() đầu hàm).
- `GET /api/auth/tk-token`, `POST /api/catalog-sync/tk`: route MỚI, không chen vào path cũ; thiếu `TK_AUTH_JWT_SECRET` → 503;
  sync mặc định dry-run. Không biến `TK_*` nào được đọc lúc khởi động.
- Field mới `externalTkId` (sparse, không unique) trên Device/DeviceType/DeviceModel/Department/Position/Shift/
  Location/Material: thêm tuỳ chọn, dữ liệu cũ không làm lỗi khởi động. Quay lại bản cũ an toàn (Mongoose strict bỏ qua field lạ).

## 3. Thay đổi HÀNH VI có chủ đích (từ các lượt trước) — phải báo khách + thử với Mobile
1. **Lệnh đã hoàn thành: sửa được trong 48 giờ, sau đó khoá** (`PUT /api/orders/:id`, `services/orderSnapshot.js#frozenEditDecision`,
   chỉnh được bằng env `ORDER_EDIT_WINDOW_HOURS`, mặc định 48). Mốc tính = `endTime` của lệnh.
   - **Trong 48 giờ**: sửa bình thường (kể cả thêm/bớt "phụ máy" `assistants`, thiết bị, ca, công việc...). Bản chụp đã chốt được
     chụp lại đúng các trường vừa sửa và có ghi lịch sử (`editedInWindow`), nên GET/báo cáo khớp dữ liệu mới.
   - **Quá 48 giờ**: đổi các trường bảo vệ (người nhận, trợ lý/phụ máy, thiết bị, xe, công việc, ca, ngày, giờ, nội dung, lô) → **HTTP 409**
     `{status:"error", message, reason:"expired", fields:[...]}`. Gửi lại đúng giá trị cũ vẫn 200. Chỉ admin + `forceEditFrozen:true` sửa được.
   - **Luôn khoá** (kể cả trong hạn): giờ kết thúc `endTime` (là mốc tính hạn, tránh kéo dài) và mở lại / đổi trạng thái lệnh (`reason:"reopen"|"endTime"`).
   - Lệnh thiếu `endTime` coi như đã quá hạn (khoá). Chưa thử với app Mobile thật.

2. **Response lệnh đã chốt**: có thêm `frozenAt`, `frozenSource`, tham chiếu lấy từ bản chụp (cùng bộ trường). Dart bỏ qua field lạ.
3. **Cron mới `*/10 * * * *`**: chốt (ghi `frozen`) tối đa 200 lệnh hoàn thành trong 48 giờ gần nhất + báo chuyến của chúng.
   Chỉ THÊM field, idempotent, không xoá. Lệnh/báo chuyến cũ hơn 48 giờ KHÔNG tự có bản chốt → chạy thủ công
   `node scripts/freeze-completed-orders.js --dry-run` rồi chạy thật **ngay sau deploy**.
4. **Index mới** `Order{status,frozen.at}`, `Report{frozen.at}` + các index sparse `externalTkId`...: Mongoose tự build lúc khởi động
   (không khoá ghi từ Mongo 4.2); tốn thời gian nếu collection lớn.
5. **`/api/uploads/put|get` yêu cầu đăng nhập** (trước đây mở hoàn toàn). Web và Mobile đều gửi Bearer sau khi đăng nhập.
   Nơi backend tự gọi `/uploads/get` để xuất Excel (8 chỗ trong export.routes.js) đã đổi sang ký URL trực tiếp
   (`utils/uploadImage.js#getSignedDownloadUrl`) — nếu không, chữ ký trong file Excel biến mất (401 bị nuốt).
6. **Số liệu báo cáo tháng cũ có thể khác** (bảng chấm công dùng roster theo thời điểm; sản lượng dùng dữ liệu đã chốt).
7. Sửa lỗi có sẵn trên main: `GET /api/devices/:id` (dùng biến chưa khai báo → 500) nay trả 200.

## 4. Mobile — điều cần xác nhận
- `MobileApp/lib/services/upload_service.dart` gọi `GET /uploads?fileName=&type=` và đọc `data` như chuỗi URL, trong khi backend
  (cả bản main) chỉ có `/api/uploads/put|get` trả `data:{uploadUrl,fileKey}` → mã Mobile trong repo đã LỆCH backend từ trước;
  APK đang chạy ở khách có thể là bản khác. Cần biết đúng phiên bản APK.
- Chưa thử app Mobile thật với 409 (context.md cũ cũng ghi vậy).

## 5. Hạ tầng
- CI/CD tự deploy khi push `main` (release) / `develop` (staging). KHÔNG push nhánh này lên `main`/`develop` cho tới khi sẵn sàng.
- Dockerfile, package.json, package-lock.json, workflows, compose release: KHÔNG đổi → không có dependency mới.
- `nginx_release.conf`: bỏ `X-Frame-Options SAMEORIGIN`, thay bằng CSP `frame-ancestors 'self'` + 3 origin Portal
  (118.70.151.69:1200/:1201/:50008 — :50008 là bản thử, nên xem lại). Mobile không ảnh hưởng.
- `nginx_thongke.conf` + `docker-compose.thongke-embed.yaml` chỉ dùng để chạy thử, không nằm trong đường deploy.
- Hard-code: điện thoại/fax trong banner (`HeaderBanner.tsx`), tên công ty mặc định (`BrandingProvider.tsx`).
- Nhánh đã gộp hotfix production `b88982f` (2/10, "không ghi lại thời gian bắt đầu sau khi sửa lệnh"). Trước khi deploy
  phải `git fetch` và gộp lại nếu `origin/main` có commit mới.

## 6. Quy trình nâng cấp đề xuất
1. `git fetch` + gộp `origin/main` vào nhánh phát hành; chạy `npm test` (backend) + `tsc` (frontend) trong container.
2. **Sao lưu MongoDB** (container `mongo_backup` đang có cron — vẫn nên dump thủ công ngay trước deploy) + ghi lại tag image đang chạy.
3. Thử trên STAGING với bản sao dữ liệu thật: đăng nhập Mobile, kết thúc lệnh, thêm phụ máy trên lệnh đã hoàn thành, check-in có ảnh,
   xuất Excel có chữ ký, mở báo cáo tháng cũ.
4. Deploy backend + frontend CÙNG LÚC (frontend mới chịu được backend cũ và ngược lại, nhưng không cần thử).
5. Ngay sau deploy: `node scripts/freeze-completed-orders.js --dry-run` → đọc → chạy thật. Theo dõi log cron `*/10` và thời gian build index.
6. Quay lại nếu có sự cố: chạy lại image/tag cũ (dữ liệu mới thêm `frozen`/`externalTkId` không làm hỏng bản cũ). Đừng restore Mongo
   trừ khi dữ liệu thật sự hỏng.
