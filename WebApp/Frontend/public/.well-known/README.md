# portal-manifest.json — đăng ký module với PORTAL-PM

File `portal-manifest.json` trong thư mục này là **placeholder rỗng**, thêm
ngày 2026-08-25 để DIEU-PHOI-MM (WebApp/Frontend) có thể tích hợp vào
PORTAL-PM (portal SSO chung) theo cơ chế "manifest tĩnh" — xem đặc tả đầy đủ
tại `PORTAL-PM/docs/APP_MANIFEST_CONTRACT.md` (project khác, cùng factory).

## File này dùng để làm gì

Portal chủ động **kéo (GET)** file này qua origin công khai của app, KHÔNG
gọi ngược lại bất kỳ API nào khác của Backend, KHÔNG cần xác thực. Vì nằm
trong `public/` của Create React App, `npm run build` copy nguyên file này
vào `build/.well-known/portal-manifest.json`, rồi image nginx của Frontend
(`WebApp/Frontend/Dockerfile`) copy `build/` vào
`/usr/share/nginx/html/.well-known/portal-manifest.json` — nginx serve trực
tiếp qua `location /` (không có location block nào chặn `/.well-known/*`,
đã kiểm tra cả `WebApp/Frontend/.nginx/nginx.conf` lẫn
`WebApp/reverse_proxy/nginx_release.conf` / `nginx_staging.conf`). Kết quả:
`GET {origin-của-DIEU-PHOI-MM}/.well-known/portal-manifest.json` trả đúng
nội dung file này, public, không cần đăng nhập.

## Trạng thái hiện tại

Nội dung hiện là `{"modules": []}` — **mảng rỗng hợp lệ**, không phải lỗi.
Portal chấp nhận app có 0 module: app vẫn đăng ký được ở Portal (Layer 1 —
hiện diện trong danh sách phần mềm, mở qua iframe/link), chỉ là chưa có
module con nào để admin gán quyền chi tiết (Layer 2).

## Cách điền module thật sau này

Sửa trực tiếp file JSON này, mỗi phần tử trong mảng `modules`:

```json
{
  "modules": [
    { "code": "dashboard", "name": "Dashboard", "sortOrder": 1 },
    { "code": "orders", "name": "Quản lý đơn hàng", "sortOrder": 2 },
    { "code": "orders/dispatch", "name": "Điều phối", "parentCode": "orders", "sortOrder": 1 }
  ]
}
```

- `code`: bắt buộc, duy nhất trong phạm vi app này. Gợi ý map theo route
  thật trong `WebApp/Frontend/src/pages/` (21 module UI hiện có — xem
  `docs/CODEBASE_MAP.md`), ví dụ `orders`, `dispatcherOrder`, `job`,
  `vehicles`, `materials`, `reports`...
- `name`: tên hiển thị cho admin Portal khi gán quyền. Bỏ trống → Portal
  tạm dùng `code`.
- `parentCode`: `code` của module cha, phải có mặt trong CHÍNH mảng này.
  Bỏ trống/`null` = module gốc.
- `sortOrder`: số nguyên, thứ tự hiển thị.

Sau khi sửa và deploy, admin Portal bấm "Đồng bộ từ manifest" thủ công ở
trang Module — Portal không tự polling. Chi tiết đầy đủ về cách Portal xử
lý (khớp theo `code`, không tự xoá module cũ, timeout 5 giây...) xem
`PORTAL-PM/docs/APP_MANIFEST_CONTRACT.md`.

## Lưu ý

- Đây là file tĩnh, không phải endpoint động — không tự cập nhật khi thêm
  route/menu mới trong `src/pages/`. Nếu muốn tự động theo lâu dài, cân
  nhắc thay bằng 1 route Backend tính động (xem ví dụ Spring Boot trong tài
  liệu PORTAL-PM — áp dụng tương tự cho Express nếu quyết định đổi hướng).
- Việc thêm file này KHÔNG thay đổi hành vi runtime nào khác của
  DIEU-PHOI-MM — chỉ có tác dụng khi PORTAL-PM chủ động gọi tới.
