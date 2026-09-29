# Yêu cầu — Thống kê sản lượng theo dữ liệu chuẩn (Danh mục & Công thức)

Nguồn: mục **III** của `docs/_source/module-thong-ke-san-luong.txt` (trích
từ *Module Thống kê sản lượng.docx*, chủ dự án cung cấp 2026-08-30, tài liệu
đề ngày 03.08.2026).

Đây là phần lấp vào hai ô cuối của sơ đồ workflow — **"Danh mục và Công
thức"** và **"Thống kê Sản lượng (Báo cáo)"** — hai ô mà
`docs/REQUIREMENT_WORKFLOW.md` mục 8 đánh dấu là CHƯA THẤY đối ứng trong
code hiện có. Đọc `REQUIREMENT_WORKFLOW.md` trước để nắm luồng, file này
chỉ đặc tả phần tính toán.

> **Cảnh báo về độ tin cậy của bản chép:** tài liệu gốc mô tả công thức
> bằng văn xuôi trộn cú pháp Excel, nhiều chỗ **thiếu dấu ngoặc, sai tên
> biến, hoặc nhánh điều kiện chồng nhau**. Bản chép dưới đây giữ NGUYÊN
> cách viết của tài liệu gốc; mọi chỗ tôi thấy mơ hồ đều được đánh dấu ⚠ và
> gom lại ở mục 6. **Không tự ý đoán rồi code** — phải hỏi chủ dự án.

---

## 1. Vị trí trong luồng

Sau khi Nhân viên Thống kê chốt dữ liệu chuẩn ở Đối soát lần 2, dữ liệu
được **kết hợp với các danh mục thông số** để ra sản lượng.

Đầu vào chọn theo: **Tháng / Ngày / Ca**.

---

## 2. Danh mục cần có

Mỗi danh mục dưới đây là một bảng master data người dùng tự quản lý. Ký hiệu:
`→` = trường suy ra từ danh mục khác.

### 2.1. Danh mục địa điểm & khu vực

| Danh mục | Trường |
|---|---|
| **Khu vực xúc** | Mã khu vực xúc, Khu vực xúc, Ghi chú |
| **Nơi nhận tải** | Mã nơi nhận tải, Nơi nhận tải, **Nhóm vỉa** (combobox), Ghi chú |
| **Nơi dỡ tải** | Mã nơi dỡ tải, Nơi dỡ tải, Ghi chú |
| **Nơi chất tải** | Mã nơi chất tải, Nơi chất tải, Ghi chú |

`Nhóm vỉa` của một bản ghi lấy **theo danh mục Nơi nhận tải**.

### 2.2. Danh mục hàng hoá

| Danh mục | Trường |
|---|---|
| **Chủng loại hàng** | Mã chủng loại hàng, Chủng loại hàng, **Nhóm chủng loại hàng** (combobox), **Sản phẩm nghiệm thu** (combobox), **TTL CLH** (combobox), Ghi chú |
| **Nhóm chủng loại hàng** | Mã, Tên, Ghi chú |
| **Sản phẩm nghiệm thu** | Mã, Tên, Ghi chú |
| **TTL CLH** | Mã, Tên, Ghi chú |

`Nhóm chủng loại hàng` của một bản ghi lấy **theo danh mục Chủng loại hàng**.

### 2.3. Danh mục Tỷ trọng — **CÓ HIỆU LỰC THEO THỜI GIAN**

| Trường |
|---|
| **Thời gian (dd/mm/yy – dd/mm/yy)** |
| Khu vực xúc |
| Mã chủng loại hàng, Chủng loại hàng |
| Nhóm chủng loại hàng, Sản phẩm nghiệm thu, TTL CLH |
| **Tỷ trọng (quy ẩm)** |
| **Tỷ trọng (không quy ẩm)** |

Đây là bằng chứng trực tiếp trả lời câu hỏi "công thức/tham số có đổi theo
thời gian không": **có** — ít nhất Tỷ trọng có khoảng hiệu lực. Mọi tra cứu
tỷ trọng phải theo ngày của bản ghi báo chuyến, không phải ngày hiện tại.

### 2.4. Danh mục trắc địa / sản lượng chuẩn

**AP Tdia (m3 – tấn – tkm)** — *chỉ xem (only view)*:

- Thời gian, Máy xúc, **Nhóm vỉa + Máy xúc**
- Đất CN: Tổng m3, Tổng KLVC (tấn), Tổng Tkm
- Đất SX: Tổng m3, Tổng KLVC (tấn), Tổng Tkm
- Than: Tổng m3, Tổng KLVC (tấn), Tổng Tkm
- Số Trắc địa: Đất CN (m3/tấn/tkm), Đất SX (m3/tấn/tkm), Than SX (m3/tấn/tkm)
- Hệ số: HS Đất CN (m3/tấn/tkm), HS Đất SX (m3/tấn/tkm), HS Than SX (m3/tấn/tkm)

**STD (Đất SX / Than SX)**:

- Thời gian, **Nhóm vỉa + Máy xúc** (tự set)
- Đất SX: Sản phẩm nghiệm thu, m3, V Tke, Clech, tấn, CD đất, **Thể trọng đất (TĐ)**, tkm
- Than SX: Sản phẩm nghiệm thu, m3, **Thể trọng than (TĐ)**, tấn, Q Tke, Clech, CD than, Tkm

**STD (Đất CN)**:

