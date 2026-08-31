# Rà soát & chuẩn hoá danh mục trước khi dựng Báo cáo thống kê

Rà soát 2026-08-30 theo yêu cầu chủ dự án: đọc lại `Module Thống kê sản
lượng.docx` và workbook `Tháng 5 đổi tên xe.xlsx`, đối chiếu với những gì
ĐÃ dựng, trước khi code phần Báo cáo thống kê.

**Trạng thái: ĐÃ CHỐT.** Chủ dự án đã trả lời 2 câu chặn (mục 7); 3 câu
còn lại tự tra được trong docx. Không còn gì chặn — đủ điều kiện code.

**Nguồn quyết định** khi docx và Excel mâu thuẫn: **Excel** (đã thống nhất,
xem `CLAUDE.md`). Riêng những chỗ chủ dự án đã chốt trong `DECISIONS.md`
thì theo quyết định đó.

---

## 1. Nguồn tra cứu THẬT mà công thức dùng

Đếm trực tiếp trên 140 công thức của dòng master (dòng 5) sheet `tinh toan`:

| Lần dùng | Bảng tra | Bản chất | Đã dựng? |
|---|---|---|---|
| 32 | `Cap nhat Slg ThanV+Dat B1` | dữ liệu báo chuyến đã chốt | ⚠ là **đầu vào**, không phải danh mục |
| **21** | `Mohinh_TheTrong( ko dk xoa)` | danh mục | ❌ chưa |
| **20** | `DMNL T2-2025` | danh mục | ❌ chưa |
| 9 | `AP Tdia(m3-tan-tkm)` | **hệ TỰ SINH** | ❌ chưa |
| 6 | `Ap Tkm` | **hệ TỰ SINH** | ❌ chưa |
| 3 | `STD(DatCN)` | danh mục | ❌ chưa |
| 3 | `STD(Dat+thanSX)` | danh mục | ❌ chưa |
| 2 | `AP BBNT xe-SP` | **hệ TỰ SINH** | ❌ chưa |
| 1 | `KBTC Xe&May Xuc(ko dk xoa)` | danh mục | ⚠ một phần (`ReceivingPoint.seamGroup`) |
| 1 | `DuKien HS theo -2%` | **hệ TỰ SINH** | ❌ chưa |
| — | named range `DSXE` / `DSMAY` | danh mục xe/máy | ⚠ một phần (`Device`) |
| — | 5 bảng tra **nằm ngay trong sheet** (vùng `EO..GY`) | danh mục | ❌ chưa |

**4 bảng "hệ tự sinh"** (chủ dự án xác nhận) — người dùng KHÔNG nhập, hệ
tính ra. Chúng là *kết quả trung gian*, không phải danh mục. Đây là thay
đổi kiến trúc quan trọng, xem mục 4.

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

Thiết kế cũ ghi *"`ModelParameter`: chủng loại hàng × chủng loại xe"* —
đúng, nhưng **giao diện phải là lưới hai chiều** (dòng = CLH, cột = chủng
loại xe). Nhập ~145 CLH × ~48 chủng loại xe bằng bảng phẳng là không dùng
được.

### 2.3. ⚠ Ba bảng tra không có trong đặc tả — đã xác định là hệ tự sinh

Chúng chỉ lộ ra khi đọc công thức thật. Chủ dự án xác nhận **cả ba là bảng
trung gian hệ tự sinh**, không phải danh mục người dùng nhập:

| Bảng | Dùng ở | Vai trò |
|---|---|---|
| `Ap Tkm` | 6 lần (`DY`, `DZ`) | hệ số trắc địa cho **tấn** và **tkm**, áp ở bước sau `AP Tdia` |
| `AP BBNT xe-SP` | 2 lần (`CN`) | Tên nghiệm thu, khoá ghép `SPNT_CLH_NơiNhận_NơiDỡ` |
| `DuKien HS theo -2%` | 1 lần (`EQ`) | hệ số dự kiến |

Ngoài ra **5 bảng tra nhỏ nằm ngay trong sheet `tinh toan`** (vùng `EO..GY`)
— những cái này **là danh mục thật**, chỉ bị nhét vào sheet cho tiện:
Năng suất xe (`NS.XE`), Gầu xúc theo chủng loại máy, Tải trọng xe theo
chủng loại, HS điều chỉnh NLĐM, HSDML. Thiếu chúng thì không tính được
`BQ` (NLĐM hiện hành), `BR` (định mức năng suất), `EF`, `EQ`.

### 2.4. ⚠ `Device` còn thiếu 4–6 thuộc tính mà công thức cần

Lấy từ named range `DSXE`/`DSMAY`:

