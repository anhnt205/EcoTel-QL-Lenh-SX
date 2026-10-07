// "Chốt" (freeze) thông tin lệnh khi lệnh hoàn thành.
//
// Vấn đề: Order chỉ lưu ObjectId của nhân viên / thiết bị / công việc / đơn vị..., còn mọi báo cáo đều
// populate dữ liệu HIỆN TẠI. Nhân viên đổi đơn vị, xe đổi thông tin... thì mọi lệnh cũ đổi theo.
//
// Cách làm: khi lệnh chuyển sang "completed", chụp lại toàn bộ thông tin tham chiếu vào order.frozen.data
// (cùng hình dạng với kết quả populate). Khi đọc lệnh đã chốt, dùng bản chụp thay cho dữ liệu hiện tại
// (applyFrozen). Lệnh chưa hoàn thành vẫn đọc dữ liệu hiện tại, nên thay đổi chỉ có hiệu lực từ thời điểm
// thay đổi trở đi.

const STATUS_COMPLETED = "completed";

/** Các trường tham chiếu được chụp lại khi chốt lệnh. */
const FROZEN_REF_KEYS = [
  "assignedTo",
  "createdBy",
  "assistants",
  "job",
  "shift",
  "department",
  "repairDepartment",
  "device",
  "assignedVehicles",
  "repairVehicles",
  "excavator",
  "location",
  "material",
];

/** Trường tham chiếu mà request KHÔNG được đổi trên lệnh đã chốt (so theo tập id). */
const PROTECTED_REF_KEYS = FROZEN_REF_KEYS;
/** Trường giá trị thường mà request KHÔNG được đổi trên lệnh đã chốt. */
const PROTECTED_SCALAR_KEYS = [
  "workingDate",
  "shiftHour",
  "workContent",
  "batchId",
  "startTime",
  "endTime",
];

// ---------------------------------------------------------------------------------------------
// Tiện ích thuần (có test)
// ---------------------------------------------------------------------------------------------

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isObjectIdLike = (v) =>
  typeof v === "string"
    ? OBJECT_ID_RE.test(v)
    : v !== null && typeof v === "object" && typeof v.toHexString === "function";
const idString = (v) => (typeof v === "string" ? v.toLowerCase() : v.toHexString());

/** Gom mọi id (chuỗi 24 hex / ObjectId) có trong một giá trị, bất kể là id trần, mảng hay đối tượng đã populate. */
const collectIds = (value, out = new Set()) => {
  if (value === null || value === undefined) return out;
  if (isObjectIdLike(value)) {
    out.add(idString(value));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectIds(v, out));
    return out;
  }
  if (typeof value === "object") {
    // Phần tử { device, note } (repairVehicles) / { device, status } (excavator): _id của chính phần tử
    // không phải tham chiếu nên bỏ qua, chỉ xét device
    if (value.device !== undefined) {
      collectIds(value.device, out);
      return out;
    }
    // Đối tượng đã populate ({ _id, code, ... }): lấy _id
    if (value._id !== undefined && isObjectIdLike(value._id)) {
      out.add(idString(value._id));
      return out;
    }
    Object.keys(value).forEach((k) => collectIds(value[k], out));
  }
  return out;
};

const sameIdSet = (a, b) => {
  const x = [...collectIds(a)].sort();
  const y = [...collectIds(b)].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

const scalarKey = (v) => {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return String(v.getTime());
  // chuỗi ngày (ISO đầy đủ hoặc chỉ "YYYY-MM-DD") so theo thời điểm, tránh chặn nhầm khi app gửi khác định dạng
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(Date.parse(v))) return String(Date.parse(v));
  return String(v).trim();
};

/**
 * Danh sách trường bị đổi giữa lệnh hiện có và phần cập nhật gửi lên.
 * Chỉ xét trường CÓ trong `body` (vắng mặt = giữ nguyên) nên gửi lại nguyên lệnh không đổi gì thì không bị chặn.
 */
const changedProtectedFields = (existing, body) => {
  const changed = [];
  PROTECTED_REF_KEYS.forEach((k) => {
    if (body[k] !== undefined && !sameIdSet(existing[k], body[k])) changed.push(k);
  });
  PROTECTED_SCALAR_KEYS.forEach((k) => {
    if (body[k] !== undefined && scalarKey(existing[k]) !== scalarKey(body[k])) changed.push(k);
  });
  return changed;
};

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj && obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

// --- Dựng bản chụp từ lệnh đã populate ---------------------------------------------------------

const snapDepartment = (d) =>
  d && typeof d === "object" && d._id ? { _id: d._id, code: d.code, name: d.name } : d || null;

