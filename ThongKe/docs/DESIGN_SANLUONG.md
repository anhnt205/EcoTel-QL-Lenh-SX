# Thiết kế — Mô hình dữ liệu & Kiến trúc tính sản lượng

Bản thiết kế cho phần **Danh mục & Công thức → Thống kê Sản lượng** của
workflow. Đây là **thiết kế, chưa phải code** — chưa file nguồn nào được sửa.

**Đọc trước:** [`DECISIONS.md`](DECISIONS.md) (QĐ-01…QĐ-07, TG-01) —
mọi lựa chọn ở đây phải tuân theo các quyết định đã chốt.
[`REQUIREMENT_SANLUONG_EXCEL.md`](REQUIREMENT_SANLUONG_EXCEL.md) là nguồn
công thức đúng.

---

## 1. Nguyên tắc thiết kế

Sáu nguyên tắc chi phối toàn bộ thiết kế dưới đây. Chúng không phải sở
thích — mỗi cái đến từ một vấn đề có thật đã quan sát được trong bộ Excel
đang chạy.

| # | Nguyên tắc | Vì sao |
|---|---|---|
| 1 | **Không hard-code giá trị danh mục trong công thức** | Excel đang so tên chuỗi (`Số xe = "965"`, `Nơi nhận tải ∈ {Sàng 1.CS,…}`, danh sách chủng loại xe lặp ở 6 chỗ). Thêm một chiếc xe = sửa 6 chỗ, sót là sai số. → gắn **cờ/thuộc tính lên bản ghi danh mục** |
| 2 | **Tra trượt = lỗi nghiệp vụ, không bao giờ trả 0** | Excel trả `#N/A` im lặng; số vẫn "ra" nhưng sai | 
| 3 | **Tham số tra theo NGÀY SẢN XUẤT của bản ghi** | QĐ-04. Tính lại báo cáo tháng trước phải ra đúng số cũ |
| 4 | **Khoá ghép là khoá ngoại có cấu trúc, chuỗi chỉ để hiển thị** | QĐ-06. Excel có thật hai biến thể `"_SPNT"` và `"_ SPNT"` (khác dấu cách) → một trong hai đang tra trượt |
| 5 | **Số đã chốt phải tái lập được** | Sửa hồi tố danh mục sẽ làm đổi số kỳ đã chốt nếu không chụp lại tham số |
| 6 | **Tính toán là hàm thuần, tách khỏi tầng lưu trữ** | ~25 nhóm công thức phụ thuộc nhau; phải test được từng bước mà không cần DB |

---

## 2. Hiện trạng model — giữ gì, sửa gì

Đã đọc `backend/.../model/`. **Phần khung báo công đã đúng, giữ nguyên.**

### 2.1. Giữ nguyên — đã đúng thiết kế

`ExcavationReport` + `ExcavationReportTrip`, `TransportReport` +
`TransportReportTrip` **đã đúng cấu trúc phiếu-đầu + n-dòng-chuyến** mà tài
liệu yêu cầu, kể cả chỗ tinh tế nhất:

- **Nhiên liệu nằm ở PHIẾU, không ở dòng chuyến** — cả hai entity đều có
  khối `fuelBeginning/fuelReceived/fuelEnding/fuelUsed` + hàm
  `recalculateFuelUsed()` ở cấp phiếu. Đây đúng là điểm tôi lo sẽ bị mô hình
  hoá phẳng và nhân đôi nhiên liệu — hoá ra đã xử lý đúng từ trước.
- **Khoá phiếu phản ánh đúng hai góc nhìn:** phiếu Khai thác khoá theo
  `(ngày, ca, máy xúc, nhân viên)` với xe ở dòng chuyến; phiếu Vận tải khoá
  theo `(ngày, ca, xe, nhân viên)` với máy xúc ở dòng chuyến. Đối xứng đúng.
- `LoadLevel` (@Embeddable, `type` + `customValue`) với `LoadLevelType`
  = `FULL_LOAD / RODA_2_3 / OTHER` — khớp chính xác QĐ về Mức tải.
