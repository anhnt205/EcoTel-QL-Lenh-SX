const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Position = require("../models/Position");
const Department = require("../models/Department");
const {
  effectivePermissions,
  hasModulePermission,
  normalizeRows,
  clampRows,
  unknownModules,
  stripPermissionFields,
  PERMISSION_FIELDS,
} = require("../services/permissions");

// Kiểm tra quyền MỚI (Phòng ban -> Chức vụ -> Cán bộ) ở phía máy chủ.
//
// NGUYÊN TẮC AN TOÀN cho hệ thống đang chạy + app Mobile:
//  - Chỉ áp dụng cho người ĐÃ được cấu hình quyền mới. Admin và người chưa cấu hình (mode "legacy") đi qua nguyên
//    như cũ — các `restrictTo(ROLE...)` sẵn có trong từng route vẫn là lớp kiểm tra cũ, không bị thay.
//  - Chỉ chặn các thao tác QUẢN LÝ danh mục/hệ thống (ghi) và xem Báo cáo. KHÔNG đụng vào Lệnh sản xuất, báo chuyến,
//    check-in, trạng thái thiết bị... (các API app Mobile dùng) và không chặn các lệnh ĐỌC danh sách dùng cho ô chọn.
//  - Middleware gắn ở cấp `app.use` (trước router) nên tự đọc token; token thiếu/sai thì cho qua để `verifyToken` của
//    route từ chối như trước.

const WRITE_ACTION = { POST: "c", PUT: "u", PATCH: "u", DELETE: "d" };

/** Đọc người dùng từ token (kèm chức vụ, phòng ban); null nếu không có/không hợp lệ. Cache trong request. */
const loadActor = async (req) => {
  if (req._permActor !== undefined) return req._permActor;
  req._permActor = null;
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer")) return null;
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const actor = await User.findById(decoded.userId)
      .populate("department")
      .populate({ path: "position", populate: { path: "department", select: "name code allowedModules" } });
    if (actor && actor.active !== false) req._permActor = actor;
  } catch (_) {
    // token sai/hết hạn: để verifyToken của route trả 401
  }
  return req._permActor;
};

const forbid = (res, moduleLabel, action) =>
  res.status(403).send({
    status: "error",
    message: `Bạn không có quyền ${{ c: "thêm", r: "xem", u: "sửa", d: "xoá" }[action]} ở mục "${moduleLabel}".`,
  });

/**
 * Chặn GHI (POST/PUT/PATCH/DELETE -> C/U/D) trên 1 module nếu người dùng đã được cấu hình quyền mà không có quyền đó.
 * `skip(req)` trả true thì bỏ qua (dùng cho đường dẫn con không phải quản lý, vd lưu token thông báo).
 */
const enforceWrites = (moduleKey, label, { skip } = {}) => async (req, res, next) => {
  try {
    const action = WRITE_ACTION[req.method];
    if (!action || (skip && skip(req))) return next();
    const actor = await loadActor(req);
    if (!actor) return next();
    const eff = effectivePermissions(actor);
    if (eff.mode === "legacy") return next();
    if (hasModulePermission(eff, moduleKey, action)) {
      // đã cấu hình quyền mới và CÓ quyền -> các `restrictTo(vai trò cũ)` trong route không được chặn nữa (xem auth.middleware)
      req.permissionGranted = true;
      return next();
    }
    req.logger?.warn(`⚠️ ${actor.username} bị chặn ${action} ở module ${moduleKey}`);
    return forbid(res, label, action);
  } catch (err) {
    return next(err);
  }
};

/** Chặn XEM (mọi phương thức) một nhóm API báo cáo nếu đã cấu hình quyền mà không có quyền xem. */
const enforceRead = (moduleKey, label) => async (req, res, next) => {
  try {
    const actor = await loadActor(req);
    if (!actor) return next();
    const eff = effectivePermissions(actor);
    if (eff.mode === "legacy") return next();
    if (hasModulePermission(eff, moduleKey, "r")) {
      req.permissionGranted = true;
      return next();
    }
    return forbid(res, label, "r");
  } catch (err) {
    return next(err);
  }
};

const idFromPath = (path) => {
  const m = /^\/(?:update\/)?([0-9a-fA-F]{24})\/?$/.exec(path || "");
  return m ? m[1] : null;
};
const isOid = (v) => typeof v === "string" ? mongoose.isValidObjectId(v) : mongoose.isValidObjectId(String(v || ""));

/**
 * Bảo vệ các trường phân quyền (allowedModules, permissions, customPermissions) trong body:
 *  - người gọi không phải admin: bỏ hết các trường này (không tự nâng quyền);
 *  - admin: kiểm tra module hợp lệ (400 nếu lạ), chuẩn hoá, và GIỚI HẠN theo phạm vi phòng ban
 *    (quyền của chức vụ/cán bộ không vượt ra ngoài module phòng ban được xem).
 * `null` nghĩa là "xoá cấu hình" (quay về quyền theo vai trò cũ).
 * kind: "department" | "position" | "user".
 */
const permissionFieldsGuard = (kind) => async (req, res, next) => {
  try {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();
    const body = req.body;
    if (!body || typeof body !== "object" || !PERMISSION_FIELDS.some((f) => f in body)) return next();

    const actor = await loadActor(req);
    if (!actor || actor.role !== "admin") {
      stripPermissionFields(body);
      return next();
    }

    if (body.allowedModules !== undefined && body.allowedModules !== null) {
      const bad = unknownModules(body.allowedModules);
      if (bad.length) return res.status(400).send({ status: "error", message: `Module không hợp lệ: ${bad.join(", ")}` });
      body.allowedModules = [...new Set(body.allowedModules)];
    }

    if (body.permissions !== undefined && body.permissions !== null) {
      const bad = unknownModules((Array.isArray(body.permissions) ? body.permissions : []).map((r) => r && r.module));
      if (bad.length) return res.status(400).send({ status: "error", message: `Module không hợp lệ: ${bad.join(", ")}` });

      // phạm vi phòng ban để giới hạn
      let allowed = null;
      const existingId = idFromPath(req.path);
      if (kind === "position") {
        let deptId = body.department;
        if (deptId === undefined && existingId) deptId = (await Position.findById(existingId).select("department"))?.department;
        if (deptId && isOid(deptId)) allowed = (await Department.findById(deptId).select("allowedModules"))?.allowedModules ?? null;
      } else if (kind === "user") {
        let posId = body.position;
        let deptId = body.department;
        if (existingId && (posId === undefined || deptId === undefined)) {
          const cur = await User.findById(existingId).select("position department");
          if (posId === undefined) posId = cur?.position;
          if (deptId === undefined) deptId = cur?.department;
        }
        const pos = posId && isOid(posId) ? await Position.findById(posId).select("department") : null;
        const dId = pos?.department || deptId;
        if (dId && isOid(dId)) allowed = (await Department.findById(dId).select("allowedModules"))?.allowedModules ?? null;
      }
      body.permissions = clampRows(normalizeRows(body.permissions), allowed);
    }
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { enforceWrites, enforceRead, permissionFieldsGuard, loadActor };
