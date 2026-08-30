# Nhật ký quyết định — THONGKE-CAOSON

Các quyết định nghiệp vụ/thiết kế đã được **chủ dự án chốt trực tiếp**.
Đây là nguồn sự thật cho những chỗ tài liệu gốc mâu thuẫn hoặc bỏ trống —
**không hỏi lại, không tự đổi**. Nếu cần đổi, thêm mục mới ghi rõ ngày và lý
do, đừng sửa mục cũ.

Mỗi mục ghi: bối cảnh → quyết định → hệ quả thiết kế → điểm cần lưu ý (nếu
có). "Điểm cần lưu ý" là những hệ quả tôi thấy được nhưng chưa được xác nhận
riêng — cần kiểm lại khi implement.

**Mục lục**

| Mã | Nội dung |
|---|---|
| QĐ-01 | Mức chi tiết đối soát CÓ Số xe |
| QĐ-02 | Thứ tự phép toán `Trừ vơi` |
| QĐ-03 | Công tắc chế độ tính TKE/trắc địa là chức năng người dùng |
| QĐ-04 | Tỷ trọng là danh mục khai báo theo thời gian |
| QĐ-05 | Thêm Danh mục Kỳ báo cáo |
| QĐ-06 | Khoá ghép "Nhóm vỉa + Máy xúc" trở thành Danh mục để CHỌN |
| QĐ-07 | Dòng chuẩn của bảng tính Excel |
| QĐ-08 | Dùng `BigDecimal` cho mọi số liệu nghiệp vụ |
| QĐ-09 | Hợp nhất `Material` vào `CargoType` |
| **TG-01** | **TẠM GÁC — ngoại lệ `+15` và biến thể công thức Nhóm tầng** |

---

## TG-01 (2026-08-30) — TẠM GÁC: ngoại lệ `+15` và biến thể công thức Nhóm tầng

> **Trạng thái: chủ dự án yêu cầu TẠM BỎ QUA, sẽ trả lời khi có thêm thông
> tin.** Ghi lại đầy đủ ở đây để lúc đó không phải điều tra lại từ đầu.
> **Không tự quyết, không code phần này.**

### Vấn đề 1 — ngoại lệ `+15` cho đúng một tổ hợp

Trong sheet `tinh toan`, ô `AK1` (Nhóm tầng) có thêm một số hạng mà công
thức chuẩn ở dòng 5 **không có**:

```excel
AK1 = …(công thức Nhóm tầng chuẩn)… + IF(AND(D1="CS", E1="u8.", G1="12.", F1=160), 15, 0)
```

Nghĩa là: Khu vực xúc `CS` **và** Máy xúc `u8.` **và** Nơi nhận tải `12.`
**và** Tầng nhận tải `= 160` → cộng thêm **15** vào Nhóm tầng.

Ô `AK2` còn lạ hơn — **chỉ còn mỗi số hạng ngoại lệ**, và trỏ sang dòng 626:

```excel
AK2 = +IF(AND(D626="CS", E626="u8.", G626="12.", F626=160), 15, 0)
```

### Vấn đề 2 — hai định nghĩa Nhóm tầng khác nhau

Ô `AK3` dùng **quy tắc khác hẳn** cho nhánh không phải KC:

```excel
' Bản chuẩn (dòng 5) — nhánh không phải KC:
IF(F<0, -1+TRUNC((F+1)/15,0), TRUNC(F/15,0)) * 15

' Bản ở dòng 3 — nhánh không phải KC:
IF(F<5, TRUNC((F-4)/15,0), TRUNC((F+10)/15,0)) * 15 - 10
```

Khác nhau ở: mốc cắt `5` thay vì `0`, và kết quả **trừ đi 10**. Tức các
nhóm tầng **lệch 10 mét** so với bản chuẩn.

Bản này cũng xuất hiện ở sheet `'Cap nhat Slg ThanV+Dat B1'` ô `AP1`, nên
**không phải gõ nhầm một lần**.

### Vì sao đáng quan tâm

Nhóm tầng sai → khoá `Nhóm vỉa + Máy xúc` sai → tra sai bảng `STD` /
`AP Tdia` → **sai thể trọng → sai sản lượng**.

### Đã xác minh đến đâu

- Cả ba công thức đều **có thật** — đã kiểm lại bằng công cụ đọc XML đã sửa
  lỗi (không phải ảo do lỗi parser như một số kết luận trước đó).
