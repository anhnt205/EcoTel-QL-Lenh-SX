# DIEU-PHOI-MM — Context (cập nhật 2026-08-25)

## Trạng thái pipeline (xem `.factory/pipeline.json` để có bản chính thức)
REQUIREMENT → PROVISION → ARCHITECTURE → CODE → BUILD → TEST → PREVIEW đều `PASSED`.
GIT_PUSH = `PENDING` — đang ở nhánh local `dev-dieuphoi-mm` (base từ `origin/main` @ 4653203), chưa push remote.
APPROVAL = `PENDING`.

## PREVIEW chạy thật (2026-08-25)

**Lệnh chạy** (LUÔN kèm 2 file, không dùng `docker-compose.yaml` trần):
```bash
cd projects/DIEU-PHOI-MM/WebApp
docker compose -f docker-compose.yaml -f docker-compose.local-preview.yaml up -d ktv_Backend_service ktv_Frontend_service ktv_reverse_proxy_service ktv_db
```
Preview: **http://localhost:6869** (đổi từ 6868 mặc định — xem lý do bên dưới). Login demo: `admin`/`123456` (tự seed bởi `data-seeder/seed.js`, giống hệt cơ chế TK-HATU).

**`WebApp/docker-compose.local-preview.yaml`** (file MỚI, cố tình KHÔNG commit — dùng `!override` để thay hẳn `ports`/`container_name`, không chỉ nối thêm):
- Đổi port `6868→6869` và `27017→27018`: DIEU-PHOI-MM và TK-HATU **cùng gốc codebase**, `docker-compose.yaml` gốc hardcode y hệt port 6868/27017 cho cả 2 — chạy đồng thời trên cùng máy sẽ xung đột port. TK-HATU đang chạy sẵn nên đổi port bên DIEU-PHOI-MM.
- Đổi `container_name: ktv_mongo_db` → `dieuphoimm_mongo_db`: y hệt lý do trên, tên container Mongo cũng hardcode trùng giữa 2 project (bypass qua project-prefix mặc định của Compose) — gặp lỗi thật `Conflict: container name already in use` trước khi phát hiện ra và sửa.

**3 file MỚI, gitignored (không có trong git, phải tự tạo lại nếu chạy trên máy khác)** — xem mẫu giá trị đã dùng trong chính các file này:
- `WebApp/Backend/.env`: `MONGODB_URI` trỏ `ktv_db` (dùng credentials `root`/`example` đã hardcode sẵn trong `docker-compose.yaml`, không phải secret mới), `JWT_SECRET` sinh ngẫu nhiên dev-only, `CLIENT_URL`/`FRONTEND_URL=http://localhost:6869`, `FIREBASE_KEY_PATH=./serviceAccountKey.json`. `EMAIL_*`/`AWS_*`/`S3_BUCKET_NAME` để TRỐNG — các tính năng liên quan (quên mật khẩu, upload ảnh) sẽ lỗi thật nếu gọi, chấp nhận được cho preview local.
- `WebApp/Frontend/.env`: `REACT_APP_BASE_API=/api` — **CRA (react-scripts) đọc trực tiếp file `.env` lúc `npm run build` (bake vào bundle tĩnh)**, khác hẳn TK-HATU (Vite cần `ARG`/`ENV` riêng trong Dockerfile vì Vite KHÔNG tự đọc `.env` qua `docker-compose env_file`) — ở đây không cần sửa `Frontend/Dockerfile` gì cả, chỉ cần file `.env` có mặt trong build context TRƯỚC lúc `docker build`. Đã verify: bundle JS thật chứa đúng `baseURL:"/api"` (không hardcode `localhost:8080` — cổng đó bị `ai-software-factory-gateway` chiếm).
- `WebApp/Backend/serviceAccountKey.json`: **placeholder**, không phải key Firebase thật — 1 cặp khoá RSA 2048-bit tự sinh (không gắn với project Firebase nào, `openssl genrsa`) đặt vào đúng cấu trúc JSON service-account. Lý do cần: `config/firebase.js` gọi `require(serviceAccountPath)` **ngay lúc module được load** (không lazy), và `utils/sendNotification.js` được `require` tĩnh ở đầu `routes/order.routes.js` — nghĩa là backend **sẽ crash ngay lúc boot** (`TypeError`/`Cannot find module`) nếu thiếu file này, dù không route nào thật sự gọi tính năng push notification. Đây là điểm khác với suy đoán cũ ở TK-HATU ("Firebase lazy-import, không cần để server boot") — đã verify SAI cho chính codebase này bằng cách đọc chain `require` thật, không suy đoán lại.

