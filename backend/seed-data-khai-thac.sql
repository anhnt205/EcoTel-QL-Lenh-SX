-- ==================================================
-- Seed dữ liệu mẫu cho nghiệp vụ KHAI THÁC (báo chuyến + nhiên liệu).
--
-- Bổ sung cho `seed-data.sql` (file đó chỉ seed departments/positions/
-- shifts/locations/user admin). File này thêm: phân xưởng vận tải, chủng
-- loại xe, thiết bị (máy xúc + xe), nhóm/chủng loại hàng, công nhân lái
-- máy, và 6 phiếu báo chuyến kèm 11 dòng chuyến.
--
-- Dữ liệu lấy theo đúng ảnh mockup giao diện Nhập liệu khai thác để có thể
-- kiểm chứng trực quan (Nơi chất tải KX1..KX4, Máy xúc P15..P18, Tầng xúc
-- 300/250/200/150, xe 473/505/474/511/482/503/475/496/468).
--
-- CHỈ chạy SAU KHI Spring Boot đã khởi động ít nhất 1 lần (Hibernate
-- ddl-auto: update đã tạo xong bảng). Chạy sau `seed-data.sql`.
--
--   docker exec -i thongke-caoson-preview-postgres-1 \
--     psql -U postgres -d thong_ke < seed-data-khai-thac.sql
--
-- Chạy lại nhiều lần được: mọi INSERT đều ON CONFLICT DO NOTHING.
-- ==================================================

