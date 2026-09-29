-- Di trú: lưới định mức có PHIÊN BẢN theo thời gian.
--
-- VÌ SAO: định mức không phải hằng số. Nhân viên thống kê khai lại theo kỳ —
-- bảng tính gốc thể hiện điều đó ngay ở tên sheet (`DMNL T2-2025`). Nếu mỗi
-- lưới chỉ có một bộ giá trị thì khai kỳ mới sẽ ĐÈ MẤT số của kỳ cũ, và chạy
-- lại báo cáo tháng trước sẽ ra con số khác — trái nguyên tắc "tra theo ngày
-- sản xuất" của QĐ-04.
--
-- ⚠ BẮT BUỘC chạy sau khi deploy bản mới. Hibernate `ddl-auto: update` TẠO
-- ràng buộc mới nhưng KHÔNG BAO GIỜ XOÁ ràng buộc cũ, nên `uk_matrix_
-- definition_code` (mã là duy nhất) vẫn còn và sẽ chặn mọi phiên bản thứ hai:
--
--   ERROR: duplicate key value violates unique constraint
--          "uk_matrix_definition_code"  Detail: Key (code)=(DMNL) already exists.
--
-- Chạy được nhiều lần.

BEGIN;

-- 1. Bỏ ràng buộc CŨ: mã không còn là duy nhất, mỗi mã có nhiều phiên bản.
ALTER TABLE matrix_definitions DROP CONSTRAINT IF EXISTS uk_matrix_definition_code;

-- 2. Ràng buộc MỚI: duy nhất theo (mã, ngày bắt đầu).
--    Hibernate thường đã tạo sẵn; câu này chỉ để chắc chắn khi chạy trên CSDL
--    được tạo bằng cách khác.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_matrix_definition_code_from'
    ) THEN
        ALTER TABLE matrix_definitions
            ADD CONSTRAINT uk_matrix_definition_code_from UNIQUE (code, effective_from);
    END IF;
END $$;

COMMIT;

-- ── KIỂM TRA ────────────────────────────────────────────────────────────────
-- Phải thấy uk_matrix_definition_code_from và KHÔNG còn uk_matrix_definition_code.
SELECT conname AS rang_buoc
FROM pg_constraint
WHERE conrelid = 'matrix_definitions'::regclass AND contype = 'u'
ORDER BY conname;

-- ── GHI CHÚ VỀ DỮ LIỆU CŨ ───────────────────────────────────────────────────
-- Các phiên bản tạo trước khi có tính năng này có effective_from/to đều NULL,
-- nghĩa là "có hiệu lực mọi lúc". Chúng vẫn chạy nguyên vẹn: engine tra theo
-- ngày sẽ luôn tìm thấy chúng. Khi tạo phiên bản mới, hệ tự đóng phiên bản cũ
-- lại ở ngày liền trước — không cần sửa tay.
