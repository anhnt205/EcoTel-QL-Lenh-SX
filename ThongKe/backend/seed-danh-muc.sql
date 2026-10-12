-- ==================================================================
-- Seed 5 danh mục mới (2026-08-30). Chạy lại nhiều lần được.
--   docker exec -i <pg> psql -U postgres -d thong_ke < seed-danh-muc.sql
-- ==================================================================

-- ── Nơi dỡ tải ─────────────────────────────────────────────────────
INSERT INTO unloading_points (id, code, name, note, created_at, updated_at) VALUES
(1,'NDTT001','Kho số 1','Kho chứa than số 1',NOW(),NOW()),
(2,'NDTT002','Kho số 2','Kho chứa than số 2',NOW(),NOW()),
(3,'NDTT003','Kho số 3','Kho chứa than số 3',NOW(),NOW()),
(4,'NDTT004','Bãi nhận tải 1','Bãi nhận tải khu Bắc',NOW(),NOW()),
(5,'NDTT005','Bãi nhận tải 2','Bãi nhận tải khu Nam',NOW(),NOW()),
(6,'NDTT006','Cửa nhận tải Đông','Khu nhận tải phía Đông',NOW(),NOW()),
(7,'NDTT007','Cửa nhận tải Tây','Khu nhận tải phía Tây',NOW(),NOW()),
(8,'NDTT008','Kho trung chuyển 1','Kho trung chuyển số 1',NOW(),NOW()),
(9,'NDTT009','Kho trung chuyển 2','Kho trung chuyển số 2',NOW(),NOW()),
(10,'NDTT010','Điểm nhận phụ trợ','Khu nhận tải phụ trợ',NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

-- ── Nơi chất tải ───────────────────────────────────────────────────
INSERT INTO pickup_points (id, code, name, note, created_at, updated_at) VALUES
(1,'NCTT001','Kho số 1','Kho chứa than số 1',NOW(),NOW()),
(2,'NCTT002','Kho số 2','Kho chứa than số 2',NOW(),NOW()),
(3,'NCTT003','Kho số 3','Kho chứa than số 3',NOW(),NOW()),
(4,'NCTT004','Bãi nhận tải 1','Bãi nhận tải khu Bắc',NOW(),NOW()),
(5,'NCTT005','Bãi nhận tải 2','Bãi nhận tải khu Nam',NOW(),NOW()),
(6,'NCTT006','Cửa nhận tải Đông','Khu nhận tải phía Đông',NOW(),NOW()),
(7,'NCTT007','Cửa nhận tải Tây','Khu nhận tải phía Tây',NOW(),NOW()),
(8,'NCTT008','Kho trung chuyển 1','Kho trung chuyển số 1',NOW(),NOW()),
(9,'NCTT009','Kho trung chuyển 2','Kho trung chuyển số 2',NOW(),NOW()),
(10,'NCTT010','Điểm nhận phụ trợ','Khu nhận tải phụ trợ',NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

-- ── Nhóm chủng loại hàng (bổ sung cho combobox) ────────────────────
INSERT INTO cargo_groups (id, code, name, description, created_at, updated_at) VALUES
(21,'THAN_NK','Than nguyên khai','Than khai thác trực tiếp',NOW(),NOW()),
(22,'DA_THAI','Đá thải','Đá thải mỏ',NOW(),NOW()),
(23,'DAT_BOC','Đất đá bóc','Đất đá bóc phủ',NOW(),NOW()),
(24,'BUN_THAI','Bùn thải','Bùn thải tuyển',NOW(),NOW()),
(25,'THAN_TP','Than thành phẩm','Than đã qua chế biến',NOW(),NOW()),
(26,'KS_KHAC','Khoáng sản khác','Khoáng sản phụ',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Chủng loại hàng ────────────────────────────────────────────────
INSERT INTO cargo_types (id, code, name, cargo_group_id, acceptance_product, ttl_clh, description, created_at, updated_at) VALUES
(21,'CLH001','Than cám 5a',        21,'SP than sạch','DAT_NK','Than chất lượng cao',NOW(),NOW()),
(22,'CLH002','Đá xít',             22,'SP đất đá',   'DAT_NK','Đá thải mỏ',         NOW(),NOW()),
(23,'CLH003','Đất bóc phủ',        23,'SP đất đá',   'DAT_NK','Đất bóc phủ',        NOW(),NOW()),
(24,'CLH004','Bùn tuyển',          24,'SP bùn thải', 'DAT_NK','Bùn thải từ tuyển',  NOW(),NOW()),
(25,'CLH005','Than cục',           25,'SP than sạch','DAT_thai','Sản phẩm chính',   NOW(),NOW()),
(26,'CLH006','Than nguyên khai',   21,'SP than sạch','DAT_thai','Khai thác trực tiếp',NOW(),NOW()),
(27,'CLH007','Khoáng sản phụ',     26,'SP phụ trợ',  'DAT_NK','Khoáng sản phụ',     NOW(),NOW()),
(28,'CLH008','Đá thải',            22,'SP đất đá',   'DAT_NK','Đá thải tuyển chọn', NOW(),NOW()),
(29,'CLH009','Than chất lượng cao',25,'SP than sạch','DAT_NK','Phục vụ nghiệm thu', NOW(),NOW()),
(30,'CLH010','Đá phong hóa',       22,'SP đất đá',   'Dat_uot','Đá phong hóa',      NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

SELECT setval('unloading_point_seq', GREATEST((SELECT COALESCE(MAX(id),0) FROM unloading_points),1));
SELECT setval('pickup_point_seq',    GREATEST((SELECT COALESCE(MAX(id),0) FROM pickup_points),1));
SELECT setval('cargo_group_seq',     GREATEST((SELECT COALESCE(MAX(id),0) FROM cargo_groups),1));
SELECT setval('cargo_type_seq',      GREATEST((SELECT COALESCE(MAX(id),0) FROM cargo_types),1));

SELECT 'Seed danh muc OK: '
  || (SELECT COUNT(*) FROM unloading_points) || ' noi do tai, '
  || (SELECT COUNT(*) FROM pickup_points) || ' noi chat tai, '
  || (SELECT COUNT(*) FROM cargo_types) || ' chung loai hang' AS status;
