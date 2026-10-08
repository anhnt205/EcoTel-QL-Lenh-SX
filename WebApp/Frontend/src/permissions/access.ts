// Phân quyền theo Phòng ban -> Chức vụ -> Cán bộ — phía giao diện. Logic gốc nằm ở backend
// (services/permissions.js); đây chỉ đọc kết quả backend trả trong /auth/me:
//   permissionMode: "full" (admin) | "custom" (đã cấu hình quyền mới) | "legacy" (chưa cấu hình)
//   permissions:    { [module]: { c, r, u, d } }
// Người chưa cấu hình (legacy) chạy theo 4 vai trò cũ như trước đây.

export type PermAction = "c" | "r" | "u" | "d";

export interface PermRow {
  module: string;
  c: boolean;
  r: boolean;
  u: boolean;
  d: boolean;
}

export interface ModuleDef {
  key: string;
  label: string;
  group: string;
  /** vai trò thấy module khi chưa cấu hình quyền mới (hành vi cũ) */
  legacy: string[];
}

export const permissionMode = (user: any): "full" | "custom" | "legacy" =>
  user?.permissionMode === "full" || user?.permissionMode === "custom"
    ? user.permissionMode
    : "legacy";

/** Có được `action` trên module không — chỉ dùng khi mode khác legacy. */
export const hasPermission = (user: any, key: string, action: PermAction): boolean => {
  const mode = permissionMode(user);
  if (mode === "full") return true;
  if (mode === "custom") return Boolean(user?.permissions?.[key]?.[action]);
  return false;
};

/**
 * Module có hiện trên menu / mở được không.
 *  - chưa cấu hình quyền mới: theo vai trò cũ (`legacyRoles`);
 *  - đã cấu hình (custom): theo quyền Xem (R) của module;
 *  - admin (full): giữ đúng menu cũ theo vai trò (không tự hiện thêm mục mà admin trước đây không thấy).
 */
export const allowModule = (user: any, key: string, legacyRoles: readonly string[]): boolean =>
  permissionMode(user) === "custom"
    ? hasPermission(user, key, "r")
    : legacyRoles.includes(user?.role); // legacy và admin (full): giữ đúng menu cũ theo vai trò

/**
 * Có được thêm/sửa/xoá không: chưa cấu hình thì giữ quyết định cũ của trang (`legacyAllowed`), đã cấu hình thì theo C/U/D.
 */
export const allowAction = (
  user: any,
  key: string,
  action: PermAction,
  legacyAllowed: boolean,
): boolean => (permissionMode(user) === "legacy" ? legacyAllowed : hasPermission(user, key, action));

export const rowsToMap = (rows?: PermRow[] | null): Record<string, PermRow> =>
  Object.fromEntries((rows || []).map((r) => [r.module, r]));

/** Bật C/U/D thì tự bật R; tắt R thì tắt cả C/U/D. */
export const setAction = (row: PermRow, action: PermAction, on: boolean): PermRow => {
  const next = { ...row, [action]: on };
  if (action === "r" && !on) {
    next.c = false;
    next.u = false;
    next.d = false;
  }
  if (action !== "r" && on) next.r = true;
  return next;
};

export const emptyRow = (module: string): PermRow => ({ module, c: false, r: false, u: false, d: false });
export const hasAny = (r?: PermRow) => Boolean(r && (r.c || r.r || r.u || r.d));

/**
 * Module luôn hiện với người chưa cấu hình (Tổng quan, Lệnh sản xuất — mọi vai trò đều thấy), còn người đã được
 * cấu hình quyền mới thì theo quyền Xem.
 */
export const showModule = (user: any, key: string): boolean =>
  permissionMode(user) === "custom" ? hasPermission(user, key, "r") : true;
