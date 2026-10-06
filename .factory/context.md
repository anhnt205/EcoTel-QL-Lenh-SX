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

## Build frontend preview trên máy dùng chung (2026-10-06) — đọc trước khi build lại

Preview chạy lại thành công tại **http://localhost:6869** (`admin`/`123456`), nhưng KHÔNG build bằng `docker compose up --build` được nữa: `npm run build` (webpack CRA) cần **>3 GiB RAM**, Docker VM chỉ có ~7,6 GiB và các project khác đã chiếm 3–5 GiB → từng làm Docker Desktop sập 2 lần (2026-10-01), 1 lần bị OOM-kill ở trần 3 GB (2026-10-06). Cách đang dùng (chỉ file cục bộ, không commit):
- Build frontend trong 1 container tạm có trần RAM/CPU: `docker run -d --name dieuphoimm-fe-build --cpuset-cpus=0-2 --memory=4608m --memory-swap=4608m -e NODE_OPTIONS=--max-old-space-size=3072 -e DISABLE_ESLINT_PLUGIN=true -v <Frontend>:/src:ro -v dieuphoimm_npm_cache:/root/.npm -v dieuphoimm_fe_dist:/dist node:18 sh -c 'cp -r /src/. /work; cd /work; npm i; npm run build; cp -r build/. /dist/'` — kết quả nằm trong volume `dieuphoimm_fe_dist`; **bắt buộc giữ khoá chung Redis** (CLAUDE.md gốc, mục Docker resource discipline) và kiểm `index.html` có trong dist trước khi bật nginx. ~13 phút lúc máy ít tải.
- `WebApp/docker-compose.local-preview.yaml` (untracked): frontend dùng `nginx:alpine` + volume dist + `.nginx/nginx.conf` của repo thay vì build bằng Dockerfile; đổi tag image sang `dieuphoimm_*_img` (tên gốc `ktv_*_img` trùng TK-HATU, build sẽ đè image của họ); frontend + proxy dùng chung `webapp_backnet` vì Docker báo `all predefined address pools have been fully subnetted` (hết dải mạng mặc định, không tạo thêm được `webapp_frontnet`).
- `Frontend/.env` (gitignored) thêm `GENERATE_SOURCEMAP=false` để bớt RAM.
- Bẫy khi viết script theo dõi: `docker ps`/`docker inspect` thỉnh thoảng trả 500 khi Docker căng RAM — coi lỗi API là "chưa biết", không phải "container đã xong"; và đừng pipe `npm run build | tail` (che mất lỗi build).
- Cổng/giới hạn không đổi so với mục "PREVIEW chạy thật" ở trên (Firebase/SMTP/S3/Socket.IO chưa hoạt động; TAISAN_* chưa cấu hình).

## Thiết kế lại giao diện Báo cáo + Tổng quan (2026-10-06, ĐÃ commit lên dev-dieuphoi-mm, chưa push)

Yêu cầu của người dùng: màn **Báo cáo** theo ảnh mẫu "Trung tâm báo cáo" (danh sách bên trái có ẩn/hiện + tìm kiếm, bên phải bộ lọc + xem trước); màn **Tổng quan** gọn, ít khoảng trống, vẫn thấy lượng xe mỗi đơn vị và trạng thái từng xe. **Lệnh sản xuất** làm lại theo ảnh mẫu của người dùng (xem mục cuối); **Danh mục** giữ nguyên (người dùng bảo "gom lại như hiện tại") — menu Danh mục không đổi.

