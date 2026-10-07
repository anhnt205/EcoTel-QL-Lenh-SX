const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const { MODULES } = require("../config/modules");

// Danh sách module (chức năng) để màn hình phân quyền hiển thị — một nguồn duy nhất cho backend và giao diện.
// `tk` (resource bên Thống kê) là chi tiết nội bộ nên không trả ra ngoài.
router.get("/modules", verifyToken, (req, res) => {
  res.status(200).json({
    status: "success",
    data: MODULES.map(({ key, label, group, legacy }) => ({ key, label, group, legacy })),
  });
});

module.exports = router;
