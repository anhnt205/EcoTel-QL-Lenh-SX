const cron = require("node-cron");
const Report = require("../models/Report");
const Order = require("../models/Order");
const Job = require("../models/Job");
const Shift = require("../models/Shift");
const mongoose = require("mongoose");
const TravelLog = require("../models/TravelLog");
const {
  safeQuery,
  caculatorWeight,
  getTravellog,
} = require("./reportGrouping");
const { ROLE, JOB_TYPE } = require("../config/config");
const { sweepRecentlyCompleted } = require("../services/orderFreeze");
const { applyFrozenReportAll } = require("../services/reportSnapshot");

// cron

// Bộ quét chốt lệnh: đường xử lý chính (PUT /api/orders/:id) chốt ngay khi lệnh hoàn thành; bộ quét này chốt bù
// các lệnh vừa hoàn thành mà bị bỏ sót (lỗi giữa chừng, sửa trực tiếp CSDL...). Mỗi 10 phút, chỉ xét lệnh cập
// nhật trong 48 giờ qua.
cron.schedule("*/10 * * * *", async () => {
  try {
    const { frozen, reports } = await sweepRecentlyCompleted();
    if (frozen > 0 || reports > 0) console.log(`[CRON] Đã chốt bù ${frozen} lệnh hoàn thành, ${reports} báo chuyến`);
  } catch (error) {
    console.error("[CRON ERROR] Lỗi khi quét chốt lệnh:", error);
  }
});

cron.schedule("* 14 * * *", async () => {
  console.log("Bắt đầu tiến hành tính sản lượng...");

  try {
    const selected = new Date();
    // Các logic về ngày tháng giữ nguyên
    const selectedDate = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      23,
      59,
      59,
      999,
    );
    const startOfMonth = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    let query = { workingDate: { $gte: startOfMonth, $lte: selectedDate } };
    const orders = await getOrders(query);
    await update_production_report(orders);
  } catch (error) {
    console.error("[CRON ERROR] Lỗi trong quá trình Cron Job:", error);
  }
  console.log("Kết thúc tính sản lượng...");
});

// ham tinh
async function update_production_report(orders) {
  let bulkOperations = [];

  for (let order of orders) {
    const reports = await getReports(order);
    const reportPromises = reports.map(async (report) => {
      let totalProduction = 0;
      let totalCubicMeter = 0;
      let totalTon = 0;

      if (order.job?.type === JOB_TYPE.VAN_HANH_KHOAN) {
        totalProduction = report.drillDepth || 0;
      } else if (order.job?.type === JOB_TYPE.VAN_HANH_XE) {
        // Gọi hàm tính toán ASYNC, việc này sẽ chạy song song
        // với các report khác trong cùng một Order
        const value = await production_vehicle(report);

        totalProduction = value.production;
        totalCubicMeter = value.cubicMeter;
        totalTon = value.ton;
      } else if (order.job?.type === JOB_TYPE.VAN_HANH_XUC) {
        // Gọi hàm tính toán ASYNC, việc này sẽ chạy song song
        // với các report khác trong cùng một Order
        const value = await production_excavator(report);
        totalCubicMeter = value.cubicMeter;
        totalTon = value.ton;
      }

      if (totalProduction > 0 || totalCubicMeter > 0 || totalTon > 0) {
        return {
          updateOne: {
            filter: { _id: report._id },
            update: {
              $set: {
                totalProduction: totalProduction,
                totalCubicMeter: totalCubicMeter,
                totalTon: totalTon,
              },
            },
          },
        };
      }
      return null; // Trả về null nếu không cần cập nhật
    });

    // 2. Chờ tất cả Promise hoàn thành (chạy song song)
    const results = await Promise.all(reportPromises);

    // 3. Gộp các thao tác update (không null) vào mảng chung
    bulkOperations.push(...results.filter((op) => op !== null));
  }
  if (bulkOperations.length > 0) {
    console.log(`Tổng cộng ${bulkOperations.length} Report cần được cập nhật.`);
    const result = await Report.bulkWrite(bulkOperations);
    console.log(
      `Bulk Write hoàn tất. Updated: ${result.nModified || result.modifiedCount}`,
    );
  } else {
    console.log("Không có Report nào cần cập nhật.");
  }
}

