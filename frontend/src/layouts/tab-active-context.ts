import { createContext, useContext } from "react";

/**
 * "Trang đang bọc quanh component này có phải trang ĐANG HIỆN không?"
 *
 * Từ 2026-09-09 các trang không bị huỷ khi chuyển trang nữa mà chỉ bị ẩn đi
 * (xem `keep-alive-outlet.tsx`) để giữ nguyên dữ liệu đang nhập dở. Ẩn bằng CSS
 * là đủ cho nội dung nằm trong trang, NHƯNG modal/dropdown của Radix lại được
 * render ra thẳng `document.body` qua portal — nên một trang đang ẩn mà còn mở
 * modal thì modal đó vẫn nổi đè lên trang khác.
 *
 * Vì vậy component `Dialog` dùng chung (`components/ui/dialog.tsx`) đọc giá trị
 * này để tự tạm ẩn khi tab của nó không hiện. Chỉ ẩn phần nhìn thấy — state
 * "modal đang mở" của trang giữ nguyên, nên quay lại tab là modal hiện lại
 * đúng chỗ đang dở.
 *
 * Mặc định `true` để mọi chỗ nằm ngoài cơ chế giữ trang (màn đăng nhập, dialog
 * cấp toàn ứng dụng) hoạt động y như trước.
 */
export const TabActiveContext = createContext(true);

export const useIsTabActive = () => useContext(TabActiveContext);