**Race lúc khởi động (giống hệt TK-HATU, không phải lỗi mới):** MongoDB container mới tạo cần ~35-40s để WiredTiger mở xong trước khi lắng nghe port — lần connect đầu tiên của backend (`data-seeder/seed.js`) bị `ECONNREFUSED`, nhưng `config/db.config.js` có sẵn cơ chế retry (5 lần, cách nhau 5s) nên tự phục hồi, không cần can thiệp. Log thật: attempt 1 fail → attempt 2 (10s sau) connect thành công → `✅ Admin user created` + `✅ Device types seeded`.

**Đã verify sống (không chỉ container "Up"):**
- `curl http://localhost:6869/` → HTTP 200.
- `curl -X POST http://localhost:6869/api/auth/login -d '{"username":"admin","password":"123456"}'` → HTTP 200, JWT thật.
- `docker exec ... grep baseURL` trên bundle JS thật → xác nhận `/api` đúng như đã set trong `Frontend/.env`.

**Giới hạn đã biết, KHÔNG hoạt động thật trong preview này** (thiếu credential thật, chấp nhận được — không phải bug cần sửa):
- Firebase push notification (dùng key placeholder, không xác thực được với Firebase thật).
- SMTP/email (quên mật khẩu...) — `EMAIL_*` để trống.
- AWS S3 upload ảnh/file — `AWS_*` để trống.
- Socket.IO/realtime — giống đúng vấn đề đã ghi ở TK-HATU (`REACT_APP_SOCKET_API` không set, fallback cứng `ws://localhost:8080` sai). Sửa cần đổi `socketService.ts` dùng `window.location.origin` — là thay đổi code nghiệp vụ, chưa được yêu cầu riêng.

**Việc cần làm nếu máy khác muốn chạy lại preview:** tự tạo lại 3 file gitignored ở trên (không có trong git) — có thể copy đúng cấu trúc/giá trị dev-only đã ghi lại tại đây, KHÔNG cần xin lại credential thật trừ khi muốn Firebase/Email/S3 hoạt động thật.

## Đã build (xem `docker images`)
- `ktv_ecotel_backend_img:latest`, `ktv_ecotel_frontend_img:latest`, `ktv_reverse_proxy_img:latest` — rebuild lại 2026-08-25 (image cũ trước sự cố đĩa đã mất theo Docker Desktop cũ).
- `dieuphoimm-backend-baseline:latest` — dùng riêng cho bước BUILD/TEST trong pipeline (không phải image chạy PREVIEW).

## Sự cố 2026-08-24: ổ C: hết sạch dung lượng (0 byte trống)
Phát hiện giữa lúc chuẩn bị chạy PREVIEW (`docker compose up`). Đã dừng lại đúng lúc — **không** chạy compose up, không đụng tới volume/DB nào của project này. Nguyên nhân do cache/image Docker tích luỹ nhiều (xem `docker system df`: build cache 16.5GB, 7.1GB reclaimable; images 17.68GB, 3.4GB reclaimable) cộng dồn từ nhiều project khác nhau trên máy, không riêng DIEU-PHOI-MM.

## Quyết định của user: nâng cấp ổ cứng — ĐÃ XONG (2026-08-24)
Backup + nâng cấp ổ đĩa + cài lại Docker Desktop + restore đã hoàn tất trong cùng ngày — xem memory `project_disk_upgrade_backup_2026_08` và `docs/PROJECT_STATE.md` mục 2 ở gốc factory. Core factory + GIAO-CA + TK-HATU đã verify sống lại đúng. Riêng DIEU-PHOI-MM: không có volume MongoDB nào cần restore (PREVIEW chưa từng chạy, xem mục dưới), 3 image build trước sự cố đã mất theo Docker Desktop cũ — cần rebuild lại (không cần backup vì rebuild được từ source).

**Cập nhật 2026-08-25 — đã xong hết:** rebuild 3 image + tạo `.env`×2/`serviceAccountKey.json` + chạy PREVIEW thật, xem mục "PREVIEW chạy thật" ở trên. Việc còn lại duy nhất: GIT_PUSH (push nhánh `dev-dieuphoi-mm` lên remote) rồi APPROVAL — cần người dùng quyết định, không tự động hoá.

## CODE/TEST đã cập nhật (2026-08-24) — bản ghi cũ ở trên từng lệch với DB thật

