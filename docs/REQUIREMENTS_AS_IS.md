# Requirements — Hiện trạng (AS-IS), suy từ code thật

Không có tờ trình/spec nghiệp vụ chính thức đi kèm repo. Tài liệu này suy
ra yêu cầu từ code thật (controller, model, route, UI) — KHÔNG phải yêu cầu
mong muốn/tương lai. Đọc `docs/ARCHITECTURE_CURRENT.md` cho kiến trúc kỹ
thuật, `docs/TECHNICAL_DEBT.md` cho các phát hiện cần xử lý.

## 1. Bối cảnh nghiệp vụ

Hệ thống thống kê sản lượng khai thác than tại mỏ Cao Sơn (Cẩm Phả, Quảng
Ninh) — tương tự nhóm ứng dụng "Lệnh sản xuất" khác trong factory (TK-HATU
= Hà Tu, DIEU-PHOI-MM = điều phối máy móc), nhưng là một triển khai RIÊNG,
tech stack khác hẳn (Spring Boot/Postgres/React thay vì Node/MongoDB), có
thêm module đồng bộ dữ liệu MỘT CHIỀU từ hệ MongoDB cũ.

## 2. Chức năng đã có code + có route/API — hoạt động được về mặt kỹ thuật

(Chưa verify qua UI/browser thật trong lượt onboarding này — chỉ xác nhận
build PASS + tồn tại controller/route khớp nhau. Do bảo mật đang tắt hoàn
toàn, "gọi được API" không đồng nghĩa "đã được duyệt về mặt nghiệp vụ".)

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
  `ReconciliationDecision` — module MỚI NHẤT trong lịch sử Git (2 commit
  cuối trước onboarding). UI có bảng so sánh + dialog xác nhận
  (`ReconciliationPage`, `StandardTripReportPage`). Suy luận từ tên bảng/
  entity: so sánh số liệu nhập tay với số liệu đồng bộ từ hệ Mongo cũ,
  người dùng xác nhận giữ số nào — **chưa đọc sâu logic chi tiết** (ngoài
  phạm vi đọc kiến trúc của onboarding này).
- **Đồng bộ dữ liệu từ hệ cũ** (khi bật `sync.mongo.enabled=true`): tự
  động đồng bộ danh mục (không phải báo cáo) từ MongoDB "Lệnh SX" qua
  Change Streams — xem chi tiết kỹ thuật ở ARCHITECTURE_CURRENT mục 4.
- **Xuất/nhập Excel** cho cả 2 loại báo cáo (Vận tải, Khai thác).
- **Swagger/OpenAPI**: `/swagger-ui.html`, `/v3/api-docs` — tự sinh từ
  annotation, công khai không cần đăng nhập ở mọi profile.

## 3. Vai trò/quyền — theo thiết kế (chưa thực thi thật, xem mục 5)

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

- **Xác thực/phân quyền API**: có code đầy đủ (`AppTokenFilter`,
  `PermissionFilter`, OAuth2 resource server) nhưng bị VÔ HIỆU HOÁ hoàn
  toàn trong `SecurityConfig` hiện tại — API thực tế PUBLIC 100%, không
  khớp với thiết kế "phải có JWT + permission". Xem TECHNICAL_DEBT mục 🔴 1.
- **WebSocket/`/socket.io/`** — có route ở tầng reverse-proxy nhưng backend
  Java hiện không thấy dependency Socket.IO nào — nhiều khả năng route này
  chết/copy nhầm từ project khác. Xem TECHNICAL_DEBT mục 6.
- **Healthcheck backend qua Docker Compose local** — cấu hình port sai
  (`8099:8090` trong khi app lắng nghe `8088`) nên container không bao giờ
  báo "healthy" đúng cách qua cổng đó dù app có thể vẫn chạy tốt bên trong.
  Xem TECHNICAL_DEBT mục 5.

## 6. Chưa xác nhận (cần hỏi chủ dự án)

1. MongoDB "Lệnh SX" nguồn đồng bộ có phải chính hệ mà TK-HATU/DIEU-PHOI-MM
   đang dùng không?
2. Mật khẩu gốc của tài khoản `admin` đã seed (chỉ có hash).
3. `.anyRequest().permitAll() // test` — có đúng là quên revert cấu hình
   debug hay là chủ đích tạm thời cho giai đoạn phát triển hiện tại?
4. Logic nghiệp vụ chi tiết của module Đối chiếu (chưa đọc sâu trong lượt
   onboarding này).
