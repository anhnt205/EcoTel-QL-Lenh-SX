# Báo cáo tổng hợp để rà soát logic — Danh mục & Báo cáo thống kê

*Lập ngày 2026-09-07 (lượt 8). Dùng để chủ dự án soát lại một lượt toàn
bộ logic trước khi code tiếp.*

Nguồn đối chiếu: `docs/_source/excel-tinhtoan-row5-formulas.txt` (137 công
thức, dòng MASTER), `excel-tinhtoan-header-row4.txt` (206 cột A..GY),
`excel-tinhtoan-row1250.txt` (dữ liệu sống để kiểm chứng). Khi bản `.docx`
và Excel mâu thuẫn → **tin Excel**.

---

## 0. Tóm tắt một trang

| Câu hỏi | Trả lời |
|---|---|
| Danh mục đã đủ về CẤU TRÚC chưa? | **Gần đủ** — 39 danh mục đã dựng; sau lượt này còn 1 chỗ hở (xem §D.3) |
| Danh mục đã đủ DỮ LIỆU chưa? | **Không** — 5 danh mục quyết định kết quả tính đang trống hoặc 1 dòng (xem §A.4) |
| Báo cáo thống kê đủ cột để tính chưa? | **Chưa** — 3 nhóm thiếu, xem §C |
| Điều nguy hiểm nhất | **Quy ước khoá tra bảng**: 4 bảng tra dùng 4 họ khoá KHÁC NHAU, code trước đây gộp chung → tra sai bảng, ra sai số mà không báo lỗi. Xem §B |

**Việc cần chủ dự án làm khi đọc bản này:** soát §B (4 họ khoá) và §F
(5 điểm cần xác nhận). Hai mục đó quyết định mọi con số phía sau.

---

## A. DANH MỤC

### A.1 Danh mục "phẳng" — mỗi dòng một bản ghi độc lập

| # | Danh mục | Đường dẫn | Dùng cho cột nào | Số dòng hiện có |
|---|---|---|---|---|
| 1 | Đơn vị | `/danh-muc/don-vi` | QLTB | 7 |
| 2 | Thông tin xe | `/danh-muc/thong-tin-xe` | cột B (Số xe) | 13 thiết bị |
| 3 | Thông tin máy | `/danh-muc/thong-tin-may` | cột E (Máy xúc) | *(chung bảng devices)* |
| 4 | Ca làm việc | `/danh-muc/ca-lam-viec` | cột C | 4 |
| 5 | Khu vực xúc | `/danh-muc/khu-vuc-xuc` | **cột D** | 10 |
| 6 | Nơi nhận tải | `/danh-muc/noi-nhan-tai` | AK (nhóm tầng nhận tải) | 10 |
| 7 | Nơi dỡ tải | `/danh-muc/noi-do-tai` | điều kiện của DE, FK | 11 |
| 8 | Nơi chất tải | `/danh-muc/noi-chat-tai` | báo chuyến Khai thác | 14 |
| 9 | Chủng loại hàng | `/danh-muc/chung-loai-hang` | AG, AJ, DE | 14 |
| 10 | Nhóm chủng loại hàng | `/danh-muc/nhom-chung-loai-hang` | AG | 8 |
| 11 | Sản phẩm nghiệm thu | `/danh-muc/san-pham-nghiem-thu` | **AG → AD** | 8 |
| 12 | TTL CLH | `/danh-muc/ttl-clh` | BU | 7 |
| 13 | Nhóm vỉa | `/danh-muc/nhom-via` | CQ → CR | 6 |
| 14 | Vật liệu | `/danh-muc/vat-lieu` | thiết bị | — |
| 15 | Điểm đổ tải | `/danh-muc/diem-do-tai` | thiết bị | — |
| 16 | Nhóm hàng / Loại hàng | `/danh-muc/nhom-hang`, `/loai-hang` | thiết bị | — |
| 17 | Người dùng | `/danh-muc/nguoi-dung` | phân quyền | — |
| 18 | Kỳ báo cáo | `/danh-muc/ky-bao-cao` | khoá kỳ tính | 11 |
| 19 | Hệ số | `/danh-muc/he-so` | AM, BN, FJ, FK | **1** ⚠ |
| 20 | STD (Đất CN) | `/danh-muc/std-dat-cn` | AC | 5 (chung `survey_standards`) |
| 21 | STD (Đất SX / Than SX) | `/danh-muc/std-dat-sx-than-sx` | AC | *(chung trên)* |
| 22 | Áp Trắc địa | `/danh-muc/ap-tracdia` | S, T, U | 2 |

