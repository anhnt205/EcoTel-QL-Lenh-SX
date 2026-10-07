const jwt = require("jsonwebtoken");

// Đăng nhập MỘT LẦN ở Điều phối: sau khi người dùng đã đăng nhập Điều phối, backend
// Điều phối cấp cho khung Thống kê một token mà Thống kê chấp nhận, nên khung nhúng
// không hiện màn đăng nhập riêng.
//
// Thống kê (AUTH_MODE=standalone) xác thực HOÀN TOÀN bằng claim trong JWT HS256 ký bằng
// AUTH_JWT_SECRET — không tra bảng người dùng, không khoá ngoại (xem AppTokenFilter,
// LocalAuthService.buildToken bên THONGKE-CAOSON). Vì vậy chỉ cần dựng đúng bộ claim đó.
//
// ĐIỂM CẦN BIẾT VỀ BẢO MẬT: backend Điều phối giữ cùng khoá ký với Thống kê
// (TK_AUTH_JWT_SECRET = AUTH_JWT_SECRET của Thống kê) nên nếu Điều phối bị chiếm quyền
// thì có thể cấp token Thống kê tuỳ ý. Hai hệ thống cùng một tổ chức nên chấp nhận được,
// nhưng khoá chỉ được đặt trong biến môi trường, KHÔNG commit.
//
// Quyền Thống kê suy từ VAI TRÒ Điều phối (bảng dưới) — đây là CHÍNH SÁCH, cần chủ dự
// án xác nhận; sửa ở đây là đổi được cho cả hệ thống.

// Danh sách resource khớp PermissionResources.ALL bên Thống kê.
const TK_RESOURCES = [
  "users", "departments", "positions", "shifts", "locations", "devices", "device-types",
  "materials", "cargo-groups", "cargo-types", "excavation-reports", "transport-reports",
  "reconciliation", "acceptance-products", "classifications", "coefficients",
  "density-parameters", "device-production-attributes", "excavation-areas", "matrix-catalogs",
  "model-periods", "pickup-points", "production", "receiving-points", "report-periods",
  "seam-groups", "survey-standards", "ttl-clh-items", "unloading-points",
  "vehicle-category-classes", "vehicle-fuel-classes", "vehicle-rank-groups", "vehicle-ranks",
  "vehicle-types",
];

// Các resource NHẬP LIỆU hằng ngày (người vận hành thao tác), khác danh mục gốc.
const ENTRY_RESOURCES = ["excavation-reports", "transport-reports", "reconciliation"];

const NONE = { c: false, r: false, u: false, d: false, a: false };
const READ = { ...NONE, r: true };

// Vai trò Điều phối được vào Thống kê. Nhân viên (employee) KHÔNG được.
//  - admin: toàn quyền (kể cả danh mục gốc, mở khoá kỳ báo cáo = quyền 'a').
//  - manager: xem tất cả; nhập liệu đầy đủ (thêm/sửa/xoá) trên các màn nhập liệu.
//  - dispatcher: xem tất cả; nhập liệu thêm/sửa, không xoá.
// Danh mục gốc chỉ admin được sửa (Thống kê là nơi quản lý danh mục).
const ROLE_RULES = {
  admin: () => ({ c: true, r: true, u: true, d: true, a: true }),
  manager: (res) => (ENTRY_RESOURCES.includes(res) ? { c: true, r: true, u: true, d: true, a: false } : READ),
  dispatcher: (res) => (ENTRY_RESOURCES.includes(res) ? { c: true, r: true, u: true, d: false, a: false } : READ),
};

const canAccessThongKe = (role) => Object.prototype.hasOwnProperty.call(ROLE_RULES, role);

function permissionsFor(role) {
  const rule = ROLE_RULES[role];
  const perms = {};
  for (const res of TK_RESOURCES) perms[res] = rule ? { ...rule(res) } : { ...NONE };
  return perms;
}

// Thống kê đọc `sub` bằng Long.parseLong -> phải là số. Lấy 12 ký tự hex cuối của
// ObjectId (48 bit, an toàn trong Long và trong số nguyên chính xác của JS). Không dùng
// làm khoá ngoại ở đâu (xem ReportPeriodAudit) nên chỉ cần ổn định theo người dùng.
const numericSub = (id) => {
  const n = parseInt(String(id).slice(-12), 16);
  return Number.isFinite(n) ? n : 0;
};

const TTL_SECONDS = 8 * 3600; // khớp access-token-ttl mặc định của Thống kê

/**
 * Dựng claim token Thống kê cho 1 người dùng Điều phối (đã populate `department`).
 *  - Đơn vị: lấy `externalTkId` của đơn vị Điều phối (đã gắn khi đồng bộ danh mục). Quản lý
 *    (manager) bị lọc dữ liệu theo đơn vị đó; admin + điều độ viên thấy toàn bộ
 *    (fullDataScope) giống cách Điều phối đang cho họ xem mọi đơn vị.
 *  - Quản lý mà đơn vị chưa gắn với Thống kê -> departmentId null -> Thống kê coi là
 *    "chưa có phạm vi" và KHÔNG cho xem dữ liệu gắn đơn vị (fail-closed, đúng ý của Thống kê).
 */
function buildTkClaims(user, nowSec = Math.floor(Date.now() / 1000), appCode = "tkcs") {
  const tkDept = Number(user.department?.externalTkId);
  return {
    sub: String(numericSub(user._id)),
    username: user.username,
    fullName: user.fullName || user.username,
    companyId: null,
    app: appCode,
    typ: "access",
    permissions: permissionsFor(user.role),
    departmentId: Number.isFinite(tkDept) ? tkDept : null,
    fullDataScope: user.role === "admin" || user.role === "dispatcher",
    iat: nowSec,
    exp: nowSec + TTL_SECONDS,
  };
}

function signTkToken(user, secret, opts = {}) {
  if (!secret) throw new Error("Chưa cấu hình TK_AUTH_JWT_SECRET");
  const claims = buildTkClaims(user, opts.nowSec, opts.appCode || process.env.TK_APP_CODE || "tkcs");
  return { token: jwt.sign(claims, secret, { algorithm: "HS256", noTimestamp: true }), expiresIn: TTL_SECONDS };
}

module.exports = { TK_RESOURCES, ENTRY_RESOURCES, permissionsFor, canAccessThongKe, buildTkClaims, signTkToken };