- Thời gian, **Nhóm vỉa + Máy xúc** (tự set)
- Đất CN: Sản phẩm nghiệm thu, m3, V Tke, Clech, tấn, CD đất, **Thể trọng đất (TĐ)**, tkm

### 2.5. Danh mục kỹ thuật xe & nhiên liệu

| Danh mục | Trường / ghi chú |
|---|---|
| **Mô hình (m3/ch)** | tra theo Chủng loại hàng × Chủng loại xe |
| **Chủng loại xe + DMNL** | Chủng loại xe + DMNL (text), Ghi chú |
| **Định mức nhiên liệu** | Cung độ, Độ dốc, Chủng loại xe + DMNL (combobox) + Cung độ (auto) |
| **HS điều chỉnh NLĐM** | tra theo Chủng loại xe + Chất lượng + Phân loại |
| **Chủng loại xe + Phân loại** | dùng cho tra Năng suất xe |
| **Năng suất xe (996)** | tra theo Cung độ × (Chủng loại xe + Phân loại) |
| **Hệ số** | chứa hệ số *Than tke trừ đá / Than kcs* |
| **Thông tin xe** | Số xe; kèm cờ **Cải tạo toa**, **hạng xe** (A/B/C1/khác), **Chất lượng** |

### 2.6. Danh mục BỔ SUNG theo quyết định của chủ dự án (2026-08-30)

Ba danh mục dưới đây **không có trong docx**, phát sinh từ việc đối chiếu
bảng tính thật. Chi tiết + lý do: [`DECISIONS.md`](DECISIONS.md).

| Danh mục | Trường | Quyết định |
|---|---|---|
| **Tỷ trọng (theo thời gian)** | Chủng loại hàng, Khu vực xúc, **Từ ngày – Đến ngày**, Tỷ trọng (quy ẩm), Tỷ trọng (không quy ẩm) | QĐ-04 — thay cho cách tra cố định trong Excel; tra theo ngày sản xuất của bản ghi |
| **Kỳ báo cáo** | Năm, Tháng, Số kỳ, **Từ ngày, Đến ngày**, Tên hiển thị, Ghi chú | QĐ-05 — số kỳ/tháng do người dùng khai, KHÔNG cố định 5; gán bản ghi vào kỳ theo ngày rơi vào khoảng nào; bắt buộc không chồng lấn, không hở. Dãy 1–7/8–14/15–21/22–28/29–hết tháng chỉ là mặc định gợi ý |
| **Nhóm vỉa + Máy xúc** | Nhóm vỉa, Nhóm tầng, Máy xúc, Ký hiệu bùn, Khu vực xúc, Hậu tố (+ chuỗi hiển thị sinh tự động) | QĐ-06 — người dùng **chọn**, không nhập tay; các thành phần là cột riêng có khoá ngoại, chuỗi ghép chỉ để hiển thị |

Lưu ý QĐ-04 mở rộng: nguyên tắc "khai báo theo khoảng thời gian" nên áp cho
**mọi tham số định mức** ở mục 7, không riêng Tỷ trọng.

---

## 3. Trường lấy từ "Báo chuyến" nhưng KHÔNG có trong form nhập của đơn vị

Các trường sau được công thức gọi là "(Báo chuyến)" nhưng **không xuất hiện
trong danh sách trường nhập liệu của Công trường Khai thác (mục 5.1) hay
Phân xưởng Vận tải (mục 5.2)** của `REQUIREMENT_WORKFLOW.md`:

- Khối lượng qua cân (tấn)
- Trừ vơi (đất – m3, than – tấn)
- Mô hình (tạm tính)
- Tỷ trọng (tạm tính) / Tỷ trọng (cập nhật)
- Hệ số chênh lệch _CTNB
- Đá thải — giá trị tự nhập
- Hệ số bùn (user set)
- Hệ số chất tải bùn (Trắc địa)

**Giả thuyết (CẦN XÁC NHẬN):** đây chính là *"nhập liệu bổ sung một số
trường thông tin"* mà Nhân viên Thống kê làm ở Đối soát lần 2 — tài liệu
gốc mục 2.3 tách bạch hai việc: (a) *yêu cầu chỉnh sửa dữ liệu khi cần*,
(b) *"ngoài ra sẽ nhập liệu bổ sung một số trường thông tin"*. Xem
`REQUIREMENT_WORKFLOW.md` mục 4.6 và câu hỏi mục 9.

---

## 4. Chuỗi phụ thuộc tính toán

Thứ tự tính (rút ra từ tài liệu — cần verify khi implement). Mỗi mũi tên là
"phải có trước":

