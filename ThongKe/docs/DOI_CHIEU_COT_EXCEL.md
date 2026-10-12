# Đối chiếu cột: màn Báo cáo thống kê ↔ sheet `tinh toan`

Nguồn: `Tháng 5 đổi tên xe.xlsx` / sheet `tinh toan` — **206 cột** (`A`…`GY`),
tên cột chính thức ở **dòng 4**, công thức gốc ở **dòng 5** (dòng master của
shared formula). Bản trích nguyên văn: `docs/_source/excel-tinhtoan-header-row4.txt`
và `docs/_source/excel-tinhtoan-row5-formulas.txt` — **không sửa hai file đó**.

Màn Báo cáo thống kê hiện hiển thị **40 cột / 8 nhóm**. File này giải thích
40 cột đó nằm ở đâu trong 206 cột, và **166 cột còn lại đi đâu**.

---

## 1. Bốn mươi cột đang hiển thị

Thứ tự đúng như trên màn hình. Cột "Excel" là chữ cái cột trong sheet
`tinh toan`; cột "Tên gốc dòng 4" là tên do chính người dùng đặt.

### Nhóm 1 — Thông tin chuyến (11 cột, lấy thẳng từ phiếu)

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| Ngày | `B` | Ngày |
| Ca | `C` | Ca |
| Số xe | `Q` | Số xe |
| Máy xúc | `E` | Máy xúc |
| Khu vực xúc | `D` | Khu vực xúc |
| Nơi nhận tải | `G` | Nơi nhận tải (vỉa/kho) |
| Nơi dỡ tải | `I` | Tên gọi nơi dỡ tải |
| Chủng loại hàng | `K` | Chủng loại hàng |
| Nhóm hàng | `J` | Nhom hang |
| Số chuyến | `R` | Số chuyến |
| Cung độ (km) | `L` | CĐ toàn tuyến (Km) |

### Nhóm 2 — Khoá gộp (5 cột)

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| Nhóm vỉa + Máy xúc | họ `CP`…`CW` | `CR` Nhóm vỉa+M.xuc, `CT` NhomVia+NhomTang+Baithai, … |
| Sản phẩm nghiệm thu | `AG` | SP N/thu; Cong Nghe |
| Mã hoá hàng | `BT` | Mahoahang |
| Mã hàng TTL | `BU` | mã hàng TTL |
| Vỉa KPMB | `BV` | Vỉa KPMB |

> **Ghi chú về "Nhóm vỉa + Máy xúc".** Excel rải khoá ghép ra **chín** cột
> (`CP`…`CX`) vì mỗi bảng tra cần một biến thể khoá khác nhau, mà `INDEX/MATCH`
> bắt buộc phải có một ô chứa sẵn chuỗi đã ghép. Hệ thống dựng **một** khoá
> chuẩn theo QĐ-06 (`SeamGroupExcavatorKeys`) rồi tra thẳng — không cần chín cột.

### Nhóm 3 — Thống kê, chưa áp hệ số (3 cột)

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| Tổng m3 | `AL` | Tổng m3 |
| Tổng KLVC (tấn) | `AM` | Tổng KLVC (tấn) |
| Tổng Tkm | `AN` | Tổng Tkm |

### Nhóm 4 — Trắc địa, đã áp hệ số m3 (3 cột)

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| m3 trắc địa | `DS` | TĐ.Tổng m3 |
| tấn trắc địa | `DW` | td.tanL1 |
| tkm trắc địa | `DX` | td.tkmL1 |

### Nhóm 5 — Kết quả cuối (2 cột)

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| Tấn cuối cùng | `DT` | TĐ.Tổng KLVC (tấn) |
| Tkm cuối cùng | `DU` | TĐ.Tổng Tkm |

### Nhóm 6 — Vết tính toán (6 cột)

Nhóm này **không có trong Excel như một nhóm** — nó là các trị số trung gian
mà bảng tính giấu trong công thức. Hiện ra để đối chiếu được khi số lệch.

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| Mô hình đã dùng | `AJ` | Mô hình (m3/ch) |
| Tỷ trọng đã dùng | `AI` | Tỷ trọng (tấn/m3) |
| Thể trọng (TĐ) | `AC` | TheTrong_TĐ |
| HS m3 | `S` | HSTĐ (m3) |
| HS tấn | `DY` | HS TDia.Tan |
| HS tkm | `DZ` | HS TDia.Tkm |