- Cả ba **chỉ nằm ở dòng 1–3**, là vùng tiêu đề/nháp (sheet đóng băng 5 dòng
  đầu; dòng 4 là hàng tiêu đề; dữ liệu thật từ dòng 6).
- **Dòng chuẩn (dòng 5) và toàn bộ 55.161 dòng dữ liệu đều dùng bản chuẩn**,
  không có ngoại lệ `+15`, không có biến thể `-10`.

### Cần trả lời khi có thông tin

1. Ngoại lệ `+15` cho tổ hợp `CS / u8. / 12. / tầng 160` **còn hiệu lực
   không**? Nếu còn: vĩnh viễn hay chỉ đúng một kỳ? Còn ngoại lệ tương tự
   nào khác không?
2. Bản nào đúng cho khu vực **không phải Khe Chàm** — bản chuẩn hay bản
   lệch 10 mét? Hay mỗi bản áp cho một trường hợp riêng?

### Hướng xử lý tạm thời

Code theo **bản chuẩn ở dòng 5** (đã đặc tả tại `REQUIREMENT_SANLUONG.md`
mục 5.1), **không cài ngoại lệ `+15`**. Nếu sau này xác nhận ngoại lệ còn
hiệu lực thì **đưa vào danh mục dạng bảng ngoại lệ có điều kiện**, tuyệt đối
không viết cứng vào công thức — đúng nguyên tắc QĐ-06.

---

## QĐ-07 (2026-08-30) — Dòng chuẩn của bảng tính Excel

**Quyết định:** lấy **dòng 5** của sheet `tinh toan` (workbook `Tháng 5 đổi
tên xe.xlsx`) làm **dòng chuẩn để đọc công thức**.

**Lý do (không phải suy đoán — Excel tự chỉ định):** dòng 5 là **dòng
MASTER của shared formula**. Ô của nó khai báo công thức kèm phạm vi áp
dụng, các dòng khác chỉ trỏ về:

```xml
<c r="AL5"><f t="shared" ref="AL5:AL68" si="2">IF(Y5&gt;0,…)</f><v>207</v></c>
<c r="AL11"><f t="shared" si="2"/><v>207</v></c>
```

**Kèm theo:**
- **Dòng 4 = hàng tiêu đề** — 207 ô chứa tên cột tiếng Việt chính thức
  (`docs/_source/excel-tinhtoan-header-row4.txt`). Đây là nguồn tên cột,
  không phải suy từ công thức.
- Sheet đóng băng 5 dòng đầu (`ySplit="5"`) → **dữ liệu thật từ dòng 6**.
- Quy mô: **55.161 dòng × 206 cột** (A..GY), XML giải nén 783 MB.
- **Dòng 1250** dùng làm **dữ liệu kiểm chứng số học** — đã xác nhận chuỗi
  công thức của dòng 5 cho ra đúng số thật (xem `REQUIREMENT_SANLUONG_EXCEL.md`).

---

## QĐ-01 (2026-08-30) — Mức chi tiết đối soát CÓ Số xe

**Bối cảnh:** khoá ghép cặp chủ dự án nêu ban đầu (Ngày + Ca + Máy xúc +
Loại hàng) không có Số xe, trong khi cả hai bên đều nhập Số xe và bước Đối
soát lần 2 yêu cầu "gửi lệnh về bên nhập sai để sửa".

**Quyết định:** đối soát ở **mức chi tiết, có Số xe**.

```
Khoá ghép cặp = Ngày + Ca + Máy xúc + Loại hàng + Số xe
```

**Hệ quả thiết kế:**
- Bảng đối chiếu chỉ ra được đích danh cặp (máy xúc × xe) đang lệch → phiếu
  trả lại trỏ đúng bản ghi, đúng bên sai.
- Vẫn cộng lên được mức tổng theo máy xúc bất cứ lúc nào (roll-up).

Chi tiết: `REQUIREMENT_WORKFLOW.md` mục 6.4.

---

## QĐ-02 (2026-08-30) — Thứ tự phép toán `Trừ vơi`

**Bối cảnh:** đặc tả docx viết `Mô hình × Số chuyến − Trừ vơi / Tỷ trọng
ban đầu` — thiếu ngoặc nên đọc được hai cách cho kết quả khác nhau. Bảng
tính Excel đang chạy thật cho ra một cách, câu trả lời sơ bộ trong chat cho
ra cách kia.

**Quyết định:** theo **bảng tính thật**:

```
Tổng KLVC Thống kê (m3) ban đầu = Mô hình × Số chuyến − ( Trừ vơi ÷ Tỷ trọng )
```

Phép chia **chỉ áp lên Trừ vơi**, không áp lên cả biểu thức.

**Hệ quả thiết kế:** áp dụng cùng nguyên tắc cho công thức song song
`Tổng KLVC Tke (tấn) ban đầu chưa trừ đá` — phép nhân cũng chỉ áp lên Trừ
vơi:

```excel
CG5 = ROUND( ROUND(AJ5,3)*R5 − IF(AD5="DAT", AH5, AH5/CF5), 3)
CK5 = ROUND( CF5*AJ5*R5    − IF(AD5="than", AH5, AH5*CF5), 5)
```

**Điểm cần lưu ý:** cả hai công thức còn **phân nhánh theo Phân loại**
(`DAT` → trừ thẳng Trừ vơi; khác → trừ sau khi quy đổi) mà bản docx không
nêu. Đã lấy theo Excel.

Chi tiết: `REQUIREMENT_SANLUONG_EXCEL.md` mục 3.1.

---

## QĐ-03 (2026-08-30) — Công tắc chế độ tính (TKE / trắc địa) là chức năng người dùng

**Bối cảnh:** trong Excel, ô `'Cap nhat Slg ThanV+Dat B1'!$A$1` khi bằng
`"TKE"` thì **mọi hệ số trắc địa bị ép về 1**:

```excel
=IF('Cap nhat Slg ThanV+Dat B1'!$A$1="TKE", 1, INDEX('AP Tdia(m3-tan-tkm)'!…))
```

Tức hệ thống có hai chế độ tính. Tài liệu docx không nhắc tới.

**Quyết định:** đưa lên giao diện thành **một nút chuyển chế độ**. **Nhân
viên Thống kê** là người bật/tắt.

**Hệ quả thiết kế:**
- Chế độ là **thuộc tính của kỳ tính toán**, không phải cấu hình toàn hệ
  thống — hai kỳ khác nhau có thể ở hai chế độ khác nhau.
- Phải **lưu vết**: kỳ nào tính ở chế độ nào, ai bật, lúc nào. Số sản lượng
  không thể diễn giải được nếu không biết nó tính ở chế độ nào.
- Mọi báo cáo/kết xuất phải **hiển thị rõ chế độ** đang áp dụng.
- Chỉ vai trò Thống kê được thao tác; Nhân viên Kinh tế không.

**✅ Bổ sung (2026-08-30) — đổi chế độ trên kỳ ĐÃ CHỐT:** **cho đổi, nhưng
bắt mở khoá và ghi vết.**

Hệ quả thiết kế:
- Kỳ đã chốt ở trạng thái **khoá**. Muốn đổi chế độ phải **mở khoá trước** —
  đây là một hành động riêng, có quyền riêng (Thống kê), ghi lại **ai mở, lúc
  nào, lý do**.
- Sau khi đổi chế độ phải **tính lại** rồi **chốt lại** — không để kỳ ở trạng
  thái "đã mở khoá" lơ lửng.
- Vết phải lưu **giá trị sản lượng trước và sau**, không chỉ ghi "đã đổi chế
  độ". Không có số cũ thì không đối chiếu được với báo cáo đã phát hành.
- **Báo cáo đã xuất trước đó trở thành lỗi thời.** Cần đánh dấu/cảnh báo được
  điều này — nếu không, hai bản báo cáo cùng một kỳ với hai con số khác nhau
  sẽ cùng lưu hành mà không ai biết bản nào mới.

---

## QĐ-04 (2026-08-30) — Tỷ trọng là danh mục khai báo theo thời gian

**Bối cảnh:** Excel tra tỷ trọng thẳng từ sheet `Mohinh_TheTrong` theo
`Chủng loại hàng × Khu vực xúc`, **không có chiều thời gian**. Trong khi
docx mô tả một danh mục Tỷ trọng có khoảng hiệu lực `dd/mm/yy – dd/mm/yy`.

**Quyết định:** làm theo **docx** — đưa vào **Danh mục**, cho phép khai báo
giá trị **theo thời gian**. Khi tính toán thì căn cứ thời gian để lấy đúng
giá trị có hiệu lực.

**Hệ quả thiết kế:**
- Danh mục Tỷ trọng có khoá: `Chủng loại hàng × Khu vực xúc × khoảng hiệu
  lực`, giá trị: `Tỷ trọng (quy ẩm)`, `Tỷ trọng (không quy ẩm)`.
