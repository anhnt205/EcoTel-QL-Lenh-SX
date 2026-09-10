-- ĐÃ THAY THẾ bởi backend/src/main/resources/schema.sql (2026-09-10, Quality
-- Gate lượt 2) — ứng dụng giờ TỰ chạy migration này (và các migration tương
-- tự sau này) mỗi lần khởi động, không cần chạy tay nữa. File này CHỈ còn
-- giá trị tham khảo lịch sử, hoặc chạy tay cho môi trường đặc biệt không
-- rebuild/khởi động lại ứng dụng (hiếm khi cần).
--
-- Bổ sung khoá/mở khoá kỳ báo cáo (QĐ-03) — bắt buộc chạy TAY.
--
-- Vì sao Hibernate `ddl-auto: update` không tự làm được: hai cột mới
-- (`ReportPeriod.locked`/`stale`) khai NOT NULL nhưng KHÔNG có giá trị mặc
-- định ở tầng JPA. `ALTER TABLE ... ADD COLUMN ... NOT NULL` trên PostgreSQL
-- từ chối ngay nếu bảng đã có dòng — không có gì để điền vào các dòng cũ.
-- Bảng `report_periods` ở đây LUÔN có dữ liệu thật (kỳ báo cáo khai từ khi
-- onboarding dự án), nên lỗi này chắc chắn xảy ra ở mọi môi trường, không
-- chỉ preview. Hibernate log lỗi này thành WARN rồi bỏ qua — ứng dụng vẫn
-- khởi động "thành công" nhưng hai cột không hề được tạo, và MỌI truy vấn
-- đọc `ReportPeriod` sau đó (kể cả `GET /api/report-periods` bình thường)
-- sẽ vỡ với "column locked does not exist" ở tầng SQL.
--
-- Migration ONE-LẦN — chạy trước khi deploy code có `ReportPeriod.locked`/
-- `stale` (commit sửa Quality Gate của Codex, 2026-09-07). Có thể chạy lại
-- an toàn (IF NOT EXISTS).
--
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/migration-2026-09-07-report-period-lock.sql

ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS stale  boolean NOT NULL DEFAULT false;
