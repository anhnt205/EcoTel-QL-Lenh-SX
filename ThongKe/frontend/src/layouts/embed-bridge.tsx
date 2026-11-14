import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isEmbedded, MSG_HEADER, MSG_LOCATION, MSG_NAVIGATE } from "@/lib/embed";

/** Có phần tử cuộn dọc nào (từ `el` lên gốc) đang cuộn dở (scrollTop > 0) không. */
const hasScrolledAncestor = (el: Element | null): boolean => {
  for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight && n.scrollTop > 0) {
      return true;
    }
  }
  return false;
};

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

  // Lăn chuột xuống trong khung => báo cha thu banner phần mềm (chỉ còn thanh menu) để có thêm chỗ hiển thị;
  // lăn LÊN mà bảng đã về đầu => báo cha hiện lại. Dùng sự kiện lăn chuột (không dùng vị trí cuộn) để khỏi
  // dao động: banner thu => khung cao hơn => vị trí cuộn đổi => lại hiện banner...
  useEffect(() => {
    if (!embedded || window.parent === window) return;
    let collapsed = false;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0) return;
      let next = collapsed;
      if (e.deltaY > 0) next = true;
      else if (!hasScrolledAncestor(e.target as Element | null)) next = false;
      if (next === collapsed) return;
      collapsed = next;
      window.parent.postMessage({ type: MSG_HEADER, collapse: next }, window.location.origin);
    };
    window.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [embedded]);

  return null;
}
