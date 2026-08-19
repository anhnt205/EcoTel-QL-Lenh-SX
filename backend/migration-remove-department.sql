-- =============================================================
-- Migration: Bỏ trường department khỏi báo cáo Vận tải & Khai thác
-- Chạy SAU KHI deploy code mới
-- =============================================================

-- Xóa FK constraint trước (tên có thể khác tùy Hibernate đã tạo)
ALTER TABLE transport_reports DROP CONSTRAINT IF EXISTS fk_transport_report_department;
ALTER TABLE transport_reports DROP CONSTRAINT IF EXISTS fk_transport_reports_department;
ALTER TABLE transport_reports DROP CONSTRAINT IF EXISTS fk_transport_reports_department_id;

ALTER TABLE excavation_reports DROP CONSTRAINT IF EXISTS fk_excavation_report_department;
ALTER TABLE excavation_reports DROP CONSTRAINT IF EXISTS fk_excavation_reports_department;
ALTER TABLE excavation_reports DROP CONSTRAINT IF EXISTS fk_excavation_reports_department_id;

-- Xóa cột department_id
ALTER TABLE transport_reports DROP COLUMN IF EXISTS department_id;
ALTER TABLE excavation_reports DROP COLUMN IF EXISTS department_id;