### A.2 Danh mục xe — bốn cách phân nhóm KHÁC NHAU cho cùng một chiếc xe

Đây là chỗ dễ nhầm nhất, và là lý do lượt trước tra sai bảng.

| Danh mục | Cột Excel | Vai trò | Số dòng |
|---|---|---|---|
| **Chủng loại xe (NL)** `/danh-muc/chung-loai-xe-dmnl` | **DQ** | gốc khoá cột **Định mức nhiên liệu** và khoá dòng **HS điều chỉnh** | **1** ⚠ |
| **Chủng loại xe** `/danh-muc/chung-loai-xe` | **DA** (phần trước hậu tố) | gốc khoá cột **Mô hình** và **Năng suất xe** | **0** ⚠ |
| **Hạng xe** `/danh-muc/hang-xe` | **DB** | ghép với Chủng loại xe thành `DC`; hệ số BC5 (A/B/C1/khác) | **1** ⚠ |
| **Nhóm hạng xe** `/danh-muc/nhom-hang-xe` | — | nhóm của Hạng xe | 1 |
| **Chủng loại xe + Phân loại** `/danh-muc/chung-loai-xe-phan-loai` | — | (đang dùng làm khoá cột Năng suất xe — **xem §F.3**) | 1 |

Bằng chứng sống (Excel dòng 1250) — **bốn chuỗi khác nhau cho cùng một xe**:

```
DQ = CAT777E            (Chủng loại xe NL)
DA = CAT777E.CS         (Chủng loại xe + hậu tố khu vực)
DE = CAT777E.BK         (khoá tra ĐMNL — hậu tố THEO QUY TẮC, không phải khu vực)
CZ = CAT777E.CS.BK
```

### A.3 Danh mục "theo khoảng thời gian" (mỗi dòng có hiệu lực riêng)

| Danh mục | Cấu trúc | Số dòng |
|---|---|---|
| **Tỷ trọng** `/danh-muc/ty-trong` | Chủng loại hàng × Khu vực xúc × [từ ngày – đến ngày], 2 giá trị ẩm/khô | 6 |
| **Mô hình** `/danh-muc/mo-hinh` | Chủng loại hàng × [từ – đến], nhiều cột theo Chủng loại xe | **0** ⚠ |

Cả hai chống chồng lấn thời gian ở tầng ứng dụng (`findOverlapping`), sửa
bằng `replaceBatch` = xoá → `flush()` → tạo lại trong **cùng một** giao
dịch (nếu tạo trước xoá sau sẽ bị chính bản ghi cũ chặn nhầm).

### A.4 Danh mục "lưới" (bảng tra 2 chiều, có phiên bản theo thời gian)

| Lưới | Dòng | Cột | Dữ liệu hiện có |
|---|---|---|---|
| **Định mức nhiên liệu** | Độ dốc (dải) | Chủng loại xe + cung độ | 3 phiên bản; bản 2026 có **27 dòng × 18 cột = 486 ô** (dữ liệu DEMO tôi nạp để xem giao diện) |
| **Mô hình** *(lưới cũ)* | Chủng loại hàng | Chủng loại xe | 4 ô |
| **Năng suất xe (996)** | Cung độ (dải) | Chủng loại xe + phân loại | 3 ô |
| **HS điều chỉnh NLĐM** | Chủng loại xe + hạng + phân loại | Khu vực xúc | **1 ô** ⚠ |