| Cột Excel | Nội dung | Có trong `Device`? |
|---|---|---|
| `CX` | `CaiTaoToa` | ❌ |
| `DB` | Hạng xe (A/B/C1/khác) | ❌ |
| `DA`/`DQ` | Chủng loại xe + DMNL | ❌ |
| — | Chất lượng (tra HS điều chỉnh) | ❌ |
| `DG`,`DN` | Gầu xúc, QLTB (từ `DSMAY`) | ❌ |

Đã ghi trong `DESIGN_SANLUONG.md` mục 2.2 nhưng **chưa thực thi**.

---

## 3. Bảng đối chiếu: đã dựng vs còn thiếu

### 3.1. Đã dựng và ĐÚNG (8 danh mục)

`excavation_areas`, `receiving_points` (có `seamGroup`), `unloading_points`,
`pickup_points`, `cargo_types`, `cargo_groups`, `acceptance_products`,
`ttl_clh_items`.

### 3.2. Cần sửa trên cái đã dựng (3 việc)

| # | Việc | Vì sao |
|---|---|---|
| S1 | `CargoType.acceptanceProduct` / `.ttlClh`: chuỗi → **khoá ngoại** + di trú | Đã có danh mục thật |
| S2 | `ReceivingPoint.seamGroup`: chuỗi → **khoá ngoại** tới danh mục Nhóm vỉa | Nhóm vỉa là thành phần khoá ghép (QĐ-06) |
| S3 | `Device`: thêm 4–6 thuộc tính ở mục 2.4 | Công thức nhiên liệu + năng suất cần |

### 3.3. Còn thiếu — 12 danh mục người dùng nhập

Xếp theo **thứ tự phụ thuộc**, đúng yêu cầu "tuần tự từ danh mục".

| Lớp | Danh mục | Khoá | Kiểu giao diện |
|---|---|---|---|
| **1** | Nhóm vỉa | mã, tên | bảng phẳng ✅ dùng lại `CatalogPage` |
| **1** | Chủng loại xe + DMNL | mã, tên | bảng phẳng |
| **1** | Chủng loại xe + Phân loại | mã, tên | bảng phẳng |
| **1** | Hệ số (Than tke trừ đá / Than kcs…) | mã hệ số | bảng phẳng |
| **1** | Kỳ báo cáo (QĐ-05) | năm, tháng, số kỳ | bảng phẳng |
| **2** | **Tỷ trọng** | CLH × Khu vực × thời gian | phiếu-đầu + dòng |
| **2** | **Mô hình (m3/ch)** | CLH × Chủng loại xe | **lưới 2 chiều** |
| **2** | **Định mức nhiên liệu** | (CLxe+DMNL, cung độ) × độ dốc | **lưới 2 chiều** |
| **2** | Năng suất xe (996) | (CLxe+Phân loại) × cung độ | **lưới 2 chiều** |
| **2** | HS điều chỉnh NLĐM | CLxe_Hạng_Phân loại × khu vực | **lưới 2 chiều** |
| **3** | STD (Đất SX/Than SX), STD (Đất CN) | Nhóm vỉa+Máy xúc × thời gian | phiếu-đầu + dòng |

**Hai thứ đã LOẠI khỏi danh sách sau khi tra lại docx** (2026-08-31):

| Bị loại | Lý do |
|---|---|
| Nhóm tầng | **Không phải danh mục** — là cột TÍNH: `TRUNC(tầng/15)*15` (docx dòng 293–300). Dựng thành danh mục là sai bản chất. |
| Số thẻ lương | Docx dòng 62 có ghi `(danh mục)`, nhưng **đã tồn tại** trong hệ dưới dạng `User.salaryCode` (`userRepository.findBySalaryCode`). Dựng thêm sẽ tạo bảng trùng. |

Đây là kết quả của việc đối chiếu 21 dòng có chữ `(danh mục)` trong docx với
code hiện có, thay vì tin danh sách tự liệt kê ở lượt rà soát trước.

**Nhận xét quan trọng:** 4 danh mục ở lớp 2 đều là **lưới hai chiều**. Đây
là kiểu giao diện thứ ba (sau bảng phẳng và phiếu-đầu+dòng) — cần một
thành phần `MatrixCatalogPage` dùng chung, nếu không phải viết 4 lần.

### 3.4. KHÔNG phải danh mục — hệ tự sinh (4 bảng)

`AP Tdia(m3-tan-tkm)`, `Ap Tkm`, `AP BBNT xe-SP`, `DuKien HS theo -2%`.
Người dùng chỉ **xem** (đúng với ghi chú *(only view)* trong đặc tả) và tải
Excel. Xem mục 4.

---

## 4. ⚠ Phát hiện kiến trúc: phép tính có HAI LƯỢT, không phải một

