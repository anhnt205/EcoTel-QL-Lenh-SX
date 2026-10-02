const express = require("express");
const router = express.Router();
const User = require("../models/User");
const History = require("../models/History");

const bcrypt = require("bcryptjs");
const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const Position = require("../models/Position");
const Department = require("../models/Department");
const mongoose = require("mongoose");
const { ROLE } = require("../config/config");
const { paginateQuery } = require("../utils/pagination");

// Get all users
function parseBool(v) {
  if (v === undefined || v === null) return undefined; // không lọc
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  return undefined; // hoặc throw lỗi nếu bạn muốn chặt chẽ
}
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const query = {};

    const active = parseBool(req.query.active);

    if (user?.role === ROLE.MANAGER) {
      query.department = user?.department?._id;
    }

    if (req.query.department) {
      const departmentId = req.query.department.toString();
      query.department = departmentId;
    } else if (user?.role === ROLE.DISPATCHER) {
      if (req.query.type === "order") {
        const userDeptId = user?.department?._id;
        query.$or = [
          { department: userDeptId }, // All users in their own department
          { role: ROLE.MANAGER }, // All managers from other departments
        ];
      } else {
        query.department = user?.department?._id;
      }
    }

    if (req.query.q) {
      const regex = new RegExp(req.query.q, "i");
      query.$or = [
        { salaryCode: regex },
        { fullName: regex },
        { username: regex },
      ];
    }

    const activeCountsAgg = await User.aggregate([
      { $match: query },
      { $group: { _id: "$active", count: { $sum: 1 } } },
    ]);

    let totalAll = 0;
    let activeCount = 0;
    let inactiveCount = 0;
    for (const item of activeCountsAgg) {
      totalAll += item.count;
      if (item._id === true) activeCount = item.count;
      if (item._id === false) inactiveCount = item.count;
    }

    // ---- Áp filter active (nếu có) cho query chính ----
    if (active !== undefined) {
      query.active = active;
    }

    const modelQuery = User.find(query)
      .populate("department", "name code")
      .populate("position", "name")
      .collation({ locale: "vi", strength: 1 })
      .sort({ fullName: 1 });

    const result = await paginateQuery(modelQuery, User, query, req.query);
    req.logger.info(`✅ Lấy thành công ${result.results} người dùng.`);
    res.json({
      status: "success",
      ...result,
      statusCounts: {
        all: totalAll,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (error) {
    req.logger.error("❌ Lỗi khi lấy danh sách người dùng", error);
    res.status(500).json({
      status: "error",
      message: "Lấy danh sách người dùng thất bại",
      error: error.message,
    });
  }
});
//count
router.get("/count", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const query = {};

    if (user?.role === ROLE.MANAGER || user?.role === ROLE.DISPATCHER) {
      query.department = user?.department?._id;
    }

    const count = await User.countDocuments(query);
    req.logger.info(`✅ Lấy thành công ${count} người dùng.`);
    res.json({
      status: "success",
      data: count,
    });
  } catch (error) {
    req.logger.error("❌ Lỗi khi lấy danh sách người dùng", error);
    res.status(500).json({
      status: "error",
      message: "Lấy danh sách người dùng thất bại",
      error: error.message,
    });
  }
});

// Get user by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("department")
      .populate("position", "name");
    if (!user) {
      req.logger.warn(`⚠️ Không tìm thấy người dùng với ID: ${req.params.id}`);
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy người dùng",
      });
    }
    req.logger.info(
      `✅ Lấy thông tin người dùng thành công cho ID: ${req.params.id}`,
    );
    res.json({
      status: "success",
      data: user,
    });
  } catch (error) {
    req.logger.error("❌ Lỗi khi lấy thông tin người dùng", error);
    res.status(500).json({
      status: "error",
      message: "Lấy thông tin người dùng thất bại",
      error: error.message,
    });
  }
});

