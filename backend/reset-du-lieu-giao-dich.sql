-- ════════════════════════════════════════════════════════════════════════
-- RESET DỮ LIỆU GIAO DỊCH — chỉ giữ lại DANH MỤC, để chủ dự án tự test
-- một lượt trọn vẹn từ đầu (nhập báo chuyến → tính sản lượng → chốt kỳ).
--
-- XOÁ (dữ liệu giao dịch/kết quả — sinh ra TỪ danh mục, không phải danh mục):
--   production_results, survey_coefficients, report_period_audits,
--   reconciliation_decisions, transport_report_trips, transport_reports,
--   excavation_report_trips, excavation_reports, material_value_history,
--   user_device_tokens.
--
-- GIỮ NGUYÊN (danh mục — mọi bảng còn lại): đơn vị, xe/máy, khu vực xúc,
-- chủng loại hàng/xe, tỷ trọng, STD, các lưới (ĐMNL/Mô hình/Năng suất xe/
-- HS điều chỉnh), Kỳ báo cáo, người dùng (kể cả tài khoản xemthu để còn
-- đăng nhập test) …
--
-- report_periods GIỮ NGUYÊN các dòng (đó là danh mục), nhưng RESET
-- locked/stale về false — hai cờ đó phản ánh trạng thái của phiên test
-- trước, không phải cấu trúc danh mục; giữ locked=true trong khi
-- production_results đã bị xoá sẽ chặn không cho tính lại được nữa.
--
-- Thứ tự xoá theo đúng chiều khoá ngoại (con trước, cha sau).
--
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/reset-du-lieu-giao-dich.sql
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM reconciliation_decisions;
DELETE FROM production_results;
DELETE FROM excavation_report_trips;
DELETE FROM transport_report_trips;
DELETE FROM survey_coefficients;
DELETE FROM report_period_audits;
DELETE FROM excavation_reports;
DELETE FROM transport_reports;
DELETE FROM material_value_history;
DELETE FROM user_device_tokens;

UPDATE report_periods SET locked = false, stale = false;

COMMIT;
