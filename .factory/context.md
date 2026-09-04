# Context — THONGKE-CAOSON

Cập nhật lần cuối: 2026-09-04 (lượt 5 — thiết kế lại các danh mục STD/Áp
Trắc Địa, dựng lại trang Báo cáo thống kê theo mockup, thêm 6 trường báo
chuyến cho Vận tải; CÓ sửa code, đã verify sống). Lượt 4 (2026-08-31) —
dựng engine tính sản lượng + danh mục dạng lưới có phiên bản theo thời
gian. Lượt 3 (2026-08-30) chỉ tài liệu. Lượt 2 (2026-08-29) — chuyển DB
độc lập + bật lại bảo mật + dựng preview sống thật. Đọc file này TRƯỚC
khi tiếp tục — tin file này hơn lịch sử chat đã bị nén.

## Tóm tắt trạng thái

Sau lượt onboarding 1 (chỉ đọc + tài liệu hoá), người dùng yêu cầu 3 việc
cụ thể qua session tương tác (đã hỏi rõ phạm vi bằng AskUserQuestion trước
khi làm, người dùng chọn phương án khuyến nghị cho cả 3):

1. **Gỡ hẳn code sync MongoDB** — dự án độc lập, không liên quan TK-HATU,
   sẽ tích hợp lại với DIEU-PHOI-MM sau này qua cơ chế riêng.
2. **Dựng preview local chạy thật** qua Factory (không chỉ sửa code build
   sạch).
3. **Bật lại JWT + permission** (thay vì giữ nguyên lỗ hổng permitAll).

Cả 3 đã hoàn thành + verify sống thật. Chi tiết đầy đủ từng thay đổi + lý
do: `docs/TECHNICAL_DEBT.md` phần "✅ Đã sửa trong lượt này".

## Đã làm — lượt 2 (2026-08-29)

1. **Gỡ MongoDB**: xoá `sync/` (toàn package), `MongoSyncConfig.java`,
   `SyncCheckpoint.java`+repository, dependency `mongodb-driver-sync`,
   block `mongo:`/`sync:` khỏi cả 3 `application*.yaml`. Verify: grep sạch,
   build PASS, preview chạy không lỗi.
2. **Bật lại security**: uncomment `oauth2ResourceServer`/`.anyRequest()
   .authenticated()`/2 filter trong `SecurityConfig.java`. Phát hiện + sửa
   thêm: (a) `/api/auth/**` thiếu trong `PUBLIC_ENDPOINT` (sẽ khoá luôn cả
   đăng nhập nếu không thêm), (b) `jwk-uri` sai tên property trong
   `application-prod.yaml` (phải là `jwk-set-uri`).
3. **Dựng preview local chạy thật** — file MỚI:
   `deployment/preview/preview-docker-compose.yaml` (postgres+redis+
   backend+frontend+reverse-proxy, join `factory-preview`),
   `reverse_proxy/nginx_preview.conf` (route `/`, `/api/` — không có
   `/socket.io/`), thêm ARG/ENV `VITE_API_KONG_URL`/`VITE_PORTAL_URL` vào
   `frontend/Dockerfile`. Phát hiện + sửa 1 bug thật lúc build: `proxy_pass`
   dùng biến trong `location /api/` làm path bị double-prefix
   `/api/api/...` — sửa bằng `proxy_pass` tĩnh.
4. **Portal integration cho preview**: PORTAL-PM chưa chạy → đã tự khởi
   động preview của nó (`docker compose -f docker-compose.local.yml
   --env-file .env.local up -d --build`, dùng `.env.local` có sẵn từ
   trước). JWKS thật của Portal chỉ reachable qua `reverse-proxy` (Kong),
   KHÔNG qua `portal-service` trực tiếp (verify: gọi thẳng `portal-service`
   trả `401`, qua `reverse-proxy:8888` trả `200` JWKS thật). Bridge bằng
   `docker network connect thongke-caoson-preview_portal-link
   portal-pm-local-reverse-proxy-1 --alias portal-gateway` (runtime, không
   sửa compose PORTAL-PM).
5. **Fix nhỏ khác**: port healthcheck sai trong `backend/docker-compose.yaml`
   (`8099:8090`→`8099:8088`), thêm `backend/.env.example`.
6. **Verify sống đầy đủ qua preview** (`http://thongke-caoson.preview.localhost:8080/`):
   - Frontend load được (title đúng "Phần Mềm Thống Kê Cao Sơn"), `AuthGate`
     hiện đúng màn "Xác thực thất bại — Không tìm thấy token" khi chưa có
     `?code=` (đúng hành vi mong đợi, KHÔNG phải lỗi).
   - `/actuator/health`, `/swagger-ui/index.html` → `200`.
   - `/api/auth/exchange-code` (code giả) → `500` (public, reach được
     controller, lỗi nghiệp vụ thật — KHÔNG bị chặn bởi security).
   - `/api/users` không token → `401`; token giả → `401`.
   - JWKS Portal thật qua bridge → `200`, trả đúng bộ khoá RSA.
7. **Cập nhật toàn bộ tài liệu** phản ánh trạng thái mới: `project.yaml`,
   `CLAUDE.md`, `docs/{CODEBASE_MAP,ARCHITECTURE_CURRENT,REQUIREMENTS_AS_IS,
   TECHNICAL_DEBT}.md`.

