# Context — THONGKE-CAOSON

Cập nhật lần cuối: 2026-09-07 (lượt 8 — sửa nốt cùng lỗi combobox che
hàng tiêu đề bảng ở màn Tỷ trọng, xem mục 17). Trước đó 2026-09-05
(lượt 7 — chủ dự án đã tự đăng nhập và
click-through thật DMNL, báo 2 lỗi cụ thể + 1 yêu cầu redesign, cả 3 đã
sửa/dựng lại và build+deploy sạch; xem mục "Đã làm — lượt 7"). Lượt 6
— thêm danh mục Chủng loại xe/Nhóm hạng xe/Hạng xe, dựng lại Định mức
nhiên liệu thành 2 màn Thêm mới + Quản lý theo mockup. Lượt 5 (2026-09-04)
— thiết kế lại các
danh mục STD/Áp Trắc Địa, dựng lại trang Báo cáo thống kê theo mockup,
thêm 6 trường báo chuyến cho Vận tải, sửa lỗi không tạo mới được báo
chuyến Vận tải (3 trường tra sai danh mục). Lượt 4 (2026-08-31) — dựng
engine tính sản lượng + danh mục dạng lưới có phiên bản theo thời gian.
Lượt 3 (2026-08-30) chỉ tài liệu. Lượt 2 (2026-08-29) — chuyển DB độc
lập + bật lại bảo mật + dựng preview sống thật. Đọc file này TRƯỚC khi
tiếp tục — tin file này hơn lịch sử chat đã bị nén.

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

✅ **Lỗi phát hiện khi verify mục 8 — ĐÃ SỬA cùng ngày (2026-09-04),
commit `6feb8b6`.** Tạo mới báo chuyến Vận tải (`POST /api/transport-
reports`) luôn báo lỗi backend 404 với BẤT KỲ giá trị nào chọn từ UI cho
CẢ BA trường "Khu vực xúc", "Nơi nhận tải", "Nơi dỡ tải" (không chỉ Khu
vực xúc như phát hiện ban đầu — vá xong Khu vực xúc thì lộ tiếp lỗi y hệt
ở 2 trường kia, phải vá cả ba mới tạo mới được thật). Nguyên nhân: ba cột
FK (`excavation_area_id`, `loading_point_id`, `unloading_point_id`) trỏ
tới BA bảng danh mục riêng (`excavation_areas`, `receiving_points`,
`unloading_points`, mỗi bảng có controller riêng), nhưng
`transportTripReportService.ts#buildTransportTripRequestItem` tra cả ba
từ `rawLocations`/`rawDepartments` (danh mục "locations" chung, SAI) —
id tìm được không khớp bảng đích nên backend từ chối. Bản ghi cũ (id=1,
seed data) mang giá trị text kiểu "Khu Bắc"/"Kho số 1" cũng không tự
resolve được vì cùng lý do (record đó hiện chỉ SỬA được các trường khác,
không sửa lại 3 trường vị trí — text cũ không khớp danh mục mới; chưa
xử lý, coi là dữ liệu seed cũ có thể bỏ qua).

**Fix:** thêm 3 API fetch mới vào `useMasterData.ts`
(`fetchExcavationAreas`/`fetchReceivingPoints`/`fetchUnloadingPoints`,
endpoint `/excavation-areas`, `/receiving-points`, `/unloading-points`
đã có sẵn ở backend) → `rawExcavationAreas`/`rawReceivingPoints`/
`rawUnloadingPoints` + option list riêng; đổi nguồn 3 combobox trong
`TransportHeaderDetailModal.tsx` và logic tra ID trong
`buildTransportTripRequestItem`/`buildTransportReportRequest`
(`transportTripReportService.ts`) sang dùng đúng danh mục. Backend không
đổi gì (3 endpoint đã tồn tại từ trước, chỉ frontend chưa gọi tới).

Đã verify sống: tạo mới bản ghi Vận tải đầy đủ (khu vực xúc "Khu 1", nơi
nhận "Kho trung chuyển 1", nơi dỡ "Kho A") → `POST` trả `200`/`Created
successfully`, dữ liệu trả về đúng id + tên; đã xoá bản ghi test khỏi DB
sau khi verify. Verify Mining không hồi quy: `useMasterData.ts` dùng
chung nhưng chỉ THÊM field, `MiningBatchEntryModal.tsx` không đụng tới —
mở lại "Thêm chuyến" bên Khai thác, form gốc vẫn nguyên vẹn, không lỗi
console mới.

## Đã làm — lượt 6 (2026-09-05)

1. **3 danh mục mới** (commit `094da4b`): "Chủng loại xe" (độc lập, KHÔNG
   trùng với 2 danh mục "Chủng loại xe + DMNL"/"+ Phân loại" đã có từ
   trước — đã hỏi và chủ dự án xác nhận đây là danh mục thứ 3, mục đích
   khác), "Nhóm hạng xe" (Mã/Tên/Ghi chú), "Hạng xe" (Mã/Xếp hạng/Nhóm
   hạng xe [FK bắt buộc]/Ghi chú — theo đúng mẫu quan hệ cha-con
   CargoGroup/CargoType). Cả 3 dùng chung `CatalogPage`/`CatalogFormModal`
   có sẵn, chỉ thêm backend entity/dto/mapper/repository/service/
   controller theo khuôn `ExcavationArea` + 1 dòng config + 1 trang
   wrapper + route/menu — không sửa danh mục cũ nào. Cột DB `rank_order`
   (không đặt tên `rank` — từ khoá cửa sổ trong chuẩn SQL).
