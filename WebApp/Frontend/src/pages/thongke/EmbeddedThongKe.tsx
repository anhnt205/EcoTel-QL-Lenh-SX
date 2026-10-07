import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import ThongKeFrame from "../../components/thongke/ThongKeFrame";
import { TK_ROUTE_PREFIX, tkPageRoute } from "../../layout/thongkeMenu";

// Trang Điều phối chứa khung nhúng ứng dụng Thống kê. Trang nằm ở `/tk/<đường dẫn Thống
// kê>` còn khung trỏ tới `/thong-ke/<đường dẫn Thống kê>` — KHÁC tiền tố để F5 trang
// Điều phối không bị proxy trả thẳng ứng dụng Thống kê toàn trang. Logic khung (token,
// điều hướng 2 chiều) nằm ở components/thongke/ThongKeFrame.
const DEFAULT_TK_PATH = "/nhap-lieu/van-tai";

const EmbeddedThongKe = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const tkPath =
    (pathname.startsWith(TK_ROUTE_PREFIX) ? pathname.slice(TK_ROUTE_PREFIX.length) : pathname) ||
    DEFAULT_TK_PATH;
  const fullTkPath = (tkPath === "/" ? DEFAULT_TK_PATH : tkPath) + search;

  const onPathChange = useCallback((p: string) => navigate(tkPageRoute(p)), [navigate]);

  // MainLayout bọc nội dung trong padding 24px; khung chiếm phần còn lại của màn hình.
  return (
    <Box sx={{ mx: -3, mt: -3, mb: -3 }}>
      <ThongKeFrame path={fullTkPath} onPathChange={onPathChange} />
    </Box>
  );
};

export default EmbeddedThongKe;
