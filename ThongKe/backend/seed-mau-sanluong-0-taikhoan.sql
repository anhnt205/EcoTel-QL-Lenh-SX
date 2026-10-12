-- ════════════════════════════════════════════════════════════════════════
-- DỮ LIỆU MẪU (0/3) — TÀI KHOẢN XEM THỬ CHO PREVIEW
--
-- Vì sao cần: preview chạy `AUTH_MODE=standalone` (đăng nhập cục bộ qua
-- POST /api/auth/login). Tài khoản `admin` có sẵn nhưng mật khẩu gốc KHÔNG
-- ai biết (chỉ có BCrypt hash trong seed-data.sql) — quy tắc dự án mục 8
-- cấm đoán/thử mật khẩu đó. Nên tạo một tài khoản RIÊNG, không đụng tới
-- `admin`.
--
-- ⚠ CHỈ DÙNG CHO PREVIEW LOCAL. Mật khẩu để lộ trong file này là CỐ Ý —
--   môi trường preview chạy trên máy cá nhân, dữ liệu là dữ liệu mẫu.
--   KHÔNG chạy file này ở staging/production.
--
--   Tài khoản: xemthu
--   Mật khẩu : XemThu@2026
--
--   docker exec -i thongke-caoson-preview-postgres-1 \
--       psql -U postgres -d thong_ke < backend/seed-mau-sanluong-0-taikhoan.sql
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- `crypt(..., gen_salt('bf', 10))` sinh hash BCrypt tiền tố $2a$ — đúng
-- định dạng `BCryptPasswordEncoder` của Spring đọc được.
INSERT INTO users (id, username, password, full_name, email, salary_code, role, active, created_at, updated_at)
SELECT nextval('user_seq'), 'xemthu',
       crypt('XemThu@2026', gen_salt('bf', 10)),
       'Tài khoản xem thử (dữ liệu mẫu)', 'xemthu@preview.local', 'XEMTHU',
       'ADMIN', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'xemthu');

-- Chạy lại thì đặt lại mật khẩu về đúng giá trị trên (tiện khi quên).
UPDATE users
SET password = crypt('XemThu@2026', gen_salt('bf', 10)), active = true, updated_at = NOW()
WHERE username = 'xemthu';
