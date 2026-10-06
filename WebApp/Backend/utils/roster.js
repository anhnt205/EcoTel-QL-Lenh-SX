// Danh sách nhân viên của bảng chấm công một tháng.
//
// Trước đây lấy theo đơn vị HIỆN TẠI của nhân viên (User.find({ department })) trong khi ca làm lấy theo
// lệnh của đơn vị đó, nên khi nhân viên chuyển đơn vị: tháng cũ ở đơn vị cũ mất người (dù có lệnh), còn
// đơn vị mới thì hiện người đó cả tháng cũ với toàn "N".
//
// Bây giờ danh sách = (a) nhân viên CÓ lệnh ở đơn vị trong tháng (đơn vị và tên đã chốt trên lệnh) +
// (b) nhân viên thuộc đơn vị vào CUỐI THÁNG, suy từ lịch sử đổi đơn vị (xem utils/departmentAt.js).

const mongoose = require("mongoose");
const User = require("../models/User");
const History = require("../models/History");
const { departmentAt } = require("./departmentAt");

const USER_FIELDS = "_id fullName salaryCode department";

/**
 * @param depId   đơn vị (ObjectId / chuỗi / { _id })
 * @param endDate cuối tháng cần chấm công
 * @param orders  các lệnh của đơn vị trong tháng (assignedTo đã populate, lệnh đã chốt thì đã phủ bản chụp)
 * @returns [{ _id, fullName, salaryCode }]
 */
async function attendanceRoster({ depId, endDate, orders }) {
  const depStr = String((depId && depId._id) || depId);
  const depObjectId = new mongoose.Types.ObjectId(depStr);

  // (a) người có lệnh ở đơn vị trong tháng
  const fromOrders = new Map();
  (orders || []).forEach((o) => {
    const u = o && o.assignedTo;
    if (u && u._id) {
      fromOrders.set(String(u._id), { _id: u._id, fullName: u.fullName, salaryCode: u.salaryCode });
    }
  });

  // (b) ứng viên: đang thuộc đơn vị + từng thuộc đơn vị (có bản ghi đổi đơn vị với đơn vị cũ = depId)
  const [current, movedAway] = await Promise.all([
    User.find({ department: depObjectId }).select(USER_FIELDS).lean(),
    History.find({ "snapshot.username": { $exists: true }, "snapshot.department._id": depObjectId })
      .select("entity")
      .lean(),
  ]);
  const candidates = new Map(current.map((u) => [String(u._id), u]));
  const extraIds = [...new Set(movedAway.map((h) => String(h.entity)))].filter((id) => !candidates.has(id));
  if (extraIds.length > 0) {
    const extra = await User.find({ _id: { $in: extraIds } }).select(USER_FIELDS).lean();
    extra.forEach((u) => candidates.set(String(u._id), u));
  }

  const histories = candidates.size
    ? await History.find({ entity: { $in: [...candidates.keys()] }, "snapshot.username": { $exists: true } })
        .select("entity createdAt snapshot.department")
        .lean()
    : [];
  const byUser = new Map();
  histories.forEach((h) => {
    const k = String(h.entity);
    if (!byUser.has(k)) byUser.set(k, []);
    byUser.get(k).push(h);
  });

  const roster = [];
  const seen = new Set();
  candidates.forEach((u, id) => {
    if (departmentAt(byUser.get(id), u.department, endDate) !== depStr) return;
    const named = fromOrders.get(id); // tên/số thẻ đã chốt trên lệnh (nếu có) thay vì tên hiện tại
    roster.push({ _id: u._id, fullName: named ? named.fullName : u.fullName, salaryCode: named ? named.salaryCode : u.salaryCode });
    seen.add(id);
  });
  fromOrders.forEach((u, id) => {
    if (!seen.has(id)) roster.push(u);
  });
  return roster;
}

module.exports = { attendanceRoster };
