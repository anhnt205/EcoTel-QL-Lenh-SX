-- ════════════════════════════════════════════════════════════════════════
-- DỮ LIỆU MẪU (3/3) — TỶ TRỌNG + PHIẾU BÁO CHUYẾN cho kỳ 01/8 → 07/8/2026
--
-- 20 chuyến được đặt CÓ CHỦ Ý để đi qua đủ bốn nhánh của quy tắc hậu tố
-- ĐMNL (DE5) và cả hai giá trị Phân loại — xem cột "Vì sao" ở cuối file.
--
-- CHẠY LẠI NHIỀU LẦN ĐƯỢC: xoá đúng các phiếu mẫu (ghi chú 'MAU-SL') rồi
-- tạo lại. Không đụng dữ liệu khác.
--
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/seed-mau-sanluong-3-chuyen.sql
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────
-- A. Bổ sung danh mục để chạm được các nhánh đặc biệt của DE5
-- ────────────────────────────────────────────────────────────────────────

-- Nơi dỡ tải "Băng tải." — nhánh 3 của DE5 so ĐÚNG chuỗi này (có dấu chấm).
INSERT INTO unloading_points (id, code, name, note, created_at, updated_at)
SELECT nextval('unloading_point_seq'), 'NDTT-BT', 'Băng tải.', 'Dữ liệu mẫu', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM unloading_points WHERE name = 'Băng tải.');

-- Chủng loại hàng có MÃ đúng như bảng tính so sánh.
--   B.Duot   → nhánh 1 (.Bun) khi xe là HM400-2R hạng C
--   SPNT.via → nhánh 3 (.BK)
INSERT INTO cargo_types (id, code, name, cargo_group_id, acceptance_product_id, ttl_clh_id, description, created_at, updated_at)
SELECT nextval('cargo_type_seq'), v.code, v.name,
       (SELECT id FROM cargo_groups     WHERE name = v.grp  LIMIT 1),
       (SELECT id FROM acceptance_products WHERE name = v.spnt LIMIT 1),
       (SELECT id FROM ttl_clh_items    WHERE code = 'TTL005' LIMIT 1),
       'Dữ liệu mẫu', NOW(), NOW()
FROM (VALUES
    ('B.Duot',   'Bùn dượt',        'Bùn thải',          'SP bùn thải'),
    ('SPNT.via', 'SP nghiệm thu vỉa', 'Than nguyên khai', 'Than_SX')
) AS v(code, name, grp, spnt)
WHERE NOT EXISTS (SELECT 1 FROM cargo_types c WHERE c.code = v.code);

-- Hai chủng loại hàng mới cũng phải có ô trong lưới Mô hình, nếu không
-- chuyến dùng chúng sẽ dừng ngay ở lượt 1 với lỗi "thiếu khai báo".
INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'ROW', ct.code, ct.name, NULL,
       1000 + row_number() OVER (ORDER BY ct.code)
FROM matrix_definitions d
CROSS JOIN (SELECT code, name FROM cargo_types WHERE code IN ('B.Duot', 'SPNT.via')) ct
WHERE d.version_label = 'MAU-2026' AND d.code = 'MO_HINH'
  AND NOT EXISTS (SELECT 1 FROM matrix_axis_entries e
                  WHERE e.definition_id = d.id AND e.axis = 'ROW' AND e.entry_key = ct.code);

INSERT INTO matrix_cells (id, definition_id, row_key, col_key, value)
SELECT nextval('matrix_cell_seq'), d.id, r.entry_key, c.entry_key,
       ROUND((CASE split_part(c.entry_key, '.', 1)
                WHEN 'CAT777E'  THEN 60.0
                WHEN 'HD465-7R' THEN 34.0
                ELSE 24.0 END
              * CASE WHEN r.entry_key = 'B.Duot' THEN 0.85 ELSE 0.92 END
              * CASE WHEN split_part(c.entry_key, '.', 2) = 'CS' THEN 1.00 ELSE 0.97 END
             )::numeric, 3)