## Đã làm — lượt 3 (2026-08-30, chỉ tài liệu, KHÔNG sửa code)

1. **Sửa con trỏ worktree bị hỏng**: `.git` của worktree `claude-dev` và
   `.git/worktrees/claude-dev/gitdir` thiếu tiền tố ổ đĩa
   (`/projects/...` thay vì `D:/Coding/DU_AN/AI_Software_Factory/projects/...`)
   → mọi lệnh git báo `fatal: not a git repository`. Đã ghi lại đường dẫn
   tuyệt đối, git chạy bình thường. **Worktree `codex-dev` vẫn hỏng y hệt
   và đang bị git đánh dấu `prunable`** — chưa sửa (thuộc session khác).
2. **Ghi nhận luồng nghiệp vụ từ sơ đồ workflow của chủ dự án** →
   `docs/REQUIREMENT_WORKFLOW.md` (mới), link từ `Requirement.md`. Đây là
   yêu cầu TO-BE đầu tiên có nguồn chính thức từ người dùng (trước đó chỉ
   có AS-IS suy từ code).
3. **Sơ đồ trả lời câu hỏi treo số 2 ở `REQUIREMENTS_AS_IS.md` mục 7**:
   nguồn dữ liệu đối chiếu KHÔNG phải hệ ngoài — là đối chiếu nội bộ giữa
   chuyến Máy xúc (Khai thác) và chuyến Ô tô (Vận tải) trong chính hệ này.
   Bỏ Mongo không làm mất nguồn đối chiếu.
4. **Đặc tả trường dữ liệu chi tiết** cho cả 2 bên (Khai thác 21 trường /
   Vận tải 31 trường) đã được chủ dự án cung cấp và ghi vào
   `REQUIREMENT_WORKFLOW.md` mục 5. Bản chất nghiệp vụ: 1 sự kiện vật lý
   (chuyến xe chở đất) được ghi nhận ĐỘC LẬP 2 lần bởi 2 bên; **Số chuyến**
   là chỉ tiêu đối soát chính. Khoá ghép cặp: **Ngày + Ca + Máy xúc + Loại
   hàng**. Sơ đồ này là **quy trình THỦ CÔNG cần số hoá** (chủ dự án xác
   nhận) — code sẵn có chỉ hiện thực một phần.
5. **Nhận tài liệu gốc `Module Thống kê sản lượng.docx`** (03.08.2026) từ
   `D:\EcoTel\3. Dự án\TKV Công ty than Cao sơn\Phần mềm thống kê\Yêu cầu\`.
   Đã trích xuất nguyên văn → `docs/_source/module-thong-ke-san-luong.txt`
   (KHÔNG phụ thuộc đường dẫn máy cá nhân nữa; ảnh minh hoạ bị mất, đánh
   dấu `[HINH ANH]`, muốn xem phải mở .docx gốc). Phần tính sản lượng (mục
   III) tách riêng → **`docs/REQUIREMENT_SANLUONG.md`**: ~15 danh mục mới +
   ~25 nhóm công thức + **15 điểm chặn** (công thức thiếu ngoặc, nhánh điều
   kiện chồng nhau/trùng nhau, 8 trường bỏ trống công thức) phải hỏi chủ dự
   án trước khi code. **Tuyệt đối không tự đoán công thức rồi code.**
6. **3 phát hiện quan trọng từ docx** (chi tiết trong REQUIREMENT_WORKFLOW):
   (a) **Một xe có nhiều dòng chuyến trong 1 ca nhưng CHUNG nhiên liệu/nhân
   viên** → cấu trúc phải là phiếu-đầu + n-dòng-chuyến, mô hình phẳng sẽ
   nhân đôi nhiên liệu (mục 5.4); (b) nhập liệu thực tế **chủ yếu qua
   Excel**, không phải form tay; (c) tiêu đề tài liệu ghi *"MODULE THỐNG KÊ
   — PHẦN MỀM ĐIỀU PHỐI MÁY MÓC THIẾT BỊ CAO SƠN"*, **mâu thuẫn tiềm tàng**
   với khẳng định "THONGKE-CAOSON độc lập với DIEU-PHOI-MM" trong CLAUDE.md
   — chưa tự kết luận, đã đưa vào danh sách hỏi.
7. **Nhận thêm 2 workbook Excel THẬT đang chạy** (`thống kê sản lượng.xlsx`
   52 sheet — phía đơn vị/tiền lương; `Tháng 5 đổi tên xe.xlsx` 129 sheet —
   phía phòng Thống kê). Sheet **`tinh toan`** chứa toàn bộ công thức tính
   sản lượng thật (~140 cột). Đã trích công thức dòng 5 →
   `docs/_source/excel-tinhtoan-row5-formulas.txt`, phân tích →
   **`docs/REQUIREMENT_SANLUONG_EXCEL.md`** (bản đồ cột + công thức đúng).
   **Giải 14/15 điểm chặn.** Khi docx mâu thuẫn Excel → tin Excel.
8. **`docs/DECISIONS.md` (MỚI) — ĐỌC TRƯỚC TIÊN khi làm phần sản lượng.**
   6 quyết định chủ dự án chốt trực tiếp 2026-08-30, không hỏi lại:
   - **QĐ-01** khoá ghép đối soát CÓ Số xe → `Ngày+Ca+Máy xúc+Loại hàng+Số xe`.
   - **QĐ-02** thứ tự phép toán: `Mô hình × Số chuyến − (Trừ vơi ÷ Tỷ trọng)`
     — theo Excel thật, phép chia chỉ áp lên Trừ vơi. **Điểm chặn cuối cùng
     của phần công thức đã được gỡ.**
   - **QĐ-03** công tắc chế độ TKE/trắc địa → nút trên UI, NV Thống kê bật tắt.
   - **QĐ-04** Tỷ trọng → danh mục khai báo **theo khoảng thời gian**.
   - **QĐ-05** thêm **Danh mục Kỳ báo cáo** (5 kỳ/tháng: 1-7, 8-14, 15-21,
     22-28, 29-hết tháng).
   - **QĐ-06** khoá ghép chuỗi "Nhóm vỉa+Máy xúc" → dựng thành **Danh mục để
     CHỌN**, không nhập tay; thành phần là cột riêng, chuỗi chỉ để hiển thị.
9. **Chốt thêm 3 điểm bổ sung cho QĐ-03/04/05** (cùng ngày, đã ghi vào
   `DECISIONS.md`): (a) kỳ báo cáo khai trong danh mục theo **khoảng thời
   gian**, gán bản ghi theo ngày rơi vào khoảng nào — số kỳ/tháng KHÔNG cố
   định 5, không hard-code quy tắc 1-7/8-14/…; (b) mốc tra tham số theo
   thời gian = **ngày/ca sản xuất của bản ghi**, không phải ngày chạy báo
   cáo → tính lại phải tái lập được; (c) đổi chế độ TKE trên kỳ đã chốt:
   **cho đổi nhưng bắt mở khoá + ghi vết** (lưu cả giá trị trước/sau, báo
   cáo đã xuất trở thành lỗi thời).
10. **Kỷ luật chung rút ra cho MỌI danh mục có khoảng thời gian / khoá tra
    cứu**: chặn chồng lấn, chặn khoảng hở, và khi tra trượt thì **báo lỗi
    nghiệp vụ rõ ràng — tuyệt đối không trả 0 hay bỏ qua âm thầm** (đây
    đúng là chỗ Excel đang im lặng trả `#N/A`).
