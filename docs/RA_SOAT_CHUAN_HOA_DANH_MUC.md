# Rà soát & chuẩn hoá danh mục trước khi dựng Báo cáo thống kê

Rà soát 2026-08-30 theo yêu cầu chủ dự án: đọc lại `Module Thống kê sản
lượng.docx` và workbook `Tháng 5 đổi tên xe.xlsx`, đối chiếu với những gì
ĐÃ dựng, trước khi code phần Báo cáo thống kê.

**Nguồn quyết định** khi docx và Excel mâu thuẫn: **Excel** (đã thống nhất,
xem `CLAUDE.md`). Riêng những chỗ chủ dự án đã chốt trong `DECISIONS.md`
thì theo quyết định đó.

---

## 1. Nguồn tra cứu THẬT mà công thức dùng

Đếm trực tiếp trên 140 công thức của dòng master (dòng 5) sheet `tinh toan`:

| Lần dùng | Bảng tra | Đã dựng? |
|---|---|---|
| 32 | `Cap nhat Slg ThanV+Dat B1` — dữ liệu báo chuyến đã chốt | ⚠ chưa (là **đầu vào**, không phải danh mục) |
| **21** | `Mohinh_TheTrong( ko dk xoa)` | ❌ **chưa** |
| **20** | `DMNL T2-2025` — định mức nhiên liệu | ❌ chưa |
| 9 | `AP Tdia(m3-tan-tkm)` | ❌ chưa |
| 6 | `Ap Tkm` | ❌ chưa — **chưa từng được liệt kê** |
| 3 | `STD(DatCN)` | ❌ chưa |
| 3 | `STD(Dat+thanSX)` | ❌ chưa |
| 2 | `AP BBNT xe-SP` | ❌ chưa — **chưa từng được liệt kê** |
| 1 | `KBTC Xe&May Xuc(ko dk xoa)` — Nhóm vỉa theo Nơi nhận tải | ⚠ một phần (`ReceivingPoint.seamGroup`) |
| 1 | `DuKien HS theo -2%` | ❌ chưa — **chưa từng được liệt kê** |
| — | named range `DSXE` / `DSMAY` — thông tin xe / máy | ⚠ một phần (`Device`) |
| — | 5 bảng tra **nằm ngay trong sheet** `tinh toan` (vùng `EO..GY`) | ❌ chưa |

---

## 2. Bốn phát hiện phải xử lý trước khi code

### 2.1. ⚠ Bản docx TỰ MÂU THUẪN về nguồn Tỷ trọng

Ba chỗ trong cùng một tài liệu nói ba kiểu:

| Dòng | Nội dung |
|---|---|
| 132 | định nghĩa **"Tỷ trọng (danh mục)"** riêng, có `Thời gian` + `Khu vực xúc` |
| 285 | *"Tỷ trọng (cập nhật) = 0 → Đối chiếu **danh mục Tỷ trọng** (quy ẩm)"* |
| 470, 476 | *"Đối chiếu theo **danh mục Mô hình** theo Chủng loại hàng – Tỷ trọng"* |

Excel làm theo cách thứ ba: **cả 3 bước lấy tỷ trọng đều tra sheet
`Mohinh_TheTrong`**, khoá `Chủng loại hàng`, cột `CS.TyTrong`/`KC.TyTrong`
và `CS.TyTrongKoQA`/`KC.TyTrongKoQA` — **không có chiều thời gian**.

**Xử lý:** giữ **QĐ-04** (chủ dự án đã chốt: danh mục Tỷ trọng có khoảng
thời gian). Nhưng **tách làm HAI danh mục**, không gộp như Excel:

| | Khoá | Giá trị |
|---|---|---|
| **Tỷ trọng** | Chủng loại hàng × Khu vực xúc × **khoảng thời gian** | quy ẩm, không quy ẩm |
| **Mô hình** | Chủng loại hàng × **Chủng loại xe** | m3/chuyến |

Excel gộp vào một sheet vì Excel khó làm hai bảng. Trong CSDL hai bảng mới
đúng — **khoá của chúng khác hẳn nhau** (một bên theo khu vực, một bên theo
chủng loại xe).

### 2.2. ⚠ Mô hình là bảng HAI CHIỀU, không phải danh sách phẳng

```excel
INDEX('Mohinh_TheTrong…'!$C$4:$AX$149,
      MATCH($K5,  …$B$4:$B$149, 0),     ← dòng  = Chủng loại hàng
      MATCH($DA5, …$C$3:$AX$3,  0))     ← cột   = Chủng loại xe + DMNL
```