- Phải chặn **chồng lấn khoảng hiệu lực** trên cùng một khoá — nếu không,
  hai bản ghi cùng thoả sẽ cho kết quả tuỳ tiện.
- Phải xử lý **khoảng trống**: nếu không bản ghi nào có hiệu lực vào ngày
  cần tra → báo lỗi nghiệp vụ rõ ràng, tuyệt đối không âm thầm lấy 0.
- Nguyên tắc này nên áp cho **mọi tham số định mức khác** (hệ số mùa, hệ số
  hạng xe, định mức nhiên liệu, tỷ lệ đá thải…) — xem
  `REQUIREMENT_SANLUONG.md` mục 7.

**✅ Bổ sung (2026-08-30) — mốc thời gian tra cứu:** chủ dự án xác nhận lấy
theo **ngày/ca sản xuất của bản ghi**, KHÔNG phải ngày chạy báo cáo.

Hệ quả thiết kế:
- Việc tính lại **tái lập được**: chạy lại báo cáo tháng trước vào bất cứ lúc
  nào cũng ra đúng con số cũ, miễn danh mục không bị sửa hồi tố.
- Sửa hồi tố một dòng danh mục (đổi tỷ trọng của khoảng đã qua) **sẽ làm đổi
  số của kỳ đã chốt**. Nên khi chốt kỳ, lưu lại **giá trị tham số đã dùng**
  (hoặc id dòng danh mục + phiên bản), để sau này còn truy được vì sao ra con
  số đó.

---

## QĐ-05 (2026-08-30) — Thêm Danh mục Kỳ báo cáo

**Bối cảnh:** cột `DL` trong sheet `tinh toan` chia tháng thành 5 kỳ:

```excel
=IF(B5<8,  "Kỳ 01, 1/5 den 7/5",
 IF(B5<15, "Kỳ 02, 8/5 den 14/5",
 IF(B5<22, "Kỳ 03, 15/5 den 21/5",
 IF(B5<29, "Kỳ 04, 22/5 den 28/5",
 IF(B5<32, "Kỳ 05, 29/5 den 31/5", 0)))))
```

Docx không nhắc tới kỳ báo cáo.

**Quyết định:** **thêm kỳ báo cáo**, và đưa vào **Danh mục kỳ báo cáo**
(không hard-code trong công thức như Excel đang làm).

**✅ Bổ sung (2026-08-30) — cách chia kỳ:** kỳ được **tạo trong danh mục với
khoảng thời gian**; việc gán một bản ghi vào kỳ nào là **căn cứ ngày của bản
ghi rơi vào khoảng nào**.

Tức số kỳ trong tháng KHÔNG cố định 5 — bao nhiêu kỳ là do người dùng khai
báo. Câu hỏi "tháng 2 có 4 hay 5 kỳ" vì thế **không còn đặt ra**: tháng 2 khai
mấy dòng thì có mấy kỳ.

**Hệ quả thiết kế:**
- Danh mục Kỳ báo cáo: `Năm`, `Tháng`, `Số kỳ`, **`Từ ngày`, `Đến ngày`**,
  `Tên hiển thị`, `Ghi chú`.
- **KHÔNG hard-code quy tắc 1-7 / 8-14 / …** trong công thức như Excel đang
  làm. Dãy đó chỉ là **giá trị mặc định gợi ý** khi tạo mới.
