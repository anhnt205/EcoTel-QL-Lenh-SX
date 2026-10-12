-- ==================================================================
-- DI TRÚ: tách danh mục địa điểm ra khỏi bảng dùng chung `locations`
-- Ngày: 2026-08-30
--
-- Bối cảnh: trước đây MỌI loại địa điểm đều dùng chung bảng `locations`
-- (Khu vực xúc, Nơi nhận tải, Nơi dỡ tải, Nơi chất tải). Theo đặc tả
-- `docs/REQUIREMENT_SANLUONG.md` mục 2.1 chúng phải là các danh mục RIÊNG.
--
-- Bước này di trú 2 trong 4 vai trò (2 danh mục đã dựng):
--     transport_report_trips.excavation_area_id : locations -> excavation_areas
--     transport_report_trips.loading_point_id   : locations -> receiving_points
--
-- CHƯA di trú (giữ nguyên `locations`) vì chưa có danh mục tương ứng:
--     transport_report_trips.unloading_point_id     (Nơi dỡ tải)
--     excavation_reports.receiving_location_id      (Nơi chất tải)
--
-- CÁCH CHẠY — phải chạy SAU khi backend phiên bản mới đã khởi động ít nhất
-- một lần (Hibernate ddl-auto:update tạo xong 2 bảng danh mục mới):
--
--   docker exec -i <postgres_container> psql -U postgres -d thong_ke \
--     < migration-2026-08-30-tach-danh-muc-dia-diem.sql
--
-- An toàn: bọc trong transaction, và DỪNG nếu có dòng không ghép được tên.
-- ==================================================================

BEGIN;

-- ── 1. Bổ sung vào danh mục mới những địa điểm đang được dùng thật ──────
-- Ghép theo TÊN. Bản ghi nào trong `locations` đang được trỏ tới bởi
-- transport_report_trips mà chưa có trong danh mục mới thì tạo bổ sung,
-- mã sinh tạm từ id cũ để bảo đảm duy nhất; người dùng sửa lại mã sau.

INSERT INTO excavation_areas (id, code, name, note, created_at, updated_at)
SELECT nextval('excavation_area_seq'),
       'KVX-MIG-' || l.id,
       l.name,
       'Tạo tự động khi di trú từ bảng locations (id cũ ' || l.id || ')',
       NOW(), NOW()
FROM locations l
WHERE l.id IN (SELECT DISTINCT excavation_area_id FROM transport_report_trips WHERE excavation_area_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM excavation_areas a WHERE a.name = l.name);

INSERT INTO receiving_points (id, code, name, seam_group, note, created_at, updated_at)
SELECT nextval('receiving_point_seq'),
       'NRT-MIG-' || l.id,
       l.name,
       NULL,
       'Tạo tự động khi di trú từ bảng locations (id cũ ' || l.id || ')',
       NOW(), NOW()
FROM locations l
WHERE l.id IN (SELECT DISTINCT loading_point_id FROM transport_report_trips WHERE loading_point_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM receiving_points p WHERE p.name = l.name);

-- ── 2. Gỡ khoá ngoại cũ ────────────────────────────────────────────────
-- Tên constraint do Hibernate sinh ngẫu nhiên nên phải tra động, không
-- viết cứng tên.
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'transport_report_trips'::regclass
          AND contype = 'f'
          AND pg_get_constraintdef(oid) LIKE '%REFERENCES locations(id)%'
          AND (pg_get_constraintdef(oid) LIKE '%(excavation_area_id)%'
            OR pg_get_constraintdef(oid) LIKE '%(loading_point_id)%')
    LOOP
        EXECUTE format('ALTER TABLE transport_report_trips DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

-- ── 3. Trỏ lại id sang bảng mới (ghép theo tên) ────────────────────────
UPDATE transport_report_trips t
SET excavation_area_id = a.id
FROM locations l, excavation_areas a
WHERE t.excavation_area_id = l.id AND a.name = l.name;

UPDATE transport_report_trips t
SET loading_point_id = p.id
FROM locations l, receiving_points p
WHERE t.loading_point_id = l.id AND p.name = l.name;

-- ── 4. Chốt chặn: không được còn dòng nào trỏ sai ──────────────────────
-- Nếu còn, ROLLBACK toàn bộ thay vì để dữ liệu nửa vời.
DO $$
DECLARE bad_area INT; bad_point INT;
BEGIN
    SELECT COUNT(*) INTO bad_area
    FROM transport_report_trips t
    WHERE t.excavation_area_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM excavation_areas a WHERE a.id = t.excavation_area_id);

    SELECT COUNT(*) INTO bad_point
    FROM transport_report_trips t
    WHERE t.loading_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM receiving_points p WHERE p.id = t.loading_point_id);

    IF bad_area > 0 OR bad_point > 0 THEN
        RAISE EXCEPTION 'Di trú THẤT BẠI: % dòng excavation_area_id và % dòng loading_point_id không ghép được. Đã rollback.',
            bad_area, bad_point;
    END IF;
END $$;

-- ── 5. Gắn khoá ngoại mới — CHỈ KHI CHƯA CÓ ───────────────────────────
-- Lưu ý quan trọng: Hibernate (ddl-auto: update) khi thấy kiểu trường đổi
-- sẽ TỰ THÊM khoá ngoại trỏ bảng mới, nhưng KHÔNG gỡ khoá cũ trỏ
-- `locations`. Nghĩa là ngay sau khi deploy backend mới mà chưa chạy script
-- này, bảng có ĐỒNG THỜI hai khoá mâu thuẫn — mọi INSERT/UPDATE dòng chuyến
-- sẽ fail. Vì vậy:
--   * Phải chạy script này NGAY SAU khi deploy, trước khi cho người dùng vào.
--   * Bước 5 phải kiểm tra tồn tại trước khi thêm, nếu không sẽ tạo khoá
--     TRÙNG với khoá Hibernate vừa sinh (đã gặp thật khi chạy lần đầu).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'transport_report_trips'::regclass AND contype = 'f'
          AND pg_get_constraintdef(oid) LIKE '%(excavation_area_id)%'
          AND pg_get_constraintdef(oid) LIKE '%REFERENCES excavation_areas(id)%'
    ) THEN
        ALTER TABLE transport_report_trips
            ADD CONSTRAINT fk_trip_excavation_area
            FOREIGN KEY (excavation_area_id) REFERENCES excavation_areas(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'transport_report_trips'::regclass AND contype = 'f'
          AND pg_get_constraintdef(oid) LIKE '%(loading_point_id)%'
          AND pg_get_constraintdef(oid) LIKE '%REFERENCES receiving_points(id)%'
    ) THEN
        ALTER TABLE transport_report_trips
            ADD CONSTRAINT fk_trip_receiving_point
            FOREIGN KEY (loading_point_id) REFERENCES receiving_points(id);
    END IF;
END $$;

COMMIT;

SELECT 'Di tru OK: '
     || (SELECT COUNT(*) FROM transport_report_trips) || ' dong chuyen, '
     || (SELECT COUNT(*) FROM excavation_areas) || ' khu vuc xuc, '
     || (SELECT COUNT(*) FROM receiving_points) || ' noi nhan tai' AS status;
