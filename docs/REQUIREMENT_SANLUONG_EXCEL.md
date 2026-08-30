# Đối chiếu công thức docx với BẢNG TÍNH THẬT đang chạy

Nguồn: hai workbook Excel chủ dự án cung cấp 2026-08-30 —
`thống kê sản lượng.xlsx` (52 sheet) và `Tháng 5 đổi tên xe.xlsx` (129
sheet). Trọng tâm là sheet **`tinh toan`** trong workbook thứ hai: đây là
nơi chứa **toàn bộ công thức tính sản lượng đang chạy thật**.

Bằng chứng gốc trong `docs/_source/`: `excel-tinhtoan-header-row4.txt` (tên
cột chính thức), `excel-tinhtoan-row5-formulas.txt` (công thức dòng master),
`excel-tinhtoan-row1250.txt` (dữ liệu thật để kiểm chứng số học).

**Giá trị của tài liệu này:** đặc tả docx viết công thức bằng văn xuôi nên
thiếu ngoặc / sai tên / chồng nhánh — `REQUIREMENT_SANLUONG.md` mục 6 liệt
kê 15 điểm chặn. Bảng tính thật giải quyết **14/15** điểm đó bằng công thức
Excel chính xác. Mục 3 dưới đây là kết quả đối chiếu.

---

## 1. Kiến trúc hai workbook

| Workbook | Vai trò suy ra | Sheet đáng chú ý |
|---|---|---|
| `thống kê sản lượng.xlsx` | phía **đơn vị / lao động tiền lương** | `nhập số`, `kiểm công`, `Tien luong`, `ktra dầu tiêu thụ`, `TT 3 ca`, `đọ KT1/2/3`, `VÀO DXE`, `NSDX…` |
| `Tháng 5 đổi tên xe.xlsx` | phía **phòng Thống kê — tính sản lượng** | `Cap nhat Slg ThanV+Dat B1`, **`tinh toan`**, `STD(DatCN)`, `STD(Dat+thanSX)`, `AP Tdia(m3-tan-tkm)`, `Mohinh_TheTrong( ko dk xoa)`, `DMNL T2-2025`, `KBTC Xe&May Xuc(ko dk xoa)`, `đối chiếu`, `CHỐT SỐ`, `KHAI THÁC` |

Tên sheet khớp gần như 1-1 với tên danh mục trong docx — xác nhận docx được
viết bằng cách mô tả lại chính bộ Excel này.

**Bằng chứng phụ cho danh sách phân xưởng:** workbook 2 có đúng các sheet
`QTNL_VT1`, `QTNL_VT3`, `QTNL_VT4`, `QTNL_VT5`, `QTNL_VT6`, `QTNL_VT7`,
`QTNL_VT9` — trùng khít dãy "Phân xưởng Vận tải 1,3,4,5,6,7,9" (không có 2
và 8). Xác nhận dãy số đứt quãng là thật.

### Luồng dữ liệu trong workbook 2

```
'Cap nhat Slg ThanV+Dat B1'   ← dữ liệu báo chuyến đã chốt (đầu vào)
        │  (sheet 'tinh toan' cột B..AH trỏ thẳng sang đây)
        ▼
   'tinh toan'                ← ~140 cột công thức, mỗi dòng = 1 chuyến
        │  tra cứu sang:
        ├─ 'Mohinh_TheTrong( ko dk xoa)'  (mô hình, tỷ trọng, SPNT, nhóm CLH, TTL)
        ├─ 'DMNL T2-2025'                 (bảng định mức nhiên liệu 2 chiều)
        ├─ 'STD(Dat+thanSX)' / 'STD(DatCN)'  (thể trọng trắc địa)
        ├─ 'AP Tdia(m3-tan-tkm)' / 'Ap Tkm'  (hệ số trắc địa)
        ├─ 'KBTC Xe&May Xuc(ko dk xoa)'   (nhóm vỉa theo nơi nhận tải)
        └─ named range DSXE / DSMAY       (danh mục xe / máy xúc)
```

### Công tắc chế độ toàn cục

Ô **`'Cap nhat Slg ThanV+Dat B1'!$A$1`**: khi = `"TKE"` thì **mọi hệ số
trắc địa bị ép về 1**:

```excel
=IF('Cap nhat Slg ThanV+Dat B1'!$A$1="TKE", 1, INDEX('AP Tdia(m3-tan-tkm)'!…))
```

Tức hệ thống có **hai chế độ tính**: *thống kê thuần* (TKE) và *áp hệ số
trắc địa*. Docx không hề nhắc tới. **Đã chốt thành QĐ-03** (`DECISIONS.md`):
đưa lên UI thành nút chuyển chế độ, Nhân viên Thống kê bật/tắt, có lưu vết.

---

## 2. Bản đồ cột sheet `tinh toan`

> ✅ **Bản đồ này ĐÚNG cho toàn sheet** — xác nhận bằng ba nguồn độc lập:
> hàng tiêu đề dòng 4 (tên cột chính thức), công thức dòng 5 (dòng master),
> và dữ liệu thật dòng 1250 (kiểm chứng số học, mục 7).
>
> 🚨 **Hai đính chính của tôi trong ngày 2026-08-30** — cả hai đều do lỗi
> công cụ đọc XML tôi tự viết, chi tiết + cách tránh ở
> [`_source/tools/README.md`](_source/tools/README.md):
>
> 1. Tôi từng viết "từ dòng 7 trở đi cùng một cột chứa thứ khác hẳn, sheet
>    không nhất quán". **SAI** — do sau `ReadElementContentAsString()` con
>    trỏ đã tự nhảy node, vòng lặp `Read()` thêm lần nữa nên bỏ qua `</c>` và
>    **gán công thức của ô sau cho địa chỉ ô trước**.
> 2. Tôi từng viết "đa số dòng đã bị dán cứng thành giá trị". **CŨNG SAI** —
>    do regex `<f…>…</f>` **bỏ sót shared formula dạng thẻ tự đóng**
>    `<f t="shared" si="…"/>`.
>
> **Sự thật: layout cột giống nhau ở mọi dòng, và mọi dòng dữ liệu đều có đủ
> công thức (133–139). Sheet nhất quán.**

### 2.0. Cấu trúc sheet và TÊN CỘT CHÍNH THỨC

Quét lại bằng công cụ đã sửa lỗi cho thấy:

- Sheet có **55.161 dòng**, cột **A → GY (206 cột)**.
- Thuộc tính đóng băng cửa sổ là `<pane xSplit="4" ySplit="5" state="frozen"/>`
  → **5 dòng đầu là vùng tiêu đề/mẫu**, dữ liệu thật bắt đầu từ **dòng 6**.
- **Dòng 4 là HÀNG TIÊU ĐỀ** — 207 ô chứa **tên cột bằng tiếng Việt do chính
  người dùng đặt**. Trước đó tôi tưởng sheet không có dòng tiêu đề và phải
  suy tên cột từ công thức; hoá ra tên chính thức có sẵn.
