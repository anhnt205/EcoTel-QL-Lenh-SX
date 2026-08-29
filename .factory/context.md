# Context — THONGKE-CAOSON

Cập nhật lần cuối: 2026-08-29 (onboarding lượt 1, hoàn chỉnh). Đọc file này
TRƯỚC khi tiếp tục — tin file này hơn lịch sử chat đã bị nén.

## Tóm tắt trạng thái

Dự án brownfield, đã onboarding xong lượt 1 (đọc + phân tích + tài liệu
hoá + build/test baseline thật, **KHÔNG sửa chức năng nghiệp vụ** theo
đúng yêu cầu). Đã tạo đủ file bắt buộc: `project.yaml`, `CLAUDE.md`,
`Requirement.md`, `docs/CODEBASE_MAP.md`, `docs/ARCHITECTURE_CURRENT.md`,
`docs/REQUIREMENTS_AS_IS.md`, `docs/TECHNICAL_DEBT.md`,
`.factory/pipeline.json` + file này.

**Phát hiện quan trọng nhất**: toàn bộ xác thực/phân quyền API đang bị TẮT
hoàn toàn (`SecurityConfig.java`: `.anyRequest().permitAll() // test`) —
xem `docs/TECHNICAL_DEBT.md` mục 🔴 1. `automation.allow_apply_code` đã TẮT
trong `project.yaml` vì lý do này.

## Đã làm — lượt 1 (onboarding, không sửa code nghiệp vụ)

1. Clone thật từ `https://github.com/anhnt205/THONG_KE_CAO_SON.git`, giữ
   nguyên lịch sử Git gốc (branches gốc: `main`, `auth`, `feature/backend`
   trên remote). Checkout `main`, tạo nhánh `chore/factory-onboarding`.
2. Đọc toàn bộ: công nghệ (Spring Boot 4.0.7/Java 21 + React 19/Vite 8),
   cấu trúc thư mục, 12 module nghiệp vụ (danh mục + Vận tải + Khai thác +
   Đối chiếu), schema DB (SQL thuần, không Flyway/Liquibase), toàn bộ 11
   controller/21 model/17 repository, cơ chế đăng nhập qua Portal SSO
   (one-time-code exchange), cơ chế đồng bộ MongoDB Change Streams (1
   chiều, từ hệ "Lệnh SX" cũ), build/test/deploy (Docker + GitHub Actions
   deploy-staging.yml), toàn bộ biến môi trường.
3. Kiểm tra secret: grep sweep pattern (AWS key, private key, password/
   secret/api-key hardcode) trên toàn repo — KHÔNG tìm thấy secret thật
   nào bị commit. `.env`/`.env.*` không tồn tại (kể cả trên đĩa, ngoài git)
   — đúng `.gitignore`. Chỉ có 2 default dev vô hại (`postgres`/`password`,
   Mongo `root`/`example`) — đã ghi nhận, KHÔNG copy giá trị thật ra bất kỳ
   đâu trong tài liệu.
4. Xác định + verify THẬT lệnh build/test bằng cách chạy trong Docker
   (2026-08-29):
   - **Backend build**: `docker build -t thongkecs-backend-baseline
     ./backend` — PASS (~26s, Maven multi-stage).
   - **Backend test**: `docker build --target builder -t
     thongkecs-backend-builder ./backend && docker run --rm
     thongkecs-backend-builder mvn -B test` — **FAIL THẬT**
     (`ThongKeCaoSonApplicationTests.contextLoads` không boot được
     ApplicationContext vì thiếu JDBC datasource sống — không có H2/
     Testcontainers). Xem `docs/TECHNICAL_DEBT.md` mục 3.
   - **Frontend build**: `docker build -t thongkecs-frontend-baseline
     ./frontend` — PASS (~30s, pnpm + vite build).
   - **Frontend test**: không có script `test` trong `package.json`.
5. Tạo 9 file bắt buộc (liệt kê ở trên) — nội dung dựa 100% trên code đọc
   được, không suy đoán/bịa.
6. Commit toàn bộ trên nhánh `chore/factory-onboarding` (KHÔNG đụng
   `main`), CHƯA push lên remote.

## Việc cần làm tiếp (ưu tiên theo thứ tự)

1. **Hỏi chủ dự án về phát hiện bảo mật 🔴 1** — bắt buộc trước khi làm
   bất kỳ việc gì khác trên project này (kể cả bật `allow_apply_code`).
2. Retrofit branch/worktree Claude/Codex chuẩn factory (`dev`/`claude-dev`/
   `codex-dev` + `.factory/worktrees/`) — theo đúng pattern đã áp dụng cho
   10 project khác trong factory (xem ghi chú bên dưới sau khi thực hiện).
3. Xác nhận có push `chore/factory-onboarding` lên remote hay giữ cục bộ.
4. Nếu cần preview sống: cần Postgres+Redis+Portal (PORTAL-PM) reachable +
   `.env`/`.env_backend` thật (hiện không có) — xem `docs/TECHNICAL_DEBT.md`
   mục "Điều kiện còn thiếu".
5. Quyết định hướng viết test thật (Testcontainers/H2) trước khi coi
   `allow_apply_code=true` là an toàn về mặt regression.
6. Xác nhận MongoDB "Lệnh SX" nguồn đồng bộ có đúng là hệ TK-HATU/
   DIEU-PHOI-MM không.

## Nếu phiên sau cần tiếp tục

Đọc theo thứ tự: file này → `docs/TECHNICAL_DEBT.md` (đọc đủ, đặc biệt mục
🔴 1) → `docs/ARCHITECTURE_CURRENT.md` → `docs/CODEBASE_MAP.md` →
`docs/REQUIREMENTS_AS_IS.md`. KHÔNG giả định bảo mật đã được xử lý chỉ vì
chưa thấy nhắc lại — luôn đọc trực tiếp `SecurityConfig.java` để xác nhận
trạng thái hiện tại trước khi làm việc liên quan tới API.