```
Danh mục (Chủng loại hàng, Nơi nhận/dỡ/chất tải, Tỷ trọng, Thông tin xe...)
   │
   ├─> Nhóm vỉa (← Nơi nhận tải)
   ├─> Nhóm chủng loại hàng (← Chủng loại hàng)
   ├─> Sản phẩm nghiệm thu (← Chủng loại hàng / luật riêng)
   ├─> Nhóm tầng nhận tải (← Tầng nhận tải + Khu vực xúc)
   ├─> Phân loại Đất/Than (← Loại hàng)
   │
   ├─> Nâng tải toàn tuyến (← Tầng nhận tải, Tầng dỡ tải)
   │      └─> Chênh cao thanh toán nhiên liệu (+ Cung độ, Dốc cục bộ)
   │
   ├─> "Nhóm vỉa + Máy xúc"  (chuỗi ghép — mục 5.20)
   │      └─> tra STD / AP Tdia ─> Thể trọng (TĐ), Đất CN/SX, Than SX
   │
   ├─> Tỷ trọng (tấn/m3)  (← Tỷ trọng cập nhật hoặc danh mục quy ẩm)
   ├─> Mô hình (m3/ch)    (← danh mục Mô hình × hệ số Roda)
   │      │
   │      └─> Tổng m3 ─> Tổng KLVC (tấn) ─> Tổng Tkm
   │                        (kèm Đá thải, Trừ vơi, hệ số Than)
   │                              │
   │                              └─> Nhiên liệu tiêu hao theo ĐM (lít)
   │                                     (× ĐMNL xe, ÷1000)
   │
   └─> ĐMNL: nội suy 2 chiều (Cung độ × Độ dốc)
          ─> ĐMNL theo mùa ─> công ty ─> hạng xe ─> cải tạo ben
          ─> × HS Than (CN-NK) ─> ĐMNL xe (Đ/C tháng)
                 └─> + các khoản BSNL ─> ĐMNL xe (QD 1828)
                        └─> × HS điều chỉnh ─> NLĐM hiện hành
```

---

## 5. Đặc tả công thức (chép nguyên văn + chú giải)

### 5.1. Nhóm tầng nhận tải

```
Nếu Khu vực xúc = Khe Chàm (KC):
    Tầng nhận tải < -195      →  Nhóm tầng nhận tải = -200
    Tầng nhận tải < 0         →  (-1 + TRUNC((G3+1)/15)) * 15
    Tầng nhận tải >= 0        →  TRUNC(G3/15) * 15
Nếu Khu vực xúc ≠ Khe Chàm:
    Tầng nhận tải < 0         →  (-1 + TRUNC((G3+1)/15)) * 15
    Tầng nhận tải >= 0        →  TRUNC(G3/15) * 15
```

`TRUNC` = giữ phần nguyên, bỏ thập phân. `G3` = ô Excel chứa **Tầng nhận
tải**.

⚠ Tài liệu gốc viết `(-1+TRUNC((G3+1)/15) *15` — **thiếu một dấu đóng
ngoặc**. Bản trên hiểu là `(-1 + TRUNC(...)) * 15`. Cần xác nhận.

Công thức này xuất hiện **hai lần** trong tài liệu (mục 2.2 và mục III),
nội dung giống nhau, chỉ khác cách viết tên khu vực (`Khe Chàm` vs `KC`).

### 5.2. Nâng tải toàn tuyến (m)

```
Nâng tải toàn tuyến = Tầng nhận tải − Tầng dỡ tải
                      (cả 2 biến đều đưa về số dương trước khi trừ)
```

### 5.3. Chênh cao thanh toán nhiên liệu

```
Cung độ toàn tuyến = 0  →  0

Cung độ toàn tuyến ≠ 0 và Dốc cục bộ < Nâng tải toàn tuyến
    →  = Nâng tải toàn tuyến

Cung độ toàn tuyến ≠ 0, Dốc cục bộ ≥ Nâng tải toàn tuyến, Cung độ dốc cục bộ = 0
    Nâng tải toàn tuyến < 0   →  0
    Nâng tải toàn tuyến ≥ 0   →  Nâng tải toàn tuyến  (làm tròn số nguyên)

Cung độ toàn tuyến ≠ 0, Dốc cục bộ ≥ Nâng tải toàn tuyến, Cung độ dốc cục bộ ≠ 0
    →  Nâng tải toàn tuyến quy đổi
       + (Dốc cục bộ − Nâng tải toàn tuyến quy đổi)
         * Cung độ dốc cục bộ / Cung độ toàn tuyến
       (làm tròn số nguyên)

Trong đó:  Nâng tải toàn tuyến quy đổi = 0 nếu Nâng tải toàn tuyến < 0
                                        = Nâng tải toàn tuyến nếu ≥ 0
```

### 5.4. Thể trọng (TĐ)

```
SPNT là Dat_TCN hoặc Than_CN            →  Thể trọng TĐ = Tỷ trọng (tấn/m3)
SPNT ∉ {Dat_SX, Than_SX, Dat_CN}        →  Thể trọng TĐ = 0
SPNT = Dat_SX   → tra STD (Đất SX/Than SX) theo "Nhóm vỉa + Máy xúc"
                  → cột Thể trọng Đất – TĐ
SPNT = Than_SX  → tra STD (Đất SX/Than SX) theo "Nhóm vỉa + Máy xúc"
                  → cột Thể trọng Than – TĐ
SPNT = Dat_CN   → tra STD (Đất CN) theo "Nhóm vỉa + Máy xúc"
                  → cột Đất CN – Thể trọng
```

⚠ **Hai nhánh đầu mâu thuẫn nhau.** `Than_CN` không nằm trong tập
`{Dat_SX, Than_SX, Dat_CN}` nên thoả CẢ nhánh 1 (→ Tỷ trọng) lẫn nhánh 2
(→ 0). Ngoài ra `Dat_TCN` ở nhánh 1 và `Dat_CN` ở nhánh 2/5 — nhiều khả
năng là cùng một giá trị viết sai chính tả. Cần chủ dự án xác nhận thứ tự
ưu tiên và tên đúng.

### 5.5. Sản phẩm nghiệm thu

```
Khu vực xúc = CS và Chủng loại hàng = Daxit.NK  →  SPNT = Dat_SX
Loại hàng ≠ 0                                   →  SPNT theo Chủng loại hàng
                                                   (gán sẵn trong danh mục)
```

### 5.6. Tỷ trọng (tấn/m3)