> ⚠ **Cảnh báo dữ liệu:** 486 ô của ĐMNL là **dữ liệu giả** tôi nạp thẳng
> vào DB để kiểm tra giao diện bảng/phân trang. **Phải xoá trước khi dùng
> thật** (`matrix_definitions` id=155).

### A.5 Danh mục đã dựng nhưng CHƯA dùng

- **Phân loại** `/danh-muc/phan-loai` (0 dòng) — dựng ngày 06/09 theo yêu
  cầu, nhưng QĐ-10 sau đó xác định "Phân loại" trong 3 bảng tra là giá trị
  **tự suy ra** `DAT`/`Than`, không phải danh mục người dùng chọn. Giữ
  nguyên, chưa xoá (quy tắc dự án). **Cần chủ dự án chốt: dùng vào việc gì
  khác, hay bỏ?**

---

## B. BỐN HỌ KHOÁ TRA BẢNG — phần quan trọng nhất cần soát

Bốn bảng tra dùng bốn quy ước khoá **khác nhau**. Trước đây code gộp
chung `.CS`/`.KC` cho cả bốn → sai. Gốc của lỗi: `RA_SOAT_CHUAN_HOA_DANH_MUC.md:375`
đặt tiêu đề *"Khoá cột lưới Mô hình / DMNL có HẬU TỐ KHU VỰC"* nhưng bên
dưới chỉ trích công thức của **Mô hình**.

### B.1 Mô hình (m3/chuyến) — hậu tố LÀ khu vực

```
Khoá cột = <Chủng loại xe> . <CS|KC>          vd: CAT777E.CS
Khoá dòng = Chủng loại hàng
```

### B.2 Năng suất xe (996) — hậu tố là Phân loại, gốc vẫn là XE

Công thức `BR5`: `LEFT(DA5, LEN(DA5)−3) & "." & AD5`

```
Khoá cột = <Chủng loại xe> . <DAT|Than>       vd: CAT777E.DAT
Khoá dòng = Cung độ (>8 thì lấy 8; còn lại làm tròn 1 chữ số)
```

⚠ Chỗ này giao diện tôi dựng ngày 06/09 đang **sai**: đang lấy *Chủng
loại hàng* làm gốc thay vì *Chủng loại xe*. Chưa sửa — nằm ở bước 2.

### B.3 Định mức nhiên liệu — hậu tố THEO QUY TẮC (không phải khu vực)

Công thức `DE5`, gốc là `DQ` (Chủng loại xe **NL**), với
`DC = <Chủng loại xe>_<chữ đầu Hạng xe>` (vd `HM400-2R_C`):

| Thứ tự | Điều kiện | Hậu tố |
|---|---|---|
| 1 | `DC = "HM400-2R_C"` **và** Chủng loại hàng ∈ {B.Loang\*, B.Duot, DBuot, B.Duot.CN, Dbuot.CN} | `.Bun` |
| 2 | `DC` ∈ {VolvoA40-GCoi_A, VolvoA40-F_C, HM400-2R_C} **và** (CLH bắt đầu "bundac" **hoặc** Nơi dỡ tải ∈ {"Cạp đường.", "Cạp công nghệ."} **hoặc** Nơi dỡ tải bắt đầu "Cạp" **hoặc** SPNT = "Dat_CN") | `.Dat` |
| 3 | Nơi dỡ tải = "Băng tải." **hoặc** CLH ∈ {SPNT.via, SPNT_uot.via} | `.BK` |
| 4 | còn lại | `.` + Phân loại (`DAT`/`Than`) |

```
Khoá cột đầy đủ = <gốc + hậu tố> _ <cung độ>   vd: CAT777E.BK_0,05
Khoá dòng = Độ dốc (dải)  →  nội suy song tuyến (cung độ × độ dốc)
```