const snapPerson = (u) =>
  u && typeof u === "object" && u._id
    ? {
        _id: u._id,
        username: u.username,
        fullName: u.fullName,
        gender: u.gender,
        phone: u.phone,
        salaryCode: u.salaryCode,
        signature: u.signature, // chữ ký in trên phiếu lệnh của người ra lệnh

        department: snapDepartment(u.department),
        position: u.position && u.position._id ? { _id: u.position._id, name: u.position.name } : u.position || null,
      }
    : u || null;

const snapDevice = (d) =>
  d && typeof d === "object" && d._id
    ? {
        _id: d._id,
        code: d.code,
        name: d.name,
        vehicleNumber: d.vehicleNumber,
        fuelType: d.fuelType,
        capacity: d.capacity,
        power: d.power,
        department: snapDepartment(d.department),
        category: d.category && d.category._id ? { _id: d.category._id, name: d.category.name, group: d.category.group } : d.category || null,
        material: d.material && d.material._id ? { _id: d.material._id, name: d.material.name } : d.material || null,
      }
    : d || null;

const snapJob = (j) =>
  j && typeof j === "object" && j._id ? { _id: j._id, name: j.name, type: j.type, content: j.content } : j || null;
const snapShift = (s) =>
  s && typeof s === "object" && s._id ? { _id: s._id, name: s.name, startTime: s.startTime, endTime: s.endTime } : s || null;
const snapLocation = (l) =>
  l && typeof l === "object" && l._id ? { _id: l._id, name: l.name, distance: l.distance } : l || null;
const snapMaterial = (m) =>
  m && typeof m === "object" && m._id ? { _id: m._id, name: m.name, acceptedProduct: m.acceptedProduct } : m || null;

const list = (arr, fn) => (Array.isArray(arr) ? arr.filter(Boolean).map(fn) : []);

/**
 * Thiết bị được nhắc trong báo cáo ca của lệnh (vehicleSummaries[].vehicle, vehicleRepair[].device), gom theo id:
 * { [deviceId]: bản chụp thiết bị }. Báo cáo ca có thể được nộp/sửa SAU khi lệnh hoàn thành nên bản chụp này nằm
 * ở lệnh (bổ sung thêm khi báo cáo ca thay đổi — xem syncShiftDevices trong services/orderFreeze.js).
 */
const buildShiftDevices = (shiftReport) => {
  const out = {};
  if (!shiftReport || typeof shiftReport !== "object") return out;
  const add = (d) => {
    if (d && typeof d === "object" && d._id && !isObjectIdLike(d)) out[String(d._id)] = snapDevice(d);
  };
  (Array.isArray(shiftReport.vehicleSummaries) ? shiftReport.vehicleSummaries : []).forEach((i) => i && add(i.vehicle));
  (Array.isArray(shiftReport.vehicleRepair) ? shiftReport.vehicleRepair : []).forEach((i) => i && add(i.device));
  return out;
};

/** Từ lệnh đã populate đầy đủ -> bản chụp gọn (cùng hình dạng với kết quả populate). */
const buildFrozenData = (order) => ({
  assignedTo: snapPerson(order.assignedTo),
  createdBy: snapPerson(order.createdBy),
  assistants: list(order.assistants, snapPerson),
  job: snapJob(order.job),
  shift: snapShift(order.shift),
  department: snapDepartment(order.department),
  repairDepartment: snapDepartment(order.repairDepartment),
  device: list(order.device, snapDevice),
  assignedVehicles: list(order.assignedVehicles, snapDevice),
  repairVehicles: list(order.repairVehicles, (r) => ({ _id: r._id, device: snapDevice(r.device), note: r.note })),
  excavator: list(order.excavator, (e) => ({ _id: e._id, device: snapDevice(e.device), status: e.status })),
  location: list(order.location, snapLocation),
  material: list(order.material, snapMaterial),
  shiftDevices: buildShiftDevices(order.shiftReport),
});

// --- Phủ bản chụp lên lệnh khi đọc ---------------------------------------------------------------

/**
 * Lệnh đã chốt thì thay các trường tham chiếu bằng bản chụp; lệnh chưa chốt giữ nguyên.
 * Trả về đối tượng thường (không phải document) và KHÔNG chứa `frozen.data` (nặng) — chỉ có frozenAt/frozenSource.
 */
const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !isObjectIdLike(v);

const byIdMap = (arr) => {
  const m = new Map();
  (Array.isArray(arr) ? arr : []).forEach((x) => x && x._id && m.set(String(x._id), x));
  return m;
};

/**
 * Cắt bản chụp cho có đúng các trường mà dữ liệu populate "sống" đang trả (chọn qua `select`), để API không lộ
 * thêm trường (số điện thoại, chữ ký...) ở những danh sách vốn không trả chúng. Phần tử/đối tượng không có bản
 * "sống" tương ứng (vd nhân viên đã bị xoá nên populate ra null) thì dùng bản chụp đầy đủ.
 */
