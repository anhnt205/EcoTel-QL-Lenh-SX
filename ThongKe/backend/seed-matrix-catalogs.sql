-- Khai báo 4 danh mục dạng LƯỚI (bảng tra hai chiều).
--
-- Đây KHÔNG phải dữ liệu mẫu: bốn lưới là cố định theo nghiệp vụ, mã của
-- chúng được code tham chiếu trực tiếp. Chỉ phần khai báo được seed; trục và
-- ô do người dùng nhập (hoặc nhập từ Excel).
--
-- Nguồn: docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md mục 3.3, đối chiếu với công thức
-- thật ở dòng 5 sheet `tinh toan`.
--
-- Chạy được nhiều lần: ON CONFLICT DO NOTHING theo mã.

INSERT INTO matrix_definitions
    (id, code, name, row_axis_label, col_axis_label, value_label,
     row_source_path, col_source_path, numeric_row_axis, numeric_col_axis,
     value_scale, note, created_at, updated_at)
VALUES
-- AJ5 = INDEX(Mohinh_TheTrong!C4:AX144, MATCH(K5 /*Chủng loại hàng*/, B4:B144, 0),
--                                       MATCH(DA5 /*Chủng loại xe + DMNL*/, C3:AX3, 0))
(1, 'MO_HINH', 'Mô hình (m3/chuyến)',
 'Chủng loại hàng', 'Chủng loại xe + DMNL', 'm3/chuyến',
 '/cargo-types', '/vehicle-fuel-classes', false, false, 3,
 'Tra theo Chủng loại hàng × Chủng loại xe + DMNL. Sau khi tra được còn nhân hệ số Roda (2/3 hoặc 1) rồi làm tròn 3 chữ số thập phân — phần đó thuộc công thức, không thuộc danh mục.',
 NOW(), NOW()),

-- AT5/AU5/AW5/AX5 = INDEX('DMNL T2-2025'!C7:AJR73, MATCH(dải cung độ, B7:B73, 0),
--                                                  MATCH(độ dốc & "_" & dải, C6:AJR6, 0))
-- Excel dùng MATCH(...,1) + SMALL(...) để lấy hai dải kề nhau rồi NỘI SUY,
-- nên trục dòng phải là trục SỐ — sắp theo chuỗi sẽ cho "10" đứng trước "9".
(2, 'DMNL', 'Định mức nhiên liệu',
 'Độ dốc (dải)', 'Chủng loại xe + cung độ', 'lít',
 NULL, NULL, true, false, 4,
 'DÒNG là dải ĐỘ DỐC (trục số); CỘT ghép chủng loại xe với cung độ thành một khoá, vd CAT777E.KC_3 — đúng theo AT5. Dải cung độ nằm trong TÊN CỘT, không phải một trục riêng. Nội suy SONG TUYẾN trên 4 góc.',
 NOW(), NOW()),

-- Bảng NS.XE nằm ngay trong sheet `tinh toan` (vùng EO..GY), tra theo
-- chủng loại xe + phân loại và cung độ.
(3, 'NANG_SUAT_XE', 'Năng suất xe (996)',
 'Cung độ (dải)', 'Chủng loại xe + phân loại', 'năng suất',
 NULL, '/vehicle-category-classes', true, false, 4,
 'Trục DÒNG là dải cung độ (trục số) — đúng theo BR5: INDEX(NS.XE, MATCH(cung độ, NS.CDXE), MATCH(chủng loại xe, NS.CLXE)), tham số thứ hai của INDEX là DÒNG. Khoá cột dẫn xuất: mã chủng loại xe + DMNL nối "." + phân loại, vd CAT777E.DAT.',
 NOW(), NOW()),

-- EC5: HS điều chỉnh NLĐM, vùng FW:FY của sheet `tinh toan`, cột khoá theo
-- khu vực (CS/KC).
(4, 'HS_DIEU_CHINH_NLDM', 'HS điều chỉnh NLĐM',
 'Chủng loại xe + hạng + phân loại', 'Khu vực xúc', 'hệ số',
 NULL, '/excavation-areas', false, false, 6,
 'Khoá dòng là chuỗi ghép chủng loại xe _ hạng xe _ phân loại. Ba thành phần này lấy từ danh mục xe (Device) — cần bổ sung thuộc tính hạng xe và chất lượng trước khi dùng được (mục S3).',
 NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Đẩy sequence lên quá các id đã cắm tay, nếu không lần INSERT tiếp theo qua
-- ứng dụng sẽ đụng khoá chính.
SELECT setval('matrix_definition_seq',
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM matrix_definitions), 1) + 50);
