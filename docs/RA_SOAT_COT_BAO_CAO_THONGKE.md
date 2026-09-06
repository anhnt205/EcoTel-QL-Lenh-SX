# Rà soát: bảng Báo cáo thống kê đã đủ thông tin để tính chưa?

> Lập 2026-09-07 theo yêu cầu chủ dự án ("check các cột trong bảng báo cáo
> thống kê … xem đã đủ thông tin tính toán chưa"). **Chưa code gì.**
>
> Nguồn đối chiếu, theo thứ tự tin cậy:
> 1. `docs/_source/excel-tinhtoan-row5-formulas.txt` — công thức THẬT dòng 5.
> 2. `docs/_source/excel-tinhtoan-header-row4.txt` — 206 tên cột chính thức.
> 3. Code thật đang chạy (`service/production/*`, các entity, màn báo cáo).
> 4. Đặc tả chủ dự án gửi 2026-09-07.

## 0. Trả lời ngắn

**Chưa đủ.** Cụ thể:

| | Số lượng |
|---|---|
| Cột trong Excel gốc (`tinh toan`, A..GY) | **206** |
| Cột báo cáo đang hiển thị trên phần mềm | **40** |
| Cột đang được LƯU (`production_results`) | **35** |
| Cột đặc tả của chủ dự án mô tả | ~**75** (A..CK + vài cột CP/CQ/CR/DA/DB/DE) |

Ba loại thiếu, xếp theo mức độ chặn:

1. **5 mâu thuẫn về quy ước khoá tra bảng** — nếu không chốt thì tra sai
   danh mục, ra sai số. Nghiêm trọng nhất, xem mục 4.
2. **4 trường dữ liệu đầu vào chưa nhập được** ở màn báo chuyến — không có
   thì công thức đứng luôn. Xem mục 2.
3. **~30 cột tính được nhưng đang bị vứt đi** (tính xong không lưu) hoặc
   chưa tính. Xem mục 3.

---

## 1. Phần ĐÃ đủ và đã chạy đúng

Engine hiện có (`TripBaseCalculator`, `FuelCalculator`, `CargoCoding`,
`SeamGroupExcavatorKeys`, `FuelNormInterpolator`,
`ProductionCalculationService`) đã phủ được các cột sau, và tôi đã đối
chiếu từng cái với công thức Excel gốc — **khớp**:

| Cột Excel | Tên | Trạng thái |
|---|---|---|
| P | Chênh cao thanh toán nhiên liệu | Công thức khớp `P5`; tính trong bộ nhớ (dùng để nội suy) nhưng **không lưu** |
| AD | Phân loại (Đất/Than) | `ProductionKeys.classify` — khớp `AD5` |
| AG | SP nghiệm thu | Khớp `AG5`, kể cả nhánh `CS + DaXit.NK → Dat_SX` |
| AI | Tỷ trọng (tấn/m3) | Khớp `AI5` (ưu tiên tạm tính, sau đó tra danh mục) |
| AJ | Mô hình (m3/ch) | Khớp `AJ5` gồm cả nhân Roda 2/3 và làm tròn 3 |
| AK | Nhóm tầng nhận tải | Khớp `AK5` (xem cảnh báo ở mục 4.5) |
| AL, AM, AN | Tổng m3 / KLVC (tấn) / Tkm | Khớp `AL5`, `AM5`, `AN5` |
| AC | Thể trọng (TĐ) | Khớp `AC5` — tra STD(Dat+ThanSX) / STD(DatCN) |
| S, T, U | HSTĐ m3 / tấn / tkm | Khớp `S5..U5` — tra Áp Trắc Địa theo (Nhóm vỉa+M.xúc, SPNT), chế độ TKE = 1 |
| BT, BU, BV | Mã hóa hàng / Mã hàng TTL / Vỉa KPMB | Khớp `BT5`, `BU5`, `BV5` |
| BW | Ký hiệu bùn | Khớp `BW5` (gắn trong khoá, xem 3.2) |
| CR | Nhóm vỉa + Máy xúc | Khớp `CR5` gồm cả hậu tố `_BK` / `_SPNT` / `_2,25` / `_dthai` |
| CC, CD, CE, CF, CG | Tỷ trọng koQA, KLVC koQA, Tkm koQA, Tỷ trọng ban đầu, m3 ban đầu | Khớp `CC5`..`CG5` |
| AZ→BQ | Toàn bộ chuỗi nhiên liệu (nội suy → mùa → hạng xe → cải tạo ben → HS than CN-NK → 8 khoản BSNL → QĐ 1828 → hiện hành) | Công thức khớp; nhưng chỉ lưu 4 mốc, xem 3.1 |
| BR | Định mức năng suất xe tải | Khớp `BR5` (chặn cung độ > 8, làm tròn 1) |
| DS, DT, DU, DW, DX, DY, DZ | Khối trắc địa + hệ số trắc địa | Đã có |

Danh mục đầu vào đã có đủ và đúng cấu trúc: Khu vực xúc, Nơi nhận tải
(có FK Nhóm vỉa), Nơi dỡ tải, Nơi chất tải, Chủng loại hàng (có FK Nhóm
CLH / SPNT / TTL CLH), Nhóm CLH, SPNT, TTL CLH, Nhóm vỉa, Tỷ trọng (có
khoảng thời gian + khu vực), STD (Đất CN) và STD (Đất SX/Than SX), Hệ số,
Kỳ báo cáo, Mô hình, DMNL, Năng suất xe, HS điều chỉnh NLĐM.

---

## 2. THIẾU dữ liệu đầu vào — chặn cứng

### 2.1 Bốn trường không nhập được ở màn báo chuyến

| Trường | Backend | Màn nhập liệu | Hệ quả nếu thiếu |
|---|---|---|---|
| **Hệ số chênh lệch _CTNB** | ĐÃ có cột `transport_report_trips.ctnb_deviation_coefficient` | **KHÔNG có ô nhập** (grep toàn frontend: 0 kết quả "CTNB") | Cột AF "HS áp cho than CTNB" luôn = 1 |
| **Đá thải (tấn) — giá trị tự nhập** | ĐÃ có cột `waste_rock_ton` | **KHÔNG có ô nhập** | FK/FJ (tấn/m3 đá thải) = 0 → AM (Tổng KLVC tấn) sai với than vỉa |
| **Hệ số chất tải bùn (Trắc địa)** (cột V) | Không có cột | Không có | Excel gốc cũng **không có công thức** cột này → cần chốt: nhập tay ở đâu, hay bỏ |
| **Tầng dỡ tải kiểu số** | `unloading_floor` đang là **String** | Ô nhập text | "Nâng tải toàn tuyến = Tầng nhận tải − Tầng dỡ tải" không tính được nếu không ép kiểu số |

### 2.2 Ba hằng số nghiệp vụ chưa có chỗ khai báo

Excel lấy từ ô cố định trong sheet; phần mềm chưa có:

| Hằng số | Excel | Hiện trạng |
|---|---|---|
| Tỷ lệ đá thải theo khu vực/nơi dỡ (`$D$3`, `$F$3`, `$B$3` trong `FK5`) | 3 giá trị | Chưa có ở danh mục Hệ số |
| Hệ số quy đổi m3 đá thải: **2,625** (KC) và **2,617** (CS) | `FJ5` | **Không tồn tại ở bất kỳ đâu trong code/SQL** |
| Hệ số Than tke trừ đá (`$AM$3`) | `AM5` | Có mã `HS.THAN.TRUDA` = 0,985 ✅ |
| Hệ số bùn | `BN` | Code đọc mã `HS.BUN` nhưng **chưa seed** → hiện trả 0 kèm cảnh báo |

### 2.3 Danh mục xe: 3 thuộc tính chưa nối vào danh mục chuẩn

Engine đang đọc từ `devices` dưới dạng **chuỗi tự do**, không phải khoá ngoại:

| Cần | Đang là | Vấn đề |
|---|---|---|
| Chủng loại xe | `Device.category → DeviceType.name` (text) | Danh mục `vehicle_types` **có nhưng không được tham chiếu** |
| Hạng xe (A/B/C1) | `Device.vehicle_class` (text) | Danh mục `vehicle_ranks` **có nhưng không được tham chiếu** |
| Chủng loại xe (NL) — cột DQ | *(không có)* | Cột DE (LoaiXe_DMNL) trong Excel dựng trên DQ, phần mềm đang dùng nhầm `fuelClass.code` |
| Cải tạo toa | `Device.car_renovation` = `"CaiToa"` | OK nhưng là text so sánh cứng |

**Dữ liệu thực tế đang gần như trống**: `vehicle_types` 0 dòng,
`classifications` 0 dòng, `vehicle_ranks` 1 dòng, `vehicle_fuel_classes`
1 dòng, `vehicle_category_classes` 1 dòng, `model_periods` 0 dòng,
`coefficient_items` 1 dòng. Có công thức đúng cũng chưa ra số đúng.

### 2.4 Báo chuyến Khai thác không vào engine

Engine chỉ đọc `TransportReportTrip`. Toàn bộ `ExcavationReport(Trip)`
(Máy xúc, Tầng xúc, Nơi chất tải…) **không được dùng để tính** — trong khi
cột E (Máy xúc) là thành phần bắt buộc của khoá `CR` (Nhóm vỉa+M.xúc).
Hiện Máy xúc lấy từ phía Vận tải (`excavator_device_id` trên trip vận
tải). Cần chốt: đối soát Khai thác ↔ Vận tải cho ra dòng tính, hay chỉ
dùng số Vận tải.

---

## 3. Tính được nhưng đang mất — chỉ cần lưu và hiện thêm

### 3.1 Chuỗi nhiên liệu: tính 18 cột, chỉ lưu 4

`FuelResult` tính đủ nhưng `production_results` chỉ lưu `fuel_norm` (BF),
`fuel_base_consumption` (BG), `fuel_total_before_adjustment` (BP),
`fuel_current_norm` (BQ), `productivity_norm` (BR).

**Mất trắng** (muốn hiện lên báo cáo phải thêm cột DB):
AP, AQ, AR, AS (Hb/Ha/h1/h2) · AT, AU, AV, AW, AX, AY (Nb-h1…Na-NL) ·
AZ (Nt) · BA (theo mùa) · BB (ĐMNL cty) · BC (hạng xe) · BD (cải tạo ben) ·
BE (HS Than CN-NK) · BH…BO (8 khoản BSNL) · EC (HSNL đ/c tháng).

### 3.2 Các cột khác đã tính nhưng không lưu

| Cột | Tên | Ghi chú |
|---|---|---|
| P | Chênh cao thanh toán nhiên liệu | tính để nội suy rồi bỏ |
| BW | Ký hiệu bùn | chỉ tồn tại bên trong khoá CR |
| CP, CQ | Nhóm tầng+M.xúc, Nhóm vỉa | thành phần của CR |
| EA | Xe + Hàng | khoá tra HS điều chỉnh, dựng rồi bỏ |
| AO | Tổng km vận chuyển | = Cung độ × Số chuyến, chưa tính |
| BS | Chênh cao NL × m3 | chưa tính (cần P) |
| CH, CI | Tổng KLVC TKE (tấn/tkm) quy ẩm | chưa tính |
| CK | Tổng KLVC TKE (tấn) ban đầu **chưa trừ đá** | chưa tính — **là đầu vào bắt buộc của công thức đá thải FK5** |
| FJ, FK | m3 / tấn đá thải | chưa tính |

### 3.3 Màn báo cáo

Đang hiện 40/206 cột. Bản thân file `ProductionReportPage.tsx` đã ghi chú
sẵn điều này. Cần chốt: hiện đủ 206 cột như Excel, hay chọn bộ cột rút
gọn + xuất Excel đầy đủ.

---

## 4. NĂM MÂU THUẪN cần chủ dự án chốt (quan trọng nhất)

### 4.1 Khoá cột DMNL — code đang SAI so với Excel

Công thức thật `DE5` (cột "LoaiXe_DMNL"):

```
DE5 = IF(AND(DC5="HM400-2R_C", OR(LEFT(K5,7)="B.Loang", K5="B.Duot", K5="DBuot",
                                  K5="B.Duot.CN", K5="Dbuot.CN")),  DQ5 & ".Bun",
      IF(AND(OR(DC5="VolvoA40-GCoi_A", DC5="VolvoA40-F_C", DC5="HM400-2R_C"),
             OR(LEFT(K5,6)="bundac", I5="Cạp đường.", I5="Cạp công nghệ.",
                AG5="Dat_CN", LEFT(I5,3)="Cạp")),                    DQ5 & ".Dat",
      IF(OR(I5="Băng tải.", K5="SPNT.via", K5="SPNT_uot.via"),        DQ5 & ".BK",
                                                                      DQ5 & "." & AD5)))
```

→ Hậu tố thật là **`.Bun` / `.Dat` / `.BK` / `.DAT` / `.Than`** (theo quy
tắc), dựng trên **DQ = "Chủng loại xe (NL)"**. **Khớp đúng đặc tả chủ dự
án gửi hôm nay**, và khớp ảnh chụp Excel chủ dự án từng gửi
(`HD785-7.BK_0,05`).

**Code hiện tại** (`ProductionKeys.vehicleFuelClassKey`) lại sinh
`<mã>.CS` / `<mã>.KC` theo Khu vực xúc, rồi `FuelNormInterpolator` ghép
`_<cung độ>`. Toàn bộ UI Định mức nhiên liệu tôi dựng cũng theo `.CS/.KC`.

**Bằng chứng sống** — cùng MỘT dòng dữ liệu thật (dòng 1250,
`docs/_source/excel-tinhtoan-row1250.txt`):

```
DQ1250 : CAT777E           ← Chủng loại xe (NL), không hậu tố
DA1250 : CAT777E.CS        ← Chủng loại xe + hậu tố KHU VỰC  → tra Mô hình
DE1250 : CAT777E.BK        ← LoaiXe_DMNL                     → tra DMNL
CZ1250 : CAT777E.CS.BK     ← Xe + Hàng vận chuyển (họ khoá thứ BA)
AD1250 : DAT               ← Phân loại
```

Ba chuỗi khác nhau trên cùng một dòng. Chỉ `DE` mới dùng để tra DMNL.

> **Kết luận: DMNL đang tra sai cột.** Cần đổi sang khoá quy tắc.
>
> **Nguồn gốc sai sót** đã truy được: `docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md`
> dòng 375 đặt tiêu đề *"Khoá cột lưới Mô hình **/ DMNL** có HẬU TỐ KHU
> VỰC"* nhưng bên dưới **chỉ trích công thức của Mô hình** (`DA5`, `AJ5`).
> Ai đọc câu tiêu đề đó rồi code sẽ áp `.CS/.KC` cho cả DMNL — đúng lỗi
> đang có. Ghi chú trong `fuelNormKeys.ts` và `.factory/context.md` nói
> ".BK/.DAT/.THAN/.SP chỉ là ví dụ minh hoạ trong mockup, thật chỉ có
> .CS/.KC" — **kết luận đó SAI**, cần sửa cả 3 chỗ tài liệu.

### 4.2 `.CS` / `.KC` thật ra thuộc về Mô hình, không phải DMNL

```
DA5 = INDEX(DSXE, MATCH(Q5 /*Số xe*/, SoXe,0), MATCH(DA$4, SoXeDong,0))
      & IF(D5="CS", ".CS", ".KC")
AJ5 /*Mô hình*/ = … INDEX(Mohinh_TheTrong!…, MATCH(K5 /*CLH*/, …), MATCH($DA5, …)) …
```

→ **Mô hình tra theo `Chủng loại hàng` × `<chủng loại xe>.CS|.KC`** —
tức UI Mô hình tôi vừa dựng **đúng**. `.CS`/`.KC` là **Cao Sơn / Khe
Chàm** (xem 4.5), không phải "Cao Sơn / ngoài khu vực" như nhãn tôi đang
hiển thị.

### 4.3 Năng suất xe (996) — vừa làm sai hôm nay

```
BR5 = … INDEX(NS.XE, MATCH(IF(L5>8,8,ROUND(L5,1)), NS.CDXE, 0),
                     MATCH(LEFT($DA5, LEN($DA5)-3) & "." & AD5, NS.CLXE, 0))
```

→ Cột = **`<chủng loại xe>` + "." + `<Phân loại DAT|Than>`**, vd
`CAT777E.DAT`. File seed gốc cũng ghi đúng vậy, backend
(`ProductionKeys.vehicleCategoryKey`) cũng đang làm đúng vậy, và **đặc tả
chủ dự án gửi hôm nay cũng ghi "Chủng loại xe + Phân loại"**.

Nhưng hôm nay khi tôi hỏi, chủ dự án chọn **"Chủng loại hàng + Phân loại
(đúng chữ trên mockup)"**, nên modal tôi dựng đang cho chọn *Chủng loại
hàng* + danh mục *Phân loại* mới, kèm hậu tố `.CS/.KC`.

> **Modal "Thêm mới năng suất xe" hiện KHÔNG khớp backend lẫn Excel.**
> Nhiều khả năng chữ "Chủng loại hàng" trên mockup là lỗi soạn mockup.
> Cần chốt lại; nếu đúng như Excel thì sửa modal về *Chủng loại xe* +
> *DAT/Than*.
>
> Đã tra toàn bộ thư mục `docs/`: **không tài liệu nào ghi "Chủng loại
> hàng + Phân loại"** cho bảng này — kể cả bản docx gốc của khách
> (`_source/module-thong-ke-san-luong.txt:435`) cũng ghi "Chủng loại xe +
> Phân loại".
>
> Hai lưu ý khi code lại: (1) khoá dòng **dẫn xuất lúc tính** từ `DA`
> (cắt 3 ký tự hậu tố), KHÔNG đọc từ `Device.categoryClass` — danh mục
> "Chủng loại xe + Phân loại" chỉ dùng làm nhãn dòng; (2) `AD` trả về
> `"DAT"` viết HOA nhưng `"Than"` viết thường — Excel `MATCH` không phân
> biệt hoa thường còn `String.equals` của Java thì có.

### 4.4 HS điều chỉnh NLĐM — cũng lệch

```
EA5 = DP5 & "_" & AD5           (DP5 = DQ5 & "_" & LEFT(DB5,1))
    → <Chủng loại xe (NL)> _ <Hạng xe> _ <DAT|Than>
EC5 = INDEX($FX$5:$FY$50, MATCH(EA5, $FW$5:$FW$50, 0), MATCH(D5, $FX$4:$FY$4, 0))
                                                        └ cột chỉ có KC và CS
```

→ Dòng = `xe_hạng_DAT|Than`; **cột = Khu vực xúc (chỉ 2 giá trị KC/CS)**.
Backend đang làm đúng vậy. Giá trị thật ở dòng 1250: `EA1250 :
CAT777E_C_DAT`. Tài liệu cũng đã kết luận *"'Chất lượng' trong docx =
**hạng xe** (A/B/C1/khác), lấy 1 ký tự đầu; docx bỏ sót chiều Khu vực
xúc"* (`REQUIREMENT_SANLUONG_EXCEL.md:443-451`) — khớp với việc chủ dự án
hôm nay chốt "Chất lượng = danh mục Hạng xe".

Modal tôi vừa dựng: dòng = `xe_hạng_<mã danh mục Phân loại>.<mã khu vực
KVX001…>`, cột = 12 tháng + 1 cột năm. Lệch 3 chỗ:
1. Thành phần 3 phải là **DAT/Than**, không phải danh mục Phân loại mới.
2. Khu vực phải là **CS/KC**, không phải mã `KVX0xx` của danh mục Khu vực xúc.
3. **12 tháng là yêu cầu MỚI** (Excel chỉ có 1 cặp KC/CS cho tháng đang
   xét; vùng FW..GY có ~14 cặp KC/CS trông như các tháng). Nếu chủ dự án
   muốn giữ 12 tháng thì backend `FuelCalculator` (đang tra `cell(grid,
   rowKey, areaCode)`) phải sửa để biết lấy tháng nào.

### 4.5 "KC" nghĩa là gì?

- `ProductionKeys`: `"CS"` → `.CS`, còn lại → `.KC`.
- `ReceivingFloorGroupCalculator`: so tên khu vực với **`"Khe Chàm"`**.
- Excel `AK5`: `IF(D5="KC", …)`.

→ Nhiều khả năng **CS = Cao Sơn, KC = Khe Chàm** (hai khu vực xúc thật),
không phải "ngoài khu vực". Hiện code so *tên* ở chỗ này, so *mã* ở chỗ
kia — dễ lệch. Cần chốt mã chuẩn và dùng thống nhất. UI của tôi đang ghi
".KC (Ngoài khu vực)" — nếu sai thì phải sửa nhãn.

### 4.6 Hai điểm nhỏ hơn trong đặc tả lệch với Excel

| Đặc tả chủ dự án | Excel thật |
|---|---|
| "HSTĐ(m3) = m3 / Tổng m3" | `S5` = **tra bảng Áp Trắc Địa** theo (Nhóm vỉa+M.xúc, `HS_<SPNT>_m3`); nếu workbook ở chế độ TKE thì = 1 |
| "Phân loại (Đất/Than) theo danh mục Chủng loại hàng" | `AD5` = suy từ **chữ cái đầu của SPNT** (S hoặc D → DAT, còn lại → Than) |

Code đang làm theo Excel. Cần xác nhận Excel là đúng.

---

## 5. Chỗ đặc tả để trống — vì Excel cũng trống

Tôi đối chiếu: **những cột đặc tả không ghi công thức chính là những cột
Excel cũng KHÔNG có công thức** ở dòng 5. Không phải chủ dự án quên:

| Cột | Tên | Excel |
|---|---|---|
| V | Hệ số chất tải bùn (Trắc địa) | không công thức → nhập tay |
| BO | BSNL_Spnt__CN (xe) | **ô trống** — code để 0 kèm chú thích "không đoán" |
| BX | Thể trọng bùn | ô trống |
| BY, BZ, CA | Tổng m3 / tấn / Tkm (trừ bùn) | ô trống |
| CB | Tổng_Bùn (tấn) | ô trống |
| CJ | NLĐM (tke)_Ban đầu | ô trống |
| EK…EN | TĐ.Bùn (m3/Tkm), TĐ.Đất trộn P/Án bùn | ô trống |

→ **Cần quyết định: bỏ hẳn khỏi phần mềm, hay là tính năng mới cần công
thức mới?** Nhóm "bùn" (BX..CB, EK..EN) khá lớn và nhất quán — trông như
một mảng nghiệp vụ đang làm dở trong Excel.

Ngoài ra ~60 cột từ CL đến GY đặc tả không nhắc tới (Lễ, Tên nghiệm thu,
BBNT-Mã hóa, các khoá tổ hợp CS..CW, khối thuộc tính xe/máy CX..DR, khối
NLĐM nghiệm thu EB..EJ, các bảng tra nhúng EO..GY). Cần biết cột nào thật
sự cần lên phần mềm.

Tài liệu dự án đã tự đánh dấu đúng nhóm này là **"⛔ Ba chỗ CHẶN vì không
có luật ở bất kỳ nguồn nào"** (`RA_SOAT_CHUAN_HOA_DANH_MUC.md:313-321`):
`BO`, `BX`, và nhóm `BY/BZ/CA/CB`. Vậy đây là câu hỏi **đã treo từ trước**,
không phải phát sinh mới.

---

## 5b. Các việc lớn khác đang treo (ngoài phạm vi cột, nhưng ảnh hưởng số liệu)

| Việc | Trạng thái |
|---|---|
| **G6 — Đối soát 2 cấp (ghép cặp Khai thác ↔ Vận tải)** | Chưa làm. `ReconciliationDecision` hiện gắn 1-1 với MỘT dòng chuyến, **không mô hình hoá được việc ghép cặp** — thiết kế yêu cầu thêm `ReconciliationPair` |
| **G7 — Chốt kỳ + snapshot tham số** | Chưa làm. Engine hiện lấy **mọi** chuyến trong khoảng ngày, không lọc theo trạng thái đã chốt → sửa danh mục hồi tố sẽ đổi số kỳ cũ |
| **TG-01 — ngoại lệ `+15` của Nhóm tầng** | Chủ dự án **tạm gác**, chưa trả lời. Code đang theo bản chuẩn dòng 5, không cài ngoại lệ |
| `ExcavationReportTrip.unloadingPoint` (Vị trí đổ bên Khai thác) | Thiết kế ghi "thiếu thì không đối soát được điểm đổ" — **chưa làm** |
| `unit` (đơn vị chủ quản) trên 2 loại phiếu | Cần cho phân quyền theo đơn vị — **chưa làm** |
| Mẫu báo cáo sản lượng chính thức (G8) | **Chưa có tài liệu** — đây chính là lý do cần bản đặc tả cột này |

---

## 6. Đề xuất thứ tự làm

1. **Chốt 5 mâu thuẫn mục 4** — trước khi code bất cứ thứ gì khác, vì
   sai khoá là sai toàn bộ số nhiên liệu và năng suất.
2. **Sửa lại 3 UI vừa dựng cho khớp** (DMNL, Năng suất xe, HS điều chỉnh)
   + sửa `ProductionKeys` cho DMNL.
3. **Bổ sung 4 ô nhập còn thiếu** ở màn báo chuyến (CTNB, đá thải, hệ số
   chất tải bùn, tầng dỡ tải kiểu số).
4. **Khai báo hằng số còn thiếu** vào danh mục Hệ số (2,625 / 2,617 / 3 tỷ
   lệ đá thải / HS.BUN).
5. **Nối danh mục xe**: Chủng loại xe, Hạng xe, Chủng loại xe (NL) thành
   khoá ngoại thật thay cho chuỗi tự do.
6. **Lưu thêm các cột đang bị vứt** (mục 3) rồi mở rộng màn báo cáo.
7. **Nhập dữ liệu danh mục thật** — hiện gần như trống, không test được.
8. Quyết định số phận nhóm cột "bùn" và ~60 cột chưa nhắc tới.