async function getOrders(query) {
  // 1. Lấy ra ID của các Job cần quan tâm
  const jobsVehicle = await Job.find({
    type: {
      $in: [
        JOB_TYPE.VAN_HANH_XE,
        JOB_TYPE.VAN_HANH_XUC,
        JOB_TYPE.VAN_HANH_KHOAN,
      ],
    },
  }).select("_id type"); // ⚠️ Chọn luôn trường 'type'

  const jobIdVehicle = jobsVehicle.map((j) => j._id);
  const vehicleOrders = await Order.aggregate([
    {
      $match: {
        ...query,
        job: { $in: jobIdVehicle },
      },
    },
    // 2. Lookup Job (Mới/Quan trọng)
    {
      $lookup: {
        from: "jobs", // Tên collection Job
        localField: "job",
        foreignField: "_id",
        as: "jobDetails",
      },
    },
    { $unwind: "$jobDetails" }, // Giải nén Job

    // 3. Lookup Shift (Giữ nguyên)
    {
      $lookup: {
        from: "shifts",
        localField: "shift",
        foreignField: "_id",
        as: "shiftDetails",
      },
    },
    {
      $unwind: {
        path: "$shiftDetails",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 4. Project (Chọn và Định hình lại dữ liệu)
    {
      $project: {
        _id: 1,
        workingDate: 1,
        shift: "$shiftDetails",
        job: "$jobDetails", // ⚠️ Đưa thông tin Job đã lookup vào trường 'job'
        frozenJob: "$frozen.data.job",
        frozenShift: "$frozen.data.shift",
      },
    },
  ]);

  // Lệnh đã chốt: loại công việc / ca theo bản chụp lúc hoàn thành (quyết định cách tính sản lượng)
  return vehicleOrders.map(({ frozenJob, frozenShift, ...o }) => ({
    ...o,
    job: frozenJob && frozenJob._id ? { ...o.job, ...frozenJob } : o.job,
    shift: frozenShift && frozenShift._id ? { ...o.shift, ...frozenShift } : o.shift,
  }));
}

// ... Hàm getReports giữ nguyên ...
async function getReports(order) {
  // Chuyến của lệnh đã hoàn thành tính lại theo thông tin ĐÃ CHỐT (model xe, loại sản phẩm của vật liệu...), không
  // theo dữ liệu hiện tại — nếu không, đổi model xe / loại vật liệu sẽ làm sản lượng tháng cũ đổi theo.
  const allReports = applyFrozenReportAll(
    await safeQuery(() =>
      Report.find({ orderId: order._id })
        .select("+frozen")
        .populate({
          path: "device",
          select: "code material",
        })
        .populate("material", "name acceptedProduct")
        .populate("excavator", "code")
        .populate("fromLocation", "name")
        .populate("toLocation", "name"),
    ),
  );
  // 🔹 3. Gán thông tin Order vào Report
  const allVehicleReports = allReports.map((r) => {
    return {
      ...r.toObject(),
      shift: order?.shift,
      workingDate: order?.workingDate,
    };
  });
  return allVehicleReports;
}
async function production_vehicle(t) {
  // Chuyển quantityUpdateTimes thành mảng để lặp
  const timesArray = Array.isArray(t.quantityUpdateTimes)
    ? t.quantityUpdateTimes
    : [t.quantityUpdateTimes];

  // 1. TÍNH TOÁN VÀ GOM timeLogs
  // Sử dụng Promise.all để tìm TravelLog song song cho mỗi mốc thời gian
  let totalDistance = 0;

  const currentShiftDoc = await Shift.findById(t.shift?._id || t.shift).lean();
  const currentShiftVal = parseInt(currentShiftDoc?.name || "1"); // Ví dụ: 2
  const travelLog = await getTravellog(
    t.shift?._id,
    t.workingDate,
    t.excavator?._id,
    t.toLocation?._id,
    t.material?.acceptedProduct,
  );
  const distance = travelLog ? travelLog.fullDistanceKm || 0 : 0;

  const timeLogPromises = timesArray.map(async (time) => {
    return {
      time: time,
      distance: distance,
    };
  });

  const timeLogs = await Promise.all(timeLogPromises);

  totalDistance = timeLogs.reduce((sum, log) => sum + log.distance, 0);

  // 2. TÍNH TOÁN KHỐI LƯỢNG VÀ TẤN
  const value = await caculatorWeight(
    t.material?._id,
    t.device?.material,
    t.quantity,
    totalDistance,
    t.workingDate,
    t.material?.acceptedProduct,
  );

  return value;
}
async function production_excavator(t) {
  const value = await caculatorWeight(
    t.material?._id,
    t.device?.material,
    t.quantity,
    0,
    t.workingDate,
    t.material?.acceptedProduct,
  );

  return value;
}

async function runProductionUpdateBackground(req, query) {
  setImmediate(async () => {
    try {
      const orders = await getOrders(query);
      await update_production_report(orders);

      req?.logger?.info("✔ Background: sản lượng đã được cập nhật");
    } catch (err) {
      req?.logger?.error("❌ Background: lỗi khi cập nhật sản lượng", err);
    }
  });
}

module.exports = {
  production_vehicle,
  production_excavator,
  update_production_report,
  getOrders,
  runProductionUpdateBackground,
};