- **Dòng 5 là dòng đủ công thức nhất VÀ là dòng MASTER của shared formula**:
  139 công thức / 203 ô. Xem mục 6.3.

Toàn bộ tên cột: [`docs/_source/excel-tinhtoan-header-row4.txt`](_source/excel-tinhtoan-header-row4.txt).

**Tên chính thức xác nhận đúng toàn bộ bản đồ tôi đã suy từ công thức**, và
bổ sung tên cho những cột trước đây chưa rõ:

| Cột | Tên chính thức (dòng 4) | Ghi chú |
|---|---|---|
| A, B, C | THANG · Ngày · Ca | |
| D, E | Khu vực xúc · Máy xúc | |
| F, G | Tầng nhận tải · Nơi nhận tải (vỉa/kho) | |
| H, I | Tầng dỡ tải · Tên gọi nơi dỡ tải | |
| J, K | Nhom hang · Chủng loại hàng | |
| L, M, N, O | CĐ toàn tuyến (Km) · Nâng tải toàn tuyến (m) · CĐ dốc cục bộ · Dốc cục bộ | |
| **P** | **Chênh cao thanh toán nhiên liệu** | |
| Q, R | Số xe · Số chuyến | |
| S, T, U | HSTĐ (m3) · HSTĐ_Tan · HSTĐ Dat+Than_Tkm | hệ số trắc địa |
| **V** | **Hệ số chất tải bùn (Trắc địa)** | ⚠ nhập tay — không có công thức |
| W, X | báo cáo · Ngày mưa | |
| Y | Klg tan (Qua can) | |
| Z | **Roda ; Khac** | = Mức tải / Tải trọng |
| AA, AB | MoHinh (Tam tinh chua có QĐ) · Tỷ trọng (cập nhật) | |
| AC, AD | TheTrong_TĐ · Phân loại (Dat/Than) | |
| AE, AF | Lái xe bổ túc · HS ap cho than CTNB | |
| AG, AH | SP N/thu; Cong Nghe · Trừ vơi (đất_m3; than_tấn) | |
| AI, AJ, AK | Tỷ trọng (tấn/m3) · Mô hình (m3/ch) · **Nhóm tầng** | |
| **AL, AM, AN, AO** | **Tổng m3 · Tổng KLVC (tấn) · Tổng Tkm · Tổng Km vận chuyển** | |
| AP, AQ | **Hb-CĐộ cận trên** · **Ha-CĐộ cận dưới** | ⚠ tên bị đảo so với công thức — xem 3.4 |
| AR, AS | h1-Dốc cận trước · h2-Dốc cận sau | |
| AT, AU, AV | Nb-h1 · Nb-h2 · Nb-NL tương ứng Hb | |
| AW, AX, AY | Na-h1 · Na-h2 · Na-NL tương ứng Ha | |
| AZ | Nt-NLĐM tiêu hao cần tìm | |
| BA…BF | ĐMNL theo mùa · ĐMNL_cty · DMNL_HangXe · NLĐM_CaiTaoBen · HS_Than(CN_NK) · ĐMNL_xe (Đ/C tháng) | |
| BG | NhienLieu_TieuHaoTheoĐM (lit) | |
| BH…BN | BSNL_Roda (xe) -x 1,5 · BSNL_ngay_mua (5%) · BSNL_bổ túc (4%) · BSNL_SC,BD (Xe) · BSNL_khac · BSNL_Spnt (xe) · BSNL_Bun (xe) | |
| **BO** | **BSNL_Spnt__CN(xe)** | ⚠ nhập tay — không có công thức |
| BP, BQ | ĐMNL_xe (QD 1828_25/02/2025)-SoTke · NLDM HienHanh_SoTke | |
| BR, BS | Định mức năng suất Xe tải (ch/ca) · ChenhCaoNLxM3 | |
| BT…BW | Mahoahang · mã hàng TTL · Vỉa KPMB · KyHieuBun | |
| **BX…CB** | **Thể trọng bùn · Tổng m3 (trừ bun) · Tổng tan (trù bun) · Tổng Tkm (tru bun) · Tổng_Bùn (tấn)** | ⚠ **5 trường "trừ bùn"** — CÓ cột nhưng KHÔNG có công thức, xem 6.2 |
| CC…CE | TyTrongKoQA · Tổng KLVC TKE (tấn_koQA) · Tổng TKE (tkm_koQA) | |
| CF…CI | Tỷ trọng_BanDau · Tổng KLVC TKE (m3)_BanDau · Tổng KLVC TKE (tấn)_QA · Tổng TKE (Tkm)_QA | |
| **CJ** | **NLĐM (tke)_BanDau** | ⚠ nhập tay — không có công thức |
| CK | Tổng KLVC TKE (tấn)_BanDau_chưa trừ đá | |
| CL, CM, CN, CO | TenSP_NghiemThu · Lễ · Tên Nghiệm thu · BBNT-MaHoa | |
| CP…CW | NhomTang+M.Xuc · **Nhóm vỉa** · **Nhóm vỉa+M.xuc** · Nhom via+Nhóm tầng · NhomVia+NhomTang+Baithai · Via+BaiThai · Via+NhomTang · Via+Tang+BaiThai | các khoá ghép chuỗi |
| CX…DC | CaiTaoToa · Số hiệu xe · Xe + Hang van chuyen · Chủng loại xe · Hạng xe · Chung Loai xe + Hang xe | |
| DD…DK | **PXVT** (phân xưởng vận tải) · LoaiXe_DMNL · Chung loai xe · Số hiệu máy · C/LOAI MAY · HẠNGMAY · Chung loai may + Hang may · GauXuc | |
| DL…DR | TachGiaiDoanGiaDau · TaiTrongxe · QLY THIET BI · **Ca 1+2 ; 3** · CLXe + Loai xe · Chủng loại xe (NL) · CLXe + Loai xe (roda) | |
| DS…DZ | TĐ.Tổng m3 · TĐ.Tổng KLVC (tấn) · TĐ.Tổng Tkm · TĐ.Tổng Km vận chuyển · td.tanL1 · td.tkmL1 · HS TDia.Tan · HS TDia.Tkm | nhóm chỉ tiêu trắc địa |
| EA…EI | Xe+Hang · TỔNG NLDM (QĐ 1298, 27/2/2025)-SoNgthu · **HSNL đ/c tháng (nam 2026)** · TyLe_Tkm(tk/td) · NLĐM đã ĐCHS theo thang · HSDML · Tổng NLĐM hiện hành_Ngthu · (+/-)NL SauDC · Nhiên liệu ĐM (Áp 2%) | |
| EK…EN | TĐ.Bùn (m3) · TĐ.Bùn (Tkm) · TĐ.Đất trộn P/Án bùn (m3) · TĐ.Đất trộn P/Án Bùn (Tkm) | nhóm bùn theo trắc địa |
| FH…FK | M3 than qui đổi · m3 tính vượt · **M3 ĐÁ THẢI** · **TẤN ĐÁ THẢI** | |
| FQ…FT | ChungLoaixe · Taitrongxe_tan · ChungLoaiMay · GauXuc | bảng tra phụ nằm ngay trong sheet |
| EP/EQ, FX/FY, FZ…GY | các cặp **KC / CS** lặp lại | bảng tra hệ số theo khu vực xúc |