11. **3 câu hỏi mở còn lại đã được mô tả chi tiết** ở
    `REQUIREMENT_SANLUONG_EXCEL.md` **mục 6** (chờ chủ dự án trả lời).
12. ✅ **DÒNG CHUẨN CỦA SHEET `tinh toan` = DÒNG 5** (đã quét toàn bộ
    55.161 dòng, xác nhận chắc chắn). Lý do: dòng 5 là **dòng MASTER của
    shared formula** — ô của nó khai `<f t="shared" ref="AL5:AL68" si="2">…`
    chứa **văn bản công thức gốc**, các dòng khác chỉ trỏ về (`<f
    t="shared" si="2"/>`). Dòng 5 có 139 công thức + 203 ô (nhiều nhất cùng
    27 dòng khác); dòng 11 nhiều ô nhất (205) nhưng công thức chỉ là tham
    chiếu về dòng 5.
    **DÒNG 4 = HÀNG TIÊU ĐỀ** — 207 ô chứa **tên cột tiếng Việt chính
    thức** → `docs/_source/excel-tinhtoan-header-row4.txt`. Sheet đóng băng
    5 dòng đầu (`ySplit=5`), dữ liệu thật từ dòng 6. Kích thước: 55.161
    dòng × 206 cột (A..GY), XML 783 MB.
13. 🚨 **HAI ĐÍNH CHÍNH — công cụ đọc XML tôi tự viết từng cho kết quả sai,
    ĐỪNG lặp lại:**
    (a) Lỗi 1: sau `ReadElementContentAsString()` con trỏ đã tự nhảy node,
    vòng lặp `Read()` thêm lần nữa nên bỏ qua `</c>` và **gán công thức của
    ô sau cho ô trước** → tôi từng kết luận nhầm "sheet không nhất quán,
    cột đổi nghĩa theo dòng". SAI. Sửa bằng `ReadOuterXml()` cho từng `<c>`.
    (b) Lỗi 2: regex `<f…>…</f>` **bỏ sót shared formula thẻ tự đóng**
    `<f t="shared" si="…"/>` → tôi từng kết luận nhầm "đa số dòng đã bị dán
    cứng thành giá trị". SAI. Kiểm chứng XML thô: `AL1250` =
    `<f t="shared" si="1552"/><v>37</v>` — có công thức.
    **Sự thật: sheet NHẤT QUÁN, mọi dòng dữ liệu đều đủ 133–139 công thức.**
14. **Công thức dòng 5 đã kiểm chứng số học trên dữ liệu thật dòng 1250**:
    `AN = AM × L` (382.475 = 96.829 × 3.95) ✓; tỷ trọng `AM/AL = 2.617` =
    đúng hằng số khu vực CS ✓; `BG = AN×BF/1000 = 57.084` ✓; `BK = 0.5%×BG`
    ✓ (xe CAT777E đúng nhóm 0.5%); khoá `CR1250 = 11._-225_p30._CS_BK` đúng
    cấu trúc ✓. Bằng chứng: `docs/_source/excel-tinhtoan-row1250.txt`.