const shapeLike = (snap, live) => {
  if (Array.isArray(snap)) {
    const liveMap = byIdMap(live);
    return snap.map((s) => shapeLike(s, s && s._id ? liveMap.get(String(s._id)) : undefined));
  }
  if (!isPlainObject(snap)) return snap;
  if (!isPlainObject(live)) {
    // Truy vấn không populate trường này (live là id trần) mà bản chụp là đối tượng: giữ kiểu id nhưng là id ĐÃ CHỤP
    // (vd thiết bị populate "code material" thì material là id của model thiết bị lúc chốt)
    if (isObjectIdLike(live) && snap._id !== undefined) return snap._id;
    return snap;
  }
  const out = {};
  Object.keys(snap).forEach((k) => {
    if (k === "_id" || Object.prototype.hasOwnProperty.call(live, k)) {
      out[k] = shapeLike(snap[k], live[k]);
    }
  });
  return out;
};

/**
 * Truy vấn này có populate trường đó không? Chỉ khi đã populate mới phủ bản chụp; còn id trần thì giữ nguyên
 * để mã phía sau (so sánh id, truy vấn tiếp...) không bị đổi kiểu dữ liệu.
 */
const isPopulatedValue = (live) => {
  if (live === null) return true; // tham chiếu tới tài liệu đã bị xoá
  if (Array.isArray(live)) return live.length === 0 || live.some(isPlainObject);
  return isPlainObject(live);
};

/** Thay thiết bị đã populate trong báo cáo ca bằng bản chụp (theo id thiết bị); thiết bị chưa có bản chụp giữ nguyên. */
const overlayShiftDevices = (shiftReport, devices) => {
  if (!shiftReport || typeof shiftReport !== "object" || !devices) return shiftReport;
  const sr = typeof shiftReport.toObject === "function" ? shiftReport.toObject() : shiftReport;
  const swap = (v) =>
    isPlainObject(v) && v._id !== undefined && devices[String(v._id)] ? shapeLike(devices[String(v._id)], v) : v;
  const out = { ...sr };
  if (Array.isArray(sr.vehicleSummaries)) {
    out.vehicleSummaries = sr.vehicleSummaries.map((i) => (i ? { ...i, vehicle: swap(i.vehicle) } : i));
  }
  if (Array.isArray(sr.vehicleRepair)) {
    out.vehicleRepair = sr.vehicleRepair.map((i) => (i ? { ...i, device: swap(i.device) } : i));
  }
  return out;
};

const applyFrozen = (order) => {
  if (!order) return order;
  // Lệnh chưa chốt: trả NGUYÊN BẢN (document hoặc đối tượng) như trước khi có tính năng này
  if (!order.frozen || !order.frozen.data) return order;
  const plain = typeof order.toObject === "function" ? order.toObject() : { ...order };
  const frozen = plain.frozen;
  const { frozen: _drop, ...rest } = plain;
  FROZEN_REF_KEYS.forEach((k) => {
    if (frozen.data[k] !== undefined && isPopulatedValue(plain[k])) {
      rest[k] = shapeLike(frozen.data[k], plain[k]);
    }
  });
  if (frozen.data.shiftDevices && isPlainObject(plain.shiftReport)) {
    rest.shiftReport = overlayShiftDevices(plain.shiftReport, frozen.data.shiftDevices);
  }
  rest.frozenAt = frozen.at;
  rest.frozenSource = frozen.source;
  return rest;
};
const applyFrozenAll = (orders) => (Array.isArray(orders) ? orders.map(applyFrozen) : orders);

// --- Khôi phục từ bảng History cho lệnh cũ ------------------------------------------------------

const byId = (arr) => {
  const m = new Map();
  (Array.isArray(arr) ? arr : []).forEach((x) => x && x._id && m.set(String(x._id), x));
  return m;
};

/** Gộp bản chụp lấy từ History (đúng thời điểm hoàn thành) lên bản chụp dựng từ dữ liệu hiện tại. */
const mergeHistoryIntoData = (data, hist) => {
  if (!hist) return data;
  const out = { ...data };
  FROZEN_REF_KEYS.forEach((k) => {
    const h = hist[k];
    if (h === undefined || h === null) return;
    const live = data[k];
    if (Array.isArray(h)) {
      const liveMap = byId(live);
      out[k] = h.filter(Boolean).map((item) => {
        const base = liveMap.get(String(item._id)) || {};
        const merged = { ...base, ...item };
        // excavator / repairVehicles: { device: {...} } gộp tiếp phần device
        if (item.device && typeof item.device === "object") {
          merged.device = { ...(base.device || {}), ...item.device };
        }
        return merged;
      });
    } else if (typeof h === "object") {
      const base = live && typeof live === "object" ? live : {};
      const merged = { ...base, ...h };
      // phần department trong History chỉ có { _id, code }: giữ name từ dữ liệu hiện tại nếu cùng đơn vị
      if (h.department && base.department && String(h.department._id) === String(base.department._id)) {
        merged.department = { ...base.department, ...h.department };
      }
      out[k] = merged;
    }
  });
  return out;
};

