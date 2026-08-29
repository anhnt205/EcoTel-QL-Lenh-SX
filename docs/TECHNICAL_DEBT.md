# Technical Debt — THONGKE-CAOSON

Phát hiện từ đọc code thật + build/test thật trong Docker (2026-08-29).
KHÔNG có mục nào được sửa trong lượt onboarding này (đúng yêu cầu "không
đổi chức năng nghiệp vụ") — chỉ ghi nhận.

## 🔴 Nghiêm trọng — cần chủ dự án quyết định TRƯỚC khi phát triển tiếp

### 1. Toàn bộ xác thực/phân quyền API đang bị TẮT

`backend/src/main/java/com/ecotel/thong_ke_cao_son/security/SecurityConfig.java`:

```java
.authorizeHttpRequests(authorize -> authorize
        .requestMatchers(PUBLIC_ENDPOINT).permitAll()
//      .anyRequest().authenticated()
        .anyRequest().permitAll() // test
)
// .addFilterAfter(appTokenFilter, BearerTokenAuthenticationFilter.class)
// .addFilterAfter(permissionFilter, AppTokenFilter.class)
// .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
```

Mọi endpoint (CRUD danh mục, nhập báo cáo Vận tải/Khai thác, đối chiếu,
quản lý người dùng...) truy cập được không cần token, không cần đăng nhập,
không kiểm tra quyền. Code xác thực (`AppTokenFilter`, `PermissionFilter`,
OAuth2 resource server) TỒN TẠI ĐẦY ĐỦ và đúng thiết kế — chỉ đơn giản
không được nối vào filter chain. Comment `// test` gợi ý đây là cấu hình
debug tạm quên revert, nhưng đây là SUY ĐOÁN, không phải xác nhận.

**Rủi ro thật**: nếu môi trường nào đang chạy commit này mà public ra
ngoài (kể cả staging), toàn bộ dữ liệu (báo cáo sản lượng, danh mục thiết
bị/vật tư, thông tin người dùng) đọc/ghi được không cần xác thực.

**Cần chủ dự án xác nhận**: (a) đây có phải chủ đích tạm thời cho giai
đoạn dev hiện tại không, (b) môi trường staging/production hiện tại có
đang chạy đúng commit này không (nếu có, cần xử lý khẩn cấp ngoài phạm vi
factory), (c) khi nào/ai sẽ bật lại 3 dòng bị comment.

`automation.allow_apply_code` đã TẮT trong `project.yaml` vì lý do này —
không nên để AI tự sinh/sửa code nghiệp vụ trên nền tảng bảo mật đang mở
toang.

## 🟡 Trung bình

### 2. `MONGO_SYNC_URI` có default chứa credential dạng plaintext (dev)

`application-dev.yaml`:
```yaml
mongo:
  sync:
    uri: ${MONGO_SYNC_URI:mongodb://root:example@ktv_mongo_db:27017/Lenh_sx?...}
```
Giá trị `root`/`example` trông như placeholder dev (không phải secret sản
xuất thật — không có bằng chứng đây là credential thật đang dùng ở đâu),
nhưng vẫn là thực hành không tốt: default có credential hardcode trong file
commit, dù chỉ để chạy local. Nên đổi thành không có default (bắt buộc set
qua env) hoặc dùng giá trị rõ ràng là fake (`CHANGE_ME`) để không ai nhầm
là thật.

### 3. Test backend FAIL thật khi chạy độc lập — không có H2/Testcontainers

Đã verify THẬT (không suy đoán) bằng cách chạy `mvn test` trong container
Maven riêng biệt (không có Postgres/Redis đi kèm):

```
[ERROR] ThongKeCaoSonApplicationTests.contextLoads
  → IllegalState: Failed to load ApplicationContext
  → Caused by: HibernateException: Unable to determine Dialect without
    JDBC metadata (please set 'jakarta.persistence.jdbc.url' ...)
[ERROR] Tests run: 1, Failures: 0, Errors: 1, Skipped: 0
[INFO] BUILD FAILURE
```

`@SpringBootTest` boot toàn bộ ApplicationContext (bao gồm JPA/Hibernate,
Redis, OAuth2 resource server đọc JWKS từ Portal...) nhưng repo không có
`spring-boot-starter-test` với H2/Testcontainers, không có
`application-test.yaml`/profile riêng cho test. Muốn `mvn test` PASS độc
lập (không cần hạ tầng ngoài) cần 1 trong 2 hướng: (a) thêm Testcontainers
Postgres cho test, hoặc (b) thêm profile test dùng H2. Hiện KHÔNG có cách
nào chạy `mvn test` thành công mà không có Postgres/Redis/Portal JWKS thật
đang chạy — pipeline CI (`deploy-staging.yml`) hiện cũng KHÔNG chạy `mvn
test` ở bước nào (chỉ build image, xem `Makefile`).

### 4. `datasource.password: password` hardcode ở dev profile

`application-dev.yaml` có `password: password` (khớp default
`POSTGRES_PASSWORD` trong `docker-compose.yaml`) — chỉ dùng local, không
phải secret thật, nhưng cùng dạng thực hành như mục 2.

### 5. Port healthcheck sai trong `backend/docker-compose.yaml`

```yaml
backend-service:
  ports:
    - "8099:8090"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8088/actuator/health"]
```
App thật lắng nghe `8088` (khớp `server.port` trong `application-dev.yaml`
VÀ `EXPOSE 8088` trong Dockerfile) — nhưng port publish ra host lại là
`8099:8090`, không khớp `8088` nào cả. Healthcheck bên trong container vẫn
đúng (chạy trong network container, gọi `localhost:8088` — đúng vì cùng
container), nhưng nếu ai định gọi từ HOST qua cổng publish `8099` sẽ luôn
fail vì forward sang container port `8090` (không có gì lắng nghe ở đó).
Rất có thể `8090`/`8099` là copy nhầm từ 1 service khác.

### 6. Route `/socket.io/` trong nginx staging không khớp backend Java hiện tại

`reverse_proxy/nginx_staging.conf` có `location /socket.io/` proxy sang
backend — nhưng `pom.xml` không có dependency Socket.IO nào (Spring không
tự nhiên hỗ trợ giao thức Socket.IO). Nhiều khả năng file nginx này được
copy từ 1 project khác trong cùng nhóm nghiệp vụ (vd TK-HATU, backend
Node/Express CÓ dùng Socket.IO thật) mà chưa gỡ phần không áp dụng được ở
đây. Chưa xác nhận có cơ chế realtime nào khác (SSE, polling) thay thế hay
không.

### 7. 2 tầng CORS không nhất quán

`reverse_proxy/nginx_staging.conf`: `Access-Control-Allow-Origin: '*'` +
`Access-Control-Allow-Credentials: true` cùng lúc — SAI theo CORS spec
(trình duyệt từ chối request có credential khi origin là wildcard). Trong
khi đó `SecurityConfig.corsConfigurationSource()` ở tầng Spring lại cấu
hình ĐÚNG (`allowCredentials(false)` khi dùng wildcard origin, có comment
giải thích rõ lý do). 2 tầng proxy khác nhau đang có 2 chính sách CORS
khác nhau cho cùng 1 hệ thống.

## 🟢 Nhỏ / dọn dẹp

### 8. Artifact không phải source bị commit nhầm vào repo

- `backend/.graphify/` (5 file, `.graphify_labels.json`/`GRAPH_REPORT.md`/
  `cache/stat-index.json`/`cost.json`/`graph.json`) và
  `backend/src/main/java/com/ecotel/thong_ke_cao_son/.graphify/cache/ast/`
  (~124KB, nhiều file `.json` theo hash) — cache của 1 công cụ phân tích
  AST/graph code (tên "graphify"), không phải source thật, không ảnh hưởng
  build (Maven chỉ compile `.java`) nhưng là rác commit nhầm, tổng ~1.2MB.
- `frontend/transcript_match.json` (~28KB) — log hội thoại dạng
  `{"step_index":...,"type":"USER_INPUT",...,"content":"<USER_REQUEST>..."}`
  — rất có thể là transcript của 1 công cụ AI coding, không phải dữ liệu
  ứng dụng, không được import/dùng ở đâu trong source.
- `frontend/@/components/ui/{button,input-group,input,textarea}.tsx` — 4
  file TRÙNG LẶP orphan. Alias `@` đã khai đúng trỏ vào `./src` (cả
  `tsconfig.app.json` lẫn `vite.config.ts`), nên `import "@/components/ui/
  button"` thực resolve vào `src/components/ui/button.tsx` — thư mục
  `frontend/@/` (tên thư mục literal là `@`) không được bất kỳ import nào
  trỏ tới, khả năng cao do 1 lần chạy `shadcn add` bị lỗi cấu hình alias.

Không tự xoá trong lượt onboarding này (đúng yêu cầu "không xoá/thay thế
code hiện tại") — chủ dự án có thể xoá an toàn sau khi xác nhận không cần.

### 9. 2 lockfile frontend cùng tồn tại

`frontend/package-lock.json` (npm) VÀ `frontend/pnpm-lock.yaml` (pnpm) —
Dockerfile build CHỈ dùng `pnpm install --frozen-lockfile`, `package.json`
cũng có `"pnpm"` trong dependencies (khả năng do `pnpm add pnpm` nhầm).
`package-lock.json` không được dùng ở đâu trong build thật nhưng dễ gây
nhầm lẫn "dùng được npm install" — thực tế sẽ lệch version so với lockfile
pnpm đang là nguồn thật.

### 10. `package.json` name vẫn là `"temp-scaffold"`

`frontend/package.json` có `"name": "temp-scaffold"` — gợi ý project khởi
tạo từ 1 boilerplate/scaffold chưa được đổi tên, không ảnh hưởng chức năng.

### 11. Mật khẩu tài khoản `admin` không xác định được

`backend/seed-data.sql` seed 1 user `admin` với password lưu dạng BCrypt
hash (`$2a$10$N.zmdr9k7uOCQb376NoUnu...`) — không thể suy ngược ra mật
khẩu gốc, và KHÔNG được đoán/thử trong lượt onboarding này (đúng yêu cầu
"không hiển thị/commit secret", áp dụng luôn cho việc không cố gắng bẻ
khoá hash có sẵn). `project.yaml` KHÔNG khai `demo_login` vì lý do này —
khác các project khác trong factory có mật khẩu demo biết trước.

## Điều kiện còn thiếu trước khi phát triển tiếp (tổng hợp)

1. **Quyết định về bảo mật (mục 🔴 1)** — bắt buộc trước mọi thứ khác.
2. Xác nhận MongoDB "Lệnh SX" nguồn đồng bộ có đúng là hệ TK-HATU/
   DIEU-PHOI-MM không (ảnh hưởng cách test module đồng bộ sau này).
3. Cung cấp `.env`/`.env_backend` thật (không có file nào trong repo/máy
   này) nếu cần chạy preview/staging thật — hiện KHÔNG có `.env` nào tồn
   tại, kể cả gitignored.
4. Quyết định hướng viết test thật cho backend (Testcontainers hay H2) —
   hiện 0% test chạy được độc lập.
5. Xác nhận mật khẩu admin thật (hoặc reset) nếu cần đăng nhập bằng tài
   khoản local thay vì qua Portal.