15. **Khoảng trống lớn nhất phát hiện được** giữa sơ đồ và code hiện có:
    (a) phần "Công thức" trong "Danh mục và Công thức", (b) module "Thống kê
    Sản lượng (Báo cáo)" — cả hai chưa thấy đối ứng rõ trong bản đồ code.
    Ngoài ra đối soát trong sơ đồ có **2 cấp + vòng lặp trả lại**, cần xác
    minh `ReconciliationController` hiện có hỗ trợ tới đâu.
16. **Công cụ đọc .docx/.xlsx đã lưu vào repo** →
    `docs/_source/tools/` (PowerShell thuần — máy này KHÔNG có Python/Node
    trên PATH). Đọc `docs/_source/tools/README.md` **trước khi tự viết công
    cụ mới** — nó ghi rõ 2 cái bẫy ở mục 13 kèm cách tránh.
17. **TG-01 — TẠM GÁC theo yêu cầu chủ dự án**: ngoại lệ `+15` cho tổ hợp
    `CS/u8./12./tầng 160`, và biến thể công thức Nhóm tầng ở dòng 3 (mốc cắt
    `5`, kết quả `-10`, lệch 10 mét so với bản chuẩn). Cả hai CÓ THẬT nhưng
    chỉ nằm ở vùng nháp dòng 1-3; toàn bộ 55.161 dòng dữ liệu dùng bản
    chuẩn. Chủ dự án sẽ trả lời khi có thêm thông tin. Chi tiết đầy đủ +
    hướng xử lý tạm: `docs/DECISIONS.md` mục **TG-01**. **Code theo bản
    chuẩn dòng 5, KHÔNG cài ngoại lệ `+15`.**

## Đã làm — lượt 4 (2026-08-31, CÓ SỬA CODE — dựng engine tính sản lượng)

Lượt này chuyển từ tài liệu sang code thật. Chủ dự án yêu cầu làm tuần tự:
rà soát chuẩn hoá danh mục → dựng danh mục → gom nhóm → công thức → bảng
tính cuối dưới menu **"Báo cáo thống kê"** dựng theo sheet `tinh toan`.

Báo cáo rà soát sống ở `docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md` — đọc file đó
trước khi đụng vào phần sản lượng, nó ghi cả những chỗ CÒN VƯỚNG.

### Kiến trúc tính toán — BA lượt, hai chốt chặn (KHÔNG phải hai lượt)

Bản thiết kế cũ ghi "hai lượt" là SAI. `Ap Tkm` gom từ cột `DW` chứ không
phải `AM`, nên phải:

1. **Lượt 1** `TripBaseCalculator` — trị số theo từng chuyến (AL/AM/AN,
   nhóm mã hoá hàng CC–CG, BT/BU/BV).
2. *Chốt chặn 1* — gom nhóm, tính hệ số trắc địa.
3. **Lượt 2** — áp hệ số.
4. *Chốt chặn 2* — gom `Ap Tkm` từ `DW`.
5. **Lượt 3** `FuelCalculator` — chuỗi 11 bước BA→BQ + BR.

### Danh mục dạng LƯỚI có PHIÊN BẢN theo thời gian

Bốn lưới (`MO_HINH`, `DMNL`, `NANG_SUAT_XE`, `HSDML`) dùng chung một
controller/service/màn hình, phân biệt bằng `code`.

**Định mức KHÔNG phải hằng số** — nhân viên thống kê khai lại theo kỳ, tên
sheet gốc nói thẳng điều đó (`DMNL T2-2025`). Mỗi lưới giữ NHIỀU phiên bản
có khoảng hiệu lực; engine tra theo **ngày sản xuất của chuyến**, không lấy
bản mới nhất. Nhờ vậy khai định mức tháng sau không làm đổi báo cáo tháng
trước.

- Tạo phiên bản mới mặc định **sao chép toàn bộ ô** (lưới có hàng nghìn ô,
  bắt nhập lại từ đầu mỗi kỳ là không dùng được) và **đóng** phiên bản
  nguồn ở ngày liền trước.
- Xoá phiên bản thì **mở lại phiên bản liền trước** — phép nghịch, để
  không thủng khoảng thời gian nào. Không cho xoá phiên bản cuối cùng.
- Mọi thao tác sửa gửi kèm `versionId`: mở phiên bản tháng trước để đối
  chiếu rồi lỡ sửa một ô thì phải ghi vào ĐÚNG phiên bản đó.

⚠ **Bắt buộc chạy `backend/migration-2026-08-31-matrix-phien-ban.sql`** khi
deploy — xem mục "Bẫy đã vấp".

### Lỗi thật đã tìm ra trong code ĐÃ PHÁT HÀNH (đều đã sửa)

Đối chiếu lại với Excel gốc, không phải suy đoán:

1. **Khoá cột lưới Mô hình thiếu hậu tố khu vực.** Excel:
   `DA5 = INDEX(DSXE,…) & IF(D5="CS",".CS",".KC")`. Code dùng `CAT777E`
   trần. Sửa qua `ProductionKeys.vehicleFuelClassKey`.
