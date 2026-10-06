// Phần làm việc với CSDL của "chốt lệnh": chụp thông tin khi hoàn thành, khôi phục cho lệnh cũ, bộ quét bù.
// Phần thuần (dựng bản chụp, phủ bản chụp, kiểm tra thay đổi) ở services/orderSnapshot.js.

const Order = require("../models/Order");
const History = require("../models/History");
// Các mô hình được populate khi dựng bản chụp phải được đăng ký (trong server các route đã nạp sẵn, nhưng
// script khôi phục chạy độc lập nên cần nạp tường minh)
require("../models/User");
require("../models/Department");
require("../models/Position");
require("../models/Job");
require("../models/Shift");
require("../models/Device");
require("../models/DeviceType");
require("../models/DeviceModel");
require("../models/Location");
require("../models/material");
const { STATUS_ORDER } = require("../config/config");
const { departmentAt } = require("../utils/departmentAt");
const {
  FROZEN_REF_KEYS,
  buildFrozenData,
  mergeHistoryIntoData,
  applyCreationDepartment,
  pick,
} = require("./orderSnapshot");

const dept = (path = "department") => ({ path, select: "code name" });
const PERSON = "username fullName gender phone salaryCode signature department position";
const person = (path) => ({
  path,
  select: PERSON,
  populate: [dept(), { path: "position", select: "name" }],
});
const DEVICE = "code name vehicleNumber fuelType capacity power department category material";
const device = (path) => ({
  path,
  select: DEVICE,
  populate: [dept(), { path: "category", select: "name group" }, { path: "material", select: "name" }],
});

/** Populate đủ để dựng bản chụp (cùng các trường mà báo cáo/xuất file đang đọc). */
const snapshotPopulate = () => [
  person("assignedTo"),
  person("createdBy"),
  person("assistants"),
  { path: "job", select: "name type content" },
  { path: "shift" },
  dept("department"),
  dept("repairDepartment"),
  device("device"),
  device("assignedVehicles"),
  device("excavator.device"),
  device("repairVehicles.device"),
  { path: "location", select: "name distance" },
  { path: "material", select: "name acceptedProduct" },
];

const loadForSnapshot = (id) => Order.findById(id).populate(snapshotPopulate()).lean();

/**
 * Chốt lệnh đã hoàn thành. Idempotent: lệnh đã chốt thì giữ nguyên bản chụp cũ.
 * refreeze (chỉ admin sửa lệnh đã chốt): chụp lại đúng các trường `keys` bị sửa, giữ nguyên phần còn lại.
 * Trả về đối tượng frozen hoặc null nếu lệnh không tồn tại / chưa hoàn thành.
 */
const freezeOrder = async (orderId, { source = "completion", refreeze = false, keys, editedBy } = {}) => {
  const order = await loadForSnapshot(orderId);
  if (!order || order.status !== STATUS_ORDER.COMPLETED) return null;
  if (order.frozen && order.frozen.at && !refreeze) return order.frozen;

  let data = buildFrozenData(order);
  let frozen;
  if (refreeze && order.frozen && order.frozen.data) {
    data = { ...order.frozen.data, ...pick(data, keys && keys.length ? keys : FROZEN_REF_KEYS) };
    frozen = { ...order.frozen, data, editedAt: new Date(), editedBy };
  } else {
    frozen = { at: new Date(), source, data };
  }
  // timestamps: false — chốt lệnh không được làm đổi updatedAt của lệnh
  await Order.updateOne(
    refreeze ? { _id: orderId } : { _id: orderId, "frozen.at": { $exists: false } },
    { $set: { frozen } },
    { timestamps: false },
  );
  return frozen;
};

