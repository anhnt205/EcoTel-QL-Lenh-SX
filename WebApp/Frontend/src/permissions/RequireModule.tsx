import React from "react";
import { Box, Typography } from "@mui/material";
import { useAtom } from "jotai";
import { userAtom } from "../atoms/userAtoms";
import { hasPermission, permissionMode } from "./access";
import { canSeeThongKe } from "../layout/thongkeMenu";

interface Props {
  /** khoá module (config/modules.js); "tk" = có xem ít nhất một màn Thống kê */
  module: string;
  children: React.ReactNode;
}

// Chặn mở trang bằng đường dẫn trực tiếp khi người dùng đã được cấu hình quyền mới mà không có quyền Xem.
// Người chưa cấu hình (legacy) và admin không bị ảnh hưởng — hành vi cũ giữ nguyên. Đây chỉ là lớp giao diện;
// lớp bảo vệ thật nằm ở backend (middleware/permission.js, quyền token Thống kê).
const RequireModule = ({ module, children }: Props) => {
  const [user] = useAtom(userAtom);
  if (!user) return <>{children}</>; // đang tải thông tin người dùng
  const mode = permissionMode(user);
  if (mode === "legacy" || mode === "full") return <>{children}</>;
  const ok = module === "tk" ? canSeeThongKe(user) : hasPermission(user, module, "r");
  if (ok) return <>{children}</>;
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h5" gutterBottom>
        Bạn không có quyền xem mục này
      </Typography>
      <Typography color="text.secondary">
        Liên hệ quản trị viên để được cấp quyền (Phòng ban → Chức vụ → Cán bộ nhân viên).
      </Typography>
    </Box>
  );
};

export default RequireModule;
