# Thiết kế — 7 danh mục phần Thống kê sản lượng

Nguồn: mockup + đặc tả chủ dự án cung cấp 2026-08-30 (lượt sau khi đã xong
5 danh mục địa điểm/hàng hoá). Đối chiếu với
[`REQUIREMENT_SANLUONG.md`](REQUIREMENT_SANLUONG.md) mục 2.2–2.4 — 7 danh
mục này chính là phần còn thiếu của "Danh mục và Công thức".

---

## 0. Kết luận trước: chúng chia làm HAI loại rất khác nhau

| Nhóm | Danh mục | Vừa `CatalogPage` sẵn có? |
|---|---|---|
| **A — đơn giản** | Nhóm chủng loại hàng · Sản phẩm nghiệm thu · TTL CLH | ✅ Vừa khít, không phải viết gì mới |
| **B — phức tạp** | Tỷ trọng · AP Tdia · STD (Đất SX/Than SX) · STD (Đất CN) | ❌ Cần hạ tầng mới |

Nhóm A dùng lại nguyên `CatalogPage` + config — mỗi màn ~6 dòng code.

Nhóm B **không** dùng lại được, vì cả bốn đều có ít nhất một trong ba đặc
điểm mà `CatalogPage` không có:

1. **Cấu trúc phiếu-đầu + nhiều dòng chi tiết** (một khoảng thời gian chứa
   nhiều dòng), thay vì bảng phẳng.
2. **Nhóm cột lồng nhau** — vd `Đất CN` gồm 3 cột con `Tổng m3 / Tổng KLVC
   / Tổng Tkm`. AP Tdia có tới 4 nhóm, ~30 cột.
3. **Bộ dựng khoá "Nhóm vỉa + Máy xúc"** — 6 ô chọn ghép lại thành một
   chuỗi khoá (đúng QĐ-06).

---

## 1. Nhóm A — ba danh mục đơn giản

### 1.1. Nhóm chủng loại hàng — **KHÔNG tạo mới, đã có `CargoGroup`**

Bảng `cargo_groups` đã tồn tại với đúng 3 trường cần: `code`, `name`,
`description`. Đây chính là "Nhóm chủng loại hàng", và `CargoType.cargoGroup`
đang trỏ vào nó.

Việc cần làm: nâng `CargoGroupController` từ **chỉ-đọc** lên **CRUD đầy đủ**
(giống đã làm với `CargoType`), rồi thêm một config vào `CatalogPage`.

> Nếu tạo bảng mới thì lại rơi đúng cái bẫy "hai thực thể cho một khái niệm"
> đã gặp với `Material`/`CargoType` (QĐ-09) và với `Location`.

### 1.2. Sản phẩm nghiệm thu — bảng MỚI `acceptance_products`

```
AcceptanceProduct : code (duy nhất), name, note
```

### 1.3. TTL CLH — bảng MỚI `ttl_clh`

```
TtlClh : code (duy nhất), name, note
```

### 1.4. ⚠ Hệ quả: phải CHUẨN HOÁ hai trường trên `CargoType`

Hiện `CargoType.acceptanceProduct` và `.ttlClh` là **chuỗi tự do**, kèm hai
endpoint trả `DISTINCT` để đổ combobox. Lúc đó chưa có danh mục nên đó là
lựa chọn đúng (xem QĐ-09).

Giờ đã có danh mục thật → phải đổi thành **khoá ngoại**:

```
CargoType.acceptanceProduct : String  ->  ManyToOne AcceptanceProduct
CargoType.ttlClh            : String  ->  ManyToOne TtlClh
```

Kèm theo:
- Di trú dữ liệu: gom `DISTINCT` giá trị chuỗi đang có → tạo bản ghi danh
  mục → trỏ khoá ngoại (cùng khuôn với 2 script di trú `locations`).
- Bỏ 2 endpoint `/acceptance-products` và `/ttl-clh` trên `CargoTypeController`;
  combobox chuyển sang `optionsPath` trỏ danh mục mới.
- `CatalogPage` đã hỗ trợ sẵn `optionsPath` nên phía giao diện chỉ đổi config.

**Đây là thay đổi có chủ đích so với QĐ-09, không phải làm lại từ đầu:**
QĐ-09 chốt *hợp nhất Material vào CargoType*, còn việc SPNT/TTL là chuỗi hay
khoá ngoại khi đó để ngỏ vì chưa có danh mục.

---

## 2. Nhóm B — bốn danh mục phức tạp

