import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/tk-skin.css";
import "./styles/excel-filter.css";
import App from "./app";

// Giao diện THỐNG NHẤT toàn phần mềm theo thiết kế (Arial 13px, nền xanh nhạt, bảng đầu xanh...):
// gắn class lên <body> để cả popup/dropdown (vẽ ra document.body) cũng nhận cùng kiểu.
document.body.classList.add("tk-skin");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