// Get user by salaryCode
router.get("/getOne/salaryCodeOrName", verifyToken, async (req, res) => {
  try {
    const currentUser = req.user;
    let finalQuery = {};
    if (!req.query.q) {
      return res.status(400).json({
        status: "error",
        message: "Nhập tìm kiểm thẻ lương",
      });
    }
    if (req.query.q) {
      let searchCondition = {
        $or: [
          { salaryCode: req.query.q },
          { fullName: req.query.q },
          { username: req.query.q },
        ],
      };

      // Điều kiện theo role
      let roleCondition = {};
      if (
        currentUser?.role === ROLE.MANAGER ||
        currentUser?.role === ROLE.EMPLOYEE
      ) {
        roleCondition = { department: currentUser?.department?._id };
      }
      if (currentUser?.role === ROLE.DISPATCHER) {
        const userDeptId = currentUser?.department?._id;
        roleCondition = {
          $or: [{ department: userDeptId }, { role: ROLE.MANAGER }],
        };
      }

      // Kết hợp: chỉ tìm khi có q + role condition
      finalQuery = { $and: [searchCondition] };
      if (Object.keys(roleCondition).length > 0) {
        finalQuery.$and.push(roleCondition);
      }
    }

    const data = await User.findOne(finalQuery)
      .populate("position", "name")
      .populate("department", "code");
    if (!data) {
      req.logger.warn("⚠️ Không tìm thấy người dùng với từ khóa đã cho.");
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy người dùng",
      });
    }
    req.logger.info(`✅ Lấy thông tin người dùng thành công: ${data.username}`);
    res.json({
      status: "success",
      data: data,
    });
  } catch (error) {
    req.logger.error("❌ Lỗi khi lấy thông tin người dùng", error);
    res.status(500).json({
      status: "error",
      message: "Lấy thông tin người dùng thất bại",
      error: error.message,
    });
  }
});

// Update user
router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("department");
    if (!user) {
      req.logger.warn(
        `⚠️ Cập nhật thất bại - Không tìm thấy người dùng với ID: ${req.params.id}`,
      );
      return res.status(404).json({
        success: "error",
        message: "Không tìm thấy người dùng",
      });
    }
    if ("password" in req.body) {
      delete req.body.password;
    }
    const userUpdate = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("department");

    if (
      user.department?._id.toString() !== userUpdate.department?._id.toString()
    ) {
      const snapshot = user.toObject();
      const newHistory = new History({
        entity: user._id,
        changedBy: req.userId,
        snapshot: snapshot,
      });
      await newHistory.save();
    }

    req.logger.info(
      `✅ ${req.user?.username} Cập nhật người dùng thành công cho ID: ${user.username}`,
    );
    res.json({
      status: "success",
      data: user,
    });
  } catch (error) {
    req.logger.error("❌ Lỗi khi cập nhật người dùng", error);
    res.status(500).json({
      status: "error",
      message: "Cập nhật người dùng thất bại",
      error: error.message,
    });
  }
});

