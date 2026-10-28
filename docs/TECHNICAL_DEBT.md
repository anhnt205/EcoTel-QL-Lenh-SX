# Nợ kỹ thuật đã xác minh — DIEU-PHOI-MM

Chỉ ghi những gì đã đọc trực tiếp trong code ngày 2026-08-24 (nhánh `dev-dieuphoi-mm`). Không suy đoán, không tự sửa (đúng nguyên tắc onboarding — chỉ phát hiện, sửa phải được yêu cầu rõ ràng riêng).

## 1. ✅ ĐÃ SỬA (2026-08-24, commit `623ab24`): `ROLES` trong `config.js` tính sai

`const ROLES = Object.values(STATUS_ORDER);` → `Object.values(ROLE);`. Đã grep toàn bộ nơi dùng `ROLES` (số nhiều): chỉ 1 chỗ import (`WebApp/Backend/models/User.js:2`) và **không hề dùng** trong cả file đó (import chết) — bug có thật nhưng thực tế CHƯA gây ảnh hưởng runtime nào trước khi sửa, vì không ai đọc giá trị sai đó. Kèm test baseline đầu tiên của dự án: `WebApp/Backend/tests/config.test.js`.

## 2. Rủi ro bảo mật: `backup/entrypoint.sh` dump toàn bộ env ra file trong container (mức độ: trung bình-cao)

```bash
printenv > /app/src/env.list
```
Ghi TOÀN BỘ biến môi trường (bao gồm `MONGODB_URI` có mật khẩu, `AWS_SECRET_ACCESS_KEY`, `JWT_SECRET`...) ra file plaintext `/app/src/env.list` trong container `ktv_backup`, mục đích debug. Rủi ro: nếu file này từng bị bind-mount ra ngoài, đưa vào log tập trung, hoặc image bị `docker save`/inspect layer, secret sẽ lộ. Không tự sửa (thay đổi hành vi container backup đang chạy thật ngoài production), chỉ ghi nhận.

## 3. Backend: 0 test file, dù `jest`/`supertest` đã cài (mức độ: cao)

`package.json` có `"test": "jest"` + devDependencies `jest`, `supertest`, nhưng không có bất kỳ file `*.test.js`/`*.spec.js` nào trong repo. `commands.test` trong `project.yaml` sẽ báo lỗi "no tests found" khi chạy — đây là hiện trạng thật, không phải lỗi cấu hình của factory.

## 4. Frontend: 0 test file (mức độ: trung bình)

`react-scripts test` (Create React App mặc định) có sẵn nhưng ngay cả `App.test.tsx` mặc định của CRA (thường tự sinh khi tạo project) cũng đã bị xoá — xác nhận 0 test thật. Khác TK-HATU (Frontend TK-HATU không có script test nào cả) — ở đây có SCRIPT nhưng không có TEST.

## 5. ✅ ĐÃ SỬA (2026-08-24, commit `d7091e2`): `upload.routes.js` không có xác thực