/**
 * Lệnh cũ không có History: dùng đơn vị đã lưu trên chính lệnh lúc tạo (order.department) làm đơn vị
 * của người nhận lệnh, thay vì đơn vị hiện tại của người đó (có thể đã chuyển).
 */
const applyCreationDepartment = (data) => {
  if (data.department && data.assignedTo) {
    return { ...data, assignedTo: { ...data.assignedTo, department: data.department } };
  }
  return data;
};

// --- Thời hạn sửa lệnh đã hoàn thành ---------------------------------------------------------------
// Lệnh hoàn thành được SỬA trong EDIT_WINDOW_HOURS giờ (mặc định 48) kể từ giờ kết thúc (kể cả thêm/sửa phụ
// máy); quá hạn thì khoá (409) — chỉ admin gửi forceEditFrozen mới sửa được. Trong hạn, bản chụp đã chốt được
// chụp lại đúng các trường vừa sửa để màn hình/báo cáo khớp dữ liệu. Giờ kết thúc (endTime) là mốc tính hạn
// nên LUÔN khoá, không cho sửa để khỏi kéo dài hạn; lệnh không có endTime coi như đã quá hạn (khoá).
const DEFAULT_EDIT_WINDOW_HOURS = 48;
const editWindowHours = () => {
  const raw = process.env.ORDER_EDIT_WINDOW_HOURS;
  if (raw === undefined || raw === "") return DEFAULT_EDIT_WINDOW_HOURS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_EDIT_WINDOW_HOURS;
};
/** Giờ hoàn thành của lệnh (ms) = endTime; null nếu thiếu/không hợp lệ. */
const completedAtMs = (order) => {
  const t = order && order.endTime ? new Date(order.endTime).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};
const isEditWindowOpen = (order, now = Date.now(), hours = editWindowHours()) => {
  const t = completedAtMs(order);
  return t !== null && now - t <= hours * 3600 * 1000;
};
/** Trường LUÔN khoá kể cả trong hạn. */
const ALWAYS_LOCKED_KEYS = ["endTime"];

/**
 * Quyết định cho một request sửa lệnh ĐÃ HOÀN THÀNH (hàm thuần, có test).
 * @returns {{ blocked: boolean, reason: null|"reopen"|"expired"|"endTime", inWindow: boolean,
 *             editKeys: string[], fields: string[] }}
 *  - editKeys: các trường bảo vệ bị đổi (dùng để chụp lại bản chốt)
 *  - fields: trường nêu trong lỗi 409
 */
const frozenEditDecision = (order, body, { status, adminForce = false, now = Date.now(), hours } = {}) => {
  const inWindow = isEditWindowOpen(order, now, hours);
  const editKeys = changedProtectedFields(order, body || {});
  const reopen = status !== undefined && status !== STATUS_COMPLETED;
  let reason = null;
  let fields = [];
  if (reopen) {
    reason = "reopen";
    fields = ["status"];
  } else if (editKeys.length > 0 && !inWindow) {
    reason = "expired";
    fields = editKeys;
  } else if (editKeys.some((k) => ALWAYS_LOCKED_KEYS.includes(k))) {
    reason = "endTime";
    fields = editKeys.filter((k) => ALWAYS_LOCKED_KEYS.includes(k));
  }
  return { blocked: reason !== null && !adminForce, reason, inWindow, editKeys, fields };
};

module.exports = {
  STATUS_COMPLETED,
  FROZEN_REF_KEYS,
  PROTECTED_REF_KEYS,
  PROTECTED_SCALAR_KEYS,
  collectIds,
  sameIdSet,
  changedProtectedFields,
  frozenEditDecision,
  isEditWindowOpen,
  editWindowHours,
  ALWAYS_LOCKED_KEYS,
  pick,
  isPlainObject,
  isPopulatedValue,
  isObjectIdLike,
  snapDepartment,
  snapPerson,
  snapDevice,
  snapLocation,
  snapMaterial,
  buildShiftDevices,
  buildFrozenData,
  shapeLike,
  applyFrozen,
  applyFrozenAll,
  mergeHistoryIntoData,
  applyCreationDepartment,
};
