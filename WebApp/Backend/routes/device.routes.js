const express = require("express");
const router = express.Router();
const { AppError } = require("../utils/errorHandler");
const Device = require("../models/Device");
const {
  JOB_TYPE,
  ROLE,
  STATUS_ORDER,
  STATUS_DEVICE,
  STATUS_DEVICES,
  STATUS_REPAIR,
} = require("../config/config");
const DeviceType = require("../models/DeviceType");
const Department = require("../models/Department");
const DeviceModel = require("../models/DeviceModel");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const ShiftReport = require("../models/ShiftReport");
const dayjs = require("dayjs");

const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const Order = require("../models/Order");
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const user = req.user;
    const query = {};

    // Lọc theo loại: xe hoặc máy (thay vì filter ở frontend)
    if (req.query.type) {
      const matchedTypes = await DeviceType.find(
        { group: new RegExp(`^${req.query.type}$`, "i") },
        { _id: 1 },
      ).lean();
      query.category = { $in: matchedTypes.map((t) => t._id) };
    }

    if (req.query.q) {
      const regex = new RegExp(req.query.q, "i");
      const matchedModels = await DeviceModel.find(
        { name: regex },
        { _id: 1 },
      ).lean();
      const modelIds = matchedModels.map((j) => j._id);
      query.$or = [
        { code: regex },
        { name: regex },
        { vehicleNumber: regex },
        { material: { $in: modelIds } },
      ];
    }

    if (req.query.department) {
      query.department = req.query.department;
    }

    if ([ROLE.MANAGER, ROLE.EMPLOYEE].includes(user.role)) {
      query.department = user.department._id;
    }

    // ---- Đếm số lượng theo status (dựa trên filter hiện tại, KHÔNG áp status) ----
    const statusCountsAgg = await Device.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusCounts = {};
    let totalAll = 0;
    for (const item of statusCountsAgg) {
      const key = item._id || "UNKNOWN";
      statusCounts[key] = item.count;
      totalAll += item.count;
    }

    // ---- Áp filter status (nếu có) cho query chính ----
    if (req.query.status) {
      query.status = req.query.status;
    }

    const totalDocs = req.query.status
      ? statusCounts[req.query.status] || 0
      : totalAll;

    // ---- Phân trang: không truyền page/pageSize thì lấy hết ----
    const page = parseInt(req.query.page);
    const pageSize = parseInt(req.query.pageSize);
    const hasPagination =
      !isNaN(page) && !isNaN(pageSize) && page > 0 && pageSize > 0;

    let devicesQuery = Device.find(query)
      .populate("department", "name code createdAt")
      .populate("category")
      .populate("material")
      .collation({ locale: "vi", strength: 1 })
      .sort({ code: 1 });

    if (hasPagination) {
      devicesQuery = devicesQuery.skip((page - 1) * pageSize).limit(pageSize);
    }

    const devices = await devicesQuery;
    const deviceIds = devices.map((d) => d._id);

    // Sử dụng aggregation để lấy DUY NHẤT 1 lệnh mới nhất cho mỗi phương tiện
    const latestOrdersAgg = await Order.aggregate([
      {
        $match: {
          device: { $in: deviceIds },
          status: { $ne: STATUS_ORDER.PENDING },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          // Group theo device cuối cùng trong mảng (xe đang chạy)
          _id: { $arrayElemAt: ["$device", -1] },
          latestOrder: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "latestOrder.assignedTo",
          foreignField: "_id",
          as: "assignedToInfo",
        },
      },
      {
        $unwind: {
          path: "$assignedToInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const deviceToOrderMap = new Map();
    for (const item of latestOrdersAgg) {
      if (item._id) {
        const order = item.latestOrder;
        // Gán thông tin user đã populate từ lookup
        order.assignedTo = item.assignedToInfo;
        deviceToOrderMap.set(item._id.toString(), order);
      }
    }

    const travelHoursAgg = await ShiftReport.aggregate([
      { $unwind: "$vehicleSummaries" },
      {
        $match: {
          "vehicleSummaries.vehicle": { $in: deviceIds },
          "vehicleSummaries.travelHours": { $ne: null }, // bỏ qua bản ghi không có giá trị
        },
      },
      { $sort: { createdAt: -1 } }, // sắp xếp theo thời gian ca làm việc mới nhất -> cũ nhất
      {
        $group: {
          _id: "$vehicleSummaries.vehicle",
          latestTravelHours: { $first: "$vehicleSummaries.travelHours" }, // lấy giá trị đầu tiên sau khi sort = mới nhất
        },
      },
    ]);

    const travelHoursMap = new Map();
    for (const item of travelHoursAgg) {
      travelHoursMap.set(item._id.toString(), item.latestTravelHours || 0);
    }

    const devicesWithAssignedInfo = devices.map((device) => {
      const deviceObj = device.toObject();
      const latestOrder = deviceToOrderMap.get(deviceObj._id.toString());

      // Chỉ gán người lái nếu lệnh mới nhất đang ở trạng thái INPROGRESS
      if (
        latestOrder &&
        latestOrder.status === STATUS_ORDER.INPROGRESS &&
        latestOrder.assignedTo
      ) {
        deviceObj.assignedTo =
          latestOrder.assignedTo.fullName +
          " - " +
          latestOrder.assignedTo.salaryCode;
      } else {
        deviceObj.assignedTo = null;
      }

      deviceObj.cumulativeHours =
        travelHoursMap.get(deviceObj._id.toString()) || 0;

      return deviceObj;
    });
    req.logger.info(`🔥  Load phương tiện thành công`);
    res.status(200).json({
      status: "success",
      results: devicesWithAssignedInfo.length,
      page: hasPagination ? page : undefined,
      pageSize: hasPagination ? pageSize : undefined,
      totalDocs,
      totalPages: hasPagination ? Math.ceil(totalDocs / pageSize) : undefined,
      statusCounts: {
        all: totalAll,
        ...statusCounts,
      },
      data: devicesWithAssignedInfo,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.get("/excavators/all", verifyToken, async (req, res, next) => {
  try {
    const allTypes = await DeviceType.find();
    const targetTypes = allTypes
      .filter((type) => type.name.toLowerCase().includes("máy xúc"))
      .map((type) => type._id);

    const query = {};

    if (targetTypes) {
      query.category = { $in: targetTypes };
    }

    const devices = await Device.find(query)
      .populate("category")
      .populate("material")
      .populate("department", "name code");

    req.logger.info(`🔥  Load phương tiện thành công`);
    res.status(200).json({
      status: "success",
      results: devices.length,
      data: devices,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
router.get("/car/all", verifyToken, async (req, res, next) => {
  try {
    const allTypes = await DeviceType.find();
    const targetTypes = allTypes
      .filter((type) => type.name.toLowerCase().includes("vận tải"))
      .map((type) => type._id);

    const query = {};

    if (targetTypes) {
      query.category = { $in: targetTypes };
    }

    const devices = await Device.find(query)
      .populate("category")
      .populate("material")
      .populate("department", "name code");

    req.logger.info(`🔥  Load phương tiện vận tải thành công`);
    res.status(200).json({
      status: "success",
      results: devices.length,
      data: devices,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.get("/vehicle/all", verifyToken, async (req, res, next) => {
  try {
    const allTypes = await DeviceType.find();
    const targetTypes = allTypes
      .filter((type) => type.group.toLowerCase().includes("xe"))
      .map((type) => type._id);

    const query = {};

    if (targetTypes) {
      query.category = { $in: targetTypes };
    }

    const devices = await Device.find(query)
      .populate("category")
      .populate("material")
      .populate("department", "name code");

    req.logger.info(`🔥  Load phương tiện xe thành công`);
    res.status(200).json({
      status: "success",
      results: devices.length,
      data: devices,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.get("/all", verifyToken, async (req, res, next) => {
  try {
    const devices = await Device.find();

    req.logger.info(`🔥  Load phương tiện thành công`);
    res.status(200).json({
      status: "success",
      results: devices.length,
      data: devices,
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
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const {
        name,
        code,
        vehicleNumber,
        category,
        material,
        note,
        fuelType,
        capacity,
        coordinates,
        department,
        status,
      } = req.body;
      const existingDevice = await Device.findOne({ code });
      if (existingDevice) {
        return res
          .status(400)
          .send({ status: "error", message: "Mã thiết bị đã tồn tại" });
      }
      const device = await Device.create({
        name,
        code,
        department,
        vehicleNumber,
        category,
        material,
        fuelType,
        capacity,
        status,
        note,
        coordinates: {
          type: "Point",
          coordinates: [coordinates.lng, coordinates.lat],
        },
        createdBy: req.user._id,
      });
      req.logger.info(`🔥  Tạo phương tiện thành công`);
      res.status(201).json({
        status: "success",
        data: device,
      });
    } catch (err) {
      req.logger.error("❌ Lỗi", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: "error",
        message: "ID thiết bị không hợp lệ",
      });
    }

    const deviceId = new mongoose.Types.ObjectId(req.params.id);
    const device = await Device.findById(req.params.id)
      .populate("category", "name")
      .populate("department", "name code")
      .populate("material", "name")
      .populate("createdBy", "username fullName")
      .populate("updatedBy", "username fullName");

    if (!device) {
      req.logger.error("❌ Không tìm thấy phương tiện");
      return res
        .status(404)
        .send({ status: "error", message: "No device found with that ID" });
    }

    const travelHoursAgg = await ShiftReport.aggregate([
      { $unwind: "$vehicleSummaries" },
      {
        $match: {
          "vehicleSummaries.vehicle": deviceId,
          "vehicleSummaries.travelHours": { $ne: null }, // bỏ qua bản ghi không có giá trị
        },
      },
      { $sort: { updatedAt: -1 } }, // sắp xếp theo thời gian ca làm việc mới nhất -> cũ nhất
      {
        $group: {
          _id: "$vehicleSummaries.vehicle",
          latestTravelHours: { $first: "$vehicleSummaries.travelHours" }, // lấy giá trị đầu tiên sau khi sort = mới nhất
        },
      },
    ]);

    const travelHoursMap = new Map();
    for (const item of travelHoursAgg) {
      travelHoursMap.set(item._id.toString(), item.latestTravelHours || 0);
    }

    const deviceObj = device.toObject();
    deviceObj.cumulativeHours =
      travelHoursAgg.length > 0 ? travelHoursAgg[0].totalTravelHours || 0 : 0;

    req.logger.info(`🔥 Load phương tiện thành công`);
    res.status(200).json({
      status: "success",
      data: deviceObj,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.put(
  "/:id",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const user = req.user;
      const device = await Device.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          ...(req.body.coordinates
            ? {
                coordinates: {
                  type: "Point",
                  coordinates: [
                    req.body.coordinates.lng,
                    req.body.coordinates.lat,
                  ],
                },
              }
            : {}),
          updatedBy: req.user._id,
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!device) {
        req.logger.error("❌ không tìm thấy phương tiện");
        return res
          .status(404)
          .json({ status: "error", message: "No device found with that ID" });
      }
      req.logger.info(`🔥${user?.username}  Sửa phương tiện thành công`);
      res.status(200).json({
        status: "success",
        data: device,
      });
    } catch (err) {
      req.logger.error("❌ Lỗi", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

const getWorkShiftInfo = () => {
  const now = new Date();
  const hour = now.getHours();

  // Tạo một bản sao để tính toán ngày làm việc
  let tempDate = new Date(now);

  let shiftName;
  if (hour >= 7 && hour < 15) {
    shiftName = 1;
  } else if (hour >= 15 && hour < 23) {
    shiftName = 2;
  } else {
    shiftName = 3;
    // Nếu rạng sáng từ 0h-7h, tính cho ngày hôm trước
    if (hour >= 0 && hour < 7) {
      tempDate.setDate(tempDate.getDate() - 1);
    }
  }

  const dateString = tempDate.toLocaleDateString("sv-SE"); // sv-SE trả về định dạng YYYY-MM-DD
  const workingDate = new Date(dateString);

  return { workingDate, shiftName };
};
router.post("/update_status", verifyToken, async (req, res) => {
  try {
    const { workingDate, shiftName } = getWorkShiftInfo();

    // 1. Tìm đúng Shift ID từ bảng Shift dựa vào name (1, 2 hoặc 3)
    const currentShift = await Shift.findOne({ name: shiftName });
    if (!currentShift) throw new Error("Không tìm thấy cấu hình ca làm việc");

    // 2. Query thẳng các Order của ca đó, bỏ qua PENDING
    const orders = await Order.find({
      workingDate: workingDate,
      shift: currentShift._id,
      status: { $ne: STATUS_ORDER.PENDING },
    })
      .populate("job")
      .populate({
        path: "shiftReport",
        populate: [{ path: "vehicleRepair.device", select: "code status" }],
      })
      .populate("repairVehicles.device")
      .populate("device");

    // 3. Xử lý cập nhật trạng thái
    const bulkOps = []; // Dùng bulkWrite để update nhiều device một lúc cho nhanh
    const logData = [];
    for (const order of orders) {
      const lastDeviceId = order.device?.length
        ? order.device[order.device.length - 1]
        : null;
      const type = order.job?.type?.toLowerCase() || "";
      const isRepairJob = type.includes(
        JOB_TYPE.SUA_CHUA_BAO_DUONG.toLowerCase(),
      );
      const vehicleRepairList = order.shiftReport?.vehicleRepair || [];
      if (lastDeviceId) {
        // ===== DEVICE CHÍNH =====
        if (order.status === STATUS_ORDER.INPROGRESS) {
          bulkOps.push({
            updateOne: {
              filter: { _id: lastDeviceId?._id },
              update: { status: STATUS_DEVICE.IN_USE },
            },
          });
          logData.push({
            "Mã thiết bị": lastDeviceId?.code,
            Loại: "Thiết bị vận hành",
            "Trạng thái mới": STATUS_DEVICE.IN_USE,
          });
        } else {
          // Kết thúc / huỷ → device chính AVAILABLE
          bulkOps.push({
            updateOne: {
              filter: { _id: lastDeviceId?._id },
              update: { status: STATUS_DEVICE.AVAILABLE },
            },
          });
          logData.push({
            "Mã thiết bị": lastDeviceId?.code,
            Loại: "Thiết bị vận hành",
            "Trạng thái mới": STATUS_DEVICE.AVAILABLE,
          });
        }
      }

      // ===== THIẾT BỊ SỬA CHỮA =====
      if (isRepairJob) {
        if (vehicleRepairList.length > 0) {
          // 👉 Có shiftReport → theo report (áp dụng cho cả INPROGRESS & COMPLETED)
          for (const item of vehicleRepairList) {
            bulkOps.push({
              updateOne: {
                filter: { _id: item.device?._id },
                update: {
                  status:
                    item.status === STATUS_REPAIR.COMPLETED
                      ? STATUS_DEVICE.AVAILABLE
                      : STATUS_DEVICE.MAINTENANCE,
                },
              },
            });
            logData.push({
              "Mã thiết bị": item.device?.code,
              Loại: "Thiết bị sửa chữa",
              "Trạng thái mới":
                item.status === STATUS_REPAIR.COMPLETED
                  ? STATUS_DEVICE.AVAILABLE
                  : STATUS_DEVICE.MAINTENANCE,
            });
          }
        } else {
          // 👉 Không có shiftReport → luôn MAINTENANCE (kể cả đã kết thúc order)
          const repairDevices = order.repairVehicles || [];
          for (const deviceId of repairDevices) {
            bulkOps.push({
              updateOne: {
                filter: { _id: deviceId.device?._id },
                update: { status: STATUS_DEVICE.MAINTENANCE },
              },
            });
            logData.push({
              "Mã thiết bị": deviceId.device?.code,
              Loại: "Thiết bị sửa chữa",
              "Trạng thái mới": STATUS_DEVICE.MAINTENANCE,
            });
          }
        }
      }
    }

    if (bulkOps.length > 0) {
      await Device.bulkWrite(bulkOps);
    }
    // ⭐ Log ra Terminal dạng bảng cực đẹp
    if (logData.length > 0) {
      console.log(
        `\n=== CẬP NHẬT TRẠNG THÁI CA ${shiftName} - NGÀY ${dayjs(workingDate).format("DD/MM/YYYY")} ===`,
      );
      console.table(logData);
    } else {
      console.log("Không có thiết bị nào cần cập nhật.");
    }

    res.status(200).json({
      status: "success",
      totalUpdated: logData.length,
      details: logData,
      message: `Đã cập nhật trạng thái cho Ca ${shiftName} ngày ${dayjs(
        workingDate,
      ).format("DD/MM/YYYY")}`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", message: err.message, stack: err.stack });
  }
});

router.delete(
  "/",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const user = req.user;
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        req.logger.error("❌ Chọn bản ghi cần xóa");
        return res
          .status(400)
          .send({ status: "error", message: "Vui lòng chọn bản ghi cần xóa" });
      }

      const result = await Device.deleteMany({ _id: { $in: ids } });
      if (result.deletedCount === 0) {
        req.logger.error("❌ không tìm thấy bản ghi cần xóa");
        return res
          .status(200)
          .send({ status: "error", message: "Không tìm thấy bản ghi để xóa" });
      }
      req.logger.info(
        `🔥${user?.username}  Đã xóa ${result.deletedCount} bản ghi`,
      );
      res.status(200).json({
        status: "success",
        message: `Đã xóa ${result.deletedCount} bản ghi`,
      });
    } catch (err) {
      req.logger.error("❌ Lỗi", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.get(
  "/count/status",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const user = req.user;
      const query = {};
      const queryDept = {};

      if (user.role === ROLE.MANAGER) {
        query.department = user?.department._id;
        queryDept._id = user?.department._id;
      }
      if (req.query.department) {
        query.department = new mongoose.Types.ObjectId(req.query.department);
        queryDept._id = new mongoose.Types.ObjectId(req.query.department);
      }

      const deptHasDevice = await Device.distinct("department", query);
      const departments = await Department.find({
        _id: { $in: deptHasDevice },
      })
        .collation({ locale: "vi", strength: 1 })
        .sort({
          createdAt: 1,
          code: 1,
        })
        .limit(15);
      const departmentIds = departments.map((d) => d._id);
      let devices = await Device.find({
        ...query,
        department: { $in: departmentIds },
      })
        .populate("department")
        .populate({
          path: "category",
          select: "name group",
          match: req.query.group ? { group: req.query.group } : {},
        });

      if (req.query.group) {
        devices = devices = devices.filter((d) => d.category);
      }

      let data = [];

      for (let dept of departments) {
        const deptId = dept._id.toString();

        // Lọc thiết bị theo phân xưởng
        const devicesInDept = devices.filter(
          (d) => d.department?._id?.toString() === deptId,
        );
        if (devicesInDept.length === 0) {
          continue;
        }

        // Nhóm theo loại phương tiện
        const typesMap = new Map();

        for (let device of devicesInDept) {
          const typeId = device.category?._id?.toString();
          const typeName = device.category?.name || "Unknown";

          if (!typesMap.has(typeId)) {
            typesMap.set(typeId, {
              typeId,
              typeName,
              statusCounts: {
                available: 0,
                in_use: 0,
                maintenance: 0,
                retired: 0,
              },
            });
          }

          const typeGroup = typesMap.get(typeId);
          if (STATUS_DEVICES.includes(device.status)) {
            typeGroup.statusCounts[device.status]++;
          }
        }

        data.push({
          departmentId: dept._id,
          departmentName: dept.code,
          deviceTypes: Array.from(typesMap.values()),
        });
      }
      // data = data.slice(0, 15);
      req.logger.info(`🔥 Load thành công`);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      req.logger.error("❌ Lỗi", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const columnMapping = {
  Mã: "_id",
  "Biển số": "code",
  "Tên xe/máy": "name",
  "Số xe/máy": "vehicleNumber",
  "Loại xe": "category",
  "Chủng loại": "material",
  "Nhiên liệu": "fuelType",
  "Trọng tải": "capacity",
  "Đơn vị": "department",
};
router.post(
  "/importFile",
  upload.single("file"),
  verifyToken,
  async (req, res) => {
    try {
      const user = req.user;
      if (!req.file) {
        req.logger.error("❌ Vui lòng chọn file");
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
      const devicesToProcess = data.filter((row) => row.code);

      if (devicesToProcess.length === 0) {
        req.logger.error("❌ không tìm thấy dữ liệu hợp lệ");
        return res.status(400).json({
          status: "error",
          message: "Không tìm thấy dữ liệu phương tiện hợp lệ trong file.",
        });
      }

      const uniqueDepartments = [
        ...new Set(devicesToProcess.map((d) => d.department).filter(Boolean)),
      ];
      const uniqueCategories = [
        ...new Set(devicesToProcess.map((d) => d.category).filter(Boolean)),
      ];
      const uniqueDeviceModels = [
        ...new Set(devicesToProcess.map((d) => d.material).filter(Boolean)),
      ];

      const [existingDepartments, existingCategories, existingDeviceModels] =
        await Promise.all([
          Department.find({ code: { $in: uniqueDepartments } }).lean(),
          DeviceType.find({ name: { $in: uniqueCategories } }).lean(),
          DeviceModel.find({ name: { $in: uniqueDeviceModels } }).lean(),
        ]);

      const departmentMap = new Map(
        existingDepartments.map((d) => [d.code, d._id]),
      );
      const categoryMap = new Map(
        existingCategories.map((c) => [c.name, c._id]),
      );
      const deviceModelMap = new Map(
        existingDeviceModels.map((c) => [c.name, c._id]),
      );

      const operations = [];
      const invalidRows = [];

      for (const row of devicesToProcess) {
        const { department, category, material, _id, ...updateData } = row;

        // Kiểm tra các trường bắt buộc
        if (!updateData.code) {
          invalidRows.push({ row: row, error: "Biển số (code) là bắt buộc." });
          continue;
        }

        let filter = { code: updateData.code };
        if (_id) {
          try {
            filter = { _id: new mongoose.Types.ObjectId(_id) };
          } catch (e) {
            invalidRows.push({ row: row, error: `Mã ID không hợp lệ: ${_id}` });
            continue;
          }
        }
        // Gán ID cho department
        let departmentId = null;
        if (department) {
          departmentId = departmentMap.get(department);
          if (!departmentId) {
            invalidRows.push({
              row: row,
              error: `Mã phòng ban không hợp lệ: ${department}`,
            });
            continue;
          }
        }
        if (departmentId) {
          updateData.department = departmentId;
        }

        // Gán ID cho category
        let categoryId = null;
        if (category) {
          categoryId = categoryMap.get(category);
          if (!categoryId) {
            invalidRows.push({
              row: row,
              error: `Loại phương tiện không hợp lệ: ${category}`,
            });
            continue;
          }
        } else {
          invalidRows.push({
            row: row,
            error: "Loại xe/máy là bắt buộc.",
          });
          continue;
        }
        if (categoryId) {
          updateData.category = categoryId;
        }

        // Gán ID cho category
        let materialId = null;
        if (material) {
          materialId = deviceModelMap.get(material);
          if (!materialId) {
            invalidRows.push({
              row: row,
              error: `Chủng loại không hợp lệ: ${material}`,
            });
            continue;
          }
        }
        if (materialId) {
          updateData.material = materialId;
        }

        // Thêm thao tác updateOne với upsert
        operations.push({
          updateOne: {
            filter: filter, // Sử dụng filter đã được xác định (theo _id hoặc code)
            update: {
              $set: updateData, // Dùng $set để chỉ cập nhật các trường có sẵn trong updateData
            },
            upsert: true, // Nếu không tìm thấy filter (chủ yếu là code) -> TẠO MỚI (insert)
          },
        });
      }

      let bulkResult = null;
      if (operations.length > 0) {
        bulkResult = await Device.bulkWrite(operations);
      }
      req.logger.info(
        `🔥${user?.username}   Import thành công ${devicesToProcess.length} bản ghi.`,
      );
      res.status(200).json({
        status: "success",
        message: "Import dữ liệu hoàn tất.",
        summary: {
          totalProcessed: devicesToProcess.length,
          insertedCount: bulkResult ? bulkResult.upsertedCount : 0,
          updatedCount: bulkResult ? bulkResult.modifiedCount : 0,
          invalidCount: invalidRows.length,
        },
        invalidRows: invalidRows,
      });
    } catch (error) {
      req.logger.error("❌ Lỗi khi import file", error);
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
      const { type, q, department, status } = req.body;
      const user = req.user;
      const query = {};
      if (user.role === ROLE.MANAGER) {
        query.department = user.department._id;
      } else if (department) {
        query.department = department;
      }
      if (type) {
        const matchedTypes = await DeviceType.find(
          { group: new RegExp(`^${type}$`, "i") },
          { _id: 1 },
        ).lean();
        query.category = { $in: matchedTypes.map((t) => t._id) };
      }

      if (q) {
        const regex = new RegExp(q, "i");
        const matchedModels = await DeviceModel.find(
          { name: regex },
          { _id: 1 },
        ).lean();
        query.$or = [
          { code: regex },
          { name: regex },
          { vehicleNumber: regex },
          { material: { $in: matchedModels.map((m) => m._id) } },
        ];
      }
      if (status) query.status = status;

      const data = await Device.find(query)
        .populate("department", "name code")
        .populate("category")
        .populate("material")
        .collation({ locale: "vi", strength: 1 })
        .sort({ code: 1 });

      const departments = await Department.find();
      const deviceTypes = await DeviceType.find();
      const deviceModels = await DeviceModel.find();

      const workbook = new ExcelJS.Workbook();

      const worksheet = workbook.addWorksheet("DS.phuong_tien");

      // Định nghĩa tiêu đề và thuộc tính cột
      worksheet.columns = [
        { header: "Mã", key: "_id", width: 25 },
        { header: "Biển số", key: "code", width: 25 },
        { header: "Tên xe/máy", key: "name", width: 15 },
        { header: "Số xe/máy", key: "vehicleNumber", width: 15 },
        { header: "Loại xe", key: "category", width: 10 },
        { header: "Chủng loại", key: "material", width: 15 },
        { header: "Nhiên liệu", key: "fuelType", width: 30 },
        { header: "Trọng tải", key: "capacity", width: 20 },
        { header: "Đơn vị", key: "department", width: 15 },
      ];

      // Điền dữ liệu
      const formattedDevices = (data || []).map((device) => ({
        _id: device._id,
        code: device?.code || "",
        name: device?.name || "",
        vehicleNumber: device?.vehicleNumber || "",
        category: device?.category?.name || "",
        material: device?.material?.name || "",
        fuelType: device?.fuelType || "",
        capacity: device?.capacity || "",
        department: device?.department?.code || "",
      }));
      worksheet.addRows(formattedDevices);

      // Thiết lập style
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.font = { size: rowNumber === 1 ? 9 : 8, bold: rowNumber === 1 };
          cell.alignment = { vertical: "middle", wrapText: rowNumber === 1 };
        });
        row.height = rowNumber === 1 ? 40 : 20;
      });

      const typeList = [
        ...new Set(deviceTypes.map((p) => p.name).filter(Boolean)),
      ];
      const deptList = [
        ...new Set(departments.map((d) => d.code).filter(Boolean)),
      ];
      const modelList = [
        ...new Set(deviceModels.map((d) => d.name).filter(Boolean)),
      ];

      worksheet.getColumn("X").values = ["devicetypes", ...typeList];
      worksheet.getColumn("Y").values = ["departments", ...deptList];
      worksheet.getColumn("Z").values = ["devicemodels", ...modelList];
      worksheet.getColumn("X").hidden = true;
      worksheet.getColumn("Y").hidden = true;
      worksheet.getColumn("Z").hidden = true;

      // Áp dụng Data Validation
      const MAX = Math.max(worksheet.rowCount + 100, 1000); // dư dòng để người dùng thêm
      worksheet.dataValidations.add(`E2:E${MAX}`, {
        type: "list",
        allowBlank: true,
        formulae: [`=$X$2:$X$${typeList.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Giá trị không hợp lệ",
      });
      worksheet.dataValidations.add(`I2:I${MAX}`, {
        type: "list",
        allowBlank: true,
        formulae: [`=$Y$2:$Y$${deptList.length + 1}`], // nguồn department
        showErrorMessage: true,
        errorTitle: "Giá trị không hợp lệ",
      });
      worksheet.dataValidations.add(`F2:F${MAX}`, {
        type: "list",
        allowBlank: true,
        formulae: [`=$Z$2:$Z$${modelList.length + 1}`], // nguồn department
        showErrorMessage: true,
        errorTitle: "Giá trị không hợp lệ",
      });

      worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
        cell.protection = { locked: true };
      });
      for (let r = 1; r <= MAX; r++) {
        worksheet.getCell(`A${r}`).protection = { locked: true };
      }

      const editableCols = ["B", "C", "D", "E", "F", "G", "H", "I"];
      for (let r = 2; r <= MAX; r++) {
        for (const col of editableCols) {
          worksheet.getCell(`${col}${r}`).protection = { locked: false };
        }
      }

      // 4) Khóa các cột ẩn (nguồn dropdown) X/Y/Z để tránh sửa danh mục
      for (const col of ["X", "Y", "Z"]) {
        for (let r = 1; r <= MAX; r++) {
          worksheet.getCell(`${col}${r}`).protection = { locked: true };
        }
      }

      // 3) Bật bảo vệ sheet
      await worksheet.protect("ktv-protect", {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertRows: true, // cho phép thêm dòng mới nếu cần
        deleteRows: false,
        insertColumns: false,
        deleteColumns: false,
      });

      // Ghi và gửi file
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
      req.logger.info(`🔥  export file thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi import file", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/:id/files",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const { key, fileName } = req.body;
      const user = req.user;

      if (!key || !fileName) {
        return res.status(400).json({
          status: "error",
          message: "Key và fileName là bắt buộc",
        });
      }

      const device = await Device.findByIdAndUpdate(
        req.params.id,
        {
          $push: { files: { key, fileName } },
          updatedBy: user._id,
        },
        { new: true, runValidators: true },
      );

      if (!device) {
        req.logger.error("❌ Không tìm thấy phương tiện");
        return res
          .status(404)
          .json({ status: "error", message: "Không tìm thấy thiết bị" });
      }

      req.logger.info(
        `🔥 ${user?.username} Thêm file cho phương tiện thành công`,
      );
      res.status(200).json({
        status: "success",
        data: device,
      });
    } catch (err) {
      req.logger.error("❌ Lỗi thêm file", err);
      res.status(500).send({
        status: "error",
        message: "Đã xảy ra lỗi khi xử lý tệp đính kèm",
      });
    }
  },
);

router.delete(
  "/:id/files/:fileId",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const user = req.user;

      const device = await Device.findOneAndUpdate(
        { _id: req.params.id, "files._id": req.params.fileId },
        {
          $pull: { files: { _id: req.params.fileId } },
          $set: { updatedBy: user._id },
        },
        { new: true, runValidators: true },
      );

      if (!device) {
        req.logger.error("❌ Không tìm thấy phương tiện");
        return res.status(404).json({
          status: "error",
          message: "Không tìm thấy tệp trên thiết bị",
        });
      }

      req.logger.info(`🔥 ${user?.username} Xóa file phương tiện thành công`);
      res.status(200).json({
        status: "success",
        data: device,
      });
    } catch (err) {
      req.logger.error("❌ Lỗi xóa file", err);
      res.status(500).send({
        status: "error",
        message: "Đã xảy ra lỗi khi xử lý tệp đính kèm",
      });
    }
  },
);

module.exports = router;