FROM matrix_definitions d
JOIN matrix_axis_entries r ON r.definition_id = d.id AND r.axis = 'ROW' AND r.entry_key IN ('B.Duot','SPNT.via')
JOIN matrix_axis_entries c ON c.definition_id = d.id AND c.axis = 'COL'
WHERE d.version_label = 'MAU-2026' AND d.code = 'MO_HINH'
  AND NOT EXISTS (SELECT 1 FROM matrix_cells mc
                  WHERE mc.definition_id = d.id AND mc.row_key = r.entry_key AND mc.col_key = c.entry_key);

-- ────────────────────────────────────────────────────────────────────────
-- B. Tỷ trọng — BẮT BUỘC, thiếu là chuyến dừng ngay (QĐ-04)
--    Một dòng cho MỌI chủng loại hàng, không gắn khu vực (dòng dự phòng).
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO density_parameters
  (id, cargo_type_id, excavation_area_id, density_wet, density_dry, effective_from, effective_to, note, created_at, updated_at)
SELECT nextval('density_parameter_seq'), ct.id, NULL,
       CASE WHEN cg.name LIKE 'Than%'  THEN 1.42
            WHEN cg.name LIKE 'Bùn%'   THEN 1.32
            WHEN cg.name LIKE 'Đá%'    THEN 1.68
            ELSE 1.55 END,
       CASE WHEN cg.name LIKE 'Than%'  THEN 1.48
            WHEN cg.name LIKE 'Bùn%'   THEN 1.38
            WHEN cg.name LIKE 'Đá%'    THEN 1.74
            ELSE 1.61 END,
       DATE '2026-07-01', DATE '2026-12-31', 'Dữ liệu mẫu', NOW(), NOW()
FROM cargo_types ct
LEFT JOIN cargo_groups cg ON cg.id = ct.cargo_group_id
WHERE NOT EXISTS (
    SELECT 1 FROM density_parameters dp
    WHERE dp.cargo_type_id = ct.id
      AND dp.excavation_area_id IS NULL
      AND dp.effective_from <= DATE '2026-08-07'
      AND (dp.effective_to IS NULL OR dp.effective_to >= DATE '2026-08-01'));

-- ────────────────────────────────────────────────────────────────────────
-- C. Phiếu báo chuyến — kỳ 01/8 → 07/8/2026
-- ────────────────────────────────────────────────────────────────────────

-- Dọn phiếu mẫu cũ (nhận diện qua ghi chú 'MAU-SL' ở dòng chuyến).
-- Kết quả tính trỏ khoá ngoại vào chuyến, nên phải xoá kết quả trước.
DELETE FROM production_results WHERE transport_trip_id IN (SELECT id FROM transport_report_trips WHERE note LIKE 'MAU-SL%');
DELETE FROM transport_report_trips WHERE note LIKE 'MAU-SL%';
DELETE FROM transport_reports tr
WHERE NOT EXISTS (SELECT 1 FROM transport_report_trips t WHERE t.transport_report_id = tr.id)
  AND tr.report_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-07';

-- Phiếu: mỗi (ngày, xe, ca) một phiếu.
CREATE TEMP TABLE tmp_trip (
    seq          int,
    ngay         date,
    xe           text,
    ca           text,   -- shifts.name
    may_xuc      text,
    khu_vuc      text,   -- excavation_areas.code
    chung_loai   text,   -- cargo_types.code
    noi_nhan     text,   -- receiving_points.code
    noi_do       text,   -- unloading_points.name
    so_chuyen    int,
    cung_do      numeric,
    chenh_cao    numeric,
    tang_nhan    int,
    muc_tai      text,
    mua          boolean,
    vi_sao       text
) ON COMMIT DROP;

