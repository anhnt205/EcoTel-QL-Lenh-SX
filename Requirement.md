# Requirement — THONGKE-CAOSON

Dự án brownfield: được clone từ
`https://github.com/anhnt205/THONG_KE_CAO_SON.git`, không có đặc tả yêu cầu
gốc kèm theo repo. File này chỉ trỏ tới tài liệu yêu cầu suy ra từ code
thật, theo đúng quy ước bắt buộc của factory (mỗi project phải có
`Requirement.md`).

**Xem [docs/REQUIREMENTS_AS_IS.md](docs/REQUIREMENTS_AS_IS.md)** — yêu cầu
hiện trạng (AS-IS), liệt kê chức năng đã hoạt động thật, chức năng còn là
khung/mock, và chức năng có code nhưng không truy cập được.

**Xem [docs/DECISIONS.md](docs/DECISIONS.md) TRƯỚC TIÊN** — nhật ký các
quyết định nghiệp vụ/thiết kế chủ dự án đã chốt trực tiếp (QĐ-01 → QĐ-06).
Đây là nguồn sự thật cho những chỗ tài liệu gốc mâu thuẫn hoặc bỏ trống.
Không hỏi lại, không tự đổi.

**Xem [docs/REQUIREMENT_WORKFLOW.md](docs/REQUIREMENT_WORKFLOW.md)** — luồng
công việc nghiệp vụ (TO-BE) do chủ dự án cung cấp bằng sơ đồ workflow
(2026-08-30): 2 nhánh nhập liệu song song (Khai thác / Vận tải) → tổng hợp
chuyến → **đối soát 2 cấp** (Nhân viên Kinh tế, rồi Nhân viên Thống kê, có
vòng lặp trả lại) → áp Danh mục & Công thức → Báo cáo Thống kê Sản lượng.
Tài liệu này là *mong muốn*, chưa phải code đã có — chênh lệch với AS-IS
chính là phạm vi việc cần làm. Chưa code gì theo nó.

**Xem [docs/REQUIREMENT_SANLUONG.md](docs/REQUIREMENT_SANLUONG.md)** — đặc
tả **Danh mục & Công thức tính sản lượng** (mục III tài liệu gốc): ~15 danh
mục mới (Tỷ trọng có hiệu lực theo thời gian, STD, AP Tdia, Định mức nhiên
liệu, Năng suất xe…) và ~25 nhóm công thức (Tổng m3 / KLVC tấn / Tkm, nội
suy định mức nhiên liệu 2 chiều, các khoản bổ sung nhiên liệu…). Kèm **15
điểm chặn** phải hỏi chủ dự án trước khi code (thiếu ngoặc, nhánh điều kiện
chồng nhau, công thức bỏ trống).

**Xem [docs/REQUIREMENT_SANLUONG_EXCEL.md](docs/REQUIREMENT_SANLUONG_EXCEL.md)**
— đối chiếu đặc tả docx với **bảng tính Excel đang chạy thật** (sheet
`tinh toan`, 140 cột công thức). **Đây là nguồn công thức ĐÚNG NHẤT** —
giải 14/15 điểm chặn của tài liệu văn xuôi, kèm bản đồ cột và 6 câu hỏi mới
phát sinh. Khi docx và Excel mâu thuẫn, tin Excel (nhưng phải hỏi lại chủ
dự án trước khi code).

**Nguyên bản tài liệu khách hàng**: [docs/_source/](docs/_source/) — trích
xuất từ `Module Thống kê sản lượng.docx` (03.08.2026) và từ 2 workbook Excel
để không phụ thuộc đường dẫn máy cá nhân. Không sửa nội dung trong đó.

Khi có yêu cầu phát triển mới (không phải onboarding), nên tạo yêu cầu mới
riêng biệt với tài liệu AS-IS này để không lẫn "hiện trạng" với "mong muốn".
