# Migration cũ — đã lỗi thời, chỉ lưu tham khảo lịch sử

Các file `.sql` trong thư mục này là migration **thủ công** ("chạy tay sau
khi deploy") được viết trước khi dự án có Flyway (Quality Gate lượt 7 của
Codex, 2026-09-16). Chúng đã được **áp dụng xong** vào mọi CSDL đang chạy
(dev/staging/preview/prod) từ trước ngày đó.

**Không chạy lại các file này.** Schema kết quả sau khi áp dụng đủ cả 6 file
đã được chụp lại nguyên trạng thành
[`backend/src/main/resources/db/migration/V1__baseline.sql`](../src/main/resources/db/migration/V1__baseline.sql)
— đây mới là nguồn xác định schema cho:

- **CSDL hoàn toàn mới** (môi trường mới, disaster recovery): Flyway tự chạy
  `V1__baseline.sql` khi ứng dụng khởi động, dựng đủ toàn bộ bảng/cột/khoá —
  không cần đụng tới bất kỳ file nào trong thư mục này.
- **CSDL hiện hữu** (đã có `V1__baseline.sql` là baseline qua
  `spring.flyway.baseline-on-migrate=true`): không cần làm gì thêm, các file
  này đã phản ánh đầy đủ trong baseline đó rồi.

Giữ lại các file này chỉ để tra cứu **lý do lịch sử** (mỗi file đều giải
thích rõ vì sao cần di trú, đổi gì) — không xoá theo quy tắc dự án ("không
xoá dữ liệu/tài liệu hiện có nếu chưa được yêu cầu rõ ràng").

Mọi thay đổi schema/dữ liệu **từ nay về sau** phải là 1 file Flyway mới
(`V2__...sql`, `V3__...sql`… trong `backend/src/main/resources/db/migration/`),
không quay lại cách viết `.sql` rời rồi dặn chạy tay.
