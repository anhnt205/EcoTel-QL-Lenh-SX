// Cờ tính năng đọc LÚC BUILD (CRA nhúng REACT_APP_* vào bundle).
//
// REACT_APP_TK_EMBED=true: bật chế độ "Thống kê là gốc danh mục" — menu Thống
// kê (nhúng cùng domain qua /thong-ke/) xuất hiện, các mục danh mục đã chuyển
// sang Thống kê (đơn vị, chức danh, ca, phân loại/chủng loại thiết bị) bị ẩn
// khỏi menu Điều phối. Mặc định TẮT → giao diện và hành vi y như cũ, nên gộp
// code vào nhánh không làm đổi bản đang chạy thật cho tới khi bật cờ khi build.
// Phải bật cùng lúc với CATALOG_MASTER=thongke ở backend (xem catalogLock.js).
export const TK_EMBED = process.env.REACT_APP_TK_EMBED === "true";