Ba phát hiện đáng chú ý từ hàng tiêu đề:

1. **Cột `DD` tên là `PXVT`** — phân xưởng vận tải. Vậy dữ liệu tính sản
   lượng có mang theo đơn vị vận tải, khớp với yêu cầu phân quyền theo đơn vị.
2. **Cột `DO` = `Ca 1+2 ; 3`** — xác nhận nghiệp vụ gộp ca 1+2 và tách ca 3.
3. **`EC` = `HSNL đ/c tháng (nam 2026)`** và `EB` = `TỔNG NLDM (QĐ 1298,
   ngày 27/2/2025)` — các hệ số/định mức **gắn với quyết định và năm cụ
   thể**, củng cố QĐ-04 (tham số phải khai báo theo thời gian).

### 2.1. Bản đồ suy từ công thức (đối chiếu chéo — đã khớp với 2.0)

Suy ra từ công thức (trước khi tìm ra hàng tiêu đề ở dòng 4). `CnSl` = sheet
`'Cap nhat Slg ThanV+Dat B1'`.

| Cột | Nguồn | Ý nghĩa |
|---|---|---|
| A | CnSl | Tháng (dùng ở `IF(OR(A=6,7,8,9),1.03,1)`) |
| B | CnSl | Ngày (dùng chia kỳ `IF(B<8,"Kỳ 01"…)`) |
| C | CnSl | Ca (`IF(C=3,"ca 3","Ca 1+2")`) |
| D | CnSl | **Khu vực xúc** (`CS` / `KC`) |
| E | CnSl | **Máy xúc** |
| F | CnSl!G | **Tầng nhận tải** |
| G | CnSl!F | **Nơi nhận tải** |
| H | CnSl | Tầng dỡ tải |
| I | CnSl!M | **Nơi dỡ tải** |
| J | tra `Mohinh_TheTrong`.`Nhom_CLH` | **Nhóm chủng loại hàng** |
| K | CnSl!N | **Chủng loại hàng** |
| L | CnSl!I | **Cung độ toàn tuyến** |
| M | CnSl!J | **Nâng tải toàn tuyến** |
| N | CnSl!K | **Cung độ dốc cục bộ** |
| O | CnSl!L | **Dốc cục bộ** |
| **P** | công thức | **Chênh cao thanh toán nhiên liệu** |
| Q | CnSl!O | **Số xe** |
| R | CnSl!P | **Số chuyến** |
| S / T / U | `AP Tdia` | HS trắc địa m3 / tấn / tkm |
| X | CnSl!AC | **Ngày mưa** (1/0) |
| Y | CnSl!Q | **Khối lượng qua cân (tấn)** |
| Z | CnSl!R | **Tải trọng / Mức tải** |
| AA | CnSl!S | **Mô hình (tạm tính)** |
| AB | CnSl!T | **Tỷ trọng (cập nhật)** |
| AC | công thức | **Thể trọng (TĐ)** |
| AD | công thức | **Phân loại** (`DAT` / `Than`) |
| AE | CnSl!V | **Xe bổ túc** |
| AF | CnSl!AM | **HS áp cho than CTNB** |
| AG | công thức | **Sản phẩm nghiệm thu** |
| AH | CnSl!U | **Trừ vơi** |
| AI | công thức | **Tỷ trọng (tấn/m3)** |
| AJ | công thức | **Mô hình (m3/ch)** |
| AK | công thức | **Nhóm tầng nhận tải** |
| **AL** | công thức | **Tổng m3** |
| **AM** | công thức | **Tổng KLVC (tấn)** |
| **AN** | công thức | **Tổng Tkm** |
| AO | công thức | **Tổng km vận chuyển** |
| AP…AY | công thức | nội suy ĐMNL (chi tiết mục 3.4) |
| AZ | công thức | **Nt — NLĐM tiêu hao cần tìm** |
| BA…BD | công thức | ĐMNL: theo mùa → công ty → hạng xe → cải tạo ben |
| BE | công thức | **HS Than (CN-NK)** |
| BF | `=BD*BE` | **ĐMNL xe (Đ/C tháng)** |
| **BG** | `=AN*BF/1000` | **Nhiên liệu tiêu hao theo ĐM (lít)** |
| BH…BN | công thức | các khoản **BSNL** |
| BO | *(để trống)* | **BSNL – SPNT,CN** — nhập tay, KHÔNG có công thức |
| BP | tổng | **ĐMNL xe (QD 1828)** |
| BQ | `=BP*EC` | **NLĐM hiện hành** |
| BR | công thức | **Định mức năng suất xe tải (ch/ca)** |
| BT / BU / BV / BW | công thức | TTL CLH / Mã hàng TTL / Vỉa KPMB / Ký hiệu bùn |
| CC / CD / CE | công thức | Tỷ trọng không quy ẩm → tấn → tkm |
| CF / CG / CH / CI | công thức | Tỷ trọng ban đầu → m3 → tấn quy ẩm → tkm quy ẩm |
| CK | công thức | **Tổng KLVC Tke (tấn) ban đầu chưa trừ đá** |
| CQ | tra `KBTC Xe&May Xuc` | **Nhóm vỉa** |
| **CR** | nối chuỗi | **"Nhóm vỉa + Máy xúc"** — khoá tra STD / AP Tdia |
| CX | DSXE.`CaiTaoToa` | cờ **cải tạo toa** |
| DA | DSXE + `.CS`/`.KC` | **Chủng loại xe + DMNL** |
| DB | DSXE | **Hạng xe** (A / B / C1 / khác) |
| DE | công thức | khoá cột tra bảng `DMNL T2-2025` |
| DF | `=LEFT(DA,7)` | chủng loại xe 7 ký tự (dùng cho BSNL SC,BD) |
| DQ | DSXE | chủng loại xe (nhóm) |
| DL | công thức | **Kỳ báo cáo** (Kỳ 01 = 1–7, Kỳ 02 = 8–14, … Kỳ 05 = 29–31) |
| EA | `=DP&"_"&AD` | khoá tra HS điều chỉnh NLĐM |
| EC | công thức | **HS điều chỉnh NLĐM** |
| FJ / FK | công thức | **Đá thải (m3) / Đá thải (tấn)** |

---

## 3. Kết quả giải 15 điểm chặn