- Gán kỳ = tìm dòng danh mục có `Từ ngày ≤ ngày bản ghi ≤ Đến ngày`.
- Ba ràng buộc bắt buộc, cùng kỷ luật với QĐ-04:
  1. **Không chồng lấn** — một ngày không được thuộc hai kỳ.
  2. **Không hở** — mọi ngày trong tháng phải thuộc đúng một kỳ; nếu bản ghi
     rơi vào ngày chưa khai báo kỳ thì **báo lỗi nghiệp vụ rõ ràng**, không
     âm thầm bỏ qua hay dồn vào kỳ gần nhất.
  3. Khoảng của kỳ **nằm gọn trong một tháng** (chủ dự án nói "chia kỳ trong
     tháng").
- Nên có chức năng **sinh nhanh kỳ cho một tháng** theo mẫu mặc định rồi cho
  sửa — vì đây là danh mục lặp hàng tháng, bắt nhập tay 5 dòng × 12 tháng là
  vô lý.
- Báo cáo sản lượng phải lọc/nhóm được theo kỳ, bên cạnh ca/ngày/tháng.

**Điểm cần lưu ý:** kỳ cuối tháng ngắn hơn các kỳ khác (2–3 ngày). Khi so
sánh sản lượng giữa các kỳ, so số tuyệt đối sẽ lệch — báo cáo nên hiển thị
kèm **số ngày của kỳ** để người đọc không hiểu nhầm.

---

## QĐ-06 (2026-08-30) — Khoá ghép "Nhóm vỉa + Máy xúc" trở thành Danh mục để CHỌN

**Bối cảnh:** Excel dựng khoá tra cứu bằng **nối chuỗi** rồi `MATCH` khớp
tuyệt đối:

```excel
CR5 = CQ5&"_"&AK5&"_"&E5&BW5&"_"&D5
      & IF(I5="Băng tải.","_BK", IF(J5="SPNT.via","_ SPNT",""))
      & IF(J5="SPNT.via","", IF(AI5=2.25,"_2,25", IF(LEFT(K5,5)="dthai","_dthai","")))
```

= `Nhóm vỉa _ Nhóm tầng _ Máy xúc + Ký hiệu bùn _ Khu vực xúc + hậu tố`.
Sai một dấu chấm/dấu cách là tra trượt, Excel trả `#N/A` mà không cảnh báo
gì về nghiệp vụ. (Đã thấy dấu hiệu lỗi thật: một nơi ghi `"_ SPNT"` **có
dấu cách**, nơi khác ghi `"_SPNT"`.)

**Quyết định:** dựng thành **Danh mục** gồm đúng các thành phần `Nhóm vỉa +
Nhóm tầng + Máy xúc + Ký hiệu bùn + Khu vực xúc + hậu tố`. Người dùng
**chọn từ danh mục**, không nhập tay → chuỗi luôn khớp.

**Hệ quả thiết kế:**
- Danh mục lưu **các thành phần thành cột riêng** (khoá ngoại tới Nhóm vỉa,
  Máy xúc, Khu vực xúc…), chuỗi ghép chỉ là **giá trị hiển thị/xuất Excel
  sinh ra từ các cột đó** — không phải thứ người dùng gõ, cũng không phải
  khoá thật trong DB.
- Ràng buộc **duy nhất** trên tổ hợp thành phần.
- Khi tính toán, hệ thống tự suy tổ hợp từ dữ liệu chuyến. Nếu tổ hợp đó
  **chưa có trong danh mục** → **báo lỗi nghiệp vụ rõ ràng** ("chưa khai báo
  Nhóm vỉa+Máy xúc cho tổ hợp X"), tuyệt đối không trả 0 hay bỏ qua âm thầm.
  Đây chính là chỗ Excel đang im lặng trả `#N/A`.
- Áp dụng cùng cách cho các khoá ghép chuỗi khác trong sheet `tinh toan`:
  `EA` (HS điều chỉnh NLĐM = `ChủngLoạiXe_HạngXe_PhânLoại`), `DE` (cột tra
  bảng định mức nhiên liệu), `CO`, `DP`, `DR`.

Chi tiết: `REQUIREMENT_SANLUONG_EXCEL.md` mục 3.6 và 5.

---

## QĐ-08 (2026-08-30) — Dùng `BigDecimal` cho mọi số liệu nghiệp vụ

**Bối cảnh:** entity hiện dùng `Double`. Chuỗi 25 bước tính có `ROUND(...,3)`
và `ROUND(...,5)` xen kẽ → `Double` tích luỹ sai số. Chính bộ Excel đang cho
thấy điều đó: `96.828999999999994`, `382.47460000000001`.

**Quyết định:** dùng **`BigDecimal`**.

### Hệ quả phải chấp nhận

Số của hệ mới sẽ **lệch Excel ở khoảng 1e-13 trước khi làm tròn**. Sau khi
làm tròn theo đúng scale thì trùng khớp. Khi nghiệm thu, **so sau khi làm
tròn** — đừng so bit-for-bit với ô Excel.

### Quy tắc bắt buộc khi code

1. **Mọi phép chia PHẢI khai báo scale + `RoundingMode`.**
   `BigDecimal.divide(x)` không có scale sẽ **ném `ArithmeticException`** khi
   kết quả là số thập phân vô hạn tuần hoàn. Đây không phải rủi ro lý
   thuyết — công thức Mô hình có `IF(Z="roda", 2/3, …)`, và **2/3 chính là
   số vô hạn tuần hoàn**. Viết `divide(BD.valueOf(3), 10, HALF_UP)`.
   Chỗ thứ hai: `Tổng m3 = Khối lượng qua cân / Tỷ trọng`.
2. **So sánh bằng `compareTo(...) == 0`, KHÔNG dùng `equals`.**
   `new BigDecimal("2.50").equals(new BigDecimal("2.5"))` là `false` vì khác
   scale. Sai chỗ này là sai âm thầm, không có exception.
3. **Chính sách scale:** giữ scale trung gian **10** cho các bước không có
   `ROUND` trong Excel; **áp đúng scale của Excel tại đúng bước Excel làm
   tròn** (3 hoặc 5 chữ số, xem `REQUIREMENT_SANLUONG_EXCEL.md` mục 3).
   `RoundingMode.HALF_UP`.
4. **Cột DB đổi `double precision` → `numeric(p,s)`**, cần migration. Chọn
   `p`/`s` đủ rộng: khối lượng tới `numeric(18,5)`, hệ số `numeric(12,6)`.
5. **`LoadLevel.customValue` đang là `String`** (nhập dạng phân số `1/2`,
   `1/3`). Phải parse ra `BigDecimal` có kiểm tra, **không** `Double.parseDouble`.

### Phạm vi thay đổi (đã rà thật)

19 trường `Double` trong `model/`. Nhóm nghiệp vụ bắt buộc đổi: khối nhiên
liệu của `ExcavationReport`/`TransportReport` (8 trường), các chỉ tiêu tuyến
đường của `TransportReportTrip` (4 trường), `MaterialValueHistory.density`
/`dryDensity` (2 trường).

**18 file backend** tham chiếu trực tiếp các trường này (DTO request/response,
mapper, 2 Excel importer, `ReconciliationService`) và **10 file frontend**.
Đây là thay đổi chạm vào nhiều caller → **bắt buộc áp kỷ luật chống hồi quy**
(`CLAUDE.md` root, mục "Regression discipline"): khai báo phạm vi trước, tìm
hết caller trước khi sửa, đối chiếu diff với phạm vi đã khai sau khi sửa.

Lưu ý phía frontend: Jackson serialize `BigDecimal` thành **số JSON** nên
kiểu dữ liệu không vỡ, nhưng **số chữ số thập phân hiển thị sẽ đổi**
(`2.5` → `2.50000`). Cần rà lại chỗ format hiển thị.

### Không đổi (chưa cần)

`Coordinates.longitude/latitude`, `Device.capacity/power`, `Location.distance`
— không tham gia chuỗi tính sản lượng. Để nguyên, tránh mở rộng phạm vi vô ích.

---

## QĐ-09 (2026-08-30) — Hợp nhất `Material` vào `CargoType`

**Bối cảnh:** hệ thống có hai thực thể cùng mô tả "chủng loại hàng" —
`CargoType` (có `cargoGroup`) và `Material` (có `acceptedProduct` +
`MaterialValueHistory` chứa `density`/`dryDensity` theo khoảng thời gian).
Xem `DESIGN_SANLUONG.md` mục 2.4.

**Quyết định: HỢP NHẤT.** Chuyển `acceptedProduct` và lịch sử tỷ trọng về
`CargoType`.

**Hệ quả thiết kế:**
- `CargoType` nhận thêm: `acceptanceProduct` (khoá ngoại tới danh mục Sản
  phẩm nghiệm thu), `ttlClh`, và quan hệ tới `DensityParameter`.
- `DensityParameter` (mục 3.3) chính là bản viết lại của
  `MaterialValueHistory`, khắc phục 4 vấn đề đã nêu ở mục 2.4: có id riêng,
  `LocalDate` thay `LocalDateTime`, **bỏ giá trị mặc định `now()` cho
  `effectiveTo`**, và **thêm chiều Khu vực xúc**.
- Cần **di trú dữ liệu** từ `material_value_history` sang bảng mới. Phải
  kiểm tra dữ liệu thật trước: bao nhiêu bản ghi, có bản ghi nào `endTime`
  đang dính bẫy `now()` không.
- `Material`/`MaterialValueHistory` và các CRUD của nó **không xoá ngay** —
  giữ tới khi di trú xong và xác nhận không còn nơi nào dùng (quy tắc dự án:
  không tự ý xoá code nghiệp vụ).

**Điểm cần lưu ý:** `Material` còn có `mongoId` — dấu vết của cơ chế đồng bộ
MongoDB đã gỡ. Khi di trú thì bỏ trường này, không mang sang.