- **Báo cáo** (`pages/reports/Reports.tsx`): chỉ đổi bố cục JSX; khối logic (state, mutation `reportView`/`reportExcel`, `reportsMap`) giữ NGUYÊN từng byte (đã diff). File mới: `ReportListPanel.tsx` (danh sách đánh số 01–20, tìm không dấu, nút ẩn), `reportOrder.ts` (+test đảm bảo đủ 20 biểu mẫu), `utils/exportCsv.ts` (+test; CSV dấu `;` + BOM, trải colSpan/rowSpan, từ chối xuất nếu DataGrid bị ảo hoá thiếu cột/dòng), `utils/printElement.ts`, `theme/uiTheme.ts`. Giữ cả "Thêm chữ ký" và "Excel" (backend) dù ảnh mẫu không có. Thứ tự danh sách = thứ tự `ReportEnum` (khớp số trong ảnh mẫu, Báo cáo chuyến = 13). Preview chỉ hiện sau khi tải thành công (bản cũ hiện khung trống cả khi lỗi).
- **Tổng quan** (`pages/dashboard/*`): thẻ số liệu 1 hàng; "Thiết bị theo đơn vị" có 2 chế độ **Thẻ** (mỗi đơn vị: tổng, thanh tỉ lệ, số theo trạng thái, theo loại, từng xe là 1 ô màu theo trạng thái, `title` hiện người vận hành/ghi chú) và **Bảng** (bảng cũ làm gọn); Lệnh sản xuất + Sản lượng xếp cột phải trên màn ≥1200px. Chỉ restyle, không đổi query/logic. Component dùng chung đã đổi nhẹ: `RealTimeClock` (prop `compact`), `PieChartOrder`/`LineChartProduction` (giảm chiều cao) — chỉ dashboard dùng.
- **Đã verify**: `tsc --noEmit` sạch; 8/8 unit test pass (trong container); build production OK; trên http://localhost:6869 bằng trình duyệt thật: Tổng quan (thẻ + bảng + popover chi tiết), Báo cáo (chọn biểu mẫu, bộ lọc đúng theo từng loại, Xem báo cáo, ẩn/hiện danh sách, CSV xuất đúng nội dung bảng thật). **CHƯA verify**: nút In / PDF (hộp thoại in), CSV với biểu mẫu dùng DataGrid (chỉ có unit test), các biểu mẫu cần chọn Ca (DB preview chưa có ca nào).
- **Lỗi có sẵn của backend (không do thay đổi này)**: với tài khoản ADMIN, nhiều endpoint `/api/exports/*/view` (vd `carTripReportByDay`, `export.routes.js` ~dòng 10747) làm `new ObjectId(department)` → **500 `BSONError`** nếu chưa chọn "Chọn đơn vị". Chỉ ghi nhận (quy tắc 9), chưa sửa.
- **Dữ liệu MẪU trong DB preview** (để xem giao diện): 6 đơn vị mã `DEMO-*` + ~63 thiết bị có `name: "DEMO"`. Xoá: `docker exec -i dieuphoimm_mongo_db mongosh -u root -p example --authenticationDatabase admin dieuphoimm --eval 'db.devices.deleteMany({name:"DEMO"}); db.departments.deleteMany({code:/^DEMO-/})'`. (Đã thêm 24 lệnh mẫu — xem mục Lệnh sản xuất bên dưới; Sản lượng vẫn 0 vì chưa có báo công/chuyến.)
- Còn lại: Header (banner logo ~230px, dùng chung mọi trang) là nguồn khoảng trống lớn nhất của Tổng quan, chưa đụng vì ngoài phạm vi.
- Công thức build cập nhật: trần 4,2–4,5 GB RAM; build lần này mất ~35 phút do máy chỉ còn <500 MB trống — nên tắt bớt container project khác trước (xem mục "Build frontend preview" ở trên).

## Nút mở rộng toàn màn hình + Lệnh sản xuất làm lại theo ảnh mẫu (2026-10-06, ĐÃ commit lên dev-dieuphoi-mm, chưa push)

