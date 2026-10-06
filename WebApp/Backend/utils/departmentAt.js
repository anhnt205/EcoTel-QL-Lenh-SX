// Đơn vị của nhân viên TẠI MỘT THỜI ĐIỂM trong quá khứ.
//
// Khi đổi đơn vị của nhân viên (PUT /api/users/update/:id) hệ thống ghi vào History một bản chụp nhân viên
// TRƯỚC khi đổi (snapshot.department) với entity = id nhân viên, createdAt = lúc đổi. Nhờ đó suy ra được
// đơn vị tại thời điểm bất kỳ: bản ghi đổi ĐẦU TIÊN sau thời điểm đó cho biết đơn vị ngay trước lần đổi ấy;
// chưa có lần đổi nào sau đó thì đơn vị hiện tại chính là đơn vị tại thời điểm đó.

/**
 * @param histories     bản ghi History của nhân viên: [{ createdAt, snapshot: { department } }]
 * @param currentDeptId đơn vị hiện tại của nhân viên (ObjectId/chuỗi/null)
 * @param date          thời điểm cần biết
 * @returns id đơn vị (chuỗi) hoặc null nếu lúc đó chưa thuộc đơn vị nào
 */
const departmentAt = (histories, currentDeptId, date) => {
  const t = new Date(date).getTime();
  const next = (histories || [])
    .filter((h) => h && h.createdAt)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .find((h) => new Date(h.createdAt).getTime() > t);
  if (!next) return currentDeptId ? String(currentDeptId) : null;
  const d = next.snapshot && next.snapshot.department;
  if (!d) return null;
  return String(d._id || d);
};

module.exports = { departmentAt };