/** Dựng bản chụp cho lệnh CŨ (hoàn thành trước khi có tính năng chốt) từ nguồn đáng tin nhất còn lại. */
const rebuildLegacySnapshot = async (order) => {
  const live = buildFrozenData(order);

  // 1) Bản chụp History ghi lúc lệnh chuyển sang hoàn thành — chính xác nhất
  const hist = await History.findOne({
    entity: order._id,
    "snapshot.status": STATUS_ORDER.COMPLETED,
  })
    .sort({ createdAt: -1 })
    .lean();
  if (hist && hist.snapshot) {
    return { data: mergeHistoryIntoData(live, hist.snapshot), source: "history" };
  }

  // 2) Đơn vị đã lưu trên lệnh lúc tạo (order.department)
  if (order.department) {
    return { data: applyCreationDepartment(live), source: "creation" };
  }

  // 3) Suy ra đơn vị của người nhận lệnh tại ngày làm việc từ lịch sử đổi đơn vị của họ
  const uid = order.assignedTo && order.assignedTo._id;
  if (uid) {
    const histories = await History.find({ entity: uid, "snapshot.username": { $exists: true } })
      .select("createdAt snapshot.department")
      .lean();
    if (histories.length > 0) {
      const when = order.workingDate || order.createdAt;
      const deptId = departmentAt(histories, order.assignedTo.department && order.assignedTo.department._id, when);
      const past = histories
        .map((h) => h.snapshot && h.snapshot.department)
        .find((d) => d && String(d._id || d) === deptId);
      if (deptId && past && typeof past === "object") {
        return {
          data: { ...live, assignedTo: { ...live.assignedTo, department: { _id: past._id, code: past.code, name: past.name } } },
          source: "user-history",
        };
      }
    }
  }

  // 4) Không còn gì khác: chụp dữ liệu hiện tại (có thể đã lệch nếu thông tin gốc từng đổi)
  return { data: live, source: "backfill" };
};

/**
 * Khôi phục / chốt cho mọi lệnh đã hoàn thành mà chưa có bản chụp. Duyệt theo _id nên chạy lại được.
 * @returns { scanned, frozen, bySource }
 */
const backfillFrozen = async ({ limit = 0, dryRun = false, batchSize = 200, onProgress } = {}) => {
  const summary = { scanned: 0, frozen: 0, bySource: {} };
  let lastId = null;
  for (;;) {
    const filter = { status: STATUS_ORDER.COMPLETED, "frozen.at": { $exists: false } };
    if (lastId) filter._id = { $gt: lastId };
    const take = limit > 0 ? Math.min(batchSize, limit - summary.scanned) : batchSize;
    if (take <= 0) break;
    const ids = await Order.find(filter).sort({ _id: 1 }).limit(take).select("_id").lean();
    if (ids.length === 0) break;
    for (const { _id } of ids) {
      lastId = _id;
      summary.scanned += 1;
      const order = await loadForSnapshot(_id);
      if (!order) continue;
      const { data, source } = await rebuildLegacySnapshot(order);
      summary.bySource[source] = (summary.bySource[source] || 0) + 1;
      if (!dryRun) {
        const res = await Order.updateOne(
          { _id, "frozen.at": { $exists: false } },
          { $set: { frozen: { at: new Date(), source, data } } },
          { timestamps: false },
        );
        if (res.modifiedCount) summary.frozen += 1;
      }
    }
    if (onProgress) onProgress(summary);
  }
  return summary;
};

/**
 * Bộ quét bù (cron): chốt các lệnh vừa hoàn thành mà đường xử lý chính bỏ sót (vd sửa trực tiếp trong CSDL).
 * Chỉ quét lệnh cập nhật trong `sinceHours` giờ gần đây để nhẹ.
 */
const sweepRecentlyCompleted = async ({ sinceHours = 48, limit = 200 } = {}) => {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);
  const ids = await Order.find({
    status: STATUS_ORDER.COMPLETED,
    "frozen.at": { $exists: false },
    updatedAt: { $gte: since },
  })
    .select("_id")
    .limit(limit)
    .lean();
  let frozen = 0;
  for (const { _id } of ids) {
    if (await freezeOrder(_id, { source: "sweep" })) frozen += 1;
  }
  return { scanned: ids.length, frozen };
};

module.exports = {
  snapshotPopulate,
  loadForSnapshot,
  freezeOrder,
  rebuildLegacySnapshot,
  backfillFrozen,
  sweepRecentlyCompleted,
};
