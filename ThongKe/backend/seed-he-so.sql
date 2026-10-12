-- Hằng số nghiệp vụ của công thức sản lượng — danh mục "Hệ số"
-- (bước 4 của kế hoạch 8 bước, 2026-09-07).
--
-- Bảng tính gốc lấy các giá trị này từ Ô CỐ ĐỊNH trong sheet ($AM$3, $BN$2,
-- $B$3, $D$3, $F$3) chứ không từ danh mục nào — nên khi chuyển sang phần
-- mềm chúng không có chỗ khai, và engine hoặc trả 0 kèm cảnh báo, hoặc
-- chưa tính được cột tương ứng.
--
-- Chạy lại nhiều lần được (ON CONFLICT DO NOTHING) — KHÔNG ghi đè giá trị
-- người dùng đã tự sửa trong danh mục.
--
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/seed-he-so.sql
--
-- ⚠ GIÁ TRỊ TỶ LỆ ĐÁ THẢI ($B$3/$D$3/$F$3) CHƯA CÓ SỐ THẬT: ba ô đó nằm
--   ngoài vùng đã trích xuất, chủ dự án phải nhập số đúng. Ở đây seed = 0
--   để CÓ CHỖ KHAI và để 0 × khối lượng = 0 (đúng bằng hành vi hiện tại,
--   không âm thầm đổi kết quả), kèm ghi chú nhắc nhập.

INSERT INTO coefficient_items (id, code, name, value, note, created_at, updated_at)
VALUES
  -- BN5 — hệ số bù nhiên liệu cho chuyến chở bùn (ô $BN$2).
  -- Engine ĐANG đọc mã này (FuelCalculator.COEFFICIENT_MUD); chưa có thì
  -- khoản bù bùn tính bằng 0 kèm cảnh báo trên từng chuyến.
  (nextval('coefficient_item_seq'), 'HS.BUN',
   'Hệ số bù nhiên liệu chở bùn', 0,
   'Ô $BN$2 của bảng tính. CHƯA CÓ SỐ THẬT — chủ dự án nhập lại.',
   NOW(), NOW()),

  -- FJ5 = FK5 / IF(D5="KC"; 2,625; 2,617) — quy đổi tấn đá thải sang m3.
  -- Hai số này KHÔNG tồn tại ở bất kỳ đâu trong code trước lượt này.
  (nextval('coefficient_item_seq'), 'HS.DATHAI.M3.KC',
   'Quy đổi m3 đá thải — nhóm khu vực KC', 2.625,
   'FJ5 = FK5 / 2,625 khi nhóm khu vực là KC.', NOW(), NOW()),
  (nextval('coefficient_item_seq'), 'HS.DATHAI.M3.CS',
   'Quy đổi m3 đá thải — nhóm khu vực CS', 2.617,
   'FJ5 = FK5 / 2,617 khi nhóm khu vực là CS.', NOW(), NOW()),

  -- FK5 = IF(J5="THANV"; IF(D5="CS"; $D$3;
  --          IF(AND(D5="KC"; RIGHT(I5;2)="CS"); $F$3; $B$3)) * $CK5; 0)
  -- Ba tỷ lệ đá thải, chọn theo nhóm khu vực và đuôi tên nơi dỡ tải.
  (nextval('coefficient_item_seq'), 'HS.DATHAI.TYLE.CS',
   'Tỷ lệ đá thải — nhóm khu vực CS', 0,
   'Ô $D$3. CHƯA CÓ SỐ THẬT — chủ dự án nhập lại.', NOW(), NOW()),
  (nextval('coefficient_item_seq'), 'HS.DATHAI.TYLE.KC.CS',
   'Tỷ lệ đá thải — nhóm KC, nơi dỡ tải kết thúc bằng "CS"', 0,
   'Ô $F$3. CHƯA CÓ SỐ THẬT — chủ dự án nhập lại.', NOW(), NOW()),
  (nextval('coefficient_item_seq'), 'HS.DATHAI.TYLE.KHAC',
   'Tỷ lệ đá thải — các trường hợp còn lại', 0,
   'Ô $B$3. CHƯA CÓ SỐ THẬT — chủ dự án nhập lại.', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