| # | Điểm chặn (REQUIREMENT_SANLUONG.md mục 6) | Kết quả |
|---|---|---|
| 1 | Thứ tự `Mô hình × Số chuyến − Trừ vơi / Tỷ trọng` | ✅ giải — **nhưng KHÁC câu trả lời của chủ dự án**, xem 3.1 |
| 2 | Thứ tự `… − Trừ vơi × Tỷ trọng` | ✅ giải — xem 3.1 |
| 3 | `Thể trọng (TĐ)` nhánh chồng nhau | ✅ giải — xem 3.2 |
| 4 | Nội suy: tên *cận trên/cận dưới* đảo | ✅ giải — tên sai, định nghĩa đúng. Xem 3.4 |
| 5 | Nội suy: `na-nl` thiếu ngoặc | ✅ giải — đúng là thiếu ngoặc, hai vế đối xứng |
| 6 | Nội suy: `(nb − ha)` sai đơn vị | ✅ giải — thật ra là `(AP − AQ)`, hiệu hai cung độ |
| 7 | `Đá thải (tấn)` ba nhánh cùng kết quả | ✅ giải — **ba nhánh dùng BA tham số khác nhau**. Xem 3.5 |
| 8 | `BSNL – Roda`: `Roda = Roda` vô nghĩa | ✅ giải — là `Tải trọng = "Roda"` |
| 9 | `BSNL – bùn` hai nhánh trùng | ✅ giải — **đúng là dùng chung một hệ số** `$BN$2` |
| 10 | `BSNL – SPNT,CN` thiếu công thức | ✅ giải — **cột nhập tay, không có công thức** |
| 11 | `Chất lượng` chưa định nghĩa | ✅ giải — là **hạng xe**, lấy `LEFT(hạng xe,1)`. Xem 3.7 |
| 12 | `Nhóm tầng nhận tải` thiếu ngoặc | ✅ giải — xem 3.3 |
| 13 | 8 trường thiếu công thức | ⚠ một phần — BSNL SPNT,CN đã rõ; các trường "trừ bùn" chưa tìm thấy |
| 14 | `HS465-7` gõ nhầm? | ✅ giải — đúng là **`HD465-7`** |
| 15 | Trường "(Báo chuyến)" = phần Thống kê nhập bổ sung? | ✅ giải — **đúng**, xem 3.8 |

### 3.1. ⚠ MÂU THUẪN: thứ tự phép toán `Trừ vơi`

Chủ dự án trả lời trong chat: *"là (A−B)/C"*. Nhưng công thức thật:

```excel
CG5 = ROUND( ROUND($AJ5,3)*$R5 − IF($AD5="DAT", $AH5, AH5/CF5), 3)
```

Dịch: `Mô hình × Số chuyến − ( Trừ vơi nếu DAT, ngược lại Trừ vơi ÷ Tỷ trọng )`

Tức phép chia **chỉ áp lên Trừ vơi**, không áp lên cả biểu thức → dạng
`A×B − (C/D)`, **không phải** `(A×B − C)/D`.

Tương tự với điểm chặn #2:

```excel
CK5 = ROUND( CF5*AJ5*R5 − IF(AD5="than", AH5, AH5*CF5), 5)
```

Dịch: `Tỷ trọng × Mô hình × Số chuyến − ( Trừ vơi nếu THAN, ngược lại Trừ
vơi × Tỷ trọng )` — phép nhân cũng **chỉ áp lên Trừ vơi**.

**Cần chủ dự án phân xử:** bảng tính đang chạy thật nói một đằng, câu trả
lời trong chat nói một nẻo. Hai cách cho kết quả khác nhau. **Không tự
chọn.** Khả năng cao câu trả lời trong chat là hiểu nhầm câu hỏi (tôi hỏi
gọn `A−B/C` nên dễ đọc lệch), nhưng đây là con số sản lượng — phải xác nhận.

Ghi chú thêm: hai công thức trên còn phân nhánh theo **Phân loại** mà bản
docx không nêu (`DAT` → trừ thẳng; khác → trừ sau khi quy đổi).

### 3.2. Thể trọng (TĐ) — thứ tự nhánh và nhánh cộng thêm

```excel
AC5 = IF(OR(AG5="dat_TCN", AG5="than_CN"), AI5,
         IF(AND(AG5<>"Dat_SX", AG5<>"than_sx"), 0,
            INDEX('STD(Dat+thanSX)'!$B$6:$P$1000,
                  MATCH($CR5, 'STD(Dat+thanSX)'!$A$6:$A$1000, 0),
                  MATCH(IF(AG5="Dat_SX","TheTrong_Dat_TĐ","TheTrong_Than_TĐ"),
                        'STD(Dat+thanSX)'!$B$5:$P$5, 0))))
     + IF(AG5<>"Dat_CN", 0,
          INDEX('STD(DatCN)'!$B$5:$H$301,
                MATCH($CR5, 'STD(DatCN)'!$A$5:$A$301, 0),
                MATCH("DatCN_TT", 'STD(DatCN)'!$B$4:$H$4, 0)))
```

Hai điều docx làm sai lệch:

1. **Nhánh `Dat_CN` là một số hạng CỘNG THÊM**, không nằm trong chuỗi IF.
   Vì các nhánh loại trừ nhau nên kết quả vẫn đúng, nhưng cấu trúc khác.
2. **`dat_TCN` là giá trị THẬT, không phải gõ nhầm của `Dat_CN`** — cả hai
   cùng tồn tại trong một công thức.
3. Chuỗi IF chạy **theo thứ tự trên xuống, khớp trước thắng** → mâu thuẫn
   "Than_CN thoả cả hai nhánh" mà tôi nêu ở docx được giải bằng thứ tự:
   nhánh `dat_TCN/than_CN` xét TRƯỚC nên thắng.

### 3.3. Nhóm tầng nhận tải

```excel
AK5 = IF(D5="KC",
          ( IF(F5<-195, -200, IF(F5<0, -1+TRUNC((F5+1)/15,0), TRUNC(F5/15,0)) * 15) ),
          ( IF(F5<0, -1+TRUNC((F5+1)/15,0), TRUNC(F5/15,0)) * 15 ))
```

⚠ Chú ý: `*15` nằm **NGOÀI** hàm IF trong cùng, tức nhân vào kết quả của
cả hai nhánh `-1+TRUNC(...)` và `TRUNC(...)`. Cách hiểu của tôi ở
`REQUIREMENT_SANLUONG.md` mục 5.1 là đúng.

Nhưng nhánh `-200` thì KHÔNG nhân 15 (nó nằm ngoài phép nhân) — trả về
đúng `-200`.

⚠ **Phát hiện thêm:** một số ô khác trong cùng workbook có thêm số hạng
`+ IF(AND(D="CS", E="u8.", G="12.", F=160), 15, 0)` — một ngoại lệ cứng cho
đúng một tổ hợp máy xúc / nơi nhận tải / tầng. Ô `AK5` (dòng dữ liệu chuẩn)
**không có** số hạng này. Cần hỏi: ngoại lệ đó còn hiệu lực không?

### 3.4. Nội suy định mức nhiên liệu — công thức đầy đủ

Biến nội suy theo chiều dốc là **`P` = Chênh cao thanh toán nhiên liệu**
(docx gọi lẫn lộn là "chiều cao nâng tải" và "chênh lệch thanh toán").