Đây là hệ quả trực tiếp của việc `AP Tdia` là bảng tự sinh. Docx dòng
253–261:

```
Nếu Tổng m3 ≠ 0 → đối chiếu Nhóm vỉa + Máy xúc trong danh mục STD
                  để lấy Đất CN (m3/tấn/tkm)
HSTĐ(m3)  = m3  / Tổng m3
HSTĐ(tấn) = tấn / Tổng tấn
HSTĐ(tkm) = tkm / Tổng tkm
```

`Tổng m3` là **tổng cộng dồn của TẤT CẢ các chuyến** trong kỳ, gộp theo
`Nhóm vỉa + Máy xúc`. Còn `m3` (tử số) là số trắc địa lấy từ danh mục STD.
Rồi hệ số đó lại được áp ngược trở lại vào **từng chuyến**:

```excel
DS5 = IF(LEFT(J5,3)="TCN", AF5*AL5, AL5*S5)   ← Tổng m3 (từng chuyến) × HS
DW5 = IF(LEFT($J5,3)="TCN", AM5*$AF5, DS5*AC5)
DT5 = IFNA(DW5*DY5, 0)                        ← lại nhân HS của Ap Tkm
```

**Không thể tính một chuyến một cách độc lập.** Trình tự bắt buộc:

| Lượt | Việc | Phạm vi |
|---|---|---|
| **1** | Tính `AL`/`AM`/`AN` (Tổng m3, tấn, tkm) — chưa có hệ số | từng chuyến |
| **2** | Cộng dồn theo `Nhóm vỉa + Máy xúc` × kỳ → **sinh `AP Tdia`** | toàn kỳ |
| **3** | `HSTĐ = Số trắc địa (STD) ÷ Tổng` | toàn kỳ |
| **4** | Sinh `Ap Tkm` (cùng cách, cho tấn/tkm) | toàn kỳ |
| **5** | Áp hệ số ngược vào từng chuyến → `DS`, `DW`, `DX`, `DT`, `DU` | từng chuyến |

`DESIGN_SANLUONG.md` mô tả 25 bước như một chuỗi tuyến tính trên từng
dòng — **phải sửa**: lớp 5 (áp hệ số trắc địa) là một **rào chắn tổng hợp**,
không phải một bước trên dòng.

Hệ quả thực thi: engine tính phải chạy theo **kỳ**, không theo chuyến; kết
quả của một chuyến thay đổi khi có chuyến khác trong cùng kỳ được sửa. Nên
kết quả phải được tính lại cả kỳ và lưu kèm dấu "kỳ đã chốt" (khớp QĐ-03).

Ghi chú: khi bật chế độ TKE (QĐ-02) thì `S=T=U=1` và `DY=DZ=1` — tức
**bỏ qua toàn bộ lượt 2–4**. Chế độ TKE chỉ cần một lượt.

---

## 5. Menu "Báo cáo thống kê" — đầu ra cuối cùng

Chính là sheet `tinh toan`: **mỗi dòng = một chuyến đã đối soát**, 206 cột.

**Nguồn vào:** cặp đã đối soát (Khai thác × Vận tải) ở trạng thái đã chốt —
tương ứng sheet `Cap nhat Slg ThanV+Dat B1` (32/140 công thức trỏ vào đây).

**Không lưu 206 cột.** Chỉ lưu:
- các chỉ tiêu đầu ra thật sự cần (`ProductionResult`, `DESIGN_SANLUONG.md` 3.7);
- các cột trung gian (`AP`…`AY` nội suy, `CO`…`CW` khoá ghép) **tính lại khi
  cần**, không lưu — chúng chỉ là bước đệm của Excel.

**Giao diện:** chọn kỳ → bảng cột lồng nhiều tầng, cuộn ngang, đóng băng
cột trái, xuất Excel. Cùng loại với AP Tdia.

---

## 6. Chốt lại thứ tự làm

| Bước | Nội dung | Điều kiện |
|---|---|---|
| **B1** | S1+S2+S3 (sửa 3 chỗ đã dựng) + 6 danh mục phẳng lớp 1 | không chặn |
| ~~B2~~ | ✅ **XONG** — `MatrixCatalogPage` + 3 bảng lưới + 4 lưới đã khai báo | — |
| ~~B3~~ | ✅ **XONG** — Tỷ trọng (QĐ-04); 4 lưới đã dùng được từ B2 | — |
| **B4** | STD ×2 (phiếu-đầu + dòng) | cần B2 |
| **B5** | Engine 2 lượt + sinh AP Tdia / Ap Tkm / AP BBNT / DuKien HS | cần B1–B4 |
| **B6** | Màn Báo cáo thống kê + xuất Excel | cần B5 |

