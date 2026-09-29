import { useEffect, useRef, useState } from "react";
import { useModalWindowStore } from "@/stores/useModalWindowStore";

/**
 * Logic DÙNG CHUNG cho 3 nút Thu nhỏ/Phóng to/Đóng — mọi modal trong app gọi
 * đúng 1 hook này thay vì tự cài đặt riêng, để hành vi (và cách hiện thanh
 * thu nhỏ) nhất quán toàn app. Xem `useModalWindowStore` cho ý nghĩa "thu
 * nhỏ" trong ngữ cảnh web.
 *
 * @param windowTitle Tên hiện trên thanh thu nhỏ khi modal này bị thu nhỏ.
 * @param isOpen Modal đang thật sự mở hay không — thu nhỏ/phóng to tự reset
 *   về mặc định khi modal đóng lại, để lần mở SAU không bị dính trạng thái
 *   của lần mở trước (mở modal mới luôn bắt đầu ở kích thước bình thường).
 */
export function useModalWindowControls(windowTitle: string, isOpen: boolean) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const idRef = useRef(`modal-window-${Math.random().toString(36).slice(2)}`);
  const register = useModalWindowStore((s) => s.register);
  const unregister = useModalWindowStore((s) => s.unregister);

  const minimize = () => {
    setIsMinimized(true);
    register({
      id: idRef.current,
      title: windowTitle,
      restore: () => {
        setIsMinimized(false);
        unregister(idRef.current);
      },
    });
  };

  // Modal đóng hẳn (không phải thu nhỏ) thì dọn sạch: bỏ khỏi thanh thu nhỏ
  // nếu có, và reset phóng to/thu nhỏ để lần mở sau bắt đầu sạch sẽ.
  useEffect(() => {
    if (!isOpen) {
      unregister(idRef.current);
      setIsMinimized(false);
      setIsMaximized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Modal bị unmount hẳn trong lúc đang thu nhỏ (hiếm — ví dụ component cha
  // gỡ bỏ vì lý do khác) — dọn khỏi thanh, tránh thanh treo 1 mục không bấm
  // vào được nữa (bấm vào gọi setState trên component đã unmount).
  useEffect(() => () => unregister(idRef.current), [unregister]);

  return { isMaximized, setIsMaximized, isMinimized, minimize };
}
