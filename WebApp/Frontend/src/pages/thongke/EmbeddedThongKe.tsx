import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import {
  TK_APP_PREFIX,
  TK_ROUTE_PREFIX,
  tkPageRoute,
} from "../../layout/thongkeMenu";

// Trang Điều phối chứa khung nhúng ứng dụng Thống kê (cùng domain, qua reverse
// proxy `/thong-ke/`). Trang Điều phối nằm ở `/tk/<đường dẫn Thống kê>` còn
// khung trỏ tới `/thong-ke/<đường dẫn Thống kê>` — KHÁC tiền tố để F5 trang
// Điều phối không bị proxy trả thẳng ứng dụng Thống kê toàn trang.
//
// Đồng bộ hai chiều bằng postMessage (cùng origin), xem frontend Thống kê
// `lib/embed.ts` + `layouts/embed-bridge.tsx`:
//  - bấm menu Điều phối  -> gửi "tk:navigate" vào khung (không tải lại khung)
//  - đổi trang trong khung -> nhận "tk:location", cập nhật URL Điều phối
// Tài khoản Thống kê riêng: lần đầu khung hiện màn đăng nhập của Thống kê.

const MSG_NAVIGATE = "tk:navigate";
const MSG_LOCATION = "tk:location";
export const TK_FRAME_NAME = "tk-embed";
const DEFAULT_TK_PATH = "/nhap-lieu/van-tai";

const EmbeddedThongKe = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const tkPath =
    (pathname.startsWith(TK_ROUTE_PREFIX)
      ? pathname.slice(TK_ROUTE_PREFIX.length)
      : pathname) || DEFAULT_TK_PATH;
  const fullTkPath = (tkPath === "/" ? DEFAULT_TK_PATH : tkPath) + search;

  // src chỉ tính 1 lần lúc mở; các lần đổi trang sau đi qua postMessage để khung
  // không bị tải lại (giữ phiên đăng nhập + việc đang làm dở bên Thống kê).
  const initialSrc = useMemo(
    () => `${TK_APP_PREFIX}${fullTkPath}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const lastReported = useRef(fullTkPath);

  // Chiều cao khung = phần còn lại của màn hình tính từ vị trí THỰC của khung: thanh menu
  // có thể xuống 2 dòng nên không dùng hằng số.
  const [height, setHeight] = useState(560);
  useLayoutEffect(() => {
    const fit = () => {
      const top = frameRef.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(480, Math.floor(window.innerHeight - top)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (fullTkPath === lastReported.current) return;
    lastReported.current = fullTkPath;
    frameRef.current?.contentWindow?.postMessage(
      { type: MSG_NAVIGATE, path: fullTkPath },
      window.location.origin,
    );
  }, [fullTkPath]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type !== MSG_LOCATION || typeof e.data.path !== "string") return;
      const path: string = e.data.path;
      if (path === lastReported.current) return;
      lastReported.current = path;
      navigate(tkPageRoute(path), { replace: false });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  return (
    // MainLayout bọc nội dung trong padding 24px; khung chiếm phần còn lại của màn hình.
    <Box sx={{ mx: -3, mt: -3, mb: -3 }}>
      <iframe
        ref={frameRef}
        name={TK_FRAME_NAME}
        title="Phần mềm Thống kê"
        src={initialSrc}
        style={{
          display: "block",
          width: "100%",
          height,
          border: 0,
        }}
      />
    </Box>
  );
};

export default EmbeddedThongKe;