Thiết kế cũ của tôi ghi *"`ModelParameter`: chủng loại hàng × chủng loại xe"*
— đúng, nhưng **giao diện phải là lưới hai chiều** (dòng = CLH, cột = chủng
loại xe), không phải bảng phẳng như 8 danh mục đã dựng. Nhập ~145 CLH × ~48
chủng loại xe bằng bảng phẳng là không dùng được.

### 2.3. ⚠ Ba bảng tra CHƯA TỪNG được liệt kê trong bất kỳ đặc tả nào

Chúng chỉ lộ ra khi đọc công thức thật:

| Bảng | Dùng ở | Vai trò |
|---|---|---|
| `Ap Tkm` | 6 lần (`DY`, `DZ`) | hệ số trắc địa cho **tấn** và **tkm**, tách khỏi `AP Tdia` |
| `AP BBNT xe-SP` | 2 lần (`CN`) | Tên nghiệm thu, tra bằng khoá ghép `SPNT_CLH_NơiNhận_NơiDỡ` |
| `DuKien HS theo -2%` | 1 lần (`EQ`) | hệ số dự kiến |

Ngoài ra **5 bảng tra nhỏ nằm ngay trong sheet `tinh toan`** (vùng `EO..GY`):
Năng suất xe (`NS.XE`), Gầu xúc theo chủng loại máy (`FS/FT`), Tải trọng xe
theo chủng loại (`FQ/FR`), HS điều chỉnh NLĐM (`FW/FX/FY`), HSDML (`EO/EP/EQ`).

**Không thể bỏ qua** — thiếu chúng thì không tính ra được `BQ` (NLĐM hiện
hành), `BR` (định mức năng suất), `EF`, `EQ`.

### 2.4. ⚠ `Device` còn thiếu 4 thuộc tính mà công thức cần

Công thức lấy từ named range `DSXE` (danh mục xe):

| Cột Excel | Nội dung | Có trong `Device`? |
|---|---|---|
| `CX` | `CaiTaoToa` | ❌ |
| `DB` | Hạng xe (A/B/C1/khác) | ❌ |
| `DA`/`DQ` | Chủng loại xe + DMNL | ❌ |
| — | Chất lượng (dùng tra HS điều chỉnh) | ❌ |
| `DG`,`DN` | Gầu xúc, QLTB (từ `DSMAY`) | ❌ |

Đã ghi trong `DESIGN_SANLUONG.md` mục 2.2 nhưng **chưa thực thi**.

---

## 3. Bảng đối chiếu: đã dựng vs còn thiếu

### 3.1. Đã dựng và ĐÚNG (8 danh mục)

| Danh mục | Bảng | Ghi chú |
|---|---|---|
| Khu vực xúc | `excavation_areas` | ✅ |
| Nơi nhận tải | `receiving_points` | ✅ có `seamGroup` |
| Nơi dỡ tải | `unloading_points` | ✅ |
| Nơi chất tải | `pickup_points` | ✅ |
| Chủng loại hàng | `cargo_types` | ✅ |
| Nhóm chủng loại hàng | `cargo_groups` | ✅ |
| Sản phẩm nghiệm thu | `acceptance_products` | ✅ |
| TTL CLH | `ttl_clh_items` | ✅ |

### 3.2. Cần sửa trên cái đã dựng (3 việc)

| # | Việc | Vì sao |
|---|---|---|
| S1 | `CargoType.acceptanceProduct` / `.ttlClh`: chuỗi → **khoá ngoại** + di trú | Đã có danh mục thật (mục 2.4 `DESIGN_DANH_MUC_SANLUONG.md`) |
| S2 | `ReceivingPoint.seamGroup`: chuỗi → **khoá ngoại** tới danh mục Nhóm vỉa | Nhóm vỉa là thành phần của khoá `Nhóm vỉa + Máy xúc` (QĐ-06) |
| S3 | `Device`: thêm 4–6 thuộc tính ở mục 2.4 | Công thức nhiên liệu và năng suất cần |

### 3.3. Còn thiếu — 12 danh mục

Xếp theo **thứ tự phụ thuộc**, đúng yêu cầu "tuần tự từ danh mục".

