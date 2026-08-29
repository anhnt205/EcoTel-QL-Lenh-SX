# Requirements — Hiện trạng (AS-IS), suy từ code thật

Không có tờ trình/spec nghiệp vụ chính thức đi kèm repo. Tài liệu này suy
ra yêu cầu từ code thật (controller, model, route, UI) — KHÔNG phải yêu cầu
mong muốn/tương lai. Đọc `docs/ARCHITECTURE_CURRENT.md` cho kiến trúc kỹ
thuật, `docs/TECHNICAL_DEBT.md` cho các phát hiện cần xử lý.

## 1. Bối cảnh nghiệp vụ

Hệ thống thống kê sản lượng khai thác than tại mỏ Cao Sơn (Cẩm Phả, Quảng
Ninh) — tương tự về nghiệp vụ với nhóm ứng dụng "Lệnh sản xuất" khác trong
factory (TK-HATU, DIEU-PHOI-MM), nhưng là một triển khai ĐỘC LẬP, tech
stack khác hẳn (Spring Boot/Postgres/React), 100% PostgreSQL — KHÔNG còn
phụ thuộc MongoDB (cơ chế đồng bộ cũ đã gỡ bỏ 2026-08-29). Sẽ tích hợp với
DIEU-PHOI-MM trong tương lai qua cơ chế riêng (chưa thiết kế), không liên
quan TK-HATU.

## 2. Chức năng đã có code + có route/API — hoạt động được về mặt kỹ thuật

