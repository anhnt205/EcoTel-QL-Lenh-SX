-- Migration TỰ ĐỘNG chạy mỗi lần ứng dụng khởi động (spring.sql.init.mode:
-- always, xem application.yaml) — KHÔNG còn cần chạy tay qua psql.
--
-- Vì sao KHÔNG thể chỉ dựa vào Hibernate `ddl-auto: update`: cột mới khai
-- NOT NULL nhưng không có giá trị mặc định ở tầng JPA thì Hibernate sinh
-- `ALTER TABLE ... ADD COLUMN ... NOT NULL` KHÔNG kèm DEFAULT — Postgres từ
-- chối ngay nếu bảng đã có dòng (không có gì để điền vào dòng cũ). Hibernate
-- chỉ log WARN rồi bỏ qua, ứng dụng vẫn khởi động "thành công" nhưng cột
-- không hề được tạo, và mọi truy vấn đọc cột đó sau này vỡ với "column ...
-- does not exist". File này chạy TRƯỚC Hibernate (spring.jpa.defer-
-- datasource-initialization mặc định false) nên cột đã có sẵn, đúng kiểu,
-- đúng NOT NULL, trước khi Hibernate kịp đụng vào.
--
-- BẮT BUỘC mọi câu lệnh ở đây phải IDEMPOTENT (`IF NOT EXISTS`, chạy lại
-- nhiều lần không lỗi) — file này chạy lại mỗi lần khởi động ứng dụng, trên
-- MỌI môi trường (kể cả CSDL đã có sẵn dữ liệu thật từ trước).
--
-- Lịch sử: thay thế migration-2026-09-07-report-period-lock.sql (giờ chỉ
-- còn giá trị tham khảo/chạy tay cho môi trường không rebuild image) — phát
-- hiện qua Quality Gate của Codex (lượt 2, 2026-09-10): script cũ bắt buộc
-- chạy tay là một lỗ hổng vận hành thật (CSDL hiện hữu có thể thiếu cột,
-- ứng dụng lỗi ngay khi có request đầu tiên đọc report_periods).

-- QĐ-03 (2026-09-07) — khoá/mở khoá kỳ báo cáo.
ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS stale  boolean NOT NULL DEFAULT false;

-- Quality Gate lượt 2 (2026-09-10) — phân quyền dữ liệu theo đơn vị: đơn vị
-- (Phòng ban) được đánh dấu "thấy toàn bộ" (ví dụ Thống kê) bỏ qua lọc theo
-- đơn vị ở TransportReportService/ExcavationReportService/ReconciliationService.
-- Mặc định false cho MỌI phòng ban hiện có — không tự ý mở rộng quyền xem
-- của bất kỳ phòng ban nào đang có sẵn; bật cờ này cho phòng ban nào là
-- quyết định của chủ dự án, làm qua màn Phòng ban (hoặc API) sau khi deploy.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS full_data_scope boolean NOT NULL DEFAULT false;
