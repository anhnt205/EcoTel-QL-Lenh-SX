const express = require("express");
const router = express.Router();
const { AppError } = require("../utils/errorHandler");
const ShiftReport = require("../models/ShiftReport");
const Device = require("../models/Device");
const ReportHistory = require("../models/ReportHistory");
const { syncShiftDevices } = require("../services/orderFreeze");

// Báo cáo ca có thể nộp/sửa sau khi lệnh hoàn thành: bổ sung bản chụp thiết bị (mã xe...) vào lệnh đã chốt để báo cáo
// cũ không đổi theo dữ liệu thiết bị hiện tại. Lỗi ở đây không làm hỏng việc lưu báo cáo ca.
const syncFrozenDevices = async (req, orderId) => {
  try {
    await syncShiftDevices(orderId);
  } catch (err) {
    req.logger.error(`❌ Lỗi khi chốt thiết bị trong báo cáo ca của lệnh ${orderId}`, err);
  }
};

const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const { STATUS_DEVICE, STATUS_REPAIR } = require("../config/config");

router.post("/", verifyToken, async (req, res, next) => {
  try {
    const {
      orderId,
      assignedTo,
      vehicleSummaries,
      vehicleRepair,
      handoverHours,
      handoverNotes,
      shiftHours,
      risks,
    } = req.body;

    // make sure numeric values are numbers, not strings or undefined
    const shiftHoursNum =
      shiftHours !== undefined && shiftHours !== null
        ? Number(shiftHours)
        : undefined;

    const vehicleSummariesClean = Array.isArray(vehicleSummaries)
      ? vehicleSummaries.map((v) => ({
          ...v,
          travelHours:
            v.travelHours !== undefined && v.travelHours !== null
              ? Number(v.travelHours)
              : v.travelHours,
          repairHours:
            v.repairHours !== undefined && v.repairHours !== null
              ? Number(v.repairHours)
              : v.repairHours,
          distanceKm:
            v.distanceKm !== undefined && v.distanceKm !== null
              ? Number(v.distanceKm)
              : v.distanceKm,
        }))
      : vehicleSummaries;

    if (!handoverNotes) {
      req.logger.error(`❌ Tình trạng công việc là bắt buộc: ${orderId}`);
      return res
        .status(400)
        .send({ status: "error", message: "Tình trạng công việc là bắt buộc" });
    }
    if (vehicleSummaries) {
      for (var item of vehicleSummaries) {
        await Device.findByIdAndUpdate(
          item.vehicle,
          { note: item.note },
          { new: true },
        );
      }
    }

    const filteredRepairVehicles = (vehicleRepair || []).filter(
      (r) => r.device,
    );
    if (filteredRepairVehicles.length > 0) {
      for (var item of filteredRepairVehicles) {
        await Device.findByIdAndUpdate(
          item.device,
          {
            status:
              item.status === STATUS_REPAIR.COMPLETED
                ? STATUS_DEVICE.AVAILABLE
                : STATUS_DEVICE.MAINTENANCE,
            note: item.noteRepair,
          },
          { new: true },
        );
      }
    }
    const newShiftReport = new ShiftReport({
      orderId,
      assignedTo,
      vehicleSummaries: vehicleSummariesClean,
      vehicleRepair: filteredRepairVehicles,
      handoverHours,
      handoverNotes,
      shiftHours: shiftHoursNum,
      risks,
    });
    await newShiftReport.save();
    await syncFrozenDevices(req, orderId);
    req.logger.info(`✅ Tạo báo cáo ca thành công với Order ID: ${orderId}`);
    res.status(200).send({ status: "success", message: "Tạo thành công" });
  } catch (err) {
    req.logger.error("❌ Lỗi khi tạo báo cáo ca", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const shiftReport = await ShiftReport.findOne({ orderId: req.params.id });
    if (shiftReport) {
      req.logger.info(`✅ Tìm thấy báo cáo ca với Order ID: ${req.params.id}`);
    } else {
      req.logger.warn(
        `⚠️ Không tìm thấy báo cáo ca với Order ID: ${req.params.id}`,
      );
    }
    res.status(200).send({ status: "success", data: shiftReport });
  } catch (err) {
    req.logger.error("❌ Lỗi khi lấy báo cáo ca", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
const trackedFieldsWork = [
  "handoverHours",
  "handoverNotes",
  "risks",
  "shiftHours",
];

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const shiftReport = await ShiftReport.findById(req.params.id);
    if (!shiftReport) {
      req.logger.warn(`⚠️ Không tìm thấy báo cáo ca với ID: ${req.params.id}`);
      return res.status(404).send({ status: "error", message: "Not found" });
    }
    if (!req.body.handoverNotes) {
      req.logger.error(`❌ Tình trạng công việc là bắt buộc`);
      return res
        .status(400)
        .send({ status: "error", message: "Tình trạng công việc là bắt buộc" });
    }

    // normalize numeric fields in the update payload to avoid
    // string/number mismatches that prevent storage or change tracking
    const updates = {
      ...req.body,
      shiftHours:
        req.body.shiftHours !== undefined && req.body.shiftHours !== null
          ? Number(req.body.shiftHours)
          : req.body.shiftHours,
      vehicleSummaries: Array.isArray(req.body.vehicleSummaries)
        ? req.body.vehicleSummaries.map((v) => ({
            ...v,
            travelHours:
              v.travelHours !== undefined && v.travelHours !== null
                ? Number(v.travelHours)
                : v.travelHours,
            repairHours:
              v.repairHours !== undefined && v.repairHours !== null
                ? Number(v.repairHours)
                : v.repairHours,
            distanceKm:
              v.distanceKm !== undefined && v.distanceKm !== null
                ? Number(v.distanceKm)
                : v.distanceKm,
          }))
        : req.body.vehicleSummaries,
    };
    const changes = [];

    // 🔹 So sánh các field ngoài mảng
    for (let field of trackedFieldsWork) {
      if (
        updates[field] !== undefined &&
        String(updates[field]) !== String(shiftReport[field])
      ) {
        changes.push({
          field,
          oldValue: shiftReport[field],
          newValue: updates[field],
        });
      }
    }

    // 🔹 So sánh trong mảng vehicleSummaries
    if (Array.isArray(updates.vehicleSummaries)) {
      updates.vehicleSummaries.forEach((updatedItem, index) => {
        const originalItem = shiftReport.vehicleSummaries[index];
        if (!originalItem) return;

        for (let field of [
          "repairHours",
          "distanceKm",
          "travelHours",
          "fuelRemain",
          "fuelReceived",
          "fuelRemainEnd",
          "status",
          "note",
          "gpsStatus",
          "sealStatus",
        ]) {
          const newVal =
            updatedItem[field] !== undefined && updatedItem[field] !== null
              ? String(updatedItem[field])
              : updatedItem[field];
          const oldVal =
            originalItem[field] !== undefined && originalItem[field] !== null
              ? String(originalItem[field])
              : originalItem[field];

          if (updatedItem[field] !== undefined && newVal !== oldVal) {
            changes.push({
              field,
              index,
              oldValue: originalItem[field],
              newValue: updatedItem[field],
            });
          }
        }
      });
    }
    // 🔹 So sánh trong mảng vehicleSummaries
    if (Array.isArray(updates.vehicleRepair)) {
      updates.vehicleRepair.forEach((updatedItem, index) => {
        const originalItem = shiftReport.vehicleRepair[index];
        if (!originalItem) return;

        for (let field of ["status", "noteRepair"]) {
          if (
            updatedItem[field] !== undefined &&
            updatedItem[field] !== originalItem[field]
          ) {
            changes.push({
              field,
              index,
              oldValue: originalItem[field],
              newValue: updatedItem[field],
            });
          }
        }
      });
    }

    // 🔹 Nếu có thay đổi → lưu lịch sử
    if (changes.length > 0) {
      await ReportHistory.create({
        reportId: shiftReport._id,
        sourceType: "ShiftReport",
        changes,
        changedBy: req.user._id,
      });
    }

    // 🔹 Cập nhật status thiết bị theo dữ liệu mới
    if (updates.vehicleSummaries) {
      for (const item of updates.vehicleSummaries) {
        const device = await Device.findById(item.vehicle);
        if (device) {
          await Device.findByIdAndUpdate(
            item.vehicle,
            {
              status:
                item.status === "good"
                  ? STATUS_DEVICE.AVAILABLE
                  : STATUS_DEVICE.MAINTENANCE,
              note: item.note,
            },
            { new: true },
          );
        }
      }
    }
    if (updates.vehicleRepair) {
      for (const item of updates.vehicleRepair) {
        const device = await Device.findById(item.device);
        if (device) {
          await Device.findByIdAndUpdate(
            item.device,
            {
              status:
                item.status === STATUS_REPAIR.COMPLETED
                  ? STATUS_DEVICE.AVAILABLE
                  : STATUS_DEVICE.MAINTENANCE,
              note: item.noteRepair,
            },
            { new: true },
          );
        }
      }
    }

    // 🔹 Update dữ liệu mới
    Object.assign(shiftReport, updates);
    await shiftReport.save();
    await syncFrozenDevices(req, shiftReport.orderId);

    req.logger.info(
      `✅ ${user?.username} Cập nhật báo cáo ca thành công cho ID: ${req.params.id}`,
    );
    res.status(200).send({
      status: "success",
      message: "Sửa thành công",
      data: shiftReport,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi khi cập nhật báo cáo ca", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});

module.exports = router;
