// Phần làm việc với CSDL của "chốt lệnh": chụp thông tin khi hoàn thành, khôi phục cho lệnh cũ, bộ quét bù.
// Phần thuần (dựng bản chụp, phủ bản chụp, kiểm tra thay đổi) ở services/orderSnapshot.js.

const Order = require("../models/Order");
const History = require("../models/History");
const Report = require("../models/Report");
const ShiftReport = require("../models/ShiftReport");
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
  buildShiftDevices,
  mergeHistoryIntoData,
  applyCreationDepartment,
  pick,
} = require("./orderSnapshot");
const { buildReportFrozenData, staleReportKeys, buildReportDataFromOrder } = require("./reportSnapshot");

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

/** Populate các tham chiếu của báo chuyến (Report) để dựng bản chụp. */
const reportPopulate = () => [
  device("device"),
  device("excavator"),
  { path: "fromLocation", select: "name distance" },
  { path: "toLocation", select: "name distance" },
  { path: "material", select: "name acceptedProduct" },
];

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
  // thiết bị trong báo cáo ca (vehicleSummaries / vehicleRepair) -> data.shiftDevices
  { path: "shiftReport", populate: [device("vehicleSummaries.vehicle"), device("vehicleRepair.device")] },
];

const loadForSnapshot = (id) => Order.findById(id).populate(snapshotPopulate()).lean();

/**
 * Chốt lệnh đã hoàn thành. Idempotent: lệnh đã chốt thì giữ nguyên bản chụp cũ.
 * refreeze (chỉ admin sửa lệnh đã chốt): chụp lại đúng các trường `keys` bị sửa, giữ nguyên phần còn lại.
 * Trả về đối tượng frozen hoặc null nếu lệnh không tồn tại / chưa hoàn thành.
 */