```excel
' Hai cận CUNG ĐỘ (theo L = Cung độ toàn tuyến)
AP5 = INDEX('DMNL T2-2025'!$A$7:$A$73, MATCH($L5,'DMNL T2-2025'!$A$7:$A$73,1))   ' cận DƯỚI (lớn nhất ≤ L)
AQ5 = SMALL('DMNL T2-2025'!$A$7:$A$73, COUNTIF('DMNL T2-2025'!$A$7:$A$73,"<"&$L5)+1) ' cận TRÊN (nhỏ nhất ≥ L)

' Hai cận ĐỘ DỐC (theo P = Chênh cao thanh toán nhiên liệu)
AR5 = INDEX('DMNL T2-2025'!$B$7:$B$73, MATCH($P5,'DMNL T2-2025'!$B$7:$B$73,1))   ' cận dưới
AS5 = SMALL('DMNL T2-2025'!$B$7:$B$73, COUNTIF('DMNL T2-2025'!$B$7:$B$73,"<"&$P5)+1) ' cận trên

' 4 điểm góc — cột tra là DE5 & "_" & (cung độ)
AT5 = giá trị tại (dốc AR5, cột DE5_AP5)
AU5 = giá trị tại (dốc AS5, cột DE5_AP5)
AW5 = giá trị tại (dốc AR5, cột DE5_AQ5)
AX5 = giá trị tại (dốc AS5, cột DE5_AQ5)

' Nội suy theo DỐC tại từng cung độ
AV5 = IF(AR5=AS5, AT5, AT5 + (AU5-AT5)*(P5-AR5)/(AS5-AR5))
AY5 = IF(AR5=AS5, AW5, AW5 + (P5-AR5)*(AX5-AW5)/(AS5-AR5))

' Nội suy theo CUNG ĐỘ  →  Nt
AZ5 = IF(L5=0, 0, IF(AQ5=AP5, AV5, AY5 - (AY5-AV5)/(AP5-AQ5)*(L5-AQ5)))
```

Đây là **nội suy song tuyến (bilinear) chuẩn**. Ba lỗi tôi nghi ngờ trong
docx đều được xác nhận là lỗi văn bản:

- `AV5` và `AY5` **đối xứng hoàn toàn** → docx thiếu ngoặc ở vế `na-nl`.
- Mẫu số cuối là `(AP5 − AQ5)` = hiệu hai **cung độ** → docx viết
  `(nb − ha)` là gõ nhầm.
- `MATCH(...,1)` trả về **giá trị lớn nhất ≤ tham chiếu** = cận dưới → xác
  nhận tên gọi trong docx bị đảo, còn định nghĩa thì đúng.

### 3.5. Đá thải — ba nhánh, ba tham số KHÁC nhau

```excel
FK5 = IF(J5="THANV",
          IF(D5="CS", $D$3,
             IF(AND(D5="KC", RIGHT(I5,2)="CS"), $F$3,
                $B$3))
          * $CK5,
        0)

FJ5 = FK5 / IF(D5="KC", 2.625, 2.617)
```

Docx viết cả ba nhánh là *"giá trị tự nhập"* nên trông như thừa. Thực tế
mỗi nhánh lấy **một ô tham số riêng** (`$D$3` / `$F$3` / `$B$3`), rồi nhân
với `CK` (Tổng KLVC Tke ban đầu chưa trừ đá). Khi thiết kế DB: đây là **ba
tham số cấu hình**, không phải một.

### 3.6. Các công thức khác đã xác nhận khớp docx

```excel
' Chênh cao thanh toán nhiên liệu
P5  = IF(L5=0, 0,
         IF(O5<M5, M5,
            ROUND(IF(N5<>0,
                     IF(M5<0,0,M5) + (O5 - IF(M5<0,0,M5)) * N5/L5,
                     IF(M5<0,0,M5)), 0)))

' Tổng m3
AL5 = IF(Y5>0, Y5/AI5,
         ROUND(IF(LEFT(J5,1)="D", ROUND(AJ5,1), ROUND(AJ5,3)) * R5
               - IF(AD5="DAT", AH5, 0), 3))

' Tổng KLVC (tấn)   — FK5 = Đá thải, $AM$3 = hệ số Than tke trừ đá/Than kcs
AM5 = (AL5*AI5 - FK5 - IF(AD5="THAN", AH5, 0)) * IF(AG5="than_sx", $AM$3, 1)

' Tổng Tkm  /  Tổng km vận chuyển
AN5 = IF(Y5<>0, Y5*L5, ROUND(AM5*L5, 4))
AO5 = R5*L5

' Mô hình (m3/ch)
AJ5 = ROUND(IF(R5=0, 0,
              IF(AA5<>0, AA5,
                 INDEX('Mohinh_TheTrong…', MATCH($K5,…), MATCH($DA5,…))
                 * IF(Z5="roda", 2/3, IF(Z5=0, 1, Z5)))), 3)

' Tỷ trọng (tấn/m3)
AI5 = IF(AB5<>0, AB5,
         INDEX('Mohinh_TheTrong…', MATCH(K5,…),
               MATCH(IF(D5="CS","CS.","KC.")&"TyTrong", …)))

' Phân loại
AD5 = IF(OR(LEFT(AG5,1)="S", LEFT(AG5,1)="D"), "DAT", "Than")

' Khoá "Nhóm vỉa + Máy xúc"
CR5 = CQ5&"_"&AK5&"_"&E5&BW5&"_"&D5
      & IF(I5="Băng tải.","_BK", IF(J5="SPNT.via","_ SPNT",""))
      & IF(J5="SPNT.via","", IF(AI5=2.25,"_2,25", IF(LEFT(K5,5)="dthai","_dthai","")))
```

Ba điểm mới rút ra:

1. **Mã hoá "Mức tải" (cột Z):** `Đủ tải` = **0** (→ hệ số 1); `Roda` =
   chuỗi `"roda"` (→ 2/3); `Khác` = **nhập thẳng số** (→ dùng chính số đó).
2. **Roda chỉ nhân vào giá trị TRA TỪ DANH MỤC.** Nếu `Mô hình (tạm tính)`
   ≠ 0 thì dùng thẳng, **không nhân Roda** — docx không nói rõ chỗ này.
3. **Tỷ trọng tra theo `Chủng loại hàng × Khu vực xúc`** (cột `CS.TyTrong`
   / `KC.TyTrong` trong sheet `Mohinh_TheTrong`), không phải chỉ theo Chủng
   loại hàng như docx mô tả. Cũng KHÔNG thấy tra theo **khoảng thời gian** ở
   sheet này — mâu thuẫn với danh mục "Tỷ trọng" có `dd/mm/yy – dd/mm/yy`
   mà docx mô tả. **Cần làm rõ** danh mục nào là thật.

### 3.7. HS điều chỉnh NLĐM — "Chất lượng" chính là hạng xe

```excel
DP5 = DQ5 & "_" & LEFT(DB5,1)      ' Chủng loại xe _ ký tự đầu của HẠNG XE
EA5 = DP5 & "_" & AD5              ' … _ Phân loại
EC5 = INDEX($FX$5:$FY$50, MATCH(EA5,$FW$5:$FW$50,0), MATCH(D5,$FX$4:$FY$4,0))
```