INSERT INTO tmp_trip VALUES
 ( 1,'2026-08-01','473','1','P15','KVX001','CLH001','NRT001','Kho số 1',      6,3.5, 45, 120,'FULL_LOAD',false,'CS + SP than sạch -> Phân loại DAT (bẫy: tên có chữ "than" nhưng chữ đầu là S) -> hậu tố .DAT'),
 ( 2,'2026-08-01','505','1','P15','KVX001','CLH002','NRT002','Kho số 2',      5,2.5, 30, 105,'FULL_LOAD',false,'Đá xít, khu CS -> .DAT'),
 ( 3,'2026-08-01','511','1','P18','KVX002','B.Duot','NRT004','Bãi nhận tải 1',4,1.5, 25,  90,'FULL_LOAD',false,'HM400-2R hạng C + B.Duot -> NHÁNH 1 -> hậu tố .Bun'),
 ( 4,'2026-08-02','474','2','P16','KVX002','CLH003','NRT003','Kho số 3',      7,4.0, 60, 135,'FULL_LOAD',false,'Khu KC, đất bóc phủ -> .DAT; xe đã CaiToa nên có hệ số BD'),
 ( 5,'2026-08-02','468','2','P16','KVX001','SPNT.via','NRT001','Kho số 1',    5,2.0, 35, 120,'FULL_LOAD',false,'Chủng loại hàng SPNT.via -> NHÁNH 3 -> hậu tố .BK'),
 ( 6,'2026-08-02','496','2','P17','KVX003','CLH006','NRT005','Băng tải.',     4,3.0, 40, 150,'FULL_LOAD',false,'Dỡ ở "Băng tải." -> NHÁNH 3 -> .BK'),
 ( 7,'2026-08-03','482','3','P17','KVX004','THAN','NRT006','Kho trung chuyển 1',6,5.0,70,-30,'FULL_LOAD',false,'SPNT Than_SX -> Phân loại Than; có nhân hệ số HS.THAN.TRUDA'),
 ( 8,'2026-08-03','503','3','P18','KVX004','CLH008','NRT007','Kho số 2',      5,4.5, 55, -60,'RODA_2_3', true, 'Roda 2/3 + ngày mưa -> hai khoản bù BSNL; tầng nhận âm -> nhóm tầng âm'),
 ( 9,'2026-08-03','475','3','P18','KVX009','CLH004','NRT008','Bãi nhận tải 2',3,1.0, 15, -200,'FULL_LOAD',false,'Bùn tuyển, khu KC, tầng -200 -> chạm nhánh AK5 riêng của nhóm KC'),
 (10,'2026-08-04','473','1','P15','KVX005','CLH005','NRT009','Kho số 3',      6,3.5, 50, 105,'FULL_LOAD',false,'Than cục khu CS'),
 (11,'2026-08-04','505','1','P15','KVX006','CLH002','NRT010','Điểm nhận phụ trợ',5,2.5,28,90,'FULL_LOAD',false,'Khu CS khác -> kiểm tra nhóm khu vực áp đúng cho nhiều khu'),
 (12,'2026-08-04','511','1','P16','KVX007','B.Duot','NRT004','Bãi nhận tải 1',4,1.5, 20, 75,'FULL_LOAD',false,'Cùng nhánh .Bun nhưng khu KC -> HS điều chỉnh lấy cột T8.KC'),
 (13,'2026-08-05','474','2','P16','KVX001','CLH001','NRT002','Kho số 1',      7,3.0, 42, 120,'FULL_LOAD',false,'Lặp lại nhánh .DAT để có nhiều chuyến gộp cùng khoá'),
 (14,'2026-08-05','468','2','P17','KVX002','SPNT.via','NRT003','Kho số 2',    5,2.0, 33, 135,'FULL_LOAD',false,'.BK ở khu KC'),
 (15,'2026-08-05','496','2','P17','KVX008','CLH003','NRT005','Bãi nhận tải 2',4,6.0, 80, 60,'FULL_LOAD',false,'Cung độ 6 km -> nội suy ĐMNL ở dải xa'),
 (16,'2026-08-06','482','3','P18','KVX001','THAN','NRT006','Kho trung chuyển 2',6,4.0,58,120,'FULL_LOAD',false,'Than ở khu CS -> so với chuyến 7 (khu KC) để thấy chênh hệ số'),
 (17,'2026-08-06','503','3','P18','KVX010','CLH008','NRT007','Kho số 1',      5,8.5, 90, 45,'FULL_LOAD',false,'Cung độ 8,5 km > 8 -> engine chặn ở 8 khi tra Năng suất xe'),
 (18,'2026-08-06','475','3','P15','KVX003','CLH003','NRT008','Kho số 3',      3,1.0, 12, 90,'OTHER',    false,'HM400-2R hang C + SPNT Dat_CN -> NHANH 2 -> hau to .Dat; dong thoi muc tai OTHER 1/2'),
 (19,'2026-08-07','473','1','P15','KVX001','CLH006','NRT003','Kho số 1',      6,3.5, 46, 120,'FULL_LOAD',true, 'Ngày mưa -> khoản bù BSNL 5%. Cố ý đổi Nơi nhận tải so với chuyến 1: nếu để chung thì MỘT khoá STD phục vụ hai SPNT (Than_SX + Than_CN), số trắc địa bị chia cho cả hai nhóm -> sản lượng trắc địa vọt cao vô lý'),
 (20,'2026-08-07','468','1','P16','KVX002','CLH009','NRT002','Kho số 2',      5,2.5, 38, 105,'FULL_LOAD',false,'Than chất lượng cao, khu KC');

