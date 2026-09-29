-- ════════════════════════════════════════════════════════════════════════
-- DỮ LIỆU MẪU (2/3) — BỐN LƯỚI TRA BẢNG, dựng theo ĐÚNG khoá mới (QĐ-10..13)
--
-- Đây là phần quan trọng nhất để kiểm chứng bằng mắt: tra ra ô nghĩa là
-- khoá đúng; tra hụt thì báo cáo hiện cảnh báo nêu rõ khoá bị thiếu.
--
--   Mô hình        cột = <Chủng loại xe>.<CS|KC>              CAT777E.CS
--   Năng suất xe   cột = <Chủng loại xe>.<DAT|Than>           CAT777E.DAT
--   ĐMNL           cột = <Chủng loại xe NL><hậu tố>_<cung độ> CAT777E.DAT_3
--   HS điều chỉnh  dòng = <NL>_<chữ đầu hạng>_<DAT|Than>      CAT777E_C_DAT
--                  cột  = T<tháng>.<CS|KC>                    T8.CS
--
-- Phiên bản hiệu lực CẢ NĂM 2026, gắn nhãn "MAU-2026" để phân biệt với dữ
-- liệu thật. CHẠY LẠI NHIỀU LẦN ĐƯỢC — chỉ xoá đúng phiên bản mẫu.
--
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/seed-mau-sanluong-2-luoi.sql
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM matrix_cells        WHERE definition_id IN (SELECT id FROM matrix_definitions WHERE version_label = 'MAU-2026');
DELETE FROM matrix_axis_entries WHERE definition_id IN (SELECT id FROM matrix_definitions WHERE version_label = 'MAU-2026');
DELETE FROM matrix_definitions  WHERE version_label = 'MAU-2026';

-- Dọn LƯỚI DEMO GIẢ nạp thẳng bằng psql ở lượt 7 (chỉ để xem giao diện
-- bảng/phân trang, không phải dữ liệu nghiệp vụ). Nó chiếm đúng khoảng
-- hiệu lực 2026-01-01 nên phải bỏ đi thì lưới mẫu có khoá ĐÚNG mới vào
-- được — ràng buộc duy nhất là (code, effective_from).
DELETE FROM matrix_cells        WHERE definition_id IN (SELECT id FROM matrix_definitions WHERE code = 'DMNL' AND effective_from = DATE '2026-01-01' AND version_label IS DISTINCT FROM 'MAU-2026');
DELETE FROM matrix_axis_entries WHERE definition_id IN (SELECT id FROM matrix_definitions WHERE code = 'DMNL' AND effective_from = DATE '2026-01-01' AND version_label IS DISTINCT FROM 'MAU-2026');
DELETE FROM matrix_definitions  WHERE code = 'DMNL' AND effective_from = DATE '2026-01-01' AND version_label IS DISTINCT FROM 'MAU-2026';

-- ────────────────────────────────────────────────────────────────────────
-- 1. MÔ HÌNH (m3/chuyến) — dòng: Chủng loại hàng, cột: <xe>.<CS|KC>
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO matrix_definitions
  (id, code, name, row_axis_label, col_axis_label, value_label, value_scale,
   numeric_row_axis, numeric_col_axis, effective_from, effective_to, version_label, note, created_at, updated_at)
VALUES (nextval('matrix_definition_seq'), 'MO_HINH', 'Mô hình (m3/chuyến)',
        'Chủng loại hàng', 'Chủng loại xe + khu vực', 'm3/chuyến', 3,
        false, false, DATE '2026-01-01', DATE '2026-12-31', 'MAU-2026',
        'Dữ liệu MẪU', NOW(), NOW());

INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'ROW', ct.code, ct.name, NULL,
       row_number() OVER (ORDER BY ct.code)
FROM matrix_definitions d
CROSS JOIN (SELECT code, name FROM cargo_types) ct
WHERE d.version_label = 'MAU-2026' AND d.code = 'MO_HINH';

INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'COL', v.code || '.' || g.grp, v.code || '.' || g.grp, NULL,
       row_number() OVER (ORDER BY v.code, g.grp)
FROM matrix_definitions d
CROSS JOIN (VALUES ('CAT777E'), ('HD465-7R'), ('HM400-2R')) AS v(code)
CROSS JOIN (VALUES ('CS'), ('KC')) AS g(grp)
WHERE d.version_label = 'MAU-2026' AND d.code = 'MO_HINH';

