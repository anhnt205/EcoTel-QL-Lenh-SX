# Công cụ đọc file nguồn của khách hàng (.docx / .xlsx)

Máy này **không có Python, không có Node** trên PATH của shell — nên các
script dưới đây viết bằng **PowerShell 5.1 thuần** (chỉ dùng .NET có sẵn).
Chúng đã được dùng để trích toàn bộ bằng chứng trong `docs/_source/`.

Giữ lại để phiên sau **không phải viết lại từ đầu** — và quan trọng hơn,
**không lặp lại hai cái bẫy** đã làm tôi kết luận sai (xem mục "Hai cái bẫy"
bên dưới).

## Cách chạy

```powershell
# 1. Liệt kê sheet của workbook (tên, trạng thái ẩn/hiện, file XML, kích thước)
.\xl2.ps1 -Xlsx "<duong-dan>.xlsx" -SheetFile "xl/worksheets/sheet1.xml" -Mode profile -EndRow 40

# 2. Đổ toàn bộ một dòng (giải mã cả shared string)
.\xl2.ps1 -Xlsx "<file>.xlsx" -SheetFile "xl/worksheets/sheet78.xml" `
          -Mode row -Row 5 -OutPath ".\row5.txt"

# 3. Xếp hạng TOÀN BỘ dòng theo số ô / số công thức (quét nhanh dạng text)
.\xlrank.ps1 -Xlsx "<file>.xlsx" -SheetFile "xl/worksheets/sheet78.xml" `
             -OutPath ".\rank.txt" -Top 20

# 4. Tìm chuỗi bất kỳ trong XML thô (để soi 1 ô cụ thể)
.\xlfind.ps1 -Xlsx "<file>.xlsx" -SheetFile "xl/worksheets/sheet78.xml" `
             -Needle '<c r="AL1250"' -After 300 -MaxHits 1

# 5. Trích text từ .docx (giữ thứ tự đoạn văn và bảng)
.\docx2txt.ps1 -XmlPath ".\word\document.xml" -OutPath ".\out.txt"
# (giải nén trước:  unzip -o "<file>.docx" "word/*.xml" -d .\docx )
```

Lấy tên sheet → file XML: đọc `xl/workbook.xml` (thẻ `<sheet name= r:id=>`)
đối chiếu `xl/_rels/workbook.xml.rels`. `xl2.ps1` đã làm sẵn việc này khi
truyền `-Sheet "<tên sheet>"` thay cho `-SheetFile`.

## Hai cái bẫy — đọc trước khi tự viết công cụ mới

Cả hai đều từng khiến tôi báo cáo **kết luận sai** cho chủ dự án.

### Bẫy 1 — `ReadElementContentAsString()` đã tự dời con trỏ

Với `XmlReader`, sau khi gọi `ReadElementContentAsString()` trên `<f>` hoặc
`<v>`, con trỏ **đã nằm ở node kế tiếp**. Nếu vòng lặp lại gọi `Read()` một
lần nữa thì **bỏ qua thẻ `</c>`**, tiếp tục nuốt sang ô sau, và **gán công
thức của ô sau cho địa chỉ ô trước**.

Hậu quả thực tế: tôi kết luận nhầm rằng sheet `tinh toan` "không nhất quán,
cùng một cột chứa thứ khác nhau tuỳ dòng". Hoàn toàn sai.

**Cách đúng:** dùng `ReadOuterXml()` cho từng thẻ `<c>` (nó dời con trỏ
chính xác qua hết phần tử), rồi bóc `r` / `t` / `<f>` / `<v>` bằng regex.
Đừng gọi `Read()` thêm sau đó — `xl2.ps1` xử lý bằng cờ `$advance`.

### Bẫy 2 — shared formula là thẻ TỰ ĐÓNG

Excel không lặp lại công thức ở mọi ô. Một ô **master** giữ văn bản công
thức kèm phạm vi, các ô còn lại chỉ trỏ về bằng `si`:

```xml
<c r="AL5"><f t="shared" ref="AL5:AL68" si="2">IF(Y5&gt;0,…)</f><v>207</v></c>
<c r="AL11"><f t="shared" si="2"/><v>207</v></c>
```

Regex `<f[^>]*>(.*?)</f>` **không khớp thẻ tự đóng** `<f … />`. Ô như
`AL11` sẽ bị hiểu nhầm là "chỉ có giá trị, không có công thức".

Hậu quả thực tế: tôi kết luận nhầm rằng "đa số dòng đã bị dán cứng thành
giá trị". Cũng sai — sheet nhất quán, mọi dòng đều có đủ công thức.

**Cách đúng:** đếm cả `<f` tự đóng (như `xlrank.ps1` làm), và khi cần văn
bản công thức thì **phải đọc dòng master** — tìm ô có `ref="…"` cùng `si`.

### Hệ quả rút ra

Với sheet `tinh toan`, **dòng master là dòng 5**. Đó là lý do thật sự khiến
dòng 5 là dòng chuẩn, chứ không phải vì "tình cờ nhiều công thức nhất".

## Ghi chú hiệu năng

- `xl/worksheets/sheet78.xml` (sheet `tinh toan`) giải nén ra **783 MB**.
  `grep`/`unzip -p | grep` trên nó **treo quá 2 phút** — đừng dùng.
- `xl2.ps1` dừng sớm khi vượt dòng đích nên đọc 1 dòng vẫn nhanh.
- `xlrank.ps1` quét dạng text theo khối 1 MB, chạy hết 55.161 dòng mất vài
  phút — nên chạy nền (`run_in_background`).
- `xl/calcChain.xml` của workbook `Tháng 5 đổi tên xe.xlsx` nặng **190 MB**
  (chiếm gần hết dung lượng file). Không cần đọc.

## dump-sheet.ps1 (thêm 2026-09-29)

Đổ TOÀN BỘ ô có giá trị của 1 sheet ra TSV (`hàng<TAB>cột<TAB>giá trị`, đã giải mã
shared string, lấy GIÁ TRỊ CACHE chứ không phải công thức) — dùng để nạp danh
mục (DMNL, NS XE, Mohinh_TheTrong…) qua `COPY ... FROM STDIN` vào bảng tạm rồi
`INSERT ... SELECT`. Nạp bằng `XmlDocument` nên chỉ dùng cho sheet nhỏ (< ~10MB
XML); sheet `tinh toan` (784MB) vẫn phải dùng `xlfind.ps1`.

```powershell
.\dump-sheet.ps1 -Sheet sheet46 -Out .\dmnl.tsv -Max 80
```

**Bẫy mới:** công thức `L5 = 'Cap nhat…'!I3` nói ô lấy từ sheet khác, nhưng GIÁ TRỊ
CACHE có thể là số nhập cứng khác (M5 = 210 trong khi ô nguồn trống). Khi cần số
liệu thật của dòng nào, đọc `<v>` cache của chính ô đó bằng `xlfind.ps1`.