-- Tạo phiếu (một phiếu cho mỗi ngày+xe+ca)
INSERT INTO transport_reports (id, report_date, vehicle_id, shift_id, employee_id, fuel_beginning, fuel_ending, fuel_received, fuel_used, created_at, updated_at)
SELECT nextval('transport_report_seq'), g.ngay, d.id, s.id,
       (SELECT id FROM users WHERE username = 'admin'),
       200, 120, 150, 230, NOW(), NOW()
FROM (SELECT DISTINCT ngay, xe, ca FROM tmp_trip) g
JOIN devices d ON d.code = g.xe
JOIN shifts  s ON s.name::text = g.ca;

-- Tạo dòng chuyến
INSERT INTO transport_report_trips
  (id, transport_report_id, cargo_type_id, cargo_group_id, excavation_area_id, excavator_device_id,
   loading_point_id, unloading_point_id, trip_count, total_route_distance_km, total_route_lift_m,
   receiving_floor, receiving_floor_group, unloading_floor, load_level_type, load_level_custom_value,
   rainy_day, supplementary_vehicle, status, note, created_at, updated_at)
SELECT nextval('transport_report_trip_seq'), tr.id, ct.id, ct.cargo_group_id, ea.id, mx.id,
       rp.id, up.id, t.so_chuyen, t.cung_do, t.chenh_cao,
       t.tang_nhan,
       -- Nhóm tầng nhận tải (AK5): nhánh < -195 -> -200 CHỈ áp cho nhóm KC.
       CASE WHEN ea.area_group = 'KC' AND t.tang_nhan < -195 THEN -200
            WHEN t.tang_nhan < 0 THEN (-1 + (t.tang_nhan + 1) / 15) * 15
            ELSE (t.tang_nhan / 15) * 15 END,
       '0', t.muc_tai,
       CASE WHEN t.muc_tai = 'OTHER' THEN '1/2' ELSE NULL END,
       t.mua, false, 'APPROVED',
       'MAU-SL #' || t.seq || ' — ' || t.vi_sao, NOW(), NOW()
FROM tmp_trip t
JOIN devices          xe ON xe.code = t.xe
JOIN shifts           s  ON s.name::text = t.ca
JOIN transport_reports tr ON tr.report_date = t.ngay AND tr.vehicle_id = xe.id AND tr.shift_id = s.id
JOIN cargo_types      ct ON ct.code = t.chung_loai
JOIN excavation_areas ea ON ea.code = t.khu_vuc
JOIN devices          mx ON mx.code = t.may_xuc
JOIN receiving_points rp ON rp.code = t.noi_nhan
JOIN unloading_points up ON up.name = t.noi_do;

COMMIT;
