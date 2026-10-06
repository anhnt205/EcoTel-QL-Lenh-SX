// "Chốt" (freeze) thông tin tham chiếu của báo chuyến (Report) theo thời gian.
//
// Report (một dòng báo chuyến: xe, máy xúc, điểm xúc/đổ, vật liệu, số chuyến...) chỉ lưu id; mọi báo cáo populate
// dữ liệu HIỆN TẠI (thiết bị đồng bộ từ QL-TAISAN đổi mã/loại/model, địa điểm đổi tên, vật liệu đổi loại sản phẩm...)
// nên báo cáo tháng cũ đổi theo. Khi lệnh hoàn thành, chụp lại các tham chiếu này vào report.frozen.data (cùng hình
// dạng kết quả populate) và phủ lên khi đọc — giống cách làm của lệnh (services/orderSnapshot.js).
//
// Khác lệnh: chuyến vẫn được sửa sau khi lệnh hoàn thành (có ReportHistory ghi vết) nên KHÔNG chặn sửa; thay vào đó
// bản chụp chỉ phủ lên tham chiếu còn TRỎ ĐÚNG đối tượng đã chụp. Chuyến bị đổi sang xe/vật liệu khác thì tham chiếu
// mới đọc dữ liệu hiện tại và được chụp lại ngay lúc sửa (syncReportFrozen), phần còn lại giữ nguyên.

const {
  isPlainObject,
  isObjectIdLike,
  snapDevice,
  snapLocation,
  snapMaterial,
  sameIdSet,
  shapeLike,
} = require("./orderSnapshot");

/** Các trường tham chiếu của chuyến được chụp lại. */
const REPORT_REF_KEYS = ["device", "excavator", "fromLocation", "toLocation", "material"];

const REPORT_SNAPPERS = {
  device: snapDevice,
  excavator: snapDevice,
  fromLocation: snapLocation,
  toLocation: snapLocation,
  material: snapMaterial,
};

const isPopulatedRef = (v) => isPlainObject(v) && v._id !== undefined && !isObjectIdLike(v);

/** Từ chuyến đã populate -> bản chụp (chỉ các tham chiếu có thật và đã populate được). */
const buildReportFrozenData = (report) => {
  const out = {};
  REPORT_REF_KEYS.forEach((k) => {
    const v = report && report[k];
    if (isPopulatedRef(v)) out[k] = REPORT_SNAPPERS[k](v);
  });
  return out;
};

/**
 * Trường nào của chuyến (đã populate) không còn khớp bản chụp: chưa được chụp, hoặc chuyến đã được sửa sang đối tượng
 * khác. Dùng để chụp lại đúng các trường đó sau khi sửa chuyến.
 */
const staleReportKeys = (report, data) =>
  REPORT_REF_KEYS.filter((k) => {
    const live = report && report[k];
    if (!isPopulatedRef(live)) return false; // không có tham chiếu (hoặc đã bị xoá) thì không có gì để chụp lại
    return !data || !data[k] || !sameIdSet(live, data[k]);
  });

/** Chuyến phải có toObject() (nhiều chỗ xuất file gọi) kể cả khi đã bị chuyển thành đối tượng thường. */
const withToObject = (obj) => {
  Object.defineProperty(obj, "toObject", {
    value: () => ({ ...obj }),
    enumerable: false,
    configurable: true,
  });
  return obj;
};

/**
 * Chuyến đã chốt thì thay các tham chiếu đã populate bằng bản chụp (chỉ khi còn trỏ đúng đối tượng đã chụp);
 * chuyến chưa chốt trả về NGUYÊN BẢN. Trả về đối tượng thường không có `frozen` (nặng), thêm `frozenAt`.
 */
const applyFrozenReport = (report) => {
  if (!report || !report.frozen || !report.frozen.data) return report;
  const plain = typeof report.toObject === "function" ? report.toObject() : { ...report };
  const { frozen, ...rest } = plain;
  REPORT_REF_KEYS.forEach((k) => {
    const snap = frozen.data[k];
    const live = plain[k];
    if (!snap) return;
    if (live === null) {
      // tham chiếu tới đối tượng đã bị xoá khỏi dữ liệu gốc: bản chụp là thứ duy nhất còn lại
      rest[k] = snap;
      return;
    }
    if (!isPopulatedRef(live)) return; // id trần giữ nguyên (mã phía sau có thể so sánh id)
    if (!sameIdSet(live, snap)) return; // chuyến đã đổi sang đối tượng khác sau lần chụp
    rest[k] = shapeLike(snap, live);
  });
  rest.frozenAt = frozen.at;
  return withToObject(rest);
};
const applyFrozenReportAll = (reports) => (Array.isArray(reports) ? reports.map(applyFrozenReport) : reports);

// --- Khôi phục cho chuyến cũ -----------------------------------------------------------------------

/** Bản đồ id -> bản chụp thiết bị / địa điểm / vật liệu từ bản chụp của lệnh (order.frozen.data). */
const orderEntityMaps = (orderData) => {
  const devices = new Map();
  const locations = new Map();
  const materials = new Map();
  const data = orderData || {};
  const addDevice = (d) => d && typeof d === "object" && d._id && devices.set(String(d._id), d);
  (Array.isArray(data.device) ? data.device : []).forEach(addDevice);
  (Array.isArray(data.assignedVehicles) ? data.assignedVehicles : []).forEach(addDevice);
  (Array.isArray(data.repairVehicles) ? data.repairVehicles : []).forEach((r) => r && addDevice(r.device));
  (Array.isArray(data.excavator) ? data.excavator : []).forEach((e) => e && addDevice(e.device));
  (Array.isArray(data.location) ? data.location : []).forEach((l) => l && l._id && locations.set(String(l._id), l));
  (Array.isArray(data.material) ? data.material : []).forEach((m) => m && m._id && materials.set(String(m._id), m));
  return { devices, locations, materials };
};

const MAP_OF_KEY = {
  device: "devices",
  excavator: "devices",
  fromLocation: "locations",
  toLocation: "locations",
  material: "materials",
};

/**
 * Chuyến cũ (lệnh đã chốt từ trước): ưu tiên bản chụp của chính lệnh đó (đúng thời điểm hoàn thành, có thể đã khôi
 * phục từ History), tham chiếu không có trong lệnh thì dùng dữ liệu hiện tại.
 * @returns { data, source: "order" | "backfill" }
 */
const buildReportDataFromOrder = (report, orderData) => {
  const maps = orderEntityMaps(orderData);
  const out = {};
  let fromOrder = 0;
  REPORT_REF_KEYS.forEach((k) => {
    const live = report && report[k];
    if (!isPopulatedRef(live)) return;
    const found = maps[MAP_OF_KEY[k]].get(String(live._id));
    if (found) {
      out[k] = found;
      fromOrder += 1;
    } else {
      out[k] = REPORT_SNAPPERS[k](live);
    }
  });
  return { data: out, source: fromOrder > 0 ? "order" : "backfill" };
};

module.exports = {
  REPORT_REF_KEYS,
  buildReportFrozenData,
  staleReportKeys,
  applyFrozenReport,
  applyFrozenReportAll,
  orderEntityMaps,
  buildReportDataFromOrder,
};
