// Danh sách MODULE (chức năng) dùng cho phân quyền theo Phòng ban -> Chức vụ -> Cán bộ.
//
//  - Phòng ban chọn module nào được NHÌN THẤY (Department.allowedModules).
//  - Chức vụ thuộc 1 phòng ban, tick C/R/U/D cho từng module trong phạm vi phòng ban (Position.permissions).
//  - Cán bộ ăn theo chức vụ; bật "quyền riêng" thì chỉnh C/R/U/D riêng (User.customPermissions + permissions).
//
// Mỗi module = 1 mục trên menu / 1 màn hình. Module `tk-*` là các màn của phần mềm Thống kê: quyền của chúng
// được đổi thành quyền theo resource của Thống kê khi cấp token (xem services/tkToken.js), `tk` liệt kê các
// resource của Thống kê mà module đó điều khiển.
//
// `legacy`: vai trò được thấy module khi người dùng CHƯA được cấu hình quyền mới — giữ đúng hành vi cũ của
// menu theo 4 vai trò (admin/manager/dispatcher/employee). Người chưa cấu hình luôn chạy theo bảng này.

const ADM = ["admin", "manager"];
const ADM_DISP = ["admin", "manager", "dispatcher"];
const ALL = ["admin", "manager", "dispatcher", "employee"];

const G_OPS = "Điều hành";
const G_TK_ENTRY = "Thống kê — nhập liệu & báo cáo";
const G_MATERIAL = "Danh mục — Vật liệu, hàng hoá";
const G_LOCATION = "Danh mục — Vị trí";
const G_DEVICE = "Danh mục — Thiết bị";
const G_STD = "Danh mục — Số trắc địa (STD)";
const G_OTHER = "Danh mục — Khác";
const G_SYSTEM = "Danh mục — Hệ thống";
const G_DPMM = "Giao ca & vận hành (Điều phối)";

const m = (key, label, group, legacy, tk) => ({ key, label, group, legacy, ...(tk ? { tk } : {}) });

