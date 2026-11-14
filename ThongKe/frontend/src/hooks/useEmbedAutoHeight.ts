import { useEffect, type RefObject } from "react";
import { isEmbedded, MSG_HEIGHT } from "@/lib/embed";

/**
 * Khi trang chạy NHÚNG trong Điều phối: báo chiều cao nội dung (phần tử `ref`) lên khung cha để cha cho iframe cao bằng
 * nội dung — nhờ vậy trang KHÔNG có thanh cuộn riêng trong khung, chỉ dùng thanh cuộn chung của trang Điều phối.
 * Chỉ đo phần tử KHÔNG có min-height theo khung (nếu không, khung cao lên => phần tử cao lên => vòng lặp).
 * Trang bị ẩn (keep-alive) có chiều cao 0 => cha hiểu là "bỏ" và trả khung về chiều cao theo màn hình.
 */
export function useEmbedAutoHeight(ref: RefObject<HTMLElement | null>, extra = 0) {
  useEffect(() => {
    if (!isEmbedded() || window.parent === window) return;
    const el = ref.current;
    if (!el) return;
    const post = (height: number) =>
      window.parent.postMessage({ type: MSG_HEIGHT, height }, window.location.origin);
    const send = () => {
      const h = el.getBoundingClientRect().height;
      post(h > 0 ? Math.ceil(h) + extra : 0);
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(el);
    return () => {
      ro.disconnect();
      post(0);
    };
  }, [ref, extra]);
}