### Nhóm 7 — TKE ban đầu / không quy ẩm (5 cột)

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| Tổng KLVC TKE (m3) ban đầu | `CG` | Tổng KLVC TKE (m3)_BanDau |
| Tỷ trọng (không quy ẩm) | `CC` | TyTrongKoQA |
| Tổng KLVC TKE (tấn, koQA) | `CD` | Tổng KLVC TKE (tấn_koQA) |
| Tổng TKE (tkm, koQA) | `CE` | Tổng TKE (tkm_koQA) |
| Tỷ trọng ban đầu | `CF` | Tỷ trọng _BanDau |

### Nhóm 8 — Nhiên liệu & năng suất (5 cột)

| Trên màn hình | Excel | Tên gốc dòng 4 |
|---|---|---|
| ĐMNL xe | `BF` | ĐMNL_xe (Đ/C tháng) |
| NL theo ĐM (lít) | `BG` | NhienLieu_TieuHaoTheoĐM (lit) |
| ĐMNL xe (QĐ 1828) | `BP` | ĐMNL_xe (QD 1828_25/02/2025)-SoTke |
| NLĐM hiện hành | `BQ` | NLDM HienHanh_SoTke |
| ĐM năng suất (ch/ca) | `BR` | Định mức năng suất Xe tải (ch/ca) |

---

## 2. Vì sao 206 cột còn 40 — 166 cột kia đi đâu

Bốn lý do. Chỉ lý do thứ tư là việc còn thiếu.

### 2.1. Trung gian tính toán — vẫn tính, chỉ không hiện thành cột

Bảng tính buộc phải để lộ từng bước ra một ô riêng vì Excel không có biến.
Chương trình tính trong bộ nhớ rồi chỉ ghi kết quả.

| Vùng | Là gì |
|---|---|
| `AP`…`AY` (10 cột) | Bốn góc + hai bước nội suy của định mức nhiên liệu (`Hb`, `Ha`, `h1`, `h2`, `Nb-h1`, `Na-h2`…). `FuelNormInterpolator` nội suy hai chiều trong bộ nhớ. |
| `AZ`, `BA`…`BE` (6 cột) | Chuỗi hệ số dẫn tới `BF`: theo mùa, theo công ty, theo hãng xe, cải tạo bến, HS than CN/NK. |
| `BH`…`BO` (8 cột) | Tám khoản bù nhiên liệu, cộng vào `BP`. |
| `AD`, `AK`, `BW` | Phân loại Đất/Than, Nhóm tầng, Ký hiệu bùn — thành phần của khoá ghép. |
| `CO`, `CP`…`CX` (10 cột) | Các biến thể khoá ghép cho `INDEX/MATCH`. |
| `DA`…`DF`, `DP`…`DR`, `EA` | Khoá phân loại xe (`Chủng loại xe + Hạng`, `LoaiXe_DMNL`, `Xe+Hàng`…). |

### 2.2. Đã tách thành DANH MỤC — không còn lặp trên từng dòng

Trong Excel, thuộc tính của xe/máy bị chép lại ở **mọi** dòng trong 55.161
dòng. Ở đây chúng là bản ghi danh mục, tra qua khoá ngoại.

| Vùng Excel | Danh mục tương ứng |
|---|---|
| `CY`…`DN` (16 cột) — Số hiệu xe, Chủng loại, Hạng, PXVT, Gàu xúc, Tải trọng… | `/danh-muc/thong-tin-xe`, `/danh-muc/thuoc-tinh-san-luong-xe`, `/danh-muc/thong-tin-may`, `/danh-muc/thuoc-tinh-san-luong-may` |
| `FQ`…`FT` (4 cột) | như trên |
| `AI`, `AJ` | `/danh-muc/ty-trong`, `/danh-muc/mo-hinh` |
| `AA`, `AB` | Mô hình tạm tính / Tỷ trọng cập nhật — cùng hai danh mục trên |

### 2.3. Kịch bản định mức theo tháng — đã thay bằng PHIÊN BẢN

Đây chính là chỗ **tên workbook nói ra vấn đề**: `Tháng 5 đổi tên xe.xlsx`.

| Vùng Excel | Là gì |
|---|---|
| `EO`…`EU` (7 cột) | `Xe`, `KC`, `CS`, `KC gốc`, `CS gốc`, `kc-tháng 2`, `cs-tháng 2` |
| `FU` (1 cột) | `T4 2025` |
| `FW`…`GY` (29 cột) | 14 cặp `KC`/`CS` nối tiếp nhau — mỗi kỳ một cặp mới |

