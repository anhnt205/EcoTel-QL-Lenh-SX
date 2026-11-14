import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import api from "../../config/api.config";
import { TK_APP_PREFIX } from "../../layout/thongkeMenu";
import { setHeaderCollapsed, useHeaderCollapsed } from "../../layout/headerCollapse";

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
/** Thống kê -> Điều phối: người dùng lăn chuột trong khung ({ collapse: true } = lăn xuống => thu banner phần mềm). */
export const MSG_HEADER = "tk:header";
/** Thống kê -> Điều phối: chiều cao nội dung trang ({ height }, <= 0 = bỏ) — khung cao bằng nội dung, chỉ cuộn bằng thanh cuộn của trang Điều phối. */
export const MSG_HEIGHT = "tk:height";
/** Thống kê -> Điều phối: xin giờ hoạt động lũy kế theo mã thiết bị; Điều phối trả MSG_DEVICE_HOURS ({ hours: { [ma]: soGio } }). */
export const MSG_REQUEST_DEVICE_HOURS = "tk:request-device-hours";
export const MSG_DEVICE_HOURS = "tk:device-hours";
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
  // Chiều cao nội dung do trang Thống kê báo (chỉ trang bật `useEmbedAutoHeight`); có thì khung cao bằng nội dung => không có thanh cuộn riêng trong khung.
  const [contentH, setContentH] = useState<number | null>(null);
  const headerCollapsed = useHeaderCollapsed();
  useLayoutEffect(() => {
    const fit = () => {
      const top = frameRef.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(480, Math.floor(window.innerHeight - top - bottomGap)));
    };
    fit();
    window.addEventListener("resize", fit);
    // Banner phần mềm co/giãn có hiệu ứng (~250ms) làm vị trí khung đổi dần => đo lại từng khung hình tới khi xong.
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      fit();
      if (performance.now() - t0 < 400) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(raf);
    };
  }, [bottomGap, headerCollapsed]);

  // Rời trang nhúng thì trả banner về như cũ cho các trang khác.
  useEffect(() => () => setHeaderCollapsed(false), []);

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

      if (e.data?.type === MSG_HEIGHT) {
        const h = Number(e.data.height);
        setContentH(Number.isFinite(h) && h > 0 ? h : null);
        return;
      }

      if (e.data?.type === MSG_REQUEST_DEVICE_HOURS) {
        // Giờ hoạt động lũy kế của thiết bị chỉ có bên Điều phối (báo cáo ca) — trả theo MÃ thiết bị cho cột của Xe/Máy bên Thống kê.
        const hours: Record<string, number> = {};
        try {
          const res = await api.get("/devices");
          for (const d of (res.data?.data ?? []) as { code?: string; cumulativeHours?: number }[]) {
            if (d?.code != null) hours[String(d.code).trim()] = Number(d.cumulativeHours ?? 0);
          }
        } catch {
          // lỗi/không đủ quyền: trả rỗng, cột để trống
        }
        frameWindow.postMessage({ type: MSG_DEVICE_HOURS, hours }, window.location.origin);
        return;
      }

      if (e.data?.type === MSG_HEADER) {
        setHeaderCollapsed(Boolean(e.data.collapse));
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
        style={{ display: "block", width: "100%", height: contentH ? Math.max(height, contentH + 4) : height, border: 0 }}
      />
    </Box>
  );
};

export default ThongKeFrame;
