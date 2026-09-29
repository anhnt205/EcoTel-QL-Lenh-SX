import { useLiveQueryInvalidation } from "@/hooks/useLiveQueryInvalidation";
import { RECONCILIATION_QUERY_KEY } from "../services/reconciliation.service";

/**
 * Kênh realtime cho màn Đối chiếu — chủ dự án chốt 2026-09-10: sửa dữ liệu ở
 * Vận tải/Khai thác (hoặc duyệt/yêu cầu sửa/gửi lại ngay tại Đối chiếu) phải
 * tự cập nhật NGAY ở đây (kể cả màu dòng), không cần bấm tải lại trang.
 *
 * Chỉ còn là lớp mỏng gọi {@link useLiveQueryInvalidation} dùng chung (tách
 * ra 2026-09-10 lượt 2 để Vận tải/Khai thác dùng lại đúng 1 cơ chế WebSocket,
 * không cần 2 kết nối riêng biệt tới cùng 1 topic).
 *
 * <p>Trang Đối chiếu được GIỮ SỐNG khi chuyển sang tab khác (không bị huỷ —
 * xem `keep-alive-outlet.tsx`), nên kết nối này chỉ mở đúng 1 lần lúc vào
 * trang lần đầu; quay lại tab sau đó không cần mở lại, dữ liệu đã tự cập nhật
 * ngầm ngay cả khi đang xem tab khác.
 */
export function useReconciliationLiveUpdates() {
  useLiveQueryInvalidation([[RECONCILIATION_QUERY_KEY]]);
}
