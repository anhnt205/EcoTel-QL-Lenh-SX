const express = require("express");
const router = express.Router();
const { ROLE } = require("../config/config");
const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const { syncCatalogsFromTk } = require("../services/tkCatalogSync");

// Admin-only. MẶC ĐỊNH CHẠY THỬ (dryRun): chỉ trả báo cáo ghép bản ghi, không
// ghi CSDL. Muốn ghi thật phải gửi rõ ?dryRun=false — để người chạy đọc báo
// cáo trước (bản ghi nào được ghép với _id cũ, bản ghi nào sẽ tạo mới, xung đột).
router.post("/tk", verifyToken, restrictTo(ROLE.ADMIN), async (req, res) => {
  const dryRun = String(req.query.dryRun ?? "true").toLowerCase() !== "false";
  try {
    const result = await syncCatalogsFromTk({ dryRun });
    req.logger.info(
      `🔥 ${req.user?.username} đồng bộ danh mục từ Thống kê (dryRun=${dryRun}): ${JSON.stringify(result.summary)}`,
    );
    // Báo cáo chi tiết (plan) chỉ trả khi chạy thử; chạy thật trả tóm tắt + số đã ghi.
    res.status(200).json({ status: "success", data: result });
  } catch (err) {
    req.logger.error("❌ Lỗi đồng bộ danh mục từ Thống kê", err);
    res.status(500).json({ status: "error", message: err.message || "Đồng bộ thất bại" });
  }
});

module.exports = router;