### 2.1. Tỷ trọng

Đây là danh mục **tham số theo thời gian** đầu tiên được thực thi — đúng
QĐ-04.

**Cấu trúc 3 tầng** (đọc từ mockup):

```
Phiếu:      Thời gian (từ – đến)  +  Khu vực xúc ("Tất cả khu vực" hoặc 1 khu)
  └─ Dòng:  Chủng loại hàng (kéo theo Nhóm CLH, SPNT, TTL CLH — chỉ đọc)
       └─ Khoảng con: mỗi CLH có thể có NHIỀU khoảng thời gian, mỗi khoảng
                      một cặp giá trị Tỷ trọng (quy ẩm) / (không quy ẩm)
```

Tầng thứ ba là chỗ mockup dùng nút `+` để mở rộng dòng — ảnh cho thấy dòng 1
(CLH001) có 2 khoảng: `01/01–31/05` giá trị 1,300/1,360 và `01/06–31/12` giá
trị 1,400/1,460.

**Mô hình dữ liệu — bỏ tầng phiếu, lưu phẳng:**

```
DensityParameter
  ─ cargoType      → CargoType     (kéo theo Nhóm CLH / SPNT / TTL CLH)
  ─ excavationArea → ExcavationArea (NULL = áp cho mọi khu vực)
  ─ effectiveFrom, effectiveTo : LocalDate
  ─ densityWet   (Tỷ trọng quy ẩm)
  ─ densityDry   (Tỷ trọng không quy ẩm)
  ─ note
```

Phiếu-đầu ở giao diện chỉ là **cách nhập cho nhanh** (điền sẵn thời gian +
khu vực cho mọi dòng), không cần bảng riêng. Lưu phẳng thì việc **tra cứu
theo ngày sản xuất** — thứ mà công thức thật cần — trở thành một câu query
đơn giản.

**Ràng buộc bắt buộc (QĐ-04):**
- Không chồng lấn trên `(cargoType, excavationArea)` — dùng
  `EXCLUDE USING gist (… WITH =, daterange(from,to) WITH &&)`.
- `excavationArea = NULL` nghĩa là "mọi khu vực"; khi tra thì **ưu tiên bản
  ghi có khu vực cụ thể**, không có mới lấy bản NULL.
- Tra trượt → lỗi nghiệp vụ, không trả 0.

⚠ **Điểm phải hỏi chủ dự án:** hàng "Tất cả khu vực" và một hàng cho khu vực
cụ thể có khoảng thời gian giao nhau thì bản cụ thể thắng — tôi thiết kế
theo cách này (đặc tả không nói rõ). Nếu sai thì số tỷ trọng sẽ sai.

### 2.2. AP Tdia (m3–tấn–tkm) — CHỈ XEM

Đặc tả ghi rõ *(only view)*. Không có thêm/sửa/xoá.

```
SurveyCoefficient (ap_tdia)
  ─ period : YearMonth        (mockup nhóm theo tháng: 01/2026 … 12/2026)
  ─ excavator      → Device
  ─ seamGroupKey   → SeamGroupExcavatorKey   ("Nhóm vỉa + Máy xúc")
  ─ 9 cột tổng   : {datCn, datSx, than} × {m3, tan, tkm}
  ─ 9 cột trắc địa: {datCn, datSx, thanSx} × {m3, tan, tkm}
  ─ 9 cột hệ số  : hs{DatCn, DatSx, ThanSx} × {m3, tan, tkm}
```

27 cột số + 3 cột khoá = **30 cột**, chia **4 nhóm** trên giao diện.

**Giao diện:** danh sách tháng bên trái + bảng bên phải (đúng mockup), bảng
cuộn ngang trong khung riêng, đóng băng 3 cột đầu. Lọc theo Năm / Máy xúc /
Nhóm vỉa+Máy xúc. Chỉ có nút **Tải xuống (Excel)**.

**Nguồn dữ liệu:** ⚠ chưa rõ. Bảng này trong Excel do bên Trắc địa cấp. Chỉ
xem nghĩa là dữ liệu vào bằng con đường khác — nhập Excel? đồng bộ? Cần hỏi.

### 2.3. STD (Đất SX/Than SX) và 2.4. STD (Đất CN)

Hai màn cùng khuôn, khác bộ cột:

```
SurveyStandard
  ─ effectiveFrom, effectiveTo
  ─ seamGroupKey → SeamGroupExcavatorKey
  ─ productType  : DAT_SX | THAN_SX | DAT_CN
  ─ m3, vTke, cLech, tan, cd, theTrong, tkm
```