- **Lệnh sản xuất — lịch sử**: lần 1 tôi tự nghĩ bố cục → người dùng bác ("xấu quá, trả lại như cũ", đã `git checkout`). Lần 2 người dùng đưa ảnh mẫu → làm lại bám ảnh mẫu (`pages/orders/Orders.tsx` + `orderStatus.tsx` + `OrderDetailPanel.tsx`; preview :6869 bundle `main.ac43b5d1.js`, đã xác nhận trên trình duyệt). Logic cũ (state, truy vấn `/orders`, mutation, hàm xử lý, form `OrderForm*`, hộp thoại `OrderHistories`/`ShiftReport`) giữ NGUYÊN các dải mã gốc; chỉ thay import, cột và JSX. **Chưa được người dùng duyệt lần 2** — nếu họ chê, hoàn tác bằng `git checkout -- WebApp/Frontend/src/pages/orders/Orders.tsx` + xoá 2 file mới + bỏ `uiSansTheme` trong `theme/uiTheme.ts` (không bắt buộc).
- **Bố cục theo ảnh mẫu**: tiêu đề "Lệnh sản xuất" + phụ đề, 3 nút (Lịch sử / Xuất Excel / Tạo lệnh); thẻ bộ lọc: nút trạng thái có số đếm (Tất cả/Chưa nhận/Đã nhận/Lỗi/Đã kết thúc/Đã hủy), ô tìm kiếm, "Tất cả đơn vị" (chỉ admin), khoảng ngày (popover: Hôm nay/Hôm qua/7 ngày qua/Tháng này + 2 ô ngày), "Lọc nâng cao" (popover 7 trường → tham số lọc máy chủ có sẵn assignedTo/salaryCode/createdBy/shift/job/device/material), nút đặt lại; thẻ bảng "Danh sách lệnh" + số lệnh + Tải lại/Cột/Mật độ/"⋯"; ô 2 dòng (tên/số thẻ, ngày/ca, thiết bị/thiết bị sửa, vật liệu/điểm đổ, người ra lệnh/tạo lúc); chân bảng: "Đã chọn N lệnh · Bỏ chọn · Xóa" + Số dòng/trang + "1 – 20 / 24 lệnh" + nút trang.
- **Khác bản gốc (cần biết)**: (1) nút "⋯" mỗi dòng gộp 4 cột Xem báo công/Sửa/Hủy/Chuyển ca (+ "Xem chi tiết"), quy tắc bật/tắt giữ nguyên; (2) nhãn trạng thái THỐNG NHẤT theo ảnh mẫu ở cả bộ lọc/bảng/chi tiết (Chưa nhận, Đã nhận, Lỗi, Đã kết thúc, Đã hủy) — bản cũ có 3 cách gọi khác nhau; màu: Đã nhận xanh dương, Đã kết thúc xanh lá, Đã hủy tím (bản cũ: xanh lá/đỏ/tím); (3) bộ lọc cột của DataGrid được thay bằng "Lọc nâng cao" tự viết; "Cột" bật/tắt cột dùng lại code chết cũ (`visibleColumns`) và đã sửa id `content`→`workContent` nên cột "Nội dung lệnh" nay hiện; (4) đổi bộ lọc/tìm kiếm/trạng thái → về trang 1; (5) "Lịch sử"/"Xuất Excel" bấm khi chưa chọn → báo lỗi (như cũ); "Chi tiết lệnh" + "Xuất danh sách lệnh đã chọn" + "Xuất cung độ" (admin) nằm trong menu "⋯" của thẻ bảng; (6) khoảng ngày mặc định để TRỐNG (Tất cả thời gian) — ảnh mẫu hiện 01/10–06/10 nhưng đặt mặc định theo tháng sẽ ẩn lệnh cũ, chưa quyết; (7) ô tìm kiếm (`q`) backend chỉ tìm tên/số thẻ/công việc, KHÔNG tìm thiết bị (thiết bị nằm ở Lọc nâng cao) nên placeholder ghi "công việc" khác ảnh mẫu; (8) phông không chân qua `uiSansTheme` (mới, trong `theme/uiTheme.ts`) — vì theme gốc cố định Times New Roman cho TỪNG kiểu chữ nên `uiTheme` cũ KHÔNG đổi được phông (Tổng quan/Báo cáo vẫn hiển thị Times); form và hộp thoại trong trang được bọc lại bằng `appTheme` để giữ nguyên.
- **KHÔNG làm**: Header chung (`layout/Header.tsx`) — ảnh mẫu có thanh đầu trang gọn (nền xanh đậm + chuông + tài khoản + hàng tab trắng) khác banner 230px hiện tại; đây là thành phần dùng cho mọi trang nên chưa đụng, hỏi người dùng. `DispatcherOrders.tsx` (điều độ viên) giữ giao diện cũ.
- **Đã verify** (dev server + trình duyệt thật, admin, 24 lệnh mẫu; sau đó build production và xác nhận lại bố cục trên :6869): lọc 5 trạng thái (8/2/6/…/24), khoảng ngày (Hôm qua→10 dòng), Lọc nâng cao (lọc 3 dòng, hiện "(1)", giữ giá trị, xoá), tìm kiếm + về trang 1, phân trang tuỳ biến (20/trang → 20+4, nút trang, trang sau tắt ở trang cuối), đặt lại, menu "⋯" từng dòng (đúng bật/tắt theo trạng thái), Xem chi tiết, Sửa (form điền sẵn), Chuyển ca/Hủy lệnh (hộp thoại xác nhận, bấm Hủy), Xem báo công, Tạo lệnh, chọn dòng → chân bảng, Xóa (xác nhận, bấm Hủy), Lịch sử, Cột/Mật độ/"⋯" của bảng; `tsc` sạch (webpack dev), ESLint chỉ còn 1 cảnh báo `useMemo` có sẵn. **CHƯA verify**: bấm thật các nút xuất file (Xuất Excel, Xuất danh sách lệnh, Xuất cung độ); gửi form Tạo/Sửa/Chuyển ca và Xóa/Hủy lệnh thật; vai trò manager (không thấy ô đơn vị) và employee; màn < 1200px; hiệu năng nhiều lệnh.

