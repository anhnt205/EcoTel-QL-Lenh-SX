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


// Các danh mục MỘT PHẦN do Thống kê quản lý (thiết bị, vật liệu, điểm đổ tải): Điều
// phối vẫn tự ghi phần VẬN HÀNH nên không chặn hẳn mà:
//   - khoá các thao tác tạo/xoá/nhập file (và sync trực tiếp từ Tài sản với thiết bị);
//   - PUT /:id (form sửa dùng chung cả phần gốc lẫn vận hành) chỉ GIỮ LẠI field vận
//     hành, field danh mục gốc (tên, mã, loại...) bị bỏ.
const PUT_ID = /^\/[^/]+\/?$/;

function partialLock({ locked, putKeep, nonId }) {
  return function partialCatalogLock(req, res, next) {
    if (!isCatalogMasterThongKe() || READ_METHODS.has(req.method)) return next();
    if (locked.some((r) => r.method === req.method && r.path.test(req.path))) {
      return res.status(403).send({ status: "error", message: LOCKED_MESSAGE });
    }
    if (req.method === "PUT" && PUT_ID.test(req.path) && !nonId.test(req.path)) {
      const body = req.body || {};
      req.body = Object.fromEntries(putKeep.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
    }
    return next();
  };
}

const COMMON_LOCKED = [
  { method: "POST", path: /^\/?$/ },
  { method: "DELETE", path: /^\/?$/ },
  { method: "POST", path: /^\/importFile\/?$/ },
];
// Đường có tên cố định không được hiểu nhầm là ":id"
const COMMON_NON_ID = "update_status|importFile|exportFile|sync-from-taisan|save-timeslot|timeslots";
const nonIdRegex = new RegExp(`^/(${COMMON_NON_ID})/?$`);

/** Thiết bị: giữ vận hành = toạ độ, ghi chú, trạng thái. Chặn thêm sync trực tiếp từ Tài sản. */
const lockDeviceCatalogWrites = partialLock({
  locked: [...COMMON_LOCKED, { method: "POST", path: /^\/sync-from-taisan\/?$/ }],
  putKeep: ["coordinates", "note", "status"],
  nonId: nonIdRegex,
});

/** Vật liệu: tên + sản phẩm nghiệm thu do Thống kê quản lý; tỷ trọng (valueHistory) là của Điều phối. */
const lockMaterialCatalogWrites = partialLock({
  locked: COMMON_LOCKED,
  putKeep: ["valueHistory"],
  nonId: nonIdRegex,
});

/** Điểm đổ tải: tên do Thống kê quản lý; khoảng cách + toạ độ là của Điều phối. */
const lockLocationCatalogWrites = partialLock({
  locked: COMMON_LOCKED,
  putKeep: ["distance", "coordinates"],
  nonId: nonIdRegex,
});

module.exports = {
  lockCatalogWrites,
  lockDeviceCatalogWrites,
  lockMaterialCatalogWrites,
  lockLocationCatalogWrites,
  isCatalogMasterThongKe,
  LOCKED_MESSAGE,
};