2. **Phân loại Đất/Than suy sai.** Excel:
   `AD5 = IF(OR(LEFT(AG5,1)="S", LEFT(AG5,1)="D"), "DAT", "Than")` — lấy
   CHỮ CÁI ĐẦU, không phải tiền tố `Dat_`/`Than_`.
3. **Thiếu `Ký hiệu bùn` trong khoá ghép.** `BW5` là một thành phần khoá,
   code truyền `null`. Đã verify đủ 6 nhánh.
4. **`CatalogFormModal` kiểm trùng mã bỏ qua `uniqueCodeKey`** — sẽ từ
   chối nhầm hai kỳ trong cùng một năm.
5. **Màn thuộc tính thiết bị hiện nút xoá** — bấm vào là xoá cả cái XE.
6. **Dòng tiêu đề nhóm 0 của báo cáo bị `sticky left-0`** — che hết các
   tiêu đề nhóm khác khi cuộn ngang.

### Ba cột CÒN VƯỚNG, chưa có quy tắc

- `BO` (BSNL_Spnt_CN) — để 0, có ghi chú trong `FuelCalculator`.
- `BX` (Thể trọng bùn).
- `BY`/`BZ`/`CA`/`CB` (nhóm Tổng … trừ bùn).

Hai bảng trung gian còn treo: `AP BBNT xe-SP` (chờ chủ dự án xác nhận *Tên
nghiệm thu* do người nhập, khoá hệ tự sinh) và `DuKien HS theo -2%`
(khuyến nghị GÁC — nó chỉ là nguồn cho lưới HSDML, mà ba nơi tiêu thụ
`EE`/`EG`/`EI` chưa có tài liệu).

## Đã làm — lượt 5 (2026-09-04)

Chuỗi yêu cầu UI/danh mục nhỏ, mỗi việc 1 commit riêng trên `claude-dev`:

1. **STD (Đất SX/Than SX)** — sửa lỗi id không ổn định khi lưu (chuyển
   sang lưu kiểu diff: bản ghi có `originalId` thì update-in-place, xoá
   trước khi tạo mới đúng thứ tự) — commit `d49dfc4`.
2. **STD (Đất CN)** — dùng chung component với STD (Đất SX/Than SX), tham
   số hoá bằng `catalogType` — commit `389eeae`.
3. Thêm danh mục **"AP Tdia (m3-tan-tkm)"** — chỉ xem, đọc từ
   `SurveyCoefficient` có sẵn — commit `60bc15b`.
4. **STD (cả 2 loại)** — đổi sang khai theo NĂM, dấu "+" thay dấu copy để
   tách khoảng thời gian, bảng ngoài gộp theo năm (STT/Thời gian/thao
   tác), sửa là sửa cả bảng năm đó — commit `d1671e5`.
5. **STD (cả 2 loại)** — check nối tiếp thời gian khi tách (không trùng/
   không hở giữa khoảng cuối dòng trên và đầu dòng dưới), định dạng hiển
   thị `dd/mm/yy` — commit `6760da9`.
6. **Trang "Báo cáo thống kê"** dựng lại hoàn toàn theo mockup HTML khách
   cung cấp (KPI cards, nhóm cột tô màu, chọn cột hiển thị, drawer chi
   tiết, bộ lọc, bảng sort/phân trang) — commit `fb9047c`. Bẫy CSS đã vấp:
   `<table>` trong `overflow-auto` lồng trong `flex flex-col` không có
   chiều cao cố định sẽ co về ~0px khi thêm nhiều "chrome" (KPI/filter) ở
   trên — sửa bằng `max-height` cố định (giống chính CSS gốc của mockup),
   không dùng `flex-1 min-h-0`.
7. **Danh mục "Áp Trắc Địa (m3-tấn-tkm)"** — gom nhóm lại theo SẢN PHẨM
   (Đất CN / Đất SX / Than SX) thay vì theo loại chỉ số, tô màu riêng mỗi
   nhóm — commit `0852cad`.