2. **Định mức nhiên liệu (DMNL) — dựng lại thành 2 màn theo 2 mockup HTML
   chủ dự án cung cấp** (commit `7d44b0b`): "Thêm mới bộ định mức" và
   "Quản lý" (danh sách + bộ lọc + KPI + biểu đồ xem trước). Phát hiện
   quan trọng: DMNL **đã có sẵn** từ lượt 4, là 1 trong 4 "lưới có phiên
   bản theo thời gian" dùng chung (`MatrixDefinition`/`MatrixAxisEntry`/
   `MatrixCell` + `MatrixCatalogController`/`Service`). "Bộ định mức theo
   Chủng loại xe + Hậu tố" trong mockup **suy hoàn toàn ở frontend** từ
   quy ước khoá cột đã có (`<mã xe>.<CS|KC>_<cung độ>`, đối chiếu đúng
   `FuelNormInterpolator.java` + công thức Excel gốc) — KHÔNG đổi schema
   `MatrixDefinition`/`MatrixAxisEntry`/`MatrixCell` (tránh ảnh hưởng 3
   lưới dùng chung: MO_HINH/NANG_SUAT_XE/HS_DIEU_CHINH_NLDM). Hậu tố thật
   chỉ có 2 giá trị `.CS`/`.KC` (không phải `.BK/.DAT/.THAN/.SP` minh hoạ
   trong mockup).
   - Backend CHỈ thêm (không đổi hành vi cũ): `MatrixVersionRequest` thêm
     field `note`; endpoint mới `PUT /api/matrix-catalogs/{code}/versions/
     {versionId}` + `MatrixCatalogService.updateVersionMeta` (sửa ngày
     hiệu lực/nhãn/mô tả của 1 phiên bản đã có, không đụng ô/trục — cần
     cho nút "Sửa" ở màn Quản lý, tránh phải xoá-tạo-lại làm mất hết ô).
   - Frontend: module mới `frontend/src/modules/catalog/fuelnorm/`
     (`fuelNormKeys.ts` — hàm thuần suy nhóm cột + nội suy song tuyến
     PORT TypeScript của `FuelNormInterpolator.java` CHỈ để xem trước UI;
     `FuelNormAddPage.tsx`, `FuelNormOverviewPage.tsx`,
     `FuelNormChartPanel.tsx`, `FuelNormAddDatasetModal.tsx`,
     `fuelNormExcelImport.ts`). Trang lưới đầy đủ cũ (`FuelNormMatrix.tsx`/
     `MatrixCatalogPage.tsx`) **không sửa file**, chỉ dời sang route
     `/danh-muc/dinh-muc-nhien-lieu/luoi-day-du` — vẫn dùng chung
     `matrixService`, nên tự động đồng bộ với 2 màn mới, không có kho dữ
     liệu riêng nào phải giữ khớp tay (đúng yêu cầu "kiểm tra đồng bộ
     giữa Thêm mới và Quản lý" của chủ dự án).
   - Đã lập kế hoạch qua Plan Mode trước khi code (file plan:
     `witty-wandering-kernighan.md`), chủ dự án đã duyệt trước khi làm.

⚠ Tại thời điểm viết mục này (cuối lượt 6), CẢ HAI VIỆC TRÊN CHƯA
verify click-through UI thật bởi trợ lý (Browser pane bị đăng xuất, quy
tắc dự án mục 8 cấm đoán/nhập mật khẩu). **Lượt 7 xác nhận chủ dự án đã
tự đăng nhập ở phiên trình duyệt riêng của họ và test thật** — xem mục
"Đã làm — lượt 7" ngay dưới đây để biết lỗi thật đã phát hiện + đã sửa.

## Đã làm — lượt 7 (2026-09-05)

Chủ dự án tự đăng nhập (không qua trợ lý) và test thật màn DMNL, báo 3
việc qua session tương tác — cả 3 đã sửa xong, build Docker sạch
(`tsc -b && vite build` không lỗi), đã `docker compose up -d` deploy lại
frontend. Chỉ sửa file frontend, KHÔNG đụng backend/schema ở lượt này.

1. **Combobox hẹp, thừa khoảng trống** — `SelectTrigger` (shadcn) mặc
   định `w-fit` (xem `frontend/src/components/ui/select.tsx`), 3 chỗ
   trong module fuelnorm thiếu override `w-full` (đúng tiền lệ đã có ở
   `CatalogFormModal.tsx`). Đã thêm `w-full` cho `FuelNormAddDatasetModal.tsx`
   (2 combobox) và `FuelNormOverviewPage.tsx` (`FilterSelect`).
2. **Lỗi 400 khi ấn "Tạo bộ định mức"** — xác nhận qua truy vấn thẳng DB
   (`matrix_definitions` bảng DMNL đã có sẵn phiên bản `effective_from =
   2026-01-01`, id 155), form mặc định ngày `${năm hiện tại}-01-01` nên
   trùng, backend đúng chặn theo ràng buộc unique `(code, effective_from)`
   → 400 hợp lệ nhưng UI không xử lý được va chạm. Đã sửa
   `FuelNormAddPage.tsx`: kiểm tra trước khi tạo (`handleCreateClick`),
   nếu trùng ngày thì tự chuyển sang chế độ sửa phiên bản đã có thay vì
   báo lỗi. Nhân tiện phát hiện + sửa thêm 1 lỗi khác cùng chỗ:
   `createMutation.onError` không unwrap `error.response.data.message`
   (khác với `updateMetaMutation` bên cạnh đã làm đúng) nên chủ dự án
   không thấy lý do thật — đã sửa cho khớp pattern đúng.
3. **Yêu cầu redesign "Danh sách bộ định mức nhiên liệu" thành bảng tổng
   của cả năm, điền tới đâu hiện tới đó"** — trang Quản lý
   (`FuelNormOverviewPage.tsx`) trước đó liệt kê mỗi bộ dữ liệu (Chủng
   loại xe + Hậu tố) là 1 dòng phẳng trong bảng. Đã dựng lại: chọn KỲ
   (phiên bản) bằng dãy tab thay vì lọc theo năm (phát hiện quan trọng:
   1 năm dương lịch CÓ THỂ có NHIỀU phiên bản chồng nhau — đối chiếu DB
   thật thấy `2026` có cả id 155 "01/01–31/12" và id 105 "17/08–31/08" —
   nên chọn theo phiên bản chính xác hơn theo năm), sau đó hiện MỘT
   bảng duy nhất cho phiên bản đó: dòng = Độ dốc, cột = TẤT CẢ bộ dữ
   liệu (Chủng loại xe.Hậu tố_Cung độ) của phiên bản, nhóm màu theo bộ
   dữ liệu, header nhóm có sẵn nút Sửa/Sao chép/Xuất Excel. Không đổi
   dữ liệu nguồn (vẫn `matrixService`/`groupColumnsByVehicleSuffix` sẵn
   có) — chỉ đổi cách trình bày, nên dữ liệu nhập ở "Thêm mới" hiện
   ngay vào bảng này (cùng 1 nguồn, không có kho riêng phải đồng bộ tay).
   Bộ lọc "Năm áp dụng" cũ bị thay bằng tab chọn kỳ; bộ lọc "Trạng thái"
   đổi mục đích: từ lọc từng dòng phẳng sang lọc DANH SÁCH TAB kỳ hiển
   thị (ẩn kỳ hết hiệu lực/sắp tới nếu muốn); "Chủng loại xe"/"Hậu tố"/
   "Từ khoá" vẫn lọc như cũ nhưng áp lên CỘT của bảng tổng hợp thay vì
   lọc DÒNG của danh sách phẳng.

Đã build qua Docker (lock Redis đúng quy trình), verify: build TypeScript
sạch (không lỗi `tsc -b`), trang load không có lỗi console (không đăng
nhập được nên chỉ xác nhận tới màn hình đăng nhập, KHÔNG crash React) —
**chưa click-through được màn DMNL thật sau đổi vì lý do cũ (không có
mật khẩu Portal)**. Việc đầu tiên phiên sau/chủ dự án nên làm: mở lại
`/danh-muc/dinh-muc-nhien-lieu`, xác nhận bảng tổng hợp hiện đúng, tab
chọn kỳ hoạt động, dữ liệu nhập ở "Thêm mới" hiện đúng vào bảng.

Commit liên quan: `ad59191` (400 + combobox), `59a239e` (bảng tổng hợp).

**Tiếp ngay trong lượt 7** — 2 yêu cầu mới, cả hai đã sửa (commit `2205f86`):

4. **Mẫu Excel DMNL phải khớp file thật của chủ dự án** — ảnh chụp thật gửi
   kèm cho thấy sheet "DMNL T2-2025" gốc có CỘT "Cung độ" đứng TRƯỚC cột
   "Độ dốc". Tra `docs/REQUIREMENT_SANLUONG_EXCEL.md` (công thức `AP5`/
   `AQ5`) xác nhận: cột A ("Cung độ") là **danh sách mốc cung độ dùng
   chung để nội suy** (`MATCH`/`SMALL` trên cả cột), **ĐỘC LẬP hoàn toàn**
   với "Độ dốc" trên cùng dòng — không phải cặp khoá dòng. Đã thêm
   `downloadFuelNormExcel`/import tương ứng trong
   `fuelNormExcelImport.ts` (DMNL-specific, không đụng `matrixExcel.ts`
   dùng chung cho 3 lưới kia ngoài việc export thêm `cellText` + tách
   `parseMatrixRows` thuần — refactor an toàn, giữ nguyên hành vi
   `MatrixCatalogPage.tsx`). Import nhận được CẢ file cũ (không cột Cung
   độ) lẫn file mới, tự nhận diện qua `header[1] === rowAxisLabel`.
2. **Cho chọn nhiều Chủng loại xe + nhiều Hậu tố khi thêm bộ định mức,
   Cung độ nhập 1 lần dùng chung** — trước đó "+ Thêm bộ định mức" chỉ
   chọn được 1 xe + 1 hậu tố, rồi phải gõ tay từng cung độ một cho từng
   bộ. File mới `FuelNormBulkAddModal.tsx`: checkbox nhiều xe + nhiều hậu
   tố + textarea nhập danh sách cung độ 1 lần → tự sinh tích Descartes
   (xe × hậu tố × cung độ) thành cột, bỏ qua cột đã có, gọi
   `matrixService.addCols` một lần. Modal cũ `FuelNormAddDatasetModal`
   (chọn đơn) GIỮ NGUYÊN, chỉ dùng cho luồng "Sao chép" ở màn Quản lý
   (ngữ nghĩa khác — chọn đúng 1 đích để sao chép sang).

Build Docker sạch (`tsc -b` không lỗi), redirect login bình thường không
crash console. **Vẫn CHƯA click-through được** vì lý do cũ (không có mật
khẩu Portal) — việc đầu tiên phiên sau/chủ dự án nên làm: mở
`/danh-muc/dinh-muc-nhien-lieu/them-moi`, thử "+ Thêm bộ định mức" chọn
nhiều xe+hậu tố+cung độ, và tải/nhập thử file Excel để xác nhận đúng mẫu
"Cung độ" + "Độ dốc" hoạt động với dữ liệu thật.

5. **Bảng tổng hợp to + nút mở rộng, biểu đồ thu nhỏ** (commit `d6957d5`)
   — chủ dự án: "Bảng tổng hợp ... để to và cho nút expand vì đó là cái
   chính. Biểu đồ minh hoạ để bé. vẽ các chủng loại xe của bảng." Đã sửa
   `FuelNormOverviewPage.tsx`: bảng tổng hợp thêm nút mở rộng toàn màn
   hình (giống pattern `isFullscreen` đã dùng ở `FuelNormAddPage.tsx`),
   tăng chiều cao mặc định 60vh→75vh. `FuelNormChartPanel.tsx` **đổi hẳn
   ý nghĩa**: trước vẽ nhiều đường Độ dốc cho MỘT bộ dữ liệu (kèm panel
   xem trước nội suy 2 ô nhập); giờ vẽ MỘT đường mỗi bộ dữ liệu (mỗi
   Chủng loại xe+Hậu tố đang hiển thị trong bảng) tại MỘT mức Độ dốc chọn
   qua dropdown nhỏ — nhỏ gọn (`max-w-md`, cao 150px), bỏ hẳn panel nội
   suy chi tiết cũ (đúng tinh thần "để bé", chỉ còn 1 nơi dùng component
   này nên đổi thoải mái, không ảnh hưởng chỗ khác). Build sạch, verify
   redirect login không crash console (vẫn chưa click-through được, cùng
   lý do thiếu mật khẩu Portal).
6. **Biểu đồ trờm lên bảng + bỏ 2 thẻ không cần** (commit `67e3f8a`) — chủ
   dự án báo biểu đồ minh hoạ (khối riêng ngay dưới bảng tổng hợp) bị
   tràn/đè lên bảng, và yêu cầu bỏ hẳn 2 thẻ "Hướng dẫn sử dụng"/"Tải
   file mẫu" (không cần), thay bằng biểu đồ. Đã sửa: xoá khối biểu đồ
   đứng riêng, xoá 2 thẻ đó khỏi lưới sidebar 4 cột, đặt biểu đồ vào đúng
   chỗ đó (chiếm 2 cột, cùng hàng với "Cập nhật gần đây"/"Thống kê theo
   năm") — tách hẳn khỏi khối bảng nên hết chồng lấn. **Chưa xác nhận
   trực quan** (không đăng nhập được) — phiên sau/chủ dự án mở lại trang
   để xác nhận hết tràn.

⚠ Lưu ý: có commit `758e40a` ("feat(preview): publish host port...") xen
giữa các lượt sửa DMNL này — KHÔNG phải của lượt DMNL, một phiên/nguồn
khác đã commit vào cùng worktree `claude-dev`. Không đụng tới, chỉ ghi
nhận để không nhầm là của các thay đổi DMNL ở trên.

7. **Bảng bị bóp dẹt — xác nhận qua ảnh chụp màn hình thật của chủ dự án**
   (commit `8f802b4`, chủ dự án ĐÃ đăng nhập được, đây là phản hồi từ UI
   thật đầu tiên trong lượt 7). Nguyên nhân: card bảng có `min-h-0` (bỏ
   bảo vệ chiều cao mặc định của flexbox) nhưng KHÔNG có `flex-1`, trong
   khi container cha trang là `h-full flex-col` — thiếu hụt chiều cao dồn
   hết vào ĐÚNG card này (các card khác không có `min-h-0` nên được bảo
   vệ), ép bảng gần như về 0 (ảnh chụp chỉ thấy đỉnh header, không thấy
   dữ liệu). Sửa theo đúng pattern đã chạy ổn ở `FuelNormAddPage.tsx`:
   thêm `flex-1` vào card kể cả khi KHÔNG fullscreen; vùng cuộn bên trong
   đổi từ `maxHeight: 75vh` cố định sang `flex-1` luôn (tự lấp đầy không
   gian còn lại của trang). **Bài học cho lần sau**: khi 1 flex-item được
   gán `min-h-0` để cho phép co/cuộn nội bộ, LUÔN đi kèm `flex-1` cùng
   lúc — thiếu 1 trong 2 sẽ gây đúng lỗi này, dễ tái diễn nếu có màn khác
   dùng lại pattern "card + min-h-0" mà quên `flex-1`.

   **Chẩn đoán trên SAI** — chủ dự án báo "vẫn chưa được" sau khi deploy
   commit `8f802b4`. Gốc rễ thật (commit `fd87460`): `flex-1` (flex-grow)
   chỉ giúp một item GIÀNH không gian THỪA, KHÔNG hề bảo vệ nó khỏi bị ép
   khi THIẾU không gian — bảo vệ đó chỉ đến từ `min-height`. Card bảng
   vẫn có `min-h-0` (bỏ bảo vệ) nên vẫn là item DUY NHẤT có thể bị ép về
   0 bất kể có `flex-1` hay không. Thêm nữa: `MainLayout` (`main-layout.tsx`)
   đã có `<main className="flex-1 min-h-0 overflow-y-auto">` — tức là
   TOÀN TRANG vốn đã tự cuộn ở cấp `<main>`, card bảng KHÔNG CẦN (và
   không nên) tự nhét vừa `h-full` của trang. **Sửa đúng**: bỏ hẳn
   `min-h-0`/`flex-1` khỏi card ở trạng thái bình thường (chỉ còn dùng
   khi `isFullscreen` — lúc đó card là `position: fixed`, tách khỏi flex
   của trang nên áp dụng lại đúng). **Bài học đã sửa lại**: đây là lỗi
   flexbox kinh điển (grow ≠ bảo vệ khỏi shrink) — khi debug lỗi
   "bị bóp/che" tương tự sau này, luôn hỏi "phần tử có `overflow-y-auto`
   ở cấp cha xa hơn không" trước khi thêm `flex-1 min-h-0` vào con.

8. **Thêm phân trang + khung bảng rõ** (cùng commit `fd87460`, theo yêu
   cầu tiếp theo của chủ dự án) — phân trang theo dòng Độ dốc, 20
   dòng/trang, nút Trước/Sau; thêm viền `border-2` quanh vùng bảng để
   ranh giới rõ ràng ("trực quan" theo đúng từ chủ dự án dùng).
9. **Đã chèn dữ liệu DEMO trực tiếp vào DB** (theo yêu cầu "đưa vài
   thông tin vào để hiển thị thử") — phiên bản DMNL id 155 (2026-01-01→
   2026-12-31, "Đang áp dụng"), thêm 27 dòng Độ dốc (0→500, đúng dải
   tham chiếu chủ dự án từng gửi ảnh chụp), 20 cột `CAT777E.CS`/`.KC` ×
   9 cung độ, 486 ô — giá trị tính bằng công thức tuyến tính đơn giản,
   **KHÔNG PHẢI định mức thật**, chỉ để có đủ dữ liệu kiểm tra khung
   bảng + phân trang (27 > 20 dòng/trang → chắc chắn thấy "Trang 1/2").
   **Việc cần làm khi chủ dự án nhập dữ liệu thật**: xoá số liệu demo
   này (`DELETE FROM matrix_cells/matrix_axis_entries WHERE definition_id
   =155 AND ...` — cẩn thận KHÔNG xoá 4 ô gốc `200/250 × CAT777E.KC_3/_4`
   chủ dự án đã tự nhập trước đó) hoặc đơn giản là ghi đè khi nhập liệu
   thật (ô đã có giá trị demo vẫn ghi đè bình thường qua UI/Excel).

10. **Modal "Thêm bộ định mức" đánh dấu xe đã có + hiện cung độ đã có**
    (commit `8d05b24`) — chủ dự án thấy modal (screenshot) không phân
    biệt được chủng loại xe nào đã có bộ dữ liệu trong lưới. Sửa
    `FuelNormBulkAddModal.tsx`: đổi prop từ `existingColumnKeys: Set`
    sang `existingDatasets: FuelNormDataset[]` (đủ thông tin để suy ra
    cả badge "đã có" trên checkbox VÀ danh sách cung độ hiện có khi tổ
    hợp xe+hậu tố đang chọn trùng bộ đã có) — hiện luôn danh sách đó
    kèm nút xoá từng cung độ / xoá cả bộ (tái dùng đúng
    `removeColumnMutation`/`removeDatasetMutation` đã có sẵn trong
    `FuelNormAddPage.tsx`, không viết logic xoá mới).
11. Cùng lượt, 2 việc nhỏ từ ảnh chụp màn "Thêm mới": (a) nút "Lưu" bị
    disable khi chưa sửa ô nào — xác nhận đây là ĐÚNG hành vi (Lưu chỉ
    dành cho giá trị ô, thêm cột/dòng tự lưu ngay qua API riêng), chỉ
    thêm `title` tooltip giải thích tránh hiểu nhầm là lỗi; (b) bảng
    nhập trực tiếp 1 bộ dữ liệu thiếu tiêu đề "Cung độ" cho hàng số liệu
    cột — thêm hàng tiêu đề "Cung độ (km)" span trên các cột, giống cấu
    trúc 2 tầng đã dùng ở bảng tổng hợp Quản lý.

12. **Danh mục "Mô hình" tách khỏi kiến trúc lưới dùng chung, mỗi dòng 1
    kỳ riêng** (commit `83442b0`) — chủ dự án gửi mockup + xác nhận rõ
    (qua AskUserQuestion): mỗi dòng (1 mã chủng loại hàng) cần khoảng
    thời gian RIÊNG, tách nhỏ bằng "+", giống hệt "Thêm mới tỷ trọng"
    (Density) đã có. Kiến trúc `MatrixDefinition` dùng chung (1 phiên
    bản = 1 khoảng thời gian cho MỌI dòng) không làm được — dùng
    `EnterPlanMode` (agent Explore đọc kỹ Density backend+frontend, agent
    Plan thiết kế, tự verify lại từng chi tiết bằng Read trước khi chốt)
    cho ra kiến trúc mới, ĐÃ ĐƯỢC DUYỆT trước khi code.
    - Backend (file MỚI hoàn toàn, không sửa gì có sẵn): `ModelPeriod`
      (mirror `DensityParameter`, bỏ Khu vực xúc + 2 trường cố định) +
      `ModelPeriodValue` (con, `vehicleKey` chuỗi tự do `<mã xe>.<CS|KC>`
      → giá trị, giống `MatrixCell` nhưng gắn với TỪNG kỳ riêng của
      TỪNG dòng). `ModelPeriodService` mirror đúng
      `bulkCreate`/`replaceBatch`/kiểm tra chồng lấn của
      `DensityParameterService`. Bẫy kỹ thuật duy nhất: sync `values`
      phải `.clear()` + add lại vào ĐÚNG list instance (không gán list
      mới) vì có `orphanRemoval=true`.
    - Frontend: `frontend/src/modules/catalog/model/` — `ModelAddModal.tsx`
      (mirror khung+thuật toán tách kỳ của `DensityAddModal.tsx`, khác 2
      điểm: "Chủng loại xe" là combobox multi-choice DÙNG CHUNG cạnh
      Thời gian — mỗi xe chọn sinh 2 cột `.CS`/`.KC`; "Mã chủng loại" là
      dropdown SỬA ĐƯỢC TỪNG DÒNG qua nút "+ Thêm dòng", không tự sinh
      từ multi-select như Density), `ModelPeriodsPage.tsx` (mỗi dòng
      bảng = 1 bản ghi đã lưu, KHÔNG gộp "lô" — vì mỗi dòng có thời gian
      riêng nên không còn khoá gộp chung).
    - Route: tái dùng URL `MO_HINH` cho trang mới, lưới cũ (data cũ
      trong `matrix_definitions` GIỮ NGUYÊN, không xoá) dời sang
      `MO_HINH_LUOI` — đúng cách DMNL đã làm với
      `DINH_MUC_NHIEN_LIEU_LUOI`. `header.tsx` KHÔNG sửa.
    - Verify: build backend (Maven qua container) sạch, backend khởi
      động healthy, Hibernate tự tạo đúng 2 bảng mới + FK + unique
      constraint (đã `\d` xác nhận), `curl` trực tiếp 3 endpoint mới
      (`GET/POST /api/model-periods`, `GET /{id}`) đều trả `401` đồng
      nhất không token — không có `500` mới. Build frontend sạch.
      **CHƯA click-through UI thật** (thiếu mật khẩu Portal) — việc đầu
      tiên phiên sau/chủ dự án nên làm: mở `/danh-muc/mo-hinh`, thử
      "+ Thêm dòng", tách thời gian 1 dòng bằng "+", lưu/sửa/xoá — xác
      nhận đúng mockup.

## Lượt 7 (tiếp) — 3 việc chủ dự án yêu cầu dồn dập, CẢ 3 ĐÃ XONG + đã build/deploy

Ngay sau khi xong Mô hình, chủ dự án gửi dồn dập 3 yêu cầu tiếp trong lúc
tôi đang code — cả 3 đã hoàn thành, build sạch, deploy xong (commit
`a56d12d`, `efb64ff`, `8a5cc7b`). Chi tiết:

13. **Danh mục "Phân loại"** (commit `a56d12d`) — Mã phân loại / Phân
    loại (text) / Ghi chú. Danh mục CRUD đơn giản, khuôn y hệt
    `VehicleType` (Chủng loại xe, lượt 6) — entity/dto/mapper/
    repository/service/controller `Classification`* mới, frontend dùng
    lại `CatalogPage`/`configs.ts` (hàm `placeFields` có sẵn khớp đúng
    3 nhãn cần). Route `/danh-muc/phan-loai`, menu đặt cạnh "Chủng loại
    xe" trong dropdown "Danh mục".
14. **"Năng suất xe" (NANG_SUAT_XE)** (commit `efb64ff`) — modal "Thêm
    mới năng suất xe" bespoke, Ở LẠI kiến trúc lưới dùng chung
    (`MatrixDefinition`/`MatrixCell` qua `matrixService`, giống DMNL
    trước khi có UI riêng) — KHÔNG đổi kiến trúc backend. Đã hỏi rõ chủ
    dự án (đọc DB thấy 3 tín hiệu khác nhau: nhãn cấu hình DB ghi
    "Chủng loại xe + phân loại", mockup ghi "Chủng loại hàng + Phân
    loại", dữ liệu cột cũ "CAT777E.Than" lại gợi ý khác nữa) — **chốt
    dùng đúng chữ trên mockup: Chủng loại hàng (CargoType) + Phân loại
    (Classification vừa thêm)**, coi dữ liệu cũ là nháp/test. Khoá cột
    ghép: `<mã CLH>_<mã phân loại>.<CS|KC>` — gấp Khu vực xúc làm hậu tố
    cuối (đúng quy ước `.CS`/`.KC` đã dùng ở DMNL) để 1 năm = 1 phiên
    bản vẫn chứa được cả 2 khu vực ở 2 nhóm cột khác nhau, không đụng
    ràng buộc duy nhất `(code, effective_from)`. Thêm prop
    `extraActions?` (tuỳ chọn, mặc định rỗng) vào `MatrixCatalogPage.tsx`
    dùng chung — chỉ `VehicleOutputMatrix.tsx` gắn nút "Thêm mới", 3
    trang còn lại dùng chung component không đổi hành vi (đã regression-
    check qua `curl` cả 4 catalog).
15. **"HS điều chỉnh NLDM" (HS_DIEU_CHINH_NLDM)** (commit `8a5cc7b`) —
    cùng mô hình như Năng suất xe (modal bespoke qua `extraActions`, ở
    lại kiến trúc lưới dùng chung). Đã hỏi rõ chủ dự án 2 điểm KHÔNG thể
    suy đoán an toàn:
    - Cấu trúc cột: DB đang cấu hình Khu vực xúc LÀM CỘT
      (`col_source_path=/excavation-areas`) nhưng mockup lại vẽ 12
      tháng cố định + 1 cột tổng hợp năm, Khu vực xúc là ô chọn RIÊNG ở
      trên — **chốt theo đúng mockup** (12 tháng + cột năm), coi cấu
      hình DB cũ + dữ liệu cột cũ ("KVX001") là nháp/test.
    - Phần giữa của khoá dòng ("Chất lượng", vd "C"/"B") — nhãn cấu
      hình DB ghi "hạng" — **chốt dùng đúng danh mục "Hạng xe" đã có**
      (`/vehicle-ranks`), không tạo danh mục mới.
    - Công thức "HSNL điều chỉnh" (hệ số năm) — mockup chỉ ghi "hệ
      thống tự động cập nhật theo hệ số 12 tháng", không đọc chắc được
      công thức từ ảnh (thử khớp thấy vài dòng giống "=tháng 1", vài
      dòng giống "=min" nhưng không khớp hết) — **chốt = TRUNG BÌNH
      CỘNG 12 tháng**, không đoán vì sai sẽ ra sai hệ số nhiên liệu
      thật.
    Khoá dòng ghép: `<mã xe>_<mã hạng>_<mã phân loại>.<mã khu vực xúc>`
    — cùng lý do gấp Khu vực xúc làm hậu tố như Năng suất xe (Khu vực
    xúc ở đây có NHIỀU giá trị thật từ danh mục Khu vực xúc, không phải
    chỉ CS/KC, nhưng cùng cơ chế tránh xung đột ràng buộc phiên bản).

⚠ **CẢ 3 VIỆC TRÊN + Mô hình ĐỀU CHƯA CLICK-THROUGH UI THẬT** — cùng lý
do cũ (thiếu mật khẩu Portal, quy tắc dự án mục 8). Chỉ verify được:
build backend+frontend sạch, backend khởi động healthy không lỗi, `curl`
trực tiếp mọi endpoint liên quan (kể cả 4 catalog lưới dùng chung, để
regression-check `extraActions` không ảnh hưởng 3 trang còn lại) đều trả
`401` đồng nhất không có `500` mới, trang load không crash console.
**Việc đầu tiên phiên sau/chủ dự án nên làm**: click-through cả 4 tính
năng mới (`/danh-muc/mo-hinh`, `/danh-muc/phan-loai`,
`/danh-muc/nang-suat-xe`, `/danh-muc/hs-dieu-chinh-nldm`) — đặc biệt xác
nhận công thức HSNL=trung bình cộng và quy ước khoá `Chủng loại hàng +
Phân loại` cho Năng suất xe đúng ý chủ dự án khi thấy dữ liệu thật.

16. **Mô hình: danh sách xổ xuống của combobox che mất hàng tiêu đề bảng**
    (commit `fb41745`, chủ dự án tự đăng nhập báo qua ảnh chụp) — combobox
    multi-choice "Chủng loại xe" (`@/components/ui/combobox.tsx`, dùng
    `@base-ui/react`) render danh sách xổ xuống qua PORTAL với `z-40` CỐ
    ĐỊNH trong chính component (không đọc `className` tôi truyền vào
    `ComboboxContent` — cái đó chỉ merge vào phần tử `Popup` bên trong,
    không phải `Positioner` mang z-index thật). Vì là portal, thư viện
    định vị (Base UI Positioner) CHỈ tự né mép màn hình, KHÔNG tự né nội
    dung khác trên trang — khoảng cách cũ giữa ô chọn và bảng chỉ 16px
    (`mb-4`) trong khi 1 mục danh sách đã cao ~40-50px, nên dù danh mục
    Chủng loại xe chỉ có 1 dòng cũng đủ che kín hàng tiêu đề bảng ngay
    bên dưới khi mở danh sách. Sửa bằng tăng khoảng cách lên 56px
    (`mb-14`). **Lưu ý cho lần sau**: `DensityAddModal.tsx` dùng ĐÚNG
    component Combobox này theo cùng cách (combobox multi-choice ngay
    trên bảng) — CÙNG rủi ro tiềm ẩn nếu danh mục Chủng loại hàng ngắn
    và bảng nằm sát ngay dưới, nhưng CHƯA được yêu cầu sửa (chưa đụng
    tới, không phải quy tắc chung nào — chỉ là quan sát, để dành nếu chủ
    dự án báo tương tự ở Tỷ trọng).

17. **Tỷ trọng: sửa TRƯỚC cùng lỗi che hàng tiêu đề bảng** (cùng ngày,
    tiếp ngay sau mục 16). Đã kiểm tra `DensityAddModal.tsx`: hàng bộ
    chọn (`Năm` + `Khu vực xúc` + combobox multi-choice `Mã chủng loại
    hàng`) nằm trong đúng 1 div `mb-4` (16px), bảng nhập tỷ trọng ngay
    dưới, KHÔNG có margin nào khác chen giữa → ĐÚNG điều kiện gây lỗi ở
    Mô hình. Tính cụ thể: `sideOffset=4` + `ComboboxList` `p-1` (4+4px)
    + 1 `ComboboxItem` `py-1.5 text-sm` (~32px) = ~44px tính từ đáy ô
    chọn, trong khi chỉ có 16px trống → tràn ~28px vào hàng tiêu đề
    (`th` `py-2.5` ≈ 40px); từ 2 mục trở lên thì che hết cả hàng tiêu đề.
    Lỗi xảy ra ở luồng dùng thật: chọn 1 mã (bảng hiện ra) rồi mở lại
    combobox để thêm mã thứ hai. Sửa y hệt Mô hình: `mb-4` → `mb-14`
    (chỉ nhánh nhập liệu; nhánh `isReadOnly` cũng có `mb-4` nhưng không
    có combobox nên GIỮ NGUYÊN). Chỉ đổi khoảng cách, không đổi logic.
    Verify: `tsc -b` + `vite build` sạch qua Docker (đúng quy trình khoá
    Redis), deploy lại preview và grep chính artifact đã build — chunk
    `DensityParameters-*.js` và `ModelPeriodsPage-*.js` đều chứa
    `mb-14 flex flex-wrap items-end gap-4`, CSS có `.mb-14{margin-bottom:
    calc(var(--spacing) * 14)}` (=56px). **CHƯA click-through UI thật**
    (vẫn thiếu mật khẩu Portal, quy tắc dự án mục 8) — chủ dự án tự đăng
    nhập xác nhận lại giúp: `/danh-muc/ty-trong` → Thêm mới → chọn 1 mã
    → mở lại danh sách, xem còn che hàng tiêu đề không.
    Quét regression toàn frontend: chỉ 2 file dùng `ComboboxChips` theo
    kiểu combobox-ngay-trên-bảng là Mô hình + Tỷ trọng, cả 2 đã sửa. Còn
    3 modal khác vẫn để `mb-4 flex flex-wrap items-end gap-4`
    (`FuelAdjustAddModal`, `SurveyStandardAddModal`,
    `VehicleOutputAddModal`) nhưng chúng dùng `Select` (đã có `z-[120]`)
    chứ KHÔNG dùng Combobox này → không đụng tới, chỉ ghi nhận.

## ⚠ LƯỢT 8 (2026-09-07) — RÀ SOÁT CỘT BÁO CÁO: PHÁT HIỆN 3 UI VỪA DỰNG TRA SAI KHOÁ

Chủ dự án gửi đặc tả đầy đủ ~75 cột báo cáo thống kê và yêu cầu "nghiên
cứu sâu, chưa cần code, xem đã đủ thông tin tính toán chưa". Kết quả đầy
đủ: **`docs/RA_SOAT_COT_BAO_CAO_THONGKE.md`** (commit `de09d23`). Tóm tắt
những gì PHẢI đọc trước khi động vào phần sản lượng:

1. **DMNL đang tra SAI cột.** Khoá cột DMNL thật là cột `DE`
   (`LoaiXe_DMNL`) = `<Chủng loại xe (NL) = cột DQ>` + hậu tố THEO QUY TẮC
   (`.Bun` / `.Dat` / `.BK` / `.DAT|.Than`), rồi mới `_<cung độ>`.
   Code (`ProductionKeys.vehicleFuelClassKey`) và toàn bộ UI DMNL tôi dựng
   đang dùng `<mã>.CS/.KC` — SAI. Bằng chứng sống dòng 1250:
   `DA=CAT777E.CS` nhưng `DE=CAT777E.BK` (và còn `CZ=CAT777E.CS.BK` là họ
   khoá thứ ba).
   **Nguồn gốc sai**: `docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md:375` đặt tiêu đề
   "Khoá cột lưới Mô hình **/ DMNL** có HẬU TỐ KHU VỰC" nhưng chỉ trích
   công thức của Mô hình. Ghi chú "chỉ có .CS/.KC là thật" trong
   `fuelNormKeys.ts` + context.md lượt 6 là **SAI**, đừng tin nữa.
2. **Mô hình `.CS/.KC` là ĐÚNG** (khác DMNL) — UI Mô hình vừa dựng OK.
3. **Năng suất xe (996) tra theo `<Chủng loại XE>.<DAT|Than>`**, không
   phải "Chủng loại hàng + Phân loại". Backend đang đúng; **modal tôi dựng
   hôm 06/09 SAI** (do câu trả lời AskUserQuestion của chủ dự án chọn theo
   chữ trên mockup, nhưng đặc tả mới của chính chủ dự án + docx gốc + Excel
   đều ghi "Chủng loại xe"). Cần chốt lại rồi sửa modal.
4. **HS điều chỉnh NLĐM**: dòng = `<xe>_<hạng>_<DAT|Than>` (giá trị thật
   `CAT777E_C_DAT`), cột = **KC/CS**. Modal tôi dựng dùng danh mục Phân
   loại mới + mã khu vực `KVX0xx` + 12 tháng → lệch 3 chỗ. 12 tháng là
   yêu cầu MỚI, nếu giữ thì `FuelCalculator` phải sửa để biết lấy tháng nào.
5. **Thiếu để tính đủ**: 4 ô nhập ở báo chuyến (HS chênh lệch CTNB, Đá
   thải tự nhập — *cả hai đã có cột DB nhưng không có ô nhập*, Hệ số chất
   tải bùn, Tầng dỡ tải kiểu số); 4 hằng số (2,625/2,617, 3 tỷ lệ đá thải,
   `HS.BUN` chưa seed); 3 thuộc tính xe còn là chuỗi tự do (Chủng loại xe,
   Hạng xe, Chủng loại xe (NL)); ~30 cột tính xong nhưng không lưu (8 khoản
   BSNL, 10 cột nội suy, P, EC…).
6. **Dữ liệu danh mục gần như trống** (`vehicle_types` 0, `classifications`
   0, `model_periods` 0, `coefficient_items` 1) — công thức đúng cũng chưa
   ra số đúng.

**Chưa sửa gì cả — chờ chủ dự án chốt 5 mâu thuẫn ở mục 4 của tài liệu.**

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

---

## Lượt 8 (2026-09-07) — chốt QĐ-10…13, nối khoá ngoại danh mục xe, báo cáo tổng hợp

### Đọc trước tiên

**`docs/BAO_CAO_TONG_HOP_LOGIC.md`** — báo cáo tổng hợp toàn bộ logic
(danh mục + báo cáo thống kê) viết cho chủ dự án rà soát. Nó gộp lại mọi
kết luận của `RA_SOAT_COT_BAO_CAO_THONGKE.md` và `DECISIONS.md`, kèm số
liệu dòng thật của từng danh mục. Bắt đầu từ đó, không đọc lại từ đầu.

### Đã làm

1. **Bước 1 — chốt 5 mâu thuẫn** → `docs/DECISIONS.md` QĐ-10…QĐ-13.
2. **Bước 5 — nối danh mục xe thành khoá ngoại thật** (commit `25466f4`):
   `devices.vehicle_type_id` + `devices.vehicle_rank_id`,
   `excavation_areas.area_group` (CS/KC) + endpoint `/area-groups`,
   `vehicle_class` chuyển `@Deprecated` (engine ưu tiên `vehicleRank`,
   lùi về chuỗi cũ; khi lưu chỉ ghi đè nếu request thực sự gửi giá trị),
   `VehicleRankResponse.name` = mã hạng (combobox/Excel đọc theo `name`).
3. **Báo cáo tổng hợp** `docs/BAO_CAO_TONG_HOP_LOGIC.md`.

### Việc tiếp theo — BƯỚC 2 (chưa làm)

Viết lại `ProductionKeys` cho ĐMNL theo QĐ-11 và sửa 3 giao diện dựng
ngày 06/09 (ĐMNL, Năng suất xe, HS điều chỉnh) cho khớp QĐ-10…13.
**Chỗ hở đã biết:** `FuelCalculator.vehicleModel()` vẫn đọc
`Device.category.name` và chú thích là "DQ5"; theo QĐ-11 DQ phải là
`Device.fuelClass.code`. Cố tình chưa sửa lẻ — sửa cùng bước 2.

**Không có lưới an toàn:** `backend/src/test` chỉ có `contextLoads` (vốn
đã fail độc lập). Bổ sung test đơn vị cho `ProductionKeys` TRƯỚC khi đổi
engine.

### Bẫy mới ghi nhận

- **`VehicleRank` không có trường `name`.** Cả `CatalogFormModal`
  (`optionsPath` → `label: it.name`) lẫn `CatalogPage.buildLookups`
  (tên→id khi nhập Excel) đều đọc theo quy ước `name`. Đã vá bằng cách
  cho `VehicleRankResponse.name = code`. Danh mục nào khác thiếu `name`
  mà đem làm `optionsPath` sẽ hỏng y hệt, không báo lỗi.
- **`apply()` của `DeviceProductionAttributesService` có ngữ nghĩa THAY
  THẾ** — gỡ một trường khỏi giao diện/Excel mà vẫn ghi đè vô điều kiện
  sẽ âm thầm xoá trắng dữ liệu cũ của trường đó.

### Dữ liệu DEMO phải xoá trước khi dùng thật

486 ô lưới ĐMNL ở `matrix_definitions` id=155 (27 dòng × 18 cột) là dữ
liệu GIẢ nạp thẳng bằng `psql` ở lượt 7 chỉ để xem giao diện bảng/phân
trang. Không phải dữ liệu nghiệp vụ.

### Bổ sung cuối lượt 8 — đã làm thêm bước 2 và bước 4

4. **Bước 2 — tách BỐN họ khoá tra bảng** (commit `222b4c1`).
   `ProductionKeys` nay có 4 hàm riêng: `modelColumnKey` (Mô hình,
   `<DA>.<CS|KC>`), `vehicleOutputColumnKey` (Năng suất xe,
   `<DA>.<DAT|Than>`), `fuelNormVehicleKey` (ĐMNL, `<DQ>` + hậu tố theo 4
   nhánh `DE5`), `fuelAdjustRowKey`/`fuelAdjustColumnKey` (HS điều chỉnh,
   `<DQ>_<chữ đầu hạng>_<DAT|Than>` × `T<tháng>.<CS|KC>`).
   Kéo theo: `TripBaseCalculator` tra Mô hình bằng `vehicleType` chứ không
   phải `fuelClass`; `FuelCalculator.vehicleModel()` đọc `fuelClass.code`
   thay cho `category.name`; `ReceivingFloorGroupCalculator` nhận
   `ExcavationArea` và so theo NHÓM thay vì so tên với "Khe Chàm".
   Ba giao diện dựng 06/09 (ĐMNL, Năng suất xe, HS điều chỉnh) sửa cho khớp.
5. **Bước 4 — hằng số** (`backend/seed-he-so.sql`, đã nạp vào preview):
   `HS.BUN`, `HS.DATHAI.M3.KC`=2,625, `HS.DATHAI.M3.CS`=2,617, và 3 tỷ lệ
   đá thải. **Ba tỷ lệ + HS.BUN seed = 0 vì chưa biết số thật** — ba ô
   `$B$3/$D$3/$F$3` nằm ngoài vùng đã trích xuất từ workbook.

### Lưới an toàn MỚI

`backend/src/test/.../ProductionKeysTest.java` — 22 test THUẦN JUnit
(không cần Spring/Postgres). Chạy:
```bash
docker run --rm -v "D:/Coding/DU_AN/AI_Software_Factory/projects/THONGKE-CAOSON/.factory/worktrees/claude-dev/backend:/app" -v thongke_m2_cache:/root/.m2 -w //app maven:3.9.8-eclipse-temurin-21 mvn -B test -Dtest=ProductionKeysTest
```
Lượt này: 22/22 PASS. `contextLoads` VẪN fail độc lập như cũ — đừng chạy
`mvn test` trần rồi tưởng hỏng do thay đổi mới.

### Bẫy mới (lượt 8, phần 2)

- **Recreate backend container xong thì reverse-proxy trả 502.**
  `nginx_preview.conf` dùng `proxy_pass` TĨNH (bắt buộc, xem quy tắc dự án
  mục 5) nên nginx phân giải DNS đúng một lần lúc khởi động; backend đổi IP
  là hỏng. Cách sửa: `docker restart thongke-caoson-preview-reverse-proxy-1`.
- **Docker chạy từ Git Bash cần `MSYS_NO_PATHCONV=1` và `-w //app`** — nếu
  không, đường dẫn bị dịch thành `C:/Program Files/Git/app`.

### Việc tiếp theo — đề xuất BƯỚC 7 TRƯỚC bước 3/6

Công thức nay đã đúng theo bảng tính, nhưng danh mục xe gần như trống
(`vehicle_types` 0 dòng) nên engine chưa ra được con số nào để đối chiếu
với Excel. Nhập dữ liệu thật rồi mới biết bước 6 cần hiện thêm cột nào.

---

## Lượt 9 (2026-09-07) — dữ liệu mẫu đầu-cuối, xác nhận sống 4 họ khoá + kỳ 102 ra số

### Đọc trước tiên

Đã dựng **bộ dữ liệu mẫu đầu-cuối** để chủ dự án xem toàn cảnh mà không
cần chờ nhập liệu thật. Chạy đủ **4 file theo đúng thứ tự** (mỗi file chạy
lại nhiều lần được, không phá dữ liệu thật):

```bash
docker exec -i thongke-caoson-preview-postgres-1 psql -U postgres -d thong_ke < backend/seed-mau-sanluong-0-taikhoan.sql
docker exec -i thongke-caoson-preview-postgres-1 psql -U postgres -d thong_ke < backend/seed-mau-sanluong-1-danhmuc.sql
docker exec -i thongke-caoson-preview-postgres-1 psql -U postgres -d thong_ke < backend/seed-mau-sanluong-2-luoi.sql
docker exec -i thongke-caoson-preview-postgres-1 psql -U postgres -d thong_ke < backend/seed-mau-sanluong-3-chuyen.sql
```

Sau đó đăng nhập (`xemthu` / `XemThu@2026` — tài khoản RIÊNG cho preview,
không đụng `admin`) và gọi:

```
POST /api/production/calculate?periodId=102&tkeMode=false
```

Lượt đầu sẽ ra ~20 cảnh báo "Chưa khai báo STD cho khoá …" — đó là vì khoá
STD (`Nhóm vỉa_Nhóm tầng_Máy xúc_Khu vực`) do ENGINE TỰ DỰNG từ dữ liệu
chuyến, không đoán trước được. Chạy tiếp:

```bash
docker exec -i thongke-caoson-preview-postgres-1 psql -U postgres -d thong_ke < backend/seed-mau-sanluong-4-std.sql
```

rồi gọi lại `POST /api/production/calculate?periodId=102` lần hai —
**0 cảnh báo, 21 chuyến, ra đủ số**. Xem tóm tắt: `GET /api/production/summary?periodId=102`.

### Nội dung 5 file seed

| File | Nội dung |
|---|---|
| `seed-mau-sanluong-0-taikhoan.sql` | Tài khoản `xemthu` (ADMIN, mật khẩu `XemThu@2026`) — dùng `pgcrypto` sinh BCrypt. **CHỈ DÙNG PREVIEW**, không chạy ở staging/production. |
| `seed-mau-sanluong-1-danhmuc.sql` | 3 xe/3 danh mục xe (Chủng loại xe, Chủng loại xe NL, Hạng xe) với mã THẬT trong Excel (`CAT777E`, `HD465-7R`, `HM400-2R`); gắn cho 9 xe tải + gầu xúc cho 4 máy xúc; nhóm khu vực CS/KC cho 10 khu vực xúc; gán lại SPNT THẬT (`Dat_SX`/`Dat_CN`/`Than_SX`/`Than_CN`) cho các chủng loại hàng dùng trong mẫu — **AC5 (Thể trọng TĐ) chỉ nhận đúng 4 tên này**, để nguyên "SP than sạch" mô tả sẽ ra thể trọng = 0. |
| `seed-mau-sanluong-2-luoi.sql` | Dựng lại **cả 4 lưới tra bảng** (Mô hình, Năng suất xe, ĐMNL, HS điều chỉnh) theo ĐÚNG 4 họ khoá của `ProductionKeys` (xem `docs/BAO_CAO_TONG_HOP_LOGIC.md` §B). Gắn nhãn phiên bản `MAU-2026`. **Xoá luôn lưới DEMO GIẢ id=155** nạp ở lượt 7 (chiếm đúng khoảng hiệu lực `2026-01-01`, chặn ràng buộc `(code, effective_from)`). |
| `seed-mau-sanluong-3-chuyen.sql` | 21 chuyến vận tải kỳ 01/8→07/8/2026, đặt CÓ CHỦ Ý để đi qua **đủ bốn nhánh** của quy tắc hậu tố ĐMNL (`DE5`) — xem cột ghi chú trong từng dòng `tmp_trip`. Kèm tỷ trọng mặc định cho mọi chủng loại hàng. |
| `seed-mau-sanluong-4-std.sql` | Sinh STD (số trắc địa) từ CHÍNH khoá mà engine vừa tự dựng ở `survey_coefficients`, lệch ±5% so với số thống kê để hệ số ra khác 1 (không phải luôn = 1). |

### Ba bẫy vấp phải khi dựng, đã ghi chú ngay trong file seed

1. **`FuelNormInterpolator.trimZeros()` dùng `stripTrailingZeros()`.** Khoá
   cột ĐMNL là `..._2` chứ KHÔNG phải `..._2,0`/`..._2.0`. Seed sai định
   dạng này thì cung độ tròn số tra hụt, cung độ lẻ vẫn chạy — rất khó
   phát hiện qua mắt thường, phải đọc log cảnh báo.
2. **STD tra theo `(loại danh mục, khoá, ngày)` — KHÔNG theo sản phẩm
   nghiệm thu.** Một khoá chỉ được có ĐÚNG MỘT dòng STD, và dòng đó phải
   điền CẢ cột Đất lẫn cột Than cùng lúc, vì cùng một khoá (nhóm vỉa+tầng+
   máy xúc+khu vực) có thể phục vụ cả chuyến đất lẫn chuyến than trong
   cùng kỳ — engine chọn cột theo sản phẩm của TỪNG CHUYẾN
   (`resolveBulkDensity`/`isCoalProduct`), không theo STD.
3. **Một khoá phục vụ HAI sản phẩm nghiệm thu khác nhau thì số trắc địa bị
   CHIA CHUNG cho cả hai** — sản lượng trắc địa của nhóm nhỏ hơn sẽ vọt cao
   vô lý (tan_td > tan). Gặp phải khi hai chuyến (Than_CN và Than_SX) tình
   cờ cùng rơi vào một khoá `Nhóm vỉa_Tầng_Máy xúc_Khu vực` — phải đổi Nơi
   nhận tải của một trong hai chuyến để tách khoá.

### Trạng thái sau lượt 9

- Preview đang có đủ 21 chuyến kỳ 102 (01/8→07/8/2026) với `production_results`
  tính đủ, 0 cảnh báo — dùng để chủ dự án xem giao diện báo cáo/danh mục.
- **Không sửa mã nguồn** trong lượt này — chỉ 5 file SQL mới, commit riêng.
- Việc bước 2/4/5 của kế hoạch 8 bước KHÔNG đổi so với lượt 8 — vẫn còn
  bước 3 (4 ô nhập báo chuyến), 6 (mở rộng báo cáo), 7 (dữ liệu thật), 8
  (quyết định nhóm cột "bùn").