- **Mở rộng toàn màn hình** (GIỮ, người dùng yêu cầu): `components/ExpandablePanel.tsx` (render-prop, `position: fixed` zIndex 1250 — không dùng Fullscreen API vì popover/dropdown MUI ở zIndex 1300 sẽ bị che; thẻ không remount nên state/biểu đồ giữ nguyên; Esc thu nhỏ, Esc đầu tiên khi đang mở popover/lịch chỉ đóng popover; khoá cuộn trang khi mở). Bọc 3 thẻ `DeviceAnalysis`, `OrderAnalysic`, `ProductionAnalysic`; nút ghim tuyệt đối góc trên-phải thanh tiêu đề (tiêu đề có `pr: 5.5` + `position: sticky`). `PieChartOrder` thêm prop `scale`, `LineChartProduction` thêm prop `height` (mặc định như cũ; chỉ Tổng quan dùng).
- **Đã verify** (dev server + trình duyệt thật, admin, 24 lệnh mẫu): 3 thẻ mở rộng/thu nhỏ bằng nút và Esc, thẻ Thiết bị xếp 4 cột đủ 65 ô xe/máy, popover thiết bị hiện phía trên lớp phủ, Esc đầu chỉ đóng popover; `tsc --noEmit` sạch, ESLint 0 lỗi, jest 8/8. Sau khi hoàn tác Lệnh sản xuất: build production OK + xác nhận trên :6869. **CHƯA verify**: màn < 1200px; vai trò khác admin.
- **Build production (công thức mới)**: trần **5,5 GB** (`--memory=5632m --memory-swap=5632m`, `--max-old-space-size=3584`) + dùng lại volume `dieuphoimm_fe_node_modules` (bỏ bước cài gói) → ~2,5–3 phút khi máy ít tải. Trần 4,5 GB đã bị OOM-kill (`oom=true`, chưa ghi vào volume nên preview không hỏng). Vẫn phải giữ khoá Redis chung và chỉ chép vào `dieuphoimm_fe_dist` khi build thành công.
- **Bài học dev server tạm** (đã dọn container): (a) CRA `start` trong container nền cần `CI=true` nếu không tự thoát khi stdin đóng ("process exited too early"); (b) webpack watch cộng dồn RAM mỗi lần biên dịch lại — OOM-kill ở trần 2,5 và 3,5 GB, ổn ở 4,5 GB (`--max-old-space-size=3600`); (c) gọi chéo origin :3100 → :6869 bị CORS vì backend VÀ nginx cùng gắn `Access-Control-Allow-Origin` ("`*, *`") — dùng `REACT_APP_BASE_API=/api` + thêm `proxy` vào BẢN COPY `package.json` trong container; (d) volume `dieuphoimm_fe_node_modules` (1.627 gói) được giữ lại để chạy `tsc`/ESLint/jest bằng `docker run` trong ~30 giây.
- **Dữ liệu MẪU trong DB preview** (để xem giao diện): ngoài thiết bị/đơn vị `DEMO-*` ở mục trên còn 24 lệnh + 3 ca + 4 công việc + 2 vật liệu + 2 điểm đổ + 8 nhân viên `demo.nv1..8`, tất cả có `_demo: true`. Xoá: `docker exec -i dieuphoimm_mongo_db mongosh -u root -p example --authenticationDatabase admin dieuphoimm --eval '["orders","users","jobs","shifts","materials","locations"].forEach(c => db[c].deleteMany({_demo:true}))'`.

## Header gọn + Lệnh sản xuất của điều độ viên + commit (2026-10-06)