// Change password
router.put("/changepass", verifyToken, async (req, res) => {
  try {
    let { old_pass, newpass, repass } = req.body;
    req.logger.info(
      `Bắt đầu đổi mật khẩu: old_pass ${old_pass} newpass ${newpass} repass ${repass}`,
    );
    const norm = (s) => (s ?? "").normalize("NFC");

    old_pass = norm(old_pass);
    newpass = norm(newpass);
    repass = norm(repass);

    const user = await User.findById(req.user._id);
    if (!user) {
      req.logger.warn(`⚠️ Đổi mật khẩu thất bại - Không tìm thấy người dùng.`);
      return res
        .status(404)
        .send({ status: "error", message: "Không tìm thấy người dùng" });
    }

    const IsPassword = await bcrypt.compare(old_pass, user.password);
    if (!IsPassword) {
      req.logger.warn(
        `⚠️ Đổi mật khẩu thất bại - Mật khẩu cũ không chính xác. ${old_pass}`,
      );
      return res
        .status(400)
        .send({ status: "error", message: "Mật khẩu cũ không chính xác" });
    }
    if (!newpass) {
      req.logger.warn("⚠️ Đổi mật khẩu thất bại - Thiếu mật khẩu mới.");
      return res
        .status(400)
        .send({ status: "error", message: "Nhập mật khẩu mới" });
    }

    const hasEdgeSpace = (s) => s !== s.trim();
    if (hasEdgeSpace(newpass) || hasEdgeSpace(repass)) {
      req.logger.warn(`⚠️ Mật khẩu mới không được có khoảng trắng ở đầu/cuối.`);
      return res.status(400).send({
        status: "error",
        message: "Mật khẩu mới không được có khoảng trắng ở đầu/cuối",
      });
    }

    newpass = newpass.trim();
    repass = repass.trim();

    if (newpass !== repass) {
      req.logger.warn(
        `⚠️ Đổi mật khẩu thất bại - Mật khẩu nhập lại không khớp.${newpass} !=${repass}`,
      );
      return res
        .status(404)
        .send({ status: "error", message: "Mật khẩu nhập lại không khớp" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newpass, salt);
    user.password = hashedPassword;
    await user.save();
    req.logger.info(
      `✅ Đổi mật khẩu thành công cho người dùng: ${user.username} pass ${newpass}`,
    );
    res.status(200).send({
      status: "success",
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    req.logger.error("❌ Lỗi khi đổi mật khẩu", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
// reset pass
router.get("/resetpass/:id", verifyToken, async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);
    const user = await User.findByIdAndUpdate(req.params.id, {
      password: hashedPassword,
    });

    req.logger.info(
      `✅ ${req.user?.username} Reset mật khẩu thành công cho người dùng: ${user.username}`,
    );
    res.status(200).send({
      status: "success",
      message: "Reset mật khẩu thành công",
    });
  } catch (err) {
    req.logger.error("❌ Lỗi khi đổi mật khẩu", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
// add phone
router.put("/addphone", verifyToken, async (req, res) => {
  try {
    const body = req.body;
    const userUpdate = await User.findByIdAndUpdate(req.user._id, body, {
      new: true,
      runValidators: true,
    }).populate("position");
    if (!userUpdate) {
      req.logger.warn(
        "⚠️ Thêm số điện thoại thất bại - Không tìm thấy người dùng.",
      );
      return res.status(404).send({
        status: "error",
        message: "Thêm số điện thoại không thành công",
      });
    }
    const userData = userUpdate.toObject();
    delete userData.password;
    req.logger.info(
      `✅ ${req.user?.username} Thêm số điện thoại thành công cho người dùng: ${userUpdate.username}`,
    );
    res.status(200).send({
      status: "success",
      message: "Thêm số điện thoại thành công",
      data: userData,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi khi thêm số điện thoại", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.post("/save-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID not found." });
    }

    // Xoá token khỏi user khác (nếu có)
    await User.updateMany(
      { deviceTokens: token },
      { $pull: { deviceTokens: token } },
    );

    // Push token vào user hiện tại (chỉ khi chưa tồn tại)
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { deviceTokens: token } }, // $addToSet = không cho trùng
      { new: true },
    );

    res.json({ message: "Token saved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/remove-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID not found." });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { deviceTokens: token },
    });

    res.json({ message: "Token removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      req.logger.warn("⚠️ Yêu cầu xóa không có IDs hợp lệ.");
      return res
        .status(400)
        .send({ status: "error", message: "Vui lòng chọn bản ghi cần xóa" });
    }
    const usersToDelete = await User.find({ _id: { $in: ids } }).select(
      "_id username",
    );

    if (!usersToDelete.length) {
      req.logger.info("ℹ️ Không tìm thấy user để xóa.");
      return res
        .status(200)
        .send({ status: "error", message: "Không tìm thấy bản ghi để xóa" });
    }

    // Log danh sách tài khoản
    req.logger.info(
      `👤 ${user?.username} yêu cầu xóa (soft delete) các tài khoản: ${JSON.stringify(usersToDelete)}`,
    );

    // const result = await User.deleteMany({ _id: { $in: ids } });
    const result = await User.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          active: false,
        },
      },
      { new: true },
    );

    if (result.matchedCount === 0) {
      req.logger.info("ℹ️ Không tìm thấy bản ghi để cập nhật.");
      return res
        .status(200)
        .send({ status: "error", message: "Không tìm thấy bản ghi để xóa" });
    }
    // if (result.deletedCount === 0) {
    //     req.logger.info("ℹ️ Không tìm thấy bản ghi để xóa.");
    //     return res.status(200).send({ status: 'error', message: 'Không tìm thấy bản ghi để xóa' });
    // }

    req.logger.info(
      `✅ ${user?.username}  Đã xóa thành công ${result.matchedCount} người dùng.`,
    );
    res.status(200).json({
      status: "success",
      message: `Đã xóa ${result.matchedCount} bản ghi`,
    });
  } catch (error) {
    req.logger.error("❌ Lỗi khi xóa người dùng", error);
    res.status(500).json({
      status: "error",
      message: "Xóa người dùng thất bại",
      error: error.message,
    });
  }
});
router.delete("/me", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const usersToDelete = await User.findById(req.userId).select(
      "_id username",
    );
    req.logger.info(
      `👤 ${user?.username} yêu cầu xóa (soft delete) tài khoản: ${JSON.stringify(usersToDelete)}`,
    );

    const result = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          active: false,
        },
      },
      { new: true },
    );
    if (!result) {
      req.logger.info("ℹ️ Không tìm thấy người dùng để xóa.");
      return res
        .status(200)
        .send({ status: "error", message: "Không tìm thấy người dùng để xóa" });
    }

    req.logger.info(
      `✅ ${user?.username}  Đã xóa thành công người dùng ${req.userId}`,
    );
    res.status(200).json({
      status: "success",
      message: `Xóa người dùng thành công`,
    });
  } catch (error) {
    req.logger.error("❌ Lỗi khi xóa người dùng", error);
    res.status(500).json({
      status: "error",
      message: "Xóa người dùng thất bại",
      error: error.message,
    });
  }
});
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const columnMapping = {
  "Họ tên": "fullName",
  "Tài khoản": "username",
  "Thẻ lương": "salaryCode",
  "GIới tính": "gender",
  "Số điện thoại": "phone",
  email: "email",
  "Chức danh": "position",
  "Đơn vị": "department",
  Quyền: "role",
};
router.post(
  "/importFile",
  upload.single("file"),
  verifyToken,
  async (req, res) => {
    try {
      const user = req.user;
      if (!req.file) {
        req.logger.warn("⚠️ Import file thất bại - Không có file được chọn.");
        return res
          .status(400)
          .json({ status: "error", message: "Vui lòng chọn file" });
      }

      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const headers = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        range: 0,
        raw: true,
      })[0];
      const mappedHeaders = headers.map(
        (header) => columnMapping[header] || header,
      );
      const data = xlsx.utils.sheet_to_json(worksheet, {
        header: mappedHeaders,
        range: 1,
      });
      const usersToImport = data.filter((row) => row.username);

      if (usersToImport.length === 0) {
        req.logger.warn(
          "⚠️ Import file thất bại - Không tìm thấy dữ liệu hợp lệ.",
        );
        return res.status(400).json({
          status: "error",
          message: "Không tìm thấy dữ liệu người dùng hợp lệ trong file.",
        });
      }

      const uniqueDepartments = [
        ...new Set(usersToImport.map((d) => d.department).filter(Boolean)),
      ];
      const uniquePositions = [
        ...new Set(usersToImport.map((d) => d.position).filter(Boolean)),
      ];
      const uniqueSalaryCodes = [
        ...new Set(usersToImport.map((d) => d.salaryCode).filter(Boolean)),
      ];

      const [existingDepartments, existingPositions, existingSalaryCodes] =
        await Promise.all([
          Department.find({ code: { $in: uniqueDepartments } }).lean(),
          Position.find({ name: { $in: uniquePositions } }).lean(),
          User.find({ salaryCode: { $in: uniqueSalaryCodes } }).lean(),
        ]);

      const departmentMap = new Map(
        existingDepartments.map((d) => [d.code, d._id]),
      );
      const positionMap = new Map(
        existingPositions.map((p) => [p.name, p._id]),
      );
      const salaryCodeMap = new Map(
        existingSalaryCodes.map((s) => [s.salaryCode, s._id]),
      );

      const operations = [];
      const invalidRows = [];

      for (const row of usersToImport) {
        const { username, department, position, ...updateData } = row;

        if (!username || !row.fullName) {
          invalidRows.push({ row, error: "Tài khoản và Họ tên là bắt buộc." });
          continue;
        }

        if (!row.salaryCode) {
          invalidRows.push({
            row,
            error: `Thẻ lương là bắt buộc: ${username}`,
          });
          continue;
        }

        if (row.salaryCode) {
          const ownerUsername = salaryCodeMap.get(row.salaryCode);
          if (ownerUsername && ownerUsername !== username) {
            invalidRows.push({
              row,
              error: `Thẻ lương đã tồn tại: ${row.salaryCode}`,
            });
            continue;
          }
        }

        let departmentId = null;
        if (department) {
          departmentId = departmentMap.get(department);
          if (!departmentId) {
            invalidRows.push({
              row,
              error: `Mã phòng ban không hợp lệ: ${department}`,
            });
            continue;
          }
        }
        if (departmentId) {
          updateData.department = departmentId;
        }

        let positionId = null;
        if (position) {
          positionId = positionMap.get(position);
          if (!positionId) {
            invalidRows.push({
              row,
              error: `Tên chức danh không hợp lệ: ${position}`,
            });
            continue;
          }
        }
        if (positionId) {
          updateData.position = positionId;
        }

        // Xử lý mật khẩu chỉ khi bản ghi là mới
        const existingUser = await User.findOne({ username: username }).lean();
        if (!existingUser) {
          const salt = await bcrypt.genSalt(10);
          updateData.password = await bcrypt.hash("123456", salt);
        }

        // Sử dụng updateOne với upsert: true cho tất cả các bản ghi
        operations.push({
          updateOne: {
            filter: { username: username },
            update: updateData,
            upsert: true,
          },
        });
      }

      let bulkResult = null;
      if (operations.length > 0) {
        bulkResult = await User.bulkWrite(operations);
      }

      req.logger.info(
        `✅ ${user?.username}  Import file hoàn tất. Đã xử lý ${usersToImport.length} bản ghi.`,
      );
      req.logger.info(
        `📊 Thống kê: Thêm mới: ${bulkResult?.upsertedCount || 0}, Cập nhật: ${bulkResult?.modifiedCount || 0}, Lỗi: ${invalidRows.length}`,
      );

      res.status(200).json({
        status: "success",
        message: "Import dữ liệu hoàn tất.",
        summary: {
          totalProcessed: usersToImport.length,
          insertedCount: bulkResult?.upsertedCount || 0,
          updatedCount: bulkResult?.modifiedCount || 0,
          invalidCount: invalidRows.length,
        },
        invalidRows: invalidRows,
      });
    } catch (error) {
      req.logger.error("❌ Lỗi khi import file người dùng", error);
      res.status(500).json({
        status: "error",
        message: "Tải thất bại",
        error: error.message,
      });
    }
  },
);

