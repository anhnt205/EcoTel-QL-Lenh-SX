import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/tk-skin.css";
import "./styles/excel-filter.css";
import App from "./app";

// Giao diện THỐNG NHẤT toàn phần mềm theo thiết kế (Arial 13px, nền xanh nhạt, bảng đầu xanh...):
// gắn class lên <body> để cả popup/dropdown (vẽ ra document.body) cũng nhận cùng kiểu.
document.body.classList.add("tk-skin");

// Sau mỗi lần deploy, tab đang mở vẫn giữ bản cũ: bấm sang trang mới thì trình duyệt tải file JS cũ (đã bị xoá khỏi server)
// → trang TRẮNG. Gặp lỗi tải file thì tự tải lại trang để lấy bản mới (tối đa 1 lần / 30 giây để không lặp vô hạn).
window.addEventListener("vite:preloadError", (e) => {
  try {
    const last = Number(window.sessionStorage.getItem("tk-preload-reload") ?? 0);
    if (Date.now() - last < 30_000) return;
    window.sessionStorage.setItem("tk-preload-reload", String(Date.now()));
  } catch {
    // sessionStorage bị chặn: vẫn tải lại một lần
  }
  e.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
