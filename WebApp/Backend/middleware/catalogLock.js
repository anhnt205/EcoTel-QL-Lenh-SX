// Khoá GHI các danh mục do Thống kê quản lý (CATALOG_MASTER=thongke).
//
// Khi bật: các request làm thay đổi danh mục gốc trả 403; GET vẫn mở nguyên
// để lệnh/báo cáo/dropdown tiếp tục chạy. Khi tắt (mặc định) middleware không
// làm gì -> hành vi cũ, nên rollback chỉ cần bỏ biến môi trường.
//
// Đọc cờ MỖI request (không cache) để bật/tắt không cần khởi động lại code
// và để test đổi cờ được.

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const isCatalogMasterThongKe = () =>
  String(process.env.CATALOG_MASTER || "").trim().toLowerCase() === "thongke";

const LOCKED_MESSAGE = "Danh mục do phần mềm Thống kê quản lý, không sửa trực tiếp ở Điều phối";

/** Khoá mọi request ghi (đơn vị, chức vụ, ca, phân loại/chủng loại thiết bị). */
function lockCatalogWrites(req, res, next) {
  if (!isCatalogMasterThongKe() || READ_METHODS.has(req.method)) return next();
  // Xuất file là POST nhưng chỉ đọc dữ liệu -> không khoá.
  if (req.method === "POST" && /^\/exportFile\/?$/.test(req.path)) return next();
  return res.status(403).send({ status: "error", message: LOCKED_MESSAGE });
}

// Thiết bị: Điều phối vẫn tự ghi phần VẬN HÀNH (trạng thái, file đính kèm,
// toạ độ) nên chỉ khoá các thao tác sửa danh mục gốc: tạo, xoá, nhập file và
// đồng bộ trực tiếp từ Tài sản (nguồn gốc đã chuyển qua Thống kê).
const DEVICE_LOCKED = [
  { method: "POST", path: /^\/?$/ },
  { method: "DELETE", path: /^\/?$/ },
  { method: "POST", path: /^\/importFile\/?$/ },
  { method: "POST", path: /^\/sync-from-taisan\/?$/ },
];

// PUT /api/devices/:id là form sửa dùng chung cho cả danh mục lẫn vận hành
// (toạ độ, ghi chú, trạng thái). Khi khoá không chặn hẳn mà chỉ GIỮ LẠI field
// vận hành — field danh mục gốc (tên, mã, loại, đơn vị...) bị bỏ.
const DEVICE_OPERATIONAL_FIELDS = ["coordinates", "note", "status"];
const DEVICE_PUT = /^\/[^/]+\/?$/;
// Các đường PUT/POST con khác có tên cố định không được hiểu nhầm là ":id"
const DEVICE_NON_ID = /^\/(update_status|importFile|exportFile|sync-from-taisan)\/?$/;

/** Khoá thao tác sửa danh mục gốc của thiết bị, giữ nguyên phần vận hành. */
function lockDeviceCatalogWrites(req, res, next) {
  if (!isCatalogMasterThongKe() || READ_METHODS.has(req.method)) return next();
  if (DEVICE_LOCKED.some((r) => r.method === req.method && r.path.test(req.path))) {
    return res.status(403).send({ status: "error", message: LOCKED_MESSAGE });
  }
  if (req.method === "PUT" && DEVICE_PUT.test(req.path) && !DEVICE_NON_ID.test(req.path)) {
    const body = req.body || {};
    req.body = Object.fromEntries(
      DEVICE_OPERATIONAL_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
    );
  }
  return next();
}

module.exports = { lockCatalogWrites, lockDeviceCatalogWrites, isCatalogMasterThongKe, LOCKED_MESSAGE };