Khoá tra = `ChủngLoạiXe_HạngXe_PhânLoại`, chọn cột theo **Khu vực xúc**
(CS/KC). Vậy "Chất lượng" trong docx = **hạng xe** (A/B/C1/khác), lấy 1 ký
tự đầu. Docx cũng bỏ sót chiều Khu vực xúc.

### 3.8. Xác nhận: trường "(Báo chuyến)" do phòng Thống kê nhập

Toàn bộ nhóm trường tôi nghi ngờ ở `REQUIREMENT_SANLUONG.md` mục 3 đều nằm
trong sheet `'Cap nhat Slg ThanV+Dat B1'` — sheet **đầu vào của phòng Thống
kê**, tách hẳn khỏi sheet nhập liệu của đơn vị:

| Cột `tinh toan` | ← CnSl | Trường |
|---|---|---|
| Y | Q | Khối lượng qua cân (tấn) |
| Z | R | Tải trọng |
| AA | S | Mô hình (tạm tính) |
| AB | T | Tỷ trọng (cập nhật) |
| AH | U | Trừ vơi |
| AE | V | Xe bổ túc |
| X | AC | Ngày mưa |
| AF | AM | HS chênh lệch CTNB |

→ Trả lời điểm chặn #15: **đúng**, "nhập liệu bổ sung một số trường thông
tin" ở Đối soát lần 2 là nhóm trường này. Nó **tách bạch** với việc "yêu cầu
chỉnh sửa dữ liệu lệch" — hai việc riêng, đúng như chữ *"ngoài ra"* trong
docx.

---

## 4. Điểm còn lại phải hỏi chủ dự án

> ✅ **ĐÃ CHỐT 2026-08-30** — xem [`DECISIONS.md`](DECISIONS.md):
> - ~~Thứ tự phép toán `Trừ vơi`~~ → **QĐ-02**: theo Excel,
>   `Mô hình × Số chuyến − (Trừ vơi ÷ Tỷ trọng)`.
> - ~~Công tắc `$A$1="TKE"`~~ → **QĐ-03**: thành nút chuyển chế độ trên UI,
>   Nhân viên Thống kê bật/tắt.
> - ~~Tỷ trọng: theo docx hay theo Excel?~~ → **QĐ-04**: theo docx —
>   danh mục khai báo **theo thời gian**, tra theo thời gian khi tính.
> - ~~Kỳ báo cáo 7 ngày có chính thức không?~~ → **QĐ-05**: có, và đưa vào
>   **Danh mục kỳ báo cáo**.
> - ~~Khoá ghép chuỗi quá mong manh~~ → **QĐ-06**: dựng thành Danh mục để
>   người dùng **chọn**, không nhập tay.

Còn lại:

1. **Ngoại lệ `+15` cho `CS / u8. / 12. / tầng 160`** trong Nhóm tầng nhận
   tải còn hiệu lực không? Xem 3.3.
2. **Các trường "trừ bùn"** (Tổng m3/tấn/Tkm trừ bùn, Tổng bùn, Thể trọng
   bùn) — chưa tìm thấy công thức trong sheet `tinh toan`; nằm ở sheet khác
   (`tổng bùn`, `p-a bùn cn`, `BÙN SX`) hay chưa dùng?
3. Sheet `tinh toan` có **hai vùng công thức khác nhau** (vùng dòng 1–3 và
   vùng dòng 5 trở đi), nhiều ô lệch nhau — ví dụ `AN3` là bản HS Than cũ
   thiếu nhánh `CS/SPNT.Baichua`. Vùng nào là bản chuẩn? (Tôi lấy dòng 5.)
> Ba điểm cần lưu ý kèm QĐ-03/04/05 cũng **đã chốt 2026-08-30**:
> - ~~Tháng 2 có 4 hay 5 kỳ?~~ → kỳ khai trong danh mục theo khoảng thời
>   gian, gán theo ngày rơi vào khoảng nào. Số kỳ do người dùng khai. QĐ-05.
> - ~~"Thời gian tính toán" là ngày nào?~~ → **ngày/ca sản xuất của bản
>   ghi**, không phải ngày chạy báo cáo. QĐ-04.
> - ~~Đổi chế độ TKE trên kỳ đã chốt?~~ → **cho đổi, bắt mở khoá + ghi
>   vết**. QĐ-03.

---

## 5. Khuyến nghị kỹ thuật rút ra từ bảng tính thật

1. **Khoá tra cứu bằng nối chuỗi (`CR`, `EA`, `DP`, `DE`, `CO`…) là điểm
   yếu chí mạng.** Cả hệ thống phụ thuộc việc ghép chuỗi rồi `MATCH` khớp
   tuyệt đối — sai một dấu chấm, một dấu cách là tra trượt, và Excel trả
   `#N/A` chứ không cảnh báo sai nghiệp vụ. Đáng chú ý: trong `CR5` có
   `"_ SPNT"` (**có dấu cách**) trong khi ô cùng loại ở vùng khác ghi
   `"_SPNT"` — **đây có thể đã là một lỗi tra trượt đang tồn tại thật**.
   Khi làm phần mềm: dùng **khoá ngoại có cấu trúc**, chỉ sinh chuỗi khi
   hiển thị/xuất Excel.
2. **Tham số nằm rải rác trong ô đơn lẻ** (`$AM$3`, `$BN$2`, `$B$3`,
   `$D$3`, `$F$3`) — không ai biết ô nào là gì nếu không đọc công thức. Phải
   chuyển thành **bảng tham số có tên, có mô tả, có hiệu lực theo thời
   gian**.
3. **Danh sách chủng loại xe hard-code lặp ở 4 công thức khác nhau**
   (`BE`, `BK`, `BM`, `BN`, `CZ`, `DE`). Thêm một loại xe mới hôm nay =
   phải sửa 6 chỗ và rất dễ sót. Phải chuyển thành **thuộc tính trên danh
   mục xe**.
4. **Ô nhập tay xen giữa ô công thức** (`BO` — BSNL SPNT,CN) rất dễ bị ghi
   đè hoặc bỏ sót. Trong hệ mới phải là **trường dữ liệu tường minh**, có
   kiểm soát ai được nhập.

---

## 6. Ba câu hỏi còn lại — mô tả chi tiết

Chủ dự án yêu cầu mô tả rõ (2026-08-30). Mỗi câu gồm: thấy gì → vì sao
thành vấn đề → cần trả lời điều gì.

### 6.1. ⏸ TẠM GÁC (TG-01) — ngoại lệ `+15` và HAI định nghĩa "Nhóm tầng nhận tải"

> **Chủ dự án yêu cầu tạm bỏ qua (2026-08-30), sẽ trả lời khi có thêm thông
> tin.** Đã ghi đầy đủ vào [`DECISIONS.md`](DECISIONS.md) mục **TG-01** kèm
> hướng xử lý tạm: code theo bản chuẩn dòng 5, KHÔNG cài ngoại lệ `+15`.

**Thấy gì.** Quét toàn bộ cột `AK` (Nhóm tầng nhận tải) của sheet
`tinh toan`, các dòng đầu ra **bốn công thức khác nhau**:

```excel
' (a) Dòng 5, 6 — bản "sạch", khớp đúng đặc tả docx
AK5 = IF(D5="KC", (IF(F5<-195,-200, IF(F5<0,-1+TRUNC((F5+1)/15,0),TRUNC(F5/15,0))*15)),
                  (IF(F5<0,-1+TRUNC((F5+1)/15,0),TRUNC(F5/15,0))*15))

' (b) Dòng 1 — y hệt (a), CỘNG THÊM một ngoại lệ
AK1 = …(giống a)… + IF(AND(D1="CS", E1="u8.", G1="12.", F1=160), 15, 0)

' (c) Dòng 2 — CHỈ CÒN số hạng ngoại lệ, và trỏ sang dòng 626
AK2 = +IF(AND(D626="CS", E626="u8.", G626="12.", F626=160), 15, 0)

' (d) Dòng 3 — quy tắc KHÁC HẲN cho nhánh không phải KC
AK3 = IF(D3="KC", (+IF(F3<0,-1+TRUNC((F3+1)/15,0),TRUNC(F3/15,0))*15),
                  (+IF(F3<5, TRUNC((F3-4)/15,0), TRUNC((F3+10)/15,0))*15 - 10))
```

**Vì sao thành vấn đề.** Hai chuyện riêng biệt:

1. **Ngoại lệ `+15`** áp cho đúng một tổ hợp: Khu vực xúc `CS`, máy xúc
   `u8.`, nơi nhận tải `12.`, tầng `160` → cộng thêm 15 vào nhóm tầng. Nó
   chỉ xuất hiện ở dòng 1–2, không có ở dòng 5–6.
2. **Bản (d) là một quy tắc chia nhóm tầng HOÀN TOÀN KHÁC** cho khu vực
   không phải KC: mốc cắt ở `5` thay vì `0`, và kết quả **trừ đi 10**
   (`…*15-10`) — tức các nhóm tầng lệch 10 mét so với bản (a). Bản (d) cũng
   xuất hiện ở sheet `'Cap nhat Slg ThanV+Dat B1'` ô `AP1`, nên không phải
   gõ nhầm một lần.

Nhóm tầng sai → khoá `Nhóm vỉa + Máy xúc` sai → tra sai bảng STD/AP Tdia →
**sai thể trọng và sai sản lượng**. Đây không phải chi tiết nhỏ.

**Cần bạn trả lời:**
- (a) hay (d) là quy tắc đúng cho khu vực **không phải Khe Chàm**? Hay mỗi
  bản áp cho một trường hợp khác nhau (nếu vậy: trường hợp nào)?
- Ngoại lệ `+15` cho tổ hợp `CS / u8. / 12. / tầng 160` **còn hiệu lực
  không**? Nếu còn: nó là quy tắc vĩnh viễn hay chỉ đúng cho một kỳ? Và có
  còn ngoại lệ tương tự nào khác mà bảng tính chưa thể hiện?

### 6.2. Nhóm trường "trừ bùn" — có trong đặc tả nhưng không có công thức

**Thấy gì.** Tài liệu docx liệt kê 5 trường này **liền nhau, không kèm công
thức nào** (`REQUIREMENT_SANLUONG.md` mục 5.26):

- Thể trọng bùn
- Tổng m3 (trừ bùn)
- Tổng tấn (trừ bùn)
- Tổng Tkm (trừ bùn) — *bản gốc ghi lặp hai lần liên tiếp*
- Tổng bùn (tấn)

Trong sheet `tinh toan` dòng 5, thứ duy nhất liên quan tới bùn là:

```excel
' Khoản bổ sung nhiên liệu cho xe chở bùn
BN5 = IF(DQ5="HM400-2R",0, IF(OR(LEFT(K5,6)="B.Duot",LEFT(K5,7)="B.Loang",
        LEFT(K5,6)="DBChan",LEFT(K5,6)="B.Chan"), $BN$2, 0))*BG5
    + IF(DQ5="HM400-2R",0, IF(OR(LEFT(K5,6)="B.Tron",LEFT(K5,6)="DBTron"), $BN$2, 0))*BG5

' Nhánh bùn trong công thức khối lượng — hằng số 1.635 cho khu vực KC
… IF(AND(LEFT(K,1)="B", LEFT(J,1)="d"), AW*IF(D="CS",CF,1.635) + AY*CF, …)

' Ký hiệu bùn dùng để ghép khoá
BW5 = IF(OR(LEFT(K5,6)="B.Loan",…),"_Bun", IF(LEFT(K5,6)="BunDac","_BĐ", …))
```

Tức có xử lý bùn **rải rác trong các công thức khác**, nhưng **không có cột
nào tên "Tổng m3 trừ bùn" / "Tổng bùn"**.

Workbook có 4 sheet mang tên bùn: `tổng bùn`, `Bùn trộn`, `BÙN SX`,
`p-a bùn cn`. Tôi thử đọc sheet `tổng bùn` thì **trả về rỗng** (không có
dòng dữ liệu nào) — nên chưa xác định được nó có chứa nhóm công thức này
không.

**Cần bạn trả lời:**
- Nhóm 5 trường "trừ bùn" này **có dùng thật không**, hay là phần cũ/dự
  kiến mà chưa triển khai?
- Nếu có dùng: công thức nằm ở sheet nào, hay lấy ở đâu ra?
- "Trừ bùn" nghĩa là **loại khối lượng bùn ra khỏi tổng sản lượng** (để báo
  cáo phần không-bùn), đúng không? Nếu vậy báo cáo cần cả hai con số (có bùn
  / trừ bùn) hay chỉ một?

### 6.3. ✅ ĐÃ GIẢI — dòng chuẩn là DÒNG 5 (dòng master của shared formula)

**Kết luận cuối cùng (2026-08-30, sau khi quét TOÀN BỘ 55.161 dòng):**

**Dòng 5 là dòng chuẩn** — và lý do mạnh hơn "nhiều công thức nhất": nó là
**dòng MASTER do chính Excel chỉ định**. Các ô của nó khai báo *shared
formula* kèm phạm vi áp dụng:

```xml
<c r="AL5"><f t="shared" ref="AL5:AL68" si="2">IF(Y5>0,Y5/AI5,ROUND(…))</f><v>207</v></c>
<c r="AL11"><f t="shared" si="2"/><v>207</v></c>
```

Dòng 5 **chứa văn bản công thức gốc**; dòng 11 (và các dòng khác) chỉ trỏ
ngược về `si="2"`. Muốn đọc công thức thì bắt buộc phải đọc dòng master.

Thống kê toàn sheet (55.161 dòng):

| Số công thức/dòng | Số dòng | Ghi chú |
|---|---|---|
| 0 | 15 | gồm **dòng 4 = hàng tiêu đề** (207 ô — nhiều ô nhất sheet) |
| **139** | **28** | **dòng 5 → ~31** — nhiều nhất; dòng 5 là master |
| 134 | 25.426 | dòng dữ liệu |
| 133 | 29.684 | dòng dữ liệu |
| 132 / 50 / 38 / 16 / 2 | 8 | lác đác |

