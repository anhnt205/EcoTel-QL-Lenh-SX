# Deploy gộp: Điều phối + Thống kê (một repo, một stack)

Từ 2026-10-12 mã nguồn Thống kê nằm trong repo này (`ThongKe/`). Hai phần mềm chạy **cùng một domain, cùng một lần deploy**:

| Đường dẫn | Phục vụ bởi |
|---|---|
| `/`, `/api/`, `/socket.io/` | Điều phối: frontend (React/Vite) + backend (Node, MongoDB) |
| `/thong-ke/` | Thống kê frontend (Vite, `VITE_BASE_PATH=/thong-ke/`) — Điều phối nhúng qua iframe cùng origin |
| `/tk-api/` | Thống kê backend (Spring Boot, Postgres, Redis), proxy cắt tiền tố |

Đăng nhập **một lần ở Điều phối**: backend Điều phối ký token HS256 bằng `TK_AUTH_JWT_SECRET` (cùng khoá với `AUTH_JWT_SECRET` của Thống kê) và khung Thống kê xin token qua `postMessage`.

## File

| File | Vai trò |
|---|---|
| `WebApp/docker-compose.unified.yaml` | Stack gộp, **build từ mã nguồn** (project name `dieu-phoi-mm`, tên service Điều phối giữ nguyên `ktv_*`) |
| `WebApp/unified.env.example` | Mẫu biến — sao chép thành `WebApp/.env` |
| `WebApp/reverse_proxy/nginx_thongke.conf` | Proxy HTTP `:8888` (mặc định) |
| `WebApp/reverse_proxy/nginx_release_thongke.conf` | Proxy HTTPS + tên miền (bản của `nginx_release.conf` có thêm route Thống kê) — chọn bằng `NGINX_CONF` |
| `WebApp/docker-compose.thongke-embed.yaml` | Chạy thử cục bộ (frontend build vào volume) — không dùng để deploy |

**Không đổi:** `docker-compose.yaml`, `docker-compose-build.yaml`, `deployment/release|staging` và workflow CI/CD. `main`/`develop` vẫn tự deploy như cũ và **chưa có Thống kê**; đưa Thống kê vào đường CI/CD (build + push image Thống kê, thêm service vào `release-docker-compose.yaml`) là việc riêng.

## Biến môi trường

Đặt trong `WebApp/.env` (xem `unified.env.example`; **không commit**):

- Bắt buộc: `MONGO_PASSWORD`, `TK_POSTGRES_PASSWORD`, `TK_AUTH_JWT_SECRET` (>= 32 ký tự).
- Backend Điều phối vẫn đọc `WebApp/Backend/.env` (`JWT_SECRET`, `MONGODB_URI`, `FIREBASE_KEY_PATH`, ...) như trước; `MONGODB_URI` phải dùng đúng `MONGO_PASSWORD`. File Firebase `WebApp/Backend/serviceAccountKey.json` phải có trước khi build (backend `require()` lúc khởi động).
- `VITE_TK_EMBED=true` (mặc định trong compose gộp) bật menu Thống kê ở frontend Điều phối — **bake lúc build**; thiếu biến này frontend vẫn chạy nhưng KHÔNG có menu Thống kê.
- `CATALOG_MASTER` để **trống** cho tới khi đã đồng bộ danh mục xong (xem dưới).

## Lần đầu bật Thống kê trên hệ thống Điều phối đang chạy thật

1. Sao lưu MongoDB (dump) trước khi nâng cấp.
2. Dựng + chạy: `docker compose -f docker-compose.unified.yaml build` rồi `up -d`. Mongo dùng thư mục dữ liệu bind `WebApp/.ktv-mongodb-data` (như `docker-compose.yaml` và spec của server chung). **Server chạy bằng `deployment/release` của CI dùng `.mongodb-data`** — nếu chuyển sang stack gộp trên máy đó, trỏ `volumes` của `ktv_db` về đúng thư mục dữ liệu hiện có, nếu không Mongo sẽ khởi động với DB rỗng.
3. Thống kê khởi động với DB rỗng. Tạo tài khoản chỉ-đọc cho đồng bộ (`TK_SERVICE_USERNAME/PASSWORD`) và nhập/seed danh mục Thống kê.
4. Chạy `POST /api/catalog-sync/tk` (admin, **mặc định dry-run**) và đọc báo cáo; chạy thật bằng `dryRun=false`. Đồng bộ ghép theo `externalTkId` → mã → tên và **giữ nguyên `_id`** của bản ghi Điều phối nên lệnh/báo cáo cũ không gãy.
5. Chỉ sau đó mới đặt `CATALOG_MASTER=thongke` và `up -d` lại backend Điều phối.
6. Chạy `scripts/freeze-completed-orders.js` sau lần nâng cấp đầu (xem `docs/UPGRADE_CHECKLIST.md`).