Đã thêm `verifyToken` vào cả 2 route (`GET /put`, `GET /get`), đúng pattern per-route đã dùng ở các route file khác. **Lưu ý khi apply_code (task #136)**: MiMO thêm đúng `verifyToken` nhưng tự ý đổi `require('../utils/uploadImage')` thành `require('../utils/handleUpload')` (file không tồn tại, sẽ crash server thật lúc boot) — build/test PASS vẫn không phát hiện được vì test suite không import file này. Phát hiện bằng cách `require()` trực tiếp module trong container, sửa lại path đúng.

## 6. `errorHandler.js` tồn tại nhưng không được mount + có bug tiềm ẩn nếu mount sau này (mức độ: trung bình, hiện tại chưa phát tác)

Xem chi tiết ở `docs/ARCHITECTURE_CURRENT.md` mục 4. Tóm tắt: `server.js` dùng error handler inline riêng (không phải file `utils/errorHandler.js`); nếu sau này ai mount `utils/errorHandler.js` vào mà không sửa, request sẽ treo vô thời hạn khi `NODE_ENV` không đúng 2 giá trị `development`/`production` — đúng lỗi đã gặp và fix ở TK-HATU (`errorHandler.js` gốc TK-HATU trước khi sửa).

## 7. ✅ ĐÃ SỬA (2026-08-24, commit `ca9b31e`): 2 bug logic trong `device.routes.js`

`GET /:id` (handler xem chi tiết 1 thiết bị): (1) `"vehicleSummaries.vehicle": { $in: deviceIds }` → `deviceId` (biến `deviceIds` không tồn tại trong scope handler này, gây `ReferenceError` thật, luôn trả 500). (2) `travelHoursAgg[0].totalTravelHours` → `latestTravelHours` (đúng tên field do `$group` tạo ra). Áp dụng trực tiếp (không qua apply_code) sau khi task #137 từ chối vì cần toàn bộ 1174 dòng file gốc để ghi lại — xem mục "Bài học apply_code" bên dưới.

## 8. MongoDB expose thẳng port 27017 ra host, Grafana dùng mật khẩu mặc định (mức độ: trung bình, chỉ áp dụng khi chạy compose dev)

`WebApp/docker-compose.yaml`: `ktv_db` publish `27017:27017` (ai có network tới máy đều query được nếu biết user/pass), `ktv_grafana` hardcode `GF_SECURITY_ADMIN_PASSWORD=admin`. Chấp nhận được cho dev cục bộ, KHÔNG dùng nguyên trạng cho môi trường chạm được từ ngoài — khớp với ghi chú "THIS DOCKER COMPOSE IS FOR LOCAL DEVELOPMENT" ngay đầu file.

## 9. `nginx_release.conf` không dùng được nguyên trạng (mức độ: thấp, đã biết trước)

`server_name dieuhanhquanlythietbitcs.vn` + `ssl_certificate /etc/ssl/mydomain/...` — domain/cert của 1 site khác (giống hệt TK-HATU, xác nhận cả 2 dùng chung 1 file gốc chưa customize). Không phải bug cần sửa ngay — chỉ ghi nhận để không nhầm là cấu hình dành cho DIEU-PHOI-MM.

## 10. GitHub Actions in secret ra log qua `cat WebApp/.env` (mức độ: thấp)

`deploy-release.yml`/`deploy-staging.yml` có bước `cat WebApp/.env` sau khi ghi secret vào file — GitHub Actions tự động mask giá trị secret đã đăng ký trong log viewer, nên không lộ trực tiếp qua UI, nhưng vẫn là thói quen không nên (dễ lộ nếu secret value trùng 1 chuỗi phổ biến không được mask đúng, hoặc log được export ra ngoài). Không tự sửa workflow (ảnh hưởng CI/CD thật đang chạy).

## 11. Backend: 65 lỗ hổng dependency đã biết (npm audit, mức độ: cao — 4 critical)

Xác nhận thật khi build baseline (2026-08-24): `npm ci` báo **65 vulnerabilities (4 low, 35 moderate, 22 high, 4 critical)**. Chưa chạy `npm audit` chi tiết để liệt kê từng package — cần làm trước khi quyết định `npm audit fix` (có thể breaking change, không tự ý chạy `--force`).

## Bài học thật khi dùng apply_code trên dự án này (2026-08-24)

3/3 task giao cho MiMO qua `apply_code` đều KHÔNG dùng được nguyên trạng — tệ hơn cả tỉ lệ đã gặp ở TK-HATU:

- **Task #135** (fix 1 dòng `ROLES` + thêm test): MiMO viết lại **toàn bộ** `config.js` dù được yêu cầu rõ "CHỈ đổi đúng dòng này" — xoá hẳn `STATUS_DEVICE`/`STATUS_REPAIR`/`ACCEPTED_PRODUCT`/`JPS_STATUS`/`SEAL_STATUS` (đang dùng thật ở nơi khác), đổi cả giá trị chuỗi `STATUS_ORDER.CANCEL: 'cancel'` → `'cancelled'` (sẽ làm sai lệch dữ liệu đã lưu trong MongoDB nếu lọt qua), bịa hẳn `JOB_TYPE` tiếng Anh khác hoàn toàn nghiệp vụ thật. Build/test vẫn PASS vì test suite (do chính task này tạo) chỉ kiểm tra `ROLE`/`ROLES`/`STATUS_ORDER` — không cover phần bị phá. Revert (`ae4fa70`), áp fix đúng bằng tay.
- **Task #136** (thêm `verifyToken` vào `upload.routes.js`): áp đúng phần được yêu cầu, NHƯNG tự ý đổi `require('../utils/uploadImage')` thành `require('../utils/handleUpload')` — file không tồn tại, sẽ crash server thật khi boot (`Cannot find module`). Build/test vẫn PASS vì test suite không import file này. Chỉ phát hiện được bằng cách `require()` trực tiếp module trong container — build/test không đủ để bắt lỗi loại này.
- **Task #137** (2 fix 1 dòng trong `device.routes.js`): model từ chối, báo cần toàn bộ nội dung file gốc (1174 dòng) vì cơ chế `apply_code` bắt buộc ghi lại TOÀN BỘ file, không phải diff — không bịa liều, nhưng không dùng được trong pipeline này.

**Bài học mới, riêng của dự án này**: ngay cả yêu cầu tối giản, tối literal, có sẵn tiền lệ thất bại y hệt ở TK-HATU để tham khảo, vẫn thất bại 3/3 lần trên file lớn/nhiều export. Với file có nhiều hằng số/export không liên quan tới chỗ cần sửa, cân nhắc áp fix trực tiếp ngay từ đầu (không thử qua apply_code trước) nếu fix chỉ 1-2 dòng và đã biết rõ nội dung file — tốn ít thời gian hơn là chờ apply_code thất bại rồi mới sửa tay. Luôn verify độc lập bằng `require()` trực tiếp module thay đổi trong container (không chỉ tin `npm test` PASS) khi test suite còn mỏng.

**Bug mới phát hiện khi thao tác apply_code (không phải bug code, mà bug hạ tầng factory)**: gọi thẳng `POST /api/agent/requests` với `request_text` nhiều dòng (nhúng code mẫu) — dù không dùng cú pháp đính kèm cũ — vẫn bị `decompose_request` tách thành 13 task rác theo từng dòng (tái hiện đúng sự cố #16 đã ghi ở `docs/INCIDENTS.md` gốc factory, nhưng qua đường gọi API trực tiếp thay vì Chat UI). Khắc phục: luôn dùng field `attachments` cho nội dung nhiều dòng, giữ `request_text` là 1 dòng duy nhất.

## 12. Đã thêm (2026-08-25): placeholder `portal-manifest.json` cho tích hợp PORTAL-PM

Retrofit theo yêu cầu riêng (không phải phát hiện lỗi) — PORTAL-PM (portal
SSO chung trong cùng factory) đăng ký module con qua cơ chế "pull manifest
tĩnh", xem `PORTAL-PM/docs/APP_MANIFEST_CONTRACT.md`. Đã xác minh trước khi
thêm: WebApp/Frontend là Create React App (`react-scripts`, KHÔNG phải
Vite) — `npm run build` copy nguyên `public/` vào `build/`, rồi
`WebApp/Frontend/Dockerfile` copy `build/` vào image nginx
(`/usr/share/nginx/html`). Đã đọc cả `WebApp/Frontend/.nginx/nginx.conf`
(`location / { try_files $uri /index.html =404; }`) và
`WebApp/reverse_proxy/nginx_release.conf`/`nginx_staging.conf`
(`location /` proxy nguyên trạng mọi path không phải `/api/`
hay `/socket.io/` sang frontend) — không có location block nào chặn
`/.well-known/*`, nên file đặt trong `public/.well-known/` sẽ lên đúng
`GET {origin}/.well-known/portal-manifest.json`, public, không qua backend.

Đã thêm 2 file, KHÔNG đổi gì khác:
- `WebApp/Frontend/public/.well-known/portal-manifest.json` — nội dung
  `{"modules": []}` (placeholder rỗng hợp lệ, Portal chấp nhận app 0
  module ở Layer 1).
- `WebApp/Frontend/public/.well-known/README.md` — hướng dẫn điền module
  thật sau này, dịch/rút gọn từ tài liệu PORTAL-PM.

MobileApp (Flutter) KHÔNG được xét làm target cho cơ chế này — app native
Android/iOS không có origin HTTP để Portal iframe/gọi tới, và bản thân dự
án đã ghi rõ MobileApp nằm ngoài phạm vi factory quản lý (xem mục "Chưa
làm" bên dưới, dòng MobileApp). Chưa deploy/build lại — file mới chỉ nằm
trên source, cần 1 lần build+deploy Frontend thật để endpoint sống trên
domain thật.

## Chưa làm / chưa xác minh (báo cáo trước khi phát triển tiếp)

- Chưa đọc chi tiết `utils/cron.js` (nội dung job định kỳ cụ thể).
- Chưa đọc chi tiết Socket.IO server-side handler trong `server.js` (chỉ xác nhận có khởi tạo `new Server(...)`, chưa xem các event `on(...)` cụ thể).
- Chưa đọc MobileApp (Flutter) — nằm ngoài phạm vi factory quản lý ở bước onboarding này.
- Chưa xác định rõ mục đích biến `process.env.API_URL` và model `Internal`.
- `.factory/pipeline.json` phản ánh trạng thái mới nhất sau build/test/preview — xem file đó, đừng tin tài liệu này về trạng thái BUILD/TEST/PREVIEW (tài liệu này chỉ ghi phát hiện code + lịch sử sửa, không phải kết quả chạy real-time).
