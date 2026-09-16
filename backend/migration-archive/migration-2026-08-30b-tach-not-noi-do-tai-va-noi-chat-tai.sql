-- ==================================================================
-- DI TRÚ (phần 2/2): tách nốt 2 vai trò còn lại khỏi bảng `locations`
-- Ngày: 2026-08-30. Chạy SAU `migration-2026-08-30-tach-danh-muc-dia-diem.sql`.
--
--   transport_report_trips.unloading_point_id   : locations -> unloading_points
--   excavation_reports.receiving_location_id    : locations -> pickup_points
--
-- Sau bước này, KHÔNG bảng nghiệp vụ nào còn trỏ `locations` nữa.
--
-- ⚠ Hibernate (ddl-auto: update) khi thấy kiểu trường đổi sẽ TỰ THÊM khoá
-- ngoại trỏ bảng mới nhưng KHÔNG gỡ khoá cũ -> ngay sau deploy mà chưa chạy
-- script này, bảng có ĐỒNG THỜI hai khoá mâu thuẫn và mọi ghi sẽ fail.
-- Phải chạy NGAY SAU deploy, trước khi cho người dùng vào.
-- ==================================================================

BEGIN;

-- ── 1. Bổ sung địa điểm đang được dùng thật vào danh mục mới ────────────
INSERT INTO unloading_points (id, code, name, note, created_at, updated_at)
SELECT nextval('unloading_point_seq'), 'NDTT-MIG-' || l.id, l.name,
       'Tạo tự động khi di trú từ locations (id cũ ' || l.id || ')', NOW(), NOW()
FROM locations l
WHERE l.id IN (SELECT DISTINCT unloading_point_id FROM transport_report_trips WHERE unloading_point_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM unloading_points u WHERE u.name = l.name);

INSERT INTO pickup_points (id, code, name, note, created_at, updated_at)
SELECT nextval('pickup_point_seq'), 'NCTT-MIG-' || l.id, l.name,
       'Tạo tự động khi di trú từ locations (id cũ ' || l.id || ')', NOW(), NOW()
FROM locations l
WHERE l.id IN (SELECT DISTINCT receiving_location_id FROM excavation_reports WHERE receiving_location_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM pickup_points p WHERE p.name = l.name);

-- ── 2. Gỡ khoá ngoại cũ (tra tên động, Hibernate sinh ngẫu nhiên) ──────
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conrelid::regclass AS tbl, conname
        FROM pg_constraint
        WHERE contype = 'f'
          AND pg_get_constraintdef(oid) LIKE '%REFERENCES locations(id)%'
          AND ((conrelid = 'transport_report_trips'::regclass AND pg_get_constraintdef(oid) LIKE '%(unloading_point_id)%')
            OR (conrelid = 'excavation_reports'::regclass     AND pg_get_constraintdef(oid) LIKE '%(receiving_location_id)%'))
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
    END LOOP;
END $$;

-- ── 3. Trỏ lại id sang bảng mới (ghép theo tên) ────────────────────────
UPDATE transport_report_trips t SET unloading_point_id = u.id
FROM locations l, unloading_points u
WHERE t.unloading_point_id = l.id AND u.name = l.name;

UPDATE excavation_reports r SET receiving_location_id = p.id
FROM locations l, pickup_points p
WHERE r.receiving_location_id = l.id AND p.name = l.name;

-- ── 4. Chốt chặn: còn dòng nào không ghép được thì rollback toàn bộ ────
DO $$
DECLARE bad_unload INT; bad_pickup INT;
BEGIN
    SELECT COUNT(*) INTO bad_unload FROM transport_report_trips t
    WHERE t.unloading_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM unloading_points u WHERE u.id = t.unloading_point_id);

    SELECT COUNT(*) INTO bad_pickup FROM excavation_reports r
    WHERE r.receiving_location_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM pickup_points p WHERE p.id = r.receiving_location_id);

    IF bad_unload > 0 OR bad_pickup > 0 THEN
        RAISE EXCEPTION 'Di trú THẤT BẠI: % dòng unloading_point_id và % dòng receiving_location_id không ghép được. Đã rollback.',
            bad_unload, bad_pickup;
    END IF;
END $$;

-- ── 5. Gắn khoá ngoại mới — CHỈ KHI CHƯA CÓ (tránh trùng với khoá
--      Hibernate vừa tự sinh) ────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid='transport_report_trips'::regclass AND contype='f'
          AND pg_get_constraintdef(oid) LIKE '%(unloading_point_id)%'
          AND pg_get_constraintdef(oid) LIKE '%REFERENCES unloading_points(id)%') THEN
        ALTER TABLE transport_report_trips
            ADD CONSTRAINT fk_trip_unloading_point
            FOREIGN KEY (unloading_point_id) REFERENCES unloading_points(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid='excavation_reports'::regclass AND contype='f'
          AND pg_get_constraintdef(oid) LIKE '%(receiving_location_id)%'
          AND pg_get_constraintdef(oid) LIKE '%REFERENCES pickup_points(id)%') THEN
        ALTER TABLE excavation_reports
            ADD CONSTRAINT fk_report_pickup_point
            FOREIGN KEY (receiving_location_id) REFERENCES pickup_points(id);
    END IF;
END $$;

COMMIT;

SELECT 'Di tru phan 2 OK. So bang nghiep vu con tro locations: '
     || (SELECT COUNT(*) FROM pg_constraint
         WHERE contype='f' AND pg_get_constraintdef(oid) LIKE '%REFERENCES locations(id)%') AS status;
