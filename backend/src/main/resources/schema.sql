-- Migration TỰ ĐỘNG chạy mỗi lần ứng dụng khởi động (spring.sql.init.mode:
-- always, xem application.yaml) — KHÔNG còn cần chạy tay qua psql.
--
-- LƯU Ý (Quality Gate lượt 7 của Codex, 2026-09-16): từ ngày này, Flyway là
-- nguồn xác định CHÍNH cho schema — xem
-- backend/src/main/resources/db/migration/V1__baseline.sql (đã chụp cả 2
-- cột report_periods.locked/stale và departments.full_data_scope dưới đây).
-- File này (schema.sql) GIỮ LẠI làm lớp an toàn PHỤ (idempotent, không hại
-- gì khi chạy lại) trong giai đoạn chuyển tiếp — mọi thay đổi schema MỚI từ
-- nay phải là 1 file Flyway version hoá (`V2__...sql`…), KHÔNG thêm khối DO
-- mới vào đây nữa.
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
-- BẮT BUỘC mọi ALTER TABLE phải bọc trong kiểm tra "bảng đã tồn tại chưa"
-- (Quality Gate lượt 3 của Codex, 2026-09-10 — lỗi thật đã bỏ sót lượt
-- trước): trên CSDL HOÀN TOÀN MỚI (chưa có bảng nào — lần đầu ứng dụng chạy
-- với 1 CSDL trống, không phải "đã có dữ liệu từ trước"), file này vẫn chạy
-- TRƯỚC Hibernate nên `report_periods`/`departments` CHƯA hề tồn tại —
-- `ALTER TABLE report_periods ...` sẽ lỗi "relation does not exist" và làm
-- ứng dụng KHÔNG khởi động được, đúng ngược lại mục đích của file này. Bọc
-- `DO $$ ... IF EXISTS (SELECT FROM information_schema.tables ...) ... $$`
-- để: bảng CHƯA tồn tại thì bỏ qua (Hibernate sẽ tự tạo bảng mới với đúng
-- cột NOT NULL khai trong entity — không cần ALTER gì thêm); bảng ĐÃ tồn
-- tại (CSDL cũ, có thể có/không có dữ liệu) thì ALTER thêm cột như cũ. Cách
-- này đúng cho cả 3 trường hợp Quality Gate yêu cầu: CSDL mới hoàn toàn,
-- CSDL hiện hữu có dữ liệu, và khởi động lại nhiều lần (idempotent cả hai
-- lớp: IF EXISTS bảng + IF NOT EXISTS cột).
--
-- Lịch sử: thay thế migration-2026-09-07-report-period-lock.sql (giờ chỉ
-- còn giá trị tham khảo/chạy tay cho môi trường không rebuild image) — phát
-- hiện qua Quality Gate của Codex (lượt 2, 2026-09-10): script cũ bắt buộc
-- chạy tay là một lỗ hổng vận hành thật (CSDL hiện hữu có thể thiếu cột,
-- ứng dụng lỗi ngay khi có request đầu tiên đọc report_periods).
--
-- LƯU Ý CÚ PHÁP BẮT BUỘC: bộ tách câu lệnh mặc định của Spring cắt file
-- theo dấu ";" đơn giản, không hiểu khối `DO $$ ... $$;` — nên
-- `spring.sql.init.separator` đã đổi sang "@@" (xem application.yaml).
-- MỖI khối DO dưới đây PHẢI kết thúc bằng "@@" ở dòng riêng — dấu ";" bên
-- TRONG khối (giữa BEGIN/END) giữ nguyên, không phải điểm tách câu lệnh nữa.

-- QĐ-03 (2026-09-07) — khoá/mở khoá kỳ báo cáo.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'report_periods') THEN
        ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
        ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS stale  boolean NOT NULL DEFAULT false;
    END IF;
END $$;
@@

-- Quality Gate lượt 2 (2026-09-10) — phân quyền dữ liệu theo đơn vị: đơn vị
-- (Phòng ban) được đánh dấu "thấy toàn bộ" (ví dụ Thống kê) bỏ qua lọc theo
-- đơn vị ở TransportReportService/ExcavationReportService/ReconciliationService.
-- Mặc định false cho MỌI phòng ban hiện có — không tự ý mở rộng quyền xem
-- của bất kỳ phòng ban nào đang có sẵn; bật cờ này cho phòng ban nào là
-- quyết định của chủ dự án, làm qua màn Phòng ban (hoặc API) sau khi deploy.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'departments') THEN
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS full_data_scope boolean NOT NULL DEFAULT false;
    END IF;
END $$;
@@