```
Tỷ trọng (cập nhật) ≠ 0  →  Tỷ trọng (tấn/m3) = Tỷ trọng (cập nhật)
Tỷ trọng (cập nhật) = 0  →  tra danh mục Tỷ trọng, cột "quy ẩm"
```

### 5.7. Mô hình (m3/ch)

```
Số chuyến = 0            →  Mô hình = 0
Mô hình (tạm tính) ≠ 0   →  Mô hình = Mô hình (tạm tính)
Số chuyến ≠ 0 và Mô hình (tạm tính) = 0
    →  tra danh mục Mô hình theo Chủng loại hàng × Chủng loại xe

Sau khi có giá trị:
    Mô hình = Mô hình × Roda
        Roda = 2/3  →  nhân 2/3
        Roda = 0    →  nhân 1
    (làm tròn 3 chữ số thập phân)
```

Đây chính là chỗ **Mức tải / Tải trọng** (Đủ tải / Roda 2/3 / Khác) tham
gia tính toán.

### 5.8. Tổng m3

```
Khối lượng qua cân (tấn) > 0
    →  Tổng m3 = Khối lượng qua cân / Tỷ trọng (tấn/m3)

Khối lượng qua cân (tấn) ≤ 0
    Làm tròn Mô hình trước:
        Nhóm chủng loại hàng bắt đầu bằng "D"      → làm tròn 1 chữ số thập phân
        Nhóm chủng loại hàng KHÔNG bắt đầu bằng "D" → làm tròn 3 chữ số thập phân
    Rồi:
        Phân loại = DAT  →  Tổng m3 = Mô hình × Số chuyến − Trừ vơi
        Phân loại ≠ DAT  →  Tổng m3 = Mô hình × Số chuyến
    (làm tròn 3 chữ số thập phân)
```

### 5.9. Tổng KLVC (tấn)

```
Phân loại = THAN  →  Tổng m3 × Tỷ trọng (tấn/m3) − Đá thải (tấn) − Trừ vơi
Phân loại ≠ THAN  →  Tổng m3 × Tỷ trọng (tấn/m3) − Đá thải (tấn)

Tiếp:
    SPNT là THAN  →  × hệ số (Than tke trừ đá / Than kcs)  [danh mục Hệ số]
    SPNT ≠ THAN   →  giữ nguyên
```

### 5.10. Tổng Tkm

```
Khối lượng qua cân (tấn) ≠ 0  →  Khối lượng qua cân × Cung độ toàn tuyến
Khối lượng qua cân (tấn) = 0  →  Tổng KLVC (tấn) × Cung độ toàn tuyến
                                 (làm tròn 4 chữ số thập phân)
```

### 5.11. Đá thải

```
Đá thải (tấn):
    Nhóm chủng loại hàng ≠ THANV  →  0
    Nhóm chủng loại hàng = THANV
        Khu vực xúc = CS                              → giá trị tự nhập
        Khu vực xúc = KC và 2 ký tự cuối Nơi dỡ tải = CS → giá trị tự nhập
        Các trường hợp khác                            → giá trị tự nhập
    Sau đó: giá trị × Tổng KLVC TKE ban đầu chưa trừ đá (tấn)

Đá thải (m3):
    Khu vực xúc = KC  →  Đá thải (tấn) / 2,625
    Khu vực xúc = CS  →  Đá thải (tấn) / 2,617
```

⚠ Ba nhánh của "Đá thải (tấn)" đều cho ra **cùng một kết quả** (giá trị tự
nhập) → phân nhánh vô nghĩa như đang viết. Nhiều khả năng lỗi sao chép, mỗi
nhánh đáng lẽ khác nhau. Cần làm rõ.

### 5.12. Tổng km vận chuyển

```
Tổng km vận chuyển = Cung độ toàn tuyến × Số chuyến
```

### 5.13. Nội suy định mức nhiên liệu (2 chiều: cung độ × độ dốc)

Tra bảng **Định mức nhiên liệu** theo cụm `Chủng loại xe + DMNL + Cung độ`.

```
hb — "Cung độ cận trên":  điểm NHỎ hơn gần nhất với Cung độ toàn tuyến
ha — "Cung độ cận dưới":  điểm LỚN hơn gần nhất với Cung độ toàn tuyến
    VD: CĐTT = 4,2  →  hb = 4 ; ha = 4,5

h1 — "Dốc cận trước":  điểm NHỎ hơn gần nhất với chiều cao nâng tải
h2 — "Dốc cận sau":    điểm LỚN hơn gần nhất với chiều cao nâng tải
    VD: ccnt = 210  →  h1 = 200 ; h2 = 250

nb-h1 = tra bảng với (h1, Chủng loại xe + DMNL + Cung độ hb)
nb-h2 = tra bảng với (h2, Chủng loại xe + DMNL + Cung độ hb)
nb (nhiên liệu ứng với hb):
    h1 = h2  →  nb-nl = nb-h1
    h1 ≠ h2  →  nb-nl = (nb-h1) + ((nb-h2) − (nb-h1))
                          * (chênh lệch thanh toán − h1) / (h2 − h1)

na-h1 = tra bảng với (h1, Chủng loại xe + DMNL + Cung độ ha)
na-h2 = tra bảng với (h2, Chủng loại xe + DMNL + Cung độ ha)
na (nhiên liệu ứng với ha):
    h1 = h2  →  na-nl = na-h1
    h1 ≠ h2  →  na-nl = (na-h1) + (chênh lệch thanh toán − h1)
                          * (na-h2) − (na-h1) / (h2 − h1)      ⚠

Nt — NLĐM tiêu hao cần tìm:
    Cung độ toàn tuyến = 0  →  0
    ha = hb                 →  nb-NL
    còn lại                 →  (na-nl) − (na-nl − nb-nl) / (nb − ha)
                                 * (Cung độ toàn tuyến − ha)   ⚠
```