⚠ Code hiện tại (`ProductionKeys.vehicleFuelClassKey`) đang gắn `.CS`/`.KC`
— **sai**. Chưa sửa — nằm ở bước 2.

### B.4 HS điều chỉnh NLĐM — 12 tháng × 2 nhóm khu vực

```
Khoá dòng = <Chủng loại xe (NL)> _ <chữ đầu Hạng xe> _ <DAT|Than>
            vd: CAT777E_C_DAT
Khoá cột  = <tháng> . <nhóm khu vực>          vd: T6.CS
Hệ số năm = trung bình cộng 12 tháng
```

⚠ Engine hiện chỉ tra theo khu vực, **chưa xét tháng của ngày sản xuất**.
Chưa sửa — nằm ở bước 2.

### B.5 Quy ước "Phân loại" (QĐ-10)

`AD5 = IF(OR(LEFT(AG5,1)="S", LEFT(AG5,1)="D"), "DAT", "Than")`

Xét **chữ cái đầu** của Sản phẩm nghiệm thu, **không phải** tiền tố
`Dat_`/`Than_`. Lưu ý khi so chuỗi: Excel trả `"DAT"` viết HOA nhưng
`"Than"` viết thường; Excel `MATCH` không phân biệt hoa thường còn Java
`equals` thì có → **bắt buộc dùng `equalsIgnoreCase`**.

### B.6 Quy ước "Khu vực xúc" (QĐ-13)

Mọi công thức Excel so `D5 = "CS"` / `"KC"`, nhưng danh mục thật có 10 khu
vực (Khu Bắc, Khu Nam, Bãi thải…). Đã thêm thuộc tính **Nhóm khu vực**
(`CS`/`KC`) vào danh mục Khu vực xúc trong lượt này. Mọi so sánh phải so
theo **nhóm**, không so mã/tên khu vực.

Các chỗ đang so sai, **chưa sửa hết**: `ProductionKeys.vehicleFuelClassKey`,
`ReceivingFloorGroupCalculator` (đang so TÊN với `"Khe Chàm"`),
`TripBaseCalculator`, `FuelCalculator.coalCnNkFactor`, tỷ lệ đá thải `FK5`,
quy đổi m3 đá thải `FJ5`.

---

## C. BÁO CÁO THỐNG KÊ

### C.1 Con số tổng quát

| | Số cột |
|---|---|
| Excel gốc (sheet `tinh toan`, A..GY) | **206** |
| Phần mềm đang **hiển thị** | **40** |
| Đang được **lưu** (`production_results`) | **35** |
| Đặc tả chủ dự án mô tả | ~**75** |

### C.2 ĐÃ khớp Excel và chạy đúng

P · AD · AG · AI · AJ · AK · AL · AM · AN · AC · S,T,U · BT,BU,BV · BW ·
CR · CC..CG · toàn chuỗi nhiên liệu AZ→BQ · BR · DS,DT,DU,DW,DX,DY,DZ.

### C.3 THIẾU đầu vào — chặn cứng

| Trường | Backend | Màn nhập | Hệ quả |
|---|---|---|---|
| Hệ số chênh lệch CTNB | có cột | **không có ô nhập** | cột AF luôn = 1 |
| Đá thải (tấn) tự nhập | có cột | **không có ô nhập** | FJ/FK = 0 → AM sai với than vỉa |
| Hệ số chất tải bùn (cột V) | không có | không có | **Excel gốc cũng không có công thức** — cần chốt |
| Tầng dỡ tải kiểu số | đang là **String** | ô text | không tính được "Nâng tải toàn tuyến" |

### C.4 Hằng số nghiệp vụ chưa khai báo

