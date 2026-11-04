# Đồng bộ danh mục Lệnh SX (Mongo) → Thống kê (Postgres, gdata :6883) — 2026-11-04

**Nguồn**: DB sản xuất `Lenh_sx` (container `ktv_mongo_db`, mạng Docker `release_backnet`, chạy trong bản release thật trên gdata,
cổng 80/443). Đọc bằng tài khoản CHỈ-ĐỌC `lenhsx_readonly` (authSource `Lenh_sx`) qua container tạm `mongo mongosh --network release_backnet`
— không đụng container sản xuất. **Mật khẩu KHÔNG lưu trong repo** (hỏi chủ dự án).

**Đích**: Postgres `thong_ke` của stack `dieu-phoi-mm` trên gdata (container `dieu-phoi-mm-tk_postgres-1`).

## Quy tắc (theo quyết định dự án 2026-10-07)
Hai bên đều có → **giữ dữ liệu Thống kê**, chỉ gắn `mongo_id`; chỉ có ở Lệnh SX → **thêm**; không xoá, không đè.
Ngoại lệ do chủ dự án duyệt: giờ ca lấy theo Lệnh SX (07-15, 15-23, 23-07) thay cho giờ tạm 06-14… lúc nhập Excel.
Không chép mật khẩu băm của Lệnh SX; nhân viên mới có mật khẩu ngẫu nhiên không đoán được (Thống kê đăng nhập bằng token của Điều phối).

## Ghép khoá
- Đơn vị: mã hoặc tên (chuẩn hoá bỏ dấu/khoảng trắng). Loại thiết bị: tên. Ca: số ca.
- Thiết bị: mã Lệnh SX, hoặc `vehicleNumber` (số xe) ↔ mã Thống kê; hoặc mã ↔ tên Thống kê. Một thiết bị Thống kê bị hơn một thiết bị Lệnh SX nhắm tới → bỏ qua cả hai (2 mục: `DS-1`, `140 HD 785-7`).
- Nhân viên: **số thẻ lương** (456/456 người của sổ phân xưởng khớp; 8 người lệch họ tên — đã gắn theo số thẻ, giữ tên Thống kê; xem `name_mismatch.csv` trong scratchpad, chỉ có trên máy chạy). 25 số thẻ trùng 2 bản ghi trong Lệnh SX → lấy bản mới nhất.

## Kết quả đã ghi (1 giao dịch, sao lưu DB trước: `~/backups/dpmm/tk_before_20261104_065508.dump`)
| Danh mục | Gắn `mongo_id` | Thêm mới | Tổng sau |
|---|---|---|---|
| Đơn vị | 6 | 25 | 35 |
| Loại thiết bị | 1 (Máy xúc) | 9 | 19 |
| Ca | 3 (đổi giờ theo Lệnh SX) | 0 | 3 |
| Thiết bị | 189 | 267 | 473 |
| Nhân viên | 456 | 2.766 | 3.231 |

Không đồng bộ (theo thoả thuận): **Chức vụ** (Lệnh SX 195 chức danh ≠ chức vụ gắn quyền của Thống kê) và **Vật liệu ↔ Chủng loại hàng** (tên hai bên không khớp, dự án chưa chốt bảng ghép).
Thiết bị mới: mã giữ như Lệnh SX (vd `108 CAT 773E`), còn thiết bị Thống kê cũ dùng số xe (`108`); chưa gắn chủng loại xe/thuộc tính sản lượng và mẫu thiết bị.

## Lưu ý kỹ thuật
- `departments.full_data_scope` bắt buộc nhập (không có giá trị mặc định ở DB gdata, bản local cũ thì có) → đặt `false`. Thử SQL trên bản local KHÔNG đủ để bắt lỗi kiểu này — luôn so cột NOT NULL với DB đích.
- ID sinh bằng `nextval('<bảng>_seq')` (sequence bước 50, mỗi dòng dùng một giá trị).
- Tái tạo: xuất JSON bằng `mongosh` (đơn vị, loại thiết bị, ca, thiết bị; nhân viên chỉ lấy `username, fullName, salaryCode, role, department, gender, email, phone, active, createdAt, updatedAt`), xuất danh mục Thống kê bằng `psql … json_agg`, chạy `build_sync_sql.py` (đọc `/sy/*.json`, ghi `/sy/out/apply.sql`), rồi `psql -v ON_ERROR_STOP=1 -f apply.sql`.