⚠ **Ba lỗi rõ ràng trong đoạn này:**

1. **Tên "cận trên"/"cận dưới" bị đảo.** `hb` gọi là *cận trên* nhưng định
   nghĩa là *điểm nhỏ hơn gần nhất*; `ha` gọi là *cận dưới* nhưng là *điểm
   lớn hơn gần nhất*. Ví dụ trong tài liệu (4,2 → hb=4, ha=4,5) khẳng định
   định nghĩa mới đúng, **tên gọi mới là chỗ sai**. Khi code phải bám định
   nghĩa, đừng bám tên.
2. **Công thức `na-nl` thiếu ngoặc** — viết `(na-h1) + (x) * (na-h2)-(na-h1)/(h2-h1)`
   trong khi công thức `nb-nl` đối xứng lại viết đúng
   `(nb-h1) + ((nb-h2)−(nb-h1)) * (x)/(h2−h1)`. Gần như chắc chắn `na-nl`
   phải cùng dạng với `nb-nl`.
3. **`(nb − ha)` ở công thức Nt trộn hai đơn vị** — `nb` là lượng nhiên
   liệu, `ha` là cung độ. Nội suy theo cung độ thì mẫu số phải là
   `(hb − ha)`. Nhiều khả năng gõ nhầm `hb` → `nb`.

### 5.14. ĐMNL theo mùa → công ty → hạng xe → cải tạo ben

```
ĐMNL theo mùa:
    Tháng 6, 7, 8, 9  →  hệ số = 1,03
    Các tháng khác    →  hệ số = 1
    ĐMNL theo mùa = hệ số × Nt

ĐMNL công ty = ĐMNL theo mùa

ĐMNL hạng xe:
    hạng A   →  ×0,97
    hạng B   →  ×1
    hạng C1  →  ×1,04
    khác     →  ×1,06
    ĐMNL hạng xe = ĐMNL công ty × hệ số

ĐMNL cải tạo ben:
    Số xe có đánh dấu "Cải tạo toa" trong danh mục
        →  ĐMNL cải tạo ben = ĐMNL hạng xe × 1,03
    không đánh dấu
        →  ĐMNL cải tạo ben = ĐMNL hạng xe
```

### 5.15. HS Than (CN-NK)

> Xét theo thứ tự từ trên xuống, **thoả điều kiện nào thì dừng, không xét
> tiếp** (nguyên văn tài liệu).

```
SPNT/CN ≠ Than_CN                              →  1
SPNT/CN = Than_CN:
    Chủng loại xe ∈ {VolvoA40F, VolvoA40G}     →  1,02
    ngược lại, xét tiếp:
        Khu vực xúc = CS
        và Chủng loại hàng = SPNT.Baichua
        và 5 ký tự đầu Chủng loại xe = HD465   →  0,9
    ngược lại, xét tiếp:
        Cung độ toàn tuyến < 1,5
        và Chủng loại xe = HD465-7R            →  1,15
    không thuộc nhánh nào                      →  1
```

### 5.16. ĐMNL xe và nhiên liệu tiêu hao

```
ĐMNL xe (Đ/C tháng) = ĐMNL cải tạo ben × HS Than (CN-NK)

Nhiên liệu tiêu hao theo ĐM (lít) = Tổng Tkm × ĐMNL xe / 1000
```

Ký hiệu dưới đây gọi tắt `NLĐM` = *Nhiên liệu tiêu hao theo ĐM (lít)*.

### 5.17. Các khoản bổ sung nhiên liệu (BSNL)

```
BSNL – Roda (xe):
    Roda = Roda  →  0,5 × NLĐM
    Roda ≠ Roda  →  0                                    ⚠ điều kiện vô nghĩa

BSNL – ngày mưa:
    Ngày mưa  →  5% × NLĐM        ;  không  →  0

BSNL – bổ túc:
    Xe bổ túc  →  4% × NLĐM       ;  không  →  0

BSNL – SC, BD (xe):
    Chủng loại xe ∈ {HS465-7 ⚠, HD465-7R, CAT773E}          →  1%   × NLĐM
    Chủng loại xe ∈ {CAT777, CAT777D, CAT777E, HD785-7}     →  0,5% × NLĐM
    còn lại                                                 →  1,5% × NLĐM

BSNL – khác:
    Số xe = 965  →  0,05 × NLĐM   ;  khác  →  0           ⚠ hard-code số xe

BSNL – SPNT (xe):
    Chủng loại hàng ∉ {spnt_uot.via, spnt.via}  →  0
    Chủng loại hàng ∈ {spnt_uot.via, spnt.via}:
        Chủng loại xe ∈ {HM400-2R, VolvoA40F, VolvoA40G}  →  0,10 × NLĐM
        còn lại                                            →  0,15 × NLĐM

BSNL – bùn (xe):
    Chủng loại xe = HM400-2R  →  0
    Chủng loại xe ≠ HM400-2R:
        Chủng loại hàng ∈ {B.Duot, B.Loang, DBChan, B.Chan}
            →  Hệ số bùn (user set) × NLĐM
        Chủng loại hàng ∈ {B.Tron, DBTron}
            →  Hệ số bùn (user set) × NLĐM               ⚠ trùng nhánh trên
        (làm tròn kiểu 1,88 → 1,9 ; 0,96 → 1)
    các trường hợp khác  →  0

BSNL – SPNT, CN (xe):                                     ⚠ KHÔNG có công thức
```

