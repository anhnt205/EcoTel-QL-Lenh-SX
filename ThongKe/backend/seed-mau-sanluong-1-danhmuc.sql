-- ════════════════════════════════════════════════════════════════════════
-- DỮ LIỆU MẪU (1/3) — DANH MỤC XE + NHÓM KHU VỰC
--
-- Mục đích: cho chủ dự án nhìn được TOÀN CẢNH và ĐẦU RA báo cáo thống kê
-- ngay, khi dữ liệu thật chưa nhập. Mã xe lấy đúng các mã có thật trong
-- bảng tính gốc (CAT777E, HD465-7R, HM400-2R) để khoá tra khớp công thức.
--
-- CHẠY LẠI NHIỀU LẦN ĐƯỢC. Không xoá dữ liệu người dùng.
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/seed-mau-sanluong-1-danhmuc.sql
-- ════════════════════════════════════════════════════════════════════════

-- ── Nhóm khu vực CS/KC (QĐ-13) ─────────────────────────────────────────
-- Mọi công thức so D5="CS"/"KC"; danh mục thật có 10 khu vực nên phải khai
-- nhóm, nếu không engine coi tất cả là KC.
UPDATE excavation_areas SET area_group = 'CS' WHERE code IN ('KVX001','KVX003','KVX005','KVX006') AND area_group IS NULL;
UPDATE excavation_areas SET area_group = 'KC' WHERE code IN ('KVX002','KVX004','KVX007','KVX008','KVX009','KVX010') AND area_group IS NULL;

-- ── Nhóm hạng xe + Hạng xe (cột DB) ────────────────────────────────────
INSERT INTO vehicle_rank_groups (id, code, name, note, created_at, updated_at)
SELECT nextval('vehicle_rank_group_seq'), 'NHX-VT', 'Nhóm hạng xe vận tải', 'Dữ liệu mẫu', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicle_rank_groups WHERE code = 'NHX-VT');

INSERT INTO vehicle_ranks (id, code, rank_order, vehicle_rank_group_id, note, created_at, updated_at)
SELECT nextval('vehicle_rank_seq'), v.code, v.ord,
       (SELECT id FROM vehicle_rank_groups WHERE code='NHX-VT'), 'Dữ liệu mẫu', NOW(), NOW()
FROM (VALUES ('A',1),('B',2),('C',3)) AS v(code, ord)
WHERE NOT EXISTS (SELECT 1 FROM vehicle_ranks r WHERE r.code = v.code);

-- ── Chủng loại xe — cột DA (gốc khoá Mô hình + Năng suất xe) ────────────
INSERT INTO vehicle_types (id, code, name, note, created_at, updated_at)
SELECT nextval('vehicle_type_seq'), v.code, v.name, 'Dữ liệu mẫu', NOW(), NOW()
FROM (VALUES
    ('CAT777E',  'Caterpillar 777E'),
    ('HD465-7R', 'Komatsu HD465-7R'),
    ('HM400-2R', 'Komatsu HM400-2R')
) AS v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types t WHERE t.code = v.code);

-- ── Chủng loại xe (NL) — cột DQ (gốc khoá ĐMNL + HS điều chỉnh) ─────────
-- Trùng MÃ với danh mục trên là đúng thực tế bảng tính (dòng 1250:
-- DQ=CAT777E, DA=CAT777E.CS) — hai danh mục KHÁC NHAU nhưng cùng mã gốc.
INSERT INTO vehicle_fuel_classes (id, code, name, note, created_at, updated_at)
SELECT nextval('vehicle_fuel_class_seq'), v.code, v.name, 'Dữ liệu mẫu', NOW(), NOW()
FROM (VALUES
    ('CAT777E',  'CAT777E - dinh muc nhien lieu'),
    ('HD465-7R', 'HD465-7R - dinh muc nhien lieu'),
    ('HM400-2R', 'HM400-2R - dinh muc nhien lieu')
) AS v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM vehicle_fuel_classes f WHERE f.code = v.code);

-- ── Gắn thuộc tính sản lượng cho 9 xe tải đã có ────────────────────────
-- Chỉ ghi vào xe CHƯA khai (vehicle_type_id IS NULL) để không đè lên phần
-- chủ dự án tự nhập sau này.
UPDATE devices d SET
    vehicle_type_id = (SELECT id FROM vehicle_types        WHERE code = m.vt),
    fuel_class_id   = (SELECT id FROM vehicle_fuel_classes WHERE code = m.vt),
    vehicle_rank_id = (SELECT id FROM vehicle_ranks        WHERE code = m.rnk),
    quality_level   = m.quality,
    car_renovation  = m.renovation,
    updated_at      = NOW()
FROM (VALUES
    ('473', 'CAT777E',  'C', 'Tot',        NULL),
    ('474', 'CAT777E',  'C', 'Tot',        'CaiToa'),
    ('482', 'CAT777E',  'B', 'Trung binh', NULL),
    ('468', 'CAT777E',  'A', 'Tot',        NULL),
    ('505', 'HD465-7R', 'C', 'Tot',        NULL),
    ('503', 'HD465-7R', 'B', 'Trung binh', 'CaiToa'),
    ('511', 'HM400-2R', 'C', 'Tot',        NULL),
    ('475', 'HM400-2R', 'C', 'Trung binh', NULL),
    ('496', 'HM400-2R', 'A', 'Tot',        NULL)
) AS m(code, vt, rnk, quality, renovation)
WHERE d.code = m.code AND d.vehicle_type_id IS NULL;

-- ── Gầu xúc cho 4 máy xúc ──────────────────────────────────────────────
UPDATE devices d SET bucket_capacity = m.bucket, updated_at = NOW()
FROM (VALUES ('P15', 6.7), ('P16', 5.2), ('P17', 6.7), ('P18', 3.5)) AS m(code, bucket)
WHERE d.code = m.code AND d.bucket_capacity IS NULL;

-- ── Sản phẩm nghiệm thu THẬT cho các chủng loại hàng dùng trong mẫu ─────
-- Công thức AC5 (Thể trọng TĐ) chỉ nhận ĐÚNG bốn tên: Dat_SX / Dat_CN /
-- Than_SX / Than_CN. Các tên mô tả kiểu "SP than sạch" cho AC = 0, kéo theo
-- cả nhánh trắc địa lượt 2 (DW, DX) bằng 0 và báo cáo toàn số 0.
--
-- CỐ Ý giữ CLH009 ở "SP than sạch" để minh hoạ cái bẫy của QĐ-10: chuỗi
-- này bắt đầu bằng "S" nên Phân loại ra DAT, dù trong tên có chữ "than".
UPDATE cargo_types ct SET acceptance_product_id = ap.id, updated_at = NOW()
FROM (VALUES
    ('CLH001', 'Than_SX'),
    ('CLH002', 'Dat_SX'),
    ('CLH003', 'Dat_CN'),
    ('CLH004', 'Dat_SX'),
    ('CLH005', 'Than_SX'),
    ('CLH006', 'Than_CN'),
    ('CLH008', 'Dat_SX'),
    ('CLH009', 'SP than sạch'),
    ('B.Duot', 'Dat_SX'),
    ('SPNT.via', 'Than_SX'),
    ('THAN',   'Than_SX')
) AS m(code, spnt)
JOIN acceptance_products ap ON ap.name = m.spnt
WHERE ct.code = m.code;