(Lượt onboarding 1: chỉ xác nhận build PASS + route tồn tại, chưa verify UI
thật. Lượt 2 (2026-08-29): ĐÃ verify sống qua preview Docker thật — health/
swagger/auth public hoạt động đúng, API nghiệp vụ đúng là yêu cầu JWT thật
(401 nếu thiếu/token giả) — xem `docs/ARCHITECTURE_CURRENT.md` mục 3. Chưa
verify luồng nghiệp vụ CHI TIẾT bên trong từng API qua UI thật (ngoài phạm
vi 2 lượt vừa qua).

- **Đăng nhập qua Portal SSO**: exchange one-time-code lấy token, refresh
  token khi hết hạn (`AuthController`).
- **Danh mục dùng chung** (CRUD, 1 controller/model/repository/route mỗi
  loại): Người dùng, Phòng ban, Chức vụ, Ca làm việc, Vị trí (kèm toạ độ
  bản đồ), Thiết bị/xe máy (kèm loại thiết bị, mẫu thiết bị, file đính
  kèm), Vật tư (kèm lịch sử giá trị), Nhóm hàng, Loại hàng, Mức tải
  (`LoadLevel`).
- **Nhập liệu Vận tải** (`TransportReportController`/`TransportEntryPage`):
  báo cáo theo ca, có "chuyến" (`TransportReportTrip`) — số liệu từng
  chuyến xe. Có import/export Excel (Apache POI).
- **Nhập liệu Khai thác** (`ExcavationReportController`/
  `MiningEntryPage`): tương tự Vận tải nhưng cho hoạt động khai thác/máy
  xúc (`ExcavationReportTrip`). Cũng có import/export Excel.
- **Đối chiếu (Reconciliation)**: `ReconciliationController` +
  `ReconciliationDecision` — module MỚI NHẤT trong lịch sử Git. UI có bảng
  so sánh + dialog xác nhận (`ReconciliationPage`, `StandardTripReportPage`).
  Trước đây đối chiếu với dữ liệu đồng bộ từ hệ Mongo cũ — cơ chế đó đã gỡ
  bỏ (2026-08-29), nguồn dữ liệu đối chiếu tương lai cần thiết kế lại cùng
  lúc tích hợp DIEU-PHOI-MM. **Chưa đọc sâu logic chi tiết**.
- **Xuất/nhập Excel** cho cả 2 loại báo cáo (Vận tải, Khai thác).
- **Swagger/OpenAPI**: `/swagger-ui.html`, `/v3/api-docs` — tự sinh từ
  annotation, công khai không cần đăng nhập ở mọi profile.

## 3. Vai trò/quyền — ĐANG THỰC THI THẬT (bật lại 2026-08-29)

- `Role` enum ở backend (nội dung cụ thể chưa liệt kê chi tiết trong lượt
  đọc này — xem `enums/Role.java` nếu cần).
- Frontend có role `ROLE_TRANSPORT` (thấy trong route Vận tải) và cơ chế
  `RoleGuard` chung — ngụ ý còn nhiều role khác theo từng module, chưa liệt
  kê đầy đủ.
- 1 tài khoản `admin` đã seed sẵn (role `ADMIN`, mật khẩu dạng BCrypt hash —
  không rõ giá trị gốc).
- Model phân quyền THIẾT KẾ là theo resource (không theo role cứng):
  `PermissionDto` có 5 cờ create/read/update/delete/admin (`c/r/u/d/a`) cho
  từng "resource" tên tuỳ ý, nhúng trong JWT do Portal cấp — khớp đúng mô
  hình "Lớp 2: trong app đó thấy tính năng gì" mà PORTAL-PM mô tả.

## 4. Chức năng có dấu hiệu MOCK/CHƯA HOÀN CHỈNH

- **Toàn bộ API không có bảo mật thật đang chạy** (xem mục 5) — về mặt kỹ
  thuật MỌI chức năng ở mục 2 đều "hoạt động", nhưng không theo đúng thiết
  kế phân quyền, nên khó khẳng định đã sẵn sàng cho người dùng thật.
- **Đồng bộ Mongo mặc định TẮT ở dev** (`sync.mongo.enabled=false`) — chưa
  verify luồng đồng bộ chạy đúng trên máy này (cần MongoDB "Lệnh SX" thật
  kết nối được).
- **Module đối chiếu** — code mới nhất trong repo, khả năng cao còn đang
  phát triển dở/chưa qua UAT đầy đủ (dựa trên việc đây là 2 commit cuối
  cùng của lịch sử Git tính tới lúc onboarding).

## 5. Chức năng có code nhưng KHÔNG hoạt động đúng / không truy cập được như thiết kế

- ~~Xác thực/phân quyền API bị vô hiệu hoá~~ — **ĐÃ SỬA 2026-08-29**, xem
  `docs/ARCHITECTURE_CURRENT.md` mục 3 (verify sống thật qua preview).
- **WebSocket/`/socket.io/`** — vẫn còn ở `nginx_staging.conf` (không đụng
  trong lượt sửa lần 2), backend Java vẫn không có dependency Socket.IO
  nào. Xem TECHNICAL_DEBT.
- ~~Healthcheck backend port sai~~ — **ĐÃ SỬA 2026-08-29**
  (`backend/docker-compose.yaml`).
- **`SignInPage` không có route nào dùng** (phát hiện mới lượt 2) — luồng
  đăng nhập thật hiện chỉ hoạt động khi bắt đầu từ Portal (đọc `?code=`
  trên URL), không có đường vào trực tiếp từ app này. Xem TECHNICAL_DEBT
  mục 6.

## 6. Đồng bộ dữ liệu hệ cũ — ĐÃ GỠ BỎ (2026-08-29)

Cơ chế đồng bộ MongoDB Change Streams từ hệ "Lệnh SX" cũ đã bị GỠ HOÀN
TOÀN khỏi code theo yêu cầu người dùng — dự án này độc lập, sẽ tích hợp lại
với DIEU-PHOI-MM trong tương lai qua cơ chế riêng (chưa thiết kế), không
liên quan TK-HATU. Toàn bộ mục 2 + 5 (bản cũ) liên quan Mongo trong tài
liệu này không còn áp dụng.

## 7. Chưa xác nhận (cần hỏi chủ dự án)

1. Mật khẩu gốc của tài khoản `admin` đã seed (chỉ có hash) — không tự đoán.
2. Logic nghiệp vụ chi tiết của module Đối chiếu (chưa đọc sâu) — đặc biệt
   nguồn dữ liệu đối chiếu MỚI sẽ là gì sau khi bỏ Mongo (trước đây đối
   chiếu với dữ liệu sync từ hệ cũ).
3. Cơ chế tích hợp cụ thể với DIEU-PHOI-MM trong tương lai (chưa thiết kế,
   ngoài phạm vi lượt sửa này).
4. `SignInPage` không route nào dùng — chủ đích (chỉ vào qua Portal) hay
   code dở dang?