- `TransportReportTrip.receivingFloorGroup` — Nhóm tầng nhận tải đã có sẵn.
- `CargoType → CargoGroup` đã có quan hệ (docx ghi "Nhóm hàng… cái này chưa
  có" — thực ra **đã có** ở code).

### 2.2. Bổ sung vào entity sẵn có

| Entity | Bổ sung | Lý do |
|---|---|---|
| `ExcavationReportTrip` | `unloadingPoint` (Location) | Docx yêu cầu "Vị trí đổ" bên Khai thác; hiện chỉ Vận tải có. **Thiếu trường này thì không đối soát được điểm đổ** |
| `ExcavationReport` / `TransportReport` | `unit` (Department) — đơn vị chủ quản phiếu | Phân quyền theo đơn vị (QĐ chưa đánh số nhưng tài liệu nêu rõ). Không suy từ `employee.department` — nhân viên có thể đổi phòng, phiếu cũ phải giữ đơn vị lúc lập |
| `Device` | `vehicleClass` (hạng xe A/B/C1/khác), `retrofittedBody` (cải tạo toa), `fuelNormClass` (chủng loại xe dùng tra ĐMNL), `qualityGrade` | Excel lấy các cột này từ named range `DSXE`. Nguyên tắc 1 |
| `Location` | `seamGroup` (nhóm vỉa), `isScreeningPlant` (cờ "là sàng"), `isConveyor` (cờ "băng tải") | Thay cho so tên `∈ {Sàng 1.CS, Sàng 2B.CS, Sàng 3.CS}` và `= "Băng tải."`. Nguyên tắc 1 |
| `CargoType` | `acceptanceProduct` (SPNT), `ttlClh`, `isMud` (cờ bùn), `mudSymbol` (ký hiệu bùn) | Thay cho so `LEFT(K,6)="B.Duot"` v.v. Nguyên tắc 1 |
| `ApprovalStatus` | thêm trạng thái — xem mục 6 | 3 trạng thái hiện tại không đủ cho đối soát 2 cấp + chốt |

### 2.3. Phải thiết kế lại

**`ReconciliationDecision`** hiện là *một quyết định gắn với MỘT dòng
chuyến* (`@OneToOne` tới `transportReportTrip` HOẶC `excavationReportTrip`,
mỗi bên unique). Nó **không mô hình hoá được việc GHÉP CẶP hai bên** — mà
ghép cặp mới là bản chất của đối soát (QĐ-01).

Không xoá entity này (nguyên tắc dự án). Thiết kế mới ở mục 6 thêm entity
`ReconciliationPair` bên cạnh, và `ReconciliationDecision` trở thành bản ghi
quyết định gắn với **cặp**, không phải gắn với dòng chuyến rời.

---

### 2.4. ⚠ Phát hiện khi rà phạm vi QĐ-08 — danh mục Tỷ trọng ĐÃ TỒN TẠI một phần

Trong lúc đếm các trường `Double`, tìm thấy `Material` + `MaterialValueHistory`:

```java
Material                 code, name, acceptedProduct,   // ← Sản phẩm nghiệm thu!
                         List<MaterialValueHistory> valueHistory

MaterialValueHistory     density, dryDensity,           // ← tỷ trọng / tỷ trọng khô
     (@Embeddable)       startTime, endTime             // ← khoảng hiệu lực!
```

Đây **đã gần đúng** danh mục Tỷ trọng theo thời gian mà QĐ-04 yêu cầu. Nhưng
có bốn vấn đề khiến không dùng thẳng được:

1. **`@ElementCollection`, không có id riêng** → không tham chiếu được từ
   `parameterSnapshot`, không audit được, khó đặt ràng buộc chống chồng lấn ở
   tầng DB.
2. **`startTime`/`endTime` mặc định `LocalDateTime.now()`** — `endTime` mặc
   định bằng "bây giờ" nghĩa là bản ghi **hết hiệu lực ngay khi tạo**. Đây là
   bẫy thật sự, không phải chuyện thẩm mỹ.
3. Dùng `LocalDateTime` trong khi đặc tả là `dd/mm/yy – dd/mm/yy` → nên là
   `LocalDate`.
4. **Thiếu chiều Khu vực xúc.** Excel tra tỷ trọng theo *Chủng loại hàng ×
   Khu vực xúc* (`CS.TyTrong` / `KC.TyTrong`). Model hiện chỉ có một chiều.

**⚠ Câu hỏi cần chủ dự án làm rõ:** hệ thống đang có **hai** thực thể trông
như cùng mô tả "chủng loại hàng":

| | `CargoType` | `Material` |
|---|---|---|
| Nghĩa | Chủng loại hàng | Vật tư |
| Có | `cargoGroup` (nhóm hàng) | `acceptedProduct` (SPNT), lịch sử tỷ trọng |
| Dùng ở | dòng chuyến KT và VT | (chưa thấy dùng trong báo công) |

Hai cái này là **một khái niệm bị tách đôi**, hay là hai khái niệm khác nhau
thật? Trả lời khác nhau dẫn tới hai thiết kế khác hẳn:

- Nếu là một → **hợp nhất**, chuyển `acceptedProduct` + lịch sử tỷ trọng về
  `CargoType`, `DensityParameter` ở mục 3.3 chính là bản viết lại của
  `MaterialValueHistory`.
- Nếu là hai → giữ cả hai, và phải làm rõ tỷ trọng dùng trong công thức lấy
  theo `CargoType` hay theo `Material`.

**Chưa tự quyết.** Thiết kế ở mục 3.3 tạm viết theo phương án "một khái
niệm" vì công thức Excel tra tỷ trọng bằng **Chủng loại hàng**, nhưng phải
xác nhận trước khi code G2.

---

## 3. Mô hình dữ liệu

### 3.1. Nhóm A — Danh mục nền (mở rộng cái đã có)

```
Department (đơn vị)          ← Công trường KT 1,2,3 / Phân xưởng VT 1,3,4,…
  + unitType: MINING | TRANSPORT | STATISTICS
Shift, User, Device, Location, CargoGroup, CargoType   ← đã có, bổ sung ở 2.2
```

`Department.unitType` cần thiết vì phân quyền và luồng đối soát rẽ theo
nhánh KT/VT. Không suy từ tên đơn vị (nguyên tắc 1).

### 3.2. Nhóm B — Danh mục phân loại sản phẩm (mới)

```
AcceptanceProduct   (Sản phẩm nghiệm thu)   code, name, note
TtlClh              (TTL CLH)               code, name, note
CargoType  →  acceptanceProduct, ttlClh, cargoGroup    (bổ sung khoá ngoại)
```

### 3.3. Nhóm C — Tham số CÓ HIỆU LỰC THEO THỜI GIAN (mới)

Đây là nhóm quan trọng nhất về mặt đúng/sai số liệu. **Mọi bảng trong nhóm
này dùng chung một khuôn:**

```
<Tên>Parameter
  ─ (các cột khoá nghiệp vụ)
  ─ effectiveFrom : LocalDate      (bắt buộc)
  ─ effectiveTo   : LocalDate      (null = còn hiệu lực)
  ─ giá trị...
  ─ decisionRef   : String         (số quyết định ban hành, vd "QĐ 1828_25/02/2025")
```

Ràng buộc bắt buộc cho **mọi** bảng nhóm này:

1. **Không chồng lấn** trên cùng bộ khoá nghiệp vụ → dùng
   `EXCLUDE USING gist (khoá WITH =, daterange(effectiveFrom, effectiveTo) WITH &&)`
   của PostgreSQL. Đây là ràng buộc ở tầng DB, không phải chỉ validate ở Java.
2. **Tra trượt → ném lỗi nghiệp vụ** (nguyên tắc 2).

Các bảng cụ thể:

| Bảng | Khoá nghiệp vụ | Giá trị |
|---|---|---|
| `DensityParameter` (Tỷ trọng) | chủng loại hàng × khu vực xúc | tỷ trọng quy ẩm, tỷ trọng không quy ẩm |
| `ModelParameter` (Mô hình m3/chuyến) | chủng loại hàng × chủng loại xe | m3/chuyến |
| `FuelNormTable` (Định mức nhiên liệu) | chủng loại xe(DMNL) × cung độ × độ dốc | định mức (lít) |
| `TruckProductivityNorm` (Năng suất xe) | (chủng loại xe + phân loại) × cung độ | chuyến/ca |
| `FuelNormAdjustment` (HS điều chỉnh NLĐM) | chủng loại xe × hạng xe × phân loại × khu vực xúc | hệ số |
| `CoefficientParameter` (bảng hệ số chung) | mã hệ số | giá trị |

**`CoefficientParameter` gom toàn bộ 16 hằng số** đang nằm rải trong công
thức Excel (`REQUIREMENT_SANLUONG.md` mục 7): hệ số mùa 1,03 cho tháng 6–9;
hệ số hạng xe 0,97/1/1,04/1,06; cải tạo ben 1,03; quy đổi đá thải
2,625/2,617 theo khu vực; các tỷ lệ BSNL 0,5/5%/4%/1%/0,5%/1,5%/10%/15%;
ngưỡng cung độ 8; tham số nhóm tầng 15/−195/−200; ngưỡng 1,5 và 2,25; hệ số
bùn. Mỗi cái một dòng có mã, mô tả, khoảng hiệu lực.

### 3.4. Nhóm D — Bảng tra trắc địa (mới)

```
SeamGroupExcavatorKey  (Nhóm vỉa + Máy xúc)          ← QĐ-06
  ─ seamGroup      → Location.seamGroup / danh mục riêng
  ─ floorGroup     : Integer
  ─ excavator      → Device
  ─ mudSymbol      : String   (nullable)
  ─ excavationArea → Location
  ─ suffix         : enum { NONE, BK, SPNT, D_2_25, DTHAI }
  ─ displayKey     : String   (SINH TỰ ĐỘNG, chỉ để hiển thị/xuất Excel)
  UNIQUE(seamGroup, floorGroup, excavator, mudSymbol, excavationArea, suffix)

SurveyStandard   (STD — Đất SX/Than SX và Đất CN)
  ─ key → SeamGroupExcavatorKey
  ─ effectiveFrom/To
  ─ productType : enum { DAT_SX, THAN_SX, DAT_CN }
  ─ m3, tan, tkm, vTke, cLech, cd, theTrong

SurveyCoefficient  (AP Tdia — m3/tấn/tkm)
  ─ key → SeamGroupExcavatorKey
  ─ effectiveFrom/To
  ─ productType
  ─ hsM3, hsTan, hsTkm
```

`displayKey` là **cột dẫn xuất** (generated column hoặc sinh trong domain),
KHÔNG phải thứ người dùng gõ và KHÔNG dùng để `JOIN`. Đây chính là chỗ Excel
đang vỡ.

### 3.5. Nhóm E — Kỳ báo cáo (mới) — QĐ-05

```
ReportPeriod
  ─ year, month, periodNo
  ─ fromDate, toDate          (bắt buộc, nằm gọn trong tháng)
  ─ displayName, note
  UNIQUE(year, month, periodNo)
  EXCLUDE: không chồng lấn (year, month) × daterange(fromDate, toDate)
```

Gán bản ghi vào kỳ = tìm kỳ chứa `reportDate`. **Không hard-code quy tắc
1–7 / 8–14 /…** — đó chỉ là mẫu mặc định cho chức năng "sinh nhanh kỳ cho
một tháng". Ngày không thuộc kỳ nào → lỗi nghiệp vụ (nguyên tắc 2).

### 3.6. Nhóm F — Trường phòng Thống kê nhập bổ sung (mới)

8 trường gắn nhãn "(Báo chuyến)" trong Excel nhưng **không có trong form
nhập của đơn vị** (`REQUIREMENT_SANLUONG_EXCEL.md` mục 3.8). Chúng thuộc về
bước Đối soát lần 2, do Nhân viên Thống kê nhập.

```
StatisticsAdjustment
  ─ pair → ReconciliationPair        (1-1)
  ─ weighedWeightTon                 (Khối lượng qua cân)
  ─ deductionAmount                  (Trừ vơi)
  ─ provisionalModel                 (Mô hình tạm tính)
  ─ provisionalDensity               (Tỷ trọng cập nhật)
  ─ ctnbDeviationCoefficient         (HS chênh lệch CTNB)
  ─ wasteRockManualValue             (Đá thải nhập tay)
  ─ mudCoefficient                   (Hệ số bùn)
  ─ mudLoadingCoefficientSurvey      (Hệ số chất tải bùn — Trắc địa)
  ─ enteredBy, enteredAt
```

Tách thành entity riêng thay vì nhét vào `*ReportTrip` vì **chủ thể nhập
khác nhau** — đơn vị không được sửa nhóm này, Thống kê không được sửa số
chuyến của đơn vị. Tách bảng làm ranh giới quyền trở nên hiển nhiên thay vì
phải kiểm tra từng trường.

### 3.7. Nhóm G — Kết quả tính & lưu vết (mới)

```
ProductionCalculationRun          (một lần chạy tính cho một kỳ)
  ─ period → ReportPeriod
  ─ mode : enum { TKE, SURVEY }    ← QĐ-03, công tắc chế độ
  ─ status : enum { DRAFT, LOCKED }
  ─ calculatedAt, calculatedBy
  ─ lockedAt, lockedBy
  ─ parameterSnapshot : JSONB      ← nguyên tắc 5

ProductionResult                  (một dòng = một cặp đã đối soát)
  ─ run  → ProductionCalculationRun
  ─ pair → ReconciliationPair
  ─ … ~40 chỉ tiêu đầu ra (mục 5.4)

CalculationAudit                  (lưu vết mở khoá / đổi chế độ — QĐ-03)
  ─ run, action : enum { UNLOCK, MODE_CHANGE, RECALC, LOCK }
  ─ actor, actedAt, reason
  ─ valueBefore : JSONB
  ─ valueAfter  : JSONB
```

`parameterSnapshot` chụp lại **giá trị tham số đã dùng** (id + phiên bản
dòng danh mục + giá trị) tại thời điểm chốt. Không có nó thì sửa hồi tố một
dòng tỷ trọng sẽ âm thầm làm đổi số của kỳ đã phát hành.

---

## 4. Kiến trúc tính toán

### 4.1. Phân lớp

```
┌──────────────────────────────────────────────────────────────┐
│  ProductionCalculationService   (giao dịch, điều phối)       │
│    · nạp dữ liệu kỳ  · gọi engine  · ghi kết quả  · chốt     │
└───────────────┬──────────────────────────────────────────────┘
                │  truyền vào CalculationContext (thuần dữ liệu)
                ▼
┌──────────────────────────────────────────────────────────────┐
│  ProductionCalculationEngine    (HÀM THUẦN — không DB)       │
│    CalculationInput → CalculationOutput                      │
│    gồm ~25 CalculationStep xếp theo thứ tự phụ thuộc         │
└───────────────┬──────────────────────────────────────────────┘
                │  chỉ đọc qua interface
                ▼
┌──────────────────────────────────────────────────────────────┐
│  ParameterResolver     (tra tham số theo NGÀY SẢN XUẤT)      │
│    đã nạp sẵn toàn bộ danh mục cần dùng vào bộ nhớ           │
└──────────────────────────────────────────────────────────────┘
```

Engine **không biết JPA, không biết ngày hôm nay**. Mọi thứ nó cần đến từ
`CalculationInput`. Đây là điều kiện để viết được test cho từng công thức mà
không cần dựng Postgres — hiện `@SpringBootTest` của dự án vẫn fail khi
chạy độc lập vì cần DB sống (`CLAUDE.md` mục 3).

### 4.2. `ParameterResolver` — tra theo ngày sản xuất

```java
public interface ParameterResolver {
    BigDecimal density(CargoTypeRef cargo, LocationRef area, LocalDate on, DensityKind kind);
    BigDecimal model(CargoTypeRef cargo, VehicleClassRef vehicleClass, LocalDate on);
    BigDecimal coefficient(String code, LocalDate on);
    FuelNormPoint fuelNorm(VehicleFuelClassRef cls, BigDecimal distance, BigDecimal slope, LocalDate on);
    SurveyStandardRow surveyStandard(SeamGroupExcavatorKeyRef key, ProductType type, LocalDate on);
    …
}
```

`on` **luôn là ngày sản xuất của bản ghi** (QĐ-04), không bao giờ là
`LocalDate.now()`. Cách ép nguyên tắc này: **engine không có quyền truy cập
đồng hồ** — không inject `Clock`, không gọi `now()`. Muốn biết ngày thì phải
lấy từ dữ liệu đầu vào.

Triển khai: nạp trước toàn bộ danh mục liên quan tới khoảng ngày của kỳ vào
map trong bộ nhớ (một lượt query), rồi tra bằng interval matching. Với 55k
dòng/tháng, tra từng dòng qua DB là không khả thi.

### 4.3. Xử lý tra trượt — nguyên tắc 2

```java
public final class ParameterNotFoundException extends BusinessException {
    // mã lỗi, tên danh mục, bộ khoá đã tra, ngày tra, và DÒNG dữ liệu gây lỗi
}
```

Engine **không tự nuốt lỗi**. Nhưng một dòng hỏng không được làm chết cả kỳ
55.000 dòng — nên service chạy theo kiểu **thu thập lỗi**:

- Mỗi dòng tính độc lập; lỗi được ghi vào `CalculationIssue`
  (dòng nào, thiếu tham số gì, khoá nào).
- Kết thúc: trả về **báo cáo lỗi gộp theo loại** ("thiếu tỷ trọng cho 3 tổ
  hợp chủng loại hàng × khu vực" thay vì 4.000 dòng lỗi rời rạc).
- **Kỳ có lỗi chưa xử lý thì KHÔNG được chốt.** Đây là chốt chặn cứng.

### 4.4. Thứ tự các bước tính

25 bước, xếp theo phụ thuộc. Mỗi bước là một `CalculationStep` test được
riêng. Chi tiết công thức: `REQUIREMENT_SANLUONG_EXCEL.md` mục 3 và 5.

```
Lớp 0 — dẫn xuất từ danh mục (không phụ thuộc nhau)
   01 Nhóm chủng loại hàng      ← CargoType.cargoGroup
   02 Sản phẩm nghiệm thu       ← CargoType.acceptanceProduct (+ luật CS/DaXit.NK)
   03 Phân loại Đất/Than        ← ký tự đầu của SPNT
   04 Nhóm vỉa                  ← Location.seamGroup
   05 Ký hiệu bùn               ← CargoType.mudSymbol
   06 Nhóm tầng nhận tải        ← tầng + khu vực xúc          [TG-01: bản chuẩn]

Lớp 1 — khoá ghép & tham số
   07 Khoá Nhóm vỉa + Máy xúc   ← 04,05,06 + máy xúc + khu vực + hậu tố
   08 Tỷ trọng (tấn/m3)         ← tỷ trọng cập nhật, hoặc danh mục theo ngày
   09 Mô hình (m3/chuyến)       ← mô hình tạm tính, hoặc danh mục × hệ số Mức tải
   10 Thể trọng (TĐ)            ← 02,07 → tra STD

Lớp 2 — khối lượng
   11 Tổng m3                   ← khối lượng qua cân, hoặc 09 × số chuyến − trừ vơi
   12 Đá thải (tấn, m3)         ← 01 + khu vực + nơi dỡ tải  [3 tham số riêng]
   13 Tổng KLVC (tấn)           ← 11 × 08 − 12 − trừ vơi, × hệ số than
   14 Tổng Tkm                  ← 13 × cung độ
   15 Tổng km vận chuyển        ← số chuyến × cung độ

Lớp 3 — nhóm quy ẩm / không quy ẩm
   16 Tỷ trọng không quy ẩm → KLVC & Tkm không quy ẩm
   17 Tỷ trọng ban đầu → m3 ban đầu → tấn quy ẩm → Tkm quy ẩm   [QĐ-02]
   18 Tổng KLVC ban đầu chưa trừ đá                              [QĐ-02]

Lớp 4 — nhiên liệu
   19 Chênh cao thanh toán nhiên liệu ← cung độ, nâng tải, dốc cục bộ
   20 Nội suy ĐMNL (song tuyến: cung độ × dốc)  ← 19 + bảng ĐMNL
   21 ĐMNL: theo mùa → công ty → hạng xe → cải tạo ben → × HS Than
   22 Nhiên liệu tiêu hao theo ĐM (lít)  ← 14 × 21 / 1000
   23 Các khoản BSNL (8 khoản)           ← 22 × tỷ lệ theo điều kiện
   24 ĐMNL xe tổng → × HS điều chỉnh → NLĐM hiện hành

Lớp 5 — hệ số trắc địa và đầu ra
   25 Áp hệ số trắc địa (HSTĐ m3/tấn/tkm)   ← 07 → tra AP Tdia
      ⚠ chế độ TKE (QĐ-03): mọi hệ số trắc địa = 1
```

Bước 20 (nội suy song tuyến) là bước phức tạp nhất về mặt thuật toán và là
nơi bản docx sai nhiều nhất — bám công thức Excel ở
`REQUIREMENT_SANLUONG_EXCEL.md` mục 3.4, **không bám bản văn xuôi**.

### 4.5. Số học và làm tròn — ✅ ĐÃ CHỐT: `BigDecimal` (QĐ-08)

Chi tiết + quy tắc bắt buộc: [`DECISIONS.md`](DECISIONS.md) QĐ-08. Tóm tắt
phần ảnh hưởng trực tiếp tới engine:

- **Scale trung gian 10**, `RoundingMode.HALF_UP`. Áp **đúng scale của Excel
  tại đúng bước Excel làm tròn** (3 hoặc 5 chữ số).
- **Mọi `divide()` phải khai báo scale** — nếu không sẽ ném
  `ArithmeticException`. Hai chỗ chắc chắn vướng: hệ số Roda `2/3` (số vô
  hạn tuần hoàn) ở bước 09, và `Tổng m3 = Khối lượng qua cân / Tỷ trọng` ở
  bước 11.
- **So sánh bằng `compareTo() == 0`**, không dùng `equals` (khác scale là
  `false`). Sai chỗ này không ném lỗi — sai âm thầm.
- Số sẽ lệch Excel ~1e-13 **trước** khi làm tròn; nghiệm thu thì **so sau
  khi làm tròn**.

Phạm vi thay đổi đã rà thật: 19 trường `Double` trong `model/`, 18 file
backend và 10 file frontend tham chiếu. Đây là thay đổi diện rộng trên code
đang chạy → **áp kỷ luật chống hồi quy** (`CLAUDE.md` root): khai báo phạm
vi trước, tìm hết caller trước khi sửa, đối chiếu diff sau khi sửa.

### 4.6. Hiệu năng

55.161 dòng/tháng. Thiết kế theo lô:

- Một lượt nạp danh mục vào bộ nhớ (không tra DB theo dòng).
- Xử lý theo lô ~1.000 dòng, `saveAll` + `JdbcTemplate.batchUpdate` cho
  `ProductionResult`.
- Engine không giữ trạng thái → song song hoá được theo lô nếu cần, nhưng
  **chưa cần** ở quy mô này; đừng tối ưu sớm.

---

## 5. Máy trạng thái đối soát và chốt

### 5.1. Ghép cặp — QĐ-01

```
ReconciliationPair
  ─ period → ReportPeriod
  ─ reportDate, shift, excavator, cargoType, vehicle      ← KHOÁ GHÉP (QĐ-01)
  ─ excavationTrip → ExcavationReportTrip   (nullable)
  ─ transportTrip  → TransportReportTrip    (nullable)
  ─ excavationTripCount, transportTripCount, deviation
  ─ agreedTripCount                          (số đã thống nhất)
  ─ state : ReconciliationState
  UNIQUE(reportDate, shift, excavator, cargoType, vehicle)
```

Cho phép `null` một bên vì **lệch có thể là "một bên khai, bên kia không"** —
đó cũng là sai lệch cần xử lý, không được bỏ sót.

### 5.2. Trạng thái

`ApprovalStatus` hiện có (`PENDING / APPROVED / REVISION_REQUESTED`) không
đủ: nó không phân biệt cấp 1 với cấp 2, và không có trạng thái "đã chốt".
Giữ nguyên enum cũ cho các chỗ đang dùng, thêm enum mới cho cặp đối soát:

```
ReconciliationState
  ─ PENDING_UNIT        chờ hai đơn vị đối soát (cấp 1)
  ─ UNIT_AGREED         hai đơn vị đã thống nhất, gửi phòng Thống kê
  ─ RETURNED_TO_MINING  Thống kê trả lại — đích danh bên KHAI THÁC sai
  ─ RETURNED_TO_TRANSPORT  Thống kê trả lại — đích danh bên VẬN TẢI sai
  ─ STATS_CONFIRMED     Thống kê xác nhận (cấp 2)
  ─ LOCKED              đã chốt, khoá sửa
```

Hai trạng thái `RETURNED_TO_*` tách riêng thay vì một `RETURNED` chung —
tài liệu yêu cầu "gửi lệnh về **bên nhập sai**", nên trạng thái phải **trỏ
đích danh**, không trả chung chung cho cả hai.

```
PENDING_UNIT ──→ UNIT_AGREED ──→ STATS_CONFIRMED ──→ LOCKED
                      ▲                │                 │
                      │                ▼                 │ mở khoá (QĐ-03)
                      └──── RETURNED_TO_MINING           │ + ghi vết
                      └──── RETURNED_TO_TRANSPORT ───────┘
```

### 5.3. Quyền sửa theo trạng thái

Bảng này là phần dễ làm sai nhất, nên viết tường minh:

| Trạng thái | Đơn vị KT sửa được | Đơn vị VT sửa được | Thống kê sửa được |
|---|---|---|---|
| `PENDING_UNIT` | dòng chuyến của mình | dòng chuyến của mình | — |
| `UNIT_AGREED` | — | — | trường bổ sung (3.6) |
| `RETURNED_TO_MINING` | dòng chuyến của mình | — | — |
| `RETURNED_TO_TRANSPORT` | — | dòng chuyến của mình | — |
| `STATS_CONFIRMED` | — | — | trường bổ sung |
| `LOCKED` | — | — | — (phải mở khoá trước) |

Điểm mấu chốt ở cấp 1: hai bên **nhìn thấy** bảng đối chiếu đầy đủ nhưng
**chỉ sửa được dữ liệu do chính mình nhập** (tài liệu gốc: *"chỉ đối với
phần nhập liệu của mình"*).

### 5.4. Đầu ra

`ProductionResult` giữ ~40 chỉ tiêu: Tổng m3 / KLVC (tấn) / Tkm / km vận
chuyển; nhóm quy ẩm và không quy ẩm; Đá thải (tấn, m3); chuỗi ĐMNL và 8
khoản BSNL; NLĐM hiện hành; định mức năng suất; các hệ số trắc địa; và các
khoá dẫn xuất (Mã hoá hàng, Mã hàng TTL, Vỉa KPMB, Ký hiệu bùn).

---

## 6. Phân quyền

Dựa trên cơ chế sẵn có: JWT từ Portal mang `permissions` (resource → c/r/u/d/a),
`PermissionFilter` gate theo `@RequirePermission`.

Bổ sung **một chiều nữa: phạm vi đơn vị**. Quyền theo chức năng là chưa đủ —
nhân viên Kinh tế VT5 có quyền `read` trên `transport-report` nhưng chỉ được
thấy phiếu của phân xưởng mình.

- Nhân viên Kinh tế → chỉ `Department` của mình.
- Nhân viên Thống kê → toàn bộ.
- Áp ở tầng repository bằng điều kiện lọc bắt buộc, **không phải lọc ở UI**.

---

## 7. Lộ trình đề xuất

Chia nhỏ để mỗi bước tự kiểm chứng được, không dồn một cục.

| Giai đoạn | Nội dung | Kiểm chứng |
|---|---|---|
| **G1** | Danh mục nền + cờ thay hard-code (2.2) | CRUD chạy, seed dữ liệu thật từ Excel |
| **G2** | Nhóm tham số theo thời gian (3.3) + ràng buộc không chồng lấn | Test: chèn chồng lấn phải bị DB từ chối |
| **G3** | `ParameterResolver` + khung engine + 6 bước Lớp 0–1 | Unit test không cần DB |
| **G4** | Lớp 2–3 (khối lượng, quy ẩm) | **Đối chiếu số với dòng 1250 của Excel** |
| **G5** | Lớp 4 (nhiên liệu, nội suy song tuyến) | Đối chiếu `BG/BK/BP/BQ` của dòng 1250 |
| **G6** | Ghép cặp + máy trạng thái đối soát 2 cấp | Test luồng trả lại đích danh từng bên |
| **G7** | Chốt kỳ, snapshot tham số, mở khoá + lưu vết | Test: sửa hồi tố danh mục KHÔNG đổi số kỳ đã chốt |
| **G8** | Báo cáo sản lượng + xuất Excel | Cần mẫu báo cáo — **chưa có** |

G4 và G5 là hai mốc quan trọng nhất: đó là lúc biết công thức đã đúng chưa,
và đã có sẵn dữ liệu thật để đối chiếu (`_source/excel-tinhtoan-row1250.txt`).

---

## 8. Điểm cần quyết định trước khi code

| # | Vấn đề | Trạng thái |
|---|---|---|
| 1 | ~~`Double` hay `BigDecimal`~~ | ✅ **ĐÃ CHỐT — `BigDecimal`** (QĐ-08) |
| 2 | **`Material` và `CargoType` có trùng vai trò không?** (2.4) | ⚠ **MỚI — cần làm rõ trước khi thiết kế danh mục Tỷ trọng** |
| 3 | **Mẫu báo cáo sản lượng** (G8) | Chưa có tài liệu nào mô tả. Cần mẫu thật trước khi làm G8 |
| 4 | Đổi `ReconciliationDecision` sang gắn với cặp (2.3) | Có, nhưng giữ entity cũ; cần biết dữ liệu cũ có cần di trú không |
| 5 | Bổ sung `unloadingPoint` vào `ExcavationReportTrip` (2.2) | Có — thiếu thì không đối soát được điểm đổ |
| 6 | Có cần **điều chỉnh sau chốt** (bút toán ngược) không | Câu hỏi cũ chưa trả lời, ảnh hưởng thiết kế `ProductionCalculationRun` |

Ngoài ra **TG-01 vẫn tạm gác** — bước 06 (Nhóm tầng) code theo bản chuẩn
dòng 5, không cài ngoại lệ `+15`.
