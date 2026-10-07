const { MODULES, MODULE_KEYS, MODULE_BY_KEY, TK_RESOURCES } = require("../config/modules");

// Quyền hiệu lực của người dùng theo mô hình Phòng ban -> Chức vụ -> Cán bộ (xem config/modules.js).
//
// Quy tắc (hàm thuần, có test):
//  1. admin: luôn toàn quyền mọi module (mode "full") — không bao giờ tự khoá mình.
//  2. Nguồn quyền: nếu cán bộ bật `customPermissions` và có `permissions` -> dùng quyền riêng của cán bộ;
//     ngược lại nếu chức vụ có `permissions` -> dùng quyền của chức vụ.
//  3. Phòng ban (của chức vụ, nếu chức vụ có phòng ban; không thì của cán bộ) giới hạn module được NHÌN THẤY:
//     nếu `allowedModules` là mảng thì mọi quyền ngoài mảng đó bị bỏ.
//  4. Không có nguồn quyền nào (chức vụ chưa cấu hình, không bật quyền riêng) -> mode "legacy": chạy theo 4 vai
//     trò cũ (admin/manager/dispatcher/employee) — người dùng đang chạy thật KHÔNG bị đổi hành vi.
//  5. Có bất kỳ C/U/D thì coi như có R (không thể sửa mà không xem).

const ACTIONS = ["c", "r", "u", "d"];
const NONE = { c: false, r: false, u: false, d: false };
const FULL = { c: true, r: true, u: true, d: true };

const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v ? String(v) : "");

/** Chuẩn hoá danh sách quyền: bỏ module lạ, gộp trùng, ép boolean, C/U/D => R. */
const normalizeRows = (rows) => {
  const out = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !MODULE_BY_KEY[row.module]) continue;
    const cur = out.get(row.module) || { ...NONE };
    for (const a of ACTIONS) cur[a] = cur[a] || row[a] === true;
    out.set(row.module, cur);
  }
  const result = [];
  for (const [module, f] of out) {
    if (f.c || f.u || f.d) f.r = true;
    if (f.c || f.r || f.u || f.d) result.push({ module, ...f });
  }
  return result;
};

/** Module không tồn tại trong danh sách (để báo lỗi 400 khi lưu). */
const unknownModules = (keys) => (Array.isArray(keys) ? keys : []).filter((k) => !MODULE_BY_KEY[k]);

/** Giữ lại các module nằm trong phạm vi phòng ban (allowed = null/undefined: không giới hạn). */
const clampRows = (rows, allowed) =>
  Array.isArray(allowed) ? normalizeRows(rows).filter((r) => allowed.includes(r.module)) : normalizeRows(rows);

const rowsToMap = (rows) => Object.fromEntries(rows.map(({ module, ...f }) => [module, f]));

const fullMap = () => Object.fromEntries(MODULE_KEYS.map((k) => [k, { ...FULL }]));

/**
 * @param user đã populate `position` và `department`
 * @returns {{ mode: "full"|"custom"|"legacy", modules: Record<string,{c,r,u,d}>, source: "admin"|"user"|"position"|null }}
 */
const effectivePermissions = (user) => {
  if (!user) return { mode: "legacy", modules: {}, source: null };
  if (user.role === "admin") return { mode: "full", modules: fullMap(), source: "admin" };

  const position = user.position && typeof user.position === "object" ? user.position : null;
  let rows = null;
  let source = null;
  if (user.customPermissions === true && Array.isArray(user.permissions)) {
    rows = user.permissions;
    source = "user";
  } else if (position && Array.isArray(position.permissions)) {
    rows = position.permissions;
    source = "position";
  }
  if (!rows) return { mode: "legacy", modules: {}, source: null };

  const isDeptDoc = (d) => d && typeof d === "object" && (d.allowedModules !== undefined || d.name !== undefined || d.code !== undefined);
  const dept = (position && isDeptDoc(position.department) && position.department) || (isDeptDoc(user.department) ? user.department : null);
  const allowed = dept && Array.isArray(dept.allowedModules) ? dept.allowedModules : null;
  return { mode: "custom", modules: rowsToMap(clampRows(rows, allowed)), source };
};

/** Người dùng có được thao tác `action` (c/r/u/d) trên module không — chỉ có nghĩa khi mode khác "legacy". */
const hasModulePermission = (eff, moduleKey, action) =>
  eff.mode === "full" || (eff.mode === "custom" && Boolean(eff.modules[moduleKey] && eff.modules[moduleKey][action]));

/**
 * Đổi quyền module sang quyền theo resource của Thống kê (mode custom). Dùng khi cấp token Thống kê.
 *  - mỗi module tk-* cấp C/R/U/D cho các resource nó điều khiển (gộp theo OR khi nhiều module chung resource);
 *  - nếu có quyền xem ít nhất 1 màn Thống kê thì được ĐỌC mọi resource Thống kê (các màn lấy danh sách thả xuống
 *    từ nhiều danh mục khác) — ghi/xoá vẫn chỉ ở resource của module được cấp;
 *  - quyền 'a' (mở khoá kỳ báo cáo) = có quyền sửa (U) ở module "Báo cáo thống kê".
 */
const toTkPermissions = (eff) => {
  const perms = {};
  for (const res of TK_RESOURCES) perms[res] = { c: false, r: false, u: false, d: false, a: false };
  if (eff.mode === "full") {
    for (const res of TK_RESOURCES) perms[res] = { c: true, r: true, u: true, d: true, a: true };
    return perms;
  }
  let anyRead = false;
  for (const [key, f] of Object.entries(eff.modules)) {
    const mod = MODULE_BY_KEY[key];
    if (!mod || !mod.tk) continue;
    if (f.r) anyRead = true;
    for (const res of mod.tk) {
      for (const a of ACTIONS) perms[res][a] = perms[res][a] || Boolean(f[a]);
    }
    if (key === "tk-stat-report" && f.u) perms["report-periods"].a = true;
  }
  if (anyRead) for (const res of TK_RESOURCES) perms[res].r = true;
  return perms;
};

/** Có quyền xem ít nhất 1 màn Thống kê (mode custom/full). */
const canAccessThongKeCustom = (eff) =>
  eff.mode === "full" ||
  (eff.mode === "custom" &&
    Object.entries(eff.modules).some(([k, f]) => MODULE_BY_KEY[k] && MODULE_BY_KEY[k].tk && f.r));

/** Thông tin trả cho giao diện (/auth/me): chế độ + quyền theo module. */
const permissionsForClient = (user) => {
  const eff = effectivePermissions(user);
  return { permissionMode: eff.mode, permissions: eff.modules, permissionSource: eff.source };
};

const PERMISSION_FIELDS = ["allowedModules", "permissions", "customPermissions"];
/** Bỏ các trường phân quyền khỏi body (dùng khi người gọi không phải admin). */
const stripPermissionFields = (body) => {
  if (!body || typeof body !== "object") return body;
  for (const f of PERMISSION_FIELDS) delete body[f];
  return body;
};

module.exports = {
  MODULES,
  ACTIONS,
  normalizeRows,
  unknownModules,
  clampRows,
  effectivePermissions,
  hasModulePermission,
  toTkPermissions,
  canAccessThongKeCustom,
  permissionsForClient,
  stripPermissionFields,
  PERMISSION_FIELDS,
  idOf,
};