8. **Báo chuyến Vận tải** — thêm 6 trường: Ngày mưa, Khối lượng qua cân
   (tấn), Mô hình (tạm tính), Tỷ trọng (tạm tính), Lái xe bổ túc (check
   box), Trừ vơi (đất-m3, than-tấn) — commit `182ff16`. **Chỉ áp dụng cho
   Vận tải** — ban đầu làm cả Khai thác theo yêu cầu gốc, nhưng chủ dự án
   sau đó thu hẹp phạm vi ("Bên khai thác đủ rồi... Khai thác bạn back về
   như lần trước cho mình"); đã `git checkout --` 6 file phía Khai thác về
   nguyên trạng + `ALTER TABLE excavation_report_trips DROP COLUMN` 4 cột
   Hibernate `ddl-auto: update` đã tự tạo trước khi revert (nó không tự
   xoá cột không dùng nữa). Backend cho Vận tải **đã có sẵn** 6 trường này
   từ trước (chỉ thiếu UI) — không cần sửa backend, chỉ sửa
   `TransportHeaderDetailModal.tsx`, `useTransportDraftStore.ts`,
   `transportTripReportService.ts`. Đã verify UI render đúng thứ tự cột +
   verify round-trip request payload (field name/type khớp DTO) qua
   network log thật + verify chiều đọc ngược (set giá trị thẳng trong DB,
   mở lại form edit, xác nhận hiện đúng) — không verify được lưu-rồi-đọc-
   lại trọn vòng vì vướng lỗi có sẵn ở mục dưới.

⚠ **Lỗi có sẵn phát hiện khi verify mục 8 (KHÔNG phải do lượt này gây
ra, chưa sửa):** Tạo mới báo chuyến Vận tải (`POST /api/transport-
reports`) luôn báo lỗi backend `"Khu vực xúc không tồn tại: <id>"` (404)
với BẤT KỲ giá trị "Khu vực xúc" nào chọn từ UI. Nguyên nhân: cột
`excavation_area_id` trong `transport_report_trips` có FK thật tới bảng
riêng `excavation_areas` (có `ExcavationAreaController` + trang danh mục
`ExcavationAreas.tsx`), nhưng
`transportTripReportService.ts#buildTransportTripRequestItem` lại tra
"Khu vực xúc" từ `rawLocations`/`rawDepartments` (2 danh sách SAI) thay vì
gọi API `excavation-areas` — id tìm được không khớp bảng `excavation_
areas` nên backend từ chối. Bản ghi cũ (id=1) trong DB có sẵn giá trị text
"Khu Bắc" cũng không tự resolve được vì cùng lý do — nghĩa là **tạo mới
báo chuyến Vận tải qua UI hiện KHÔNG DÙNG ĐƯỢC**, không riêng gì lượt này.
Việc sửa cần: thêm fetch `rawExcavationAreas` (endpoint có sẵn) vào
`TransportEntryPage.tsx`/modal, đổi nguồn tra trong hàm map ở trên. Chưa
hỏi ý chủ dự án có muốn sửa ngay hay không — ngoài phạm vi yêu cầu 6
trường của lượt này.

## Việc cần làm tiếp (ưu tiên theo thứ tự)

0. **ĐÃ CÓ THIẾT KẾ → `docs/DESIGN_SANLUONG.md`** (2026-08-30). Mô hình dữ
   liệu + kiến trúc tính toán, **chưa code dòng nào**. Điểm chính:
   - **Model báo công hiện có ĐÃ ĐÚNG, giữ nguyên** — `ExcavationReport(Trip)`
     và `TransportReport(Trip)` đã là phiếu-đầu + n-dòng-chuyến, nhiên liệu
     nằm ở cấp PHIẾU (đúng chỗ tôi lo sẽ bị nhân đôi). `LoadLevel`
     (@Embeddable) khớp Mức tải; `receivingFloorGroup` đã có; `CargoType →
     CargoGroup` đã có (docx nói "chưa có" là sai).
   - **Bổ sung vào entity cũ**: `ExcavationReportTrip.unloadingPoint` (Vị trí
     đổ — đang THIẾU, không có thì không đối soát được điểm đổ); `unit` trên
     2 phiếu; cờ trên `Device`/`Location`/`CargoType` để thay hard-code.
   - **`ReconciliationDecision` phải thiết kế lại**: hiện là 1-1 với MỘT dòng
     chuyến, **không mô hình hoá được việc GHÉP CẶP** — mà ghép cặp mới là
     bản chất đối soát (QĐ-01). Thêm `ReconciliationPair` bên cạnh, KHÔNG xoá
     entity cũ.
   - ~12 nhóm entity mới: tham số theo thời gian, bảng tra trắc địa, kỳ báo
     cáo, trường Thống kê nhập bổ sung, kết quả tính + snapshot + audit.
   - Engine tính là **hàm thuần, không đụng DB, không có quyền gọi
     `now()`** (ép nguyên tắc tra tham số theo ngày sản xuất — QĐ-04).
   - 25 bước tính xếp theo 6 lớp phụ thuộc; lỗi tra trượt thu thập rồi báo
     gộp; **kỳ có lỗi chưa xử lý thì KHÔNG được chốt**.
   - Máy trạng thái đối soát 2 cấp với `RETURNED_TO_MINING` /
     `RETURNED_TO_TRANSPORT` tách riêng (trả đích danh bên sai).
   - Lộ trình G1→G8; **G4/G5 đối chiếu số với dòng 1250 của Excel**.
   - **QĐ-08 đã chốt: dùng `BigDecimal`.** Phạm vi đã rà thật: 19 trường
     `Double` trong `model/`, **18 file backend + 10 file frontend** tham
     chiếu → thay đổi diện rộng trên code đang chạy, **bắt buộc áp kỷ luật
     chống hồi quy**. Ba bẫy đã ghi trong QĐ-08: `divide()` không khai scale
     sẽ ném `ArithmeticException` (hệ số Roda `2/3` là số vô hạn tuần hoàn!);
     so sánh phải dùng `compareTo` chứ không `equals`; cột DB phải đổi
     `double precision` → `numeric(p,s)`.
   - **5 điểm còn lại cần quyết định** — mục 8 của `DESIGN_SANLUONG.md`.
     Mới phát sinh và đáng chú ý nhất là điểm 2 (xem mục 13 dưới).
13. ⚠ **PHÁT HIỆN MỚI — `Material` và `CargoType` có thể trùng vai trò.**
    Khi rà phạm vi QĐ-08 thấy `Material` + `MaterialValueHistory`
    (`@Embeddable`: `density`, `dryDensity`, `startTime`, `endTime`) —
    **đã gần đúng danh mục Tỷ trọng theo thời gian mà QĐ-04 yêu cầu**, và
    `Material.acceptedProduct` chính là Sản phẩm nghiệm thu. Nhưng: không có
    id riêng (không audit/snapshot được), `endTime` mặc định `now()` nên bản
    ghi **hết hiệu lực ngay khi tạo**, dùng `LocalDateTime` thay vì
    `LocalDate`, và **thiếu chiều Khu vực xúc** (Excel tra tỷ trọng theo
    Chủng loại hàng × Khu vực xúc). Câu hỏi chưa trả lời: `CargoType` và
    `Material` là **một khái niệm bị tách đôi** hay hai khái niệm khác nhau?
    Chi tiết: `DESIGN_SANLUONG.md` mục 2.4. **Chưa tự quyết** — phải rõ
    trước khi code G2.
   Câu hỏi mở còn lại (KHÔNG chặn), ở `docs/REQUIREMENT_WORKFLOW.md` mục 9:
   ngưỡng sai lệch đối soát; mức tải lệch có tính sai lệch không; mẫu báo
   cáo sản lượng; Số xe bên VT là text hay danh mục; trả lại ở lần 2 có phải
   làm lại toàn bộ lần 1; có điều chỉnh sau chốt không; và **tên tài liệu
   gốc nhắc "Phần mềm Điều phối máy móc thiết bị Cao Sơn"** (ranh giới hệ
   thống — có thể mâu thuẫn với "THONGKE-CAOSON độc lập" trong CLAUDE.md).
1. ~~Đăng ký THONGKE-CAOSON như 1 Application trong PORTAL-PM~~ → **ĐÃ CÓ
   SẴN (kiểm tra 2026-08-30)**. Ghi chú cũ "Portal preview DB rỗng, chưa có
   admin nào" là **SAI**. Thực tế trong `portal-pm-local-portal-db-1`
   (MySQL, db `portal`): **application id 13, code `tkcs`, url
   `http://thongke-caoson.preview.localhost:8080/`, `is_active=1`**, thuộc
   company 3 "Công ty CP Than Cao Sơn"; có sẵn 1 user `admin`.
   `VITE_PORTAL_URL=http://localhost:18090/` trong preview-compose trỏ đúng
   reverse-proxy của Portal (trả HTTP 200). **Wiring đã đủ.**
   - App `tkcs` **chưa có module nào** trong bảng `modules` — nhưng hiện
     KHÔNG cần: **không controller nào của THONGKE-CAOSON dùng
     `@RequirePermission`**, `PermissionFilter` bước 3 cho qua khi không có
     annotation. Cổng duy nhất đang có hiệu lực là **xác thực**
     (`.anyRequest().authenticated()`), không phải phân quyền. Khi bắt đầu
     gắn `@RequirePermission` thì mới phải khai module + cấp quyền bên Portal.
   - **Việc còn lại để xem được UI: phải ĐĂNG NHẬP Portal** — cần mật khẩu
     của user `admin` bên Portal. Tôi không đoán/không nhập mật khẩu (quy tắc
     dự án mục 8 + quy tắc an toàn). Chủ dự án tự đăng nhập tại
     `http://localhost:18090/`, Portal sẽ redirect kèm `?code=` sang
     `http://thongke-caoson.preview.localhost:8080/`.
2. Bridge network Portal (`docker network connect ...`) là thao tác TAY,
   không tự động — cân nhắc script hoá nếu preview cần dựng lại nhiều lần.
3. Test backend vẫn cần Postgres/Redis sống (chưa có Testcontainers/H2) —
   ngoài phạm vi 2 lượt vừa qua.
4. Thiết kế cơ chế tích hợp với DIEU-PHOI-MM (chưa bắt đầu, chỉ mới xác
   nhận hướng "sẽ tích hợp sau này qua cơ chế riêng").
5. `automation.allow_apply_code` vẫn TẮT — chủ dự án tự quyết định bật sau
   khi review diff lượt sửa lớn này.
6. Xác nhận `SignInPage` (orphan, không route nào dùng) là chủ đích hay dở
   dang.

## Nếu phiên sau cần tiếp tục — BÀN GIAO

### Thứ tự đọc

**Nếu làm về NGHIỆP VỤ / SẢN LƯỢNG (việc chính hiện nay):**

1. File này.
2. **`docs/DECISIONS.md`** — 7 quyết định đã chốt + 1 mục tạm gác.
   **Không hỏi lại chủ dự án những điều đã có trong đây.**
3. `docs/REQUIREMENT_WORKFLOW.md` — luồng nghiệp vụ, vai trò, trường nhập liệu.
4. `docs/REQUIREMENT_SANLUONG.md` — danh mục + công thức (bản văn xuôi từ docx).
5. **`docs/REQUIREMENT_SANLUONG_EXCEL.md`** — công thức THẬT từ Excel.
   **Khi mục 4 và mục 5 mâu thuẫn → TIN MỤC 5.**

**Nếu làm về KỸ THUẬT / HẠ TẦNG:** file này → `docs/TECHNICAL_DEBT.md` (đặc
biệt phần "Đã sửa" — đừng tưởng các mục cũ còn hiệu lực) →
`docs/ARCHITECTURE_CURRENT.md` → `docs/CODEBASE_MAP.md`.

### Nguồn sự thật cho phần tính sản lượng

| Thứ tự tin cậy | Nguồn |
|---|---|
| 1 | Quyết định của chủ dự án — `docs/DECISIONS.md` |
| 2 | Công thức Excel thật — `docs/_source/excel-tinhtoan-row5-formulas.txt` |
| 3 | Tên cột chính thức — `docs/_source/excel-tinhtoan-header-row4.txt` |
| 4 | Đặc tả docx — `docs/_source/module-thong-ke-san-luong.txt` |

Toàn bộ `docs/_source/` là **nguyên bản, KHÔNG SỬA**. File gốc của khách
nằm ở `D:\EcoTel\3. Dự án\TKV Công ty than Cao sơn\Phần mềm thống kê\Yêu cầu\`
(1 .docx + 2 .xlsx) — nhưng **không cần mở lại**, mọi thứ đã trích ra
`docs/_source/`.

### Bẫy đã vấp — đừng lặp lại

- **KHÔNG giả định** còn MongoDB hay bảo mật đang tắt — cả hai đã thay đổi
  ở lượt 2. Đọc thẳng `SecurityConfig.java`/`pom.xml` nếu nghi ngờ.
- **KHÔNG tự viết lại công cụ đọc .xlsx** trước khi đọc
  `docs/_source/tools/README.md`. Hai lỗi parser ở đó đã khiến tôi báo cáo
  sai cho chủ dự án hai lần (mục 13 phần "Đã làm — lượt 3").
- **KHÔNG `grep` thẳng vào `xl/worksheets/sheet78.xml`** — giải nén ra
  783 MB, treo quá 2 phút. Dùng script trong `docs/_source/tools/`.
- **KHÔNG đoán công thức** khi tài liệu docx mơ hồ — tra Excel thật. Bản
  docx thiếu ngoặc/sai tên ở ~15 chỗ, đã đối chiếu xong 14/15.
- **Hibernate `ddl-auto: update` KHÔNG BAO GIỜ XOÁ ràng buộc cũ.** Nó chỉ
  tạo thêm. Đổi ràng buộc duy nhất `(code)` thành `(code, effective_from)`
  của `matrix_definitions` mà không chạy migration thì ràng buộc cũ còn
  nguyên và chặn mọi phiên bản thứ hai với lỗi `duplicate key … uk_matrix_
  definition_code`. Xem `backend/migration-2026-08-31-matrix-phien-ban.sql`.
- **`awk -v` DIỄN GIẢI escape trong giá trị truyền vào** — `\"` thành `"`,
  `\n` thành xuống dòng thật. Chèn khối mã Java/TS bằng `awk -v blk=…` đã
  làm hỏng chuỗi có dấu ngoặc thoát và build fail. Dùng công cụ Edit cho
  khối có escape.
- **Git Bash làm hỏng tiếng Việt trong `curl -d`** → lỗi "Invalid UTF-8"
  500 là do bộ test, không phải do ứng dụng. Dùng dữ liệu ASCII, hoặc
  `--data-binary @file` với file ghi bằng công cụ Write.
- **Tên CSDL preview là `thong_ke`**, không phải `thongke_caoson`. Bảng kỳ
  báo cáo là `report_periods`; cột khoá ngoại ở `production_results` là
  `report_period_id`. Endpoint tính lại là
  `POST /api/production/calculate?periodId=…`.

### Trạng thái Git

Nhánh `claude-dev`. Lượt 4 đã commit theo từng phần (danh mục → gom nhóm →
công thức → báo cáo → phiên bản định mức); commit cuối `dae0006`
*"feat(danh-muc): dinh muc dang luoi co phien ban theo thoi gian"*. Tài
liệu lượt 3 đã commit cùng.

`.codex/` và `AGENTS.md` ở thư mục gốc **không phải của phiên này** — để
nguyên chưa commit, đừng gom vào.
## Dữ liệu mẫu preview (2026-08-30)

`backend/seed-data-khai-thac.sql` — bổ sung cho `seed-data.sql` (file cũ chỉ
seed departments/positions/shifts/locations/admin). File mới thêm: 3 phân
xưởng VT7/VT8/VT9, ca 4, 4 nơi chất tải KX1..KX4, 4 chủng loại thiết bị,
4 máy xúc P15..P18, 9 xe, 2 nhóm hàng + 3 chủng loại hàng, 4 công nhân
(thẻ lương 8753..8756), **6 phiếu báo chuyến + 11 dòng chuyến**.

Dữ liệu đặt theo đúng ảnh mockup để kiểm chứng giao diện được. Chạy lại
nhiều lần được (mọi INSERT đều `ON CONFLICT DO NOTHING`).

```bash
docker exec -i thongke-caoson-preview-postgres-1 psql -U postgres -d thong_ke < backend/seed-data.sql
docker exec -i thongke-caoson-preview-postgres-1 psql -U postgres -d thong_ke < backend/seed-data-khai-thac.sql
```

Phân bố: KX1/tầng 300/ca 1 = 2 phiếu 5 chuyến · KX2/250/ca 2 = 2 phiếu 4
chuyến · KX3/200/ca 3 = 1 phiếu 1 chuyến · KX4/150/ca 4 = 1 phiếu 1 chuyến.
