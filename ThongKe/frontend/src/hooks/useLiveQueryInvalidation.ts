import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Client } from "@stomp/stompjs";
import { tokenService } from "@/auth/tokenService";

/**
 * Kênh realtime DÙNG CHUNG cho mọi trang cần tự cập nhật khi Đối chiếu có
 * biến động (duyệt / yêu cầu chỉnh sửa / gửi lại) hoặc khi Vận tải/Khai thác
 * tự sửa dữ liệu của mình — chủ dự án chốt 2026-09-10, mở rộng 2026-09-10
 * (lượt 2): ban đầu chỉ áp cho màn Đối chiếu, nhưng Vận tải/Khai thác cũng
 * phải THẤY NGAY trạng thái "Cần sửa" mới nhất từ Đối chiếu mà không cần bấm
 * tải lại trang.
 *
 * Chỉ nhận tín hiệu "có gì đó vừa đổi" qua WebSocket rồi gọi lại ĐÚNG API
 * tìm kiếm đã có sẵn của TỪNG trang (qua `invalidateQueries`) — KHÔNG đọc dữ
 * liệu nghiệp vụ trực tiếp từ socket, để trạng thái/màu vẫn luôn tính từ một
 * chỗ duy nhất dù tới do bấm nút hay do tín hiệu nền.
 *
 * <p>Kết nối tới {@code /api/ws} — cùng tiền tố với API REST, đi qua đúng
 * proxy `/api/` đã có sẵn ở nginx, không cần mở thêm cổng/route khi deploy.
 *
 * @param queryKeys Danh sách `queryKey` (react-query) cần invalidate mỗi khi
 *   backend báo `/topic/reconciliation` có thay đổi. Mỗi trang tự truyền
 *   đúng key của mình — hook này không biết trước trang nào cần key nào.
 */
export function useLiveQueryInvalidation(queryKeys: QueryKey[]) {
  const queryClient = useQueryClient();
  // Backend chỉ phát 1 tín hiệu chung (không kèm chi tiết đổi gì), nên so
  // sánh bằng JSON để tránh effect chạy lại mỗi lần component re-render với
  // 1 mảng object MỚI nhưng nội dung y hệt (tránh đóng/mở lại kết nối thừa).
  const queryKeysSignature = JSON.stringify(queryKeys);

  useEffect(() => {
    const token = tokenService.getAppToken();
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Lấy theo VITE_API_KONG_URL (vd "/api" khi chạy độc lập, "/tk-api/api" khi
    // nhúng dưới Điều phối) thay vì hardcode "/api" — hardcode sẽ rơi vào
    // backend của Điều phối khi cùng domain. Mặc định "/api" = hành vi cũ.
    const apiBase = (import.meta.env.VITE_API_KONG_URL || "/api").replace(/\/+$/, "");
    const wsBase = /^https?:\/\//i.test(apiBase)
      ? apiBase.replace(/^http/i, "ws")
      : `${protocol}//${window.location.host}${apiBase}`;
    const client = new Client({
      brokerURL: `${wsBase}/ws`,
      // JWT gửi trong header STOMP CONNECT (không phải header HTTP lúc bắt
      // tay — trình duyệt không cho gắn header tuỳ ý vào đó) — xem
      // WebSocketConfig.java phía backend.
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe("/topic/reconciliation", () => {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, queryKeysSignature]);
}
