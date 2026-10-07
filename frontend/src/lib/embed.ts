/**
 * Chế độ NHÚNG: giao diện Thống kê chạy trong 1 khung (iframe) của phần mềm
 * Điều phối cùng domain — Điều phối vẽ thanh menu, nên ở đây ẩn header + thanh
 * tab của chính Thống kê và nhận lệnh điều hướng qua postMessage.
 *
 * Nhận biết bằng `window.name === "tk-embed"` (Điều phối đặt name cho iframe)
 * chứ KHÔNG dùng "đang nằm trong iframe": Portal cũng nhúng Thống kê trong
 * iframe nhưng cần giữ nguyên header của Thống kê ở đó. `window.name` còn giữ
 * được qua F5/điều hướng trong khung, không rò sang tab khác. `?embed=1` là
 * lối dự phòng khi mở thủ công để thử.
 */
export const EMBED_FRAME_NAME = "tk-embed";

export const isEmbedded = (): boolean => {
  try {
    if (window.name === EMBED_FRAME_NAME) return true;
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
};

/** Tiền tố đường dẫn của router (rỗng khi chạy ở gốc `/`). */
export const routerBasename = (): string => {
  const base = import.meta.env.BASE_URL || "/";
  return base === "/" ? "" : base.replace(/\/+$/, "");
};

/** Thông điệp giữa khung cha (Điều phối) và Thống kê. */
export const MSG_NAVIGATE = "tk:navigate"; // cha -> con: { type, path }
export const MSG_LOCATION = "tk:location"; // con -> cha: { type, path }
