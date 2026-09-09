-- Bootstrap "Danh mục Hệ thống" (Phòng ban / Chức vụ / phân quyền theo Chức
-- vụ) — chủ dự án chốt 2026-09-10: quyền của tài khoản giờ tính hoàn toàn từ
-- Chức vụ (bảng position_permissions), KHÔNG còn hard-code theo Role nữa
-- (xem LocalAuthService.permissionsFor).
--
-- CHẠY SAU KHI backend đã boot ít nhất 1 lần với entity Department/Position/
-- PositionPermission mới (Hibernate ddl-auto=update tự tạo cột
-- positions.department_id + bảng department_resources/position_permissions)
-- — chạy trước sẽ báo lỗi "relation does not exist".
--
-- Mục đích: gán tài khoản admin/xemthu seed sẵn (trước đây role=ADMIN, quyền
-- tính tĩnh full mọi resource) vào 1 Chức vụ "Quản trị hệ thống" có đủ quyền
-- C/R/U/D/A trên MỌI resource — để không bị khoá ngay khi đổi cơ chế phân
-- quyền, KHÔNG phải giữ lại đường tắt theo Role (đã bỏ hẳn).

-- 1) Phòng ban gốc, được phép dùng MỌI chức năng (không phải phòng ban
--    nghiệp vụ thật — chỉ để gán cho Chức vụ quản trị).
INSERT INTO departments (id, code, name, description, created_at, updated_at)
SELECT nextval('department_seq'), 'ADMIN', 'Ban Quản trị hệ thống',
       'Phòng ban kỹ thuật dùng để gán Chức vụ Quản trị hệ thống — không phải phòng ban nghiệp vụ thật',
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'ADMIN');

-- 2) Chức vụ "Quản trị hệ thống", thuộc phòng ban trên.
INSERT INTO positions (id, code, name, description, department_id, created_at, updated_at)
SELECT nextval('position_seq'), 'SUPERADMIN', 'Quản trị hệ thống',
       'Đủ quyền C/R/U/D/A trên mọi chức năng — gán cho tài khoản quản trị (admin, xemthu)',
       (SELECT id FROM departments WHERE code = 'ADMIN'),
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE code = 'SUPERADMIN');

-- 3) Phòng ban ADMIN được phép dùng MỌI resource — danh sách phải khớp
--    PermissionResources.ALL (backend/.../security/PermissionResources.java).
--    idempotent: xoá hết rồi chèn lại, để chạy lại file này không bị lỗi
--    trùng khoá và luôn đồng bộ đúng danh sách hiện tại.
DELETE FROM department_resources
WHERE department_id = (SELECT id FROM departments WHERE code = 'ADMIN');

INSERT INTO department_resources (department_id, resource)
SELECT (SELECT id FROM departments WHERE code = 'ADMIN'), resource
FROM (VALUES
    ('users'), ('departments'), ('positions'), ('shifts'), ('locations'),
    ('devices'), ('device-types'), ('materials'), ('cargo-groups'), ('cargo-types'),
    ('excavation-reports'), ('transport-reports'), ('reconciliation'),
    ('acceptance-products'), ('classifications'), ('coefficients'),
    ('density-parameters'), ('device-production-attributes'), ('excavation-areas'),
    ('matrix-catalogs'), ('model-periods'), ('pickup-points'), ('production'),
    ('receiving-points'), ('report-periods'), ('seam-groups'), ('survey-standards'),
    ('ttl-clh-items'), ('unloading-points'), ('vehicle-category-classes'),
    ('vehicle-fuel-classes'), ('vehicle-rank-groups'), ('vehicle-ranks'),
    ('vehicle-types')
) AS r(resource);

-- 4) Chức vụ Quản trị hệ thống có đủ C/R/U/D/A trên từng resource ở trên.
DELETE FROM position_permissions
WHERE position_id = (SELECT id FROM positions WHERE code = 'SUPERADMIN');

INSERT INTO position_permissions (id, position_id, resource, can_create, can_read, can_update, can_delete, can_approve)
SELECT nextval('position_permission_seq'),
       (SELECT id FROM positions WHERE code = 'SUPERADMIN'),
       resource, true, true, true, true, true
FROM department_resources
WHERE department_id = (SELECT id FROM departments WHERE code = 'ADMIN');

-- 5) Gán admin + xemthu vào Chức vụ Quản trị hệ thống (và phòng ban tương ứng).
UPDATE users
SET position_id = (SELECT id FROM positions WHERE code = 'SUPERADMIN'),
    department_id = (SELECT id FROM departments WHERE code = 'ADMIN'),
    updated_at = NOW()
WHERE username IN ('admin', 'xemthu');