Trước đoạn này, file từng ghi CODE = PASSED (chỉ đúng ở bước onboarding, phát hiện lỗi nhưng không sửa) và TEST = FAILED (0 test file). Giữa 2 lần đó đã xảy ra thêm nhiều việc, **đã ghi đầy đủ trong `docs/TECHNICAL_DEBT.md`** (mục 1/5/7 + "Bài học thật khi dùng apply_code"):

- **3/3 lần thử `apply_code` qua MiMO đều KHÔNG dùng được nguyên trạng**: task #135 (sửa 1 dòng `ROLES`) viết lại toàn bộ `config.js`, phá huỷ nhiều export đang dùng thật — đã `revert` (`ae4fa70`); task #136 (thêm `verifyToken` vào `upload.routes.js`) tự ý đổi sai 1 đường dẫn `require()`, sẽ crash server thật lúc boot — build/test không bắt được, chỉ phát hiện bằng `require()` trực tiếp; task #137 (2 fix 1 dòng `device.routes.js`) từ chối vì cơ chế `apply_code` bắt buộc ghi lại TOÀN BỘ 1174 dòng file gốc.
- Cả 3 bug đã phát hiện (ROLES sai, thiếu auth `upload.routes.js`, 2 bug logic `device.routes.js`) **đã được sửa TAY trực tiếp** (không qua `apply_code`), verify độc lập bằng `require()` module trong container — không chỉ tin build/test PASS. Commit: `623ab24`/`d7091e2`/`ca9b31e`.
- Commit `623ab24` kèm luôn **test baseline đầu tiên của dự án** (`WebApp/Backend/tests/config.test.js`) — re-verify thật 2026-08-24 (sau khi cài lại Docker Desktop, xem sự cố đĩa bên dưới): `npm test` PASS 2/2. Đây là lý do TEST đổi từ FAILED sang PASSED.
- **Phát hiện thêm, đã sửa 2026-08-24 (không phải lỗi DIEU-PHOI-MM, mà bug thật của chính pipeline-worker):** task #137 fail vì `pipeline-worker` trích `@path` bằng regex nuốt luôn dấu phẩy ngay sau path (`@WebApp/Backend/routes/device.routes.js,` → không khớp file thật), khiến model nhận `file_context` rỗng. Đã sửa + deploy vào `pipeline-worker` (xem `docs/INCIDENTS.md` mục 19 ở gốc factory) — nhưng **không cần dùng lại `apply_code` cho 2 bug `device.routes.js` này** vì đã sửa tay xong từ trước rồi (commit `ca9b31e`).
- `automation.allow_apply_code` hiện **ĐANG BẬT** trong `project.yaml` (bật 2026-08-24 sau khi có test baseline đầu tiên) — khác với ghi chú "TẮT" cũ ở mục dưới, đã sửa lại.

**Bài học cho project này:** nguồn đáng tin cho trạng thái pipeline luôn là `GET /api/projects/{id}` (DB thật), không phải file `.factory/pipeline.json`/`context.md` cục bộ — 2 file này chỉ đáng tin nếu được cập nhật đều sau MỌI task agent chạy trên project, không chỉ sau bước onboarding thủ công. Với file lớn/nhiều export không liên quan tới chỗ cần sửa, cân nhắc sửa tay trực tiếp ngay từ đầu nếu fix chỉ 1-2 dòng và đã biết rõ nội dung — nhanh hơn chờ `apply_code` thất bại rồi mới sửa tay (xem thêm `docs/TECHNICAL_DEBT.md`).

## Lưu ý khác đang có hiệu lực
- `automation.allow_apply_code` đang **BẬT** trong `project.yaml` (từ 2026-08-24, sau khi có test baseline đầu tiên) — xem mục "CODE/TEST đã cập nhật" ở trên.
- Không bao giờ push `main`/`develop` của repo `EcoTel-QL-Lenh-SX` — có CI/CD thật tự deploy VPS.
- Bug `ROLES` trong `config.js`, thiếu auth ở `upload.routes.js`, 2 bug logic ở `device.routes.js` — cả 3 **đã sửa xong** (commit `623ab24`/`d7091e2`/`ca9b31e`, xem `docs/TECHNICAL_DEBT.md`).

## Factory — Worktree Claude/Codex (retrofit 2026-08-29)

Project onboard trước khi Factory có Project Registry + Worktree Manager
(Phase 3-6) — bổ sung sau để dùng được luồng Claude Code / Codex Desktop
Review chuẩn:

- Tạo mới nhánh `dev` = alias trỏ đúng commit hiện tại của `dev-dieuphoi-mm`
  (nhánh làm việc thật, KHÔNG đổi tên/không đụng `dev-dieuphoi-mm`). Từ `dev`
  tạo tiếp `claude-dev`/`codex-dev` (worktree mới, không liên quan
  `.claude/worktrees/default`+`claude/work` hay `.codex/worktrees/default`
  +`codex/review` cũ — 2 worktree cũ đó vẫn còn, không xoá, không có commit
  nào chưa merge nên an toàn để lại).
- Worktree Claude: `.factory/worktrees/claude-dev`. Worktree Codex:
  `.factory/worktrees/codex-dev`.
- **Tuyệt đối không đụng `main`/`develop`** — 2 nhánh này có CI/CD thật tự
  deploy VPS (đã ghi rõ ở trên và trong `CLAUDE.md`), không liên quan gì tới
  việc tạo `dev`/`claude-dev`/`codex-dev` ở đây.

## Cập nhật 2026-09-29 — Fix iframe bị chặn (Portal) + đồng bộ danh mục thiết bị từ QL-TAISAN (nhánh `dev-dieuphoi-mm`)

Bắt nguồn từ phiên làm việc PORTAL-PM: mở app này trong khung iframe của
Portal bị trắng, console báo `X-Frame-Options 'sameorigin'`.

- **Fix iframe**: `WebApp/reverse_proxy/nginx_release.conf` (domain thật
  `dieuhanhquanlythietbitcs.vn`) — thay `X-Frame-Options: SAMEORIGIN` bằng
  `Content-Security-Policy: frame-ancestors 'self' http://118.70.151.69:1200
  http://118.70.151.69:1201 http://118.70.151.69:50008` (đúng 3 origin Portal
  đang tồn tại lúc sửa — cập nhật lại nếu Portal đổi domain/cổng thật). File
  `nginx_staging.conf` KHÔNG có `X-Frame-Options` sẵn nên không cần sửa.
  **CHƯA deploy lên domain thật** — mình không có quyền build/redeploy hạ
  tầng riêng của DIEU-PHOI-MM, cần đội này tự rebuild + đưa lên.
  Bị chính Claude Code chặn 1 lần lúc sửa (phân loại "Security Weaken" — nới
  lỏng chống clickjacking, đúng đắn dù đã thu hẹp đúng origin) — chủ dự án tự
  cấp quyền Bash mới sửa được.

- **Đồng bộ danh mục thiết bị từ QL-TAISAN** (QL-TAISAN là nguồn gốc, xem
  context.md bên đó mục 9): thêm `services/taiSanSync.js` gọi
  `GET {TAISAN_API_BASE_URL}/api/taisan?idcongty=...` kèm header
  `X-Service-Key` (service-to-service, không qua user Portal nào), upsert vào
  `models/Device.js` khớp theo field mới `externalTaiSanId` (tránh nhân đôi
  bản ghi khi chạy lại). **Chỉ đồng bộ phần "gốc"** (tên, mã/biển số, loại
  qua `models/DeviceType.js` field mới `externalNhomTaiSanId`, công suất) —
  **KHÔNG đụng phần vận hành** Điều phối tự quản (`status`, `coordinates`
  GPS, `files` đính kèm) — đúng quyết định chủ dự án đã chốt (khác với
  THONGKE-CAOSON chọn thay thế hoàn toàn). Kích hoạt thủ công qua
  `POST /api/devices/sync-from-taisan` (admin-only, giống nút "Đồng bộ từ
  manifest" bên Portal — không chạy nền tự động).
  Cần cấu hình `.env` (đã thêm placeholder rỗng, giá trị thật xin từ đội
  QL-TAISAN): `TAISAN_API_BASE_URL`, `TAISAN_SERVICE_KEY`, `TAISAN_ID_CONG_TY`.
  **Verify**: `node --check` qua container cho cả 4 file — cú pháp hợp lệ.
  **CHƯA verify runtime thật** (chưa có `TAISAN_SERVICE_KEY` thật để gọi thử
  cuối-đến-cuối) — cần làm khi QL-TAISAN cấp key thật.

**Việc còn lại, chưa làm**:
- Đội DIEU-PHOI-MM tự rebuild + deploy lại `nginx_release.conf` lên domain
  thật để fix iframe có hiệu lực.
- Xin `SERVICE_KEY_DPMM` thật từ đội QL-TAISAN, điền vào `.env`, gọi thử
  `POST /api/devices/sync-from-taisan` để verify end-to-end thật.
- Chưa thêm nút "Đồng bộ từ Tài sản" ở giao diện Frontend (mới chỉ có API) —
  hiện phải gọi API tay hoặc Postman.