### Ghi chú thực thi B2 (2026-08-31)

Hạ tầng lưới là **một** bộ dùng chung cho cả 4 danh mục: 3 bảng
(`matrix_definitions` / `matrix_axis_entries` / `matrix_cells`), một
controller `/api/matrix-catalogs/{code}`, một trang `MatrixCatalogPage`.
Bốn lưới chỉ khác nhau ở nhãn và nguồn khoá nên được **seed** bằng
`backend/seed-matrix-catalogs.sql`, không phải do người dùng tạo.

Bốn quyết định đáng ghi lại, đều xuất phát từ đặc điểm thật của công thức:

1. **Trục lưu tường minh, không suy ra từ ô.** Suy ra thì một dòng chưa nhập
   giá trị nào sẽ biến mất khi tải lại — mà lúc nhập liệu, dòng trống là
   trạng thái bình thường.
2. **Trục số tách riêng `numericValue`.** `DMNL` dùng `MATCH(…,1)` +
   `SMALL(…)` để lấy hai dải kề nhau rồi nội suy, nên thứ tự SỐ là một phần
   của phép tính. Sắp theo chuỗi cho `"0.5" < "1" < "10" < "2" < "9"` và
   chọn nhầm dải. Đã kiểm chứng sống: nhập lộn xộn `10, 9, 2, 0.5, 1` trả về
   đúng `0.5, 1, 2, 9, 10`.
3. **Ô trống ≠ ô bằng 0.** Trống là *chưa khai báo* (công thức phải báo thiếu
   dữ liệu); 0 là *đã khai báo và bằng không*. Vì thế ô lưu THƯA, và
   `value: null` nghĩa là xoá ô chứ không phải ghi 0.
4. **Khoá ô là MÃ danh mục, không phải nhãn.** Đổi tên hiển thị không được
   làm hỏng lưới. File Excel thì ngược lại — dùng nhãn, vì người nhập chỉ
   biết tên.

Chặn ô mồ côi: chỉ ghi được vào dòng/cột đã có trên trục. Không có chốt này
thì gõ sai một mã sẽ lặng lẽ tạo ô mà lưới không hiện và công thức không bao
giờ tra thấy.

---

## 7. Các câu hỏi — ĐÃ TRẢ LỜI HẾT

**Chủ dự án trả lời (2026-08-30):**

1. **AP Tdia / Ap Tkm lấy dữ liệu từ đâu?** → *"lấy dữ liệu từ các danh mục
   khác, docx có mô tả công thức tính."* Đã tra ra: docx dòng 253–261. Là
   bảng **tự sinh** = (số trắc địa từ danh mục STD) ÷ (tổng cộng dồn từ
   chuyến). ✅ **Không còn chặn B5.**
2. **`Ap Tkm`, `AP BBNT xe-SP`, `DuKien HS theo -2%`?** → *"bảng trung gian
   hệ tự sinh."* ✅ Bỏ khỏi danh sách danh mục.

**Tự tra được trong docx (không cần hỏi):**

3. **Tỷ trọng: bản "Tất cả khu vực" vs khu vực cụ thể chồng thời gian** →
   giữ thiết kế **bản cụ thể thắng**. Đây là quy tắc chuẩn của danh mục có
   khoảng thời gian; docx không nói khác.
4. **Hậu tố khoá `Nhóm vỉa + Máy xúc` — tự suy hay chọn tay?** → **TỰ SUY.**
   Docx dòng 219 và 241 ghi rõ `Nhóm vỉa + Máy xúc (tự set)`; dòng 490–500
   cho quy tắc đầy đủ, hoàn toàn tất định:
   ```
   Khoá = Nhóm vỉa _ Nhóm tầng _ Máy xúc _ Ký hiệu bùn _ Khu vực xúc _ hậu tố

   Bước 1 (ưu tiên Băng tải trước):
     Nơi dỡ tải = Băng tải          → thêm _BK
     ngược lại, Nhóm CLH = SPNT.via → thêm _SPNT
   Bước 2:
     Nhóm CLH = SPNT.via            → giữ nguyên
     Nhóm CLH ≠ SPNT.via và Tỷ trọng = 2,25 → thêm _2,25
     Chủng loại hàng = Dthai        → thêm _dthai
   ```
   Ô chọn trong mockup là để **chọn khoá đã có sẵn** khi nhập dòng STD, chứ
   không phải gõ hậu tố bằng tay.
5. **Kỳ của màn Báo cáo thống kê** → theo **kỳ báo cáo (QĐ-05)**, không theo
   tháng như Excel. Excel làm theo tháng vì mỗi tháng một file; hệ này đã có
   danh mục Kỳ nên dùng kỳ, và cho gộp nhiều kỳ để xem cả tháng.