const MODULES = [
  // --- Điều hành ---
  m("dashboard", "Tổng quan", G_OPS, ALL),
  m("orders", "Lệnh sản xuất", G_OPS, ALL),
  m("my-tasks", "Công việc của tôi", G_OPS, ["manager"]),
  m("reports", "Tổng hợp báo cáo", G_OPS, ADM_DISP),
  m("system", "Hệ thống", G_OPS, ["admin"]),

  // --- Thống kê: nhập liệu & báo cáo ---
  m("tk-entry-mining", "Nhập liệu Khai thác", G_TK_ENTRY, ADM_DISP, ["excavation-reports"]),
  m("tk-entry-transport", "Nhập liệu Vận tải", G_TK_ENTRY, ADM_DISP, ["transport-reports"]),
  m("tk-reconciliation", "Đối chiếu", G_TK_ENTRY, ADM_DISP, ["reconciliation"]),
  m("tk-fuel-norm", "Định mức nhiên liệu", G_TK_ENTRY, ADM_DISP, ["matrix-catalogs"]),
  m("tk-survey", "Áp Trắc Địa", G_TK_ENTRY, ADM_DISP, ["production"]),
  m("tk-stat-report", "Thống kê sản lượng (tính sản lượng, chốt kỳ)", G_TK_ENTRY, ADM_DISP, ["production", "report-periods"]),

  // --- Danh mục: Vật liệu, hàng hoá ---
  m("tk-cargo-types", "Chủng loại hàng", G_MATERIAL, ADM_DISP, ["cargo-types"]),
  m("tk-cargo-groups", "Nhóm chủng loại hàng", G_MATERIAL, ADM_DISP, ["cargo-groups"]),
  m("tk-acceptance-products", "Sản phẩm nghiệm thu", G_MATERIAL, ADM_DISP, ["acceptance-products"]),
  m("materials", "Vật liệu — tỷ trọng (Điều phối)", G_MATERIAL, ADM),

  // --- Danh mục: Vị trí ---
  m("tk-receiving-points", "Nơi nhận tải", G_LOCATION, ADM_DISP, ["receiving-points"]),
  m("tk-unloading-points", "Nơi dỡ tải", G_LOCATION, ADM_DISP, ["unloading-points"]),
  m("tk-pickup-points", "Nơi chất tải", G_LOCATION, ADM_DISP, ["pickup-points"]),
  m("tk-excavation-areas", "Khu vực xúc", G_LOCATION, ADM_DISP, ["excavation-areas"]),
  m("locations", "Điểm đổ tải — khoảng cách, toạ độ (Điều phối)", G_LOCATION, ADM),

  // --- Danh mục: Thiết bị ---
  m("tk-devices-vehicle", "Thông tin xe", G_DEVICE, ADM_DISP, ["devices"]),
  m("tk-devices-machine", "Thông tin máy", G_DEVICE, ADM_DISP, ["devices"]),
  m("tk-vehicle-types", "Chủng loại xe", G_DEVICE, ADM_DISP, ["vehicle-types"]),
  m("tk-vehicle-rank-groups", "Nhóm hạng xe", G_DEVICE, ADM_DISP, ["vehicle-rank-groups"]),
  m("tk-vehicle-ranks", "Hạng xe", G_DEVICE, ADM_DISP, ["vehicle-ranks"]),
  m("device-vehicles", "Xe — trạng thái, vị trí (Điều phối)", G_DEVICE, ADM_DISP),
  m("device-machines", "Máy — trạng thái, vị trí (Điều phối)", G_DEVICE, ADM_DISP),

  // --- Danh mục: STD ---
  m("tk-std-industrial", "STD (Đất CN)", G_STD, ADM_DISP, ["survey-standards"]),
  m("tk-std-production", "STD (Đất SX/Than SX)", G_STD, ADM_DISP, ["survey-standards"]),

  // --- Danh mục: Khác ---
  m("tk-ttl-clh", "TTL CLH", G_OTHER, ADM_DISP, ["ttl-clh-items"]),
  m("tk-seam-groups", "Nhóm vỉa", G_OTHER, ADM_DISP, ["seam-groups"]),
  m("tk-fuel-classes", "Chủng loại xe + DMNL", G_OTHER, ADM_DISP, ["vehicle-fuel-classes"]),
  m("tk-coefficients", "Hệ số", G_OTHER, ADM_DISP, ["coefficients"]),
  m("tk-report-periods", "Kỳ báo cáo", G_OTHER, ADM_DISP, ["report-periods"]),
  m("tk-model-periods", "Mô hình", G_OTHER, ADM_DISP, ["model-periods"]),
  m("tk-matrix-996", "Năng suất xe (996)", G_OTHER, ADM_DISP, ["matrix-catalogs"]),
  m("tk-matrix-nldm", "HS điều chỉnh NLĐM", G_OTHER, ADM_DISP, ["matrix-catalogs"]),
  m("tk-density", "Tỷ trọng", G_OTHER, ADM_DISP, ["density-parameters"]),
  m("tk-attrs-vehicle", "Thuộc tính sản lượng — Xe", G_OTHER, ADM_DISP, ["device-production-attributes"]),
  m("tk-attrs-machine", "Thuộc tính sản lượng — Máy xúc", G_OTHER, ADM_DISP, ["device-production-attributes"]),
  m("tk-shifts", "Ca làm việc", G_OTHER, ADM_DISP, ["shifts"]),

  // --- Danh mục: Hệ thống (do Điều phối quản lý hẳn) ---
  m("departments", "Phòng ban", G_SYSTEM, ADM_DISP),
  m("positions", "Chức vụ", G_SYSTEM, ADM),
  m("users", "Cán bộ nhân viên", G_SYSTEM, ADM_DISP),

  // --- Giao ca & vận hành (chỉ có ở Điều phối) ---
  m("jobs", "Công việc", G_DPMM, ADM),
  m("safety-measures", "Biện pháp an toàn", G_DPMM, ADM),
  m("travel-logs", "Cung độ", G_DPMM, ADM),
  m("models", "Mô hình xe", G_DPMM, ADM_DISP),
];

const MODULE_KEYS = MODULES.map((x) => x.key);
const MODULE_BY_KEY = Object.fromEntries(MODULES.map((x) => [x.key, x]));

// Toàn bộ resource của Thống kê (khớp PermissionResources.ALL bên Thống kê).
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

const isTkModule = (key) => key.startsWith("tk-");

module.exports = { MODULES, MODULE_KEYS, MODULE_BY_KEY, TK_RESOURCES, isTkModule, ADM, ADM_DISP, ALL };