-- Sức chở danh nghĩa: CAT777E ~60 m3, HD465-7R ~34, HM400-2R ~24.
-- Hàng nặng (than) chở ít m3 hơn; bùn ít hơn nữa; KC xa nên nhỉnh thấp hơn.
INSERT INTO matrix_cells (id, definition_id, row_key, col_key, value)
SELECT nextval('matrix_cell_seq'), d.id, r.entry_key, c.entry_key,
       ROUND((CASE split_part(c.entry_key, '.', 1)
                WHEN 'CAT777E'  THEN 60.0
                WHEN 'HD465-7R' THEN 34.0
                ELSE 24.0 END
              * CASE WHEN r.entry_key IN ('CLH001','CLH005','CLH006','CLH009','THAN') THEN 0.92
                     WHEN r.entry_key IN ('CLH004','MK12')                            THEN 0.85
                     ELSE 1.00 END
              * CASE WHEN split_part(c.entry_key, '.', 2) = 'CS' THEN 1.00 ELSE 0.97 END
             )::numeric, 3)
FROM matrix_definitions d
JOIN matrix_axis_entries r ON r.definition_id = d.id AND r.axis = 'ROW'
JOIN matrix_axis_entries c ON c.definition_id = d.id AND c.axis = 'COL'
WHERE d.version_label = 'MAU-2026' AND d.code = 'MO_HINH';

-- ────────────────────────────────────────────────────────────────────────
-- 2. NĂNG SUẤT XE (996) — dòng: cung độ (SỐ), cột: <xe>.<DAT|Than>
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO matrix_definitions
  (id, code, name, row_axis_label, col_axis_label, value_label, value_scale,
   numeric_row_axis, numeric_col_axis, effective_from, effective_to, version_label, note, created_at, updated_at)
VALUES (nextval('matrix_definition_seq'), 'NANG_SUAT_XE', 'Năng suất xe (996)',
        'Cung độ (km)', 'Chủng loại xe + phân loại', 'chuyến/ca', 3,
        true, false, DATE '2026-01-01', DATE '2026-12-31', 'MAU-2026',
        'Dữ liệu MẪU', NOW(), NOW());

-- Cung độ 0,5 → 8,0 km bước 0,5. Engine chặn >8 và làm tròn 1 chữ số.
INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'ROW',
       to_char(s.km, 'FM990.0'), to_char(s.km, 'FM990.0') || ' km', s.km,
       row_number() OVER (ORDER BY s.km)
FROM matrix_definitions d
CROSS JOIN (SELECT generate_series(5, 80, 5) / 10.0 AS km) s
WHERE d.version_label = 'MAU-2026' AND d.code = 'NANG_SUAT_XE';

INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'COL', v.code || '.' || p.cls, v.code || '.' || p.cls, NULL,
       row_number() OVER (ORDER BY v.code, p.cls)
FROM matrix_definitions d
CROSS JOIN (VALUES ('CAT777E'), ('HD465-7R'), ('HM400-2R')) AS v(code)
CROSS JOIN (VALUES ('DAT'), ('Than')) AS p(cls)
WHERE d.version_label = 'MAU-2026' AND d.code = 'NANG_SUAT_XE';

-- Cung độ càng xa thì số chuyến/ca càng ít; chặn dưới 4 chuyến.
INSERT INTO matrix_cells (id, definition_id, row_key, col_key, value)
SELECT nextval('matrix_cell_seq'), d.id, r.entry_key, c.entry_key,
       ROUND(GREATEST(4.0, (CASE split_part(c.entry_key, '.', 1)
                              WHEN 'CAT777E'  THEN 46.0
                              WHEN 'HD465-7R' THEN 52.0
                              ELSE 58.0 END) / (1.0 + r.numeric_value * 0.75)
                       * CASE WHEN split_part(c.entry_key, '.', 2) = 'Than' THEN 1.05 ELSE 1.00 END
            )::numeric, 3)
FROM matrix_definitions d
JOIN matrix_axis_entries r ON r.definition_id = d.id AND r.axis = 'ROW'
JOIN matrix_axis_entries c ON c.definition_id = d.id AND c.axis = 'COL'
WHERE d.version_label = 'MAU-2026' AND d.code = 'NANG_SUAT_XE';