| Lớp | Danh mục | Khoá | Kiểu giao diện |
|---|---|---|---|
| **1** | Nhóm vỉa | mã, tên | bảng phẳng ✅ dùng lại `CatalogPage` |
| **1** | Nhóm tầng | giá trị số | bảng phẳng |
| **1** | Chủng loại xe + DMNL | mã, tên | bảng phẳng |
| **1** | Chủng loại xe + Phân loại | mã, tên | bảng phẳng |
| **1** | Hệ số (Than tke trừ đá/Than kcs…) | mã hệ số | bảng phẳng |
| **2** | **Nhóm vỉa + Máy xúc** | 6 thành phần → chuỗi | **bộ dựng khoá** (QĐ-06) |
| **2** | **Tỷ trọng** | CLH × Khu vực × thời gian | phiếu-đầu + dòng |
| **2** | **Mô hình (m3/ch)** | CLH × Chủng loại xe | **lưới 2 chiều** |
| **2** | **Định mức nhiên liệu** | (CLxe+DMNL, cung độ) × độ dốc | **lưới 2 chiều** |
| **2** | Năng suất xe (996) | (CLxe+Phân loại) × cung độ | lưới 2 chiều |
| **2** | HS điều chỉnh NLĐM | CLxe_Hạng_Phân loại × khu vực | lưới 2 chiều |
| **3** | STD (Đất SX/Than SX), STD (Đất CN) | Nhóm vỉa+Máy xúc × thời gian | phiếu-đầu + dòng |
| **3** | AP Tdia + Ap Tkm | Nhóm vỉa+Máy xúc × tháng | chỉ xem, cột lồng |
| **3** | Kỳ báo cáo (QĐ-05) | năm, tháng, số kỳ | bảng phẳng |

**Nhận xét quan trọng:** 5 danh mục ở lớp 2 đều là **lưới hai chiều**. Đây
là kiểu giao diện thứ ba (sau bảng phẳng và phiếu-đầu+dòng) — cần một
thành phần `MatrixCatalogPage` dùng chung, nếu không sẽ phải viết 5 lần.

---

## 4. Menu "Báo cáo thống kê" — đầu ra cuối cùng

Chính là sheet `tinh toan`: **mỗi dòng = một chuyến đã đối soát**, 206 cột.

**Nguồn vào:** cặp đã đối soát (Khai thác × Vận tải) ở trạng thái đã chốt —
tương ứng sheet `Cap nhat Slg ThanV+Dat B1` (32/140 công thức trỏ vào đây).

**Không lưu 206 cột.** Chỉ lưu:
- các chỉ tiêu đầu ra thật sự cần (`ProductionResult`, `DESIGN_SANLUONG.md` 3.7);
- các cột trung gian (`AP`…`AY` nội suy, `CO`…`CW` khoá ghép) **tính lại khi
  cần**, không lưu — chúng chỉ là bước đệm của Excel.

**Giao diện:** chọn kỳ/tháng → bảng cột lồng nhiều tầng, cuộn ngang, đóng
băng cột trái, xuất Excel. Cùng loại với AP Tdia.

---

## 5. Chốt lại thứ tự làm

| Bước | Nội dung | Điều kiện |
|---|---|---|
| **B1** | S1+S2+S3 (sửa 3 chỗ đã dựng) + 5 danh mục phẳng lớp 1 | không chặn |
| **B2** | `MatrixCatalogPage` + `SeamGroupKeyPicker` | hạ tầng cho B3 |
| **B3** | 5 lưới 2 chiều + Nhóm vỉa+Máy xúc + Tỷ trọng | cần B1, B2 |
| **B4** | STD ×2, Kỳ báo cáo | cần B2 |
| **B5** | AP Tdia + Ap Tkm | **chặn**: chưa biết dữ liệu vào bằng đường nào |
| **B6** | Engine tính 25 bước + màn Báo cáo thống kê | cần tất cả |

---

## 6. Câu hỏi phải trả lời trước khi code

**Chặn:**

1. **AP Tdia / Ap Tkm lấy dữ liệu từ đâu?** Đặc tả ghi *(only view)*. Nhập
   Excel, hay đồng bộ từ hệ Trắc địa? (chặn B5, và B6 phụ thuộc B5)
2. **`Ap Tkm`, `AP BBNT xe-SP`, `DuKien HS theo -2%`** — ba bảng chưa từng
   được nhắc trong đặc tả. Chúng là danh mục người dùng quản lý, hay bảng
   trung gian do hệ tự sinh?

**Không chặn nhưng ảnh hưởng thiết kế:**

3. **Tỷ trọng:** bản "Tất cả khu vực" và bản khu vực cụ thể chồng thời gian
   → tôi thiết kế **bản cụ thể thắng**. Đúng không?
4. **Hậu tố** khoá Nhóm vỉa+Máy xúc: Excel cho thấy `_BK`, `_SPNT`, `_2,25`,
   `_dthai` được **hệ TỰ SUY** từ Nơi dỡ tải / Nhóm CLH / Tỷ trọng, nhưng
   mockup lại có ô **chọn tay**. Cái nào đúng?
5. **Kỳ báo cáo của màn Báo cáo thống kê**: theo kỳ 7 ngày (QĐ-05) hay theo
   tháng như sheet Excel?