⚠ Ba vấn đề:
1. `Roda = Roda` / `Roda ≠ Roda` là điều kiện tự thoả / tự sai — chắc chắn
   ý là *"Tải trọng = Roda"* vs *"Tải trọng ≠ Roda"*.
2. `HS465-7` gần như chắc chắn là gõ nhầm của `HD465-7`.
3. Hai nhánh "bùn" cho ra công thức y hệt nhau → hoặc thừa, hoặc thiếu hệ
   số khác nhau.
4. `BSNL – SPNT, CN (xe)` được liệt kê và **được cộng vào tổng ở 5.18**
   nhưng tài liệu **không đưa công thức**.

### 5.18. Tổng định mức nhiên liệu

```
ĐMNL xe (QD 1828_25/02/2025) (Số Tke) =
      BSNL – SPNT,CN
    + BSNL – bùn
    + BSNL – SPNT
    + BSNL – khác
    + BSNL – SC,BD
    + BSNL – bổ túc
    + BSNL – ngày mưa
    + BSNL – Roda
    + Nhiên liệu tiêu hao theo ĐM (lít)

NLĐM hiện hành (Số Tke) =
    ĐMNL xe (QD 1828) × HS điều chỉnh NLĐM
    (tra theo Chủng loại xe + Chất lượng + Phân loại)
```

⚠ `Chất lượng` chưa được định nghĩa ở bất kỳ đâu trong tài liệu.

### 5.19. Định mức năng suất xe tải (ch/ca)

```
Số chuyến = 0 HOẶC Cung độ toàn tuyến = 0  →  0
ngược lại:
    Cung độ toàn tuyến > 8   →  dùng Cung độ = 8
    Cung độ toàn tuyến ≤ 8   →  làm tròn 1 chữ số thập phân (4,33 → 4,3)
    → tra danh mục Năng suất xe (996) theo Cung độ × (Chủng loại xe + Phân loại)
```

### 5.20. "Nhóm vỉa + Máy xúc" — khoá ghép chuỗi

```
Nhóm vỉa + Máy xúc = "Nhóm vỉa"_"Nhóm tầng"_"Máy xúc"_"Ký hiệu bùn"_"Khu vực xúc"_hậu tố

Ví dụ: PA.PCMB.S+90_75_ht7._CS_BK_dthai

Hậu tố — bước 1 (ưu tiên kiểm tra Băng tải TRƯỚC):
    Nơi dỡ tải = Băng tải              →  thêm _BK
    Nhóm chủng loại hàng = SPNT.via    →  thêm _SPNT

Hậu tố — bước 2:
    Nhóm chủng loại hàng = SPNT.via                       →  giữ nguyên
    Nhóm hàng ≠ SPNT.via và Tỷ trọng (tấn/m3) = 2,25      →  thêm _2,25
    Chủng loại hàng = Dthai                                →  thêm _dthai
```

Khoá này dùng để tra các bảng **STD** và **AP Tdia**.

⚠ Đây là **khoá ghép bằng nối chuỗi** — rất dễ vỡ (sai một dấu chấm, một
dấu cách, hoa/thường là tra trượt). Đề xuất khi implement: lưu khoá dưới
dạng **các cột riêng có khoá ngoại** (nhóm vỉa, nhóm tầng, máy xúc, ký hiệu
bùn, khu vực xúc, các cờ hậu tố) và chỉ sinh chuỗi khi cần hiển thị/xuất
Excel. Không dùng chuỗi làm khoá tra cứu thật trong DB.

### 5.21. Mã hoá hàng / Mã hàng TTL / Vỉa KPMB / Ký hiệu bùn

```
Mã hoá hàng:
    Chủng loại hàng = 0  →  0
    ≠ 0                  →  tra danh mục Chủng loại hàng

Mã hàng TTL:
    Mã hoá hàng = xitNK:
        Nơi nhận tải ∈ {Sàng 3.CS, Sàng 1.CS, Sàng 2B.CS}  →  daloai.NK
        Nơi nhận tải ∉ 3 giá trị trên                       →  xitCTNB
    Mã hoá hàng = DAT_thai:
        Nhóm vỉa = PA.PCMB.S+90   →  thai.PCMB
        Nhóm vỉa ≠ PA.PCMB.S+90   →  DAT_thai
    Mã hoá hàng ∉ {xitNK, DAT_thai}  →  Mã hàng TTL = Mã hoá hàng

Vỉa KPMB:
    4 ký tự cuối của Nhóm vỉa = KPMB  →  "KPMB" ; ngược lại để trống

Ký hiệu bùn:
    Chủng loại hàng ∈ {B.Loan, B.Duot, B.Tron, Btr.Tron, B.chan}  →  _Bun
    Chủng loại hàng = BunDac                                       →  _BĐ
    Chủng loại hàng = D.uot                                        →  _D.uot
    Chủng loại hàng = Dbchan                                       →  _Dbun
    Chủng loại hàng = Dbtron                                       →  _Dbun
    2 ký tự cuối của Chủng loại hàng = "cũ"                        →  _cũ
    không thuộc nhóm nào                                           →  không thêm gì
```

