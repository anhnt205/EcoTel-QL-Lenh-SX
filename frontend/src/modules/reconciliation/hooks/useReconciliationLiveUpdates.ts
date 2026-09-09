import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client } from "@stomp/stompjs";
import { tokenService } from "@/auth/tokenService";
import { RECONCILIATION_QUERY_KEY } from "../services/reconciliation.service";

/**
 * Kênh realtime cho màn Đối chiếu — chủ dự án chốt 2026-09-10: sửa dữ liệu ở
 * Vận tải/Khai thác (hoặc duyệt/yêu cầu sửa/gửi lại ngay tại Đối chiếu) phải
 * tự cập nhật NGAY ở đây (kể cả màu dòng), không cần bấm tải lại trang.
 *
 * Chỉ nhận tín hiệu "có gì đó vừa đổi" qua WebSocket rồi gọi lại ĐÚNG API tìm
 * kiếm đã có sẵn (qua `invalidateQueries`) — KHÔNG đọc dữ liệu nghiệp vụ trực
 * tiếp từ socket. Nhờ vậy màu dòng/trạng thái vẫn tính từ đúng MỘT chỗ duy
 * nhất (`ReconciliationService.search` ở backend, đã test kỹ QĐ-18/QĐ-21) dù
 * dữ liệu tới qua bấm nút hay qua tín hiệu nền — không có đường dữ liệu thứ
 * hai nào có thể lệch màu/logic so với khi tự tải lại trang.
 *
 * <p>Kết nối tới {@code /api/ws} — CỐ Ý cùng tiền tố với API REST, đi qua
 * ĐÚNG proxy `/api/` đã có sẵn ở nginx (chỉ cần bật cờ nâng cấp WebSocket cho
 * block đó, xem `nginx_preview.conf`/`nginx_staging.conf`) — deploy server
 * thật không cần mở thêm cổng/route nào khác, không hardcode host/cổng.
 *
 * <p>Trang Đối chiếu được GIỮ SỐNG khi chuyển sang tab khác (không bị huỷ —
 * xem `keep-alive-outlet.tsx`), nên kết nối này chỉ mở đúng 1 lần lúc vào
 * trang lần đầu; quay lại tab sau đó không cần mở lại, dữ liệu đã tự cập nhật
 * ngầm ngay cả khi đang xem tab khác.
 */
export function useReconciliationLiveUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = tokenService.getAppToken();
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const client = new Client({
      brokerURL: `${protocol}//${window.location.host}/api/ws`,
      // JWT gửi trong header STOMP CONNECT (không phải header HTTP của lúc
      // bắt tay — trình duyệt không cho gắn header tuỳ ý vào đó) — xem
      // WebSocketConfig.java phía backend.
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe("/topic/reconciliation", () => {
          queryClient.invalidateQueries({ queryKey: [RECONCILIATION_QUERY_KEY] });
        });
      },
      // Mất kết nối tạm thời không cần báo ồn ào — thư viện tự nối lại theo
      // reconnectDelay; màn hình vẫn dùng bình thường trong lúc đó, chỉ tạm
      // mất phần tự động cập nhật (bấm tải lại tay vẫn ra đúng số liệu).
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [queryClient]);
}
