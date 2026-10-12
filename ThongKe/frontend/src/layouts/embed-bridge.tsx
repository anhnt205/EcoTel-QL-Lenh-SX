import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isEmbedded, MSG_LOCATION, MSG_NAVIGATE } from "@/lib/embed";

/**
 * Cầu nối điều hướng khi Thống kê chạy nhúng trong Điều phối (cùng origin).
 *  - Cha gửi { type: "tk:navigate", path } -> chuyển trang trong khung, không tải lại.
 *  - Mỗi lần đổi trang, báo { type: "tk:location", path } lên cha để cha cập nhật
 *    thanh địa chỉ/mục menu đang chọn.
 * Chỉ nhận thông điệp cùng origin. Không làm gì nếu không ở chế độ nhúng.
 */
export function EmbedBridge() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const embedded = isEmbedded();

  useEffect(() => {
    if (!embedded) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data?.type !== MSG_NAVIGATE || typeof data.path !== "string") return;
      // chỉ nhận đường dẫn nội bộ tuyệt đối, tránh bị điều hướng ra ngoài
      if (!data.path.startsWith("/") || data.path.startsWith("//")) return;
      navigate(data.path);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embedded, navigate]);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    window.parent.postMessage(
      { type: MSG_LOCATION, path: pathname + search },
      window.location.origin,
    );
  }, [embedded, pathname, search]);

  return null;
}