-- ────────────────────────────────────────────────────────────────────────
-- 3. ĐỊNH MỨC NHIÊN LIỆU — dòng: độ dốc (SỐ), cột: <NL><hậu tố>_<cung độ>
--    Nội suy SONG TUYẾN trên (cung độ × độ dốc) nên phải phủ đủ hai chiều.
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO matrix_definitions
  (id, code, name, row_axis_label, col_axis_label, value_label, value_scale,
   numeric_row_axis, numeric_col_axis, effective_from, effective_to, version_label, note, created_at, updated_at)
VALUES (nextval('matrix_definition_seq'), 'DMNL', 'Định mức nhiên liệu',
        'Độ dốc (m)', 'Chủng loại xe (NL) + cung độ', 'lít/1000 tkm', 6,
        true, false, DATE '2026-01-01', DATE '2026-12-31', 'MAU-2026',
        'Dữ liệu MẪU', NOW(), NOW());

-- Chênh cao 0 → 120 m, bước 20 m.
INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'ROW', s.m::text, s.m::text || ' m', s.m,
       row_number() OVER (ORDER BY s.m)
FROM matrix_definitions d
CROSS JOIN (SELECT generate_series(0, 120, 20) AS m) s
WHERE d.version_label = 'MAU-2026' AND d.code = 'DMNL';

-- BẪY: engine ghép cung độ bằng BigDecimal.stripTrailingZeros() (xem
-- FuelNormInterpolator.trimZeros), nên khoá là "..._2" chứ KHÔNG phải
-- "..._2,0"/"..._2.0". Dùng trim_scale() để sinh đúng dạng đó — sai chỗ này
-- thì chuyến có cung độ tròn sẽ tra hụt, còn cung độ lẻ vẫn chạy, rất khó thấy.
--
-- Khai đủ CẢ NĂM hậu tố mà quy tắc DE5 sinh ra: hậu tố do TỪNG CHUYẾN
-- quyết định (chủng loại hàng, nơi dỡ tải, SPNT), thiếu một cái là chuyến
-- rơi vào nhánh đó tra hụt.
INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'COL',
       v.code || sfx.s || '_' || trim_scale(km.v)::text,
       v.code || sfx.s || ' - ' || trim_scale(km.v)::text || ' km', NULL,
       row_number() OVER (ORDER BY v.code, sfx.s, km.v)
FROM matrix_definitions d
CROSS JOIN (VALUES ('CAT777E'), ('HD465-7R'), ('HM400-2R')) AS v(code)
CROSS JOIN (VALUES ('.DAT'), ('.Than'), ('.BK'), ('.Dat'), ('.Bun')) AS sfx(s)
CROSS JOIN (SELECT generate_series(5, 80, 5) / 10.0 AS v) km
WHERE d.version_label = 'MAU-2026' AND d.code = 'DMNL';

-- Định mức tăng theo cung độ và chênh cao; xe to tốn hơn. Hậu tố .Bun/.Dat
-- (xe cạp, đường xấu) tốn hơn, .BK (ra băng tải) tiết kiệm hơn.
INSERT INTO matrix_cells (id, definition_id, row_key, col_key, value)
SELECT nextval('matrix_cell_seq'), d.id, r.entry_key, c.entry_key,
       ROUND(( (CASE WHEN c.entry_key LIKE 'CAT777E%'  THEN 0.62
                     WHEN c.entry_key LIKE 'HD465-7R%' THEN 0.55
                     ELSE 0.49 END)
               * (1.0 + (split_part(c.entry_key, '_', 2))::numeric * 0.045)
               * (1.0 + r.numeric_value * 0.0028)
               * (CASE WHEN strpos(c.entry_key, '.Bun_') > 0 THEN 1.18
                       WHEN strpos(c.entry_key, '.Dat_') > 0 THEN 1.10
                       WHEN strpos(c.entry_key, '.BK_')  > 0 THEN 0.94
                       ELSE 1.00 END)
             )::numeric, 6)
FROM matrix_definitions d
JOIN matrix_axis_entries r ON r.definition_id = d.id AND r.axis = 'ROW'
JOIN matrix_axis_entries c ON c.definition_id = d.id AND c.axis = 'COL'
WHERE d.version_label = 'MAU-2026' AND d.code = 'DMNL';

