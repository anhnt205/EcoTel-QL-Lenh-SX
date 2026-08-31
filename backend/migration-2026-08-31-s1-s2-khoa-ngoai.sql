-- Di trú S1 + S2: ba trường chuỗi tự do -> khoá ngoại.
--
--   S1  cargo_types.acceptance_product  -> acceptance_product_id
--       cargo_types.ttl_clh             -> ttl_clh_id
--   S2  receiving_points.seam_group     -> seam_group_id
--
-- VÌ SAO: ba trường này là ĐẦU VÀO CỦA CÔNG THỨC, không phải nhãn hiển thị.
-- `acceptance_product` được so với các hằng Dat_SX / Than_SX / Dat_CN để chọn
-- nhánh tính; `seam_group` là thành phần ĐẦU của khoá ghép "Nhóm vỉa + Máy
-- xúc" dùng tra danh mục STD. Ở dạng chuỗi tự do, sai một ký tự hoặc lệch
-- bảng mã là công thức đi nhầm nhánh / dòng STD không khớp — mà triệu chứng
-- chỉ là "thiếu dữ liệu", không phải một lỗi chỉ đúng chỗ sai.
--
-- ĐỐI CHIẾU THEO **TÊN**, không theo mã: giá trị cũ là văn bản người dùng
-- nhìn thấy (vd "SP đất đá", "Vỉa 11"), tương ứng cột `name` của danh mục.
--
-- THỨ TỰ CHẠY: chạy SAU khi đã deploy bản mới (Hibernate `ddl-auto: update`
-- tạo sẵn các cột `*_id`), TRƯỚC khi người dùng nhập liệu tiếp.
--
-- Chạy được nhiều lần: mọi bước đều có điều kiện.

BEGIN;

-- ── S1.1 Sản phẩm nghiệm thu ────────────────────────────────────────────────
-- Mọi giá trị hiện có đều đã khớp `acceptance_products.name`, nhưng vẫn tạo
-- bù phòng khi dữ liệu thay đổi giữa lúc viết và lúc chạy.
INSERT INTO acceptance_products (id, code, name, created_at, updated_at)
SELECT nextval('acceptance_product_seq'), s.v, s.v, NOW(), NOW()
FROM (SELECT DISTINCT TRIM(acceptance_product) AS v
      FROM cargo_types
      WHERE acceptance_product IS NOT NULL AND TRIM(acceptance_product) <> '') s
WHERE NOT EXISTS (
    SELECT 1 FROM acceptance_products a WHERE LOWER(a.name) = LOWER(s.v)
);

UPDATE cargo_types c
SET acceptance_product_id = a.id
FROM acceptance_products a
WHERE LOWER(a.name) = LOWER(TRIM(c.acceptance_product))
  AND c.acceptance_product IS NOT NULL
  AND TRIM(c.acceptance_product) <> ''
  AND c.acceptance_product_id IS NULL;

-- ── S1.2 TTL CLH ───────────────────────────────────────────────────────────
INSERT INTO ttl_clh_items (id, code, name, created_at, updated_at)
SELECT nextval('ttl_clh_seq'), s.v, s.v, NOW(), NOW()
FROM (SELECT DISTINCT TRIM(ttl_clh) AS v
      FROM cargo_types
      WHERE ttl_clh IS NOT NULL AND TRIM(ttl_clh) <> '') s
WHERE NOT EXISTS (
    SELECT 1 FROM ttl_clh_items t WHERE LOWER(t.name) = LOWER(s.v)
);

UPDATE cargo_types c
SET ttl_clh_id = t.id
FROM ttl_clh_items t
WHERE LOWER(t.name) = LOWER(TRIM(c.ttl_clh))
  AND c.ttl_clh IS NOT NULL
  AND TRIM(c.ttl_clh) <> ''
  AND c.ttl_clh_id IS NULL;

-- ── S2 Nhóm vỉa ────────────────────────────────────────────────────────────
-- Khác hai trường trên: các giá trị đang có ("Vỉa 11".."Vỉa 15") CHƯA có
-- trong danh mục nên phải tạo mới.
--
-- Đặt `code` = ĐÚNG chuỗi cũ, không sinh mã mới. Lý do: khoá ghép "Nhóm vỉa
-- + Máy xúc" nay dựng từ MÃ nhóm vỉa; giữ nguyên chuỗi cũ làm mã thì mọi
-- khoá đã sinh (và các dòng STD đã khai theo khoá đó) vẫn khớp nguyên vẹn.
INSERT INTO seam_groups (id, code, name, created_at, updated_at)
SELECT nextval('seam_group_seq'), s.v, s.v, NOW(), NOW()
FROM (SELECT DISTINCT TRIM(seam_group) AS v
      FROM receiving_points
      WHERE seam_group IS NOT NULL AND TRIM(seam_group) <> '') s
WHERE NOT EXISTS (
    SELECT 1 FROM seam_groups g WHERE LOWER(g.name) = LOWER(s.v)
);

UPDATE receiving_points p
SET seam_group_id = g.id
FROM seam_groups g
WHERE LOWER(g.name) = LOWER(TRIM(p.seam_group))
  AND p.seam_group IS NOT NULL
  AND TRIM(p.seam_group) <> ''
  AND p.seam_group_id IS NULL;

COMMIT;

-- ── KIỂM TRA: phải trả về 0 dòng ────────────────────────────────────────────
-- Dòng nào còn sót nghĩa là giá trị cũ không khớp danh mục nào — phải xử lý
-- tay TRƯỚC khi xoá cột cũ, nếu không sẽ mất dữ liệu.
SELECT 'cargo_types.acceptance_product' AS con_sot, id, code, acceptance_product AS gia_tri
FROM cargo_types
WHERE acceptance_product IS NOT NULL AND TRIM(acceptance_product) <> ''
  AND acceptance_product_id IS NULL
UNION ALL
SELECT 'cargo_types.ttl_clh', id, code, ttl_clh
FROM cargo_types
WHERE ttl_clh IS NOT NULL AND TRIM(ttl_clh) <> '' AND ttl_clh_id IS NULL
UNION ALL
SELECT 'receiving_points.seam_group', id, code, seam_group
FROM receiving_points
WHERE seam_group IS NOT NULL AND TRIM(seam_group) <> '' AND seam_group_id IS NULL;

-- ── XOÁ CỘT CŨ — chạy RIÊNG, chỉ sau khi truy vấn trên trả về 0 dòng ────────
-- Hibernate `ddl-auto: update` KHÔNG bao giờ xoá cột, nên ba cột chuỗi cũ sẽ
-- nằm lại vô thời hạn nếu không xoá tay. Để chúng lại thì lần sau đọc schema
-- rất dễ tưởng vẫn còn dùng.
--
-- ALTER TABLE cargo_types      DROP COLUMN acceptance_product;
-- ALTER TABLE cargo_types      DROP COLUMN ttl_clh;
-- ALTER TABLE receiving_points DROP COLUMN seam_group;