const freezeOrderCore = async (orderId, { source = "completion", refreeze = false, keys, editedBy } = {}) => {
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

// --- Báo chuyến (Report) và báo cáo ca đi kèm lệnh ---------------------------------------------------

/** Chốt các chuyến của lệnh chưa có bản chụp. Trả về số chuyến vừa chốt. */
const freezeReportsOfOrder = async (orderId, source = "completion") => {
  const reports = await Report.find({ orderId }).select("+frozen").populate(reportPopulate()).lean();
  let n = 0;
  for (const r of reports) {
    if (r.frozen && r.frozen.at) continue;
    const res = await Report.updateOne(
      { _id: r._id, "frozen.at": { $exists: false } },
      { $set: { frozen: { at: new Date(), source, data: buildReportFrozenData(r) } } },
      { timestamps: false },
    );
    if (res.modifiedCount) n += 1;
  }
  return n;
};

/**
 * Giữ bản chụp của MỘT chuyến khớp với tham chiếu hiện tại — gọi sau khi tạo/sửa chuyến. Chỉ làm gì khi lệnh của chuyến
 * đã hoàn thành: chuyến mới thì chụp toàn bộ; chuyến đã chụp mà bị sửa sang xe/vật liệu... khác thì chụp lại đúng
 * trường đó (phần còn lại giữ nguyên).
 */
const syncReportFrozen = async (reportId, source = "edit") => {
  const r = await Report.findById(reportId).select("+frozen").populate(reportPopulate()).lean();
  if (!r) return null;
  const order = await Order.findById(r.orderId).select("status").lean();
  if (!order || order.status !== STATUS_ORDER.COMPLETED) return null;
  if (!r.frozen || !r.frozen.at) {
    await Report.updateOne(
      { _id: r._id, "frozen.at": { $exists: false } },
      { $set: { frozen: { at: new Date(), source, data: buildReportFrozenData(r) } } },
      { timestamps: false },
    );
    return "created";
  }
  const stale = staleReportKeys(r, r.frozen.data);
  if (stale.length === 0) return "unchanged";
  const fresh = buildReportFrozenData(r);
  const $set = { "frozen.editedAt": new Date() };
  stale.forEach((k) => {
    $set[`frozen.data.${k}`] = fresh[k];
  });
  await Report.updateOne({ _id: r._id }, { $set }, { timestamps: false });
  return "refrozen";
};

/**
 * Bổ sung bản chụp thiết bị trong báo cáo ca vào lệnh đã chốt (báo cáo ca có thể nộp/sửa sau khi lệnh hoàn thành).
 * Chỉ THÊM thiết bị chưa có bản chụp, không ghi đè cái đã chụp.
 */
const syncShiftDevices = async (orderId) => {
  const order = await Order.findById(orderId).select("status frozen.at frozen.data.shiftDevices").lean();
  if (!order || order.status !== STATUS_ORDER.COMPLETED || !order.frozen || !order.frozen.at) return 0;
  const sr = await ShiftReport.findOne({ orderId })
    .populate([device("vehicleSummaries.vehicle"), device("vehicleRepair.device")])
    .lean();
  if (!sr) return 0;
  const wanted = buildShiftDevices(sr);
  const have = (order.frozen.data && order.frozen.data.shiftDevices) || {};
  const $set = {};
  Object.keys(wanted).forEach((id) => {
    if (!have[id]) $set[`frozen.data.shiftDevices.${id}`] = wanted[id];
  });
  const n = Object.keys($set).length;
  if (n > 0) await Order.updateOne({ _id: orderId }, { $set }, { timestamps: false });
  return n;
};

/** Phần đi kèm khi chốt lệnh; lỗi ở đây không được làm hỏng việc chốt lệnh / hoàn thành lệnh. */
const freezeRelated = async (orderId, source) => {
  try {
    await freezeReportsOfOrder(orderId, source);
    await syncShiftDevices(orderId);
  } catch (err) {
    console.error(`[freeze] Lỗi khi chốt báo chuyến/báo cáo ca của lệnh ${orderId}:`, err.message);
  }
};

const freezeOrder = async (orderId, opts = {}) => {
  const frozen = await freezeOrderCore(orderId, opts);
  if (frozen) await freezeRelated(orderId, opts.source || "completion");
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
 * Khôi phục / chốt cho mọi chuyến (Report) của lệnh đã hoàn thành mà chưa có bản chụp. Ưu tiên bản chụp của chính lệnh
 * (đúng thời điểm hoàn thành), tham chiếu không có trong lệnh thì dùng dữ liệu hiện tại. Chuyến của lệnh CHƯA hoàn
 * thành được bỏ qua (sẽ chụp khi lệnh hoàn thành). Nên chạy SAU backfillFrozen (lệnh phải có bản chụp trước).
 * @returns { scanned, skipped, frozen, bySource }
 */
const backfillReportsFrozen = async ({ limit = 0, dryRun = false, batchSize = 200, onProgress } = {}) => {
  const summary = { scanned: 0, skipped: 0, frozen: 0, bySource: {} };
  let lastId = null;
  for (;;) {
    const filter = { "frozen.at": { $exists: false } };
    if (lastId) filter._id = { $gt: lastId };
    const take = limit > 0 ? Math.min(batchSize, limit - summary.scanned) : batchSize;
    if (take <= 0) break;
    const batch = await Report.find(filter).sort({ _id: 1 }).limit(take).select("_id orderId").lean();
    if (batch.length === 0) break;
    lastId = batch[batch.length - 1]._id;
    summary.scanned += batch.length;

    const orderIds = [...new Set(batch.map((b) => String(b.orderId)))];
    const orders = await Order.find({ _id: { $in: orderIds }, status: STATUS_ORDER.COMPLETED })
      .select("frozen.data")
      .lean();
    const orderMap = new Map(orders.map((o) => [String(o._id), o]));
    const ids = batch.filter((b) => orderMap.has(String(b.orderId))).map((b) => b._id);
    summary.skipped += batch.length - ids.length;

    const reports = ids.length ? await Report.find({ _id: { $in: ids } }).populate(reportPopulate()).lean() : [];
    for (const r of reports) {
      const od = orderMap.get(String(r.orderId));
      const { data, source } =
        od && od.frozen && od.frozen.data
          ? buildReportDataFromOrder(r, od.frozen.data)
          : { data: buildReportFrozenData(r), source: "backfill" };
      summary.bySource[source] = (summary.bySource[source] || 0) + 1;
      if (!dryRun) {
        const res = await Report.updateOne(
          { _id: r._id, "frozen.at": { $exists: false } },
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
 * Lệnh đã chốt từ trước khi có bản chụp thiết bị của báo cáo ca (data.shiftDevices): bổ sung từ báo cáo ca hiện có.
 * Lệnh không có báo cáo ca được đánh dấu `{}` để lần sau không quét lại.
 * @returns { scanned, updated }
 */
const backfillShiftDevices = async ({ limit = 0, dryRun = false, batchSize = 200 } = {}) => {
  const summary = { scanned: 0, updated: 0 };
  let lastId = null;
  for (;;) {
    const filter = {
      status: STATUS_ORDER.COMPLETED,
      "frozen.at": { $exists: true },
      "frozen.data.shiftDevices": { $exists: false },
    };
    if (lastId) filter._id = { $gt: lastId };
    const take = limit > 0 ? Math.min(batchSize, limit - summary.scanned) : batchSize;
    if (take <= 0) break;
    const ids = await Order.find(filter).sort({ _id: 1 }).limit(take).select("_id").lean();
    if (ids.length === 0) break;
    for (const { _id } of ids) {
      lastId = _id;
      summary.scanned += 1;
      if (dryRun) continue;
      const n = await syncShiftDevices(_id);
      await Order.updateOne(
        { _id, "frozen.data.shiftDevices": { $exists: false } },
        { $set: { "frozen.data.shiftDevices": {} } },
        { timestamps: false },
      );
      if (n > 0) summary.updated += 1;
    }
  }
  return summary;
};

/**
 * Bộ quét bù (cron): chốt các lệnh vừa hoàn thành mà đường xử lý chính bỏ sót (vd sửa trực tiếp trong CSDL), và các
 * chuyến tạo/sửa muộn của lệnh vừa hoàn thành mà bước chụp ngay lúc tạo/sửa không thành công.
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

  let reports = 0;
  const recent = await Order.find({ status: STATUS_ORDER.COMPLETED, updatedAt: { $gte: since } })
    .select("_id")
    .limit(limit * 5)
    .lean();
  if (recent.length > 0) {
    const late = await Report.find({ orderId: { $in: recent.map((o) => o._id) }, "frozen.at": { $exists: false } })
      .select("_id")
      .limit(limit)
      .lean();
    for (const { _id } of late) {
      if (await syncReportFrozen(_id, "sweep")) reports += 1;
    }
  }
  return { scanned: ids.length, frozen, reports };
};

module.exports = {
  snapshotPopulate,
  loadForSnapshot,
  freezeOrder,
  rebuildLegacySnapshot,
  backfillFrozen,
  backfillReportsFrozen,
  backfillShiftDevices,
  freezeReportsOfOrder,
  syncReportFrozen,
  syncShiftDevices,
  sweepRecentlyCompleted,
};