-- ────────────────────────────────────────────────────────────────────────
-- 4. HS ĐIỀU CHỈNH NLĐM — dòng: <NL>_<chữ đầu hạng>_<DAT|Than>
--                          cột : T<tháng>.<CS|KC> + NAM.<CS|KC>
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO matrix_definitions
  (id, code, name, row_axis_label, col_axis_label, value_label, value_scale,
   numeric_row_axis, numeric_col_axis, effective_from, effective_to, version_label, note, created_at, updated_at)
VALUES (nextval('matrix_definition_seq'), 'HS_DIEU_CHINH_NLDM', 'HS điều chỉnh NLĐM',
        'Chủng loại xe (NL) + hạng + phân loại', 'Tháng + nhóm khu vực', 'hệ số', 6,
        false, false, DATE '2026-01-01', DATE '2026-12-31', 'MAU-2026',
        'Dữ liệu MẪU', NOW(), NOW());

INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'ROW',
       v.code || '_' || rk.r || '_' || p.cls, v.code || '_' || rk.r || '_' || p.cls, NULL,
       row_number() OVER (ORDER BY v.code, rk.r, p.cls)
FROM matrix_definitions d
CROSS JOIN (VALUES ('CAT777E'), ('HD465-7R'), ('HM400-2R')) AS v(code)
CROSS JOIN (VALUES ('A'), ('B'), ('C')) AS rk(r)
CROSS JOIN (VALUES ('DAT'), ('Than')) AS p(cls)
WHERE d.version_label = 'MAU-2026' AND d.code = 'HS_DIEU_CHINH_NLDM';

INSERT INTO matrix_axis_entries (id, definition_id, axis, entry_key, label, numeric_value, sort_order)
SELECT nextval('matrix_axis_entry_seq'), d.id, 'COL', k.key, k.lbl, NULL,
       row_number() OVER (ORDER BY k.ord)
FROM matrix_definitions d
CROSS JOIN (
    SELECT 'T' || m || '.' || g AS key,
           'Tháng ' || m || ' - ' || g AS lbl,
           m * 10 + CASE g WHEN 'CS' THEN 1 ELSE 2 END AS ord
    FROM generate_series(1, 12) m
    CROSS JOIN (VALUES ('CS'), ('KC')) AS gg(g)
    UNION ALL
    SELECT 'NAM.' || g, 'HSNL điều chỉnh (năm) - ' || g, 900 + CASE g WHEN 'CS' THEN 1 ELSE 2 END
    FROM (VALUES ('CS'), ('KC')) AS gg2(g)
) k
WHERE d.version_label = 'MAU-2026' AND d.code = 'HS_DIEU_CHINH_NLDM';

-- Hệ số quanh 1: hạng A tốt hơn (<1), hạng C tốn hơn; mùa mưa (tháng 6..9)
-- nhích lên; khu vực KC xa hơn nên nhỉnh hơn CS.
INSERT INTO matrix_cells (id, definition_id, row_key, col_key, value)
SELECT nextval('matrix_cell_seq'), d.id, r.entry_key, c.entry_key,
       ROUND(( 1.00
               + CASE split_part(r.entry_key, '_', 2) WHEN 'A' THEN -0.03 WHEN 'B' THEN 0.00 ELSE 0.04 END
               + CASE WHEN split_part(r.entry_key, '_', 3) = 'Than' THEN 0.01 ELSE 0.00 END
               + CASE WHEN c.entry_key LIKE '%.KC' THEN 0.02 ELSE 0.00 END
               + CASE WHEN c.entry_key IN ('T6.CS','T6.KC','T7.CS','T7.KC','T8.CS','T8.KC','T9.CS','T9.KC')
                      THEN 0.015 ELSE 0.00 END
             )::numeric, 6)
FROM matrix_definitions d
JOIN matrix_axis_entries r ON r.definition_id = d.id AND r.axis = 'ROW'
JOIN matrix_axis_entries c ON c.definition_id = d.id AND c.axis = 'COL'
WHERE d.version_label = 'MAU-2026' AND d.code = 'HS_DIEU_CHINH_NLDM';

COMMIT;
