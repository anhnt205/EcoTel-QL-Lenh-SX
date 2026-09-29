-- Seed 2 danh mục mới của phần Thống kê sản lượng (2026-08-30).
-- "Nhóm chủng loại hàng" dùng lại bảng cargo_groups đã seed trước đó.
INSERT INTO acceptance_products (id, code, name, note, created_at, updated_at) VALUES
(1,'SPNT001','SP than sạch','Sản phẩm than đã qua sàng tuyển',NOW(),NOW()),
(2,'SPNT002','SP đất đá','Sản phẩm đất đá bóc/thải',NOW(),NOW()),
(3,'SPNT003','SP bùn thải','Sản phẩm bùn thải tuyển',NOW(),NOW()),
(4,'SPNT004','SP phụ trợ','Sản phẩm phục vụ, phụ trợ',NOW(),NOW()),
(5,'SPNT005','Dat_SX','Đất sản xuất',NOW(),NOW()),
(6,'SPNT006','Dat_CN','Đất công nghệ',NOW(),NOW()),
(7,'SPNT007','Than_SX','Than sản xuất',NOW(),NOW()),
(8,'SPNT008','Than_CN','Than công nghệ',NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO ttl_clh_items (id, code, name, note, created_at, updated_at) VALUES
(1,'TTL001','TTL-01','Than chất lượng cao',NOW(),NOW()),
(2,'TTL002','TTL-02','Đá thải mỏ',NOW(),NOW()),
(3,'TTL003','TTL-03','Đất bóc phủ',NOW(),NOW()),
(4,'TTL004','TTL-04','Bùn thải từ tuyến',NOW(),NOW()),
(5,'TTL005','DAT_NK','Đất nguyên khai',NOW(),NOW()),
(6,'TTL006','DAT_thai','Đất thải',NOW(),NOW()),
(7,'TTL007','Dat_uot','Đất ướt',NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

SELECT setval('acceptance_product_seq', GREATEST((SELECT COALESCE(MAX(id),0) FROM acceptance_products),1));
SELECT setval('ttl_clh_seq',            GREATEST((SELECT COALESCE(MAX(id),0) FROM ttl_clh_items),1));

SELECT 'Seed OK: '||(SELECT COUNT(*) FROM acceptance_products)||' SPNT, '
     ||(SELECT COUNT(*) FROM ttl_clh_items)||' TTL CLH, '
     ||(SELECT COUNT(*) FROM cargo_groups)||' nhom CLH' AS status;