Mỗi lần định mức đổi, bảng tính **mọc thêm một cặp cột** và công thức phải
trỏ lại. Sau vài tháng thì không ai biết cặp nào đang có hiệu lực, và chạy
lại báo cáo cũ không còn ra số cũ.

Hệ thống thay toàn bộ ~37 cột này bằng **phiên bản có khoảng hiệu lực** trên
lưới định mức. Engine tra theo **ngày sản xuất của chuyến**, nên khai định
mức tháng sau không đụng tới báo cáo tháng trước — đã kiểm chứng sống.

### 2.4. CHƯA DỰNG — phần cần anh quyết

Đây là phần thật sự còn thiếu, không phải đã gộp đi đâu.

| Vùng Excel | Tên gốc | Tình trạng |
|---|---|---|
| `BO` | BSNL_Spnt__CN(xe) | ⛔ **Không có công thức** ở cả docx lẫn Excel. Là khoản bù thứ tám, **nằm trong tổng `BP`** → `BP` hiện thiếu đúng khoản này. Đang để 0. |
| `BX` | Thể trọng bùn | ⛔ Chỉ có tiêu đề, không có công thức. |
| `BY`, `BZ`, `CA`, `CB` | Tổng m3/tấn/Tkm (trừ bùn), Tổng_Bùn (tấn) | ⛔ Chỉ có tiêu đề, không có công thức. |
| `CH`, `CI`, `CJ`, `CK` | TKE `_QA`, NLĐM (tke)_BanDau, TKE tấn_BanDau chưa trừ đá | Có công thức, **chưa dựng**. |
| `CL`, `CM`, `CN`, `CO` | TenSP_NghiemThu, Lễ, Tên Nghiệm thu, BBNT-MaHoa | Khoá suy được 100%, nhưng **Tên nghiệm thu** không suy được từ khoá. Chờ anh xác nhận đó là trường người dùng khai. |
| `EB`…`EJ` (9 cột) | TỔNG NLDM (QĐ 1298), HSNL đ/c tháng, HSDML, NL sau ĐC, NL ĐM (Áp 2%) | Khuyến nghị **gác lại** — docx không nhắc HSDML hay "-2%", và sheet còn giữ nhiều kịch bản song song không rõ cơ chế chọn. |
| `EK`…`EN` (4 cột) | TĐ.Bùn (m3/Tkm), TĐ.Đất trộn P/Án bùn | **Chưa dựng.** |
| `FH`…`FK` (4 cột) | M3 than qui đổi, m3 tính vượt, M3 ĐÁ THẢI, TẤN ĐÁ THẢI | **Chưa dựng** — tên nghiệp vụ rõ ràng, nên đây là thiếu sót cần anh xác nhận có dùng không. |
| `CX` | CaiTaoToa | **Chưa dựng.** |
| `EV`…`FG` (12 cột) | `D3`…`D14` | Không có tên nghiệp vụ, chỉ mã. **Chưa rõ dùng làm gì.** |
| `FL`…`FP` (5 cột) | `E1`…`E5` | Như trên. |

---

## 3. Cách tự kiểm chứng khi số lệch

Nhóm **Vết tính toán** tồn tại chính vì việc này. Khi một dòng ra số khác
Excel, so theo thứ tự sau — sai ở bước nào thì dừng ở đó:

1. **Mô hình đã dùng** (`AJ`) và **Tỷ trọng đã dùng** (`AI`) — sai ở đây là
   sai danh mục hoặc sai ngày hiệu lực, không phải sai công thức.
2. **Tổng m3** (`AL`) — nếu 1 đúng mà 2 sai thì lỗi ở số chuyến hoặc trừ vơi.
3. **HS m3 / HS tấn / HS tkm** (`S`, `DY`, `DZ`) — hệ số trắc địa. Ba số này
   phải kéo tổng của cả nhóm về đúng số đo đạc; lệch ở đây là do khoá gộp
   không khớp, tra ngược **Nhóm vỉa + Máy xúc**.
4. **Tấn cuối / Tkm cuối** (`DT`, `DU`).

Chạy **Chế độ TKE** để ép mọi hệ số trắc địa bằng 1 (QĐ-03) — nếu bật TKE mà
số khớp, thì vấn đề nằm ở hệ số chứ không ở phép tính gốc.