-- ── Phân xưởng vận tải (đơn vị quản lý thiết bị) ────────────────────────
INSERT INTO departments (id, name, code, description, created_at, updated_at) VALUES
(11, 'Phân xưởng Vận tải 7', 'VT7', 'Phân xưởng vận tải số 7', NOW(), NOW()),
(12, 'Phân xưởng Vận tải 8', 'VT8', 'Phân xưởng vận tải số 8', NOW(), NOW()),
(13, 'Phân xưởng Vận tải 9', 'VT9', 'Phân xưởng vận tải số 9', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ── Ca 4 (mockup bảng nhiên liệu có Ca 4) ───────────────────────────────
INSERT INTO shifts (id, name, start_time, end_time, created_at, updated_at) VALUES
(4, 4, '06:00', '18:00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Nơi chất tải (khu vực xúc) ──────────────────────────────────────────
INSERT INTO locations (id, name, latitude, longitude, distance, created_at, updated_at) VALUES
(11, 'KX1', NULL, NULL, NULL, NOW(), NOW()),
(12, 'KX2', NULL, NULL, NULL, NOW(), NOW()),
(13, 'KX3', NULL, NULL, NULL, NOW(), NOW()),
(14, 'KX4', NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Chủng loại thiết bị ─────────────────────────────────────────────────
-- group_type: XE = ô tô, MAY = máy xúc (theo enum DeviceGroup)
INSERT INTO device_types (id, code, name, group_type, description, created_at, updated_at) VALUES
(11, 'HD785-7',  'HD785-7',  'XE',  'Xe tải HD785-7',  NOW(), NOW()),
(12, 'HD465-7R', 'HD465-7R', 'XE',  'Xe tải HD465-7R', NOW(), NOW()),
(13, 'HD325-7',  'HD325-7',  'XE',  'Xe tải HD325-7',  NOW(), NOW()),
(14, 'MX-PC',    'Máy xúc',  'MAY', 'Máy xúc thuỷ lực', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Thiết bị: máy xúc ───────────────────────────────────────────────────
INSERT INTO devices (id, code, name, vehicle_number, category_id, department_id, status, created_at, updated_at) VALUES
(101, 'P15', 'Máy xúc P15', NULL, 14, 11, 'AVAILABLE', NOW(), NOW()),
(102, 'P16', 'Máy xúc P16', NULL, 14, 11, 'AVAILABLE', NOW(), NOW()),
(103, 'P17', 'Máy xúc P17', NULL, 14, 12, 'AVAILABLE', NOW(), NOW()),
(104, 'P18', 'Máy xúc P18', NULL, 14, 13, 'AVAILABLE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Thiết bị: xe vận tải ────────────────────────────────────────────────
INSERT INTO devices (id, code, name, vehicle_number, category_id, department_id, status, created_at, updated_at) VALUES
(201, '473', 'Xe 473', '473', 11, 11, 'AVAILABLE', NOW(), NOW()),
(202, '505', 'Xe 505', '505', 12, 13, 'AVAILABLE', NOW(), NOW()),
(203, '474', 'Xe 474', '474', 11, 11, 'AVAILABLE', NOW(), NOW()),
(204, '511', 'Xe 511', '511', 13, 12, 'AVAILABLE', NOW(), NOW()),
(205, '482', 'Xe 482', '482', 11, 13, 'AVAILABLE', NOW(), NOW()),
(206, '503', 'Xe 503', '503', 12, 13, 'AVAILABLE', NOW(), NOW()),
(207, '475', 'Xe 475', '475', 13, 11, 'AVAILABLE', NOW(), NOW()),
(208, '496', 'Xe 496', '496', 13, 12, 'AVAILABLE', NOW(), NOW()),
(209, '468', 'Xe 468', '468', 11, 11, 'AVAILABLE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Nhóm hàng / Chủng loại hàng ─────────────────────────────────────────
INSERT INTO cargo_groups (id, code, name, description, created_at, updated_at) VALUES
(11, 'THAN', 'Than',    'Nhóm hàng than',  NOW(), NOW()),
(12, 'DAT',  'Đất đá',  'Nhóm hàng đất đá', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargo_types (id, code, name, cargo_group_id, description, created_at, updated_at) VALUES
(11, 'THAN', 'Than', 11, 'Than nguyên khai', NOW(), NOW()),
(12, 'DA',   'Đá',   12, 'Đá thải',          NOW(), NOW()),
(13, 'DAT',  'Đất',  12, 'Đất bóc',          NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Công nhân lái máy (số thẻ lương theo mockup) ────────────────────────
-- password = cùng hash BCrypt với user admin trong seed-data.sql; các tài
-- khoản này chỉ dùng làm dữ liệu tham chiếu cho báo cáo, không để đăng nhập.
INSERT INTO users (id, username, password, full_name, email, salary_code, role, active, department_id, position_id, created_at, updated_at) VALUES
(11, 'nxbang',  '$2b$12$xTUDCRbU9WMwoLZ/E4q/Ve1mmiReVQ75gLBNhKqvwbPYkVghlzyzC', 'Nguyễn Xuân Bằng', 'nxbang@thongke.local',  '8753', 'EMPLOYEE', true, 11, 4, NOW(), NOW()),
(12, 'tvminh',  '$2b$12$xTUDCRbU9WMwoLZ/E4q/Ve1mmiReVQ75gLBNhKqvwbPYkVghlzyzC', 'Trần Văn Minh',    'tvminh@thongke.local',  '8754', 'EMPLOYEE', true, 12, 4, NOW(), NOW()),
(13, 'lqhung',  '$2b$12$xTUDCRbU9WMwoLZ/E4q/Ve1mmiReVQ75gLBNhKqvwbPYkVghlzyzC', 'Lê Quốc Hùng',     'lqhung@thongke.local',  '8755', 'EMPLOYEE', true, 12, 4, NOW(), NOW()),
(14, 'pvdung',  '$2b$12$xTUDCRbU9WMwoLZ/E4q/Ve1mmiReVQ75gLBNhKqvwbPYkVghlzyzC', 'Phạm Văn Dũng',    'pvdung@thongke.local',  '8756', 'EMPLOYEE', true, 13, 4, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- ── Phiếu báo chuyến (header) ───────────────────────────────────────────
-- Khoá duy nhất: (report_date, shift_id, excavator_device_id, employee_id)
-- fuel_used = fuel_beginning + fuel_received - fuel_ending (tính sẵn đúng
-- công thức của ExcavationReport.recalculateFuelUsed()).
INSERT INTO excavation_reports
  (id, report_date, shift_id, excavator_device_id, receiving_location_id, excavation_floor,
   employee_id, fuel_beginning, fuel_received, fuel_ending, fuel_used, created_at, updated_at) VALUES
(1001, DATE '2026-08-05', 1, 101, 11, '300', 11, 1188, 590, 831, 947, NOW(), NOW()),
(1002, DATE '2026-08-05', 1, 102, 11, '300', 11, 1188, 590, 831, 947, NOW(), NOW()),
(1003, DATE '2026-08-06', 2, 102, 12, '250', 12, 1102, 520, 782, 840, NOW(), NOW()),
(1004, DATE '2026-08-05', 2, 102, 12, '250', 12, 1102, 520, 782, 840, NOW(), NOW()),
(1005, DATE '2026-08-06', 3, 103, 13, '200', 13, 1215, 600, 830, 985, NOW(), NOW()),
(1006, DATE '2026-08-05', 4, 104, 14, '150', 14, 1087, 570, 760, 897, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Dòng chuyến ─────────────────────────────────────────────────────────
-- load_level_type: FULL_LOAD | RODA_2_3 | OTHER (enum LoadLevelType)
INSERT INTO excavation_report_trips
  (id, excavation_report_id, vehicle_device_id, trip_count, cargo_type_id, cargo_group_id,
   load_level_type, load_level_custom_value, status, created_at, updated_at) VALUES
(2001, 1001, 201, 6, 11, 11, 'FULL_LOAD', NULL,  'PENDING', NOW(), NOW()),
(2002, 1001, 202, 8, 12, 12, 'RODA_2_3',  NULL,  'PENDING', NOW(), NOW()),
(2003, 1001, 203, 4, 11, 11, 'OTHER',     '1/2', 'PENDING', NOW(), NOW()),
(2004, 1001, 204, 3, 13, 12, 'FULL_LOAD', NULL,  'PENDING', NOW(), NOW()),
(2005, 1002, 201, 5, 11, 11, 'RODA_2_3',  NULL,  'PENDING', NOW(), NOW()),
(2006, 1003, 205, 7, 11, 11, 'FULL_LOAD', NULL,  'PENDING', NOW(), NOW()),
(2007, 1003, 206, 9, 12, 12, 'OTHER',     '1/3', 'PENDING', NOW(), NOW()),
(2008, 1004, 207, 4, 11, 11, 'RODA_2_3',  NULL,  'PENDING', NOW(), NOW()),
(2009, 1004, 208, 6, 13, 12, 'FULL_LOAD', NULL,  'PENDING', NOW(), NOW()),
(2010, 1005, 209, 5, 11, 11, 'RODA_2_3',  NULL,  'PENDING', NOW(), NOW()),
(2011, 1006, 205, 5, 13, 12, 'FULL_LOAD', NULL,  'PENDING', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Đồng bộ sequence ────────────────────────────────────────────────────
SELECT setval('department_seq',             GREATEST((SELECT COALESCE(MAX(id),0) FROM departments), 1));
SELECT setval('shift_seq',                  GREATEST((SELECT COALESCE(MAX(id),0) FROM shifts), 1));
SELECT setval('location_seq',               GREATEST((SELECT COALESCE(MAX(id),0) FROM locations), 1));
SELECT setval('device_type_seq',            GREATEST((SELECT COALESCE(MAX(id),0) FROM device_types), 1));
SELECT setval('device_seq',                 GREATEST((SELECT COALESCE(MAX(id),0) FROM devices), 1));
SELECT setval('cargo_group_seq',            GREATEST((SELECT COALESCE(MAX(id),0) FROM cargo_groups), 1));
SELECT setval('cargo_type_seq',             GREATEST((SELECT COALESCE(MAX(id),0) FROM cargo_types), 1));
SELECT setval('user_seq',                   GREATEST((SELECT COALESCE(MAX(id),0) FROM users), 1));
SELECT setval('excavation_report_seq',      GREATEST((SELECT COALESCE(MAX(id),0) FROM excavation_reports), 1));
SELECT setval('excavation_report_trip_seq', GREATEST((SELECT COALESCE(MAX(id),0) FROM excavation_report_trips), 1));

SELECT 'Seed khai thac OK: '
     || (SELECT COUNT(*) FROM excavation_reports) || ' phieu, '
     || (SELECT COUNT(*) FROM excavation_report_trips) || ' chuyen' AS status;