⚠ `Nơi nhận tải ∈ {Sàng 3.CS, Sàng 1.CS, Sàng 2B.CS}` là **hard-code giá
trị danh mục trong công thức**. Đề xuất: thêm một cờ boolean trên danh mục
Nơi nhận tải thay vì so tên.

### 5.22. Hệ số trắc địa (HSTĐ)

```
Nếu Tổng m3 = 0            →  Đất CN (m3) = 0   và  HS Đất CN (m3) = 0
Nếu Tổng KLVC (tấn) = 0    →  Đất CN (tấn) = 0  và  HS Đất CN (tấn) = 0
Nếu Tổng Tkm = 0           →  Đất CN (tkm) = 0  và  HS Đất CN (tkm) = 0
(tương tự với Đất SX / Than SX)

Nếu Tổng m3 ≠ 0:
    tra "Nhóm vỉa + Máy xúc" trong danh mục STD (Đất CN)
    hoặc STD (Đất SX/Than SX)
    → lấy Đất CN (m3/tấn/tkm), Đất SX (m3/tấn/tkm), Than SX (m3/tấn/tkm)

HSTĐ (m3)  = m3  / Tổng m3   (tương ứng)
HSTĐ (tấn) = tấn / Tổng tấn  (tương ứng)
HSTĐ (tkm) = tkm / Tổng tkm  (tương ứng)
```

### 5.23. HS áp cho than CTNB

```
Hệ số chênh lệch _CTNB = 0  →  HS áp cho than CTNB = 1
Hệ số chênh lệch _CTNB ≠ 0  →  HS áp cho than CTNB = Hệ số chênh lệch _CTNB
```

### 5.24. Chênh cao NLxM3

```
Chênh cao NLxM3 = Chênh cao thanh toán nhiên liệu × Tổng m3
```

### 5.25. Nhóm chỉ tiêu "quy ẩm / không quy ẩm"

```
Tỷ trọng (không quy ẩm):
    tra danh mục Mô hình theo Chủng loại hàng → cột Tỷ trọng (không quy ẩm)

Tổng KLVC Tke (tấn, không quy ẩm)
    = Tỷ trọng (không quy ẩm) × Tổng KLVC ban đầu (m3)
    (làm tròn 5 chữ số thập phân)

Tổng Thống kê (tkm, không quy ẩm)
    = Tổng KLVC Tke × Cung độ toàn tuyến
    (làm tròn 3 chữ số thập phân)

Tỷ trọng (ban đầu):
    tra danh mục Mô hình theo Chủng loại hàng → cột Tỷ trọng

Tổng KLVC Thống kê (m3) ban đầu:
    Phân loại = DAT  →  Mô hình (làm tròn 3 c.s.t.p) × Số chuyến − Trừ vơi
    Phân loại ≠ DAT  →  Mô hình (làm tròn 3 c.s.t.p) × Số chuyến − Trừ vơi
                        / Tỷ trọng ban đầu                        ⚠
    (làm tròn 3 chữ số thập phân)

Tổng KLVC Tke (tấn) quy ẩm
    = Tổng KLVC Tke (m3) ban đầu × Tỷ trọng (ban đầu)
    (làm tròn 5 chữ số thập phân)

Tổng Tke (tkm) quy ẩm
    = Tổng KLVC Tke (tấn) quy ẩm × Cung độ toàn tuyến
    (làm tròn 3 chữ số thập phân)

Tổng KLVC Thống kê (tấn) ban đầu chưa trừ đá:
    Phân loại = THAN  →  Tỷ trọng (ban đầu) × Mô hình × Số chuyến − Trừ vơi
    Phân loại ≠ THAN  →  Tỷ trọng (ban đầu) × Mô hình × Số chuyến − Trừ vơi
                         × Tỷ trọng (ban đầu)                     ⚠
    (làm tròn 5 chữ số thập phân)
```

⚠ **Hai công thức trên mơ hồ về thứ tự phép toán.** Không rõ
`A × B − C / D` là `(A×B − C) / D` hay `A×B − (C/D)`. Hai cách cho kết quả
khác hẳn nhau. Tương tự với `× Tỷ trọng (ban đầu)` ở cuối. **Bắt buộc phải
hỏi** — không đoán.

### 5.26. Các trường được liệt kê nhưng KHÔNG có công thức

Tài liệu nêu tên nhưng bỏ trống định nghĩa:

- Thể trọng bùn
- Tổng m3 (trừ bùn)
- Tổng tấn (trừ bùn)
- Tổng Tkm (trừ bùn) — *bị liệt kê hai lần liên tiếp trong bản gốc*
- Tổng bùn (tấn)
- BSNL – SPNT, CN (xe) — **có mặt trong tổng ở 5.18**
- NLĐM Thống kê (ban đầu)
- Hệ số chất tải bùn (Trắc địa)

---

## 6. Tổng hợp các điểm CHẶN — phải hỏi chủ dự án trước khi code