- **Đã commit** lên nhánh `dev-dieuphoi-mm` (KHÔNG push; `main`/`develop` có CI/CD tự deploy nên không bao giờ push thẳng): `6fa2f70` Báo cáo (+ `theme/uiTheme.ts`), `e2cf441` Tổng quan + nút mở rộng, `31a8524` Lệnh sản xuất (admin/manager), `15d7815` Header, `1ca6fea` Lệnh sản xuất điều độ viên (+ `orders/DateRangeFilter.tsx`). Hoàn tác riêng từng tính năng bằng `git revert <sha>`. Các mục KHÔNG phải của đợt này, còn lại chưa commit, đừng đụng: `docs/TECHNICAL_DEBT.md` (mục 12 portal-manifest, từ 2026-08-25), `.claude/`, `.codex/`, `WebApp/Frontend/public/.well-known/`, `WebApp/docker-compose.local-preview.yaml` (hạ tầng preview cục bộ), `.factory/worktrees/`.
- **Header** (`layout/Header.tsx`, dùng cho MỌI trang): thay banner ~230px bằng thanh xanh đậm (logo, "ĐIỀU PHỐI MÁY MÓC THIẾT BỊ", chuông chấm đỏ khi có thông báo chưa đọc, tên tài khoản + menu) và hàng tab trắng (tab đang chọn nền xanh nhạt + gạch chân xanh; "Danh mục" sáng lên khi đang ở trang con). Toàn bộ header `position: sticky` (cao ~106px; trước chỉ thanh menu 64px dính). Logic giữ nguyên: phân quyền từng tab, menu Danh mục + menu con, ngăn kéo màn hẹp (<1200px), thông báo, hồ sơ, đổi mật khẩu, đăng xuất; 2 hộp thoại hồ sơ/đổi mật khẩu bọc lại bằng `appTheme` để giữ phông cũ. Bỏ dòng "Điện thoại/Fax" khỏi header (còn là tooltip khi rê chuột vào tên hệ thống). Tiêu đề rút gọn theo ảnh mẫu (tên đầy đủ "HỆ THỐNG QUẢN LÝ ĐIỀU PHỐI VÀ SỬ DỤNG MÁY MÓC THIẾT BỊ" vẫn ở trang đăng nhập).
- **Lệnh sản xuất điều độ viên** (`pages/dispatcherOrder/DispatcherOrders.tsx`, role `dispatcher`): cùng ngôn ngữ thiết kế với màn admin. Giữ nguyên logic gom theo lô (`batchId`): mở/thu lô, chọn cả lô, Sửa/Sao chép/Hủy cả lô, phân trang theo lô, lọc nhân viên/đơn vị/khoảng ngày qua máy chủ (`/orders`), form `DispatcherOrderForm*`. Thêm: tìm nhanh phía client (người nhận, số thẻ, công việc, nội dung, mã lô), "Mở tất cả lô / Thu gọn tất cả lô" (mặc định các lô vẫn THU GỌN như bản cũ), nút "⋯" mỗi dòng (Xem chi tiết / Sửa / Sao chép / Hủy lệnh); chọn-tất-cả chỉ chọn lệnh đang hiển thị (bản cũ chọn cả lệnh bị bộ lọc ẩn). Dùng chung `orders/orderStatus.tsx`, `orders/OrderDetailPanel.tsx`, `orders/DateRangeFilter.tsx`.
- **Đã verify** (dev server + trình duyệt thật): Header (menu Danh mục + menu con, hộp tài khoản, ngăn kéo màn hẹp); sau đó build production và xem lại Tổng quan, Báo cáo, Header trên :6869. Điều độ viên: 4 lô (Không có lô / LO-0510-C / LO-0610-B / LO-0610-A), mở lô, mở tất cả lô, lọc trạng thái, tìm kiếm, Hôm qua → 10 lệnh, ẩn/hiện cột, menu "⋯" (đúng bật/tắt theo trạng thái), Xem chi tiết, Sửa lệnh, Sửa lô, Sao chép lô, Hủy lô và Xóa (hộp thoại xác nhận, bấm Hủy), chọn cả lô → "Đã chọn 6 lệnh", Lịch sử, phân trang theo lô. ESLint chỉ còn 1 cảnh báo `useMemo` có sẵn ở Orders.tsx. **CHƯA verify**: màn điều độ viên trên bản production :6869 (chỉ thử trên dev server); bấm thật các nút xuất Excel; gửi form thật; vai trò manager (tab "Công việc của tôi") và employee; hàng nghìn lệnh/lô.
- **Tài khoản THỬ cho điều độ viên** (chỉ trong DB preview, `_demo: true`): `demo.dieudo` (đơn vị DEMO-VT3), dùng lại mã băm mật khẩu của tài khoản `admin` trong seed của dự án nên mật khẩu = mật khẩu seed của admin (xem `data-seeder/seed.js`). 18 lệnh mẫu được gán `batchId` LO-0610-A (8), LO-0610-B (6), LO-0510-C (4) và `createdBy` = tài khoản này (để điều độ viên thấy). Lệnh xoá dữ liệu mẫu ở mục trước (`deleteMany({_demo:true})` trên `users`, `orders`...) xoá luôn tài khoản này.
- **Việc còn lại / gợi ý**: push nhánh `dev-dieuphoi-mm` khi người dùng yêu cầu (KHÔNG `main`/`develop`); đưa các màn khác (Danh mục, Người dùng...) về cùng phong cách nếu muốn — hiện chúng vẫn phông Times và bố cục cũ nên nhìn khác Header/Lệnh sản xuất.

## Lệnh sản xuất: người dùng yêu cầu TRẢ VỀ BẢN BAN ĐẦU (lần 2, 2026-10-06)

- Sau khi xem bản thiết kế bám ảnh mẫu (admin + điều độ viên) người dùng nói "Thôi, trả lại trang lệnh sản xuất về như ban đầu". Đã `git revert` 2 commit `31a8524` (Orders) và `1ca6fea` (DispatcherOrders) → commit revert mới nhất trên nhánh `dev-dieuphoi-mm`. `Orders.tsx` và `DispatcherOrders.tsx` giống HỆT bản trước phiên (đã đối chiếu `git diff 9e00cee` trống); các file `orders/orderStatus.tsx`, `orders/OrderDetailPanel.tsx`, `orders/DateRangeFilter.tsx` đã bị gỡ (chỉ 2 thiết kế đó dùng). **Giữ nguyên**: Header mới (`15d7815`), Tổng quan + nút mở rộng (`e2cf441`), Báo cáo (`6fa2f70`, gồm `theme/uiTheme.ts` vì Header dùng `uiSansTheme`).
- Mục "Lệnh sản xuất làm lại theo ảnh mẫu" và mục "Lệnh sản xuất điều độ viên" ở trên chỉ còn là LỊCH SỬ — thiết kế đó nằm trong git (`git show 31a8524`, `git show 1ca6fea`) nếu cần lấy lại; muốn khôi phục: `git revert <sha của commit revert>`. Bài học: người dùng đã bác 2 lần (tự nghĩ → xấu; bám ảnh mẫu → cũng trả lại) — trước khi làm lại trang này, hỏi rõ họ muốn gì cụ thể (chọn điểm cần đổi) thay vì đổi cả trang.
- Tài khoản thử `demo.dieudo` + `batchId` gán cho 18 lệnh mẫu vẫn còn trong DB preview (không ảnh hưởng mã nguồn).