Dòng nhiều ô nhất trong nhóm có công thức là **dòng 11** (205 ô, 139 công
thức) — nhưng toàn bộ công thức của nó là tham chiếu `t="shared"` về dòng 5,
nên **không cho thêm thông tin gì**. Lấy dòng 5 vẫn là đúng.

> 🚨 **Đính chính lần hai (cùng ngày).** Trước đó tôi viết rằng "đa số dòng
> chỉ còn 51 cột công thức, phần còn lại đã bị dán cứng thành giá trị". **Sai.**
> Nguyên nhân: biểu thức tìm công thức của tôi là `<f…>…</f>` nên **bỏ sót
> shared formula dạng thẻ tự đóng** `<f t="shared" si="…"/>`. Đã kiểm chứng
> trực tiếp trên XML thô: `AL1250` là `<f t="shared" si="1552"/><v>37</v>` —
> **có công thức**, 37 chỉ là giá trị đã tính sẵn.
>
> Sự thật: **không có chuyện dán cứng giá trị. Mọi dòng dữ liệu đều có
> đủ công thức (133–139), sheet nhất quán.**

Vài điểm phụ vẫn đúng và vẫn đáng lưu ý:

- **Dòng 1–3 là vùng nháp** (rất ít ô: dòng 1 chỉ vài ô). Ngoại lệ `+15` và
  biến thể công thức nhóm tầng ở mục 6.1 **chỉ nằm trong vùng này** — đã
  kiểm lại bằng công cụ đã sửa, chúng có thật.
- **Công thức dựng khoá `CR` có hai phiên bản thật:** `CR2` dùng `"_SPNT"`
  (không dấu cách), `CR5`/`CR6` dùng `"_ SPNT"` (**có dấu cách**); `CR3` còn
  có thêm nhánh `_2,268`. Đã xác nhận lại bằng công cụ đã sửa. Vì khoá khớp
  tuyệt đối nên hai chuỗi này là hai khoá khác nhau. Tuy nhiên `CR2`/`CR3`
  nằm trong vùng nháp, nên nhiều khả năng bản đúng là `CR5`.

**Không còn câu hỏi nào cho chủ dự án ở mục này.**

<details>
<summary>Bản mô tả câu hỏi cũ (đã lỗi thời) — giữ lại để hiểu vì sao từng nghi ngờ</summary>

Trước khi sửa lỗi công cụ, tôi đọc ra rằng cột `P`, `AL`, `BB`, `CR`… chứa
những thứ khác nhau ở dòng 5, 6, 7, 9 — và kết luận sheet không nhất quán.
Toàn bộ chênh lệch đó là do công cụ gán nhầm công thức của ô sau cho ô
trước. Layout thật sự đồng nhất.

</details>



**Thấy gì.** Đây là phát hiện nghiêm trọng nhất trong ba câu. Quét cùng một
cột qua nhiều dòng liên tiếp cho thấy **cùng một cột chứa thứ khác nhau tuỳ
dòng**:

| Cột | Dòng 5 | Dòng 6 | Dòng 7, 8, 10 | Dòng 9 |
|---|---|---|---|---|
| `P` | Chênh cao thanh toán nhiên liệu | Chênh cao (giống dòng 5) | **Số xe** | Số xe |
| `Q` | Số xe | Số xe | *(không có)* | Số xe |
| `AL` | **Tổng m3** | **Tổng KLVC (tấn)** ⚠ | **Cung độ cận dưới** | Cung độ cận dưới |
| `AM` | Tổng KLVC (tấn) | *(không có)* | *(không có)* | *(không có)* |
| `AN` | Tổng Tkm | Cung độ cận dưới | *(không có)* | *(không có)* |
| `BB` | ĐMNL công ty | ĐMNL công ty | **TTL CLH** | **BSNL – khác** |
| `BP` | ĐMNL xe (QD 1828) | ĐMNL xe (QD 1828) | *(không có)* | **TTL CLH** |
| `CR` | Khoá "Nhóm vỉa + Máy xúc" | Khoá (giống dòng 5) | **INDEX($FT$5:$FT$15,…)** — việc khác hẳn | INDEX($FT$5:$FT$15,…) |

Đáng chú ý thêm:

- **Dòng 6 có tham chiếu vòng (circular reference) thật:**
  `AL6 = (AL6*AI6 − FK6 − …)` — ô tự tham chiếu chính nó. Excel chỉ tính
  được nếu bật chế độ lặp; không thì trả 0 hoặc báo lỗi.
- **Công thức dựng khoá `CR` có ít nhất ba phiên bản khác nhau** trong cùng
  một sheet:
  - `CR2`: `…"_SPNT"…` (**không** dấu cách)
  - `CR3`: có thêm nhánh `IF(AI3=2.268,"_2,268","")` mà các dòng khác không có
  - `CR5`, `CR6`: `…"_ SPNT"…` (**có** dấu cách)

  Vì khoá này khớp tuyệt đối khi tra bảng STD/AP Tdia, `"_SPNT"` và
  `"_ SPNT"` là **hai khoá khác nhau** — một trong hai chắc chắn tra trượt.

**Vì sao thành vấn đề.** Tôi đã lấy **dòng 5** làm chuẩn vì nó đầy đủ nhất
(~140 cột có công thức, chuỗi tính khép kín). Nhưng dòng 5–6 là **thiểu số**:
từ dòng 7 trở đi (và sheet này có tới hàng trăm nghìn dòng — file XML nội
bộ nặng 783 MB) layout lại khác. Nếu phần đông dữ liệu thật chạy theo layout
dòng 7+, thì bản đặc tả tôi rút ra đang mô tả **một biến thể không đại diện**.

**Cần bạn trả lời:**
- Dòng nào của sheet `tinh toan` là **bản chuẩn đang dùng để ra số thật**?
  Dòng 5–6, hay dòng 7 trở đi?
- Nếu là dòng 7+: các cột Chênh cao / Tổng m3 / Tổng KLVC / Tổng Tkm nằm ở
  đâu trong layout đó? (ở dòng 7 tôi không tìm thấy chúng)
- Các dòng đầu (1–4) có phải **vùng nháp** không? Nếu phải thì bỏ qua được,
  nhưng ngoại lệ `+15` ở mục 6.1 lại chỉ nằm trong vùng đó — nên cần biết
  vùng nháp có còn giá trị tham chiếu hay không.
- Bản nào của công thức khoá `CR` là đúng — có dấu cách hay không, và có
  nhánh `_2,268` hay không?

**Gợi ý cách trả lời nhanh nhất:** nếu bạn chỉ cho tôi **một dòng cụ thể mà
bạn biết chắc số nó ra là đúng** (ví dụ "dòng 1250 của sheet tinh toan là số
thật của ca 1 ngày 5/5"), tôi sẽ lấy dòng đó làm chuẩn và đối chiếu lại toàn
bộ bản đồ cột — chính xác hơn nhiều so với việc bạn phải giải thích từng cột.