router.post(
  "/exportFile",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const user = req.user;
      const query = {};

      if (user?.role === ROLE.MANAGER) {
        query.department = user?.department?._id;
      }

      if (req.query.department) {
        query.department = req.query.department;
      }

      const users = await User.find(query)
        .populate("department", "name code")
        .populate("position", "name");
      const departments = await Department.find();
      const positions = await Position.find();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("DS.nguoi_dung");

      worksheet.columns = [
        { header: "Họ tên", key: "fullName", width: 25 },
        { header: "Tài khoản", key: "username", width: 15 },
        { header: "Thẻ lương", key: "salaryCode", width: 15 },
        { header: "GIới tính", key: "gender", width: 10 },
        { header: "Số điện thoại", key: "phone", width: 15 },
        { header: "email", key: "email", width: 30 },
        { header: "Chức danh", key: "position", width: 20 },
        { header: "Đơn vị", key: "department", width: 20 },
        { header: "Quyền", key: "role", width: 20 },
      ];

      const formattedUsers = users.map((user) => ({
        fullName: user?.fullName || "",
        username: user?.username || "",
        salaryCode: user?.salaryCode || "",
        gender: user?.gender || "",
        phone: user?.phone || "",
        email: user?.email || "",
        position: user?.position?.name || "",
        department: user?.department?.code || "",
        role: user?.role || "",
      }));
      worksheet.addRows(formattedUsers);

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.font = { size: rowNumber === 1 ? 8 : 7, bold: rowNumber === 1 };
          cell.alignment = { vertical: "middle", wrapText: rowNumber === 1 };
        });
        row.height = rowNumber === 1 ? 40 : 20;
      });

      const posList = [
        ...new Set(positions.map((p) => p.name).filter(Boolean)),
      ];
      const deptList = [
        ...new Set(departments.map((d) => d.code).filter(Boolean)),
      ];

      worksheet.getColumn("X").values = ["positions", ...posList];
      worksheet.getColumn("Y").values = ["departments", ...deptList];
      worksheet.getColumn("X").hidden = true;
      worksheet.getColumn("Y").hidden = true;

      const MAX = Math.max(worksheet.rowCount + 100, 1000);
      worksheet.dataValidations.add(`D2:D${MAX}`, {
        type: "list",
        allowBlank: true,
        formulae: ['"Nam,Nữ"'],
        showErrorMessage: true,
        errorTitle: "Giá trị không hợp lệ",
        error: "Chỉ được chọn Nam hoặc Nữ.",
      });
      worksheet.dataValidations.add(`I2:I${MAX}`, {
        type: "list",
        allowBlank: true,
        formulae: ['"manager,employee"'],
        showErrorMessage: true,
        errorTitle: "Giá trị không hợp lệ",
      });
      worksheet.dataValidations.add(`G2:G${MAX}`, {
        type: "list",
        allowBlank: true,
        formulae: [`=$X$2:$X$${posList.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Giá trị không hợp lệ",
      });
      worksheet.dataValidations.add(`H2:H${MAX}`, {
        type: "list",
        allowBlank: true,
        formulae: [`=$Y$2:$Y$${deptList.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Giá trị không hợp lệ",
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "danh_sach_nguoi_dung.xlsx",
      );
      res.send(buffer);
      req.logger.info("✅ Xuất file người dùng thành công.");
    } catch (err) {
      req.logger.error("❌ Lỗi khi xuất file người dùng", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

module.exports = router;