## Lệnh sản xuất: CHỐT cuối (2026-10-06) — admin = bản ban đầu, điều độ viên = thiết kế mới

- Người dùng chốt: màn **admin/quản lý** (`pages/orders/Orders.tsx`) giữ **bản ban đầu** (giống hệt trước phiên, `git diff 9e00cee` trống, không import `orderStatus`/`OrderDetailPanel`); màn **điều độ viên** (`pages/dispatcherOrder/DispatcherOrders.tsx`) dùng lại **thiết kế mới** (lấy lại từ `1ca6fea`) cùng 3 thành phần dùng chung `orders/DateRangeFilter.tsx`, `orders/orderStatus.tsx`, `orders/OrderDetailPanel.tsx` (lấy lại từ `31a8524`). Mô tả thiết kế điều độ viên ở mục "Header gọn + Lệnh sản xuất của điều độ viên" bên trên vẫn đúng. Hai mục "Lệnh sản xuất làm lại theo ảnh mẫu" (admin) và "trả về bản ban đầu" ở trên chỉ là lịch sử; trạng thái hiện tại là mục này.
- Hệ quả cần biết: hai vai trò thấy hai giao diện KHÁC nhau cho cùng trang `/orders` (admin: bản cũ phông Times; điều độ viên: bản mới phông không chân). Nhãn trạng thái ở màn điều độ viên là bản thống nhất mới (Chưa nhận/Đã nhận/Lỗi/Đã kết thúc/Đã hủy), màn admin vẫn các nhãn cũ.
- Cách dùng thử màn điều độ viên: đăng nhập `demo.dieudo` (mật khẩu = mật khẩu seed của admin) — xem mục tài khoản thử ở trên.

## Hệ thống > tab "Cấu hình giao diện" (2026-10-06, ĐÃ commit lên dev-dieuphoi-mm, chưa push)

Yêu cầu người dùng: trong trang Hệ thống thêm tab cho phép đổi **logo, tên phần mềm, tên công ty, màu chủ đạo**. Commit: `9173e7b` (backend), `25ad112` (frontend).