| Hằng số | Hiện trạng |
|---|---|
| 3 tỷ lệ đá thải theo khu vực (`$D$3`, `$F$3`, `$B$3`) | chưa có |
| Quy đổi m3 đá thải: **2,625** (KC) / **2,617** (CS) | **không tồn tại ở bất kỳ đâu trong code** |
| `HS.THAN.TRUDA` = 0,985 | ✅ đã có |
| `HS.BUN` | code đọc nhưng **chưa nạp** → trả 0 kèm cảnh báo |

### C.5 Tính rồi nhưng bị vứt (chỉ cần lưu thêm)

- **Chuỗi nhiên liệu tính 18 cột, chỉ lưu 4.** Mất trắng: AP,AQ,AR,AS ·
  AT..AY · AZ · BA · BB · BC · BD · BE · BH..BO (8 khoản BSNL) · EC.
- Cột khác: P · BW · CP,CQ · EA.
- **Chưa tính**: AO (tổng km) · BS · CH,CI · **CK** (đầu vào bắt buộc của
  công thức đá thải FK5) · FJ,FK.

### C.6 Cột đặc tả để trống — vì Excel cũng trống

V · BO · BX · BY..CB · CJ · EK..EN. **Không phải thiếu sót của phần mềm**
— trong Excel gốc các ô này cũng không có công thức. Cần chủ dự án cho
biết chúng nhập tay hay bỏ hẳn.

---

## D. ĐÃ LÀM TRONG LƯỢT NÀY

### D.1 Bước 1 — chốt 5 mâu thuẫn ✅

Ghi thành **QĐ-10 … QĐ-13** trong `docs/DECISIONS.md`:
QĐ-10 (Phân loại = DAT/Than tự suy) · QĐ-11 (khoá ĐMNL theo quy tắc) ·
QĐ-12 (HS điều chỉnh 12 tháng × 2 khu vực) · QĐ-13 (Khu vực xúc nhiều
dòng, CS/KC là nhóm).

### D.2 Bước 5 — nối danh mục xe thành khoá ngoại thật ✅

Commit `25466f4`:

- `devices` có thêm **`vehicle_type_id`** (→ Chủng loại xe) và
  **`vehicle_rank_id`** (→ Hạng xe) — khoá ngoại thật, đã kiểm chứng
  ràng buộc FK trong PostgreSQL.
- Chuỗi tự do `vehicle_class` chuyển sang `@Deprecated`: giữ cột, giữ dữ
  liệu, engine **ưu tiên** `vehicleRank` và chỉ lùi về chuỗi cũ khi thiết
  bị chưa khai lại. Khi lưu, chỉ ghi đè `vehicle_class` nếu yêu cầu thực
  sự gửi giá trị — nếu không sẽ âm thầm xoá trắng dữ liệu cũ.
- `excavation_areas` có thêm **`area_group`** (CS/KC), có endpoint
  `GET /api/excavation-areas/area-groups` để giao diện không cắm cứng;
  giá trị sai bị chặn ở service, để trống vẫn hợp lệ.
- `VehicleRankResponse` có thêm `name` = chính mã hạng — vì cả combobox
  tham chiếu lẫn bảng tra tên→id khi nhập Excel đều đọc theo quy ước
  `name`, không có thì nhãn hiện trống.

**Kiểm chứng sống:** backend build + boot sạch (0 dòng lỗi trong log);
`psql` xác nhận 3 cột mới + ràng buộc FK; OpenAPI xác nhận endpoint mới và
đủ trường mới; mọi endpoint nghiệp vụ vẫn trả `401` đồng nhất, không có
`500` mới; frontend build sạch (`tsc -b && vite build` trong container).

### D.3 Chỗ hở còn lại của bước 5

`FuelCalculator.vehicleModel()` vẫn đọc `Device.category.name` (danh mục
Loại thiết bị) và chú thích là "DQ5 — Chủng loại xe". Theo QĐ-11, DQ phải
là **Chủng loại xe (NL)** = `Device.fuelClass.code`. Chưa sửa vì đó là
việc của bước 2 (viết lại `ProductionKeys`) — sửa lẻ ở đây sẽ làm hai nơi
hiểu khác nhau.