Đất SX/Than SX hiện **2 nhóm cột 7 chỉ tiêu**; Đất CN hiện **1 nhóm**. Dùng
chung một bảng, khác nhau ở `productType` và bộ cột hiển thị.

**Phần khó nhất: bộ dựng khoá "Nhóm vỉa + Máy xúc"** — đúng QĐ-06. Mockup
cho thấy 6 ô chọn, và chuỗi khoá hiện ngay dưới:

```
[Nhóm vỉa ▾] [Nhóm tầng ▾] [Máy xúc ▾] [Ký hiệu bùn ▾] [Khu vực xúc ▾] [Hậu tố ▾]
                    ↓
        14-5_75_P16_CS_BK_-          ← sinh tự động, chỉ để hiển thị
```

Đúng nguyên tắc QĐ-06: **các thành phần là cột riêng có khoá ngoại; chuỗi
ghép chỉ là giá trị dẫn xuất**, không phải thứ người dùng gõ và không dùng
để `JOIN`.

Cần bảng `SeamGroupExcavatorKey` (đã đặc tả ở `REQUIREMENT_SANLUONG.md` 3.4)
và một component `SeamGroupKeyPicker` dùng chung cho cả 3 màn (2 STD + AP
Tdia lọc).

---

## 3. Hạ tầng giao diện cần thêm cho nhóm B

`CatalogPage` hiện tại **giữ nguyên**, không sửa. Thêm mới:

| Thành phần | Dùng cho |
|---|---|
| `MasterDetailCatalogPage` | Tỷ trọng, 2 STD — bảng ngoài theo khoảng thời gian, mở ra xem/sửa chi tiết |
| `GroupedColumnsTable` | AP Tdia, 2 STD — tiêu đề cột 2 tầng |
| `SeamGroupKeyPicker` | 2 STD + lọc AP Tdia |
| `DateRangeRowsEditor` | Tỷ trọng — nhiều khoảng thời gian con trong một dòng |
| `ReadOnlyPeriodPage` | AP Tdia — danh sách tháng + bảng chỉ xem |

---

## 4. Thứ tự làm đề xuất

| Bước | Nội dung | Vì sao trước |
|---|---|---|
| **1** | 3 danh mục nhóm A + chuẩn hoá `CargoType` | Nhanh, và **Tỷ trọng phụ thuộc** vào Chủng loại hàng đã chuẩn hoá |
| **2** | `SeamGroupExcavatorKey` + `SeamGroupKeyPicker` | Cả 3 màn còn lại đều cần |
| **3** | 2 màn STD | Dùng khoá vừa dựng, cấu trúc đơn giản hơn Tỷ trọng |
| **4** | Tỷ trọng | Phức tạp nhất (3 tầng), và cần Chủng loại hàng ở bước 1 |
| **5** | AP Tdia | Chỉ xem, nhưng **chờ trả lời dữ liệu vào bằng đường nào** |

---

## 5. Câu hỏi cần chủ dự án trả lời

1. **AP Tdia lấy dữ liệu từ đâu?** Chỉ-xem nghĩa là có nguồn khác — nhập
   Excel, hay đồng bộ từ hệ Trắc địa? (chặn bước 5)
2. **Tỷ trọng:** bản ghi "Tất cả khu vực" và bản ghi khu vực cụ thể chồng
   thời gian thì lấy bản nào? Tôi thiết kế **bản cụ thể thắng**.
3. **Hậu tố** trong khoá Nhóm vỉa+Máy xúc: mockup có ô chọn với giá trị `-`
   và `BK`. Danh sách hậu tố đầy đủ là gì? Công thức Excel cho thấy
   `_BK`, `_SPNT`, `_2,25`, `_dthai` — có phải chọn tay hay hệ tự suy?
4. **STD:** một `Nhóm vỉa + Máy xúc` trong cùng một khoảng thời gian có được
   phép xuất hiện nhiều lần không? (quyết định ràng buộc duy nhất)
5. **Tỷ trọng** — mockup hiện cột `Mã chủng loại hàng`, `Chủng loại hàng`,
   `Nhóm CLH`, `SPNT`, `TTL CLH` ở dạng **chỉ đọc kéo theo Chủng loại hàng**,
   đúng không? (nếu sửa được thì lại là nhập trùng dữ liệu danh mục)