- **Backend** (cần BUILD LẠI image backend — đã làm cho preview): `models/AppSetting.js` (khoá-giá trị, key `branding`), `routes/setting.routes.js` gắn ở `/api/settings` trong `server.js`, `utils/branding.js` (kiểm tra + chuẩn hoá, có `tests/branding.test.js` 14 test jest; toàn bộ jest backend 16/16). API: `GET /api/settings/branding` **công khai** (trang đăng nhập cần; chỉ trả tên/công ty/màu + cờ `hasLogo` + `logoVersion`, KHÔNG trả nội dung logo), `GET /api/settings/branding/logo?v=<phiên bản>` (công khai, `Cache-Control: immutable` khi có `?v=`; SVG kèm CSP sandbox), `PUT`/`DELETE /api/settings/branding` **chỉ admin** (đã thử: không token 401, điều độ viên 403, dữ liệu sai 400). Logo lưu trong MongoDB dạng data URL (tối đa 1.000.000 ký tự; trình duyệt tự thu nhỏ ≤256px nên thường vài chục KB; chỉ nhận png/jpeg/webp/gif/svg). Chuỗi rỗng/`null` = về mặc định. Không dùng S3 (preview chưa có khoá AWS).
- **Frontend**: `branding/BrandingProvider.tsx` bọc App ở `index.tsx` (QueryClientProvider ngoài, BrandingProvider trong): lấy cấu hình (react-query khoá `["branding"]`, cache localStorage `branding_cache` để khỏi chớp), dựng theme MUI bằng `buildAppTheme(primary)` (theme/index.ts) + màu antd, đặt `document.title` và favicon; `useBranding()` cho logo/tên/công ty/màu; `brandAccent()`/`brandNavy()` giữ đúng màu đã duyệt (navy `#0f2a55`, xanh `#1d6ff2`) khi chưa tuỳ chỉnh, còn tuỳ chỉnh thì navy = màu chủ đạo làm đậm 60%. `pages/dashboard/BrandingSettings.tsx` (form + xem trước trực tiếp + Lưu/Hủy thay đổi/Khôi phục mặc định có xác nhận) trong `System.tsx` (tab "Giám sát hệ thống" giữ nguyên nội dung cũ). Áp dụng cho: Header, trang đăng nhập (logo/tên/thanh trên), màn điều độ viên, tiêu đề + biểu tượng tab trình duyệt, và mọi nút/tab/biểu đồ dùng `palette.primary` của MUI.
- **Thay đổi hạ tầng theme cần biết**: `uiTheme`, `uiSansTheme`, `appFontTheme` (theme/uiTheme.ts) nay là HÀM theo theme ngoài (ThemeProvider nhận dạng hàm) — nếu để là đối tượng cố định thì theme lồng nhau sẽ ĐÈ MẤT màu chủ đạo cấu hình. `Reports.tsx` vẫn dùng `appTheme` tĩnh cho vùng xem trước biểu mẫu in (cố ý: biểu mẫu in không theo màu).
- **KHÔNG áp dụng** (cố ý, nói rõ với người dùng): khoảng 20 biểu mẫu in báo cáo (`pages/reports/*`) có tiêu đề "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV" cứng theo mẫu giấy; `AssetEbookCover`; `public/index.html` (tiêu đề tĩnh, chỉ được ghi đè lúc chạy), `public/manifest.json`; một số màu cố định trong trang cũ (vd tiêu đề xanh "Lệnh sản xuất" của màn admin, thẻ Tổng quan). Logo mặc định vẫn là `/image/logo.png`.
- **Đã verify**: API bằng curl (các mã trên, logo trả đúng `Content-Type`/`Cache-Control`, DELETE về mặc định, logo chưa có → 404); giao diện (dev server + bản production :6869): tải từ máy chủ, nhập tên/công ty, chọn màu gợi ý, tải logo 600×300 → tự thu còn 256×128, xem trước trực tiếp, Lưu → Header đổi logo/tên/công ty/nền, tiêu đề + favicon tab đổi, tải lại trang vẫn giữ, trang đăng nhập (xoá cache, chưa đăng nhập) hiện đúng, màn điều độ viên đổi màu, ô sai (màu `#12`, tên >120 ký tự) báo lỗi + khoá Lưu, Hủy thay đổi, Khôi phục mặc định (trả logo/tên/màu/tiêu đề/favicon); ESLint sạch ở mọi file đã sửa. **CHƯA verify**: logo SVG/GIF/JPG thật (mới thử PNG), ảnh rất lớn/hỏng, hai admin sửa cùng lúc, trang Hệ thống ở màn hẹp, người dùng khác admin (không thấy mục Hệ thống nên không vào được tab).
- **Quy trình rebuild backend cho preview** (khi sửa backend): giữ khoá Redis chung; `cd WebApp && docker compose -f docker-compose.yaml -f docker-compose.local-preview.yaml build ktv_Backend_service`; chạy `npx jest` trong image (`docker run --rm --entrypoint sh dieuphoimm_backend_img -c "npx jest"`); `docker compose ... up -d --no-deps --no-build ktv_Backend_service`; rồi `docker restart webapp-ktv_reverse_proxy_service-1` (nginx giữ IP cũ của backend nên phải khởi động lại, nếu không /api trả 502). Lần này build + jest + thay container mất < 1 phút.
- Preview DB hiện đang ở cấu hình MẶC ĐỊNH (đã khôi phục sau khi thử).

## Chốt (freeze) thông tin lệnh khi hoàn thành (2026-10-06, ĐÃ commit lên dev-dieuphoi-mm, chưa push)

Yêu cầu người dùng: nhân viên A ở đơn vị X (T3–T9) sang T10 chuyển đơn vị Y, hoặc xe/thông tin khác đổi → các lệnh cũ KHÔNG được bị kéo sang đơn vị Y. Lệnh hoàn thành phải được "đóng băng"; thay đổi chỉ áp dụng cho lệnh từ lúc đổi trở đi.