---

## E. CÒN LẠI CỦA KẾ HOẠCH 8 BƯỚC

| Bước | Nội dung | Trạng thái |
|---|---|---|
| 1 | Chốt 5 mâu thuẫn | ✅ xong (QĐ-10…13) |
| 5 | Nối danh mục xe thành khoá ngoại | ✅ xong (làm trước vì bước 2 phụ thuộc) |
| **2** | Sửa `ProductionKeys` cho ĐMNL + sửa 3 giao diện (ĐMNL, Năng suất xe, HS điều chỉnh) | ⏳ **việc tiếp theo** |
| 3 | Bổ sung 4 ô nhập ở màn báo chuyến | ⏳ |
| 4 | Khai hằng số còn thiếu vào danh mục Hệ số | ⏳ |
| 6 | Lưu thêm các cột đang bị vứt + mở rộng màn báo cáo | ⏳ |
| 7 | Nhập dữ liệu danh mục thật | ⏳ *(cần chủ dự án)* |
| 8 | Quyết định số phận nhóm cột "bùn" và ~60 cột chưa nhắc tới | ⏳ *(cần chủ dự án)* |

---

## F. NĂM ĐIỂM CẦN CHỦ DỰ ÁN XÁC NHẬN LOGIC

1. **Danh mục "Phân loại"** (§A.5) — QĐ-10 đã xác định 3 bảng tra không
   dùng nó. Vậy danh mục này dùng vào việc gì, hay bỏ?

2. **Khoá cột Năng suất xe** (§B.2) — Excel nói gốc là **Chủng loại xe**
   (`CAT777E.DAT`), nhưng mockup ngày 06/09 ghi "Chủng loại hàng + Phân
   loại" và giao diện đã dựng theo mockup. Xác nhận lại: theo Excel?

3. **Danh mục "Chủng loại xe + Phân loại"** (§A.2) — nếu khoá Năng suất xe
   dựng theo quy tắc từ Chủng loại xe + Phân loại tự suy, thì danh mục này
   có còn cần không?

4. **Báo chuyến Khai thác không vào engine** — engine chỉ đọc báo chuyến
   Vận tải; cột E (Máy xúc, thành phần bắt buộc của khoá `CR`) đang lấy từ
   phía Vận tải. Chốt: đối soát Khai thác ↔ Vận tải, hay chỉ dùng số Vận
   tải?

5. **Phạm vi màn báo cáo** — hiện 40/206 cột. Hiện đủ 206 cột như Excel,
   hay giữ bộ rút gọn trên màn hình + xuất Excel đầy đủ?

---

## G. LƯU Ý KỸ THUẬT KHI TIẾP TỤC

- **Dữ liệu DEMO phải xoá**: 486 ô lưới ĐMNL (`matrix_definitions` id=155)
  là dữ liệu giả nạp thẳng bằng `psql`, chỉ để xem giao diện.
- **Chưa click-through được giao diện**: chưa có mật khẩu Portal (quy tắc
  dự án mục 8). Mọi kiểm chứng cho tới nay là build sạch + `psql` + OpenAPI
  + mã trạng thái HTTP. Việc đầu tiên khi có tài khoản: mở
  `/danh-muc/thuoc-tinh-san-luong-xe` xác nhận 2 combobox mới (Chủng loại
  xe, Hạng xe) và `/danh-muc/khu-vuc-xuc` xác nhận combobox Nhóm khu vực.
- **Không có test tự động cho engine**: `backend/src/test` chỉ có
  `contextLoads`, và test đó vốn đã fail khi chạy độc lập (cần Postgres/Redis
  sống, không có H2/Testcontainers). Sửa engine ở bước 2 sẽ **không có lưới
  an toàn** — nên bổ sung test đơn vị cho `ProductionKeys` trước khi đổi.
