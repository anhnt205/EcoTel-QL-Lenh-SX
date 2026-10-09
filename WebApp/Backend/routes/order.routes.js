const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

const ShiftReport = require("../models/ShiftReport");
const Notification = require("../models/Notification");

const History = require("../models/History");
const User = require("../models/User");
const Job = require("../models/Job");
const Shift = require("../models/Shift");
const Material = require("../models/material");
const { getTravellog, rangeTime } = require("../utils/reportGrouping");
const mongoose = require("mongoose");
const {
  ROLE,
  JOB_TYPE,
  STATUS_DEVICE,
  STATUS_DEVICES,
  STATUS_ORDERS,
  STATUS_ORDER,
  STATUS_REPAIR,
} = require("../config/config");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");
const dayjs = require("dayjs");
const Device = require("../models/Device");
const DeviceType = require("../models/DeviceType");

const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const { paginateQuery } = require("../utils/pagination");
const CheckIn = require("../models/CheckIn");
const sendPushNotification = require("../utils/sendNotification");
const {
  applyFrozen,
  applyFrozenAll,
  frozenEditDecision,
} = require("../services/orderSnapshot");
const { freezeOrder } = require("../services/orderFreeze");
const { safeRegex } = require("../utils/escapeRegex");

router.get("/", verifyToken, async (req, res, next) => {
  try {
    const user = req.user;
    const query = {};

    // ---- Bộ lọc chung ----
    if (req.query.q) {
      const regex = safeRegex(req.query.q);

      // tìm user theo salaryCode
      const matchedUsers = await User.find(
        {
          $or: [{ salaryCode: req.query.q }, { fullName: regex }],
        },
        { _id: 1 },
      ).lean();
      const userIds = matchedUsers.map((u) => u._id);

      // tìm job theo name
      const matchedJobs = await Job.find({ name: regex }, { _id: 1 }).lean();
      const jobIds = matchedJobs.map((j) => j._id);

      if (userIds.length || jobIds.length) {
        query.$or = [];
        if (userIds.length) query.$or.push({ assignedTo: { $in: userIds } });
        if (jobIds.length) query.$or.push({ job: { $in: jobIds } });
      } else {
        // nếu không match gì thì trả về rỗng
        query._id = null;
      }
    }
    if (req.query.assignedTo) {
      const regex = safeRegex(req.query.assignedTo);

      // tìm user theo salaryCode
      const matchedUsers = await User.find(
        { fullName: regex },
        { _id: 1 },
      ).lean();
      const userIds = matchedUsers.map((u) => u._id);
      query.assignedTo = {
        $in: userIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
    if (req.query.createdBy) {
      const regex = safeRegex(req.query.createdBy);

      // tìm user theo salaryCode
      const matchedUsers = await User.find(
        { fullName: regex },
        { _id: 1 },
      ).lean();
      const userIds = matchedUsers.map((u) => u._id);
      query.createdBy = {
        $in: userIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
    if (req.query.salaryCode) {
      // tìm user theo salaryCode
      const matchedUsers = await User.find(
        { salaryCode: req.query.salaryCode },
        { _id: 1 },
      ).lean();
      const userIds = matchedUsers.map((u) => u._id);
      query.assignedTo = {
        $in: userIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
    if (req.query.job) {
      const regex = safeRegex(req.query.job);

      // tìm user theo salaryCode
      const matchedJobs = await Job.find({ name: regex }, { _id: 1 }).lean();
      const jobIds = matchedJobs.map((j) => j._id);
      query.job = { $in: jobIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    if (req.query.device) {
      const regex = safeRegex(req.query.device);

      // tìm user theo salaryCode
      const matchedDevices = await Device.find(
        { code: regex },
        { _id: 1 },
      ).lean();
      const deviceIds = matchedDevices.map((u) => u._id);
      query.device = {
        $in: deviceIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
    if (req.query.material) {
      const regex = safeRegex(req.query.material);

      const matchedMaterials = await Material.find(
        { name: regex },
        { _id: 1 },
      ).lean();
      const materialIds = matchedMaterials.map((u) => u._id);
      query.material = {
        $in: materialIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
    if (req.query.shift) {
      const matchedShifts = await Shift.find(
        { name: req.query.shift },
        { _id: 1 },
      ).lean();
      const shiftIds = matchedShifts.map((u) => u._id);
      query.shift = {
        $in: shiftIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (req.query.startTime && req.query.endTime) {
      const endTime = new Date(req.query.endTime);
      endTime.setHours(23, 59, 59, 999);
      query.workingDate = {
        $gte: new Date(req.query.startTime),
        $lte: new Date(endTime),
      };
    } else if (req.query.startTime) {
      query.workingDate = { $gte: new Date(req.query.startTime) };
    } else if (req.query.endTime) {
      const endTime = new Date(req.query.endTime);
      endTime.setHours(23, 59, 59, 999);
      query.workingDate = { $lte: new Date(endTime) };
    }

    // ---- Bộ lọc role ----
    if (user?.role === ROLE.MANAGER && user?.department) {
      query.department = new mongoose.Types.ObjectId(user.department._id);
    }
    if (user?.role === ROLE.DISPATCHER) {
      const dispatcherIds = await User.find(
        { role: ROLE.DISPATCHER },
        "_id",
      ).lean();
      const ids = dispatcherIds.map((d) => d._id);
      query.$or = [
        { department: user.department._id },
        { createdBy: { $in: ids } },
      ];
    }
    if (req.query.department) {
      query.department = new mongoose.Types.ObjectId(req.query.department);
    }

    // chỉ sort workingDate trong DB

    // ---- 1. Tính statusCounts (chưa filter status) ----
    const statusAgg = await Order.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusCounts = {
      all: 0,
      pending: 0,
      in_progress: 0,
      warning: 0,
      completed: 0,
      cancel: 0,
    };

    statusAgg.forEach((s) => {
      statusCounts.all += s.count;
      if (s._id && statusCounts.hasOwnProperty(s._id)) {
        statusCounts[s._id] = s.count;
      }
    });

    const dataFilter = { ...query };
    if (req.query.status) {
      dataFilter.status = req.query.status;
    }

    let baseQuery = Order.find(dataFilter)
      .populate({
        path: "assignedTo",
        select: "username fullName salaryCode department position",
        populate: [
          { path: "department", select: "code" },
          { path: "position", select: "name" },
        ],
      })
      .populate("job", "name type content")
      .populate("device", "code")
      .populate("repairDepartment", "code")
      .populate("excavator.device", "code")
      .populate("assignedVehicles", "code")
      .populate("location", "name")
      .populate("material", "name")
      .populate("shift")
      .populate({ path: "assistants", select: "username fullName salaryCode" })
      .populate({ path: "repairVehicles.device", select: "code" })
      .populate({
        path: "shiftReport",
        populate: [
          { path: "vehicleSummaries.vehicle", select: "code" },
          { path: "vehicleRepair.device", select: "code" },
        ],
      })
      .populate({
        path: "createdBy",
        select: "username fullName salaryCode position",
        populate: { path: "position", select: "name" },
      })
      .populate("updatedBy", "username fullName")
      .sort({ workingDate: -1, createdAt: -1 });

    const paginationResult = await paginateQuery(
      baseQuery,
      Order,
      dataFilter,
      req.query,
    );

    // Lệnh đã hoàn thành hiển thị theo bản chụp đã chốt (xem services/orderSnapshot.js)
    paginationResult.data = applyFrozenAll(paginationResult.data);

    // ---- Sort bổ sung theo shift.name ở JS ----
    paginationResult.data.sort((a, b) => {
      const dateA = new Date(a.workingDate);
      const dateB = new Date(b.workingDate);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      const nameA = a.shift?.name ? String(a.shift.name) : "";
      const nameB = b.shift?.name ? String(b.shift.name) : "";
      return nameB.localeCompare(nameA); // DESC
    });

    return res.status(200).json({
      status: "success",
      ...paginationResult,
      statusCounts,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
router.get("/count_status", verifyToken, async (req, res, next) => {
  try {
    const user = req.user;
    let baseQuery = {};

    // --- Bộ lọc role ---
    if (user?.role === ROLE.MANAGER && user?.department) {
      baseQuery.department = new mongoose.Types.ObjectId(user.department._id);
    }
    if (user?.role === ROLE.ADMIN && req.query.department) {
      baseQuery.department = new mongoose.Types.ObjectId(req.query.department);
    }
    if (user?.role === ROLE.DISPATCHER) {
      const dispatcherIds = await User.find(
        { role: ROLE.DISPATCHER },
        "_id",
      ).lean();
      const ids = dispatcherIds.map((d) => d._id);
      baseQuery.$or = [
        { department: new mongoose.Types.ObjectId(user.department._id) },
        { createdBy: { $in: ids } },
      ];
    }

    // --- Ngày được chọn ---
    let dayStart, dayEnd;
    if (req.query.date) {
      const date = new Date(req.query.date);
      dayStart = new Date(date.setHours(0, 0, 0, 0));
      dayEnd = new Date(date.setHours(23, 59, 59, 999));
    } else {
      const now = new Date();
      dayStart = new Date(now.setHours(0, 0, 0, 0));
      dayEnd = new Date(now.setHours(23, 59, 59, 999));
    }

    // --- Đầu tháng ---
    const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);

    const dayQuery = {
      ...baseQuery,
      workingDate: { $gte: dayStart, $lte: dayEnd },
    };

    // --- filter tháng ---
    const monthQuery = {
      ...baseQuery,
      workingDate: { $gte: monthStart, $lte: dayEnd },
    };

    // ---- 1. Tính theo ngày, group theo status + ca ----
    const dailyAgg = await Order.aggregate([
      { $match: dayQuery },
      {
        $lookup: {
          from: "shifts",
          localField: "shift",
          foreignField: "_id",
          as: "shift",
        },
      },
      { $unwind: "$shift" },
      {
        $group: {
          _id: { status: "$status", shift: "$shift.name" },
          count: { $sum: 1 },
        },
      },
    ]);

    // ---- 1b. Tính số lượng theo ngày (không phân ca) ----
    const dailyTotalAgg = await Order.aggregate([
      { $match: dayQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // ---- 2. Tính lũy kế tháng, group theo status ----
    const monthlyAgg = await Order.aggregate([
      { $match: monthQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // ---- Chuẩn hóa kết quả ----
    const result = {};

    STATUS_ORDERS.forEach((st) => {
      result[st] = {
        ca1: 0,
        ca2: 0,
        ca3: 0,
        day: 0,
        month: 0,
      };
    });

    // Lấp daily
    dailyAgg.forEach((d) => {
      const { status, shift } = d._id;
      if (result[status]) {
        if (shift === 1) result[status].ca1 = d.count;
        if (shift === 2) result[status].ca2 = d.count;
        if (shift === 3) result[status].ca3 = d.count;
      }
    });

    // Lấp day
    dailyTotalAgg.forEach((day) => {
      if (result[day._id]) {
        result[day._id].day = day.count;
      }
    });
    // Lấp monthly
    monthlyAgg.forEach((m) => {
      if (result[m._id]) {
        result[m._id].month = m.count;
      }
    });

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.post("/checkExist", verifyToken, async (req, res, next) => {
  try {
    const { assignedTo, workingDate, shift } = req.body;
    const exitOrder = await Order.findOne({
      assignedTo: assignedTo,
      shift: shift,
      workingDate: workingDate,
    }).populate("assignedTo", "fullName salaryCode");

    req.logger.info(`✅ Kiểm tra lệnh thành công`);

    res.status(200).json({
      status: "success",
      data: exitOrder,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
router.post(
  "/",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const {
        assignedTo,
        job,
        workingDate,
        device,
        assignedVehicles,
        repairVehicles,
        repairDepartment,
        shift,
        shiftHour,
        excavator,
        location,
        material,
        workContent,
        note,
        safetyMeasure,
        safetyMeasureSpecific,
        department,
        batchId,
        previous_order_id,
        risk,
      } = req.body;

      const user = await User.findById(assignedTo);
      // Generate order number
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      const orderNumber = `${year}${month}${day}${random}`;
      const filteredRepairVehicles = (repairVehicles || []).filter(
        (r) => r.device,
      );
      const order = await Order.create({
        orderNumber,
        assignedTo,
        job,
        workingDate,
        device,
        assignedVehicles,
        repairVehicles: filteredRepairVehicles,
        repairDepartment,
        shift,
        shiftHour,
        safetyMeasure,
        safetyMeasureSpecific,
        previous_order_id,
        excavator,
        location,
        material,
        workContent,
        note,
        department: user?.department,
        batchId,
        createdBy: req.user._id,
        risk,
      });
      req.logger.info(`✅ Tạo lệnh thành công với ID: ${order._id}`);

      await Promise.all(
        (order.repairVehicles || [])
          .filter((d) => d.device)
          .map(
            async (r) =>
              await Device.findByIdAndUpdate(
                r.device,
                { $set: { note: r.note } },
                { new: true },
              ),
          ),
      );

      req.logger.info("🔔 Gửi thông báo đến người dùng.");
      const tokens = user?.deviceTokens;
      await Promise.all(
        tokens.map((t) =>
          sendPushNotification(
            t,
            "Bạn có thông báo mới",
            "Có 1 lệnh được cập nhật",
          ),
        ),
      );
      await Notification.createNotification({
        title: "Lệnh mới",
        message: "Tạo lệnh mới",
        type: "order",
        recipient: assignedTo,
        sender: req.userId,
      });
      req.logger.info(
        `✅ Gửi thông báo thành công cho người dùng ${assignedTo}`,
      );

      res.status(201).json({
        status: "success",
        message: "Tạo thành công",
        data: order,
      });
      req.logger.info("✨ Kết thúc xử lý request thành công.");
    } catch (err) {
      req.logger.error("❌ Lỗi", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
      req.logger.error("🚨 Kết thúc xử lý request với lỗi.");
    }
  },
);

router.put("/:id", verifyToken, async (req, res, next) => {
  try {
    const user = req.user;
    // `frozen` (bản chụp đã chốt) và `forceEditFrozen` không bao giờ được ghi thẳng từ request
    const { status, forceEditFrozen, frozen: _ignoredFrozen, ...body } = req.body;
    const { id } = req.params;
    req.logger.info(`🔍 Bắt đầu cập nhật lệnh với ID: ${id}`);

    // 1. Lấy đơn hàng hiện tại để kiểm tra
    const order = await Order.findById(id)
      .populate("job")
      .populate("shiftReport")
      .lean();

    if (!order) {
      req.logger.warn("⚠️ Lỗi 404 - Không tìm thấy lệnh với ID này.");
      return res
        .status(404)
        .send({ status: "error", message: "Không tìm thấy lệnh với ID này." });
    }

    // Lệnh đã hoàn thành = đã chốt thông tin. Trong 48 giờ kể từ giờ kết thúc (ORDER_EDIT_WINDOW_HOURS) vẫn được sửa
    // (kể cả thêm/sửa phụ máy) và bản chụp được chụp lại đúng phần vừa sửa; quá hạn thì khoá (409), không mở lại
    // được, giờ kết thúc luôn khoá. Gửi lại đúng giá trị cũ thì không tính là sửa (vd app gửi nguyên lệnh). Chỉ
    // admin gửi forceEditFrozen: true mới sửa được lệnh đã khoá. Xem services/orderSnapshot.js#frozenEditDecision.
    const wasFrozen = order.status === STATUS_ORDER.COMPLETED;
    const adminForce =
      wasFrozen && user?.role === ROLE.ADMIN && forceEditFrozen === true;
    let frozenEditKeys = [];
    let editedInWindow = false;
    if (wasFrozen) {
      const decision = frozenEditDecision(order, body, { status, adminForce });
      frozenEditKeys = decision.editKeys;
      editedInWindow = decision.inWindow;
      if (decision.blocked) {
        req.logger.warn(
          `⚠️ ${user?.username} sửa lệnh đã hoàn thành ${id} bị từ chối (${decision.reason}: ${decision.fields.join(", ")})`,
        );
        const message = {
          reopen: "Lệnh đã hoàn thành nên không thể mở lại hoặc đổi trạng thái.",
          expired:
            "Lệnh đã hoàn thành quá 48 giờ nên đã bị khoá, không thể thêm hoặc sửa thông tin.",
          endTime: "Không được sửa giờ kết thúc của lệnh đã hoàn thành.",
        }[decision.reason];
        return res.status(409).send({
          status: "error",
          message,
          reason: decision.reason,
          fields: decision.fields,
        });
      }
    }

    // 2. Chuẩn bị đối tượng cập nhật

    let updateObject = {
      ...body,
      updatedBy: req.user._id,
    };

    // 3. Xử lý logic trạng thái
    req.logger.info(`    - Trạng thái lệnh: ${status}`);
    switch (status) {
      case STATUS_ORDER.INPROGRESS:
        if (!order.startTime) {
          updateObject.startTime = new Date();
        }
        updateObject.resumeTime = new Date();
        if (order.device && order.device.length > 0) {
          const lastDeviceId = order.device[order.device.length - 1];
          req.logger.info(`- Tìm thấy phương tiện: ${lastDeviceId}`);
          let deviceStatus = null;

          if (order.job?.type) {
            const type = order.job.type.toLowerCase();

            if (
              [
                JOB_TYPE.VAN_HANH_XE,
                JOB_TYPE.VAN_HANH_XUC,
                JOB_TYPE.VAN_HANH_XE_PHUC_VU,
                JOB_TYPE.VAN_HANH_KHOAN,
                JOB_TYPE.VAN_HANH_GAT,
                JOB_TYPE.VAN_HANH_BOM,
                JOB_TYPE.VAN_HANH_SANG,
                JOB_TYPE.SUA_CHUA_BAO_DUONG,
              ]
                .map((j) => j.toLowerCase())
                .includes(type)
            ) {
              deviceStatus = STATUS_DEVICE.IN_USE;
            }
          }

          if (deviceStatus) {
            await Device.updateOne(
              { _id: lastDeviceId },
              { status: deviceStatus },
            );
            req.logger.info(
              `✅ Device ${lastDeviceId} cập nhật sang ${deviceStatus}`,
            );
          }
        }
        if (order.repairVehicles && order.repairVehicles.length > 0) {
          for (const item of order.repairVehicles) {
            await Device.updateOne(
              { _id: item.device },
              { status: STATUS_DEVICE.MAINTENANCE },
            );
            req.logger.info(
              `✅ Device ${item.device} cập nhật sang ${STATUS_DEVICE.MAINTENANCE}`,
            );
          }
        }
        updateObject.status = status;
        break;

      case STATUS_ORDER.COMPLETED:
        if (wasFrozen) {
          // Báo hoàn thành lại một lệnh đã hoàn thành: giữ nguyên giờ kết thúc và KHÔNG giải phóng thiết bị
          // lần nữa (thiết bị có thể đã được giao cho lệnh khác)
          updateObject.status = status;
          break;
        }
        updateObject.endTime = new Date();
        updateObject.status = status;
        if (order.device && order.device.length > 0) {
          const lastDeviceId = order.device[order.device.length - 1];
          req.logger.info(
            `    - Giải phóng phương tiện cuối cùng: ${lastDeviceId}`,
          );

          if (order.job?.type) {
            const type = order.job.type.toLowerCase();
            if (
              [
                JOB_TYPE.VAN_HANH_XE,
                JOB_TYPE.VAN_HANH_XUC,
                JOB_TYPE.VAN_HANH_XE_PHUC_VU,
                JOB_TYPE.VAN_HANH_KHOAN,
                JOB_TYPE.VAN_HANH_GAT,
                JOB_TYPE.VAN_HANH_BOM,
                JOB_TYPE.VAN_HANH_SANG,
                JOB_TYPE.SUA_CHUA_BAO_DUONG,
              ]
                .map((j) => j.toLowerCase())
                .includes(type)
            ) {
              deviceStatus = STATUS_DEVICE.AVAILABLE;
            }
          }

          if (deviceStatus) {
            await Device.updateOne(
              { _id: lastDeviceId },
              { status: deviceStatus },
            );
            req.logger.info(
              `✅ Device ${lastDeviceId} cập nhật sang ${deviceStatus}`,
            );
          }
        }
        if (
          order.shiftReport?.vehicleRepair &&
          order.shiftReport?.vehicleRepair.length > 0
        ) {
          for (const item of order.shiftReport?.vehicleRepair) {
            if (item.status === STATUS_REPAIR.COMPLETED) {
              await Device.updateOne(
                { _id: item.device },
                { status: STATUS_DEVICE.AVAILABLE },
              );
              req.logger.info(
                `✅ Device ${item.device} cập nhật sang ${STATUS_DEVICE.AVAILABLE}`,
              );
            }
          }
        }
        break;

      case STATUS_ORDER.CANCEL:
      case STATUS_ORDER.WARNING:
        updateObject.status = status;
        if (order.device && order.device.length > 0) {
          const lastDeviceId = order.device[order.device.length - 1];
          req.logger.info(
            `    - Giải phóng phương tiện cuối cùng: ${lastDeviceId}`,
          );
          let deviceStatus = null;

          if (order.job?.type) {
            const type = order.job.type.toLowerCase();
            if (
              [
                JOB_TYPE.VAN_HANH_XE,
                JOB_TYPE.VAN_HANH_XUC,
                JOB_TYPE.VAN_HANH_XE_PHUC_VU,
                JOB_TYPE.VAN_HANH_KHOAN,
                JOB_TYPE.VAN_HANH_GAT,
                JOB_TYPE.VAN_HANH_BOM,
                JOB_TYPE.VAN_HANH_SANG,
                JOB_TYPE.SUA_CHUA_BAO_DUONG,
              ]
                .map((j) => j.toLowerCase())
                .includes(type)
            ) {
              deviceStatus = STATUS_DEVICE.AVAILABLE;
            }
          }

          if (deviceStatus) {
            await Device.updateOne(
              { _id: lastDeviceId },
              { status: deviceStatus },
            );
            req.logger.info(
              `✅ Device ${lastDeviceId} cập nhật sang ${deviceStatus}`,
            );
          }
        }
        break;
      default:
        updateObject.status = status;
        break;
    }

    // 4. Thực hiện cập nhật
    const updatedOrder = await Order.findByIdAndUpdate(id, updateObject, {
      new: true,
    })
      .populate({
        path: "assignedTo",
        select: "username fullName salaryCode department",
        populate: { path: "department", select: "code" },
      })
      .populate("job", "name type content")
      .populate("device", "code")
      .populate("excavator.device", "code")
      .populate("assignedVehicles", "code")
      .populate("location", "name")
      .populate("material", "name")
      .populate("shift")
      .populate({ path: "assistants", select: "username fullName salaryCode" })
      .populate({
        path: "shiftReport",
        populate: [
          { path: "vehicleSummaries.vehicle", select: "code" },
          { path: "vehicleRepair.device", select: "code" },
        ],
      })
      .populate({ path: "createdBy", select: "_id fullName phone salaryCode" })
      .sort("-createdAt");

    // 4b. Lệnh hoàn thành thì chốt thông tin ngay (hoặc chụp lại phần admin vừa sửa). Lỗi ở bước này không
    // làm hỏng việc hoàn thành lệnh: bộ quét định kỳ (utils/cron.js) sẽ chốt bù.
    if (updatedOrder.status === STATUS_ORDER.COMPLETED) {
      try {
        const refreeze = (adminForce || editedInWindow) && frozenEditKeys.length > 0;
        await freezeOrder(id, {
          source: "completion",
          refreeze,
          keys: frozenEditKeys,
          editedBy: req.user._id,
        });
        if (refreeze) {
          await new History({
            entity: updatedOrder._id,
            changedBy: req.userId,
            snapshot: {
              ...updatedOrder.toObject(),
              forceEditedFrozen: adminForce,
              editedInWindow: !adminForce,
              forceEditedFields: frozenEditKeys,
            },
          }).save();
        }
      } catch (freezeErr) {
        req.logger.error("❌ Không chốt được thông tin lệnh", freezeErr);
      }
    }

    // 5. Tạo lịch sử và thông báo (chỉ khi có thay đổi trạng thái cần ghi nhận)
    if (order.status !== updatedOrder.status) {
      await Notification.createNotification({
        title: "Trạng thái lệnh",
        message:
          updatedOrder.status === STATUS_ORDER.WARNING
            ? "Báo lệnh lỗi"
            : "Chỉnh sửa lệnh",
        type: "order",
        recipient:
          req.userId.toString() === updatedOrder.assignedTo?._id.toString()
            ? updatedOrder.createdBy._id
            : updatedOrder.assignedTo._id,
        sender: req.userId,
      });

      const snapshot = updatedOrder.toObject();
      const newHistory = new History({
        entity: updatedOrder._id,
        changedBy: req.userId,
        snapshot: snapshot,
      });
      await newHistory.save();
      req.logger.info(`    - Lịch sử đã được ghi lại.`);
    } else {
      req.logger.info(
        "ℹ️ Trạng thái lệnh không thay đổi. Bỏ qua việc tạo thông báo và lịch sử.",
      );
    }

    if (updatedOrder.shiftReport?.handoverNotes) {
      const nextOrder = await Order.findOne({ previous_order_id: order._id });
      if (nextOrder) {
        nextOrder.note = updatedOrder.shiftReport.handoverNotes;
        await nextOrder.save();
      } else {
        // ghi log hoặc xử lý nếu không có nextOrder
        req.logger?.warn?.(`Không tìm thấy nextOrder cho order ${order._id}`);
      }
    }

    // 6. Gửi phản hồi
    res.status(200).json({
      status: "success",
      message: "Sửa thành công",
      data: updatedOrder,
    });
    req.logger.info(
      `🔍${user?.username} Kết thúc xử lý lệnh request thành công: ${id}`,
    );
  } catch (err) {
    req.logger.error("❌ Lỗi khi cập nhật lệnh", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.delete(
  "/",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const user = req.user;
      const { ids } = req.body;
      req.logger.info(`🔍 ${user?.username} bắt đầu xóa lệnh`);

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        req.logger.warn("⚠️ Lỗi 400 - Vui lòng chọn bản ghi cần xóa.");
        return res
          .status(400)
          .send({ status: "error", message: "Vui lòng chọn bản ghi cần xóa" });
      }

      // Cải thiện logic: Lấy ID của shiftReport và xóa cùng lúc
      req.logger.info("🔄 Tìm kiếm các ShiftReport liên quan...");
      const shiftReportsToDelete = await Order.find({
        _id: { $in: ids },
        shiftReport: { $exists: true },
      })
        .select("shiftReport")
        .lean();
      const shiftReportIds = shiftReportsToDelete.map((o) => o.shiftReport);
      req.logger.info(
        `✅ Tìm thấy ${shiftReportIds.length} ShiftReport liên quan.`,
      );

      if (shiftReportIds.length > 0) {
        req.logger.info("🔄 Bắt đầu xóa các ShiftReport liên quan.");
        await ShiftReport.deleteMany({ _id: { $in: shiftReportIds } });
        req.logger.info("✅ Đã xóa ShiftReport thành công.");
      }

      // Xóa các order và lấy lại để gửi thông báo
      const ordersToDelete = await Order.find({ _id: { $in: ids } })
        .select("assignedTo")
        .lean();
      const result = await Order.deleteMany({ _id: { $in: ids } });

      if (result.deletedCount === 0) {
        req.logger.warn("⚠️ Không tìm thấy bản ghi để xóa.");
        return res
          .status(200)
          .send({ status: "error", message: "Không tìm thấy bản ghi để xóa" });
      }

      req.logger.info(`✅ Đã xóa thành công ${result.deletedCount} bản ghi.`);

      // Gửi thông báo cho từng người phụ trách
      // Sử dụng Promise.all để gửi thông báo song song
      req.logger.info("🔔 Bắt đầu gửi thông báo.");
      const notificationPromises = ordersToDelete.map((order) => {
        return Notification.createNotification({
          title: "Xóa lệnh",
          message: "Xóa lệnh",
          type: "order",
          recipient: order.assignedTo,
          sender: req.userId,
        });
      });
      await Promise.all(notificationPromises);
      req.logger.info("✅ Đã gửi tất cả thông báo thành công.");

      res.status(200).json({
        status: "success",
        message: `Đã xóa ${result.deletedCount} bản ghi`,
      });
      req.logger.info(
        `✨ ${user?.username} Kết thúc xử lý xóa  lệnh thành công. ${result.deletedCount}`,
      );
    } catch (err) {
      req.logger.error("❌ Lỗi khi xóa nhiều bản ghi", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.delete(
  "/:id",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const user = req.user;
      req.logger.info(`✅ ${user?.username} bắt đầu xóa lệnh`);

      const order = await Order.findByIdAndDelete(req.params.id).populate(
        "shiftReport",
      );

      if (!order) {
        req.logger.warn("⚠️ Lỗi 404 - Không tìm thấy lệnh để xóa.");
        return res
          .status(404)
          .send({ status: "error", message: "Không tìm thấy bản ghi để xóa" });
      }

      if (order.shiftReport) {
        await ShiftReport.findByIdAndDelete(order.shiftReport._id);
        req.logger.info("✅ Đã xóa ShiftReport thành công.");
      }

      await Notification.createNotification({
        title: "Xóa lệnh",
        message: "Xóa lệnh",
        type: "order",
        recipient: order.assignedTo,
        sender: req.userId,
      });
      req.logger.info(`✅ ${user?.username} đã xóa 1 lệnh.`);

      res.status(200).send({ status: "success", message: "Xóa thành công" });
    } catch (err) {
      req.logger.error("❌ Lỗi khi xóa một bản ghi", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

const orderPopulateOptions = [
  {
    path: "assignedTo",
    select: "username fullName phone salaryCode department position",
    populate: [
      { path: "department", select: "code" },
      { path: "position", select: "name" },
    ],
  },
  { path: "job", select: "name type content" },
  { path: "device", select: "code" },
  { path: "assignedVehicles", select: "code" },
  { path: "excavator.device", select: "code" },
  { path: "location", select: "name" },
  { path: "material", select: "name" },
  { path: "repairDepartment", select: "code" },
  { path: "shift" },
  {
    path: "assistants",
    select: "username fullName salaryCode",
  },
  { path: "repairVehicles.device", select: "code" },
  {
    path: "shiftReport",
    populate: [
      { path: "vehicleSummaries.vehicle", select: "code" },
      { path: "vehicleRepair.device", select: "code" },
    ],
  },
  {
    path: "createdBy",
    select: "username fullName phone salaryCode department",
    populate: [{ path: "department", select: "code" }],
  },
];
router.get("/user", verifyToken, async (req, res, next) => {
  try {
    const query = { assignedTo: req.user._id };

    query.status = { $ne: STATUS_ORDER.CANCEL };

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Tính gte/lte theo input
    let gte = null;
    let lte = endOfToday; // mặc định không vượt quá hôm nay

    if (req.query.startTime) {
      const s = new Date(req.query.startTime);
      if (!isNaN(s)) {
        s.setHours(0, 0, 0, 0);
        gte = s;
      }
    }

    if (req.query.endTime) {
      const e = new Date(req.query.endTime);
      if (!isNaN(e)) {
        e.setHours(23, 59, 59, 999);
        // clamp: không cho vượt quá hôm nay
        lte = e > endOfToday ? endOfToday : e;
      }
    }

    // Gán workingDate một lần, không bị ghi đè
    query.workingDate = {};
    if (gte) query.workingDate.$gte = gte;
    if (lte) query.workingDate.$lte = lte;

    const statusAgg = await Order.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusCounts = {
      all: 0,
      pending: 0,
      in_progress: 0,
      warning: 0,
      completed: 0,
      cancel: 0,
    };

    statusAgg.forEach((s) => {
      statusCounts.all += s.count;
      if (s._id && statusCounts.hasOwnProperty(s._id)) {
        statusCounts[s._id] = s.count;
      }
    });

    const dataFilter = { ...query };
    if (req.query.status) {
      dataFilter.status = req.query.status;
    }

    // Phân trang

    let baseQuery = Order.find(dataFilter)
      .populate(orderPopulateOptions)
      .sort({ workingDate: -1, createdAt: -1 });

    const paginationResult = await paginateQuery(
      baseQuery,
      Order,
      dataFilter,
      req.query,
    );

    // Lệnh đã hoàn thành hiển thị theo bản chụp đã chốt (xem services/orderSnapshot.js)
    paginationResult.data = applyFrozenAll(paginationResult.data);

    paginationResult.data?.sort((a, b) => {
      // 1. So sánh workingDate (DESC)
      const dateA = new Date(a.workingDate);
      const dateB = new Date(b.workingDate);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;

      // 2. So sánh shift.name (DESC)
      const nameA = a.shift?.name ? String(a.shift.name) : "";
      const nameB = b.shift?.name ? String(b.shift.name) : "";
      return nameB.localeCompare(nameA); // DESC
    });
    req.logger.info(`✅ Đã tìm thấy ${paginationResult.data.length} lệnh.`);
    res
      .status(200)
      .send({ status: "success", ...paginationResult, statusCounts });
  } catch (err) {
    req.logger.error("❌ Lỗi khi lấy danh sách lệnh", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      orderPopulateOptions,
    ); // Sử dụng biến chung

    if (!order) {
      req.logger.warn("⚠️ Lỗi 404 - Không tìm thấy lệnh.");
      return res
        .status(404)
        .send({ status: "error", message: "Không tìm thấy lệnh với ID này." });
    }

    req.logger.info("✅ Đã tìm thấy chi tiết lệnh.");
    res.status(200).send({ status: "success", data: applyFrozen(order) });
  } catch (err) {
    req.logger.error("❌ Lỗi khi lấy chi tiết lệnh", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.post("/scanWork", verifyToken, async (req, res, next) => {
  try {
    const { deviceId, deviceCode, lat, lng, orderId } = req.body;

    const order = await Order.findById(orderId).populate("shiftReport");
    if (!order) {
      return res
        .status(404)
        .send({ status: "error", message: "Không tìm thấy lệnh làm việc" });
    }

    const vehicle = await Device.findById(deviceId);
    if (!vehicle) {
      return res
        .status(404)
        .send({ status: "error", message: "Không tìm thấy thiết bị" });
    }
    if (vehicle.code !== deviceCode) {
      return res
        .status(400)
        .send({ status: "error", message: "Thiết bị không khớp" });
    }
    // if (!vehicle.coordinates || !vehicle.coordinates.coordinates || vehicle.coordinates.coordinates.length !== 2) {
    //     return res.status(400).send({ status: 'error', message: 'Thiết bị chưa có tọa độ hợp lệ' });
    // }

    // const [deviceLng, deviceLat] = vehicle.coordinates.coordinates; // GeoJSON lưu theo [lng, lat]
    // const distance = getDistanceFromLatLngInMeters(lat, lng, deviceLat, deviceLng);
    // if (distance > 50) {
    //     return res.status(403).send({
    //         status: 'error',
    //         message: `Khoảng cách quá xa. Vui lòng đến gần thiết bị hơn.`,
    //     });
    // }
    let startTime = order.startTime;
    let endTime = order.endTime;
    let status = order.status;

    if (!order.startTime) {
      startTime = new Date();
    } else if (!order.endTime) {
      endTime = new Date();
    }

    const orderUpdate = await Order.findByIdAndUpdate(
      orderId,
      {
        startTime,
        endTime,
        status,
      },
      { new: true },
    )
      .populate({
        path: "assignedTo",
        select: "_id username fullName phone salaryCode",
      })
      .populate("job", "name type content")
      .populate("device", "code")
      .populate("excavator.device", "code")
      .populate("assignedVehicles", "code")
      .populate("location", "name")
      .populate("material", "name")
      .populate("shift")
      .populate({
        path: "assistants",
        select: "username fullName salaryCode",
      })
      .populate({
        path: "createdBy",
        select: "_id fullName phone salaryCode",
      });
    if (!orderUpdate) {
      return res
        .status(404)
        .send({ status: "error", message: "Không tìm thấy lệnh làm việc" });
    }

    let deviceStatus = vehicle.status;
    if (orderUpdate.status === STATUS_ORDER.INPROGRESS) {
      deviceStatus = STATUS_DEVICE.IN_USE;
    } else if (orderUpdate.status === STATUS_ORDER.COMPLETED) {
      deviceStatus = STATUS_DEVICE.AVAILABLE;
    }
    const device = await Device.findByIdAndUpdate(
      deviceId,
      { status: deviceStatus },
      { new: true },
    );

    res.status(200).send({
      status: "success",
      message:
        orderUpdate.status === STATUS_ORDER.INPROGRESS
          ? "Đã bắt đầu công việc"
          : "Đã kết thúc công việc",
      data: orderUpdate,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res.status(500).send({ status: "error", message: err.message });
  }
});

router.post("/checkin", verifyToken, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      orderId,
      checkinFile,
      checkoutFile,
      checkinTime,
      checkoutTime,
    } = req.body;

    const order = await Order.findById(orderId).populate("shiftReport");
    if (!order) {
      return res
        .status(404)
        .send({ status: "error", message: "Không tìm thấy lệnh làm việc" });
    }

    // if (!order.shiftReport && order.status === STATUS_ORDER.INPROGRESS) {
    //   return res
    //     .status(400)
    //     .send({ status: "error", message: "Bạn cần báo công trước" });
    // }

    // const vehicle = await Device.findById(deviceId)
    // if (!vehicle) {
    //     return res.status(404).send({ status: 'error', message: 'Không tìm thấy thiết bị' });
    // }
    // if (vehicle.code !== deviceCode) {
    //     return res.status(400).send({ status: 'error', message: 'Thiết bị không khớp' });
    // }
    // if (!vehicle.coordinates || !vehicle.coordinates.coordinates || vehicle.coordinates.coordinates.length !== 2) {
    //     return res.status(400).send({ status: 'error', message: 'Thiết bị chưa có tọa độ hợp lệ' });
    // }

    // const [deviceLng, deviceLat] = vehicle.coordinates.coordinates; // GeoJSON lưu theo [lng, lat]
    // const distance = getDistanceFromLatLngInMeters(lat, lng, deviceLat, deviceLng);
    // if (distance > 50) {
    //     return res.status(403).send({
    //         status: 'error',
    //         message: `Khoảng cách quá xa. Vui lòng đến gần thiết bị hơn.`,
    //     });
    // }

    const parsedCheckInTime = checkinTime || null;
    const parsedCheckOutTime = checkoutTime || new Date();

    if (checkinFile) {
      const newCheckIn = new CheckIn({
        orderId: orderId,
        imageUrl: checkinFile,
        createdAt: parsedCheckInTime,
      });
      await newCheckIn.save();
    }

    if (checkoutFile) {
      const newCheckOut = new CheckIn({
        orderId: orderId,
        imageUrl: checkoutFile,
        createdAt: parsedCheckOutTime,
      });
      await newCheckOut.save();
    }

    res.status(200).send({
      status: "success",
      message: "Thành công",
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res.status(500).send({ status: "error", message: err.message });
  }
});
function getDistanceFromLatLngInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // bán kính Trái Đất (mét)
  const lat1Rad = (lat1 * Math.PI) / 180; //vido
  const lat2Rad = (lat2 * Math.PI) / 180; //vido
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180; //chenh lech vi do
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180; //chenh lech kinh do

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

router.post(
  "/exportFile/bulk",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { ids, isSelectedAll, status } = req.body;
      const user = req.user;

      // 1. Kiểm tra đầu vào
      if (!Array.isArray(ids) || ids.length === 0) {
        req.logger.error("❌ Chọn bản ghi tải xuống");
        return res
          .status(400)
          .send({ status: "error", message: "Chọn bản ghi cần tải xuống" });
      }

      let query = {};
      if (isSelectedAll) {
        if (status) {
          query.status = status;
        }
      } else {
        query._id = { $in: ids };
      }

      // 2. Lấy dữ liệu Orders và Populate
      const orders = await Order.find(query)
        .populate({
          path: "assignedTo",
          select: " fullName salaryCode",
        })
        .populate("job", "name")
        .populate("device", "code")
        .populate("excavator.device", "code")
        .populate("location", "name")
        .populate("material", "name")
        .populate("shift", "name")
        // QUAN TRỌNG: Populate department để lấy cả code và name
        .populate("department", "code name")
        .populate({
          path: "createdBy",
          select: "fullName",
        })
        .sort("-workingDate")
        .lean()
        // lệnh đã hoàn thành dùng bản chụp đã chốt (đơn vị, nhân viên... không đổi theo dữ liệu gốc về sau)
        .then(applyFrozenAll);

      // 3. Nhóm Orders theo Department Code
      const ordersByDepartment = orders.reduce((acc, order) => {
        const department = order.department;

        // Xác định mã đơn vị. Nếu không có department, nhóm vào 'UNDEFINED'
        const departmentCode = department?.code || "UNDEFINED";
        const departmentName = department?.name || "Không có đơn vị";

        if (!acc[departmentCode]) {
          acc[departmentCode] = {
            name: departmentCode,
            orders: [],
          };
        }
        acc[departmentCode].orders.push(order);
        return acc;
      }, {});

      // 4. Khởi tạo Workbook
      const workbook = new ExcelJS.Workbook();

      // Định nghĩa cấu trúc cột chung cho tất cả các sheet
      const columns = [
        { header: "Stt", key: "number", width: 6 },
        { header: "Người nhận lệnh", key: "assignedTo", width: 20 },
        { header: "Số thẻ", key: "salaryCode", width: 6 },
        { header: "Ngày làm việc", key: "workingDate", width: 15 },
        { header: "Ca", key: "shift", width: 6 },
        { header: "Công việc", key: "job", width: 15 },
        { header: "Thiết bị", key: "device", width: 10 },
        { header: "Máy xúc", key: "excavator", width: 10 },
        { header: "Vật liệu", key: "material", width: 10 },
        { header: "Điểm đổ", key: "location", width: 10 },
        { header: "Người ra lệnh", key: "createdBy", width: 20 },
        { header: "Thời gian tạo lệnh", key: "createdAt", width: 20 },
        { header: "Bắt đầu", key: "startTime", width: 10 },
        { header: "Kết thức", key: "endTime", width: 10 },
        { header: "Trạng thái lệnh", key: "status", width: 15 },
      ];

      // 5. Tạo Worksheet cho TỪNG ĐƠN VỊ
      for (const departmentCode in ordersByDepartment) {
        const departmentData = ordersByDepartment[departmentCode];

        // Lấy tên đơn vị và đảm bảo tên sheet không quá 31 ký tự
        const sheetName = departmentData.name.substring(0, 31).trim();
        const worksheet = workbook.addWorksheet(sheetName);

        worksheet.columns = columns; // Áp dụng cấu trúc cột
        const totalCols = columns.length;
        const title = `ĐƠN VỊ: ${departmentData.orders[0]?.department?.name || departmentData.name}`;

        // Dòng 1: tiêu đề đơn vị
        worksheet.mergeCells(1, 1, 1, totalCols);

        const titleCell = worksheet.getCell("A1");
        titleCell.value = title;
        titleCell.font = { size: 12, bold: true };
        titleCell.alignment = { vertical: "middle", horizontal: "center" };

        // Dòng 2: để trống tạo khoảng cách (tuỳ chọn, nhưng nên có)
        worksheet.addRow([]);

        // Đặt style cho header (hàng 3)
        worksheet.addRow(columns.map((c) => c.header));

        const headerRow = worksheet.getRow(3);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, size: 12 };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        });

        // Định dạng dữ liệu cho đơn vị hiện tại
        const formattedDevices = (departmentData.orders || []).map(
          (item, index) => ({
            number: index + 1,
            assignedTo: item?.assignedTo?.fullName || "",
            salaryCode: item?.assignedTo?.salaryCode || "",
            workingDate: item?.workingDate
              ? dayjs(item.workingDate).format("DD-MM-YYYY")
              : "",
            shift: item?.shift?.name || "",
            job: item?.job?.name || "",
            device: Array.isArray(item?.device)
              ? item.device.map((i) => i?.code || "").join(",")
              : item.device?.code || "",
            excavator: Array.isArray(item?.excavator)
              ? item.excavator.map((i) => i?.device?.code || "").join(",")
              : item.excavator?.device?.code || "",
            material: Array.isArray(item?.material)
              ? item.material.map((i) => i?.name || "").join(",")
              : item.material?.name || "",
            location: Array.isArray(item?.location)
              ? item.location.map((i) => i?.name || "").join(",")
              : item.location?.name || "",

            createdBy: item?.createdBy?.fullName || "",
            createdAt: item?.createdAt
              ? dayjs(item.createdAt).format("DD-MM-YYYY HH:mm")
              : "",
            startTime: item?.startTime
              ? dayjs(item.startTime).format("HH:mm:ss")
              : "",
            endTime: item?.endTime
              ? dayjs(item.endTime).format("HH:mm:ss")
              : "",
            status:
              item?.status === STATUS_ORDER.PENDING
                ? "Chờ nhận lệnh"
                : item?.status === STATUS_ORDER.INPROGRESS
                  ? "Đã nhận lệnh"
                  : item?.status === STATUS_ORDER.COMPLETED
                    ? "Đã kết thúc"
                    : item?.status === STATUS_ORDER.WARNING
                      ? "Lỗi"
                      : "Đã hủy",
          }),
        );

        worksheet.addRows(formattedDevices);
        addTableBorders(
          worksheet,
          3,
          formattedDevices.length + 3,
          1,
          totalCols,
        );
        worksheet.pageSetup = {
          paperSize: 9, // A4
          orientation: "landscape", // ngang
          fitToPage: true,
          fitToWidth: 1, // vừa 1 trang theo chiều ngang
          fitToHeight: 0, // không ép theo chiều dọc
          margins: {
            left: 0.3,
            right: 0.3,
            top: 0.5,
            bottom: 0.5,
            header: 0.2,
            footer: 0.2,
          }, // inch
        };
        // Áp dụng định dạng (font, alignment)
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            if (!cell.font) cell.font = {};
            cell.font = {
              ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
              name: "Times New Roman", // đổi font chữ
              ...(rowNumber > 3 ? { size: 9 } : {}), // kích thước chữ
            };
          });
        });
      }

      // 6. Gửi file Excel về client
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "danh_sach_lenh_sx.xlsx",
      );
      res.send(buffer);
      req.logger.info("✅ Xuất file thành công.");
    } catch (err) {
      req.logger.error("❌ Lỗi khi xuất file điểm đổ tải", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/exportFile/no_travelog",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const today = new Date();
      const localDay = today.getDate();
      const localMonth = today.getMonth();
      const localYear = today.getFullYear();

      // Lấy đầu tháng (ngày 1)
      const startOfMonth = new Date(
        Date.UTC(localYear, localMonth, 1, 0, 0, 0, 0),
      );

      // Lấy ngày hiện tại
      const now = new Date(
        Date.UTC(localYear, localMonth, localDay, 23, 59, 59, 999),
      );

      // Query lấy orders từ đầu tháng đến hiện tại
      let query = {
        workingDate: {
          $gte: startOfMonth,
          $lte: now,
        },
      };

      const job = await Job.findOne({ name: "Vận hành xe" });
      if (job) {
        query.job = job._id;
      }

      // Lấy dữ liệu Orders - Sắp xếp theo workingDate TĂNG DẦN (cũ lên trước)
      const orders = await Order.find(query)
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode",
        })
        .populate("job", "name")
        .populate("device", "code")
        .populate("excavator.device", "code")
        .populate("location", "name")
        .populate("material", "name acceptedProduct")
        .populate("shift", "name")
        .populate("department", "code name")
        .populate({
          path: "createdBy",
          select: "fullName",
        })
        .sort("-workingDate") // Tăng dần: ngày cũ lên trước, ngày mới xuống sau
        .lean()
        // lệnh đã hoàn thành dùng bản chụp đã chốt (đơn vị, nhân viên... không đổi theo dữ liệu gốc về sau)
        .then(applyFrozenAll);

      // Lấy danh sách các kỳ trong tháng (theo thứ tự)
      const periods = getPeriodsInMonth(localYear, localMonth);

      // Map để lưu dữ liệu theo từng kỳ
      const periodDataMap = new Map();

      // Khởi tạo data cho từng kỳ
      periods.forEach((period) => {
        periodDataMap.set(period.key, {
          periodName: period.name,
          startDate: period.start,
          endDate: period.end,
          startDay: period.startDay,
          endDay: period.endDay,
          orderIndex: period.orderIndex, // Thêm thứ tự kỳ
          uniqueOrders: new Map(),
          ordersList: [],
        });
      });

      // Duyệt từng order
      for (const order of orders) {
        const workingDate = new Date(order.workingDate);
        const excavatorId = order.excavator[0]?.device?._id;
        const locationId = order.location[0]?._id;
        const acceptedProduct = order.material?.acceptedProduct;

        // Tìm kỳ phù hợp với workingDate
        const periodKey = getPeriodKey(workingDate, periods);

        if (!periodKey) continue;

        const periodData = periodDataMap.get(periodKey);

        // Tạo key duy nhất: Ngày + Máy xúc + Điểm đổ + Sản phẩm
        const uniqueKey = `${workingDate.toISOString().split("T")[0]}_${excavatorId}_${locationId}_${acceptedProduct}`;

        if (periodData.uniqueOrders.has(uniqueKey)) continue;

        // Kiểm tra cung độ
        const travelog = await getTravellog(
          order.shift?._id,
          order.workingDate,
          excavatorId,
          locationId,
          acceptedProduct,
        );

        if (!travelog) {
          periodData.uniqueOrders.set(uniqueKey, {
            ...order,
            workingDateStr: workingDate.toISOString().split("T")[0],
            workingDateObj: workingDate, // Lưu lại để sắp xếp
          });
        }
      }

      // Chuyển Map thành danh sách và sắp xếp theo ngày trong từng kỳ
      for (const [periodKey, periodData] of periodDataMap.entries()) {
        periodData.ordersList = Array.from(periodData.uniqueOrders.values());
        // Sắp xếp theo ngày tăng dần trong từng kỳ
        periodData.ordersList.sort((a, b) => {
          return new Date(b.workingDate) - new Date(a.workingDate);
        });
      }

      // Tạo workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Danh sách chưa có cung độ");

      // Định nghĩa cấu trúc cột
      const columns = [
        { header: "Stt", key: "number", width: 6 },
        { header: "Ngày", key: "workingDate", width: 12 },
        { header: "Máy xúc", key: "excavator", width: 25 },
        { header: "Điểm đổ tải", key: "location", width: 30 },
      ];

      worksheet.columns = columns;
      const totalCols = columns.length;
      let currentRow = 1;
      let globalStt = 1; // Biến đếm STT toàn bộ

      // Tiêu đề chính
      worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
      const titleCell = worksheet.getCell(`A${currentRow}`);
      titleCell.value = `DANH SÁCH QUÃNG ĐƯỜNG CHƯA CÓ CUNG ĐỘ`;
      titleCell.font = { size: 14, bold: true };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      currentRow++;

      worksheet.addRow([]);
      currentRow++;

      // Duyệt từng kỳ theo thứ tự (từ Kỳ 1 đến Kỳ 6)
      for (const period of periods) {
        const periodData = periodDataMap.get(period.key);

        if (!periodData || periodData.ordersList.length === 0) continue;

        // Thêm dòng tiêu đề kỳ
        const periodTitleRow = worksheet.addRow([
          `${periodData.periodName} (${formatDate(periodData.startDate)} - ${formatDate(periodData.endDate)})`,
        ]);
        worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
        periodTitleRow.getCell(1).font = { bold: true, size: 12 };
        periodTitleRow.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        currentRow++;

        // Thêm header bảng con
        const headerRow = worksheet.addRow(columns.map((c) => c.header));
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, size: 11 };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F0F0" },
          };
        });
        currentRow++;

        // Format dữ liệu với STT toàn bộ
        const formattedData = periodData.ordersList.map((item) => ({
          number: globalStt++,
          workingDate: item.workingDateStr || formatDate(item.workingDate),
          excavator: item?.excavator[0]?.device?.code || "",
          location: item?.location[0]?.name || "",
        }));

        worksheet.addRows(formattedData);
        currentRow += formattedData.length;

        // Thêm border cho bảng con
        const startRow = currentRow - formattedData.length - 1;
        const endRow = currentRow - 1;
        addTableBorders(worksheet, startRow, endRow, 1, totalCols);

        // Thêm dòng trống giữa các kỳ
        worksheet.addRow([]);
        currentRow++;
      }

      // Nếu không có dữ liệu
      if (currentRow <= 3) {
        worksheet.addRow([
          "Không tìm thấy order nào chưa có cung độ trong tháng này",
        ]);
        worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
      }

      // Page setup và định dạng (giữ nguyên)
      worksheet.pageSetup = {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.3,
          right: 0.3,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
      };

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          if (!cell.font) cell.font = {};
          cell.font = {
            ...cell.font,
            name: "Times New Roman",
            ...(rowNumber > 1 ? { size: 10 } : {}),
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: cell.alignment?.horizontal || "left",
          };
        });
      });

      const sttColumn = worksheet.getColumn(1);
      sttColumn.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });

      const dateColumn = worksheet.getColumn(2);
      dateColumn.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=danh_sach_chua_co_cung_do_thang_${localMonth + 1}_${localYear}.xlsx`,
      );
      res.send(buffer);

      req.logger.info("✅ Xuất file thành công.");
    } catch (err) {
      req.logger.error("❌ Lỗi khi xuất file", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// Hàm lấy danh sách các kỳ trong tháng (có thứ tự)
function getPeriodsInMonth(year, month) {
  const periods = [];
  const lastDay = new Date(year, month + 1, 0).getDate();

  const periodRanges = [
    { start: 1, end: 4, name: "KỲ 1 (01-04)", order: 1 },
    { start: 5, end: 9, name: "KỲ 2 (05-09)", order: 2 },
    { start: 10, end: 14, name: "KỲ 3 (10-14)", order: 3 },
    { start: 15, end: 19, name: "KỲ 4 (15-19)", order: 4 },
    { start: 20, end: 24, name: "KỲ 5 (20-24)", order: 5 },
    { start: 25, end: lastDay, name: `KỲ 6 (25-${lastDay})`, order: 6 },
  ];

  periodRanges.forEach((range) => {
    periods.push({
      key: `${year}-${month + 1}-${range.start}_${range.end}`,
      name: range.name,
      orderIndex: range.order,
      start: new Date(Date.UTC(year, month, range.start, 0, 0, 0, 0)),
      end: new Date(Date.UTC(year, month, range.end, 23, 59, 59, 999)),
      startDay: range.start,
      endDay: range.end,
    });
  });

  return periods.sort((a, b) => b.orderIndex - a.orderIndex);
}

// Hàm tìm kỳ phù hợp với workingDate
function getPeriodKey(workingDate, periods) {
  const day = workingDate.getUTCDate();

  for (const period of periods) {
    if (day >= period.startDay && day <= period.endDay) {
      return period.key;
    }
  }
  return null;
}

// Hàm format date
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getUTCDate().toString().padStart(2, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
const addTableBorders = (ws, startRow, endRow, startCol, endCol) => {
  const lightBorder = { style: "thin", color: "black" };

  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    for (let c = startCol; c <= endCol; c++) {
      const cell = row.getCell(c);

      cell.border = {
        top: lightBorder,
        bottom: lightBorder,
        left: lightBorder,
        right: lightBorder,
      };
    }
  }
};
module.exports = router;
