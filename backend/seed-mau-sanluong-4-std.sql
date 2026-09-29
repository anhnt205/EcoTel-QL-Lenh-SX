-- ════════════════════════════════════════════════════════════════════════
-- DỮ LIỆU MẪU (4/4) — SỐ TRẮC ĐỊA (STD) cho các khoá kỳ 01/8 → 07/8/2026
--
-- Vì sao phải chạy SAU khi tính lần đầu: khoá STD là chuỗi engine TỰ DỰNG
-- từ dữ liệu chuyến (`Nhóm vỉa_Nhóm tầng_Máy xúc_Khu vực` + hậu tố), không
-- đoán trước được. Quy trình: TÍNH một lượt để engine sinh khoá vào
-- `survey_coefficients` → chạy file này → TÍNH LẠI.
--
-- Không có STD thì hệ số trắc địa = 0, toàn bộ sản lượng nhóm đó bị nhân 0
-- và báo cáo ra số 0 (engine có cảnh báo, nhưng không xem được gì).
--
-- ⚠ BẪY ĐÃ VẤP: engine tra STD theo **(loại danh mục, khoá, ngày)** —
--   KHÔNG theo sản phẩm nghiệm thu. Nên mỗi khoá chỉ được có ĐÚNG MỘT dòng,
--   và dòng đó phải điền CẢ cột Đất lẫn cột Than: cùng một khoá (cùng nhóm
--   vỉa + tầng + máy xúc + khu vực) có thể phục vụ cả chuyến đất lẫn chuyến
--   than, engine chọn cột theo sản phẩm của TỪNG chuyến
--   (`isCoalProduct` / `resolveBulkDensity`). Sinh mỗi (khoá, sản phẩm) một
--   dòng sẽ vừa tạo dòng trùng, vừa để trống nửa còn lại → thể trọng = 0.
--
-- Số trắc địa đặt LỆCH so với số thống kê (đất −5%, than +5%) để hệ số ra
-- khác 1 — đặt bằng nhau thì mọi hệ số đều bằng 1, không phân biệt được
-- engine có thực sự áp hệ số hay không.
--
-- CHẠY LẠI NHIỀU LẦN ĐƯỢC.
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/seed-mau-sanluong-4-std.sql
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM survey_standards WHERE note = 'Dữ liệu mẫu (sinh từ khoá kỳ 102)';

INSERT INTO survey_standards
  (id, catalog_type, seam_group_excavator_key,
   earth_m3, earth_ton, earth_tkm, earth_bulk_density, earth_acceptance_product,
   coal_m3,  coal_ton,  coal_tkm,  coal_bulk_density,  coal_acceptance_product,
   effective_from, effective_to, note, created_at, updated_at)
SELECT nextval('survey_standard_seq'),
       g.catalog_type, g.khoa,
       ROUND(g.m3_dat  * 0.95, 6), ROUND(g.tan_dat  * 0.95, 6), ROUND(g.tkm_dat  * 0.95, 6),
       1.55, 'Dat_SX',
       ROUND(g.m3_than * 1.05, 6), ROUND(g.tan_than * 1.05, 6), ROUND(g.tkm_than * 1.05, 6),
       1.42, 'Than_SX',
       DATE '2026-01-01', DATE '2026-12-31', 'Dữ liệu mẫu (sinh từ khoá kỳ 102)', NOW(), NOW()
FROM (
    SELECT
        -- standardTypeOf(): chỉ "Dat_CN" đi nhánh Đất CN, còn lại Đất SX/Than SX.
        CASE WHEN lower(c.acceptance_product) = 'dat_cn' THEN 'DAT_CN' ELSE 'DAT_SX_THAN_SX' END AS catalog_type,
        c.seam_group_excavator_key AS khoa,
        -- isCoalProduct(): sản phẩm bắt đầu bằng "than" -> engine đọc cột THAN.
        -- Nửa nào không có chuyến thì lấy tổng của cả khoá, để cột đó vẫn có
        -- số thay vì NULL (NULL sẽ thành thể trọng 0 nếu sau này có chuyến
        -- loại đó rơi vào cùng khoá).
        COALESCE(SUM(c.total_m3)  FILTER (WHERE lower(c.acceptance_product) NOT LIKE 'than%'), SUM(c.total_m3))  AS m3_dat,
        COALESCE(SUM(c.total_ton) FILTER (WHERE lower(c.acceptance_product) NOT LIKE 'than%'), SUM(c.total_ton)) AS tan_dat,
        COALESCE(SUM(c.total_tkm) FILTER (WHERE lower(c.acceptance_product) NOT LIKE 'than%'), SUM(c.total_tkm)) AS tkm_dat,
        COALESCE(SUM(c.total_m3)  FILTER (WHERE lower(c.acceptance_product) LIKE 'than%'), SUM(c.total_m3))  AS m3_than,
        COALESCE(SUM(c.total_ton) FILTER (WHERE lower(c.acceptance_product) LIKE 'than%'), SUM(c.total_ton)) AS tan_than,
        COALESCE(SUM(c.total_tkm) FILTER (WHERE lower(c.acceptance_product) LIKE 'than%'), SUM(c.total_tkm)) AS tkm_than
    FROM survey_coefficients c
    WHERE c.report_period_id = 102 AND c.kind = 'AP_TDIA'
    GROUP BY 1, 2
) g
WHERE NOT EXISTS (
    SELECT 1 FROM survey_standards s
    WHERE s.seam_group_excavator_key = g.khoa
      AND s.catalog_type = g.catalog_type
      AND s.effective_from <= DATE '2026-08-01'
      AND (s.effective_to IS NULL OR s.effective_to >= DATE '2026-08-01'));

COMMIT;
