import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import api from "../../config/api.config";
import { TK_APP_PREFIX } from "../../layout/thongkeMenu";

// Khung nhúng ứng dụng Thống kê (cùng origin, qua reverse proxy `/thong-ke/`), dùng chung
// cho trang `/tk/*` và tab "Báo cáo thống kê" trong trang Báo cáo.
//
// Đồng bộ với frontend Thống kê bằng postMessage (cùng origin) — xem `lib/embed.ts` +
// `layouts/embed-bridge.tsx` bên Thống kê:
//  - đổi `path`            -> gửi "tk:navigate" vào khung (không tải lại khung)
//  - Thống kê đổi trang    -> nhận "tk:location", báo qua `onPathChange`
//  - Thống kê xin token    -> nhận "tk:request-token", xin backend Điều phối cấp token
//    Thống kê (`GET /auth/tk-token`) rồi trả "tk:token". ĐĂNG NHẬP MỘT LẦN: Thống kê
//    không có màn đăng nhập riêng, dùng phiên Điều phối đang có.

export const MSG_NAVIGATE = "tk:navigate";
export const MSG_LOCATION = "tk:location";
export const MSG_REQUEST_TOKEN = "tk:request-token";
export const MSG_TOKEN = "tk:token";
export const MSG_TOKEN_ERROR = "tk:token-error";
export const TK_FRAME_NAME = "tk-embed";

interface Props {
  /** đường dẫn bên trong Thống kê (kèm query), vd "/nhap-lieu/van-tai" */
  path: string;
  /** Thống kê đổi trang (người dùng bấm link trong khung) */
  onPathChange?: (path: string) => void;
  /** khoảng trống chừa lại dưới khung (px) */
  bottomGap?: number;
}

const ThongKeFrame = ({ path, onPathChange, bottomGap = 0 }: Props) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lastReported = useRef(path);
  // src chỉ tính 1 lần lúc mở; các lần đổi trang sau đi qua postMessage để khung không
  // bị tải lại (giữ phiên + việc đang làm dở bên Thống kê).
  const initialSrc = useMemo(
    () => `${TK_APP_PREFIX}${path}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Chiều cao = phần còn lại của màn hình tính từ vị trí THỰC của khung (thanh menu có
  // thể xuống 2 dòng nên không dùng hằng số).
  const [height, setHeight] = useState(560);
  useLayoutEffect(() => {
    const fit = () => {
      const top = frameRef.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(480, Math.floor(window.innerHeight - top - bottomGap)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [bottomGap]);

  useEffect(() => {
    if (path === lastReported.current) return;
    lastReported.current = path;
    frameRef.current?.contentWindow?.postMessage(
      { type: MSG_NAVIGATE, path },
      window.location.origin,
    );
  }, [path]);

  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      const frameWindow = frameRef.current?.contentWindow;
      if (e.origin !== window.location.origin || !frameWindow || e.source !== frameWindow) return;

      if (e.data?.type === MSG_LOCATION && typeof e.data.path === "string") {
        if (e.data.path === lastReported.current) return;
        lastReported.current = e.data.path;
        onPathChange?.(e.data.path);
        return;
      }

      if (e.data?.type === MSG_REQUEST_TOKEN) {
        try {
          const res = await api.get("/auth/tk-token");
          frameWindow.postMessage(
            { type: MSG_TOKEN, appToken: res.data?.data?.appToken },
            window.location.origin,
          );
        } catch (err: any) {
          frameWindow.postMessage(
            {
              type: MSG_TOKEN_ERROR,
              message:
                err?.response?.data?.message ||
                "Không lấy được phiên Thống kê từ Điều phối. Hãy tải lại trang hoặc đăng nhập lại.",
            },
            window.location.origin,
          );
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onPathChange]);

  return (
    <Box>
      <iframe
        ref={frameRef}
        name={TK_FRAME_NAME}
        title="Phần mềm Thống kê"
        src={initialSrc}
        style={{ display: "block", width: "100%", height, border: 0 }}
      />
    </Box>
  );
};

export default ThongKeFrame;