- **Nguyên nhân gốc** (đã rà code): `Order` chỉ lưu id (ObjectId ref), mọi API đọc bằng `populate` → luôn ra dữ liệu HIỆN TẠI (người nhận, người tạo, trợ lý, công việc, ca, thiết bị, xe sửa chữa, máy xúc, địa điểm, vật liệu, đơn vị). Bảng điểm danh còn lấy danh sách nhân viên bằng `User.find({department})` → nhân viên đã chuyển biến mất khỏi đơn vị cũ cho cả tháng cũ.
- **Thiết kế**: khi lệnh sang `completed`, ghi `order.frozen = { at, source, data }` — `data` là bản chụp có cùng hình dạng với kết quả populate (≈1,5 KB/lệnh). Đọc ra qua lớp phủ `applyFrozen()` (chỉ thay các trường đã populate, id trần giữ nguyên; chỉ giữ những khoá mà truy vấn populate gốc trả về nên không lộ phone/chữ ký ở route xuất file; lệnh chưa chốt trả về NGUYÊN BẢN; `frozen.data` không đẩy ra API, thay bằng `frozenAt`, `frozenSource`). `frozen.source`: `completion` (chốt lúc hoàn thành) | `sweep` (cron bù) | `history` | `creation` | `user-history` | `backfill` (3 loại sau + `backfill` là khôi phục lệnh cũ).
- **File**: `models/Order.js` (trường `frozen` + index `{status, frozen.at}`), `services/orderSnapshot.js` (phần thuần: dựng/phủ bản chụp, phát hiện trường bị đổi — có `tests/orderSnapshot.test.js`), `services/orderFreeze.js` (`freezeOrder`, `backfillFrozen`, `sweepRecentlyCompleted`, `rebuildLegacySnapshot`; nạp tường minh các model để chạy độc lập), `utils/departmentAt.js` + `utils/roster.js` (danh sách điểm danh theo đơn vị tại thời điểm), `routes/order.routes.js`, `routes/export.routes.js` (bọc `Order` bằng Proxy, phủ sau `find().exec()`; chỉ bọc `find`), `utils/cron.js` (quét bù `*/10 * * * *`, 48 giờ gần nhất), `scripts/freeze-completed-orders.js`.
- **Thay đổi hành vi API** (`PUT /api/orders/:id`): lệnh đã chốt mà đổi người nhận/người tạo/trợ lý/công việc/ca/đơn vị/thiết bị/xe/máy xúc/địa điểm/vật liệu, đổi ngày làm việc/giờ ca/nội dung/mã lô/giờ bắt đầu-kết thúc, hoặc mở lại trạng thái → **409** (`message` "Lệnh đã hoàn thành và đã được chốt thông tin nên không thể thay đổi.", kèm `fields`). Gửi lại đúng giá trị cũ vẫn được (app mobile hay gửi cả form); ghi chú vẫn sửa được. Báo hoàn thành lại không đổi `endTime`, không nhả thiết bị lần nữa. Admin có thể ép sửa bằng `forceEditFrozen: true` → chỉ chụp lại đúng các khoá đã sửa, ghi `frozen.editedAt/editedBy`, ghi History (`forceEditedFrozen`, `forceEditedFields`). Frontend KHÔNG đổi (UI vốn đã khoá sửa lệnh hoàn thành; lỗi 409 hiện qua alert sẵn có).
- **Khôi phục lệnh cũ (đã hoàn thành trước khi có tính năng)**: `docker exec <backend> node scripts/freeze-completed-orders.js --dry-run` rồi chạy thật (bỏ `--dry-run`; có `--limit=N`). Thứ tự nguồn: bản chụp History lúc hoàn thành (`history`) > `order.department` làm đơn vị lúc tạo (`creation`) > đơn vị của người nhận tại ngày làm việc suy từ History đổi đơn vị của họ (`user-history`) > dữ liệu hiện tại (`backfill`, có thể đã lệch). **Xem `bySource` của lần `--dry-run` trước khi chạy thật trên production**; chạy lại được (duyệt theo `_id`, bỏ qua lệnh đã chốt).
- **Điểm danh** (`/exports/attendance` và `/attendance/view`): danh sách người = người có lệnh ở đơn vị đó trong tháng (theo tên đã chốt) + thành viên cuối tháng tính bằng `departmentAt` trên History đổi đơn vị.
- **Verify**: jest backend 35/35 (có test hồi quy đúng tình huống X→Y); kịch bản 21 bước trên API + MongoDB thật (preview): đổi đơn vị nhân viên → lệnh hoàn thành giữ đơn vị cũ, lệnh chưa hoàn thành theo đơn vị mới, điểm danh 09/2026 chỉ ở đơn vị cũ; hoàn thành lệnh → chốt `completion`; đổi tên công việc/mã xe sau đó không ảnh hưởng; 409 khi sửa/mở lại; gửi lại giá trị cũ OK; admin `forceEditFrozen` OK + có History; xuất file xlsx 200; 6 lệnh demo đã khôi phục (source `creation`). Danh sách `/api/orders` thật: 6/6 lệnh hoàn thành có `frozenAt`, không lộ `frozen`. (Bước B11 trượt khi chạy lặp chỉ vì History cộng dồn giữa các lần chạy — không phải lỗi mã.)
- **CHƯA làm / giới hạn** (nói rõ với người dùng): (1) `Report` cấp chuyến (mã/loại/model thiết bị, vật liệu, địa điểm trong báo cáo xuất) vẫn đọc dữ liệu sống — chưa chốt; (2) sản lượng `Report` do cron `"* 14 * * *"` (chạy mỗi phút 14:00–14:59) và trigger tính lại từ dữ liệu sống; (3) lệnh cũ không có History chỉ khôi phục được đơn vị lúc tạo, phần còn lại lấy từ dữ liệu hiện tại; (4) tiêu đề báo cáo vẫn `Department.findById` sống; (5) sửa Report/ShiftReport/CheckIn sau khi hoàn thành chưa bị chặn; (6) chưa thử khối lượng production lớn khi khôi phục, chưa thử app mobile với 409. Lỗi có sẵn, KHÔNG sửa: `internal.routes.js` thiếu import `TravelLog`, biến toàn cục `deviceStatus` chưa khai báo ở nhánh completed của PUT, lịch cron `* 14 * * *`.
- **Quy trình rebuild backend** như mục "Cấu hình giao diện" ở trên (preview đang chạy mã mới).
