import React from "react";
import { Alert, Box, FormControlLabel, Switch, Typography } from "@mui/material";
import PermissionMatrix from "./PermissionMatrix";
import { PermRow } from "../../permissions/access";

interface Props {
  /** chức vụ đang chọn của cán bộ (đủ trường permissions, department) */
  position?: any;
  /** phòng ban của cán bộ (đủ allowedModules) — dùng khi chức vụ chưa có phòng ban */
  userDepartment?: any;
  /** phòng ban của chức vụ (đủ allowedModules) */
  positionDepartment?: any;
  customPermissions: boolean;
  rows: PermRow[];
  onChange: (next: { customPermissions: boolean; permissions: PermRow[] | undefined }) => void;
}

// Phần phân quyền trong form Cán bộ nhân viên:
//  - chọn chức vụ -> ăn theo quyền của chức vụ (hiện bảng chỉ-xem);
//  - bật "chỉnh quyền riêng" -> chỉnh C/R/U/D cho riêng tài khoản này (khởi tạo từ quyền chức vụ).
// Phạm vi chọn luôn nằm trong chức năng phòng ban được xem.
const UserPermissionSection = ({
  position,
  userDepartment,
  positionDepartment,
  customPermissions,
  rows,
  onChange,
}: Props) => {
  const scope = positionDepartment?.allowedModules ?? userDepartment?.allowedModules ?? null;
  const positionRows: PermRow[] | null = Array.isArray(position?.permissions) ? position.permissions : null;
  const positionConfigured = positionRows !== null;

  const toggleCustom = (on: boolean) => {
    if (on) {
      // lần đầu bật: lấy quyền chức vụ làm điểm xuất phát
      onChange({ customPermissions: true, permissions: rows.length ? rows : positionRows ? [...positionRows] : [] });
    } else {
      onChange({ customPermissions: false, permissions: undefined });
    }
  };

  return (
    <Box sx={{ border: "1px solid #e5e9f0", borderRadius: 1, p: 2 }}>
      <Typography fontWeight={700}>Phân quyền chức năng</Typography>
      {!position && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Chọn chức vụ để cán bộ ăn theo quyền của chức vụ. Chưa có chức vụ: theo vai trò cũ.
        </Alert>
      )}
      {position && !positionConfigured && !customPermissions && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Chức vụ "{position.name}" chưa được phân quyền chức năng — cán bộ này vẫn theo vai trò cũ. Có thể bật
          "chỉnh quyền riêng" bên dưới để cấp quyền riêng cho tài khoản.
        </Alert>
      )}
      <FormControlLabel
        sx={{ mt: 1, display: "block" }}
        control={<Switch checked={customPermissions} onChange={(_, on) => toggleCustom(on)} />}
        label="Chỉnh quyền riêng cho tài khoản này (không ăn theo chức vụ)"
      />
      {(customPermissions || positionConfigured) && (
        <>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
            {customPermissions
              ? "Quyền riêng của tài khoản (Thêm / Xem / Sửa / Xoá theo từng chức năng)."
              : `Đang ăn theo quyền của chức vụ "${position?.name}" (chỉ xem — muốn đổi, sửa ở trang Chức vụ hoặc bật quyền riêng).`}
          </Typography>
          <PermissionMatrix
            value={customPermissions ? rows : positionRows || []}
            readOnly={!customPermissions}
            allowedKeys={scope}
            onChange={(next) => onChange({ customPermissions: true, permissions: next })}
          />
        </>
      )}
    </Box>
  );
};

export default UserPermissionSection;
