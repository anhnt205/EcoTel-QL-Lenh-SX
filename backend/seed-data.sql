-- ==================================================
-- File seed dữ liệu mẫu.
-- CHỈ chạy file này SAU KHI ứng dụng Spring Boot đã khởi động
-- ít nhất 1 lần và Hibernate đã tạo xong các bảng (ddl-auto: update).
--
-- Cách chạy thủ công, ví dụ:
--   docker exec -i <postgres_container_name> \
--     psql -U <db_user> -d thong_ke < seed-data.sql
-- hoặc mở psql rồi \i seed-data.sql
-- ==================================================

\c thong_ke;

-- Phòng ban (departments)
-- Lưu ý: 'Phòng Kỹ thuật' và 'Phòng Kế toán' trước đây cùng dùng code 'KT'
-- gây vi phạm UNIQUE(code) ngay trong 1 câu INSERT (ON CONFLICT không bắt
-- được xung đột giữa các dòng của cùng statement). Đã đổi thành 'KTO'.
INSERT INTO departments (id, name, code, description, created_at, updated_at) VALUES
(1, 'Phòng Kỹ thuật', 'KT', 'Phòng kỹ thuật và bảo trì', NOW(), NOW()),
(2, 'Phòng Kinh doanh', 'KD', 'Phòng kinh doanh và bán hàng', NOW(), NOW()),
(3, 'Phòng Hành chính', 'HC', 'Phòng hành chính nhân sự', NOW(), NOW()),
(4, 'Phòng Kế toán', 'KTO', 'Phòng kế toán và tài chính', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Chức vụ (positions)
-- Schema thật (theo \d positions): id, name, created_at, updated_at
-- (KHÔNG có cột description)
INSERT INTO positions (id, name, created_at, updated_at) VALUES
(1, 'Giám đốc', NOW(), NOW()),
(2, 'Phó Giám đốc', NOW(), NOW()),
(3, 'Trưởng phòng', NOW(), NOW()),
(4, 'Nhân viên', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Ca làm việc (shifts) - name là Integer
INSERT INTO shifts (id, name, start_time, end_time, created_at, updated_at) VALUES
(1, 1, '06:00', '14:00', NOW(), NOW()),
(2, 2, '14:00', '22:00', NOW(), NOW()),
(3, 3, '22:00', '06:00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Vị trí/Khu vực (locations)
-- Schema thật (theo \d locations): id, name, latitude, longitude, distance,
-- created_at, updated_at (KHÔNG có cột address/description)
-- latitude/longitude/distance để NULL vì chưa có dữ liệu tọa độ thật.
INSERT INTO locations (id, name, latitude, longitude, distance, created_at, updated_at) VALUES
(1, 'Kho A', NULL, NULL, NULL, NOW(), NOW()),
(2, 'Kho B', NULL, NULL, NULL, NOW(), NOW()),
(3, 'Văn phòng', NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- User admin mặc định
-- Password: admin123 (đã encode BCrypt) - nên tự verify lại hash trước khi dùng thật.
-- Đổi password ngay sau khi đăng nhập lần đầu.
INSERT INTO users (id, username, password, full_name, email, salary_code, role, active, created_at, updated_at) VALUES
(1, 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'Administrator', 'admin@thongke.com', 'ADMIN001', 'ADMIN', true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Cập nhật sequence value sau khi insert dữ liệu mẫu (tránh conflict khi insert mới)
-- setval(seq, MAX(id)) với is_called=true (mặc định) => nextval() kế tiếp trả về MAX(id)+1.
-- Dùng GREATEST(..., 1) để tránh lỗi "value 0 is out of bounds" khi bảng
-- đang trống (Postgres sequence không cho phép set giá trị < 1).
SELECT setval('department_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM departments), 1));
SELECT setval('position_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM positions), 1));
SELECT setval('user_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM users), 1));
SELECT setval('shift_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM shifts), 1));
SELECT setval('location_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM locations), 1));

-- Các sequence còn lại (device_type, device_model, device_file, material,
-- material_value_history, load_level, cargo_type, cargo_group) hiện chưa
-- có dữ liệu seed nên không cần setval. Nếu sau này thêm INSERT mẫu cho
-- các bảng này, nhớ bổ sung setval tương ứng.

SELECT 'Seed data inserted successfully!' AS status;