Rollback: bỏ `CATALOG_MASTER` (danh mục ghi lại được ngay) hoặc `down` stack gộp và dựng lại compose cũ; dữ liệu Mongo không bị đổi cấu trúc bởi bước gộp.

## Dùng với deployer chung của factory

Spec mẫu (đặt thành `deploy/projects/DIEU-PHOI-MM.yaml` ở repo factory **khi bạn quyết định chuyển**; deployer chỉ build từ `origin/dev`, nên cần đưa code lên `dev` trước):

```yaml
project: DIEU-PHOI-MM
source: {ref: dev}
compose:
  name: dieu-phoi-mm
  dir: WebApp
  files: [docker-compose.unified.yaml]
entry:
  service: ktv_reverse_proxy_service
  container_port: 8888
  health: {path: /api/system-info, timeout: 900}
env:
  WebApp/.env:
    generate: [TK_POSTGRES_PASSWORD, TK_AUTH_JWT_SECRET]
    set: {MONGO_PASSWORD: "{secret:mongo}", PUBLIC_URL: "{url}"}
    required: [MONGO_PASSWORD, TK_POSTGRES_PASSWORD, TK_AUTH_JWT_SECRET]
  WebApp/Backend/.env:
    generate: [JWT_SECRET]
    set:
      PORT: "8080"
      NODE_ENV: production
      MONGODB_URI: "mongodb://root:{secret:mongo}@ktv_db:27017/dieuphoimm?authSource=admin"
      FIREBASE_KEY_PATH: ./serviceAccountKey.json
    required: [JWT_SECRET, MONGODB_URI]
secret_files:
  - WebApp/Backend/serviceAccountKey.json
persist: [WebApp/.ktv-mongodb-data]
release: {build_timeout_minutes: 90}
```

Sau khi chuyển, `deploy/projects/THONGKE-CAOSON.yaml` thành dư (Thống kê không còn deploy riêng).

## Lưu ý đã biết

- `npm i` frontend Điều phối cần `--legacy-peer-deps` (xung đột peer `@types/node` của vite@5) — Dockerfile đã thêm.
- Backend Thống kê chạy profile Spring `dev` (`ddl-auto update`) giống bản preview đã dùng; đổi sang profile khác cần kiểm schema trước.
- Frontend Thống kê build bằng `pnpm` (Dockerfile của nó); `npm ci` ở thư mục đó báo lock lệch.
- Server chung dùng khoá Docker (`docker_build_lock`) khi build; stack này dựng 5 image (2 Node, 1 Java, 1 Vite, 1 nginx) — chạy build ngoài giờ cao điểm.

## Đăng nhập một lần từ Portal (PORTAL-PM)

Điều phối là phần mềm con của Portal: bấm thẻ phần mềm trên Portal thì vào thẳng, không gõ lại mật khẩu.

- Luồng: Portal sinh app-token (JWT RS256) + mã dùng một lần, lưu `otc:<code>` trong **Redis của Portal** (TTL 30 giây) rồi mở `<URL đăng ký>?code=<code>`. Trang `/login` của Điều phối gọi `POST /api/auth/portal/exchange-code`; backend `GETDEL` mã, xác thực token bằng JWKS của Portal (`iss`, `type=app`, `app=<PORTAL_APP_CODE>`) và cấp phiên Điều phối cho tài khoản **cùng `username`** (không tự tạo tài khoản; chưa có thì báo 403). Quyền trong Điều phối vẫn theo mô hình của Điều phối, không dùng `permissions` trong token Portal. Mã: `Backend/services/portalSso.js`.
- Bật bằng biến (trống = tắt, đăng nhập thường không ảnh hưởng): `PORTAL_REDIS_HOST`, `PORTAL_REDIS_PORT`, `PORTAL_REDIS_PASSWORD`, `PORTAL_JWKS_URI`, `PORTAL_APP_CODE` (mặc định `dpmm`) — xem `unified.env.example`. Backend Điều phối phải **thấy được Redis và JWKS của Portal** (cùng mạng Docker hoặc địa chỉ nội bộ).
- Trên Portal: đăng ký phần mềm với mã = `PORTAL_APP_CODE` và **URL = `<địa chỉ Điều phối>/login`** (đăng ký trang gốc thì mất `?code=` khi chuyển hướng).
- Điều kiện: Điều phối được mở trong khung (iframe) của Portal nên proxy không được gửi `X-Frame-Options`/CSP chặn; bản `nginx_release_thongke.conf` chỉ cho `frame-ancestors` các origin Portal liệt kê sẵn — thêm origin Portal thật vào đó.