> ✅ **CẬP NHẬT 2026-08-30 — 14/15 điểm dưới đây ĐÃ ĐƯỢC GIẢI** bằng công
> thức Excel thật trong sheet `tinh toan` (workbook `Tháng 5 đổi tên
> xe.xlsx`). **Đọc [`REQUIREMENT_SANLUONG_EXCEL.md`](REQUIREMENT_SANLUONG_EXCEL.md)
> mục 3 để lấy công thức đúng — đừng code theo bản văn xuôi ở mục 5 trên.**
>
> ✅ Điểm chặn cuối cùng (thứ tự phép toán `Trừ vơi`, #1 và #2) **đã được
> chủ dự án chốt 2026-08-30**: theo bảng tính thật, `Mô hình × Số chuyến −
> (Trừ vơi ÷ Tỷ trọng)`. Xem [`DECISIONS.md`](DECISIONS.md) QĐ-02.
>
> **Không còn điểm chặn nào cho phần công thức.** Các quyết định thiết kế
> khác (chế độ TKE, tỷ trọng theo thời gian, kỳ báo cáo, danh mục khoá ghép)
> đều đã chốt — xem `DECISIONS.md` QĐ-03 → QĐ-06.

| # | Vấn đề | Ở mục |
|---|---|---|
| 1 | Thứ tự phép toán `Mô hình × Số chuyến − Trừ vơi / Tỷ trọng` | 5.25 |
| 2 | Thứ tự phép toán `... − Trừ vơi × Tỷ trọng (ban đầu)` | 5.25 |
| 3 | `Thể trọng (TĐ)`: hai nhánh đầu chồng nhau; `Dat_TCN` vs `Dat_CN` | 5.4 |
| 4 | Nội suy ĐMNL: tên *cận trên/cận dưới* bị đảo | 5.13 |
| 5 | Nội suy ĐMNL: công thức `na-nl` thiếu ngoặc (không đối xứng với `nb-nl`) | 5.13 |
| 6 | Nội suy ĐMNL: `(nb − ha)` trộn đơn vị — có phải `(hb − ha)`? | 5.13 |
| 7 | `Đá thải (tấn)`: ba nhánh cho cùng kết quả | 5.11 |
| 8 | `BSNL – Roda`: điều kiện `Roda = Roda` vô nghĩa | 5.17 |
| 9 | `BSNL – bùn`: hai nhánh trùng công thức | 5.17 |
| 10 | `BSNL – SPNT, CN (xe)`: thiếu hẳn công thức nhưng vẫn cộng vào tổng | 5.17, 5.18 |
| 11 | `Chất lượng` (dùng tra HS điều chỉnh NLĐM) chưa định nghĩa ở đâu | 5.18 |
| 12 | Công thức `Nhóm tầng nhận tải` thiếu dấu đóng ngoặc | 5.1 |
| 13 | 8 trường ở mục 5.26 chưa có công thức | 5.26 |
| 14 | `HS465-7` có phải gõ nhầm `HD465-7`? | 5.17 |
| 15 | Xác nhận giả thuyết: các trường "(Báo chuyến)" ở mục 3 chính là phần Thống kê nhập bổ sung ở Đối soát lần 2? | 3 |

---

## 7. Hằng số đang hard-code trong đặc tả — nên đưa vào Danh mục/Cấu hình

Những giá trị sau nằm thẳng trong công thức. Nếu code cứng, mỗi lần mỏ đổi
định mức là phải sửa code + build lại. Đề xuất đưa hết vào danh mục có hiệu
lực theo thời gian (giống danh mục Tỷ trọng ở mục 2.3):

| Giá trị | Ý nghĩa | Ở mục |
|---|---|---|
| 2,625 / 2,617 | hệ số quy đổi Đá thải tấn→m3 theo KC / CS | 5.11 |
| 1,03 (tháng 6–9) | hệ số ĐMNL theo mùa | 5.14 |
| 0,97 / 1 / 1,04 / 1,06 | hệ số ĐMNL theo hạng xe A/B/C1/khác | 5.14 |
| 1,03 | hệ số cải tạo ben | 5.14 |
| 1,02 / 0,9 / 1,15 | HS Than (CN-NK) | 5.15 |
| 0,5 / 5% / 4% | BSNL Roda / ngày mưa / bổ túc | 5.17 |
| 1% / 0,5% / 1,5% | BSNL SC,BD theo nhóm chủng loại xe | 5.17 |
| 0,05 khi **Số xe = 965** | BSNL khác — hard-code đích danh một chiếc xe | 5.17 |
| 0,10 / 0,15 | BSNL SPNT theo chủng loại xe | 5.17 |
| 2,25 | ngưỡng Tỷ trọng để thêm hậu tố `_2,25` | 5.20 |
| 8 | trần cung độ khi tra Năng suất xe | 5.19 |
| 15 / −195 / −200 | tham số nhóm tầng nhận tải | 5.1 |
| 1,5 | ngưỡng cung độ trong HS Than (CN-NK) | 5.15 |
| Danh sách chủng loại xe (HD465-7R, CAT777, VolvoA40F…) | dùng trong 4 công thức khác nhau | 5.15, 5.17 |
| Danh sách nơi nhận tải (Sàng 1.CS, Sàng 2B.CS, Sàng 3.CS) | dùng trong Mã hàng TTL | 5.21 |
| Danh sách chủng loại hàng bùn (B.Loan, B.Duot…) | dùng trong Ký hiệu bùn | 5.21 |

**Khuyến nghị:** thay vì so sánh theo TÊN, gắn **cờ/thuộc tính** lên chính
bản ghi danh mục (ví dụ: `Nơi nhận tải.là_sàng = true`, `Chủng loại
hàng.là_bùn = true`, `Chủng loại xe.nhóm_BSNL_SCBD = A|B|C`). Khi đó thêm
một chiếc sàng mới hay một chủng loại xe mới là thao tác nhập danh mục,
không phải sửa công thức — đúng nguyên tắc đã thống nhất ở
`REQUIREMENT_WORKFLOW.md` mục 4.2.
