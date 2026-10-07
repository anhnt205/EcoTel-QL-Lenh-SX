const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getSignedDownloadUrl } = require("../utils/uploadImage");
const ExcelJS = require("exceljs");
const OrderModel = require("../models/Order");
const { applyFrozenAll } = require("../services/orderSnapshot");
const { applyFrozenReportAll } = require("../services/reportSnapshot");
const { attendanceRoster } = require("../utils/roster");
const Shift = require("../models/Shift");
const ReportModel = require("../models/Report");
const Department = require("../models/Department");
const User = require("../models/User");
const dayjs = require("dayjs");
require("dayjs/locale/vi");
dayjs.locale("vi");
const _ = require("lodash");

const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const mongoose = require("mongoose");
const {
  groupTripsVehicle,
  getCombinedUsers,
  groupTripsExcavator,
  groupTripsCar,
  groupExcavator,
  groupDozer,
  groupDrill,
  groupCar,
  groupTripsVehicleProduction,
  groupTripsVehicleProductivity,
  groupProductionLand,
  groupProduction,
} = require("../utils/reportGrouping");
const {
  ROLE,
  STATUS_ORDER,
  JOB_TYPE,
  ACCEPTED_PRODUCT,
} = require("../config/config");

// Mọi báo cáo / xuất file trong file này đọc lệnh qua Order.find(...). Bọc để lệnh đã hoàn thành luôn dùng
// bản chụp đã chốt (đơn vị, nhân viên, thiết bị, công việc... không đổi theo dữ liệu gốc về sau; xem
// services/orderSnapshot.js). Chỉ `find` được bọc (kết quả thành đối tượng thường, đã được rà soát là không
// có chỗ nào gọi phương thức document trên lệnh); mọi hàm khác của model giữ nguyên.
const Order = new Proxy(OrderModel, {
  get(target, prop) {
    if (prop === "find") {
      return (...args) => {
        const query = target.find(...args);
        const exec = query.exec.bind(query);
        query.exec = async (...a) => applyFrozenAll(await exec(...a));
        return query;
      };
    }
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

// Tương tự cho báo chuyến: Report.find(...) -> chuyến của lệnh đã hoàn thành dùng thông tin ĐÃ CHỐT (mã/loại/model xe,
// máy xúc, tên địa điểm, vật liệu...; xem services/reportSnapshot.js). Chuyến chưa chốt giữ nguyên là document;
// chuyến đã chốt thành đối tượng thường nhưng vẫn có toObject() (nhiều chỗ ở đây gọi). Chỉ `find` được bọc.
const Report = new Proxy(ReportModel, {
  get(target, prop) {
    if (prop === "find") {
      return (...args) => {
        const query = target.find(...args).select("+frozen");
        const exec = query.exec.bind(query);
        query.exec = async (...a) => applyFrozenReportAll(await exec(...a));
        return query;
      };
    }
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
// lệnh sx
router.post(
  "/order/bulk",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { ids } = req.body; // mảng entity id

      if (!Array.isArray(ids) || ids.length === 0) {
        req.logger.error("❌ Chọn bản ghi tải xuống");
        return res
          .status(400)
          .json({ status: "error", message: "Chọn bản ghi cần tải xuống" });
      }

      const orders = await Order.find({ _id: { $in: ids } })
        .populate({
          path: "assignedTo",
          select: "username fullName department phone salaryCode position",
          populate: [
            { path: "department", select: "code" },
            { path: "position", select: "name" },
          ],
        })
        .populate("job", "name type")
        .populate("device", "code")
        .populate("repairDepartment", "code")
        .populate("excavator.device", "code")
        .populate("location", "name")
        .populate("material", "name")
        .populate("shift")
        .populate({
          path: "shiftReport",
          populate: [
            {
              path: "vehicleSummaries.vehicle",
              select: "code",
            },
          ],
        })
        .populate("repairVehicles.device")
        .populate("safetyMeasure")
        .populate({
          path: "assistants",
          select: "salaryCode fullName position",
          populate: {
            path: "position",
            select: "name",
          },
        })
        .populate({
          path: "createdBy",
          select: "fullName phone salaryCode position signature department",
          populate: [
            {
              path: "position",
              select: "name",
            },
            {
              path: "department",
              select: "code",
            },
          ],
        });
      const workbook = new ExcelJS.Workbook();
      for (const [index, order] of orders.entries()) {
        console.log(order);
        const jobType = order.job?.type;
        const sheetName =
          `${order.assignedTo?.username}_${formatDate(order.workingDate)}_${order.shift?.name}_${index}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);
        if (jobType === JOB_TYPE.VAN_HANH_XE) {
          await buildVehicle(order, workbook, sheetName);
        } else if (jobType === JOB_TYPE.VAN_HANH_XUC) {
          await buildExcavator(order, workbook, sheetName);
        } else if (jobType === JOB_TYPE.SUA_CHUA_BAO_DUONG) {
          await buildMaintence(order, workbook, sheetName);
        } else if (jobType === JOB_TYPE.VAN_HANH_KHOAN) {
          await buildDrill(order, workbook, sheetName);
        } else if (jobType === JOB_TYPE.VAN_HANH_GAT) {
          await buildDozer(order, workbook, sheetName);
        } else if (jobType === JOB_TYPE.DIEU_HANH_SAN_XUAT) {
          await buildDispatcher(order, workbook, sheetName);
        } else if (jobType === JOB_TYPE.VAN_HANH_XE_PHUC_VU) {
          await buildVehicleService(order, workbook, sheetName);
        } else {
          await buildOther(order, workbook, sheetName);
        }
      }
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''bulk.xlsx",
      );
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

async function buildVehicle(order, workbook, sheetName) {
  const reports = await Report.find({ orderId: order._id })
    .populate({
      path: "device",
      select: "code material",
      populate: { path: "material", selcct: "name value" },
    })
    .populate("material", "name acceptedProduct")
    .populate("excavator", "code")
    .populate("fromLocation", "name")
    .populate("toLocation", "name");

  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:N1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:N2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 3: LỆNH SẢN XUẤT
  worksheet.mergeCells("A3:N3");
  const header = worksheet.getCell("A3");
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };

  // All subsequent rows are offset by +2 from their original position
  // Original row 4 becomes new row 6, etc.
  const rowOffset = 2;

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  worksheet.getCell(`F${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`F${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`G${4 + rowOffset}`).value = ngay;

  worksheet.getCell(`H${4 + rowOffset}`).value = order.shiftHour || "";

  worksheet.getCell(`I${4 + rowOffset}`).value = "Ca";
  worksheet.getCell(`I${4 + rowOffset}`).font = { bold: true };

  worksheet.getCell(`J${4 + rowOffset}`).value = order.shift?.name || "";
  worksheet.getCell(`J${4 + rowOffset}`).alignment = { horizontal: "left" };

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";
  worksheet.getCell(`F${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";
  worksheet.getCell(`I${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${5 + rowOffset}:N${5 + rowOffset}`);
  worksheet.getCell(`J${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";
  worksheet.getCell(`F${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";
  worksheet.getCell(`I${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${6 + rowOffset}:K${6 + rowOffset}`);
  worksheet.getCell(`J${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";
  worksheet.mergeCells(`L${6 + rowOffset}:M${6 + rowOffset}`);
  worksheet.getCell(`L${6 + rowOffset}`).value = "Thiết bị vận hành";
  worksheet.getCell(`L${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`N${6 + rowOffset}`).value =
    (order.device || []).map((d) => d.code).join(", ") || "";

  // Dòng 6 lx bo tuc
  worksheet.getCell(`B${7 + rowOffset}`).value = "Lái xe bổ túc";
  worksheet.getCell(`B${7 + rowOffset}`).font = { bold: true };

  let rowIndex = 7 + rowOffset;
  (order.assistants || []).forEach((driver, idx) => {
    let row = rowIndex + idx;

    worksheet.getCell(`C${row}`).value = driver.fullName || "";
    worksheet.getCell(`F${row}`).value = "Số thẻ";
    worksheet.getCell(`F${row}`).font = { bold: true };
    worksheet.getCell(`G${row}`).value = driver.salaryCode || "";

    worksheet.getCell(`I${row}`).value = "Chức vụ";
    worksheet.getCell(`I${row}`).font = { bold: true };
    worksheet.mergeCells(`J${row}:N${row}`);
    worksheet.getCell(`J${row}`).value = driver.position?.name || "";
  });

  let nextRow = rowIndex + (order.assistants?.length || 1); // This `nextRow` is already offset
  let headerCursor = nextRow;

  // Nội dung lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.workContent || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Nội dung bàn giao ca
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung bàn giao ca";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    order.shiftReport?.handoverNotes || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // GPS
  worksheet.getCell(`B${headerCursor}`).value = "GPS:";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order.shiftReport?.vehicleSummaries || [])[0]?.gpsStatus || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 1;

  // Kẹp chì
  worksheet.getCell(`B${headerCursor}`).value = "Kẹp chì:";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order.shiftReport?.vehicleSummaries || [])[0]?.sealStatus || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 1;

  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`D${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`D${headerCursor}`).font = { bold: true };
  worksheet.getCell(`E${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.mergeCells(`F${headerCursor}:G${headerCursor}`);
  worksheet.getCell(`F${headerCursor}`).value = "Giờ hoạt động trên đồng hồ";
  worksheet.getCell(`F${headerCursor}`).font = { bold: true };
  worksheet.getCell(`H${headerCursor}`).value =
    (order?.shiftReport?.vehicleSummaries || []).reduce(
      (sum, report) => sum + report?.travelHours,
      0,
    ) || "";
  worksheet.getCell(`H${headerCursor}`).alignment = { horizontal: "left" };

  worksheet.mergeCells(`I${headerCursor}:J${headerCursor}`);
  worksheet.getCell(`I${headerCursor}`).value = "Km hoạt động trên đồng hồ";
  worksheet.getCell(`I${headerCursor}`).font = { bold: true };
  worksheet.getCell(`K${headerCursor}`).value =
    (order?.shiftReport?.vehicleSummaries || []).reduce(
      (sum, report) => sum + report?.distanceKm,
      0,
    ) || "";
  worksheet.getCell(`K${headerCursor}`).alignment = { horizontal: "left" };

  let rowHeader1 = headerCursor + 2; // nextRow is already offset
  worksheet.mergeCells(`A${rowHeader1}:N${rowHeader1}`); // rowHeader1 is already offset
  const product = worksheet.getCell(`A${rowHeader1}`); // rowHeader1 is already offset
  product.value = `I. SẢN PHẨM`;
  product.font = { bold: true, size: 14 };
  product.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(rowHeader1).height = 30;

  worksheet.getCell(`A${rowHeader1 + 1}`).value = "STT";
  worksheet.getCell(`B${rowHeader1 + 1}`).value = "Thiết bị vận hành";
  worksheet.getCell(`C${rowHeader1 + 1}`).value = "Máy xúc";
  worksheet.getCell(`D${rowHeader1 + 1}`).value = "Điểm đổ tải";
  worksheet.getCell(`E${rowHeader1 + 1}`).value = "Vật liệu";
  worksheet.getCell(`F${rowHeader1 + 1}`).value = "Số chuyến thực hiện";
  worksheet.getCell(`G${rowHeader1 + 1}`).value = "Cung độ \n tạm tính (km)";
  worksheet.getCell(`H${rowHeader1 + 1}`).value =
    "Khối lượng \n tạm tính \n(m3)";
  worksheet.getCell(`I${rowHeader1 + 1}`).value =
    "Trọng lượng \n tạm tính \n (tấn)";
  worksheet.getCell(`J${rowHeader1 + 1}`).value =
    "Sản lượng \n tạm tính \n(tkm)";
  worksheet.getCell(`K${rowHeader1 + 1}`).value = "Nhiên liệu \n định mức";
  worksheet.getCell(`L${rowHeader1 + 1}`).value = "Điểm lương \n tạm tính";

  worksheet.mergeCells(`M${rowHeader1 + 1}:N${rowHeader1 + 1}`);
  worksheet.getCell(`M${rowHeader1 + 1}`).value = "Ghi chú";

  const headerRow = worksheet.getRow(rowHeader1 + 1);
  for (let col = 1; col <= 14; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true };
    cell.alignment = {
      ...cell.alignment,
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
  }

  const grouped = await groupTripsVehicle(
    reports,
    order.workingDate, // This is a date object, not a row number
    order.shift,
  );

  let rowIndexTrip = rowHeader1 + 2;
  grouped.forEach((g, i) => {
    worksheet.getCell(`A${rowIndexTrip}`).value = i + 1;
    worksheet.getCell(`A${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`B${rowIndexTrip}`).value = g?.device?.code || "";
    worksheet.getCell(`B${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`C${rowIndexTrip}`).value = g.excavator?.code || "";
    worksheet.getCell(`C${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`D${rowIndexTrip}`).value = g.location?.name || "";
    worksheet.getCell(`D${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`E${rowIndexTrip}`).value = g.material?.name || "";
    worksheet.getCell(`E${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`F${rowIndexTrip}`).value = g?.quantity || "";
    worksheet.getCell(`F${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    const totalDistance = (g.timeLogs || []).reduce(
      (sum, item) => sum + (item.distance || 0),
      0,
    );
    worksheet.getCell(`G${rowIndexTrip}`).value = g.timeLogs[0]?.distance || 0;
    worksheet.getCell(`G${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`H${rowIndexTrip}`).value = g.totalCubicMeter || 0;
    worksheet.getCell(`H${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`I${rowIndexTrip}`).value = g.totalTon || 0;
    worksheet.getCell(`I${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`J${rowIndexTrip}`).value = String(g.production || 0);
    worksheet.getCell(`J${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`K${rowIndexTrip}`).value = "";
    worksheet.getCell(`L${rowIndexTrip}`).value = "";
    worksheet.mergeCells(`M${rowIndexTrip}:N${rowIndexTrip}`);
    worksheet.getCell(`M${rowIndexTrip}`).value = "";
    rowIndexTrip++;
  });
  const totalRow = rowIndexTrip + 1;

  worksheet.mergeCells(`A${totalRow}:B${totalRow}`); // totalRow is already offset
  worksheet.getCell(`A${totalRow}`).value = "Tổng cộng";
  worksheet.getCell(`A${totalRow}`).font = { bold: true };
  worksheet.getCell(`A${totalRow}`).alignment = { horizontal: "right" };

  worksheet.mergeCells(`C${totalRow}:F${totalRow}`);
  worksheet.getCell(`C${totalRow}`).value =
    reports.reduce((sum, report) => {
      return sum + report.quantity;
    }, 0) || "";
  worksheet.getCell(`C${totalRow}`).font = { bold: true };

  worksheet.getCell(`H${totalRow}`).value =
    grouped.reduce((sum, report) => {
      return sum + report.totalCubicMeter;
    }, 0) || "";
  worksheet.getCell(`H${totalRow}`).font = { bold: true };
  worksheet.getCell(`I${totalRow}`).value =
    grouped.reduce((sum, report) => {
      return sum + report.totalTon;
    }, 0) || "";
  worksheet.getCell(`I${totalRow}`).font = { bold: true };
  worksheet.getCell(`J${totalRow}`).value =
    grouped.reduce((sum, report) => {
      return sum + report.production;
    }, 0) || "";
  worksheet.getCell(`J${totalRow}`).font = { bold: true };

  worksheet.mergeCells(`K${totalRow}:N${totalRow}`); // totalRow is already offset
  worksheet.getCell(`K${totalRow}`).value = ""; // totalRow is already offset

  worksheet.mergeCells(`A${totalRow + 1}:N${totalRow + 1}`); // totalRow is already offset
  worksheet.getCell(`A${totalRow + 1}`).value = "Mức bồi dưỡng (x1000đ):"; // totalRow is already offset

  worksheet.mergeCells(`A${totalRow + 2}:N${totalRow + 2}`);
  const header3 = worksheet.getCell(`A${totalRow + 2}`);
  header3.value = `II. NHIÊN LIỆU`;
  header3.font = { bold: true, size: 14 };
  header3.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(totalRow + 2).height = 30;

  worksheet.mergeCells(`A${totalRow + 3}:B${totalRow + 3}`);
  worksheet.getCell(`A${totalRow + 3}`).value = "Thiết bị vận hành";
  worksheet.getCell(`A${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`A${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`C${totalRow + 3}`).value = "Tồn dầu";
  worksheet.getCell(`C${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`C${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`D${totalRow + 3}`).value = "Lĩnh trong ca";
  worksheet.getCell(`D${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`D${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`E${totalRow + 3}`).value = "Tồn cuối ca";
  worksheet.getCell(`E${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`E${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`F${totalRow + 3}`).value = "Tiêu thụ";
  worksheet.getCell(`F${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`F${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`G${totalRow + 3}`).value = "Định mức";
  worksheet.getCell(`G${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`G${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`H${totalRow + 3}`).value = "Tiết kiệm";
  worksheet.getCell(`H${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`H${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`I${totalRow + 3}`).value = "Sử dụng vượt";
  worksheet.getCell(`I${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`I${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells(`J${totalRow + 3}:N${totalRow + 3}`);
  worksheet.getCell(`J${totalRow + 3}`).value = "Ghi chú";
  worksheet.getCell(`J${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const fuelHeaderRow = totalRow + 4;

  let index = 0;
  for (let d of order.device || [{}]) {
    const rep = (order.shiftReport?.vehicleSummaries || []).find(
      (i) => i?.vehicle?._id.toString() === d._id.toString(),
    );
    const currentRow = fuelHeaderRow + index;
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = d?.code || "";
    worksheet.getCell(`C${currentRow}`).value = rep?.fuelRemain || "";
    worksheet.getCell(`D${currentRow}`).value = rep?.fuelReceived || "";
    worksheet.getCell(`E${currentRow}`).value = rep?.fuelRemainEnd || "";
    worksheet.getCell(`F${currentRow}`).value =
      (rep?.fuelRemain ?? 0) +
      (rep?.fuelReceived ?? 0) -
      (rep?.fuelRemainEnd ?? 0);

    worksheet.getCell(`G${currentRow}`).value = "";

    worksheet.getCell(`H${currentRow}`).value = "";
    worksheet.getCell(`I${currentRow}`).value = "";

    worksheet.mergeCells(`J${currentRow}:N${currentRow}`);
    worksheet.getCell(`J${currentRow}`).value = "";
    index++;
  }

  const fuelEndRow = fuelHeaderRow + index;

  addTableBorders(worksheet, rowHeader1, fuelEndRow, 1, 14);

  let bottomRow = fuelEndRow + 2;

  worksheet.mergeCells(`B${bottomRow}:D${bottomRow}`);
  worksheet.getCell(`B${bottomRow}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${bottomRow}`).font = { bold: true };
  worksheet.getCell(`B${bottomRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${bottomRow + 2}`).value = "✔";
  worksheet.getCell(`C${bottomRow + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${bottomRow + 2}`).font = {
    bold: true,
    size: 12,
  };
  timeSignature(worksheet, bottomRow + 4, "B", "D", order?.startTime);
  worksheet.mergeCells(`B${bottomRow + 5}:D${bottomRow + 5}`);
  worksheet.getCell(`B${bottomRow + 5}`).font = { bold: true };
  worksheet.getCell(`B${bottomRow + 5}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${bottomRow + 5}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(`L${bottomRow}:N${bottomRow}`);
  worksheet.getCell(`L${bottomRow}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`L${bottomRow}`).font = { bold: true };
  worksheet.getCell(`L${bottomRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });

      worksheet.mergeCells(`L${bottomRow + 1}:N${bottomRow + 3}`);

      // gán ảnh trực tiếp vào range
      worksheet.addImage(imageId, `L${bottomRow + 1}:N${bottomRow + 3}`);
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.getCell(`M${bottomRow + 2}`).value = "✔";
      worksheet.getCell(`M${bottomRow + 2}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`M${bottomRow + 2}`).font = {
        bold: true,
        size: 12,
      };
    }
  } else {
    worksheet.getCell(`M${bottomRow + 2}`).value = "✔";
    worksheet.getCell(`M${bottomRow + 2}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`M${bottomRow + 2}`).font = {
      bold: true,
      size: 12,
    };
  }
  timeSignature(worksheet, bottomRow + 4, "L", "N", order?.createdAt);

  worksheet.mergeCells(`L${bottomRow + 5}:N${bottomRow + 5}`);
  worksheet.getCell(`L${bottomRow + 5}`).font = { bold: true };
  worksheet.getCell(`L${bottomRow + 5}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`L${bottomRow + 5}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 20 }, // Thiết bị vận hành
    { key: "C", width: 12 }, // Máy xúc
    { key: "D", width: 15 }, // Điểm đổ tải
    { key: "E", width: 15 }, // Vật liệu
    { key: "F", width: 14 }, // Số chuyến thực hiện
    { key: "G", width: 14 }, // Cung độ tạm tính
    { key: "H", width: 14 }, // Khối lượng
    { key: "I", width: 14 }, // Trọng lượng
    { key: "J", width: 14 }, // Sản lượng
    { key: "K", width: 12 }, // Nhiên liệu
    { key: "L", width: 12 }, // Điểm lương
    { key: "M", width: 7 }, // Ghi chú (merge 2 cols)
    { key: "N", width: 13 }, // Ghi chú (merge 2 cols)
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
  await buildTimeLogSheet(order, workbook, grouped, sheetName);
}

async function buildTimeLogSheet(order, workbook, groupedData, sheetName) {
  if (!groupedData || groupedData.length === 0) return;

  const TRIPS_PER_ROW = 15;

  // Đặt số cột chuyến đi tối đa cố định theo yêu cầu
  const FIXED_TRIP_COLS = 15;
  const totalCols = 3 + FIXED_TRIP_COLS; // Tổng cộng 18 cột (A đến R)

  // Helper function để chuyển số cột sang chữ cái (Giữ nguyên)
  const getColLetter = (colIndex) => {
    let result = "";
    while (colIndex > 0) {
      const remainder = (colIndex - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      colIndex = Math.floor((colIndex - 1) / 26);
    }
    return result;
  };

  // === 1️⃣ Tạo sheet mới với tên an toàn === (Giữ nguyên)

  const ws = workbook.addWorksheet(`${sheetName}_Chi tiết`);

  const borderStyle = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const center = { horizontal: "center", vertical: "middle", wrapText: true };

  // === 2️⃣ Tiêu đề chính === (Giữ nguyên)
  ws.mergeCells("A1:R1");
  ws.getCell("A1").value =
    `${order.assignedTo?.fullName || ""} - ${dayjs(order.workingDate).format("DD/MM/YYYY")} - Chi tiết thời gian thực hiện chuyến`;
  ws.getCell("A1").font = { bold: true, size: 14, name: "Times New Roman" };
  ws.getCell("A1").alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(1).height = 25;

  // === 3️⃣ Header cột cố định === (Giữ nguyên - Dòng 2)
  const fixedHeaders = ["Thiết bị nhận tải", "Máy xúc", "Vật liệu"];
  ws.addRow(fixedHeaders);
  const headerRow = ws.lastRow;
  headerRow.font = { bold: true, name: "Times New Roman" };
  headerRow.alignment = center;

  // === 4️⃣ Ghi dữ liệu chi tiết === (Giữ nguyên logic tạo cặp hàng STT/Time cho mỗi block)
  // Bắt đầu từ dòng 3
  let currentRow = 3;

  for (const g of groupedData) {
    const logs = g.timeLogs || [];
    const numLogs = logs.length;
    const numBlocks = Math.ceil(numLogs / TRIPS_PER_ROW);

    // Ghi lại dòng bắt đầu của thiết bị này
    const startRowForDevice = currentRow;

    for (let block = 0; block < numBlocks; block++) {
      const startTripIndex = block * TRIPS_PER_ROW;

      // --- Hàng 1 của block: STT chuyến ---
      const sttRow = [];
      if (block === 0) {
        sttRow.push(
          g.device?.code || "",
          g.excavator?.code || "",
          g.material?.name || "",
        );
      } else {
        sttRow.push("", "", "");
      }

      for (let i = startTripIndex; i < startTripIndex + TRIPS_PER_ROW; i++) {
        // Chỉ điền STT nếu nhỏ hơn tổng số chuyến và nằm trong giới hạn 15 cột
        sttRow.push(i < numLogs ? i + 1 : "");
      }
      ws.addRow(sttRow);
      const sttRowNum = ws.lastRow.number;

      // --- Hàng 2 của block: Thời gian - cung độ ---
      const timeRow = ["", "", ""]; // 3 cột cố định luôn để trống
      for (let i = startTripIndex; i < startTripIndex + TRIPS_PER_ROW; i++) {
        if (i < numLogs) {
          const log = logs[i];
          const timeStr =
            log.time instanceof Date
              ? dayjs(log.time).format("HH:mm:ss")
              : log.time || "";
          timeRow.push(`${timeStr} - ${log.distance || 0} km`);
        } else {
          timeRow.push("");
        }
      }
      ws.addRow(timeRow);
      const timeRowNum = ws.lastRow.number;

      // --- Style (Áp dụng border) ---
      [sttRowNum, timeRowNum].forEach((r) => {
        const row = ws.getRow(r);
        row.alignment = center;
        // Áp dụng style chỉ cho 18 cột (A đến R)
        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c);
          cell.border = borderStyle;
          cell.font = { name: "Times New Roman", size: 12 };
        }
      });

      currentRow = timeRowNum + 1;
    }

    // --- MERGE TOÀN BỘ 3 CỘT ĐẦU CHO THIẾT BỊ NÀY ---
    const endRowForDevice = currentRow - 1;

    if (numBlocks > 0) {
      // Gộp A
      ws.mergeCells(`A${startRowForDevice}:A${endRowForDevice}`);
      ws.getCell(`A${startRowForDevice}`).alignment = center;

      // Gộp B
      ws.mergeCells(`B${startRowForDevice}:B${endRowForDevice}`);
      ws.getCell(`B${startRowForDevice}`).alignment = center;

      // Gộp C
      ws.mergeCells(`C${startRowForDevice}:C${endRowForDevice}`);
      ws.getCell(`C${startRowForDevice}`).alignment = center;
    }
  }

  // === 5️⃣ Merge header "Giờ đổ tải - Cung độ (km)" trên dòng 2 (Cố định D2:R2) ===

  // Cột bắt đầu là D (4), Cột kết thúc là R (18)
  const startColLetter = getColLetter(4);
  const endColLetter = getColLetter(totalCols);

  // Gộp TẤT CẢ các cột từ cột 4 đến cột cuối cùng trên DÒNG 2
  ws.mergeCells(`${startColLetter}2:${endColLetter}2`);

  // Ghi lại giá trị và style vào ô đã gộp duy nhất này
  ws.getCell(`${startColLetter}2`).value = "Giờ đổ tải - Cung độ (km)";
  ws.getCell(`${startColLetter}2`).alignment = center;
  ws.getCell(`${startColLetter}2`).font = {
    bold: true,
    name: "Times New Roman",
  };

  // === 6️⃣ Kích thước cột === (Cố định từ cột 4 đến 18)
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 15;
  for (let col = 4; col <= totalCols; col++) {
    ws.getColumn(col).width = 20;
  }

  // === 7️⃣ Border cho toàn bảng === (Cố định giới hạn ở 18 cột)
  addTableBorders(ws, 2, currentRow - 1, 1, totalCols);

  // === 8️⃣ Font toàn sheet === (Đã được điều chỉnh trong vòng lặp 4 để chỉ áp dụng cho 18 cột)
  ws.eachRow((r) => {
    r.eachCell((c) => {
      if (!c.font) c.font = {};
      c.font = { ...c.font, name: "Times New Roman", size: 12 };
    });
  });
}

async function buildVehicleService(order, workbook, sheetName) {
  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:N1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:N2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 3: LỆNH SẢN XUẤT
  worksheet.mergeCells("A3:N3");
  const header = worksheet.getCell("A3");
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };
  const rowOffset = 2;

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  worksheet.getCell(`F${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`F${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`G${4 + rowOffset}`).value = ngay;

  worksheet.getCell(`H${4 + rowOffset}`).value = order.shiftHour || "";

  worksheet.getCell(`I${4 + rowOffset}`).value = "Ca";
  worksheet.getCell(`I${4 + rowOffset}`).font = { bold: true };

  worksheet.getCell(`J${4 + rowOffset}`).value = order.shift?.name || "";
  worksheet.getCell(`J${4 + rowOffset}`).alignment = { horizontal: "left" };

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";
  worksheet.getCell(`F${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";
  worksheet.getCell(`I${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${5 + rowOffset}:N${5 + rowOffset}`);
  worksheet.getCell(`J${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  // Dòng 6
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";
  worksheet.getCell(`F${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";
  worksheet.getCell(`I${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${6 + rowOffset}:K${6 + rowOffset}`);
  worksheet.getCell(`J${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";
  worksheet.mergeCells(`L${6 + rowOffset}:M${6 + rowOffset}`);
  worksheet.getCell(`L${6 + rowOffset}`).value = "Thiết bị vận hành";
  worksheet.getCell(`L${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`N${6 + rowOffset}`).value =
    (order.device || []).map((d) => d.code).join(", ") || "";
  let headerCursor = 7 + rowOffset;

  // Nội dung lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.workContent || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // Nội dung bàn giao ca
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung bàn giao ca";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    order.shiftReport?.handoverNotes || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // GPS
  worksheet.getCell(`B${headerCursor}`).value = "GPS:";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order.shiftReport?.vehicleSummaries || [])[0]?.gpsStatus || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 1;

  // Kẹp chì
  worksheet.getCell(`B${headerCursor}`).value = "Kẹp chì:";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order.shiftReport?.vehicleSummaries || [])[0]?.sealStatus || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 1;

  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`D${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`D${headerCursor}`).font = { bold: true };
  worksheet.getCell(`E${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.mergeCells(`F${headerCursor}:G${headerCursor}`);
  worksheet.getCell(`F${headerCursor}`).value = "Giờ hoạt động trên đồng hồ";
  worksheet.getCell(`F${headerCursor}`).font = { bold: true };
  worksheet.getCell(`H${headerCursor}`).value =
    (order?.shiftReport?.vehicleSummaries || []).reduce(
      (sum, report) => sum + report?.travelHours,
      0,
    ) || "";
  worksheet.getCell(`H${headerCursor}`).alignment = { horizontal: "left" };

  worksheet.mergeCells(`I${headerCursor}:J${headerCursor}`);
  worksheet.getCell(`I${headerCursor}`).value = "Km hoạt động trên đồng hồ";
  worksheet.getCell(`I${headerCursor}`).font = { bold: true };
  worksheet.getCell(`K${headerCursor}`).value =
    (order?.shiftReport?.vehicleSummaries || []).reduce(
      (sum, report) => sum + report?.distanceKm,
      0,
    ) || "";
  worksheet.getCell(`K${headerCursor}`).alignment = { horizontal: "left" };

  headerCursor += 2;

  let rowHeader1 = headerCursor;

  worksheet.mergeCells(`A${rowHeader1}:N${rowHeader1}`);
  const header3 = worksheet.getCell(`A${rowHeader1}`);
  header3.value = `I.NHIÊN LIỆU`;
  header3.font = { bold: true, size: 14 };
  header3.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(rowHeader1).height = 30;

  worksheet.mergeCells(`A${rowHeader1 + 1}:B${rowHeader1 + 1}`);
  worksheet.getCell(`A${rowHeader1 + 1}`).value = "Thiết bị vận hành";
  worksheet.getCell(`A${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`A${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`C${rowHeader1 + 1}`).value = "Tồn dầu";
  worksheet.getCell(`C${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`C${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`D${rowHeader1 + 1}`).value = "Lĩnh trong ca";
  worksheet.getCell(`D${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`D${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`E${rowHeader1 + 1}`).value = "Tồn cuối ca";
  worksheet.getCell(`E${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`E${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`F${rowHeader1 + 1}`).value = "Tiêu thụ";
  worksheet.getCell(`F${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`F${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`G${rowHeader1 + 1}`).value = "Định mức";
  worksheet.getCell(`G${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`G${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`H${rowHeader1 + 1}`).value = "Tiết kiệm";
  worksheet.getCell(`H${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`H${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`I${rowHeader1 + 1}`).value = "Sử dụng vượt";
  worksheet.getCell(`I${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`I${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells(`J${rowHeader1 + 1}:N${rowHeader1 + 1}`);
  worksheet.getCell(`J${rowHeader1 + 1}`).value = "Ghi chú";
  worksheet.getCell(`J${rowHeader1 + 1}`).font = { bold: true };
  worksheet.getCell(`J${rowHeader1 + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const fuelHeaderRow = rowHeader1 + 2;

  let index = 0;
  for (let d of order.device || [{}]) {
    const rep = (order.shiftReport?.vehicleSummaries || []).find(
      (i) => i?.vehicle?._id.toString() === d._id.toString(),
    );
    const currentRow = fuelHeaderRow + index;
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = d?.code || "";
    worksheet.getCell(`C${currentRow}`).value = rep?.fuelRemain || "";
    worksheet.getCell(`D${currentRow}`).value = rep?.fuelReceived || "";
    worksheet.getCell(`E${currentRow}`).value = rep?.fuelRemainEnd || "";
    worksheet.getCell(`F${currentRow}`).value =
      (rep?.fuelRemain ?? 0) +
      (rep?.fuelReceived ?? 0) -
      (rep?.fuelRemainEnd ?? 0);

    worksheet.getCell(`G${currentRow}`).value = "";

    worksheet.getCell(`H${currentRow}`).value = "";
    worksheet.getCell(`I${currentRow}`).value = "";
    worksheet.mergeCells(`J${currentRow}:N${currentRow}`);
    worksheet.getCell(`J${currentRow}`).value = "";

    index++;
  }

  const fuelEndRow = fuelHeaderRow + index;

  addTableBorders(worksheet, rowHeader1, fuelEndRow - 1, 1, 14);

  worksheet.mergeCells(`B${fuelEndRow + 1}:D${fuelEndRow + 1}`);
  worksheet.getCell(`B${fuelEndRow + 1}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${fuelEndRow + 1}`).font = { bold: true };
  worksheet.getCell(`B${fuelEndRow + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${fuelEndRow + 3}`).value = "✔";
  worksheet.getCell(`C${fuelEndRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${fuelEndRow + 3}`).font = { bold: true, size: 12 };
  timeSignature(worksheet, fuelEndRow + 5, "B", "D", order?.startTime);
  worksheet.mergeCells(`B${fuelEndRow + 6}:D${fuelEndRow + 6}`);
  worksheet.getCell(`B${fuelEndRow + 6}`).font = { bold: true };
  worksheet.getCell(`B${fuelEndRow + 6}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${fuelEndRow + 6}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(`I${fuelEndRow + 1}:L${fuelEndRow + 1}`);
  worksheet.getCell(`I${fuelEndRow + 1}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`I${fuelEndRow + 1}`).font = { bold: true };
  worksheet.getCell(`I${fuelEndRow + 1}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });

      worksheet.mergeCells(`J${fuelEndRow + 2}:K${fuelEndRow + 4}`);

      // gán ảnh trực tiếp vào range
      worksheet.addImage(imageId, `J${fuelEndRow + 2}:K${fuelEndRow + 4}`);
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.mergeCells(`J${fuelEndRow + 3}:K${fuelEndRow + 3}`);
      worksheet.getCell(`J${fuelEndRow + 3}`).value = "✔";
      worksheet.getCell(`J${fuelEndRow + 3}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`J${fuelEndRow + 3}`).font = { bold: true, size: 12 };
    }
  } else {
    worksheet.mergeCells(`J${fuelEndRow + 3}:K${fuelEndRow + 3}`);
    worksheet.getCell(`J${fuelEndRow + 3}`).value = "✔";
    worksheet.getCell(`J${fuelEndRow + 3}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`J${fuelEndRow + 3}`).font = { bold: true, size: 12 };
  }
  timeSignature(worksheet, fuelEndRow + 5, "J", "K", order?.createdAt);

  worksheet.mergeCells(`I${fuelEndRow + 6}:L${fuelEndRow + 6}`);
  worksheet.getCell(`I${fuelEndRow + 6}`).font = { bold: true };
  worksheet.getCell(`I${fuelEndRow + 6}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`I${fuelEndRow + 6}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 20 }, // Nhận tải
    { key: "C", width: 12 }, // Đổ tải
    { key: "D", width: 14 }, // Loại hàng
    { key: "E", width: 14 }, // Cung độ tạm tính
    { key: "F", width: 14 }, // Chiều cao nâng tải
    { key: "G", width: 14 }, // Số chuyến
    { key: "H", width: 10 }, // Khối lượng
    { key: "I", width: 14 }, // Trọng lượng
    { key: "J", width: 13 }, // Sản lượng
    { key: "K", width: 15 }, // Nhiên liệu
    { key: "L", width: 15 }, // Điểm lương
    { key: "M", width: 15 }, // Điểm lương
    { key: "N", width: 15 }, // Điểm lương
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
}
async function buildExcavator(order, workbook, sheetName) {
  const reports = await Report.find({ orderId: order._id })
    .populate("device", "code material")
    .populate("material", "name acceptedProduct")
    .populate("excavator", "code")
    .populate("fromLocation", "name")
    .populate("toLocation", "name");

  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:O1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:O2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };

  const rowOffset = 2;
  // Tiêu đề bảng
  worksheet.mergeCells(`A${1 + rowOffset}:O${2 + rowOffset}`);
  const header = worksheet.getCell(`A${1 + rowOffset}`);
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  worksheet.getCell(`E${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`E${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`F${4 + rowOffset}`).value = ngay;

  worksheet.getCell(`G${4 + rowOffset}`).value = order.shiftHour || "";

  worksheet.getCell(`H${4 + rowOffset}`).value = "Ca";
  worksheet.getCell(`H${4 + rowOffset}`).font = { bold: true };

  worksheet.getCell(`I${4 + rowOffset}`).value = order.shift?.name || "";
  worksheet.getCell(`I${4 + rowOffset}`).alignment = { horizontal: "left" };

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";

  worksheet.getCell(`E${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`E${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`F${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";

  worksheet.getCell(`H${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`H${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`I${5 + rowOffset}:O${5 + rowOffset}`);
  worksheet.getCell(`I${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  // Dòng 6
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";

  worksheet.getCell(`E${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`E${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`F${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";

  worksheet.getCell(`H${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`H${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`I${6 + rowOffset}:J${6 + rowOffset}`);
  worksheet.getCell(`I${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";
  worksheet.mergeCells(`L${6 + rowOffset}:M${6 + rowOffset}`);
  worksheet.getCell(`L${6 + rowOffset}`).value = "Thiết bị vận hành";
  worksheet.getCell(`L${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`N${6 + rowOffset}:O${6 + rowOffset}`);
  worksheet.getCell(`N${6 + rowOffset}`).value =
    (order.device || []).map((d) => d.code).join(", ") || "";

  // Dòng 6 lx bo tuc
  worksheet.getCell(`B${7 + rowOffset}`).value = "Phụ máy";
  worksheet.getCell(`B${7 + rowOffset}`).font = { bold: true };

  let rowIndex = 7 + rowOffset;
  (order.assistants || []).forEach((driver, idx) => {
    let row = rowIndex + idx;

    worksheet.getCell(`C${row}`).value = driver.fullName || "";
    worksheet.getCell(`E${row}`).value = "Số thẻ";
    worksheet.getCell(`E${row}`).font = { bold: true };
    worksheet.getCell(`F${row}`).value = driver.salaryCode || "";

    worksheet.getCell(`H${row}`).value = "Chức vụ";
    worksheet.getCell(`H${row}`).font = { bold: true };
    worksheet.mergeCells(`I${row}:O${row}`);
    worksheet.getCell(`I${row}`).value = driver.position?.name || "";
  });

  let headerCursor = rowIndex + (order.assistants?.length || 1);

  // Nội dung lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:O${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.workContent || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "top",
    wrapText: true,
  };

  headerCursor += 2;

  // Nội dung bàn giao ca
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung bàn giao ca";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:O${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    order.shiftReport?.handoverNotes || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // GPS
  worksheet.getCell(`B${headerCursor}`).value = "GPS:";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:O${headerCursor}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order.shiftReport?.vehicleSummaries || [])[0]?.gpsStatus || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 1;

  // Kẹp chì
  worksheet.getCell(`B${headerCursor}`).value = "Kẹp chì:";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:O${headerCursor}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order.shiftReport?.vehicleSummaries || [])[0]?.sealStatus || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 1;

  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:O${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:O${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`D${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`D${headerCursor}`).font = { bold: true };
  worksheet.getCell(`E${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.mergeCells(`F${headerCursor}:G${headerCursor}`);
  worksheet.getCell(`F${headerCursor}`).value = "Giờ hoạt động trong ca";
  worksheet.getCell(`F${headerCursor}`).font = { bold: true };
  worksheet.getCell(`H${headerCursor}`).value =
    order?.shiftReport?.shiftHours || "";
  worksheet.getCell(`H${headerCursor}`).alignment = { horizontal: "left" };

  worksheet.mergeCells(`I${headerCursor}:J${headerCursor}`);
  worksheet.getCell(`I${headerCursor}`).value = "Giờ lũy kế trên đồng hồ";
  worksheet.getCell(`I${headerCursor}`).font = { bold: true };
  worksheet.getCell(`K${headerCursor}`).value =
    (order?.shiftReport?.vehicleSummaries || []).reduce(
      (sum, report) => sum + report?.travelHours,
      0,
    ) || "";
  worksheet.getCell(`K${headerCursor}`).alignment = { horizontal: "left" };

  let rowHeader1 = headerCursor + 2;
  worksheet.mergeCells(`A${rowHeader1}:O${rowHeader1}`);
  const product = worksheet.getCell(`A${rowHeader1}`);
  product.value = `I. SẢN PHẨM`;
  product.font = { bold: true, size: 14 };
  product.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(rowHeader1).height = 30;

  worksheet.getCell(`A${rowHeader1 + 1}`).value = "STT"; // rowHeader1 is already offset
  worksheet.getCell(`B${rowHeader1 + 1}`).value = "Xe nhận tải"; // rowHeader1 is already offset
  worksheet.getCell(`C${rowHeader1 + 1}`).value = "Vật liệu"; // rowHeader1 is already offset
  worksheet.getCell(`D${rowHeader1 + 1}`).value = "Số chuyến thực hiện"; // rowHeader1 is already offset
  worksheet.mergeCells(`E${rowHeader1 + 1}:F${rowHeader1 + 1}`); // rowHeader1 is already offset
  worksheet.getCell(`E${rowHeader1 + 1}`).value = // rowHeader1 is already offset
    "Khối lượng \n tạm tính \n(m3)";
  worksheet.mergeCells(`G${rowHeader1 + 1}:H${rowHeader1 + 1}`); // rowHeader1 is already offset
  worksheet.getCell(`G${rowHeader1 + 1}`).value = // rowHeader1 is already offset
    "Trọng lượng \n tạm tính \n (tấn)";
  worksheet.getCell(`I${rowHeader1 + 1}`).value = "Nhiên liệu \n định mức"; // rowHeader1 is already offset
  worksheet.getCell(`J${rowHeader1 + 1}`).value = "Điểm lương \n tạm tính"; // rowHeader1 is already offset
  worksheet.mergeCells(`K${rowHeader1 + 1}:O${rowHeader1 + 1}`);
  worksheet.getCell(`K${rowHeader1 + 1}`).value = "Ghi chú"; // rowHeader1 is already offset

  const headerRow = worksheet.getRow(rowHeader1 + 1); // rowHeader1 is already offset
  for (let col = 1; col <= 11; col++) {
    const cell = headerRow.getCell(col); // col is 1-based
    cell.font = { bold: true };
    cell.alignment = {
      ...cell.alignment,
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
  }

  const grouped = await groupExcavator(reports, order.workingDate); // order.workingDate is a Date object

  let rowIndexTrip = rowHeader1 + 2;
  grouped.forEach((g, i) => {
    const startRowTrip = rowIndexTrip;
    g.materials.forEach((m) => {
      worksheet.getCell(`A${rowIndexTrip}`).value = i + 1;
      worksheet.getCell(`A${rowIndexTrip}`).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.getCell(`B${rowIndexTrip}`).value = g.device?.code || "";
      worksheet.getCell(`B${rowIndexTrip}`).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.getCell(`C${rowIndexTrip}`).value = m.material?.name || "";
      worksheet.getCell(`C${rowIndexTrip}`).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.getCell(`D${rowIndexTrip}`).value = m.quantity || "";
      worksheet.getCell(`D${rowIndexTrip}`).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.mergeCells(`E${rowIndexTrip}:F${rowIndexTrip}`);
      worksheet.getCell(`E${rowIndexTrip}`).value = m.cubicMeter || 0;
      worksheet.getCell(`E${rowIndexTrip}`).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.mergeCells(`G${rowIndexTrip}:H${rowIndexTrip}`);
      worksheet.getCell(`G${rowIndexTrip}`).value = m.ton || 0;
      worksheet.getCell(`G${rowIndexTrip}`).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.getCell(`I${rowIndexTrip}`).value = "";
      worksheet.getCell(`J${rowIndexTrip}`).value = "";
      worksheet.mergeCells(`K${rowIndexTrip}:O${rowIndexTrip}`);
      worksheet.getCell(`K${rowIndexTrip}`).value = "";
      rowIndexTrip++;
    });
    if (rowIndexTrip - 1 > startRowTrip) {
      ["A", "B"].forEach((col) => {
        worksheet.mergeCells(`${col}${startRowTrip}:${col}${rowIndexTrip - 1}`);
        worksheet.getCell(`${col}${startRowTrip}`).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      });
    }
  });

  const totalRow = rowIndexTrip;

  worksheet.mergeCells(`A${totalRow}:B${totalRow}`);
  worksheet.getCell(`A${totalRow}`).value = "Tổng cộng";
  worksheet.getCell(`A${totalRow}`).font = { bold: true };
  worksheet.getCell(`A${totalRow}`).alignment = { horizontal: "right" };

  worksheet.mergeCells(`C${totalRow}:D${totalRow}`);
  worksheet.getCell(`C${totalRow}`).value =
    reports.reduce((sum, report) => {
      return sum + report.quantity;
    }, 0) || "";
  worksheet.getCell(`C${totalRow}`).font = { bold: true };
  worksheet.mergeCells(`E${totalRow}:F${totalRow}`);
  worksheet.mergeCells(`G${totalRow}:H${totalRow}`);
  worksheet.getCell(`I${totalRow}`).value = "";
  worksheet.getCell(`J${totalRow}`).value = "";
  worksheet.mergeCells(`K${totalRow}:O${totalRow}`);
  worksheet.getCell(`K${totalRow}`).value = "";

  worksheet.mergeCells(`A${totalRow + 1}:O${totalRow + 1}`);
  worksheet.getCell(`A${totalRow + 1}`).value = "Mức bồi dưỡng (x1000đ):";

  worksheet.mergeCells(`A${totalRow + 2}:O${totalRow + 2}`);
  const header3 = worksheet.getCell(`A${totalRow + 2}`);
  header3.value = `II.NHIÊN LIỆU`;
  header3.font = { bold: true, size: 14 };
  header3.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(totalRow + 2).height = 30;

  worksheet.mergeCells(`A${totalRow + 3}:B${totalRow + 3}`);
  worksheet.getCell(`A${totalRow + 3}`).value = "Máy xúc";
  worksheet.getCell(`A${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`A${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`C${totalRow + 3}`).value = "Tồn dầu";
  worksheet.getCell(`C${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`C${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`D${totalRow + 3}`).value = "Lĩnh trong ca";
  worksheet.getCell(`D${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`D${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`E${totalRow + 3}`).value = "Tồn cuối ca";
  worksheet.getCell(`E${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`E${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`F${totalRow + 3}`).value = "Tiêu thụ";
  worksheet.getCell(`F${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`F${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`G${totalRow + 3}`).value = "Định mức";
  worksheet.getCell(`G${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`G${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`H${totalRow + 3}`).value = "Tiết kiệm";
  worksheet.getCell(`H${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`H${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`I${totalRow + 3}`).value = "Sử dụng vượt";
  worksheet.getCell(`I${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`I${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells(`J${totalRow + 3}:O${totalRow + 3}`);
  worksheet.getCell(`J${totalRow + 3}`).value = "Ghi chú";
  worksheet.getCell(`J${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const fuelHeaderRow = totalRow + 4;
  let index = 0;
  for (let d of order.device || [{}]) {
    const rep = (order.shiftReport?.vehicleSummaries || []).find(
      (i) => i?.vehicle?._id.toString() === d._id.toString(),
    );
    const currentRow = fuelHeaderRow + index;
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = d?.code || "";
    worksheet.getCell(`C${currentRow}`).value = rep?.fuelRemain || "";
    worksheet.getCell(`D${currentRow}`).value = rep?.fuelReceived || "";
    worksheet.getCell(`E${currentRow}`).value = rep?.fuelRemainEnd || "";
    worksheet.getCell(`F${currentRow}`).value =
      (rep?.fuelRemain ?? 0) +
      (rep?.fuelReceived ?? 0) -
      (rep?.fuelRemainEnd ?? 0);

    worksheet.getCell(`G${currentRow}`).value = "";

    worksheet.getCell(`H${currentRow}`).value = "";
    worksheet.getCell(`I${currentRow}`).value = "";

    worksheet.mergeCells(`J${currentRow}:O${currentRow}`);
    worksheet.getCell(`J${currentRow}`).value = "";
    index++;
  }
  const fuelEndRow = fuelHeaderRow + index;

  addTableBorders(worksheet, rowHeader1, fuelEndRow, 1, 15);
  const deviceRow = order.device?.length || [];
  worksheet.mergeCells(
    `B${totalRow + 6 + deviceRow}:D${totalRow + 6 + deviceRow}`,
  );
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).value = "✔";
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).font = {
    bold: true,
    size: 12,
  };
  timeSignature(
    worksheet,
    totalRow + 10 + deviceRow,
    "B",
    "D",
    order?.startTime,
  );
  worksheet.mergeCells(
    `B${totalRow + 11 + deviceRow}:D${totalRow + 11 + deviceRow}`,
  );
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(
    `L${totalRow + 6 + deviceRow}:M${totalRow + 6 + deviceRow}`,
  );
  worksheet.getCell(`L${totalRow + 6 + deviceRow}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`L${totalRow + 6 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`L${totalRow + 6 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });

      worksheet.mergeCells(
        `L${totalRow + 7 + deviceRow}:M${totalRow + 9 + deviceRow}`,
      );

      // gán ảnh trực tiếp vào range
      worksheet.addImage(
        imageId,
        `L${totalRow + 7 + deviceRow}:M${totalRow + 9 + deviceRow}`,
      );
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.mergeCells(
        `L${totalRow + 8 + deviceRow}:M${totalRow + 8 + deviceRow}`,
      );
      worksheet.getCell(`L${totalRow + 8 + deviceRow}`).value = "✔";
      worksheet.getCell(`L${totalRow + 8 + deviceRow}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`L${totalRow + 8 + deviceRow}`).font = {
        bold: true,
        size: 12,
      };
    }
  } else {
    worksheet.mergeCells(
      `L${totalRow + 8 + deviceRow}:M${totalRow + 8 + deviceRow}`,
    );
    worksheet.getCell(`L${totalRow + 8 + deviceRow}`).value = "✔";
    worksheet.getCell(`L${totalRow + 8 + deviceRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`L${totalRow + 8 + deviceRow}`).font = {
      bold: true,
      size: 12,
    };
  }
  timeSignature(
    worksheet,
    totalRow + 10 + deviceRow,
    "L",
    "M",
    order?.createdAt,
  );

  worksheet.mergeCells(
    `L${totalRow + 11 + deviceRow}:M${totalRow + 11 + deviceRow}`,
  );
  worksheet.getCell(`L${totalRow + 11 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`L${totalRow + 11 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`L${totalRow + 11 + deviceRow}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 22 }, // Nhận tải
    { key: "C", width: 18 }, // Đổ tải
    { key: "D", width: 14 }, // Loại hàng
    { key: "E", width: 10 }, // Cung độ tạm tính
    { key: "F", width: 14 }, // Chiều cao nâng tải
    { key: "G", width: 14 }, // Số chuyến
    { key: "H", width: 14 }, // Khối lượng
    { key: "I", width: 14 }, // Trọng lượng
    { key: "J", width: 10 }, // Sản lượng
    { key: "K", width: 10 }, // Nhiên liệu
    { key: "L", width: 15 }, // Nhiên liệu
    { key: "M", width: 15 }, // Nhiên liệu
    { key: "N", width: 15 }, // Nhiên liệu
    { key: "O", width: 15 }, // Nhiên liệu
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
  await buildTimeLogSheetExcavator(order, workbook, grouped, sheetName);
}

async function buildTimeLogSheetExcavator(
  order,
  workbook,
  groupedData,
  sheetName,
) {
  if (!groupedData || groupedData.length === 0) return;

  // Định nghĩa số cột thời gian tối đa theo yêu cầu
  const MAX_TIME_COLS = 15;
  const totalCols = 2 + MAX_TIME_COLS; // Cột A, B + 15 cột thời gian (tổng 17 cột)

  // Helper function để chuyển số cột sang chữ cái
  const getColLetter = (colIndex) => {
    let result = "";
    while (colIndex > 0) {
      const remainder = (colIndex - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      colIndex = Math.floor((colIndex - 1) / 26);
    }
    return result;
  };

  // 1. Chuẩn bị Tên Sheet
  const worksheet = workbook.addWorksheet(`${sheetName}_Chi tiết`);

  const borderStyle = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const center = { horizontal: "center", vertical: "middle", wrapText: true };

  // 2. Tiêu đề
  worksheet.mergeCells("A1:Q1");
  const header = worksheet.getCell("A1");
  header.value = `${order.assignedTo?.fullName} - ${formatDate(order.workingDate)} - Chi tiết thời gian thực hiện chuyến`;
  header.font = { bold: true, size: 14, name: "Times New Roman" };
  header.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // 3. Tìm số chuyến tối đa (Để kiểm tra dữ liệu)
  let maxTrips = 0;
  groupedData.forEach((g) => {
    g.materials.forEach((m) => {
      maxTrips = Math.max(maxTrips, m.times?.length || 0);
    });
  });

  if (maxTrips === 0) {
    worksheet.getCell("A2").value =
      "Không có dữ liệu chuyến đi chi tiết trong ca này.";
    return;
  }

  // === 4. Xây dựng Header 2 Hàng (Dòng 2 & 3) - CỐ ĐỊNH ===

  // 4a. Ghi Header cơ bản (Dòng 2)
  const headerRowData = ["Thiết bị nhận tải", "Vật liệu"];
  for (let i = 1; i <= MAX_TIME_COLS; i++) {
    headerRowData.push(null); // Các ô trống cho phần gộp
  }
  worksheet.addRow(headerRowData);
  const headerRow = worksheet.getRow(2);
  headerRow.height = 30;

  // 4b. Thêm hàng STT (Dòng 3)
  const sttRowData = ["", ""]; // Cột A, B trống
  for (let i = 1; i <= MAX_TIME_COLS; i++) {
    sttRowData.push(i);
  }
  worksheet.addRow(sttRowData);
  const sttRow = worksheet.getRow(3);
  sttRow.font = { bold: true, name: "Times New Roman", size: 12 };
  sttRow.alignment = center;

  // 4c. Merge và Style Header

  // Gộp cột A (A2:A3)
  worksheet.mergeCells("A2:A3");
  worksheet.getCell("A2").value = "Thiết bị nhận tải";
  worksheet.getCell("A2").font = {
    bold: true,
    name: "Times New Roman",
    size: 12,
  };
  worksheet.getCell("A2").alignment = center;

  // Gộp cột B (B2:B3)
  worksheet.mergeCells("B2:B3");
  worksheet.getCell("B2").value = "Vật liệu";
  worksheet.getCell("B2").font = {
    bold: true,
    name: "Times New Roman",
    size: 12,
  };
  worksheet.getCell("B2").alignment = center;

  // Gộp tiêu đề "Thời điểm xúc tải" (C2 đến Q2)
  const startColLetter = getColLetter(3); // Cột C
  const endColLetter = getColLetter(totalCols); // Cột Q

  worksheet.mergeCells(`${startColLetter}2:${endColLetter}2`);
  worksheet.getCell(`${startColLetter}2`).value = "Thời điểm xúc tải";
  worksheet.getCell(`${startColLetter}2`).alignment = center;
  worksheet.getCell(`${startColLetter}2`).font = {
    bold: true,
    name: "Times New Roman",
    size: 12,
  };

  // Áp dụng border cho 2 hàng header
  for (let c = 1; c <= totalCols; c++) {
    worksheet.getCell(getColLetter(c) + 2).border = borderStyle;
    worksheet.getCell(getColLetter(c) + 3).border = borderStyle;
  }

  // === 5. Ghi Dữ liệu (Hàng 4 trở đi) - CÓ LOGIC BLOCK ===
  let currentRow = 4;

  groupedData.forEach((g) => {
    g.materials.forEach((m) => {
      const times = m.times || [];
      const numLogs = times.length;
      const numBlocks = Math.ceil(numLogs / MAX_TIME_COLS);

      const startRowForGroup = currentRow; // Dòng bắt đầu của nhóm này

      for (let block = 0; block < numBlocks; block++) {
        const startTripIndex = block * MAX_TIME_COLS;

        const rowData = [];

        // Cột A và B chỉ điền ở block đầu tiên
        if (block === 0) {
          rowData.push(g?.device?.code || "", m.material?.name || "");
        } else {
          rowData.push("", ""); // Để trống để chuẩn bị cho việc merge
        }

        // Ghi dữ liệu thời gian, giới hạn ở 15 cột
        for (let i = startTripIndex; i < startTripIndex + MAX_TIME_COLS; i++) {
          if (i < numLogs) {
            const time = times[i];
            const timeString =
              time instanceof Date
                ? time.toLocaleTimeString("vi-VN", { hour12: false })
                : time || "";
            rowData.push(timeString);
          } else {
            rowData.push("");
          }
        }
        worksheet.addRow(rowData);

        const dataRow = worksheet.getRow(currentRow);

        // Định dạng border và alignment cho hàng data vừa thêm
        dataRow.eachCell((cell, colNumber) => {
          if (colNumber <= totalCols) {
            cell.border = borderStyle;
            cell.alignment = center;
          }
        });

        currentRow++;
      } // Kết thúc vòng lặp block

      // --- MERGE CỘT A VÀ B CHO CẢ NHÓM NÀY ---
      const endRowForGroup = currentRow - 1; // Dòng kết thúc của nhóm này

      if (numBlocks > 1) {
        // Chỉ merge nếu có nhiều hơn 1 hàng dữ liệu
        // Gộp A
        worksheet.mergeCells(`A${startRowForGroup}:A${endRowForGroup}`);
        worksheet.getCell(`A${startRowForGroup}`).alignment = center;

        // Gộp B
        worksheet.mergeCells(`B${startRowForGroup}:B${endRowForGroup}`);
        worksheet.getCell(`B${startRowForGroup}`).alignment = center;
      }
    });
  });

  // 6. Định dạng Cột & Border
  worksheet.getColumn("A").width = 20; // Thiết bị nhận tải
  worksheet.getColumn("B").width = 20; // Vật liệu
  for (let col = 3; col <= totalCols; col++) {
    // 15 cột thời gian (C đến Q)
    worksheet.getColumn(col).width = 15;
  }

  // Giả sử bạn có hàm addTableBorders
  addTableBorders(worksheet, 2, currentRow - 1, 1, totalCols);

  // Font toàn sheet
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = { ...cell.font, name: "Times New Roman", size: 12 };
    });
  });
}
async function buildOther(order, workbook, sheetName) {
  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:L1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:L2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 3: LỆNH SẢN XUẤT
  worksheet.mergeCells("A3:L3");
  const header = worksheet.getCell("A3");
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };
  const rowOffset = 2;

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  worksheet.getCell(`F${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`F${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`G${4 + rowOffset}`).value = ngay;

  worksheet.getCell(`I${4 + rowOffset}`).value = "Ca";
  worksheet.getCell(`I${4 + rowOffset}`).font = { bold: true };

  worksheet.getCell(`J${4 + rowOffset}`).value = order.shift?.name || "";
  worksheet.getCell(`J${4 + rowOffset}`).alignment = { horizontal: "left" };

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";

  worksheet.getCell(`F${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";

  worksheet.getCell(`I${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${5 + rowOffset}:L${5 + rowOffset}`);
  worksheet.getCell(`J${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  // Dòng 6
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";

  worksheet.getCell(`F${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";

  worksheet.getCell(`I${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${6 + rowOffset}:L${6 + rowOffset}`);
  worksheet.getCell(`J${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";

  let headerCursor = 7 + rowOffset;

  // Nội dung lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:L${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.workContent || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // Nội dung bàn giao ca
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung bàn giao ca";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:L${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    order.shiftReport?.handoverNotes || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:L${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:L${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`D${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`D${headerCursor}`).font = { bold: true };
  worksheet.getCell(`E${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  let tableCursor = headerCursor + 2;

  worksheet.mergeCells(`A${tableCursor}:L${tableCursor}`);
  worksheet.getCell(`A${tableCursor}`).value = `I. KIẾN NGHỊ RỦI RO`;
  worksheet.getCell(`A${tableCursor}`).font = { bold: true, size: 14 };
  worksheet.getCell(`A${tableCursor}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getRow(tableCursor).height = 30;

  worksheet.mergeCells(`A${tableCursor + 1}:L${tableCursor + 2}`);
  worksheet.getCell(`A${tableCursor + 1}`).value =
    order.shiftReport?.risks || "";
  worksheet.getCell(`A${tableCursor + 1}`).alignment = {
    wrapText: true,
    vertical: "top",
  };

  worksheet.mergeCells(`A${tableCursor + 3}:L${tableCursor + 3}`);
  worksheet.getCell(`A${tableCursor + 3}`).value = "Mức bồi dưỡng (x1000đ):";

  addTableBorders(worksheet, tableCursor, tableCursor + 3, 1, 12);

  let bottomRow = tableCursor + 5;

  worksheet.mergeCells(`B${bottomRow}:D${bottomRow}`);
  worksheet.getCell(`B${bottomRow}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${bottomRow}`).font = { bold: true };
  worksheet.getCell(`B${bottomRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${bottomRow + 2}`).value = "✔";
  worksheet.getCell(`C${bottomRow + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${bottomRow + 2}`).font = { bold: true, size: 12 };

  timeSignature(worksheet, bottomRow + 4, "B", "D", order?.startTime);
  worksheet.mergeCells(`B${bottomRow + 5}:D${bottomRow + 5}`);
  worksheet.getCell(`B${bottomRow + 5}`).font = { bold: true };
  worksheet.getCell(`B${bottomRow + 5}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${bottomRow + 5}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(`I${bottomRow}:L${bottomRow}`);
  worksheet.getCell(`I${bottomRow}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`I${bottomRow}`).font = { bold: true };
  worksheet.getCell(`I${bottomRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });

      worksheet.mergeCells(`J${bottomRow + 1}:K${bottomRow + 3}`);
      worksheet.addImage(imageId, `J${bottomRow + 1}:K${bottomRow + 3}`);
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.mergeCells(`J${bottomRow + 2}:K${bottomRow + 2}`);
      worksheet.getCell(`J${bottomRow + 2}`).value = "✔";
      worksheet.getCell(`J${bottomRow + 2}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`J${bottomRow + 2}`).font = {
        bold: true,
        size: 12,
      };
    }
  } else {
    worksheet.mergeCells(`J${bottomRow + 2}:K${bottomRow + 2}`);
    worksheet.getCell(`J${bottomRow + 2}`).value = "✔";
    worksheet.getCell(`J${bottomRow + 2}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`J${bottomRow + 2}`).font = {
      bold: true,
      size: 12,
    };
  }
  timeSignature(worksheet, bottomRow + 4, "J", "K", order?.createdAt);

  worksheet.mergeCells(`I${bottomRow + 5}:L${bottomRow + 5}`);
  worksheet.getCell(`I${bottomRow + 5}`).font = { bold: true };
  worksheet.getCell(`I${bottomRow + 5}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`I${bottomRow + 5}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 18 }, // Nhận tải
    { key: "C", width: 18 }, // Đổ tải
    { key: "D", width: 14 }, // Loại hàng
    { key: "E", width: 14 }, // Cung độ tạm tính
    { key: "F", width: 14 }, // Chiều cao nâng tải
    { key: "G", width: 14 }, // Số chuyến
    { key: "H", width: 14 }, // Khối lượng
    { key: "I", width: 14 }, // Trọng lượng
    { key: "J", width: 13 }, // Sản lượng
    { key: "K", width: 12 }, // Nhiên liệu
    { key: "L", width: 12 }, // Điểm lương
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
}
async function buildMaintence(order, workbook, sheetName) {
  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:N1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:N2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };

  const rowOffset = 2;
  // Tiêu đề bảng
  worksheet.mergeCells(`A${1 + rowOffset}:N${2 + rowOffset}`);
  const header = worksheet.getCell(`A${1 + rowOffset}`);
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  worksheet.getCell(`E${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`E${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`F${4 + rowOffset}`).value = ngay;

  worksheet.getCell(`G${4 + rowOffset}`).value = order.shiftHour || "";

  worksheet.getCell(`H${4 + rowOffset}`).value = "Ca";
  worksheet.getCell(`H${4 + rowOffset}`).font = { bold: true };

  worksheet.getCell(`I${4 + rowOffset}`).value = order.shift?.name || "";
  worksheet.getCell(`I${4 + rowOffset}`).alignment = { horizontal: "left" };

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";

  worksheet.getCell(`E${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`E${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`F${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";

  worksheet.getCell(`H${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`H${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`I${5 + rowOffset}:N${5 + rowOffset}`);
  worksheet.getCell(`I${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  // Dòng 6
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";

  worksheet.getCell(`E${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`E${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`F${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";

  worksheet.getCell(`H${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`H${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`I${6 + rowOffset}:K${6 + rowOffset}`);
  worksheet.getCell(`I${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";

  // Dòng 6 lx bo tuc
  worksheet.getCell(`B${7 + rowOffset}`).value = "Phụ sửa chữa";
  worksheet.getCell(`B${7 + rowOffset}`).font = { bold: true };

  let rowIndex = 7 + rowOffset;
  (order.assistants || []).forEach((driver, idx) => {
    let row = rowIndex + idx;

    worksheet.getCell(`C${row}`).value = driver.fullName || "";
    worksheet.getCell(`E${row}`).value = "Số thẻ";
    worksheet.getCell(`E${row}`).font = { bold: true };
    worksheet.getCell(`F${row}`).value = driver.salaryCode || "";

    worksheet.getCell(`H${row}`).value = "Chức vụ";
    worksheet.getCell(`H${row}`).font = { bold: true };
    worksheet.mergeCells(`I${row}:N${row}`);
    worksheet.getCell(`I${row}`).value = driver.position?.name || "";
  });

  let headerCursor = rowIndex + (order.assistants?.length || 1);

  // Nội dung lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.workContent || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // Nội dung bàn giao ca
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung bàn giao ca";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    order.shiftReport?.handoverNotes || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;


  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`E${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`E${headerCursor}`).font = { bold: true };
  worksheet.getCell(`F${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  let rowHeader1 = headerCursor + 2;
  worksheet.mergeCells(`A${rowHeader1}:N${rowHeader1}`);
  const product = worksheet.getCell(`A${rowHeader1}`);
  product.value = `I. TÌNH TRẠNG SỬA CHỮA`;
  product.font = { bold: true, size: 14 };
  product.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(rowHeader1).height = 30;

  worksheet.getCell(`A${rowHeader1 + 1}`).value = "STT";
  worksheet.getCell(`B${rowHeader1 + 1}`).value = "Thiết bị";
  worksheet.mergeCells(`C${rowHeader1 + 1}:E${rowHeader1 + 1}`);
  worksheet.getCell(`C${rowHeader1 + 1}`).value = "Tình trạng hư hỏng";
  worksheet.mergeCells(`F${rowHeader1 + 1}:H${rowHeader1 + 1}`);
  worksheet.getCell(`F${rowHeader1 + 1}`).value = "Kết quả sửa chữa cuối ca";
  worksheet.mergeCells(`I${rowHeader1 + 1}:J${rowHeader1 + 1}`);
  worksheet.getCell(`I${rowHeader1 + 1}`).value = "Đơn vị sửa chữa";
  worksheet.mergeCells(`K${rowHeader1 + 1}:N${rowHeader1 + 1}`);
  worksheet.getCell(`K${rowHeader1 + 1}`).value = "Ghi chú";

  const headerRow = worksheet.getRow(rowHeader1 + 1);
  for (let col = 1; col <= 12; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true };
    cell.alignment = {
      ...cell.alignment,
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
  }

  let rowIndexTrip = rowHeader1 + 2;
  const data = order.repairVehicles.length > 0 ? order.repairVehicles : [{}];
  data.forEach((repair, index) => {
    let report = {};

    if (order.shiftReport && order.shiftReport?.vehicleRepair.length > 0) {
      report =
        order.shiftReport.vehicleRepair.find(
          (vr) => vr.device.toString() === repair.device?._id.toString(),
        ) || {};
    }
    worksheet.getCell(`A${rowIndexTrip}`).value = index + 1;
    worksheet.getCell(`A${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`B${rowIndexTrip}`).value = repair.device?.code || "";
    worksheet.getCell(`B${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`C${rowIndexTrip}:E${rowIndexTrip}`);
    worksheet.getCell(`C${rowIndexTrip}`).value = repair.note || "";
    worksheet.getCell(`C${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`F${rowIndexTrip}:H${rowIndexTrip}`);
    worksheet.getCell(`F${rowIndexTrip}`).value = report.status || "";
    worksheet.getCell(`F${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`I${rowIndexTrip}:J${rowIndexTrip}`);
    worksheet.getCell(`I${rowIndexTrip}`).value =
      order.repairDepartment?.code || "";
    worksheet.getCell(`I${rowIndexTrip}`).alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`K${rowIndexTrip}:N${rowIndexTrip}`);
    worksheet.getCell(`K${rowIndexTrip}`).value = report.noteRepair || "";
    worksheet.getCell(`K${rowIndexTrip}`).alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true,
    };
    rowIndexTrip++;
  });

  worksheet.mergeCells(`A${rowIndexTrip}:N${rowIndexTrip}`);
  worksheet.getCell(`A${rowIndexTrip}`).value = "Mức bồi dưỡng (x1000đ):";

  worksheet.mergeCells(`A${rowIndexTrip + 1}:N${rowIndexTrip + 1}`);
  const header3 = worksheet.getCell(`A${rowIndexTrip + 1}`);
  header3.value = `IV.NHIÊN LIỆU`;
  header3.font = { bold: true, size: 14 };
  header3.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(rowIndexTrip + 2).height = 30;

  worksheet.mergeCells(`A${rowIndexTrip + 2}:B${rowIndexTrip + 2}`);
  worksheet.getCell(`A${rowIndexTrip + 2}`).value = "Thiết bị vận hành";
  worksheet.getCell(`A${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`A${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`C${rowIndexTrip + 2}`).value = "Tồn dầu";
  worksheet.getCell(`C${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`C${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`D${rowIndexTrip + 2}`).value = "Lĩnh trong ca";
  worksheet.getCell(`D${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`D${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`E${rowIndexTrip + 2}`).value = "Tồn cuối ca";
  worksheet.getCell(`E${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`E${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`F${rowIndexTrip + 2}`).value = "Tiêu thụ";
  worksheet.getCell(`F${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`F${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`G${rowIndexTrip + 2}`).value = "Định mức";
  worksheet.getCell(`G${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`G${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`H${rowIndexTrip + 2}`).value = "Tiết kiệm";
  worksheet.getCell(`H${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`H${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`I${rowIndexTrip + 2}`).value = "Sử dụng vượt";
  worksheet.getCell(`I${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`I${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells(`J${rowIndexTrip + 2}:N${rowIndexTrip + 2}`);
  worksheet.getCell(`J${rowIndexTrip + 2}`).value = "Ghi chú";
  worksheet.getCell(`J${rowIndexTrip + 2}`).font = { bold: true };
  worksheet.getCell(`J${rowIndexTrip + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const fuelHeaderRow = rowIndexTrip + 3;

  let index = 0;
  for (let d of order.repairVehicles || [{}]) {
    const rep = (order.shiftReport?.vehicleSummaries || []).find(
      (i) => i?.vehicle?._id.toString() === d.device?._id.toString(),
    );
    const currentRow = fuelHeaderRow + index;
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = d.device?.code || "";
    worksheet.getCell(`C${currentRow}`).value = rep?.fuelRemain || "";
    worksheet.getCell(`D${currentRow}`).value = rep?.fuelReceived || "";
    worksheet.getCell(`E${currentRow}`).value = rep?.fuelRemainEnd || "";
    worksheet.getCell(`F${currentRow}`).value =
      (rep?.fuelRemain ?? 0) +
      (rep?.fuelReceived ?? 0) -
      (rep?.fuelRemainEnd ?? 0);

    worksheet.getCell(`G${currentRow}`).value = "";

    worksheet.getCell(`H${currentRow}`).value = "";
    worksheet.getCell(`I${currentRow}`).value = "";
    worksheet.mergeCells(`J${currentRow}:N${currentRow}`);
    worksheet.getCell(`J${currentRow}`).value = "";
    index++;
  }
  const fuelEndRow = fuelHeaderRow + index;

  addTableBorders(worksheet, rowHeader1, fuelEndRow - 1, 1, 14);

  worksheet.mergeCells(`B${fuelEndRow + 2}:D${fuelEndRow + 2}`);
  worksheet.getCell(`B${fuelEndRow + 2}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${fuelEndRow + 2}`).font = { bold: true };
  worksheet.getCell(`B${fuelEndRow + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${fuelEndRow + 4}`).value = "✔";
  worksheet.getCell(`C${fuelEndRow + 4}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${fuelEndRow + 4}`).font = { bold: true, size: 12 };
  timeSignature(worksheet, fuelEndRow + 6, "B", "D", order?.startTime);
  worksheet.mergeCells(`B${fuelEndRow + 7}:D${fuelEndRow + 7}`);
  worksheet.getCell(`B${fuelEndRow + 7}`).font = { bold: true };
  worksheet.getCell(`B${fuelEndRow + 7}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${fuelEndRow + 7}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(`J${fuelEndRow + 2}:M${fuelEndRow + 2}`);
  worksheet.getCell(`J${fuelEndRow + 2}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`J${fuelEndRow + 2}`).font = { bold: true };
  worksheet.getCell(`J${fuelEndRow + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });

      worksheet.mergeCells(`K${fuelEndRow + 3}:L${fuelEndRow + 5}`);

      // gán ảnh trực tiếp vào range
      worksheet.addImage(imageId, `K${fuelEndRow + 3}:L${fuelEndRow + 5}`);
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.mergeCells(`K${fuelEndRow + 4}:L${fuelEndRow + 4}`);
      worksheet.getCell(`K${fuelEndRow + 4}`).value = "✔";
      worksheet.getCell(`K${fuelEndRow + 4}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`K${fuelEndRow + 4}`).font = {
        bold: true,
        size: 12,
      };
    }
  } else {
    worksheet.mergeCells(`K${fuelEndRow + 4}:L${fuelEndRow + 4}`);
    worksheet.getCell(`K${fuelEndRow + 4}`).value = "✔";
    worksheet.getCell(`K${fuelEndRow + 4}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`K${fuelEndRow + 4}`).font = {
      bold: true,
      size: 12,
    };
  }
  timeSignature(worksheet, fuelEndRow + 6, "K", "L", order?.createdAt);

  worksheet.mergeCells(`J${fuelEndRow + 7}:M${fuelEndRow + 7}`);
  worksheet.getCell(`J${fuelEndRow + 7}`).font = { bold: true };
  worksheet.getCell(`J${fuelEndRow + 7}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`J${fuelEndRow + 7}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 25 }, // Nhận tải
    { key: "C", width: 15 }, // Đổ tải
    { key: "D", width: 15 }, // Loại hàng
    { key: "E", width: 15 }, // Cung độ tạm tính
    { key: "F", width: 14 }, // Chiều cao nâng tải
    { key: "G", width: 10 }, // Số chuyến
    { key: "H", width: 14 }, // Khối lượng
    { key: "I", width: 25 }, // Trọng lượng
    { key: "J", width: 15 }, // Trọng lượng
    { key: "K", width: 15 }, // Trọng lượng
    { key: "L", width: 15 }, // Trọng lượng
    { key: "M", width: 15 }, // Trọng lượng
    { key: "N", width: 15 }, // Trọng lượng
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
}
async function buildDrill(order, workbook, sheetName) {
  const reports = await Report.find({ orderId: order._id })
    .populate("device", "code")
    .populate("material", "name acceptedProduct")
    .populate("excavator", "code")
    .populate("fromLocation", "name")
    .populate("toLocation", "name");

  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:N1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:N2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.mergeCells(`A3:N3`);
  const header = worksheet.getCell(`A3`);
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };

  const rowOffset = 2;
  // Tiêu đề bảng

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  worksheet.getCell(`F${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`F${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`G${4 + rowOffset}`).value = ngay;

  worksheet.getCell(`H${4 + rowOffset}`).value = order.shiftHour || "";

  worksheet.getCell(`I${4 + rowOffset}`).value = "Ca";
  worksheet.getCell(`I${4 + rowOffset}`).font = { bold: true };

  worksheet.getCell(`J${4 + rowOffset}`).value = order.shift?.name || "";
  worksheet.getCell(`J${4 + rowOffset}`).alignment = { horizontal: "left" };

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";

  worksheet.getCell(`F${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";

  worksheet.getCell(`I${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${5 + rowOffset}:N${5 + rowOffset}`);
  worksheet.getCell(`J${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  // Dòng 6
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";

  worksheet.getCell(`F${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";

  worksheet.getCell(`I${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${6 + rowOffset}:K${6 + rowOffset}`);
  worksheet.getCell(`J${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";
  worksheet.mergeCells(`L${6 + rowOffset}:M${6 + rowOffset}`);
  worksheet.getCell(`L${6 + rowOffset}`).value = "Thiết bị vận hành";
  worksheet.getCell(`L${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`N${6 + rowOffset}`).value =
    (order.device || []).map((d) => d.code).join(", ") || "";

  // Dòng 6 lx bo tuc
  worksheet.getCell(`B${7 + rowOffset}`).value = "Phụ máy";
  worksheet.getCell(`B${7 + rowOffset}`).font = { bold: true };

  let rowIndex = 7 + rowOffset;
  (order.assistants || []).forEach((driver, idx) => {
    let row = rowIndex + idx;

    worksheet.getCell(`C${row}`).value = driver.fullName || "";
    worksheet.getCell(`F${row}`).value = "Số thẻ";
    worksheet.getCell(`F${row}`).font = { bold: true };
    worksheet.getCell(`G${row}`).value = driver.salaryCode || "";

    worksheet.getCell(`I${row}`).value = "Chức vụ";
    worksheet.getCell(`I${row}`).font = { bold: true };
    worksheet.mergeCells(`J${row}:L${row}`);
    worksheet.getCell(`J${row}`).value = driver.position?.name || "";
  });

  let headerCursor = rowIndex + (order.assistants?.length || 1);

  // Nội dung lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.workContent || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // Nội dung bàn giao ca
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung bàn giao ca";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    order.shiftReport?.handoverNotes || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // GPS và Kẹp chì nếu có thiết bị
  if (order.device && order.device.length > 0) {
    // GPS
    worksheet.getCell(`B${headerCursor}`).value = "GPS:";
    worksheet.getCell(`B${headerCursor}`).font = { bold: true };
    worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
    worksheet.getCell(`C${headerCursor}`).value =
      (order.shiftReport?.vehicleSummaries || [])[0]?.gpsStatus || "";
    worksheet.getCell(`C${headerCursor}`).alignment = {
      wrapText: true,
      vertical: "top",
      horizontal: "left",
    };

    headerCursor += 1;

    // Kẹp chì
    worksheet.getCell(`B${headerCursor}`).value = "Kẹp chì:";
    worksheet.getCell(`B${headerCursor}`).font = { bold: true };
    worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
    worksheet.getCell(`C${headerCursor}`).value =
      (order.shiftReport?.vehicleSummaries || [])[0]?.sealStatus || "";
    worksheet.getCell(`C${headerCursor}`).alignment = {
      wrapText: true,
      vertical: "top",
      horizontal: "left",
    };

    headerCursor += 1;
  }

  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh & Kết thúc & Giờ hoạt động & Lũy kế
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`D${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`D${headerCursor}`).font = { bold: true };
  worksheet.getCell(`E${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.mergeCells(`F${headerCursor}:G${headerCursor}`);
  worksheet.getCell(`F${headerCursor}`).value = "Giờ hoạt động trong ca";
  worksheet.getCell(`F${headerCursor}`).font = { bold: true };
  worksheet.getCell(`H${headerCursor}`).value =
    order?.shiftReport?.shiftHours || "";
  worksheet.getCell(`H${headerCursor}`).alignment = { horizontal: "left" };

  worksheet.mergeCells(`I${headerCursor}:J${headerCursor}`);
  worksheet.getCell(`I${headerCursor}`).value = "Giờ lũy kế trên đồng hồ";
  worksheet.getCell(`I${headerCursor}`).font = { bold: true };
  worksheet.getCell(`K${headerCursor}`).value =
    (order?.shiftReport?.vehicleSummaries || []).reduce((sum, report) => {
      return sum + report?.travelHours;
    }, 0) || "";
  worksheet.getCell(`K${headerCursor}`).alignment = { horizontal: "left" };

  let rowHeader1 = headerCursor + 2;
  worksheet.mergeCells(`A${rowHeader1}:N${rowHeader1}`);
  const product = worksheet.getCell(`A${rowHeader1}`);
  product.value = `I. SẢN PHẨM`;
  product.font = { bold: true, size: 14 };
  product.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(rowHeader1).height = 30;

  worksheet.getCell(`A${rowHeader1 + 1}`).value = "STT";
  worksheet.mergeCells(`B${rowHeader1 + 1}:C${rowHeader1 + 1}`);
  worksheet.getCell(`B${rowHeader1 + 1}`).value = "Máy khoan";
  worksheet.mergeCells(`D${rowHeader1 + 1}:E${rowHeader1 + 1}`);
  worksheet.getCell(`D${rowHeader1 + 1}`).value = "Vật liệu";
  worksheet.getCell(`F${rowHeader1 + 1}`).value = "Độ cứng";
  worksheet.getCell(`G${rowHeader1 + 1}`).value = "Sản lượng tạm tính (mks)";
  worksheet.getCell(`H${rowHeader1 + 1}`).value = "Nhiên liệu định mức";
  worksheet.getCell(`I${rowHeader1 + 1}`).value = "Điểm lương \n tạm tính";
  worksheet.mergeCells(`J${rowHeader1 + 1}:N${rowHeader1 + 1}`);
  worksheet.getCell(`J${rowHeader1 + 1}`).value = "Ghi chú";

  const headerRow = worksheet.getRow(rowHeader1 + 1);
  for (let col = 1; col <= 10; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true };
    cell.alignment = {
      ...cell.alignment,
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
  }

  let rowIndexTrip = rowHeader1 + 2;
  reports.forEach((report, i) => {
    worksheet.getCell(`A${rowIndexTrip}`).value = i + 1;
    worksheet.getCell(`A${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`B${rowIndexTrip}:C${rowIndexTrip}`);
    worksheet.getCell(`B${rowIndexTrip}`).value = report.device?.code || "";
    worksheet.getCell(`B${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`D${rowIndexTrip}:E${rowIndexTrip}`);
    worksheet.getCell(`D${rowIndexTrip}`).value = report.material?.name || "";
    worksheet.getCell(`D${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`F${rowIndexTrip}`).value = report.hardnessF || "";
    worksheet.getCell(`F${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`G${rowIndexTrip}`).value = report.drillDepth || "";
    worksheet.getCell(`G${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`H${rowIndexTrip}`).value = "";
    worksheet.getCell(`H${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`I${rowIndexTrip}`).value = "";
    worksheet.getCell(`I${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`J${rowIndexTrip}:N${rowIndexTrip}`);
    worksheet.getCell(`J${rowIndexTrip}`).value = "";
    rowIndexTrip++;
  });

  const totalRow = rowIndexTrip;

  worksheet.mergeCells(`A${totalRow}:C${totalRow}`);
  worksheet.getCell(`A${totalRow}`).value = "Tổng cộng";
  worksheet.getCell(`A${totalRow}`).font = { bold: true };
  worksheet.getCell(`A${totalRow}`).alignment = { horizontal: "center" };
  worksheet.mergeCells(`D${totalRow}:E${totalRow}`);
  worksheet.mergeCells(`J${totalRow}:N${totalRow}`);

  worksheet.mergeCells(`A${totalRow + 1}:N${totalRow + 1}`);
  worksheet.getCell(`A${totalRow + 1}`).value = "Mức bồi dưỡng (x1000đ):";

  worksheet.mergeCells(`A${totalRow + 2}:N${totalRow + 2}`);
  const header3 = worksheet.getCell(`A${totalRow + 2}`);
  header3.value = `II.NHIÊN LIỆU`;
  header3.font = { bold: true, size: 14 };
  header3.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(totalRow + 2).height = 30;

  worksheet.mergeCells(`A${totalRow + 3}:B${totalRow + 3}`);
  worksheet.getCell(`A${totalRow + 3}`).value = "Máy khoan";
  worksheet.getCell(`A${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`A${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`C${totalRow + 3}`).value = "Tồn dầu";
  worksheet.getCell(`C${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`C${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`D${totalRow + 3}`).value = "Lĩnh trong ca";
  worksheet.getCell(`D${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`D${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`E${totalRow + 3}`).value = "Tồn cuối ca";
  worksheet.getCell(`E${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`E${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`F${totalRow + 3}`).value = "Tiêu thụ";
  worksheet.getCell(`F${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`F${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`G${totalRow + 3}`).value = "Định mức";
  worksheet.getCell(`G${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`G${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`H${totalRow + 3}`).value = "Tiết kiệm";
  worksheet.getCell(`H${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`H${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`I${totalRow + 3}`).value = "Sử dụng vượt";
  worksheet.getCell(`I${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`I${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells(`J${totalRow + 3}:N${totalRow + 3}`);
  worksheet.getCell(`J${totalRow + 3}`).value = "Ghi chú";
  worksheet.getCell(`J${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const fuelHeaderRow = totalRow + 4;
  let index = 0;
  for (let d of order.device || [{}]) {
    const rep = (order.shiftReport?.vehicleSummaries || []).find(
      (i) => i?.vehicle?._id.toString() === d._id.toString(),
    );
    const currentRow = fuelHeaderRow + index;
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = d?.code || "";
    worksheet.getCell(`C${currentRow}`).value = rep?.fuelRemain || "";
    worksheet.getCell(`D${currentRow}`).value = rep?.fuelReceived || "";
    worksheet.getCell(`E${currentRow}`).value = rep?.fuelRemainEnd || "";
    worksheet.getCell(`F${currentRow}`).value =
      (rep?.fuelRemain ?? 0) +
      (rep?.fuelReceived ?? 0) -
      (rep?.fuelRemainEnd ?? 0);

    worksheet.getCell(`G${currentRow}`).value = "";

    worksheet.getCell(`H${currentRow}`).value = "";
    worksheet.getCell(`I${currentRow}`).value = "";

    worksheet.mergeCells(`J${currentRow}:N${currentRow}`);
    worksheet.getCell(`J${currentRow}`).value = "";
    index++;
  }
  const fuelEndRow = fuelHeaderRow + index;

  addTableBorders(worksheet, rowHeader1, fuelEndRow, 1, 14);
  const deviceRow = order.device?.length || [];
  worksheet.mergeCells(
    `B${totalRow + 6 + deviceRow}:D${totalRow + 6 + deviceRow}`,
  );
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).value = "✔";
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).font = {
    bold: true,
    size: 12,
  };
  timeSignature(
    worksheet,
    totalRow + 10 + deviceRow,
    "B",
    "D",
    order?.startTime,
  );
  worksheet.mergeCells(
    `B${totalRow + 11 + deviceRow}:D${totalRow + 11 + deviceRow}`,
  );
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(
    `J${totalRow + 6 + deviceRow}:M${totalRow + 6 + deviceRow}`,
  );
  worksheet.getCell(`J${totalRow + 6 + deviceRow}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`J${totalRow + 6 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 6 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });
      worksheet.mergeCells(
        `K${totalRow + 7 + deviceRow}:L${totalRow + 9 + deviceRow}`,
      );

      // gán ảnh trực tiếp vào range
      worksheet.addImage(
        imageId,
        `K${totalRow + 7 + deviceRow}:L${totalRow + 9 + deviceRow}`,
      );
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.mergeCells(`K${totalRow + 8 + deviceRow}:L${totalRow + 8 + deviceRow}`);
      worksheet.getCell(`K${totalRow + 8 + deviceRow}`).value = "✔";
      worksheet.getCell(`K${totalRow + 8 + deviceRow}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`K${totalRow + 8 + deviceRow}`).font = {
        bold: true,
        size: 12,
      };
    }
  } else {
    worksheet.mergeCells(`K${totalRow + 8 + deviceRow}:L${totalRow + 8 + deviceRow}`);
    worksheet.getCell(`K${totalRow + 8 + deviceRow}`).value = "✔";
    worksheet.getCell(`K${totalRow + 8 + deviceRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`K${totalRow + 8 + deviceRow}`).font = {
      bold: true,
      size: 12,
    };
  }
  timeSignature(
    worksheet,
    totalRow + 10 + deviceRow,
    "K",
    "L",
    order?.createdAt,
  );

  worksheet.mergeCells(
    `J${totalRow + 11 + deviceRow}:M${totalRow + 11 + deviceRow}`,
  );
  worksheet.getCell(`J${totalRow + 11 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 11 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`J${totalRow + 11 + deviceRow}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 22 }, // Nhận tải
    { key: "C", width: 18 }, // Đổ tải
    { key: "D", width: 14 }, // Loại hàng
    { key: "E", width: 14 }, // Cung độ tạm tính
    { key: "F", width: 14 }, // Chiều cao nâng tải
    { key: "G", width: 14 }, // Số chuyến
    { key: "H", width: 14 }, // Khối lượng
    { key: "I", width: 14 }, // Trọng lượng
    { key: "J", width: 13 }, // Sản lượng
    { key: "K", width: 15 }, // Nhiên liệu
    { key: "L", width: 15 }, // Điểm lương
    { key: "M", width: 15 }, // Điểm lương
    { key: "N", width: 15 }, // Điểm lương
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
}
async function buildDozer(order, workbook, sheetName) {
  const reports = await Report.find({ orderId: order._id })
    .populate("device", "code")
    .populate("material", "name acceptedProduct")
    .populate("excavator", "code")
    .populate("fromLocation", "name")
    .populate("toLocation", "name");

  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:N1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:N2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };

  const rowOffset = 2;
  // Tiêu đề bảng
  worksheet.mergeCells(`A${1 + rowOffset}:N${2 + rowOffset}`);
  const header = worksheet.getCell(`A${1 + rowOffset}`);
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  worksheet.getCell(`F${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`F${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`G${4 + rowOffset}`).value = ngay;

  worksheet.getCell(`H${4 + rowOffset}`).value = order.shiftHour || "";

  worksheet.getCell(`I${4 + rowOffset}`).value = "Ca";
  worksheet.getCell(`I${4 + rowOffset}`).font = { bold: true };

  worksheet.getCell(`J${4 + rowOffset}`).value = order.shift?.name || "";
  worksheet.getCell(`J${4 + rowOffset}`).alignment = { horizontal: "left" };

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";

  worksheet.getCell(`F${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";

  worksheet.getCell(`I${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${5 + rowOffset}:L${5 + rowOffset}`);
  worksheet.getCell(`J${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  // Dòng 6
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";

  worksheet.getCell(`F${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`F${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`G${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";

  worksheet.getCell(`I${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`I${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`J${6 + rowOffset}:K${6 + rowOffset}`);
  worksheet.getCell(`J${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";
  worksheet.mergeCells(`L${6 + rowOffset}:M${6 + rowOffset}`);
  worksheet.getCell(`L${6 + rowOffset}`).value = "Thiết bị vận hành";
  worksheet.getCell(`L${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`N${6 + rowOffset}`).value =
    (order.device || []).map((d) => d.code).join(", ") || "";

  // Dòng 6 lx bo tuc
  worksheet.getCell(`B${7 + rowOffset}`).value = "Phụ máy";
  worksheet.getCell(`B${7 + rowOffset}`).font = { bold: true };

  let rowIndex = 7 + rowOffset;
  (order.assistants || []).forEach((driver, idx) => {
    let row = rowIndex + idx;

    worksheet.getCell(`C${row}`).value = driver.fullName || "";
    worksheet.getCell(`F${row}`).value = "Số thẻ";
    worksheet.getCell(`F${row}`).font = { bold: true };
    worksheet.getCell(`G${row}`).value = driver.salaryCode || "";

    worksheet.getCell(`I${row}`).value = "Chức vụ";
    worksheet.getCell(`I${row}`).font = { bold: true };
    worksheet.mergeCells(`J${row}:L${row}`);
    worksheet.getCell(`J${row}`).value = driver.position?.name || "";
  });

  let headerCursor = rowIndex + (order.assistants?.length || 1);

  // Nội dung lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.workContent || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // Nội dung bàn giao ca
  worksheet.getCell(`B${headerCursor}`).value = "Nội dung bàn giao ca";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    order.shiftReport?.handoverNotes || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    wrapText: true,
    vertical: "top",
    horizontal: "left",
  };

  headerCursor += 2;

  // GPS và Kẹp chì nếu có thiết bị
  if (order.device && order.device.length > 0) {
    // GPS
    worksheet.getCell(`B${headerCursor}`).value = "GPS:";
    worksheet.getCell(`B${headerCursor}`).font = { bold: true };
    worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
    worksheet.getCell(`C${headerCursor}`).value =
      (order.shiftReport?.vehicleSummaries || [])[0]?.gpsStatus || "";
    worksheet.getCell(`C${headerCursor}`).alignment = {
      wrapText: true,
      vertical: "top",
      horizontal: "left",
    };

    headerCursor += 1;

    // Kẹp chì
    worksheet.getCell(`B${headerCursor}`).value = "Kẹp chì:";
    worksheet.getCell(`B${headerCursor}`).font = { bold: true };
    worksheet.mergeCells(`C${headerCursor}:N${headerCursor}`);
    worksheet.getCell(`C${headerCursor}`).value =
      (order.shiftReport?.vehicleSummaries || [])[0]?.sealStatus || "";
    worksheet.getCell(`C${headerCursor}`).alignment = {
      wrapText: true,
      vertical: "top",
      horizontal: "left",
    };

    headerCursor += 1;
  }

  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:N${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh & Kết thúc & Giờ hoạt động & Lũy kế
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`D${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`D${headerCursor}`).font = { bold: true };
  worksheet.getCell(`E${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.mergeCells(`F${headerCursor}:G${headerCursor}`);
  worksheet.getCell(`F${headerCursor}`).value = "Giờ hoạt động trong ca";
  worksheet.getCell(`F${headerCursor}`).font = { bold: true };
  worksheet.getCell(`H${headerCursor}`).value =
    order?.shiftReport?.shiftHours || "";
  worksheet.getCell(`H${headerCursor}`).alignment = { horizontal: "left" };

  worksheet.mergeCells(`I${headerCursor}:J${headerCursor}`);
  worksheet.getCell(`I${headerCursor}`).value = "Giờ lũy kế trên đồng hồ";
  worksheet.getCell(`I${headerCursor}`).font = { bold: true };
  worksheet.getCell(`K${headerCursor}`).value =
    (order?.shiftReport?.vehicleSummaries || []).reduce((sum, report) => {
      return sum + report?.travelHours;
    }, 0) || "";
  worksheet.getCell(`K${headerCursor}`).alignment = { horizontal: "left" };

  let rowHeader1 = headerCursor + 2;
  worksheet.mergeCells(`A${rowHeader1}:N${rowHeader1}`);
  const product = worksheet.getCell(`A${rowHeader1}`);
  product.value = `I. SẢN PHẨM`;
  product.font = { bold: true, size: 14 };
  product.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(rowHeader1).height = 30;

  worksheet.getCell(`A${rowHeader1 + 1}`).value = "STT";
  worksheet.mergeCells(`B${rowHeader1 + 1}:C${rowHeader1 + 1}`);
  worksheet.getCell(`B${rowHeader1 + 1}`).value = "Máy gạt";
  worksheet.mergeCells(`D${rowHeader1 + 1}:E${rowHeader1 + 1}`);
  worksheet.getCell(`D${rowHeader1 + 1}`).value = "Vật liệu/Phục vụ";
  worksheet.getCell(`F${rowHeader1 + 1}`).value = "Giờ sản phẩm (phút)";
  worksheet.mergeCells(`F${rowHeader1 + 1}:G${rowHeader1 + 1}`);
  worksheet.getCell(`H${rowHeader1 + 1}`).value = "Nhiên liệu định mức";
  worksheet.getCell(`I${rowHeader1 + 1}`).value = "Điểm lương \n tạm tính";
  worksheet.mergeCells(`J${rowHeader1 + 1}:N${rowHeader1 + 1}`);
  worksheet.getCell(`J${rowHeader1 + 1}`).value = "Ghi chú";

  const headerRow = worksheet.getRow(rowHeader1 + 1);
  for (let col = 1; col <= 10; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true };
    cell.alignment = {
      ...cell.alignment,
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
  }

  let rowIndexTrip = rowHeader1 + 2;
  reports.forEach((report, i) => {
    worksheet.getCell(`A${rowIndexTrip}`).value = i + 1;
    worksheet.getCell(`A${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`B${rowIndexTrip}:C${rowIndexTrip}`);
    worksheet.getCell(`B${rowIndexTrip}`).value = report.device?.code || "";
    worksheet.getCell(`B${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`D${rowIndexTrip}:E${rowIndexTrip}`);
    worksheet.getCell(`D${rowIndexTrip}`).value = report.material?.name || "";
    worksheet.getCell(`D${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`F${rowIndexTrip}:G${rowIndexTrip}`);
    worksheet.getCell(`F${rowIndexTrip}`).value = report?.workingMinutes || "";
    worksheet.getCell(`F${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`H${rowIndexTrip}`).value = "";
    worksheet.getCell(`H${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getCell(`I${rowIndexTrip}`).value = "";
    worksheet.getCell(`I${rowIndexTrip}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.mergeCells(`J${rowIndexTrip}:N${rowIndexTrip}`);
    worksheet.getCell(`J${rowIndexTrip}`).value = "";
    rowIndexTrip++;
  });

  const totalRow = rowIndexTrip;

  worksheet.mergeCells(`A${totalRow}:C${totalRow}`);
  worksheet.getCell(`A${totalRow}`).value = "Tổng cộng";
  worksheet.getCell(`A${totalRow}`).font = { bold: true };
  worksheet.getCell(`A${totalRow}`).alignment = { horizontal: "center" };
  worksheet.mergeCells(`D${totalRow}:E${totalRow}`);
  worksheet.mergeCells(`F${totalRow}:G${totalRow}`);
  worksheet.mergeCells(`J${totalRow}:N${totalRow}`);

  worksheet.mergeCells(`A${totalRow + 1}:N${totalRow + 1}`);
  worksheet.getCell(`A${totalRow + 1}`).value = "Mức bồi dưỡng (x1000đ):";

  worksheet.mergeCells(`A${totalRow + 2}:N${totalRow + 2}`);
  const header3 = worksheet.getCell(`A${totalRow + 2}`);
  header3.value = `IV.NHIÊN LIỆU`;
  header3.font = { bold: true, size: 14 };
  header3.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(totalRow + 2).height = 30;

  worksheet.mergeCells(`A${totalRow + 3}:B${totalRow + 3}`);
  worksheet.getCell(`A${totalRow + 3}`).value = "Máy gạt";
  worksheet.getCell(`A${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`A${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`C${totalRow + 3}`).value = "Tồn dầu";
  worksheet.getCell(`C${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`C${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`D${totalRow + 3}`).value = "Lĩnh trong ca";
  worksheet.getCell(`D${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`D${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`E${totalRow + 3}`).value = "Tồn cuối ca";
  worksheet.getCell(`E${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`E${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`F${totalRow + 3}`).value = "Tiêu thụ";
  worksheet.getCell(`F${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`F${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`G${totalRow + 3}`).value = "Định mức";
  worksheet.getCell(`G${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`G${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`H${totalRow + 3}`).value = "Tiết kiệm";
  worksheet.getCell(`H${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`H${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  worksheet.getCell(`I${totalRow + 3}`).value = "Sử dụng vượt";
  worksheet.getCell(`I${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`I${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells(`J${totalRow + 3}:N${totalRow + 3}`);
  worksheet.getCell(`J${totalRow + 3}`).value = "Ghi chú";
  worksheet.getCell(`J${totalRow + 3}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 3}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const fuelHeaderRow = totalRow + 4;
  let index = 0;
  for (let d of order.device || [{}]) {
    const rep = (order.shiftReport?.vehicleSummaries || []).find(
      (i) => i?.vehicle?._id.toString() === d._id.toString(),
    );
    const currentRow = fuelHeaderRow + index;
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = d?.code || "";
    worksheet.getCell(`C${currentRow}`).value = rep?.fuelRemain || "";
    worksheet.getCell(`D${currentRow}`).value = rep?.fuelReceived || "";
    worksheet.getCell(`E${currentRow}`).value = rep?.fuelRemainEnd || "";
    worksheet.getCell(`F${currentRow}`).value =
      (rep?.fuelRemain ?? 0) +
      (rep?.fuelReceived ?? 0) -
      (rep?.fuelRemainEnd ?? 0);

    worksheet.getCell(`G${currentRow}`).value = "";

    worksheet.getCell(`H${currentRow}`).value = "";
    worksheet.getCell(`I${currentRow}`).value = "";

    worksheet.mergeCells(`J${currentRow}:N${currentRow}`);
    worksheet.getCell(`J${currentRow}`).value = "";
    index++;
  }
  const fuelEndRow = fuelHeaderRow + index;

  addTableBorders(worksheet, rowHeader1, fuelEndRow, 1, 14);
  const deviceRow = order.device?.length || [];
  worksheet.mergeCells(
    `B${totalRow + 6 + deviceRow}:D${totalRow + 6 + deviceRow}`,
  );
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`B${totalRow + 6 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).value = "✔";
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${totalRow + 8 + deviceRow}`).font = {
    bold: true,
    size: 12,
  };
  timeSignature(
    worksheet,
    totalRow + 10 + deviceRow,
    "B",
    "D",
    order?.startTime,
  );
  worksheet.mergeCells(
    `B${totalRow + 11 + deviceRow}:D${totalRow + 11 + deviceRow}`,
  );
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${totalRow + 11 + deviceRow}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(
    `J${totalRow + 6 + deviceRow}:M${totalRow + 6 + deviceRow}`,
  );
  worksheet.getCell(`J${totalRow + 6 + deviceRow}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`J${totalRow + 6 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 6 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });

      worksheet.mergeCells(
        `K${totalRow + 7 + deviceRow}:L${totalRow + 9 + deviceRow}`,
      );

      // gán ảnh trực tiếp vào range
      worksheet.addImage(
        imageId,
        `K${totalRow + 7 + deviceRow}:L${totalRow + 9 + deviceRow}`,
      );
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.mergeCells(`K${totalRow + 8 + deviceRow}:L${totalRow + 8 + deviceRow}`);
      worksheet.getCell(`K${totalRow + 8 + deviceRow}`).value = "✔";
      worksheet.getCell(`K${totalRow + 8 + deviceRow}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`K${totalRow + 8 + deviceRow}`).font = {
        bold: true,
        size: 12,
      };
    }
  } else {
    worksheet.mergeCells(`K${totalRow + 8 + deviceRow}:L${totalRow + 8 + deviceRow}`);
    worksheet.getCell(`K${totalRow + 8 + deviceRow}`).value = "✔";
    worksheet.getCell(`K${totalRow + 8 + deviceRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`K${totalRow + 8 + deviceRow}`).font = {
      bold: true,
      size: 12,
    };
  }
  timeSignature(
    worksheet,
    totalRow + 10 + deviceRow,
    "K",
    "L",
    order?.createdAt,
  );

  worksheet.mergeCells(
    `J${totalRow + 11 + deviceRow}:M${totalRow + 11 + deviceRow}`,
  );
  worksheet.getCell(`J${totalRow + 11 + deviceRow}`).font = { bold: true };
  worksheet.getCell(`J${totalRow + 11 + deviceRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`J${totalRow + 11 + deviceRow}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 18 }, // Nhận tải
    { key: "C", width: 18 }, // Đổ tải
    { key: "D", width: 14 }, // Loại hàng
    { key: "E", width: 14 }, // Cung độ tạm tính
    { key: "F", width: 14 }, // Chiều cao nâng tải
    { key: "G", width: 14 }, // Số chuyến
    { key: "H", width: 14 }, // Khối lượng
    { key: "I", width: 14 }, // Trọng lượng
    { key: "J", width: 13 }, // Sản lượng
    { key: "K", width: 15 }, // Nhiên liệu
    { key: "L", width: 15 }, // Điểm lương
    { key: "M", width: 15 }, // Điểm lương
    { key: "N", width: 15 }, // Điểm lương
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
}
async function buildDispatcher(order, workbook, sheetName) {
  const worksheet = workbook.addWorksheet(sheetName);

  // Row 1: Company Name
  worksheet.mergeCells("A1:L1");
  const companyNameCell = worksheet.getCell("A1");
  companyNameCell.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  companyNameCell.font = { italic: true, size: 18 };
  companyNameCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 2: Department
  worksheet.mergeCells("A2:L2");
  const departmentCell = worksheet.getCell("A2");
  departmentCell.value = `Đơn vị: ${order.assignedTo?.department?.code || ""}`;
  departmentCell.font = { italic: true, size: 14 };
  departmentCell.alignment = { horizontal: "left", vertical: "middle" };

  // Row 3: LỆNH SẢN XUẤT
  worksheet.mergeCells("A3:L3");
  const header = worksheet.getCell("A3");
  header.value = `LỆNH SẢN XUẤT`;
  header.font = { bold: true, size: 16 };
  header.alignment = { horizontal: "center", vertical: "middle" };
  const rowOffset = 2;

  worksheet.getCell(`B${4 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`B${4 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${4 + rowOffset}`).value =
    order.createdBy?.department?.code || "";

  worksheet.getCell(`E${4 + rowOffset}`).value = "Ngày";
  worksheet.getCell(`E${4 + rowOffset}`).font = { bold: true };
  // Lấy ngày từ order.workingDate và định dạng
  const workingDate = order.workingDate ? new Date(order.workingDate) : null;
  const ngay = workingDate ? workingDate.toLocaleDateString("vi-VN") : "";
  worksheet.getCell(`F${4 + rowOffset}`).value = ngay;

  // 3. Người ra lệnh
  // Dòng 5
  worksheet.getCell(`B${5 + rowOffset}`).value = "Người ra lệnh";
  worksheet.getCell(`B${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${5 + rowOffset}`).value =
    order.createdBy?.fullName || "";

  worksheet.getCell(`E${5 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`E${5 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`F${5 + rowOffset}`).value =
    order.createdBy?.salaryCode || "";

  worksheet.getCell(`G${5 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`G${5 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`H${5 + rowOffset}:L${5 + rowOffset}`);
  worksheet.getCell(`H${5 + rowOffset}`).value =
    order.createdBy?.position?.name || "";

  // 4. Người nhận lệnh
  // Dòng 6
  worksheet.getCell(`B${6 + rowOffset}`).value = "Người nhận lệnh";
  worksheet.getCell(`B${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`C${6 + rowOffset}`).value =
    order.assignedTo?.fullName || "";

  worksheet.getCell(`E${6 + rowOffset}`).value = "Số thẻ";
  worksheet.getCell(`E${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`F${6 + rowOffset}`).value =
    order.assignedTo?.salaryCode || "";

  worksheet.getCell(`G${6 + rowOffset}`).value = "Chức vụ";
  worksheet.getCell(`G${6 + rowOffset}`).font = { bold: true };
  worksheet.mergeCells(`H${6 + rowOffset}:L${6 + rowOffset}`);
  worksheet.getCell(`H${6 + rowOffset}`).value =
    order.assignedTo?.position?.name || "";

  worksheet.getCell(`J${6 + rowOffset}`).value = "Đơn vị";
  worksheet.getCell(`J${6 + rowOffset}`).font = { bold: true };
  worksheet.getCell(`K${6 + rowOffset}`).value =
    order.assignedTo?.department?.code || "";

  //   worksheet.getCell(`B${7 + rowOffset}`).value = "Biện pháp an toàn";
  //   worksheet.getCell(`B${7 + rowOffset}`).font = { bold: true };
  //   // Gộp ô cho nội dung bàn giao ca
  //   worksheet.mergeCells(`C${7 + rowOffset}:L${7 + rowOffset}`);
  //   worksheet.getCell(`C${7 + rowOffset}`).value =
  //     (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");

  let headerCursor = 7 + rowOffset;

  // Dự báo nguy cơ
  worksheet.getCell(`B${headerCursor}`).value = "Dự báo nguy cơ";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:L${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value = order.risk || "";
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Biện pháp an toàn
  worksheet.getCell(`B${headerCursor}`).value = "Biện pháp an toàn";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.mergeCells(`C${headerCursor}:L${headerCursor + 1}`);
  worksheet.getCell(`C${headerCursor}`).value =
    (order?.safetyMeasure || "") + " " + (order?.safetyMeasureSpecific || "");
  worksheet.getCell(`C${headerCursor}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
  };

  headerCursor += 2;

  // Giờ nhận lệnh
  worksheet.getCell(`B${headerCursor}`).value = "Giờ nhận lệnh";
  worksheet.getCell(`B${headerCursor}`).font = { bold: true };
  worksheet.getCell(`C${headerCursor}`).value = order.startTime
    ? new Date(order.startTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  worksheet.getCell(`D${headerCursor}`).value = "Giờ kết thúc";
  worksheet.getCell(`D${headerCursor}`).font = { bold: true };
  worksheet.getCell(`E${headerCursor}`).value = order.endTime
    ? new Date(order.endTime).toLocaleTimeString("vi-VN", { hour12: false })
    : "";

  headerCursor += 2;

  worksheet.mergeCells(`A${headerCursor}:L${headerCursor}`);
  worksheet.getCell(`A${headerCursor}`).value = `I. NỘI DUNG LỆNH`;
  worksheet.getCell(`A${headerCursor}`).font = { bold: true, size: 14 };
  worksheet.getCell(`A${headerCursor}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getRow(headerCursor).height = 30;

  worksheet.mergeCells(`A${headerCursor + 1}:L${headerCursor + 7}`);
  worksheet.getCell(`A${headerCursor + 1}`).value = order.workContent || "";
  worksheet.getCell(`A${headerCursor + 1}`).alignment = {
    vertical: "top",
    wrapText: true,
  };

  addTableBorders(worksheet, headerCursor, headerCursor + 7, 1, 12);

  const signatureRow = headerCursor + 9;
  worksheet.mergeCells(`B${signatureRow}:D${signatureRow}`);
  worksheet.getCell(`B${signatureRow}`).value = "NGƯỜI NHẬN LỆNH";
  worksheet.getCell(`B${signatureRow}`).font = { bold: true };
  worksheet.getCell(`B${signatureRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${signatureRow + 2}`).value = "✔";
  worksheet.getCell(`C${signatureRow + 2}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`C${signatureRow + 2}`).font = { bold: true, size: 12 };
  timeSignature(worksheet, signatureRow + 4, "B", "D", order?.startTime);
  worksheet.mergeCells(`B${signatureRow + 5}:D${signatureRow + 5}`);
  worksheet.getCell(`B${signatureRow + 5}`).font = { bold: true };
  worksheet.getCell(`B${signatureRow + 5}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`B${signatureRow + 5}`).value =
    order.assignedTo?.fullName || "";

  worksheet.mergeCells(`I${signatureRow}:L${signatureRow}`);
  worksheet.getCell(`I${signatureRow}`).value = "NGƯỜI RA LỆNH";
  worksheet.getCell(`I${signatureRow}`).font = { bold: true };
  worksheet.getCell(`I${signatureRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  if (order.createdBy?.signature?.trim()) {
    try {
      // Ký URL ảnh chữ ký trực tiếp (route /uploads/get yêu cầu đăng nhập nên không gọi HTTP vòng qua đó)
      const res = { data: { data: await getSignedDownloadUrl(order.createdBy.signature) } };

      const url = res.data?.data;

      // validate URL
      if (!url || typeof url !== "string") {
        throw new Error("URL không hợp lệ");
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const extension = contentType.split("/")[1] || "png";

      const imageId = workbook.addImage({
        buffer: Buffer.from(response.data),
        extension,
      });

      worksheet.mergeCells(`J${signatureRow + 1}:K${signatureRow + 3}`);

      // gán ảnh trực tiếp vào range
      worksheet.addImage(imageId, `J${signatureRow + 1}:K${signatureRow + 3}`);
    } catch (err) {
      // ❗ KHÔNG throw
      console.log("⚠️ Bỏ qua chữ ký lỗi:", {
        orderId: order._id,
        signature: order.createdBy.signature,
        error: err.message,
      });
      worksheet.mergeCells(`J${signatureRow + 2}:K${signatureRow + 2}`);
      worksheet.getCell(`J${signatureRow + 2}`).value = "✔";
      worksheet.getCell(`J${signatureRow + 2}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(`J${signatureRow + 2}`).font = {
        bold: true,
        size: 12,
      };
    }
  } else {
    worksheet.mergeCells(`J${signatureRow + 2}:K${signatureRow + 2}`);
    worksheet.getCell(`J${signatureRow + 2}`).value = "✔";
    worksheet.getCell(`J${signatureRow + 2}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getCell(`J${signatureRow + 2}`).font = {
      bold: true,
      size: 12,
    };
  }
  timeSignature(worksheet, signatureRow + 4, "J", "K", order?.createdAt);

  worksheet.mergeCells(`I${signatureRow + 5}:L${signatureRow + 5}`);
  worksheet.getCell(`I${signatureRow + 5}`).font = { bold: true };
  worksheet.getCell(`I${signatureRow + 5}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(`I${signatureRow + 5}`).value =
    order.createdBy?.fullName || "";

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

  // 2) Set width cơ sở (Excel sẽ scale để vừa 1 trang)
  worksheet.columns = [
    { key: "A", width: 6 }, // STT
    { key: "B", width: 18 }, // Nhận tải
    { key: "C", width: 18 }, // Đổ tải
    { key: "D", width: 14 }, // Loại hàng
    { key: "E", width: 14 }, // Cung độ tạm tính
    { key: "F", width: 14 }, // Chiều cao nâng tải
    { key: "G", width: 14 }, // Số chuyến
    { key: "H", width: 14 }, // Khối lượng
    { key: "I", width: 14 }, // Trọng lượng
    { key: "J", width: 13 }, // Sản lượng
    { key: "K", width: 12 }, // Nhiên liệu
    { key: "L", width: 12 }, // Điểm lương
  ];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        size: 12, // kích thước chữ
      };
    });
  });
}
//
//báo ca tình trạng xe
router.post(
  "/vehicleShiftReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      query["repairVehicles.0"] = { $exists: true };
      const orders = await Order.find(query)
        .populate({
          path: "shiftReport",
          populate: [
            {
              path: "vehicleSummaries.vehicle",
              select: "code",
            },
          ],
        })
        .populate("repairVehicles.device")
        .populate("repairDepartment", "code")
        .populate("job");
      const filterOrders = orders.filter(
        (r) => r.job?.type === JOB_TYPE.SUA_CHUA_BAO_DUONG,
      );

      const formattedData = filterOrders.flatMap((order, orderIndex) => {
        return order.repairVehicles?.map((d, index) => {
          let report = {};
          if (
            order.shiftReport &&
            order.shiftReport?.vehicleRepair.length > 0
          ) {
            report =
              order.shiftReport.vehicleRepair.find(
                (vr) => vr.device.toString() === d.device?._id.toString(),
              ) || {};
          }

          return {
            _id: order._id + "" + index,
            code: d?.device?.code || "",
            warning: d.note || "",
            result: report.status || "",
            repairDepartment: order.repairDepartment?.code || "",
            note: report.noteRepair || "",
          };
        });
      });
      res.status(200).json({ status: "success", data: formattedData });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
router.post(
  "/vehicleShiftReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department, signature } = req.body;
      const user = req.user;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate({
              path: "shiftReport",
              populate: [
                {
                  path: "vehicleSummaries.vehicle",
                  select: "code",
                },
              ],
            })
            .populate("repairVehicles.device")
            .populate("repairDepartment", "code")
            .populate("job");
          const filterOrders = orders.filter(
            (r) => r.job?.type === JOB_TYPE.SUA_CHUA_BAO_DUONG,
          );

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          worksheet.mergeCells("A1:F1");
          const infoRow = worksheet.getCell("A1");
          infoRow.value = `Đơn vị: ${dep?.code}                  Ca: ${ca.name}                  , ngày:    ${formatDate(d)}                             Tên cán bộ: ${req.user?.fullName}`;
          infoRow.font = { italic: true, size: 14 };
          infoRow.alignment = { horizontal: "left", vertical: "middle" };
          // Tiêu đề bảng
          worksheet.mergeCells("A3:F3");
          const header = worksheet.getCell("A3");
          header.value = "Xe không hoạt động";
          header.font = { bold: true, size: 16 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          const headerRowNumber = 5;
          const headers = [
            "STT",
            "Số xe",
            "Tình trạng hư/ hỏng",
            "Kết quả sửa chữa\n trong ca",
            "Đơn vị sửa chữa",
            "Ghi chú",
          ];

          headers.forEach((text, index) => {
            const cell = worksheet.getRow(headerRowNumber).getCell(index + 1);
            cell.value = text;
            cell.font = { bold: true };
            cell.alignment = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            };
          });

          let index = 1;
          let totalDataRows = 5;
          const formattedData = filterOrders.flatMap((order, orderIndex) => {
            return order.repairVehicles?.map((d, index) => {
              let report = {};
              if (
                order.shiftReport &&
                order.shiftReport?.vehicleRepair.length > 0
              ) {
                report =
                  order.shiftReport.vehicleRepair.find(
                    (vr) => vr.device.toString() === d.device?._id.toString(),
                  ) || {};
              }

              return {
                _id: order._id + "" + index,
                code: d?.device?.code || "",
                warning: d.note || "",
                result: report.status || "",
                repairDepartment: order.repairDepartment?.code || "",
                note: report.noteRepair || "",
              };
            });
          });
          for (const d of formattedData) {
            worksheet.addRow([
              index,
              d?.code || "",
              d.warning || "",
              d.result || "",
              d.repairDepartment || "",
              d.note || "",
            ]);
            index++;
          }
          addTableBorders(worksheet, 5, totalDataRows + index, 1, 6);

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

          worksheet.getColumn(1).width = 6;
          worksheet.getColumn(1).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getColumn(2).width = 20;
          worksheet.getColumn(2).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getColumn(3).width = 40;
          worksheet.getColumn(3).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getColumn(4).width = 20;
          worksheet.getColumn(4).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getColumn(5).width = 20;
          worksheet.getColumn(5).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getColumn(6).width = 40;
          worksheet.getColumn(6).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 3 ? { size: 12 } : {}), // kích thước chữ
              };
            });
          });

          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const contentType = response.headers["content-type"];
            const extension = contentType.split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            // Thêm ảnh vào workbook
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            // Gán ảnh vào vị trí (dùng topleft + extents hoặc range)
            const lastCol = worksheet.columnCount;
            worksheet.addImage(imageId, {
              tl: { col: lastCol - 2, row: index + 7 }, // H30
              ext: { width: 100, height: 30 },
            });
          }
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo tổng hợp ô tô
router.post(
  "/carReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate({
          path: "shiftReport",
          populate: [
            {
              path: "vehicleSummaries.vehicle",
              select: "code",
            },
          ],
        })
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode department",
          populate: "department",
        })
        .populate({
          path: "createdBy",
          select: "fullName",
        })
        .populate({
          path: "device",
          select: "code",
        })
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate({
          path: "createdBy",
          select: "fullName",
        })
        .populate({
          path: "job",
          select: "type",
        });
      const filterOrders = orders.filter(
        (r) => r.job?.type === JOB_TYPE.VAN_HANH_XE,
      );

      let result = [];
      for (const order of filterOrders) {
        const combined = getCombinedUsers(order);

        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code category",
            populate: {
              path: "category",
              select: "name",
            },
          })
          .populate("material", "name acceptedProduct")
          .populate("excavator", "code")
          .populate("toLocation", "name");

        reports = reports.filter((r) =>
          r.device?.category?.name
            ?.toLowerCase()
            .includes("vận tải".toLowerCase()),
        );
        if (!reports.length) continue;
        const mapped = reports.map((r) => ({
          ...r.toObject(),
          workingDate: r.workingDate || order.workingDate,
          shift: r.shift || order.shift,
        }));
        const grouped = await groupCar(mapped);
        result.push({
          _id: order._id,
          device: (order.device || []).map((d) => d?.code) || [],
          assignedTo: combined,
          reports: grouped.map((g) => ({
            excavator: g.excavator || "",
            toLocation: g.toLocation || "",
            materials: g.materials || {},
          })),
          fuelRemain: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.fuelRemain,
          ),
          fuelReceived: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.fuelReceived,
          ),
          fuelRemainEnd: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.fuelRemainEnd,
          ),
          fuelRemainUsed: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) =>
              (i?.fuelRemain || 0) +
              (i?.fuelReceived || 0) -
              (i?.fuelRemainEnd || 0),
          ),
          travelHours: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.travelHours,
          ),
        });
      }

      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/carReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, title, signature, department } =
        req.body;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);
      const user = req.user;
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate({
              path: "shiftReport",
              populate: [
                {
                  path: "vehicleSummaries.vehicle",
                  select: "code",
                },
              ],
            })
            .populate({
              path: "assignedTo",
              select: "fullName salaryCode department",
              populate: "department",
            })
            .populate({
              path: "createdBy",
              select: "fullName",
            })
            .populate({
              path: "device",
              select: "code",
            })
            .populate({
              path: "assistants",
              select: "fullName salaryCode",
            })
            .populate({
              path: "createdBy",
              select: "fullName",
            })
            .populate({
              path: "job",
              select: "type",
            });
          const filterOrders = orders.filter(
            (r) => r.job?.type === JOB_TYPE.VAN_HANH_XE,
          );

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          worksheet.mergeCells(`B1:X1`);
          const infoRow = worksheet.getCell("B1");
          infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          infoRow.font = { italic: true, size: 18 };
          // Tiêu đề bảng
          worksheet.mergeCells(`A3:X3`);
          const header = worksheet.getCell("A3");
          header.value = "BÁO CÁO TỔNG HỢP SỐ LIỆU TRONG CA (Ô TÔ)";
          header.font = { bold: true, size: 16 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          worksheet.getCell("B4").value = "Ngày";
          worksheet.getCell("C4").value = formatDate(d);
          worksheet.getCell("E4").value = "Ca";
          worksheet.getCell("F4").value = ca?.name || "";

          worksheet.getCell("B5").value = "Đơn vị";
          worksheet.getCell("C5").value = dep?.code || "";
          worksheet.getCell("E5").value = "Giờ hệ thống";
          worksheet.getCell("F5").value = new Date().toLocaleTimeString(
            "vi-VN",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );

          worksheet.getCell("B6").value = "Người ra lệnh";
          worksheet.mergeCells(`C6:D6`);
          worksheet.getCell("C6").value = user?.fullName || "";
          worksheet.getCell("E6").value = "Số thẻ";
          worksheet.getCell("F6").value = user?.salaryCode || "";
          worksheet.getCell("G6").value = "Chức vụ";
          worksheet.mergeCells("H6:X6");
          worksheet.getCell("H6").value = user?.position?.name || "";

          // ==== HÀNG 1 ==== (STT, Người nhận lệnh, ... cố định 5-6 cột đầu)
          setMergeCellHeader(worksheet, "A8:A9", "STT");
          setMergeCellHeader(worksheet, "B8:B9", "Người nhận lệnh");
          setMergeCellHeader(worksheet, "C8:C9", "Số thẻ");
          setMergeCellHeader(worksheet, "D8:D9", "Thiết bị vận hành");
          setMergeCellHeader(worksheet, "E8:E9", "Máy xúc");
          setMergeCellHeader(worksheet, "F8:F9", "Điểm đổ tải");
          setMergeCellHeader(worksheet, "G8:G9", "Loại vật liệu");
          setMergeCellHeader(worksheet, "H8:H9", "Cung độ thực hiện (km)");
          setMergeCellHeader(worksheet, "I8:I9", "Chiều cao nâng tải (m)");
          setMergeCellHeader(worksheet, "J8:L8", "Sản lượng");

          // ==== HÀNG 2 ==== ( gio san pham)
          setCellHeader(worksheet, "J9", "Chuyến định mức");
          setCellHeader(worksheet, "K9", "Chuyến thực hiện");
          setCellHeader(worksheet, "L9", "Km");

          // ==== HÀNG 1 ==== (Nhien lieu)
          setMergeCellHeader(worksheet, "M8:S8", "Nhiên liệu/Điện năng");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "M9", "Tồn dầu");
          setCellHeader(worksheet, "N9", "Lĩnh");
          setCellHeader(worksheet, "O9", "Tồn cuối");
          setCellHeader(worksheet, "P9", "Tiêu thụ");
          setCellHeader(worksheet, "Q9", "Định mức");
          setCellHeader(worksheet, "R9", "Tiết kiệm");
          setCellHeader(worksheet, "S9", "Vượt");

          // ==== HÀNG 1 ==== (Su dung thiet bi)
          setMergeCellHeader(worksheet, "T8:V8", "Sử dụng thiết bị (giờ)");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "T9", "Giờ hoạt động");
          setCellHeader(worksheet, "U9", "Giờ ngừng");
          setCellHeader(worksheet, "V9", "Giờ hoạt động lũy kế");

          // ==== HÀNG 1 ====
          setMergeCellHeader(worksheet, "W8:W9", "Bồi dưỡng (đồng)");
          setMergeCellHeader(worksheet, "X8:X9", "Lương tạm tính");

          let currentRow = 10;
          let result = [];
          for (const order of filterOrders) {
            const combined = getCombinedUsers(order);

            let reports = await Report.find({ orderId: order._id })
              .populate({
                path: "device",
                select: "code category",
                populate: {
                  path: "category",
                  select: "name",
                },
              })
              .populate("material", "name acceptedProduct")
              .populate("excavator", "code")
              .populate("toLocation", "name");

            reports = reports.filter((r) =>
              r.device?.category?.name
                ?.toLowerCase()
                .includes("vận tải".toLowerCase()),
            );
            if (!reports.length) continue;
            const mapped = reports.map((r) => ({
              ...r.toObject(),
              workingDate: r.workingDate || order.workingDate,
              shift: r.shift || order.shift,
            }));
            const grouped = await groupCar(mapped);

            result.push({
              _id: order._id,
              device: (order.device || []).map((d) => d?.code) || [],
              assignedTo: combined,
              reports: grouped.map((g) => ({
                excavator: g.excavator || "",
                toLocation: g.toLocation || "",
                materials: g.materials || [],
              })),
              fuelRemain: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.fuelRemain,
              ),
              fuelReceived: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.fuelReceived,
              ),
              fuelRemainEnd: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.fuelRemainEnd,
              ),
              fuelRemainUsed: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) =>
                  (i?.fuelRemain || 0) +
                  (i?.fuelReceived || 0) -
                  (i?.fuelRemainEnd || 0),
              ),
              travelHours: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.travelHours,
              ),
            });
          }

          result.forEach((item, idx) => {
            const reps =
              item.reports && item.reports.length
                ? item.reports
                : [{ excavator: "", toLocation: "", materials: [] }];

            const totalMaterials = reps.reduce(
              (sum, r) => sum + (r.materials?.length || 1),
              0,
            );
            const startRow = currentRow;

            reps.forEach((r, i) => {
              const mats = r.materials?.length
                ? r.materials
                : [
                    {
                      material: {},
                      distances: [],
                      times: [],
                      count: 0,
                      totalDistance: 0,
                    },
                  ];

              mats.forEach((m, mIdx) => {
                const rowStart = currentRow;

                // --- Hàng 1: tổng ---
                let row1 = worksheet.getRow(currentRow);

                if (i === 0 && mIdx === 0) {
                  row1.getCell(1).value = idx + 1; // STT
                  row1.getCell(2).value = (item.assignedTo || [])
                    .map((u) => u?.fullName)
                    .join("\n");
                  row1.getCell(3).value = (item.assignedTo || [])
                    .map((u) => u?.salaryCode)
                    .join("\n");
                  row1.getCell(4).value = (item.device || [])
                    .map((u) => u)
                    .join("\n");
                }

                if (mIdx === 0) {
                  row1.getCell(5).value = r.excavator || "";
                  row1.getCell(6).value = r.toLocation || "";
                }

                // Loại vật liệu
                row1.getCell(7).value = m.material?.name || "";

                // Cung độ tổng
                row1.getCell(8).value = m.totalDistance || 0;

                // Số chuyến tổng
                row1.getCell(11).value = m.count || 0;

                currentRow++;

                // --- Hàng 2: chi tiết cung độ ---
                let row2 = worksheet.getRow(currentRow);
                row2.getCell(8).value = (m.distances || []).join("\n"); // Cung độ theo từng chuyến
                row2.getCell(11).value = (m.times || [])
                  .map((t) =>
                    t ? new Date(t).toLocaleTimeString("vi-VN") : "",
                  )
                  .join("\n");

                // (Các cột nhiên liệu / giờ hoạt động merge xuống 2 dòng)
                if (i === 0 && mIdx === 0) {
                  row1.getCell(13).value = (item.fuelRemain || []).join("\n");
                  row1.getCell(14).value = (item.fuelReceived || []).join("\n");
                  row1.getCell(15).value = (item.fuelRemainEnd || []).join(
                    "\n",
                  );
                  row1.getCell(16).value = (item.fuelRemainUsed || []).join(
                    "\n",
                  );
                  row1.getCell(20).value = (item.travelHours || []).join("\n");
                }

                currentRow++;

                // Merge vật liệu cho 2 dòng
                worksheet.mergeCells(`G${rowStart}:G${currentRow - 1}`);
                worksheet.mergeCells(`L${rowStart}:L${currentRow - 1}`);
                worksheet.mergeCells(`I${rowStart}:I${currentRow - 1}`);
                worksheet.mergeCells(`J${rowStart}:J${currentRow - 1}`);

                // Merge Máy xúc, Điểm đổ tải cho 2 dòng vật liệu
                if (mIdx === 0) {
                  worksheet.mergeCells(
                    `E${rowStart}:E${rowStart + mats.length * 2 - 1}`,
                  );
                  worksheet.mergeCells(
                    `F${rowStart}:F${rowStart + mats.length * 2 - 1}`,
                  );
                }

                // Merge nhiên liệu, giờ hoạt động theo block
                if (i === 0 && mIdx === 0) {
                  [
                    "M",
                    "N",
                    "O",
                    "P",
                    "Q",
                    "R",
                    "S",
                    "T",
                    "U",
                    "V",
                    "W",
                    "X",
                  ].forEach((col) => {
                    worksheet.mergeCells(
                      `${col}${rowStart}:${col}${rowStart + totalMaterials * 2 - 1}`,
                    );
                  });
                }

                [row1, row2].forEach((row) => {
                  row.eachCell((cell) => {
                    cell.alignment = {
                      horizontal: "center",
                      vertical: "middle",
                      wrapText: true,
                    };
                  });
                });
                row1.getCell(2).alignment = {
                  horizontal: "left",
                  vertical: "top",
                  wrapText: true,
                };
                row1.getCell(3).alignment = {
                  horizontal: "left",
                  vertical: "top",
                  wrapText: true,
                };
              });
            });

            // Merge các cột A–D
            if (reps.length > 1) {
              ["A", "B", "C", "D"].forEach((col) => {
                worksheet.mergeCells(
                  `${col}${startRow}:${col}${currentRow - 1}`,
                );
              });
            }

            const numUsers = item.assignedTo?.length || 1;
            worksheet.getRow(startRow).height = numUsers * 15;
          });

          addTableBorders(worksheet, 8, currentRow, 1, 24);

          worksheet.mergeCells(`O${currentRow + 1}:R${currentRow + 1}`);
          worksheet.getCell(`O${currentRow + 1}`).value =
            "Cán bộ CT kiểm tra trong ca";
          worksheet.getCell(`O${currentRow + 1}`).font = { bold: true };
          worksheet.getCell(`O${currentRow + 1}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.mergeCells(`O${currentRow + 2}:R${currentRow + 2}`);
          worksheet.getCell(`O${currentRow + 2}`).value =
            "( Ký, ghi rõ họ tên)";
          worksheet.getCell(`O${currentRow + 2}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const extension = response.headers["content-type"].split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            worksheet.mergeCells(`P${currentRow + 4}:Q${currentRow + 7}`);

            // gán ảnh trực tiếp vào range
            worksheet.addImage(
              imageId,
              `P${currentRow + 4}:Q${currentRow + 7}`,
            );
          }

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

          worksheet.getColumn(1).width = 6;
          // worksheet.getColumn(1).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(2).width = 25;
          // worksheet.getColumn(2).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(3).width = 10;
          // worksheet.getColumn(3).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(4).width = 15;
          // worksheet.getColumn(4).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(5).width = 20;
          worksheet.getColumn(6).width = 15;
          worksheet.getColumn(7).width = 15;
          worksheet.getColumn(8).width = 15;
          worksheet.getColumn(9).width = 15;
          worksheet.getColumn(10).width = 15;
          worksheet.getColumn(11).width = 15;
          worksheet.getColumn(12).width = 15;
          worksheet.getColumn(13).width = 15;
          worksheet.getColumn(14).width = 15;
          worksheet.getColumn(15).width = 15;
          worksheet.getColumn(16).width = 15;
          worksheet.getColumn(17).width = 15;
          worksheet.getColumn(18).width = 15;
          worksheet.getColumn(19).width = 15;
          worksheet.getColumn(20).width = 15;
          worksheet.getColumn(21).width = 15;
          worksheet.getColumn(22).width = 15;
          worksheet.getColumn(23).width = 15;

          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 3 ? { size: 12 } : {}), // kích thước chữ
              };
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo tổng hợp máy xúc
router.post(
  "/excavatorReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate({
          path: "shiftReport",
          populate: [
            {
              path: "vehicleSummaries.vehicle",
              select: "code",
            },
          ],
        })
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode department",
          populate: {
            path: "department",
            select: "name",
          },
        })
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate("createdBy", "fullName salaryCode")
        .populate({
          path: "device",
          select: "code category",
          populate: [{ path: "category", select: "name" }],
        })
        .populate({
          path: "job",
          select: "type",
        });
      const filteredOrders = orders.filter(
        (order) =>
          order.device?.some((d) =>
            d.category?.name?.toLowerCase().includes("máy xúc"),
          ) && order.job?.type === JOB_TYPE.VAN_HANH_XUC,
      );

      let result = [];
      for (const order of filteredOrders) {
        const combined = getCombinedUsers(order);

        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code material category",
            populate: {
              path: "category",
              select: "name",
            },
          })
          .populate("material", "name density acceptedProduct");
        if (!reports.length) continue;

        const grouped = await groupExcavator(reports, order.workingDate);

        result.push({
          _id: order._id,
          assignedTo: combined,
          excavator: (order?.device || []).map((i) => i?.code),
          reports: grouped.map((g) => ({
            code: g.device?.code || "",
            materials: g.materials || [],
            totalCubicMeter: g.totalCubicMeter || 0,
            totalTon: g.totalTon || 0,
          })),
          fuelRemain: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.fuelRemain,
          ),
          fuelReceived: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.fuelReceived,
          ),
          fuelRemainEnd: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.fuelRemainEnd,
          ),
          fuelRemainUsed: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) =>
              (i?.fuelRemain || 0) +
              (i?.fuelReceived || 0) -
              (i?.fuelRemainEnd || 0),
          ),
          travelHours: (order?.shiftReport?.vehicleSummaries || []).map(
            (i) => i?.travelHours,
          ),
        });
      }

      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
router.post(
  "/excavatorReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, title, signature, department } =
        req.body;
      const user = req.user;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate({
              path: "shiftReport",
              populate: [
                {
                  path: "vehicleSummaries.vehicle",
                  select: "code",
                },
              ],
            })
            .populate({
              path: "assignedTo",
              select: "fullName salaryCode department",
              populate: {
                path: "department",
                select: "name",
              },
            })
            .populate({
              path: "assistants",
              select: "fullName salaryCode",
            })
            .populate("createdBy", "fullName salaryCode")
            .populate({
              path: "device",
              select: "code category",
              populate: [{ path: "category", select: "name" }],
            })
            .populate({
              path: "job",
              select: "type",
            });
          const filteredOrders = orders.filter(
            (order) =>
              order.device?.some((d) =>
                d.category?.name?.toLowerCase().includes("máy xúc"),
              ) && order.job?.type === JOB_TYPE.VAN_HANH_XUC,
          );

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          worksheet.mergeCells(`B1:V1`);
          const infoRow = worksheet.getCell("B1");
          infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          infoRow.font = { italic: true, size: 18 };
          // Tiêu đề bảng
          worksheet.mergeCells(`A3:V3`);
          const header = worksheet.getCell("A3");
          header.value = "BÁO CÁO TỔNG HỢP SỐ LIỆU TRONG CA (MÁY xúc)";
          header.font = { bold: true, size: 16 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          worksheet.getCell("B4").value = "Ngày";
          worksheet.getCell("C4").value = formatDate(d);
          worksheet.getCell("E4").value = "Ca";
          worksheet.getCell("F4").value = ca?.name || "";

          worksheet.getCell("B5").value = "Đơn vị";
          worksheet.getCell("C5").value = dep?.code || "";
          worksheet.getCell("E5").value = "Giờ hệ thống";
          worksheet.getCell("F5").value = new Date().toLocaleTimeString(
            "vi-VN",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );

          worksheet.getCell("B6").value = "Người ra lệnh";
          worksheet.mergeCells(`C6:D6`);
          worksheet.getCell("C6").value = user?.fullName || "";
          worksheet.getCell("E6").value = "Số thẻ";
          worksheet.getCell("F6").value = user?.salaryCode || "";
          worksheet.getCell("G6").value = "Chức vụ";
          worksheet.mergeCells("H6:V6");
          worksheet.getCell("H6").value = user?.position?.name || "";

          // ==== HÀNG 1 ==== (STT, Người nhận lệnh, ... cố định 5-6 cột đầu)
          setMergeCellHeader(worksheet, "A8:A9", "STT");
          setMergeCellHeader(worksheet, "B8:B9", "Người nhận lệnh");
          setMergeCellHeader(worksheet, "C8:C9", "Số thẻ");
          setMergeCellHeader(worksheet, "D8:D9", "Máy xúc");
          setMergeCellHeader(worksheet, "E8:E9", "Phương tiện");
          setMergeCellHeader(worksheet, "F8:F9", "Loại vật liệu");
          setMergeCellHeader(worksheet, "G8:J8", "Sản lượng");

          // ==== HÀNG 2 ==== ( gio san pham)
          setCellHeader(worksheet, "G9", "Chuyến định mức");
          setCellHeader(worksheet, "H9", "Chuyến thực hiện");
          setCellHeader(worksheet, "I9", "Tấn");
          setCellHeader(worksheet, "J9", "m3");

          // ==== HÀNG 1 ==== (Nhien lieu)
          setMergeCellHeader(worksheet, "K8:Q8", "Nhiên liệu/Điện năng");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "K9", "Tồn dầu");
          setCellHeader(worksheet, "L9", "Lĩnh");
          setCellHeader(worksheet, "M9", "Tồn cuối");
          setCellHeader(worksheet, "N9", "Tiêu thụ");
          setCellHeader(worksheet, "O9", "Định mức");
          setCellHeader(worksheet, "P9", "Tiết kiệm");
          setCellHeader(worksheet, "Q9", "Vượt");

          // ==== HÀNG 1 ==== (Su dung thiet bi)
          setMergeCellHeader(worksheet, "R8:T8", "Sử dụng thiết bị (giờ)");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "R9", "Giờ hoạt động");
          setCellHeader(worksheet, "S9", "Giờ ngừng");
          setCellHeader(worksheet, "T9", "Giờ hoạt động lũy kế");

          // ==== HÀNG 1 ====
          setMergeCellHeader(worksheet, "U8:U9", "Bồi dưỡng (đồng)");
          setMergeCellHeader(worksheet, "V8:V9", "Lương tạm tính");

          let result = [];
          for (const order of filteredOrders) {
            const combined = getCombinedUsers(order);

            let reports = await Report.find({ orderId: order._id })
              .populate({
                path: "device",
                select: "code material category",
                populate: {
                  path: "category",
                  select: "name",
                },
              })
              .populate("material", "name acceptedProduct");
            if (!reports.length) continue;

            const grouped = await groupExcavator(reports, order.workingDate);

            result.push({
              _id: order._id,
              assignedTo: combined,
              excavator: (order?.device || []).map((i) => i?.code),
              reports: grouped.map((g) => ({
                code: g.device?.code || "",
                materials: g.materials || [],
                totalCubicMeter: g.totalCubicMeter || 0,
                totalTon: g.totalTon || 0,
              })),
              fuelRemain: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.fuelRemain,
              ),
              fuelReceived: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.fuelReceived,
              ),
              fuelRemainEnd: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.fuelRemainEnd,
              ),
              fuelRemainUsed: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) =>
                  (i?.fuelRemain || 0) +
                  (i?.fuelReceived || 0) -
                  (i?.fuelRemainEnd || 0),
              ),
              travelHours: (order?.shiftReport?.vehicleSummaries || []).map(
                (i) => i?.travelHours,
              ),
            });
          }

          let currentRow = 10;

          result.forEach((item, idx) => {
            const reports =
              item.reports && item.reports.length
                ? item.reports
                : [{ code: "", materials: [{}] }];

            // tổng số dòng của người nhận lệnh = tổng số vật liệu trong tất cả reports
            const spanItem = reports.reduce(
              (sum, r) => sum + (r.materials?.length || 1),
              0,
            );
            const startRowItem = currentRow;

            reports.forEach((r) => {
              const mats = r.materials?.length ? r.materials : [{}];
              const spanReport = mats.length;
              const startRowReport = currentRow;

              mats.forEach((m) => {
                const row = worksheet.getRow(currentRow);

                // chỉ gán STT / Người nhận lệnh / Số thẻ 1 lần (ở hàng đầu tiên của item)
                if (currentRow === startRowItem) {
                  row.getCell(1).value = idx + 1;
                  row.getCell(2).value = (item.assignedTo || [])
                    .map((u) => u?.fullName)
                    .join("\n");
                  row.getCell(3).value = (item.assignedTo || [])
                    .map((u) => u?.salaryCode)
                    .join("\n");
                  row.getCell(4).value = (item.excavator || [])
                    .map((u) => u)
                    .join("\n");
                }

                // máy gạt (report code) – chỉ gán ở hàng đầu của report
                if (currentRow === startRowReport) {
                  row.getCell(5).value = r.code || "";
                }

                // vật liệu
                row.getCell(6).value = m?.material?.name || "";
                row.getCell(8).value = m?.quantity || "";
                row.getCell(9).value = m?.ton || "";
                row.getCell(10).value = m?.cubicMeter || "";

                if (currentRow === startRowReport) {
                  row.getCell(11).value = (item.fuelRemain || [])
                    .map((u) => u)
                    .join("\n");
                  row.getCell(12).value = (item.fuelReceived || [])
                    .map((u) => u)
                    .join("\n");
                  row.getCell(13).value = (item.fuelRemainEnd || [])
                    .map((u) => u)
                    .join("\n");
                  row.getCell(14).value = (item.fuelRemainUsed || [])
                    .map((u) => u)
                    .join("\n");
                  row.getCell(15).value = "";
                  row.getCell(16).value = "";
                  row.getCell(17).value = "";
                  row.getCell(18).value = (item?.travelHours || [])
                    .map((u) => u)
                    .join("\n");
                  row.getCell(19).value = "";
                  row.getCell(20).value = "";
                  row.getCell(21).value = "";
                  row.getCell(22).value = "";
                }

                // căn chỉnh
                row.eachCell((cell) => {
                  cell.alignment = {
                    horizontal: "center",
                    vertical: "middle",
                    wrapText: true,
                  };
                });
                row.getCell(2).alignment = {
                  horizontal: "left",
                  vertical: "top",
                  wrapText: true,
                };
                row.getCell(3).alignment = {
                  horizontal: "center",
                  vertical: "top",
                  wrapText: true,
                };

                currentRow++;
              });

              const reportCols = [
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
                "Q",
                "R",
                "S",
                "T",
                "U",
                "V",
              ];
              // merge cột D (máy gạt) cho số dòng vật liệu của report
              if (spanReport > 1) {
                worksheet.mergeCells(`E${startRowReport}:E${currentRow - 1}`);
                reportCols.forEach((col) => {
                  worksheet.mergeCells(
                    `${col}${startRowReport}:${col}${currentRow - 1}`,
                  );
                });
              }
            });

            // merge A–C (STT, Người nhận lệnh, Số thẻ) cho toàn bộ item
            if (spanItem > 1) {
              ["A", "B", "C", "D"].forEach((col) => {
                worksheet.mergeCells(
                  `${col}${startRowItem}:${col}${currentRow - 1}`,
                );
              });
            }
            const numUsers = item.assignedTo?.length || 1;
            const numReports = reports.length;
            const maxLines = Math.max(numUsers, numReports);
            worksheet.getRow(startRowItem).height = maxLines * 15;
          });

          worksheet.getCell(`B${currentRow}`).value = "Tổng";
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(`I${currentRow}`).value = result
            .flatMap((d) => d.reports)
            .reduce((sum, r) => sum + (r.totalTon || 0), 0);
          worksheet.getCell(`I${currentRow}`).font = { bold: true };
          worksheet.getCell(`I${currentRow}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(`J${currentRow}`).value = result
            .flatMap((d) => d.reports)
            .reduce((sum, r) => sum + (r.totalCubicMeter || 0), 0);
          worksheet.getCell(`J${currentRow}`).font = { bold: true };
          worksheet.getCell(`J${currentRow}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };

          addTableBorders(worksheet, 8, currentRow, 1, 22);

          worksheet.mergeCells(`O${currentRow + 1}:R${currentRow + 1}`);
          worksheet.getCell(`O${currentRow + 1}`).value =
            "Cán bộ CT kiểm tra trong ca";
          worksheet.getCell(`O${currentRow + 1}`).font = { bold: true };
          worksheet.getCell(`O${currentRow + 1}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.mergeCells(`O${currentRow + 2}:R${currentRow + 2}`);
          worksheet.getCell(`O${currentRow + 2}`).value =
            "( Ký, ghi rõ họ tên)";
          worksheet.getCell(`O${currentRow + 2}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const extension = response.headers["content-type"].split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            worksheet.mergeCells(`P${currentRow + 4}:Q${currentRow + 7}`);

            // gán ảnh trực tiếp vào range
            worksheet.addImage(
              imageId,
              `P${currentRow + 4}:Q${currentRow + 7}`,
            );
          }

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

          worksheet.getColumn(1).width = 6;
          // worksheet.getColumn(1).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(2).width = 25;
          // worksheet.getColumn(2).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(3).width = 10;
          // worksheet.getColumn(3).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(4).width = 15;
          // worksheet.getColumn(4).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(5).width = 20;
          worksheet.getColumn(6).width = 15;
          worksheet.getColumn(7).width = 15;
          worksheet.getColumn(8).width = 15;
          worksheet.getColumn(9).width = 15;
          worksheet.getColumn(10).width = 15;
          worksheet.getColumn(11).width = 15;
          worksheet.getColumn(12).width = 15;
          worksheet.getColumn(13).width = 15;
          worksheet.getColumn(14).width = 15;
          worksheet.getColumn(15).width = 15;
          worksheet.getColumn(16).width = 15;
          worksheet.getColumn(17).width = 15;
          worksheet.getColumn(18).width = 15;
          worksheet.getColumn(19).width = 15;
          worksheet.getColumn(20).width = 15;
          worksheet.getColumn(21).width = 15;

          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 3 ? { size: 12 } : {}), // kích thước chữ
              };
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
// báo tổng hợp máy gạt
router.post(
  "/dozerReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate({
          path: "shiftReport",
          populate: [
            {
              path: "vehicleSummaries.vehicle",
              select: "code",
            },
          ],
        })
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode department",
          populate: {
            path: "department",
            select: "name",
          },
        })
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate("createdBy", "fullName salaryCode")
        .populate({
          path: "device",
          select: "code category",
          populate: [{ path: "category", select: "name" }],
        })
        .populate({
          path: "job",
          select: "type",
        });
      const filteredOrders = orders.filter(
        (order) =>
          order.device?.some((d) =>
            d.category?.name?.toLowerCase().includes("máy gạt"),
          ) && order.job?.type === JOB_TYPE.VAN_HANH_GAT,
      );

      let result = [];
      for (const order of filteredOrders) {
        const combined = getCombinedUsers(order);

        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code category",
            populate: {
              path: "category",
              select: "name",
            },
          })
          .populate("material", "name acceptedProduct");
        if (!reports.length) continue;

        const grouped = groupDozer(reports);

        result.push({
          _id: order._id,
          assignedTo: combined,
          reports: grouped.map((g) => ({
            code: g.device?.code || "",
            materials: g.materials || [],
            fuelRemain:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.fuelRemain || "",
            fuelReceived:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.fuelReceived || "",
            fuelRemainEnd:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.fuelRemainEnd || "",
            travelHours:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.travelHours || "",
          })),
        });
      }

      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
router.post(
  "/dozerReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, title, signature, department } =
        req.body;
      const user = req.user;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate({
              path: "shiftReport",
              populate: [
                {
                  path: "vehicleSummaries.vehicle",
                  select: "code",
                },
              ],
            })
            .populate({
              path: "assignedTo",
              select: "fullName salaryCode department",
              populate: {
                path: "department",
                select: "name",
              },
            })
            .populate({
              path: "assistants",
              select: "fullName salaryCode",
            })
            .populate("createdBy", "fullName salaryCode")
            .populate({
              path: "device",
              select: "code category",
              populate: [{ path: "category", select: "name" }],
            })
            .populate({
              path: "job",
              select: "type",
            });
          const filteredOrders = orders.filter(
            (order) =>
              order.device?.some((d) =>
                d.category?.name?.toLowerCase().includes("máy gạt"),
              ) && order.job?.type === JOB_TYPE.VAN_HANH_GAT,
          );

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          worksheet.mergeCells(`B1:S1`);
          const infoRow = worksheet.getCell("B1");
          infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          infoRow.font = { italic: true, size: 18 };
          // Tiêu đề bảng
          worksheet.mergeCells(`A3:S3`);
          const header = worksheet.getCell("A3");
          header.value = "BÁO CÁO TỔNG HỢP SỐ LIỆU TRONG CA (MÁY GẠT)";
          header.font = { bold: true, size: 16 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          worksheet.getCell("B4").value = "Ngày";
          worksheet.getCell("C4").value = formatDate(d);
          worksheet.getCell("E4").value = "Ca";
          worksheet.getCell("F4").value = ca?.name || "";

          worksheet.getCell("B5").value = "Đơn vị";
          worksheet.getCell("C5").value = dep?.code || "";
          worksheet.getCell("E5").value = "Giờ hệ thống";
          worksheet.getCell("F5").value = new Date().toLocaleTimeString(
            "vi-VN",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );

          worksheet.getCell("B6").value = "Người ra lệnh";
          worksheet.mergeCells(`C6:D6`);
          worksheet.getCell("C6").value = user?.fullName || "";
          worksheet.getCell("E6").value = "Số thẻ";
          worksheet.getCell("F6").value = user?.salaryCode || "";
          worksheet.getCell("G6").value = "Chức vụ";
          worksheet.mergeCells("H6:S6");
          worksheet.getCell("H6").value = user?.position?.name || "";

          // ==== HÀNG 1 ==== (STT, Người nhận lệnh, ... cố định 5-6 cột đầu)
          setMergeCellHeader(worksheet, "A8:A9", "STT");
          setMergeCellHeader(worksheet, "B8:B9", "Người nhận lệnh");
          setMergeCellHeader(worksheet, "C8:C9", "Số thẻ");
          setMergeCellHeader(worksheet, "D8:D9", "Máy gạt");
          setMergeCellHeader(worksheet, "E8:E9", "Loại vật liệu");
          setMergeCellHeader(worksheet, "F8:G8", "Giờ sản phẩm (phút)");

          // ==== HÀNG 2 ==== ( gio san pham)
          setCellHeader(worksheet, "F9", "Định mức");
          setCellHeader(worksheet, "G9", "Thực hiện");

          // ==== HÀNG 1 ==== (Nhien lieu)
          setMergeCellHeader(worksheet, "H8:N8", "Nhiên liệu/Điện năng");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "H9", "Tồn dầu");
          setCellHeader(worksheet, "I9", "Lĩnh");
          setCellHeader(worksheet, "J9", "Tồn cuối");
          setCellHeader(worksheet, "K9", "Tiêu thụ");
          setCellHeader(worksheet, "L9", "Định mức");
          setCellHeader(worksheet, "M9", "Tiết kiệm");
          setCellHeader(worksheet, "N9", "Vượt");

          // ==== HÀNG 1 ==== (Su dung thiet bi)
          setMergeCellHeader(worksheet, "O8:Q8", "Sử dụng thiết bị (giờ)");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "O9", "Giờ hoạt động");
          setCellHeader(worksheet, "P9", "Giờ ngừng");
          setCellHeader(worksheet, "Q9", "Giờ hoạt động lũy kế");

          // ==== HÀNG 1 ====
          setMergeCellHeader(worksheet, "R8:R9", "Bồi dưỡng (đồng)");
          setMergeCellHeader(worksheet, "S8:S9", "Lương tạm tính");

          let result = [];
          for (const order of filteredOrders) {
            const combined = getCombinedUsers(order);

            let reports = await Report.find({ orderId: order._id })
              .populate({
                path: "device",
                select: "code category",
                populate: {
                  path: "category",
                  select: "name",
                },
              })
              .populate("material", "name acceptedProduct");
            if (!reports.length) continue;

            const grouped = groupDozer(reports);

            result.push({
              _id: order._id,
              assignedTo: combined,
              reports: grouped.map((g) => ({
                code: g.device?.code || "",
                materials: g.materials || [],
                fuelRemain:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.fuelRemain || "",
                fuelReceived:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.fuelReceived || "",
                fuelRemainEnd:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.fuelRemainEnd || "",
                travelHours:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.travelHours || "",
              })),
            });
          }

          let currentRow = 10;

          result.forEach((item, idx) => {
            const reports =
              item.reports && item.reports.length
                ? item.reports
                : [{ code: "", materials: [{}] }];

            // tổng số dòng của người nhận lệnh = tổng số vật liệu trong tất cả reports
            const spanItem = reports.reduce(
              (sum, r) => sum + (r.materials?.length || 1),
              0,
            );
            const startRowItem = currentRow;

            reports.forEach((r) => {
              const mats = r.materials?.length ? r.materials : [{}];
              const spanReport = mats.length;
              const startRowReport = currentRow;

              mats.forEach((m) => {
                const row = worksheet.getRow(currentRow);

                // chỉ gán STT / Người nhận lệnh / Số thẻ 1 lần (ở hàng đầu tiên của item)
                if (currentRow === startRowItem) {
                  row.getCell(1).value = idx + 1;
                  row.getCell(2).value = (item.assignedTo || [])
                    .map((u) => u?.fullName)
                    .join("\n");
                  row.getCell(3).value = (item.assignedTo || [])
                    .map((u) => u?.salaryCode)
                    .join("\n");
                }

                // máy gạt (report code) – chỉ gán ở hàng đầu của report
                if (currentRow === startRowReport) {
                  row.getCell(4).value = r.code || "";
                }

                // vật liệu
                row.getCell(5).value = m?.material?.name || "";
                row.getCell(7).value = m?.workingMinutes || "";

                if (currentRow === startRowReport) {
                  row.getCell(8).value = r.fuelRemain || "";
                  row.getCell(9).value = r.fuelReceived || "";
                  row.getCell(10).value = r.fuelRemainEnd || "";
                  row.getCell(11).value =
                    (r.fuelRemain || 0) +
                      (r.fuelReceived || 0) -
                      (r.fuelRemainEnd || 0) || "";
                  row.getCell(12).value = "";
                  row.getCell(13).value = "";
                  row.getCell(14).value = "";
                  row.getCell(15).value = r?.travelHours || "";
                  row.getCell(16).value = "";
                  row.getCell(17).value = "";
                  row.getCell(18).value = "";
                  row.getCell(19).value = "";
                }

                // căn chỉnh
                row.eachCell((cell) => {
                  cell.alignment = {
                    horizontal: "center",
                    vertical: "middle",
                    wrapText: true,
                  };
                });
                row.getCell(2).alignment = {
                  horizontal: "left",
                  vertical: "top",
                  wrapText: true,
                };
                row.getCell(3).alignment = {
                  horizontal: "center",
                  vertical: "top",
                  wrapText: true,
                };

                currentRow++;
              });

              const reportCols = [
                "H",
                "I",
                "J",
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
                "Q",
                "R",
                "S",
              ];
              // merge cột D (máy gạt) cho số dòng vật liệu của report
              if (spanReport > 1) {
                worksheet.mergeCells(`D${startRowReport}:D${currentRow - 1}`);
                reportCols.forEach((col) => {
                  worksheet.mergeCells(
                    `${col}${startRowReport}:${col}${currentRow - 1}`,
                  );
                });
              }
            });

            // merge A–C (STT, Người nhận lệnh, Số thẻ) cho toàn bộ item
            if (spanItem > 1) {
              ["A", "B", "C"].forEach((col) => {
                worksheet.mergeCells(
                  `${col}${startRowItem}:${col}${currentRow - 1}`,
                );
              });
            }
            const numUsers = item.assignedTo?.length || 1;
            const numReports = reports.length;
            const maxLines = Math.max(numUsers, numReports);
            worksheet.getRow(startRowItem).height = maxLines * 15;
          });

          addTableBorders(worksheet, 8, currentRow, 1, 19);

          worksheet.mergeCells(`O${currentRow + 1}:R${currentRow + 1}`);
          worksheet.getCell(`O${currentRow + 1}`).value =
            "Cán bộ CT kiểm tra trong ca";
          worksheet.getCell(`O${currentRow + 1}`).font = { bold: true };
          worksheet.getCell(`O${currentRow + 1}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.mergeCells(`O${currentRow + 2}:R${currentRow + 2}`);
          worksheet.getCell(`O${currentRow + 2}`).value =
            "( Ký, ghi rõ họ tên)";
          worksheet.getCell(`O${currentRow + 2}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const extension = response.headers["content-type"].split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            worksheet.mergeCells(`P${currentRow + 4}:Q${currentRow + 7}`);

            // gán ảnh trực tiếp vào range
            worksheet.addImage(
              imageId,
              `P${currentRow + 4}:Q${currentRow + 7}`,
            );
          }

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

          worksheet.getColumn(1).width = 6;
          // worksheet.getColumn(1).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(2).width = 25;
          // worksheet.getColumn(2).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(3).width = 10;
          // worksheet.getColumn(3).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(4).width = 15;
          // worksheet.getColumn(4).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(5).width = 20;
          worksheet.getColumn(6).width = 15;
          worksheet.getColumn(7).width = 15;
          worksheet.getColumn(8).width = 15;
          worksheet.getColumn(9).width = 15;
          worksheet.getColumn(10).width = 15;
          worksheet.getColumn(11).width = 15;
          worksheet.getColumn(12).width = 15;
          worksheet.getColumn(13).width = 15;
          worksheet.getColumn(14).width = 15;
          worksheet.getColumn(15).width = 15;
          worksheet.getColumn(16).width = 15;
          worksheet.getColumn(17).width = 15;
          worksheet.getColumn(18).width = 15;
          worksheet.getColumn(19).width = 15;

          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 3 ? { size: 12 } : {}), // kích thước chữ
              };
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo tổng hợp máy khoan
router.post(
  "/drillReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate({
          path: "shiftReport",
          populate: [
            {
              path: "vehicleSummaries.vehicle",
              select: "code",
            },
          ],
        })
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode department",
          populate: {
            path: "department",
            select: "name",
          },
        })
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate("createdBy", "fullName salaryCode")
        .populate({
          path: "device",
          select: "code category",
          populate: [{ path: "category", select: "name" }],
        })
        .populate({
          path: "job",
          select: "type",
        });
      const filteredOrders = orders.filter(
        (order) =>
          order.device?.some((d) =>
            d.category?.name?.toLowerCase().includes("máy khoan"),
          ) && order.job?.type === JOB_TYPE.VAN_HANH_KHOAN,
      );

      let result = [];
      for (const order of filteredOrders) {
        const combined = getCombinedUsers(order);

        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code category",
            populate: {
              path: "category",
              select: "name",
            },
          })
          .populate("material", "name acceptedProduct");
        if (!reports.length) continue;

        const grouped = groupDrill(reports);

        result.push({
          _id: order._id,
          assignedTo: combined,
          reports: grouped.map((g) => ({
            code: g.device?.code || "",
            materials: g.materials || [],
            fuelRemain:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.fuelRemain || "",
            fuelReceived:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.fuelReceived || "",
            fuelRemainEnd:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.fuelRemainEnd || "",
            travelHours:
              order?.shiftReport?.vehicleSummaries.find(
                (i) => i.vehicle?._id.toString() === g.device?._id.toString(),
              )?.travelHours || "",
          })),
        });
      }

      res.status(200).send({ status: "success", data: result });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
router.post(
  "/drillReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, title, signature, department } =
        req.body;
      const user = req.user;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate({
              path: "shiftReport",
              populate: [
                {
                  path: "vehicleSummaries.vehicle",
                  select: "code",
                },
              ],
            })
            .populate({
              path: "assignedTo",
              select: "fullName salaryCode department",
              populate: {
                path: "department",
                select: "name",
              },
            })
            .populate({
              path: "assistants",
              select: "fullName salaryCode",
            })
            .populate("createdBy", "fullName salaryCode")
            .populate({
              path: "device",
              select: "code category",
              populate: [{ path: "category", select: "name" }],
            })
            .populate({
              path: "job",
              select: "type",
            });
          const filteredOrders = orders.filter(
            (order) =>
              order.device?.some((d) =>
                d.category?.name?.toLowerCase().includes("máy khoan"),
              ) && order.job?.type === JOB_TYPE.VAN_HANH_KHOAN,
          );

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          worksheet.mergeCells(`B1:S1`);
          const infoRow = worksheet.getCell("B1");
          infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          infoRow.font = { italic: true, size: 18 };
          // Tiêu đề bảng
          worksheet.mergeCells(`A3:S3`);
          const header = worksheet.getCell("A3");
          header.value = "BÁO CÁO TỔNG HỢP SỐ LIỆU TRONG CA (MÁY KHOAN)";
          header.font = { bold: true, size: 16 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          worksheet.getCell("B4").value = "Ngày";
          worksheet.getCell("C4").value = formatDate(d);
          worksheet.getCell("E4").value = "Ca";
          worksheet.getCell("F4").value = ca?.name || "";

          worksheet.getCell("B5").value = "Đơn vị";
          worksheet.getCell("C5").value = dep?.code || "";
          worksheet.getCell("E5").value = "Giờ hệ thống";
          worksheet.getCell("F5").value = new Date().toLocaleTimeString(
            "vi-VN",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );

          worksheet.getCell("B6").value = "Người ra lệnh";
          worksheet.mergeCells(`C6:D6`);
          worksheet.getCell("C6").value = user?.fullName || "";
          worksheet.getCell("E6").value = "Số thẻ";
          worksheet.getCell("F6").value = user?.salaryCode || "";
          worksheet.getCell("G6").value = "Chức vụ";
          worksheet.mergeCells("H6:S6");
          worksheet.getCell("H6").value = user?.position?.name || "";

          // ==== HÀNG 1 ==== (STT, Người nhận lệnh, ... cố định 5-6 cột đầu)
          setMergeCellHeader(worksheet, "A8:A9", "STT");
          setMergeCellHeader(worksheet, "B8:B9", "Người nhận lệnh");
          setMergeCellHeader(worksheet, "C8:C9", "Số thẻ");
          setMergeCellHeader(worksheet, "D8:D9", "Máy KHOAN");
          setMergeCellHeader(worksheet, "E8:E9", "Loại vật liệu");
          setMergeCellHeader(worksheet, "F8:G8", "Mét khoan sâu (mét)");

          // ==== HÀNG 2 ==== ( gio san pham)
          setCellHeader(worksheet, "F9", "Định mức");
          setCellHeader(worksheet, "G9", "Thực hiện");

          setMergeCellHeader(worksheet, "H8:H9", "Độ cứng");

          // ==== HÀNG 1 ==== (Nhien lieu)
          setMergeCellHeader(worksheet, "I8:O8", "Nhiên liệu/Điện năng");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "I9", "Tồn dầu");
          setCellHeader(worksheet, "J9", "Lĩnh");
          setCellHeader(worksheet, "K9", "Tồn cuối");
          setCellHeader(worksheet, "L9", "Tiêu thụ");
          setCellHeader(worksheet, "M9", "Định mức");
          setCellHeader(worksheet, "N9", "Tiết kiệm");
          setCellHeader(worksheet, "O9", "Vượt");

          // ==== HÀNG 1 ==== (Su dung thiet bi)
          setMergeCellHeader(worksheet, "P8:R8", "Sử dụng thiết bị (giờ)");

          // ==== HÀNG 2 ==== ( Nhien lieu)
          setCellHeader(worksheet, "P9", "Giờ hoạt động");
          setCellHeader(worksheet, "Q9", "Giờ ngừng");
          setCellHeader(worksheet, "R9", "Giờ hoạt động lũy kế");

          // ==== HÀNG 1 ====
          setMergeCellHeader(worksheet, "S8:S9", "Bồi dưỡng (đồng)");
          setMergeCellHeader(worksheet, "T8:T9", "Lương tạm tính");

          let result = [];
          for (const order of filteredOrders) {
            const combined = getCombinedUsers(order);

            let reports = await Report.find({ orderId: order._id })
              .populate({
                path: "device",
                select: "code category",
                populate: {
                  path: "category",
                  select: "name",
                },
              })
              .populate("material", "name acceptedProduct");
            if (!reports.length) continue;

            const grouped = groupDrill(reports);

            result.push({
              _id: order._id,
              assignedTo: combined,
              reports: grouped.map((g) => ({
                code: g.device?.code || "",
                materials: g.materials || [],
                fuelRemain:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.fuelRemain || "",
                fuelReceived:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.fuelReceived || "",
                fuelRemainEnd:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.fuelRemainEnd || "",
                travelHours:
                  order?.shiftReport?.vehicleSummaries.find(
                    (i) =>
                      i.vehicle?._id.toString() === g.device?._id.toString(),
                  )?.travelHours || "",
              })),
            });
          }

          let currentRow = 10;

          result.forEach((item, idx) => {
            const reports =
              item.reports && item.reports.length
                ? item.reports
                : [{ code: "", materials: [{}] }];

            // tổng số dòng của người nhận lệnh = tổng số vật liệu trong tất cả reports
            const spanItem = reports.reduce(
              (sum, r) => sum + (r.materials?.length || 1),
              0,
            );
            const startRowItem = currentRow;

            reports.forEach((r) => {
              const mats = r.materials?.length ? r.materials : [{}];
              const spanReport = mats.length;
              const startRowReport = currentRow;

              mats.forEach((m) => {
                const row = worksheet.getRow(currentRow);

                // chỉ gán STT / Người nhận lệnh / Số thẻ 1 lần (ở hàng đầu tiên của item)
                if (currentRow === startRowItem) {
                  row.getCell(1).value = idx + 1;
                  row.getCell(2).value = (item.assignedTo || [])
                    .map((u) => u?.fullName)
                    .join("\n");
                  row.getCell(3).value = (item.assignedTo || [])
                    .map((u) => u?.salaryCode)
                    .join("\n");
                }

                // máy gạt (report code) – chỉ gán ở hàng đầu của report
                if (currentRow === startRowReport) {
                  row.getCell(4).value = r.code || "";
                }

                // vật liệu
                row.getCell(5).value = m?.material?.name || "";
                row.getCell(7).value = m?.drillDepth || "";
                row.getCell(8).value = m?.hardnessF || "";

                if (currentRow === startRowReport) {
                  row.getCell(9).value = r.fuelRemain || "";
                  row.getCell(10).value = r.fuelReceived || "";
                  row.getCell(11).value = r.fuelRemainEnd || "";
                  row.getCell(12).value =
                    (r.fuelRemain || 0) +
                      (r.fuelReceived || 0) -
                      (r.fuelRemainEnd || 0) || "";
                  row.getCell(13).value = "";
                  row.getCell(14).value = "";
                  row.getCell(15).value = "";
                  row.getCell(16).value = r?.travelHours || "";
                  row.getCell(17).value = "";
                  row.getCell(18).value = "";
                  row.getCell(19).value = "";
                  row.getCell(20).value = "";
                }

                // căn chỉnh
                row.eachCell((cell) => {
                  cell.alignment = {
                    horizontal: "center",
                    vertical: "middle",
                    wrapText: true,
                  };
                });
                row.getCell(2).alignment = {
                  horizontal: "left",
                  vertical: "top",
                  wrapText: true,
                };
                row.getCell(3).alignment = {
                  horizontal: "center",
                  vertical: "top",
                  wrapText: true,
                };

                currentRow++;
              });

              const reportCols = [
                "I",
                "J",
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
                "Q",
                "R",
                "S",
                "T",
              ];
              // merge cột D (máy gạt) cho số dòng vật liệu của report
              if (spanReport > 1) {
                worksheet.mergeCells(`D${startRowReport}:D${currentRow - 1}`);
                reportCols.forEach((col) => {
                  worksheet.mergeCells(
                    `${col}${startRowReport}:${col}${currentRow - 1}`,
                  );
                });
              }
            });

            // merge A–C (STT, Người nhận lệnh, Số thẻ) cho toàn bộ item
            if (spanItem > 1) {
              ["A", "B", "C"].forEach((col) => {
                worksheet.mergeCells(
                  `${col}${startRowItem}:${col}${currentRow - 1}`,
                );
              });
            }
            const numUsers = item.assignedTo?.length || 1;
            const numReports = reports.length;
            const maxLines = Math.max(numUsers, numReports);
            worksheet.getRow(startRowItem).height = maxLines * 15;
          });

          addTableBorders(worksheet, 8, currentRow, 1, 20);

          worksheet.mergeCells(`O${currentRow + 1}:R${currentRow + 1}`);
          worksheet.getCell(`O${currentRow + 1}`).value =
            "Cán bộ CT kiểm tra trong ca";
          worksheet.getCell(`O${currentRow + 1}`).font = { bold: true };
          worksheet.getCell(`O${currentRow + 1}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.mergeCells(`O${currentRow + 2}:R${currentRow + 2}`);
          worksheet.getCell(`O${currentRow + 2}`).value =
            "( Ký, ghi rõ họ tên)";
          worksheet.getCell(`O${currentRow + 2}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const extension = response.headers["content-type"].split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            worksheet.mergeCells(`P${currentRow + 4}:Q${currentRow + 7}`);

            // gán ảnh trực tiếp vào range
            worksheet.addImage(
              imageId,
              `P${currentRow + 4}:Q${currentRow + 7}`,
            );
          }

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

          worksheet.getColumn(1).width = 6;
          // worksheet.getColumn(1).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(2).width = 25;
          // worksheet.getColumn(2).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(3).width = 10;
          // worksheet.getColumn(3).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(4).width = 15;
          // worksheet.getColumn(4).alignment = { horizontal: 'center', vertical: 'middle', }
          worksheet.getColumn(5).width = 20;
          worksheet.getColumn(6).width = 15;
          worksheet.getColumn(7).width = 15;
          worksheet.getColumn(8).width = 15;
          worksheet.getColumn(9).width = 15;
          worksheet.getColumn(10).width = 15;
          worksheet.getColumn(11).width = 15;
          worksheet.getColumn(12).width = 15;
          worksheet.getColumn(13).width = 15;
          worksheet.getColumn(14).width = 15;
          worksheet.getColumn(15).width = 15;
          worksheet.getColumn(16).width = 15;
          worksheet.getColumn(17).width = 15;
          worksheet.getColumn(18).width = 15;
          worksheet.getColumn(19).width = 15;
          worksheet.getColumn(20).width = 15;

          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 3 ? { size: 12 } : {}), // kích thước chữ
              };
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo chuyến máy xúc

router.post(
  "/excavatorTripReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode department",
          populate: "department",
        })
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate({
          path: "createdBy",
          select: "fullName",
        })
        .populate({
          path: "device",
          select: "code category",
          populate: {
            path: "category",
            select: "name",
          },
        })
        .populate({
          path: "job",
          select: "type",
        });
      const filteredOrders = orders.filter(
        (order) =>
          order.device?.some((d) =>
            d.category?.name?.toLowerCase().includes("máy xúc"),
          ) && order.job?.type === JOB_TYPE.VAN_HANH_XUC,
      );

      let result = [];
      for (const order of filteredOrders) {
        const combined = getCombinedUsers(order);

        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code category",
            populate: {
              path: "category",
              select: "name",
            },
          })
          .populate("material", "name acceptedProduct");
        if (!reports.length) continue;
        console.log("✍✍✍✍✍✍", reports);

        const grouped = groupTripsExcavator(reports);

        result.push({
          _id: order._id,
          assignedTo: combined,
          excavator: (order.device || []).map((d) => d?.code) || "",
          reports: grouped.map((g) => ({
            code: g.device?.code || "",
            trips: g.trips || "",
            summary: g?.summary || "",
            totalTrips: g?.totalTrips || "",
          })),
        });
      }
      let maxTrips = 0;
      // 🔹 Gom vật liệu duy nhất (dựa trên _id)
      const materialMap = new Map();

      result.forEach((order) => {
        order.reports.forEach((rep) => {
          maxTrips = Math.max(maxTrips, rep.trips.length);

          rep.trips.forEach((trip) => {
            const mat = trip.material;
            if (mat && !materialMap.has(mat._id?.toString())) {
              materialMap.set(mat._id?.toString(), {
                _id: mat._id,
                name: mat.name,
              });
            }
          });
        });
      });

      const materials = Array.from(materialMap.values());

      res
        .status(200)
        .send({ status: "success", data: result, materials, maxTrips });
    } catch (err) {
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
const chunkArray = (array, size) => {
  if (!array || array.length === 0) return [[]];
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};
router.post(
  "/excavatorTripReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      console.log("✍✍✍✍✍✍");
      const { shift, startDate, endDate, title, signature, department } =
        req.body;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);
      const user = req.user;
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate({
              path: "assignedTo",
              select: "fullName salaryCode department",
              populate: "department",
            })
            .populate({
              path: "createdBy",
              select: "fullName",
            })
            .populate({
              path: "assistants",
              select: "fullName salaryCode",
            })
            .populate({
              path: "device",
              select: "code category",
              populate: {
                path: "category",
                select: "name",
              },
            })
            .populate({
              path: "job",
              select: "type",
            });
          const filteredOrders = orders.filter(
            (order) =>
              order.device?.some((d) =>
                d.category?.name?.toLowerCase().includes("máy xúc"),
              ) &&
              order.job?.type
                ?.toLowerCase()
                .includes("vận hành xúc".toLowerCase()),
          );

          let result = [];
          for (const order of filteredOrders) {
            const combined = getCombinedUsers(order);

            let reports = await Report.find({ orderId: order._id })
              .populate({
                path: "device",
                select: "code category",
                populate: {
                  path: "category",
                  select: "name",
                },
              })
              .populate("material", "name acceptedProduct");
            if (!reports.length) continue;

            const grouped = groupTripsExcavator(reports);

            result.push({
              _id: order._id,
              assignedTo: combined,
              excavator: (order.device || []).map((d) => d?.code) || "",
              reports: grouped.map((g) => ({
                code: g.device?.code || "",
                trips: g.trips || "",
                summary: g?.summary || "",
                totalTrips: g?.totalTrips || "",
              })),
            });
          }
          let maxTrips = 0;
          const materialMap = new Map();

          result.forEach((order) => {
            order.reports.forEach((rep) => {
              maxTrips = Math.max(maxTrips, rep.trips.length);

              rep.trips.forEach((trip) => {
                const mat = trip.material;
                if (mat && !materialMap.has(mat._id?.toString())) {
                  materialMap.set(mat._id?.toString(), {
                    _id: mat._id,
                    name: mat.name,
                  });
                }
              });
            });
          });
          const MAX_TRIPS_DISPLAY = maxTrips > 15 ? 15 : maxTrips || 1;

          const materials = Array.from(materialMap.values());

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          const totalColumn = materials.length + MAX_TRIPS_DISPLAY + 6;
          const colLetter = getColumnLetter(totalColumn);
          worksheet.mergeCells(`B1:${colLetter}1`);
          const infoRow = worksheet.getCell("B1");
          infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          infoRow.font = { italic: true, size: 18 };
          // Tiêu đề bảng
          worksheet.mergeCells(`A3:${colLetter}3`);
          const header = worksheet.getCell("A3");
          header.value = "Biểu chấm chuyến máy xúc";
          header.font = { bold: true, size: 16 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          worksheet.getCell("B4").value = "Ngày";
          worksheet.getCell("C4").value = formatDate(d);
          worksheet.getCell("E4").value = "Ca";
          worksheet.getCell("F4").value = ca?.name || "";

          worksheet.getCell("B5").value = "Đơn vị";
          worksheet.getCell("C5").value = dep?.code || "";
          worksheet.getCell("E5").value = "Giờ hệ thống";
          worksheet.getCell("F5").value = new Date().toLocaleTimeString(
            "vi-VN",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );

          worksheet.getCell("B6").value = "Người ra lệnh";
          worksheet.mergeCells(`C6:D6`);
          worksheet.getCell("C6").value = user?.fullName || "";
          worksheet.getCell("E6").value = "Số thẻ";
          worksheet.getCell("F6").value = user?.salaryCode || "";
          worksheet.getCell("G6").value = "Chức vụ";
          worksheet.mergeCells(`H6:${colLetter}6`);
          worksheet.getCell("H6").value = user?.position?.name || "";

          const headerRow = 8;

          // ==== HÀNG 1 ==== (STT, Người nhận lệnh, ... cố định 5-6 cột đầu)
          worksheet.mergeCells(headerRow, 1, headerRow + 1, 1); // STT
          worksheet.getCell(headerRow, 1).value = "STT";
          worksheet.getCell(headerRow, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 1).font = { bold: true };

          worksheet.mergeCells(headerRow, 2, headerRow + 1, 2); // Người nhận lệnh
          worksheet.getCell(headerRow, 2).value = "Người nhận lệnh";
          worksheet.getCell(headerRow, 2).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 2).font = { bold: true };

          worksheet.mergeCells(headerRow, 3, headerRow + 1, 3); // Số thẻ
          worksheet.getCell(headerRow, 3).value = "Số thẻ";
          worksheet.getCell(headerRow, 3).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 3).font = { bold: true };

          worksheet.mergeCells(headerRow, 4, headerRow + 1, 4); // Máy xúc
          worksheet.getCell(headerRow, 4).value = "Máy xúc";
          worksheet.getCell(headerRow, 4).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 4).font = { bold: true };

          worksheet.mergeCells(headerRow, 5, headerRow + 1, 5); // Xe nhận tải
          worksheet.getCell(headerRow, 5).value = "Xe nhận tải";
          worksheet.getCell(headerRow, 5).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 5).font = { bold: true };

          // ==== HÀNG 1 ==== (Thời điểm xúc tải - Loại vật liệu, colSpan = maxTrips)
          const startTripsCol = 6;
          const endTripsCol = startTripsCol + MAX_TRIPS_DISPLAY - 1;
          worksheet.mergeCells(
            headerRow,
            startTripsCol,
            headerRow,
            endTripsCol,
          );
          worksheet.getCell(headerRow, startTripsCol).value =
            "Thời điểm xúc tải - Loại vật liệu";
          worksheet.getCell(headerRow, startTripsCol).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(headerRow, startTripsCol).font = { bold: true };

          // ==== HÀNG 2 ==== (1..maxTrips)
          for (let i = 0; i < (maxTrips || 1); i++) {
            worksheet.getCell(headerRow + 1, startTripsCol + i).value = i + 1;
            worksheet.getCell(headerRow + 1, startTripsCol + i).alignment = {
              horizontal: "center",
              vertical: "middle",
            };
            worksheet.getCell(headerRow + 1, startTripsCol + i).font = {
              bold: true,
            };
          }

          // ==== HÀNG 1 ==== (Tổng hợp, colSpan = materials.length + 1 cho Tổng chuyến)
          const startSummaryCol = endTripsCol + 1;
          const materialEndCol = startSummaryCol + materials.length - 1;
          const totalTripsCol = materialEndCol + 1;

          // merge header "Tổng hợp" bao FULL các cột
          worksheet.mergeCells(
            headerRow,
            startSummaryCol,
            headerRow,
            totalTripsCol,
          );

          worksheet.getCell(headerRow, startSummaryCol).value = "Tổng hợp";
          worksheet.getCell(headerRow, startSummaryCol).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, startSummaryCol).font = { bold: true };

          // ==== HÀNG 2 ==== vật liệu + Tổng chuyến
          materials.forEach((m, idx) => {
            worksheet.getCell(headerRow + 1, startSummaryCol + idx).value =
              m.name;
            worksheet.getCell(headerRow + 1, startSummaryCol + idx).alignment =
              { horizontal: "center", vertical: "middle", wrapText: true };
            worksheet.getCell(headerRow + 1, startSummaryCol + idx).font = {
              bold: true,
            };
          });

          // thêm tiêu đề “Tổng chuyến”
          worksheet.getCell(headerRow + 1, totalTripsCol).value = "Tổng chuyến";
          worksheet.getCell(headerRow + 1, totalTripsCol).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow + 1, totalTripsCol).font = { bold: true };

          let currentRow = headerRow + 2;
          result.forEach((item, idx) => {
            const reps = item.reports.length
              ? item.reports
              : [{ code: "", trips: [], summary: {}, totalTrips: 0 }];

            // Tính tổng số dòng của Order
            let totalOrderRows = 0;
            const repRows = reps.map((r) => {
              const chunks = chunkArray(r.trips, MAX_TRIPS_DISPLAY);
              totalOrderRows += chunks.length;
              return { ...r, chunks, rowCount: chunks.length };
            });

            const startOrderRow = currentRow;

            repRows.forEach((r, rIndex) => {
              const startRepRow = currentRow;

              r.chunks.forEach((chunk, chunkIndex) => {
                const row = worksheet.getRow(currentRow);

                /** 4 cột đầu – chỉ dòng đầu tiên của Order */
                if (rIndex === 0 && chunkIndex === 0) {
                  row.getCell(1).value = idx + 1;
                  row.getCell(2).value = (item.assignedTo || [])
                    .map((u) => u.fullName)
                    .join("\n");
                  row.getCell(3).value = (item.assignedTo || [])
                    .map((u) => u.salaryCode)
                    .join("\n");
                  row.getCell(4).value = item.excavator.join(", ");
                }

                /** Xe nhận tải – chỉ merge sau */
                if (chunkIndex === 0) {
                  row.getCell(5).value = r.code;
                }

                /** Render chuyến */
                for (let t = 0; t < MAX_TRIPS_DISPLAY; t++) {
                  const trip = chunk[t];
                  if (trip) {
                    row.getCell(6 + t).value =
                      `${dayjs(trip.time).format("HH:mm:ss")}\n${trip.material?.name || ""}`;
                  }
                }

                /** Tổng hợp – chỉ dòng đầu của rep */
                if (chunkIndex === 0) {
                  // Cột tổng vật liệu
                  materials.forEach((m, mIdx) => {
                    row.getCell(startSummaryCol + mIdx).value =
                      r.summary[m.name] || 0;
                  });

                  // Cột Tổng chuyến
                  row.getCell(totalTripsCol).value = r.totalTrips || 0;
                }

                row.eachCell((cell) => {
                  cell.alignment = {
                    horizontal: "center",
                    vertical: "middle",
                    wrapText: true,
                  };
                });

                currentRow++;
              });

              /** Merge cho Xe nhận tải – chỉ merge 1 lần */
              if (r.rowCount > 1) {
                worksheet.mergeCells(
                  startRepRow,
                  5,
                  startRepRow + r.rowCount - 1,
                  5,
                );
              }

              /** Merge tổng hợp – chỉ merge 1 lần */
              if (r.rowCount > 1) {
                materials.forEach((_, mIdx) => {
                  const col = startSummaryCol + mIdx;
                  worksheet.mergeCells(
                    startRepRow,
                    col,
                    startRepRow + r.rowCount - 1,
                    col,
                  );
                });
                worksheet.mergeCells(
                  startRepRow,
                  totalTripsCol,
                  startRepRow + r.rowCount - 1,
                  totalTripsCol,
                );
              }
            });

            /** Merge 4 cột đầu theo Order – chỉ 1 lần */
            if (totalOrderRows > 1) {
              ["A", "B", "C", "D"].forEach((letter) => {
                worksheet.mergeCells(
                  `${letter}${startOrderRow}:${letter}${startOrderRow + totalOrderRows - 1}`,
                );
              });
            }
          });

          addTableBorders(worksheet, 8, currentRow - 1, 1, totalColumn);

          const startSignature = getColumnLetter(totalColumn - 4);
          const endSignature = getColumnLetter(totalColumn - 1);

          worksheet.mergeCells(
            `${startSignature}${currentRow + 1}:${endSignature}${
              currentRow + 1
            }`,
          );
          worksheet.getCell(`${startSignature}${currentRow + 1}`).value =
            "Cán bộ CT kiểm tra trong ca";
          worksheet.getCell(`${startSignature}${currentRow + 1}`).font = {
            bold: true,
          };
          worksheet.getCell(`${startSignature}${currentRow + 1}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.mergeCells(
            `${startSignature}${currentRow + 2}:${endSignature}${
              currentRow + 2
            }`,
          );
          worksheet.getCell(`${startSignature}${currentRow + 2}`).value =
            "( Ký, ghi rõ họ tên)";
          worksheet.getCell(`${startSignature}${currentRow + 2}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const extension = response.headers["content-type"].split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            // gán ảnh trực tiếp vào range
            const anchorRow = currentRow + 4;

            // tính col index từ chữ cái
            const startColIndex = worksheet.getColumn(startSignature).number;
            const endColIndex = worksheet.getColumn(endSignature).number;

            // Tính vị trí căn giữa
            const midCol = (startColIndex + endColIndex) / 2;

            worksheet.addImage(imageId, {
              tl: { col: midCol - 1.2, row: anchorRow - 1.2 }, // căn giữa theo chiều ngang
              ext: { width: 100, height: 30 },
            });
          }

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

          const fixedWidths = [6, 20, 10, 12, 12]; // 5 cột đầu

          // gán width
          fixedWidths.forEach((w, i) => (worksheet.getColumn(i + 1).width = w));
          for (let col = fixedWidths.length + 1; col <= totalColumn; col++) {
            worksheet.getColumn(col).width =
              120 / Math.max(totalColumn - fixedWidths.length, 2);
          }

          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 3 ? { size: 12 } : {}), // kích thước chữ
              };
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo chuyến ô tô

router.post(
  "/carTripReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode department",
          populate: "department",
        })
        .populate({
          path: "createdBy",
          select: "fullName",
        })
        .populate({
          path: "device",
          select: "code",
        })
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate({
          path: "createdBy",
          select: "fullName",
        })
        .populate({
          path: "job",
          select: "type",
        });
      const filterOrders = orders.filter(
        (r) => r.job?.type === JOB_TYPE.VAN_HANH_XE,
      );

      let result = [];
      for (const order of filterOrders) {
        const combined = getCombinedUsers(order);

        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code category",
            populate: {
              path: "category",
              select: "name",
            },
          })
          .populate("material", "name acceptedProduct")
          .populate("excavator", "code")
          .populate("toLocation", "name");

        reports = reports.filter((r) =>
          r.device?.category?.name
            ?.toLowerCase()
            .includes("vận tải".toLowerCase()),
        );
        if (!reports.length) continue;
        const mapped = reports.map((r) => ({
          ...r.toObject(),
          workingDate: order.workingDate,
          shift: order.shift,
        }));
        const grouped = await groupTripsCar(mapped);

        result.push({
          _id: order._id,
          device: (order.device || []).map((d) => d?.code).join(", ") || "",
          assignedTo: combined,
          reports: grouped.map((g) => ({
            excavator: g.excavator?.code || "",
            toLocation: g.toLocation?.name || "",
            trips: g.trips || "",
            summary: g?.summary || "",
            totalTrips: g?.totalTrips || "",
            totalDistance: g?.totalDistance || "",
          })),
        });
      }
      let maxTrips = 0;
      const materialMap = new Map();

      result.forEach((order) => {
        order.reports.forEach((rep) => {
          // cập nhật maxTrips
          maxTrips = Math.max(maxTrips, rep.trips.length);

          // gom tất cả material
          rep.trips.forEach((trip) => {
            if (trip.material) {
              // tạo key duy nhất theo _id hoặc name
              const key = trip.material._id?.toString() || trip.material.name;

              // chỉ lưu 1 lần duy nhất
              if (!materialMap.has(key)) {
                materialMap.set(key, {
                  _id: trip.material._id,
                  name: trip.material.name,
                  ...(trip.material.unit ? { unit: trip.material.unit } : {}),
                });
              }
            }
          });
        });
      });

      const materials = Array.from(materialMap.values());

      res
        .status(200)
        .send({ status: "success", data: result, maxTrips, materials });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/carTripReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, title, signature, department } =
        req.body;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);
      const user = req.user;
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate({
              path: "assignedTo",
              select: "fullName salaryCode department",
              populate: "department",
            })
            .populate({
              path: "createdBy",
              select: "fullName",
            })
            .populate({
              path: "device",
              select: "code",
            })
            .populate({
              path: "assistants",
              select: "fullName salaryCode",
            })
            .populate({
              path: "createdBy",
              select: "fullName",
            })
            .populate({
              path: "job",
              select: "type",
            });
          const filterOrders = orders.filter(
            (r) => r.job?.type === JOB_TYPE.VAN_HANH_XE,
          );

          let result = [];
          for (const order of filterOrders) {
            const combined = getCombinedUsers(order);

            let reports = await Report.find({ orderId: order._id })
              .populate({
                path: "device",
                select: "code category",
                populate: {
                  path: "category",
                  select: "name",
                },
              })
              .populate("material", "name acceptedProduct")
              .populate("excavator", "code")
              .populate("toLocation", "name");

            reports = reports.filter((r) =>
              r.device?.category?.name
                ?.toLowerCase()
                .includes("vận tải".toLowerCase()),
            );
            if (!reports.length) continue;
            const mapped = reports.map((r) => ({
              ...r.toObject(),
              workingDate: order.workingDate,
              shift: order.shift,
            }));
            const grouped = await groupTripsCar(mapped);

            result.push({
              _id: order._id,
              device: (order.device || []).map((d) => d?.code).join(", ") || "",
              assignedTo: combined,
              reports: grouped.map((g) => ({
                excavator: g.excavator?.code || "",
                toLocation: g.toLocation?.name || "",
                trips: g.trips || "",
                summary: g?.summary || "",
                totalTrips: g?.totalTrips || "",
                totalDistance: g?.totalDistance || "",
              })),
            });
          }
          let maxTrips = 0;
          const materialMap = new Map();

          result.forEach((order) => {
            order.reports.forEach((rep) => {
              // cập nhật maxTrips
              maxTrips = Math.max(maxTrips, rep.trips.length);

              // gom tất cả material
              rep.trips.forEach((trip) => {
                if (trip.material) {
                  // tạo key duy nhất theo _id hoặc name
                  const key = trip.material._id?.toString() || trip.material;

                  // chỉ lưu 1 lần duy nhất
                  if (!materialMap.has(key)) {
                    materialMap.set(key, {
                      _id: trip.material._id,
                      name: trip.material?.name,
                    });
                  }
                }
              });
            });
          });

          const MAX_TRIPS_DISPLAY = maxTrips > 15 ? 15 : maxTrips || 1;

          const materials = Array.from(materialMap.values());

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          const totalColumn = materials.length + (MAX_TRIPS_DISPLAY || 1) + 8;
          const colLetter = getColumnLetter(totalColumn);
          worksheet.mergeCells(`B1:${colLetter}1`);
          const infoRow = worksheet.getCell("B1");
          infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          infoRow.font = { italic: true, size: 18 };
          // Tiêu đề bảng
          worksheet.mergeCells(`A3:${colLetter}3`);
          const header = worksheet.getCell("A3");
          header.value = "Biểu chấm chuyến xe";
          header.font = { bold: true, size: 16 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          worksheet.getCell("B4").value = "Ngày";
          worksheet.getCell("C4").value = formatDate(d);
          worksheet.getCell("E4").value = "Ca";
          worksheet.getCell("F4").value = ca?.name || "";

          worksheet.getCell("B5").value = "Đơn vị";
          worksheet.getCell("C5").value = dep?.code || "";
          worksheet.getCell("E5").value = "Giờ hệ thống";
          worksheet.getCell("F5").value = new Date().toLocaleTimeString(
            "vi-VN",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );

          worksheet.getCell("B6").value = "Người ra lệnh";
          worksheet.mergeCells(`C6:D6`);
          worksheet.getCell("C6").value = user?.fullName || "";
          worksheet.getCell("E6").value = "Số thẻ";
          worksheet.getCell("F6").value = user?.salaryCode || "";
          worksheet.getCell("G6").value = "Chức vụ";
          worksheet.mergeCells(`H6:${colLetter}6`);
          worksheet.getCell("H6").value = user?.position?.name || "";

          const headerRow = 8;

          // ==== HÀNG 1 ==== (STT, Người nhận lệnh, ... cố định 5-6 cột đầu)
          worksheet.mergeCells(headerRow, 1, headerRow + 1, 1); // STT
          worksheet.getCell(headerRow, 1).value = "STT";
          worksheet.getCell(headerRow, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 1).font = { bold: true };

          worksheet.mergeCells(headerRow, 2, headerRow + 1, 2); // Người nhận lệnh
          worksheet.getCell(headerRow, 2).value = "Người nhận lệnh";
          worksheet.getCell(headerRow, 2).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 2).font = { bold: true };

          worksheet.mergeCells(headerRow, 3, headerRow + 1, 3); // Số thẻ
          worksheet.getCell(headerRow, 3).value = "Số thẻ";
          worksheet.getCell(headerRow, 3).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 3).font = { bold: true };

          worksheet.mergeCells(headerRow, 4, headerRow + 1, 4); // Máy xúc
          worksheet.getCell(headerRow, 4).value = "Thiết bị vận hành";
          worksheet.getCell(headerRow, 4).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 4).font = { bold: true };

          worksheet.mergeCells(headerRow, 5, headerRow + 1, 5); // Xe nhận tải
          worksheet.getCell(headerRow, 5).value = "Máy xúc";
          worksheet.getCell(headerRow, 5).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 5).font = { bold: true };

          worksheet.mergeCells(headerRow, 6, headerRow + 1, 6); // Xe nhận tải
          worksheet.getCell(headerRow, 6).value = "Điểm đổ tải";
          worksheet.getCell(headerRow, 6).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow, 6).font = { bold: true };

          // ==== HÀNG 1 ==== (Thời điểm xúc tải - Loại vật liệu, colSpan = MAX_TRIPS_DISPLAY)
          const startTripsCol = 7;
          const endTripsCol = startTripsCol + (MAX_TRIPS_DISPLAY || 1);
          worksheet.mergeCells(
            headerRow,
            startTripsCol,
            headerRow,
            endTripsCol,
          );
          worksheet.getCell(headerRow, startTripsCol).value =
            "Cung độ - Thời điểm xúc tải - Loại vật liệu";
          worksheet.getCell(headerRow, startTripsCol).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(headerRow, startTripsCol).font = { bold: true };

          // ==== HÀNG 2 ==== (1..MAX_TRIPS_DISPLAY)
          worksheet.getCell(headerRow + 1, startTripsCol).value = "Chuyến";
          worksheet.getCell(headerRow + 1, startTripsCol).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(headerRow + 1, startTripsCol).font = { bold: true };
          for (let i = 1; i < (MAX_TRIPS_DISPLAY || 1) + 1; i++) {
            worksheet.getCell(headerRow + 1, startTripsCol + i).value = i;
            worksheet.getCell(headerRow + 1, startTripsCol + i).alignment = {
              horizontal: "center",
              vertical: "middle",
            };
            worksheet.getCell(headerRow + 1, startTripsCol + i).font = {
              bold: true,
            };
          }

          // ==== HÀNG 1 ==== (Tổng hợp, colSpan = materials.length + 1 cho Tổng chuyến)
          const startSummaryCol = endTripsCol + 1;
          const endSummaryCol = startSummaryCol + materials.length;
          worksheet.mergeCells(
            headerRow,
            startSummaryCol,
            headerRow,
            endSummaryCol,
          );
          worksheet.getCell(headerRow, startSummaryCol).value = "Tổng hợp";
          worksheet.getCell(headerRow, startSummaryCol).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(headerRow, startSummaryCol).font = { bold: true };

          // ==== HÀNG 2 ==== (tên vật liệu + Tổng chuyến)
          materials.forEach((m, idx) => {
            worksheet.getCell(headerRow + 1, startSummaryCol + idx).value =
              m?.name || "";
            worksheet.getCell(headerRow + 1, startSummaryCol + idx).alignment =
              { horizontal: "center", vertical: "middle", wrapText: true };
            worksheet.getCell(headerRow + 1, startSummaryCol + idx).font = {
              bold: true,
            };
          });
          worksheet.getCell(headerRow + 1, endSummaryCol).value = "Tổng cộng";
          worksheet.getCell(headerRow + 1, endSummaryCol).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          worksheet.getCell(headerRow + 1, endSummaryCol).font = { bold: true };

          let currentRow = headerRow + 2;
          result.forEach((item, idx) => {
            const reps =
              item.reports && item.reports.length
                ? item.reports
                : [
                    {
                      code: "",
                      trips: [],
                      summary: {},
                      totalTrips: 0,
                      totalDistance: 0,
                    },
                  ];

            const startRow = currentRow;
            reps.forEach((r, i) => {
              const rowStart = currentRow;

              // --- CHIA CHUNK 15 CHUYẾN ---
              const chunks = [];
              for (let c = 0; c < r.trips.length; c += 15) {
                chunks.push(r.trips.slice(c, c + 15));
              }
              if (chunks.length === 0) chunks.push([]); // vẫn phải có 1 chunk rỗng

              chunks.forEach((chunkTrips, chunkIndex) => {
                // ──────────────────────────────────────────
                // 🔥 TÍNH TỔNG RIÊNG CHO TỪNG CHUNK
                // ──────────────────────────────────────────
                let chunkDistance = chunkTrips.reduce(
                  (s, t) => s + (t?.distance || 0),
                  0,
                );
                let chunkTotalTrips = chunkTrips.reduce(
                  (s, t) => s + (t?.quantity || 0),
                  0,
                );

                // Tổng theo vật liệu
                let chunkMaterialCount = {};
                let chunkMaterialDistance = {};

                materials.forEach((m) => {
                  chunkMaterialCount[m.name] = 0;
                  chunkMaterialDistance[m.name] = 0;
                });

                chunkTrips.forEach((t) => {
                  const mat = t.material?.name;
                  if (mat) {
                    chunkMaterialCount[mat] += t?.quantity || 0;
                    chunkMaterialDistance[mat] += t?.distance || 0;
                  }
                });

                // ──────────────────────────────────────────
                // 🔵 HÀNG 1 — CUNG ĐỘ
                // ──────────────────────────────────────────
                const row1 = worksheet.getRow(currentRow);

                if (i === 0 && chunkIndex === 0) {
                  row1.getCell(1).value = idx + 1;
                  row1.getCell(2).value = item.assignedTo
                    .map((u) => u.fullName)
                    .join("\n");
                  row1.getCell(3).value = item.assignedTo
                    .map((u) => u.salaryCode)
                    .join("\n");
                  row1.getCell(4).value = item.device || "";
                }

                if (chunkIndex === 0) {
                  row1.getCell(5).value = r.excavator || "";
                  row1.getCell(6).value = r.toLocation || "";
                }

                row1.getCell(7).value = "Cung độ tạm tính (km)";
                chunkTrips.forEach((trip, tIdx) => {
                  row1.getCell(8 + tIdx).value = trip?.distance || "";
                });

                // Tổng theo vật liệu (tính theo chunk)
                materials.forEach((m, mIdx) => {
                  row1.getCell(8 + MAX_TRIPS_DISPLAY + mIdx).value =
                    chunkMaterialDistance[m.name];
                });

                // Tổng cung độ chunk
                row1.getCell(8 + MAX_TRIPS_DISPLAY + materials.length).value =
                  chunkDistance;

                currentRow++;

                // ──────────────────────────────────────────
                // 🔵 HÀNG 2 — THỜI GIAN
                // ──────────────────────────────────────────
                const row2 = worksheet.getRow(currentRow);

                row2.getCell(7).value = "Thời gian";

                chunkTrips.forEach((trip, tIdx) => {
                  row2.getCell(8 + tIdx).value = trip?.time
                    ? new Date(trip.time).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "";
                });

                materials.forEach((m, mIdx) => {
                  row2.getCell(8 + MAX_TRIPS_DISPLAY + mIdx).value =
                    chunkMaterialCount[m.name];
                });

                // Tổng chuyến chunk
                row2.getCell(8 + MAX_TRIPS_DISPLAY + materials.length).value =
                  chunkTotalTrips;

                currentRow++;

                // ──────────────────────────────────────────
                // 🔵 HÀNG 3 — VẬT LIỆU
                // ──────────────────────────────────────────
                const row3 = worksheet.getRow(currentRow);

                row3.getCell(7).value = "Loại vật liệu";

                chunkTrips.forEach((trip, tIdx) => {
                  row3.getCell(8 + tIdx).value = trip?.material?.name || "";
                });

                // Merge vật liệu + tổng chuyến (row2 → row3)
                materials.forEach((m, mIdx) => {
                  const col = 8 + MAX_TRIPS_DISPLAY + mIdx;
                  worksheet.mergeCells(
                    `${row2.getCell(col).address}:${row3.getCell(col).address}`,
                  );
                });

                const totalCol = 8 + MAX_TRIPS_DISPLAY + materials.length;
                worksheet.mergeCells(
                  `${row2.getCell(totalCol).address}:${row3.getCell(totalCol).address}`,
                );

                currentRow++;

                // Style
                [row1, row2, row3].forEach((row) => {
                  row.eachCell((cell) => {
                    cell.alignment = {
                      horizontal: "center",
                      vertical: "middle",
                      wrapText: true,
                    };
                  });
                });

                row1.getCell(2).alignment = {
                  horizontal: "left",
                  vertical: "middle",
                  wrapText: true,
                };
              });
              // Merge máy xúc + điểm đổ tải cho mỗi REPORT (không cho từng chunk)
              const numberOfChunks =
                Math.ceil((r.trips?.length || 0) / 15) || 1;
              const reportRowSpan = numberOfChunks * 3;
              const reportEndRow = rowStart + reportRowSpan - 1;

              // merge Máy xúc (E) và Điểm đổ tải (F)
              worksheet.mergeCells(`E${rowStart}:E${reportEndRow}`);
              worksheet.mergeCells(`F${rowStart}:F${reportEndRow}`);
            });

            // merge cho các cột STT, Người nhận lệnh, Số thẻ, Máy xúc
            const totalRowSpan = reps.reduce((sum, r) => {
              const numberOfChunks =
                Math.ceil((r.trips?.length || 0) / 15) || 1;
              return sum + numberOfChunks * 3;
            }, 0);

            const mergeEndRow = startRow + totalRowSpan - 1;

            // merge 4 cột đầu: A B C D
            ["A", "B", "C", "D"].forEach((col) => {
              worksheet.mergeCells(`${col}${startRow}:${col}${mergeEndRow}`);
            });
            const numUsers = item.assignedTo?.length || 1;
            const numReports = reps.length;
            const maxLines = Math.max(numUsers, numReports);
            // worksheet.getRow(startRow).height = maxLines * 15;
          });

          addTableBorders(worksheet, 8, currentRow, 1, totalColumn);

          const startSignature = getColumnLetter(totalColumn - 6);
          const endSignature = getColumnLetter(totalColumn - 1);

          worksheet.mergeCells(
            `${startSignature}${currentRow + 1}:${endSignature}${currentRow + 1}`,
          );
          worksheet.getCell(`${startSignature}${currentRow + 1}`).value =
            "Cán bộ CT kiểm tra trong ca";
          worksheet.getCell(`${startSignature}${currentRow + 1}`).font = {
            bold: true,
          };
          worksheet.getCell(`${startSignature}${currentRow + 1}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.mergeCells(
            `${startSignature}${currentRow + 2}:${endSignature}${currentRow + 2}`,
          );
          worksheet.getCell(`${startSignature}${currentRow + 2}`).value =
            "( Ký, ghi rõ họ tên)";
          worksheet.getCell(`${startSignature}${currentRow + 2}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const extension = response.headers["content-type"].split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            // gán ảnh trực tiếp vào range
            const anchorRow = currentRow + 4;

            // tính col index từ chữ cái
            const startColIndex = worksheet.getColumn(startSignature).number;
            const endColIndex = worksheet.getColumn(endSignature).number;

            // Tính vị trí căn giữa
            const midCol = (startColIndex + endColIndex) / 2;

            worksheet.addImage(imageId, {
              tl: { col: midCol - 1.2, row: anchorRow - 1.2 }, // căn giữa theo chiều ngang
              ext: { width: 100, height: 30 },
            });
          }

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

          const fixedWidths = [6, 15, 7, 12, 10, 10, 10]; // 5 cột đầu

          // gán width
          fixedWidths.forEach((w, i) => (worksheet.getColumn(i + 1).width = w));
          for (let col = fixedWidths.length + 1; col <= totalColumn; col++) {
            worksheet.getColumn(col).width =
              110 / Math.max(totalColumn - fixedWidths.length, 2);
          }

          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 3 ? { size: 12 } : {}), // kích thước chữ
              };
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo sản lượng
async function getProductReport(query) {
  const orders = await Order.find(query)
    .populate({
      path: "shiftReport",
      populate: [{ path: "vehicleSummaries.vehicle", select: "code" }],
    })
    .populate("assignedTo", "fullName salaryCode")
    .populate("device", "code")
    .populate("job", "type")

  const result = [];

  for (const order of orders) {
    if (order.job?.type !== JOB_TYPE.VAN_HANH_XE) continue;

    // Lấy report theo order
    let reports = await Report.find({ orderId: order._id })
      .populate({
        path: "device",
        select: "code category",
        populate: { path: "category", select: "name" },
      })
      .populate("material", "name acceptedProduct")
      .populate("excavator", "code")
      .populate("toLocation", "name");

    // Lọc xe vận tải
    reports = reports.filter((r) =>
      r.device?.category?.name?.toLowerCase().includes("vận tải"),
    );

    if (!reports.length) continue;
    const mapped = reports.map((r) => ({
      ...r.toObject(),
      workingDate: order.workingDate,
      shift: order.shift,
    }));

    // Gom theo từng xe
    const vehicles = await groupProduction(mapped, order.shiftReport);

    result.push({
      assignedTo: order.assignedTo?.fullName || "",
      vehicles,
    });
  }
  return result;
}
router.post(
  "/productReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res) => {
    try {
      const { shift, day, department } = req.body;
      const user = req.user;

      let query = {};
      query.department =
        user.role === ROLE.ADMIN ? department : user.department?._id;

      if (shift?.length) query.shift = { $in: shift };
      if (day) query.workingDate = new Date(day);

      const result = await getProductReport(query);
      return res.status(200).json({ status: "success", data: result });
    } catch (err) {
      console.error("❌ Lỗi khi load", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

router.post(
  "/productReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, day, department, signature } = req.body;
      const user = req.user;

      let query = {};
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }
      query.department = dep?._id;

      if (shift?.length) query.shift = { $in: shift };
      if (day) query.workingDate = new Date(day);

      const result = await getProductReport(query);

      const workbook = new ExcelJS.Workbook();

      const sheetName = `${dep?.code}`
        .replace(/[\\\/:*?\[\]]/g, "-")
        .substring(0, 31);

      const worksheet = workbook.addWorksheet(sheetName);

      // --- 2. DÒNG NGÀY, THÁNG ---
      worksheet.mergeCells("A1:P1");
      const infoRow = worksheet.getCell("A1");
      infoRow.value = `SỔ THEO DÕI SẢN LƯỢNG, NHIÊN LIỆU, GPS, NIÊM PHONG KẸP CHÌ`;
      infoRow.font = { size: 16 };
      infoRow.alignment = { horizontal: "center", vertical: "middle" };

      // --- 3. TIÊU ĐỀ CÁC CỘT ---
      setCell(worksheet, "A3:A4", "SỐ TT");
      setCell(worksheet, "B3:B4", "HỌ VÀ TÊN LÁI XE");
      setCell(worksheet, "C3:C4", "SỐ XE");
      setCell(worksheet, "D3:D4", "MÁY XÚC");

      setCell(worksheet, "E3:G3", "CHUYẾN");
      setCell(worksheet, "H3:K3", "NHIÊN LIỆU");

      setCell(worksheet, "L3:L3", "GIỜ HĐ");
      setCell(worksheet, "M3:N3", "KẸP CHÌ, NIÊM PHONG");
      setCell(worksheet, "O3:P3", "JPS");

      worksheet.getCell("E4").value = "Than";
      worksheet.getCell("F4").value = "Đất";
      worksheet.getCell("G4").value = "Cung độ (km)";

      worksheet.getCell("H4").value = "Tồn đầu ca";
      worksheet.getCell("I4").value = "Lĩnh thêm";
      worksheet.getCell("J4").value = "Tiêu hao";
      worksheet.getCell("K4").value = "Tồn cuối ca";

      worksheet.getCell("L4").value = "Trong ca";
      worksheet.getCell("M4").value = "Tốt";
      worksheet.getCell("N4").value = "Hỏng";
      worksheet.getCell("O4").value = "HĐBT";
      worksheet.getCell("P4").value = "Mất tín hiệu";

      // --- 5. GÁN DỮ LIỆU (GIỐNG Y FE) ---
      let startRow = 5; // Dữ liệu bắt đầu từ dòng 5 + 1 = dòng 6

      result.forEach((driver, driverIndex) => {
        const vehicleCount = driver.vehicles.length;

        driver.vehicles.forEach((v, vIndex) => {
          const row = worksheet.getRow(startRow);

          // STT: merge nếu nhiều xe
          if (vIndex === 0) {
            worksheet.mergeCells(
              `A${startRow}:A${startRow + vehicleCount - 1}`,
            );
            worksheet.mergeCells(
              `B${startRow}:B${startRow + vehicleCount - 1}`,
            );

            row.getCell("A").value = driverIndex + 1;
            row.getCell("B").value = driver.assignedTo;
          }

          // Số xe
          row.getCell("C").value = v.device;

          // Máy xúc
          row.getCell("D").value = v.excavators.join(", ");

          // Chuyến
          row.getCell("E").value = v.coalTrip;
          row.getCell("F").value = v.landTrip;
          row.getCell("G").value = v.distances.join(", ");

          // Nhiên liệu
          row.getCell("H").value = v.fuelRemain;
          row.getCell("I").value = v.fuelReceived;
          row.getCell("J").value = v.fuelRemainUsed;
          row.getCell("K").value = v.fuelRemainEnd;

          // Giờ HĐ
          row.getCell("L").value = v.travelHours;

          // Kẹp chì (Tốt/Hỏng)
          row.getCell("M").value = v.sealStatus ? "✘" : "";
          row.getCell("N").value = !v.sealStatus ? "✘" : "";

          // GPS (HĐBT / Mất tín hiệu)
          row.getCell("O").value = v.gpsStatus ? "✘" : "";
          row.getCell("P").value = !v.gpsStatus ? "✘" : "";

          startRow++;
        });
      });
      worksheet.getCell(`B${startRow}`).value = "Cộng";
      worksheet.getCell(`B${startRow}`).font = { bold: true };
      worksheet.getCell(`B${startRow}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      addTableBorders(worksheet, 3, startRow, 1, 16);
      worksheet.columns = [
        { width: 5 }, // A
        { width: 25 }, // B
        { width: 10 }, // C
        { width: 20 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 25 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
        { width: 10 }, // D
      ];

      if (signature) {
        const response = await axios.get(signature, {
          responseType: "arraybuffer",
        });
        const contentType = response.headers["content-type"];
        const extension = contentType.split("/")[1];
        const imageBuffer = Buffer.from(response.data, "binary");

        // Thêm ảnh vào workbook
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension,
        });

        // Gán ảnh vào vị trí (dùng topleft + extents hoặc range)
        const lastCol = worksheet.columnCount;
        worksheet.addImage(imageId, {
          tl: { col: lastCol - 2, row: startRow + 1 }, // H30
          ext: { width: 100, height: 30 },
        });
      }

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
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          if (!cell.font) cell.font = {};
          cell.font = {
            ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
            name: "Times New Roman", // đổi font chữ
            ...(rowNumber > 4 ? { size: 10 } : {}), // kích thước chữ
          };

          if (rowNumber >= 3 && rowNumber <= 4) {
            row.height = 40;
            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: "true",
            };
            cell.font = { bold: true };
          } else if (rowNumber >= 5) {
            if (cell.col === 1) {
              cell.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: "true",
              };
            } else {
              cell.alignment = { vertical: "middle", wrapText: "true" };
            }
          }
        });
      });

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo công

router.post(
  "/worklog/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {
        status: {
          $in: [
            STATUS_ORDER.INPROGRESS,
            STATUS_ORDER.COMPLETED,
            STATUS_ORDER.WARNING,
          ],
        },
      };
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }
      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate("assignedTo", "fullName salaryCode department")
        .populate("job", "name")
        .populate("device", "code")
        .populate("shift")
        .populate("shiftReport");

      const formattedData = orders.map((order) => ({
        _id: order._id,
        fullName: order.assignedTo?.fullName,
        salaryCode: order.assignedTo?.salaryCode,
        device: order.device?.map((d) => d.code).join(","),
        job: order.job?.name,
      }));

      res.status(200).send({ status: "success", data: formattedData });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/worklog",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department, signature } = req.body;
      const user = req.user;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            status: {
              $in: [
                STATUS_ORDER.INPROGRESS,
                STATUS_ORDER.COMPLETED,
                STATUS_ORDER.WARNING,
              ],
            },
            department: new mongoose.Types.ObjectId(dep?._id),
          })
            .populate("assignedTo", "fullName salaryCode department")
            .populate("job", "name")
            .populate("device", "code")
            .populate("shiftReport");
          const formattedData = orders.map((order) => ({
            _id: order._id,
            fullName: order.assignedTo?.fullName,
            salaryCode: order.assignedTo?.salaryCode,
            device: order.device?.map((d) => d.code).join(","),
            job: order.job?.name,
          }));
          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          // --- HEADER ---
          worksheet.mergeCells("A1:I1");
          const infoRow = worksheet.getCell("B1");
          infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          infoRow.font = { italic: true, size: 18 };
          infoRow.alignment = { horizontal: "left", vertical: "middle" };

          worksheet.mergeCells("A3:I3");
          worksheet.getCell("A3").value =
            `Đơn vị: ${dep?.code}.  Ca: ${ca.name}, ngày: ${formatDate(d)}         Tên cán bộ: ${req.user?.fullName}`;
          worksheet.getCell("A3").font = { italic: true, size: 12 };

          worksheet.mergeCells("A4:I4");
          worksheet.getCell("A4").value = "Báo công hàng ngày";
          worksheet.getCell("A4").font = { bold: true, size: 14 };
          worksheet.getCell("A4").alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          const headerRow = worksheet.getRow(6);
          headerRow.values = [
            "STT",
            "Họ và tên",
            "Số thẻ",
            "Thiết bị vận hành,\n vị trí làm việc",
            "Vị trí ăn",
            "Lương cấp bậc\n 1 ngày",
            "Lương sản phẩm",
            "Nội dung công việc",
            "Ghi chú",
          ];
          headerRow.eachCell((cell) => {
            cell.alignment = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            };
            cell.font = { bold: true, size: 10 }; // hoặc 14 cho rõ
          });

          // --- DATA ---

          let index = 1;
          for (const item of formattedData) {
            worksheet.addRow([
              index++,
              item.fullName,
              item.salaryCode,
              item?.device,
              "",
              "",
              "",
              item?.job,
              "",
            ]);
          }
          addTableBorders(worksheet, 6, formattedData.length + 6, 1, 9);

          worksheet.getColumn(1).width = 6;
          worksheet.getColumn(1).alignment = { horizontal: "center" };
          worksheet.getColumn(2).width = 25;
          worksheet.getColumn(2).alignment = { horizontal: "center" };
          worksheet.getColumn(3).width = 10;
          worksheet.getColumn(3).alignment = { horizontal: "center" };
          worksheet.getColumn(4).width = 20;
          worksheet.getColumn(5).width = 10;
          worksheet.getColumn(6).width = 15;
          worksheet.getColumn(7).width = 10;
          worksheet.getColumn(8).width = 25;
          worksheet.getColumn(9).width = 20;

          const length = formattedData.length;
          worksheet.mergeCells(`C${length + 8}:D${length + 8}`);
          worksheet.getCell(`C${length + 8}`).value = "TỔ TRƯỞNG";
          worksheet.getCell(`C${length + 8}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(`C${length + 8}`).font = { bold: true };

          // Merge ô H..I và ghi "QUẢN ĐỐC"
          worksheet.mergeCells(`H${length + 8}:I${length + 8}`);
          worksheet.getCell(`H${length + 8}`).value = "QUẢN ĐỐC";
          worksheet.getCell(`H${length + 8}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(`H${length + 8}`).font = { bold: true };

          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const contentType = response.headers["content-type"];
            const extension = contentType.split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            // Thêm ảnh vào workbook
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            // Gán ảnh vào vị trí (dùng topleft + extents hoặc range)
            const lastCol = worksheet.columnCount;
            worksheet.addImage(imageId, {
              tl: { col: lastCol - 2, row: length + 8 }, // H30
              ext: { width: 100, height: 30 },
            });
          }

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
          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 4 ? { size: 12 } : {}), // kích thước chữ
              };
              if (rowNumber === 1) {
                cell.alignment = { horizontal: "left", vertical: "middle" };
              }
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// báo ăn

router.post(
  "/meal_request/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {
        status: {
          $in: [
            STATUS_ORDER.INPROGRESS,
            STATUS_ORDER.COMPLETED,
            STATUS_ORDER.WARNING,
          ],
        },
      };
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }

      if (Array.isArray(shift) && shift.length > 0) {
        query.shift = { $in: shift };
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      const orders = await Order.find(query)
        .populate("assignedTo", "fullName salaryCode department")
        .populate("job", "name")
        .populate("location", "name")
        .populate("material", "name")
        .populate("excavator.device", "code")
        .populate("device", "code")
        .populate("shift");
      const formattedData = orders.flatMap((order, orderIndex) => {
        return {
          _id: order?._id,
          fullName: order?.assignedTo?.fullName,
          salaryCode: order?.assignedTo?.salaryCode,
          device: order?.device.map((item) => item.code).join(","),
          job: order?.job?.name,
        };
      });

      res.status(200).send({ status: "success", data: formattedData });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/meal_request",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { shift, startDate, endDate, department, signature } = req.body;
      const user = req.user;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      const start = new Date(startDate);
      const end = new Date(endDate);

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      // Đảm bảo end không nhỏ hơn start
      if (end < start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

      const workbook = new ExcelJS.Workbook();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const ca of shiftList) {
          const orders = await Order.find({
            workingDate: d,
            shift: ca._id,
            department: new mongoose.Types.ObjectId(dep?._id),
            status: {
              $in: [
                STATUS_ORDER.INPROGRESS,
                STATUS_ORDER.COMPLETED,
                STATUS_ORDER.WARNING,
              ],
            },
          })
            .populate("assignedTo", "fullName salaryCode department")
            .populate("job", "name")
            .populate("location", "name")
            .populate("material", "name")
            .populate("excavator.device", "code")
            .populate("device", "code")
            .populate("shift");

          const formattedData = orders.flatMap((order, orderIndex) => {
            return {
              _id: order?._id,
              fullName: order?.assignedTo?.fullName,
              salaryCode: order?.assignedTo?.salaryCode,
              device: order?.device.map((item) => item.code).join(","),
              job: order?.job?.name,
            };
          });

          const sheetName = `${formatDate(d)}_${ca.name}`
            .replace(/[\\\/:*?\[\]]/g, "-")
            .substring(0, 31);

          const worksheet = workbook.addWorksheet(sheetName);

          worksheet.mergeCells("A1:G1");
          const titleRow = worksheet.getCell("B1");
          titleRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
          titleRow.font = { italic: true, size: 18 };
          titleRow.alignment = { horizontal: "left", vertical: "middle" };

          worksheet.mergeCells("A3:G3");
          const infoRow = worksheet.getCell("A3");
          infoRow.value = `Đơn vị: ${dep?.code},  Ca: ${ca.name}, ngày: ${formatDate(d)}         Tên cán bộ:`;
          infoRow.font = { italic: true, size: 12 };
          infoRow.alignment = { horizontal: "center", vertical: "middle" };
          // Tiêu đề bảng
          worksheet.mergeCells("A4:G4");
          const header = worksheet.getCell("A4");
          header.value = "PHIẾU BÁO ĂN";
          header.font = { bold: true, size: 14 };
          header.alignment = { horizontal: "center", vertical: "middle" };

          setCell(worksheet, "A6", "STT");
          setCell(worksheet, "B6", "Họ và tên");
          setCell(worksheet, "C6", "Số thẻ");
          setCell(worksheet, "D6", "Số xe");
          setCell(worksheet, "E6", "Công việc");
          setCell(worksheet, "F6", "Vị trí báo ăn");
          setCell(worksheet, "G6", "Ghi chú");

          let index = 1;
          for (const item of formattedData) {
            worksheet.addRow([
              index++,
              item.fullName,
              item.salaryCode,
              item?.device,
              item?.job,
              "",
              "",
            ]);
          }
          addTableBorders(worksheet, 6, formattedData.length + 6, 1, 7);

          worksheet.columns = [
            { key: "A", width: 10 },
            { key: "B", width: 25 },
            { key: "C", width: 10 },
            { key: "D", width: 15 },
            { key: "E", width: 30 },
            { key: "F", width: 25 },
            { key: "G", width: 25 },
          ];

          const length = formattedData.length;
          worksheet.mergeCells(`E${length + 8}:G${length + 8}`);
          worksheet.getCell(`E${length + 8}`).value = "CÁN BỘ ĐI CA";
          worksheet.getCell(`E${length + 8}`).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          worksheet.getCell(`E${length + 8}`).font = { bold: true };

          if (signature) {
            const response = await axios.get(signature, {
              responseType: "arraybuffer",
            });
            const contentType = response.headers["content-type"];
            const extension = contentType.split("/")[1];
            const imageBuffer = Buffer.from(response.data, "binary");

            // Thêm ảnh vào workbook
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension,
            });

            // Gán ảnh vào vị trí (dùng topleft + extents hoặc range)
            const lastCol = worksheet.columnCount;
            worksheet.addImage(imageId, {
              tl: { col: lastCol - 2, row: length + 8 }, // H30
              ext: { width: 100, height: 30 },
            });
          }

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
          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
              if (!cell.font) cell.font = {};
              cell.font = {
                ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
                name: "Times New Roman", // đổi font chữ
                ...(rowNumber > 4 ? { size: 12 } : {}), // kích thước chữ
              };
              if (rowNumber === 1) {
                cell.alignment = { horizontal: "left", vertical: "middle" };
              }
            });
          });
        }
      }

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      // Thiết lập header để tải file về
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''*.xlsx",
      ); // Gửi buffer về client
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/assignmentTo",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("GiaoCa", {
        views: [{ showGridLines: false }],
      });

      // Định dạng trang in (A4, Dọc, Margin)
      ws.pageSetup.paperSize = 9; // A4
      ws.pageSetup.orientation = "portrait"; // Dọc
      // Thiết lập Fit-to-Page để đảm bảo nội dung nằm gọn trong chiều ngang A4
      ws.pageSetup.fitToPage = true;
      ws.pageSetup.fitToWidth = 1; // Fit chiều rộng vào 1 trang
      ws.pageSetup.fitToHeight = 0; // Chiều cao không giới hạn
      ws.pageSetup.margins = {
        left: 0.8,
        right: 0.5,
        top: 0.7,
        bottom: 0.7,
        header: 0.3,
        footer: 0.3,
      };

      ws.views = [{ state: "pageLayout", showGridLines: false }];

      // ===== COLUMNS (Đã điều chỉnh độ rộng cột để cân đối hơn) =====
      ws.columns = [
        { width: 33 }, // A (Cho người giao/nhận)
        { width: 33 }, // B
        { width: 33 }, // C
        { width: 33 }, // D
      ];

      let row = 1;

      // === PHẦN ĐẦU TRANG ===
      ws.mergeCells(`A${row}:D${row}`);
      ws.getCell(`A${row}`).value =
        `Ca ${".".repeat(45)} ngày ${".".repeat(45)} tháng ${".".repeat(45)} năm ${".".repeat(45)}`;
      ws.getRow(row).height = 25; // Tăng chiều cao dòng
      row++;

      ws.mergeCells(`A${row}:B${row} `);
      ws.getCell(`A${row} `).value = "Người giao:" + ".".repeat(120);

      ws.mergeCells(`C${row}:D${row} `);
      ws.getCell(`C${row} `).value = "Người nhận:" + ".".repeat(120);
      ws.getRow(row).height = 25;
      row++;
      // === PHẦN I: HOẠT ĐỘNG TRONG CA ===
      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value = "I. Hoạt động trong ca:";
      ws.getRow(row).height = 25;
      ws.getRow(row).font = { bold: true, italic: true, underline: true };
      row++;

      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        `Tuyến hoạt động:${".".repeat(50)} Cung độ (km):${".".repeat(50)} Chờ than/đất: ${".".repeat(50)}`;
      ws.getRow(row).height = 25;
      row++;

      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        `Số chuyến theo định mức:${".".repeat(40)} Số chuyến thực tế:${".".repeat(40)} Giờ hoạt động ${".".repeat(40)}`;
      ws.getRow(row).height = 25;
      row++;

      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        `Giờ sau công tiếp sau KT:${".".repeat(80)} Giờ công tiếp sau bảo dưỡng cấp 1 ${".".repeat(80)}`;
      ws.getRow(row).height = 25;
      row++;

      // Dòng hư hỏng (Tăng chiều cao dòng để có 2 dòng trống)
      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        `Những hư hỏng xảy ra trong ca:${".".repeat(200)}`;
      ws.getRow(row).height = 25;
      row++;

      for (let i = 0; i < 2; i++) {
        ws.mergeCells(`A${row}:D${row} `);
        ws.getCell(`A${row} `).value = ".".repeat(240);
        ws.getRow(row).height = 25;
        row++;
      }

      // === PHẦN II: NHỮNG CÔNG VIỆC ĐÃ THỰC HIỆN TRONG CA ===
      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        "II. Những công việc đã thực hiện trong ca (KT, bảo dưỡng, sửa chữa):";
      ws.getCell(`A${row} `).font = { bold: true, underline: true };
      ws.getRow(row).height = 25;
      row++;

      // Dòng công việc thực hiện (2 dòng trống)
      for (let i = 0; i < 2; i++) {
        ws.mergeCells(`A${row}:D${row} `);
        ws.getCell(`A${row} `).value = ".".repeat(240);
        ws.getRow(row).height = 25;
        row++;
      }
      ws.getRow(row).height = 25;
      row++;

      // === PHẦN III: NHIÊN LIỆU ===
      ws.getCell(`A${row} `).value = "III. Nhiên liệu:";
      ws.getCell(`A${row} `).font = {
        bold: true,
        italic: true,
        underline: true,
      };
      ws.mergeCells(`B${row}:D${row} `);
      ws.getCell(`B${row} `).value =
        `Tồn đầu ca:${".".repeat(35)} Lĩnh trong ca:${".".repeat(35)}Tồn cuối ca:${".".repeat(40)}`;
      ws.getRow(row).height = 25;
      row++;

      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        `Mức tiêu hao: Theo định mức:${".".repeat(50)} Thực tế:${".".repeat(50)} quá mức:${".".repeat(50)}`;
      ws.getRow(row).height = 25;
      row++;

      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        `Bổ sung dầu nhờn: Loại dầu:${".".repeat(50)} vị trí:${".".repeat(50)} số lượng ${".".repeat(50)}`;
      ws.getRow(row).height = 25;
      row++;

      // === PHẦN IV: TÌNH TRẠNG KỸ THUẬT XE KHI GIAO LẠI CHO CA SAU ===
      ws.mergeCells(`A${row}:D${row} `);
      ws.getCell(`A${row} `).value =
        "IV. Tình trạng kỹ thuật xe khi giao lại cho ca sau:";
      ws.getCell(`A${row} `).font = {
        bold: true,
        italic: true,
        underline: true,
      };
      ws.getRow(row).height = 25;
      row++;

      // Liệt kê các bộ phận (Thêm khoảng trống cho chữ ký, nên tăng chiều cao dòng)
      const components = [
        "Động cơ:",
        "Hệ thống phanh:",
        "Hệ thống lái:",
        "Gương, đèn, còi, đồng hồ:",
        "Hệ thống truyền động:",
        "Hệ thống treo:",
        "Hệ thống nâng ben:",
        "Hệ thống điện:",
        "Ca bin, sắt xi:",
        "Bánh xe và lốp:",
        "Radio, máy điều hòa:",
        "Dụng cụ đồ nghề:",
        "GPS, niêm phong, kẹp chì:",
      ];

      components.forEach((comp) => {
        ws.mergeCells(`A${row}:D${row} `);
        ws.getCell(`A${row} `).value = comp + ".".repeat(240);
        ws.getRow(row).height = 25;
        row++;
      });

      // Tăng khoảng trống cho chữ ký (4 dòng, mỗi dòng cao 15)
      ws.getRow(row).height = 15;
      row++;

      // === CHỮ KÝ GIAO/NHẬN CA ===
      ws.mergeCells(`A${row}:B${row} `);
      ws.getCell(`A${row} `).value = "NGƯỜI GIAO CA";

      ws.mergeCells(`C${row}:D${row} `);
      ws.getCell(`C${row} `).value = "NGƯỜI NHẬN CA";
      ws.getCell(`A${row} `).font = { bold: true };
      ws.getRow(row).font = { bold: true };
      ws.getCell(`C${row}`).alignment = { horizontal: "center" };
      row++;

      ws.mergeCells(`A${row}:B${row} `);
      ws.getCell(`A${row} `).value = "(Ký, ghi rõ họ tên)";

      ws.mergeCells(`C${row}:D${row} `);
      ws.getCell(`C${row} `).value = "(Ký, ghi rõ họ tên)";
      ws.getRow(row).height = 25;
      ws.getRow(row).font = { bold: true };
      ws.getCell(`C${row}`).alignment = { horizontal: "center" };
      row++;

      // Tăng khoảng trống cho chữ ký cuối cùng
      ws.getRow(row).height = 25;
      row++;
      ws.getRow(row).height = 25;
      row++;
      ws.getRow(row).height = 25;
      row++;
      ws.getRow(row).height = 25;
      row++;

      // === PHẦN V: NGƯỜI NHẬN CA KIỂM TRA XE ===
      ws.mergeCells(`A${row}:B${row} `);
      ws.getCell(`A${row} `).value =
        "V. Người nhận ca kiểm tra KT xe đầu ca, xin lệnh hoạt động";
      ws.getCell(`A${row} `).font = {
        bold: true,
        italic: true,
        underline: true,
      };
      ws.mergeCells(`C${row}:D${row} `);
      ws.getCell(`D${row} `).value = ".".repeat(240);
      ws.getRow(row).height = 25;
      row++;

      // Dòng công việc thực hiện (2 dòng trống)
      for (let i = 0; i < 2; i++) {
        ws.mergeCells(`A${row}:D${row} `);
        ws.getCell(`A${row} `).value = ".".repeat(240);
        ws.getRow(row).height = 25;
        row++;
      }
      ws.getRow(row).height = 20;
      row++;
      // Chữ ký cuối cùng
      ws.mergeCells(`A${row}:B${row} `);
      ws.getCell(`A${row} `).value = "NGƯỜI NHẬN CA";

      ws.mergeCells(`C${row}:D${row} `);
      ws.getCell(`C${row} `).value = "NGƯỜI RA LỆNH HOẠT ĐỘNG";
      ws.getRow(row).height = 25;
      ws.getRow(row).font = { bold: true };
      ws.getCell(`C${row}`).alignment = { horizontal: "center" };
      row++;

      ws.mergeCells(`A${row}:B${row} `);
      ws.getCell(`A${row} `).value = "(Ký, ghi rõ họ tên)";

      ws.mergeCells(`C${row}:D${row} `);
      ws.getCell(`C${row} `).value = "CA TIẾP THEO";
      ws.getRow(row).height = 25;
      ws.getCell(`C${row}`).alignment = { horizontal: "center" };
      ws.getRow(row).font = { bold: true };
      row++;

      ws.mergeCells(`C${row}:D${row} `);
      ws.getCell(`C${row} `).value = "(Ký, ghi rõ họ tên)";
      ws.getRow(row).height = 25;
      ws.getRow(row).alignment = { horizontal: "center" };
      ws.getRow(row).font = { bold: true };
      row++;

      ws.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (!cell.font) cell.font = {};
          cell.font = {
            ...cell.font,
            name: "Times New Roman",
            size: 14,
          };
        });
      });

      // ==== EXPORT ====
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=PhieuGiaoCa.xlsx",
      );
      res.send(buffer);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err.message });
    }
  },
);

// giao ca can bo
function ensureExcavator(map, excavatorCode) {
  if (!map[excavatorCode]) {
    map[excavatorCode] = {
      excavator: excavatorCode,
      vehicles: new Set(),
      materials: new Set(),
      locations: new Set(),
    };
  }
}

async function assignmentManagerData(query) {
  const orders = await Order.find(query)
    .populate("job", "type")
    .populate("device", "code")
    .populate("excavator.device", "code")
    .populate("repairVehicles.device", "code")
    .populate({
      path: "shiftReport",
      populate: [
        { path: "vehicleRepair.device", select: "code" },
        { path: "vehicleSummaries.vehicle", select: "code" },
      ],
    });

  // Tách loại order
  const ordersVanXe = orders.filter(
    (o) => o.job?.type === JOB_TYPE.VAN_HANH_XE,
  );
  const ordersVanXuc = orders.filter(
    (o) => o.job?.type === JOB_TYPE.VAN_HANH_XUC,
  );
  const ordersSuaChua = orders.filter(
    (o) => o.job?.type === JOB_TYPE.SUA_CHUA_BAO_DUONG,
  );

  // -----------------------------
  // 2. Lấy toàn bộ REPORT theo tất cả orderId
  // -----------------------------
  const allOrderIds = orders.map((o) => o._id);

  const reports = await Report.find({ orderId: { $in: allOrderIds } })
    .populate("device", "code")
    .populate("excavator", "code")
    .populate("material", "name acceptedProduct")
    .populate("toLocation", "name");

  // -----------------------------
  // 3. BẢNG 1 – GOM HOẠT ĐỘNG THEO MÁY XÚC
  // -----------------------------
  let activityMap = {};

  // ---- VẬN HÀNH XE ----
  for (const order of ordersVanXe) {
    const reps = reports.filter(
      (r) => r.orderId.toString() === order._id.toString(),
    );

    for (const r of reps) {
      const excavator = r.excavator?.code || "";

      ensureExcavator(activityMap, excavator);

      activityMap[excavator].vehicles.add(r.device?.code);
      activityMap[excavator].materials.add(r.material?.name);
      activityMap[excavator].locations.add(r.toLocation?.name);
    }
  }

  // ---- VẬN HÀNH XÚC ----
  for (const order of ordersVanXuc) {
    const excavator = order.device[0]?.code || "";

    const reps = reports.filter(
      (r) => r.orderId.toString() === order._id.toString(),
    );

    ensureExcavator(activityMap, excavator);

    for (const r of reps) {
      activityMap[excavator].vehicles.add(r.device?.code);
      activityMap[excavator].materials.add(r.material?.name);
      activityMap[excavator].locations.add(r.toLocation?.name);
    }
  }

  const activity = Object.values(activityMap).map((e) => ({
    excavator: e.excavator,
    vehicles: [...e.vehicles].filter(Boolean),
    materials: [...e.materials].filter(Boolean),
    locations: [...e.locations].filter(Boolean),
  }));

  // -----------------------------
  // 4. BẢNG 2 – THIẾT BỊ DỪNG, SỬA CHỮA
  // -----------------------------
  let repairs = [];

  for (const order of ordersSuaChua) {
    const shiftRepair = order.shiftReport?.vehicleRepair || [];

    for (const rv of order.repairVehicles || []) {
      const matched = shiftRepair.find(
        (x) => x.device?._id.toString() === rv.device?._id.toString(),
      );

      repairs.push({
        vehicle: rv.device?.code || "",
        status: rv.note || "", // Tình trạng
        result: matched?.status || "", // Kết quả sửa chữa
        note: "", // Ghi chú
      });
    }
  }
  return {
    activity,
    repairs,
  };
}

router.post(
  "/assignmentManager/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res) => {
    try {
      const { shift, day, department } = req.body;
      const user = req.user;

      let query = {};
      query.department =
        user.role === ROLE.ADMIN ? department : user.department?._id;

      if (shift?.length) query.shift = { $in: shift };

      if (day) {
        query.workingDate = new Date(day);
      }

      const { activity, repairs } = await assignmentManagerData(query);

      res.status(200).json({
        status: "success",
        data: [
          {
            activity, // Bảng 1
            repairs, // Bảng 2
          },
        ],
      });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

router.post(
  "/assignmentManager",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res) => {
    try {
      const { shift, day, department, signature } = req.body;
      const user = req.user;
      const shiftList = await Shift.find({ _id: { $in: shift } });
      let query = {};
      let dep = department
        ? await Department.findById(department).select("_id")
        : user?.department?._id;

      query.department = dep?._id;

      if (shift?.length) query.shift = { $in: shift };

      if (day) {
        query.workingDate = new Date(day);
      }

      const { activity, repairs } = await assignmentManagerData(query);

      const MIN_LEFT = 12;
      const MIN_RIGHT = 20;

      const activityFilled = [
        ...activity,
        ...Array.from(
          { length: Math.max(0, MIN_LEFT - activity.length) },
          () => ({
            excavator: "",
            vehicles: [],
            materials: [],
            locations: [],
          }),
        ),
      ];

      const repairsFilled = [
        ...repairs,
        ...Array.from(
          { length: Math.max(0, MIN_RIGHT - repairs.length) },
          () => ({
            vehicle: "",
            status: "",
            result: "",
            note: "",
          }),
        ),
      ];

      const workbook = new ExcelJS.Workbook();

      // ==== BORDER CONSTANTS (PHẢI ĐẶT TRƯỚC MỚI ĐƯỢC DÙNG) ====
      const thin = { style: "thin" };
      const fullBorder = { top: thin, bottom: thin, left: thin, right: thin };

      const sheetName = "GiaoCa";

      const ws = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: false }],
      });

      // ===== PAGE SETUP =====

      ws.pageSetup = {
        paperSize: 9, // A4
        orientation: "landscape", // ngang
        fitToPage: true,
        fitToWidth: 1, // vừa 1 trang theo chiều ngang
        fitToHeight: 0, // không ép theo chiều dọc
        margins: {
          left: 0.3,
          right: 0.3,
          top: 0.5,
          bottom: 0.3,
          header: 0.2,
          footer: 0.2,
        }, // inch
      };

      // ===== COLUMN WIDTHS =====
      ws.columns = [
        { width: 5 },
        { width: 10 },
        { width: 20 },
        { width: 14 },
        { width: 14 },
        { width: 2 },
        { width: 2 },
        { width: 5 },
        { width: 10 },
        { width: 20 },
        { width: 22 },
        { width: 10 },
        { width: 2 },
        { width: 2 },
      ];

      let r = 1;

      // ===== TITLE =====
      ws.mergeCells(`A${r}:N${r} `);
      ws.getCell(`A${r} `).value = "SỔ GIAO CA CÁN BỘ";
      ws.getCell(`A${r} `).font = { bold: true, size: 16 };
      ws.getCell(`A${r} `).alignment = { horizontal: "center" };
      r += 2;

      // ===== INFO =====
      ws.mergeCells(`A${r}:N${r} `);
      ws.getCell(`A${r} `).value =
        `Ca  ${" ".repeat(6)} ${shiftList[0]?.name}${" ".repeat(6)} ngày ${" ".repeat(6)} ${dayjs(day)?.date()}${" ".repeat(6)} tháng ${" ".repeat(6)}${dayjs(day)?.month() + 1}${" ".repeat(6)} năm ${" ".repeat(6)}${dayjs(day)?.year()}${" ".repeat(15)} Tên cán bộ: ${user?.fullName}`;
      ws.getCell(`A${r} `).alignment = { horizontal: "center" };
      r += 1;

      // ===== LEFT TABLE TITLE =====
      ws.getCell(`A${r} `).value = "I – Tình hình hoạt động trong ca:";
      ws.getCell(`A${r} `).font = { bold: true };
      r += 2;

      // ===== LEFT HEADER =====
      ws.getRow(r).values = [
        ,
        "STT",
        "MÁY XÚC",
        "SỐ XE",
        "HÀNG V/C",
        "BÃI THẢI",
      ];
      ["A", "B", "C", "D", "E"].forEach((col) => {
        ws.getCell(`${col}${r} `).border = fullBorder;
        ws.getCell(`${col}${r} `).alignment = { horizontal: "center" };
      });
      r++;

      // ===== 12 LEFT EMPTY ROWS =====
      for (let i = 0; i < activityFilled.length; i++) {
        const rowData = activityFilled[i];

        ws.getRow(r).values = [
          ,
          i + 1,
          rowData.excavator,
          rowData.vehicles.join(", "),
          rowData.materials.join(", "),
          rowData.locations.join(", "),
        ];

        ["A", "B", "C", "D", "E"].forEach((col) => {
          const cell = ws.getCell(`${col}${r}`);
          cell.border = fullBorder;
          cell.alignment = {
            horizontal: col === "A" ? "center" : "left",
            vertical: "middle",
            wrapText: true,
          };
        });

        r++;
      }
      ws.mergeCells(`A${r}:E${r} `);
      ws.getCell(`A${r} `).value =
        ` - Các thiết bị kiểm tu, bảo dưỡng bao gồm: `;
      ws.mergeCells(`A${r + 1}:E${r + 1} `);
      ws.getCell(`A${r + 1} `).value = ` + Kiểm tu: ` + ".".repeat(150);
      ws.mergeCells(`A${r + 2}:E${r + 2} `);
      ws.getCell(`A${r + 2} `).value =
        ` + Bảo dưỡng cấp 1(250h): ` + ".".repeat(150);
      ws.mergeCells(`A${r + 3}:E${r + 3} `);
      ws.getCell(`A${r + 3} `).value =
        ` + Bảo dưỡng cấp 2(500h): ` + ".".repeat(150);
      ws.mergeCells(`A${r + 4}:E${r + 4} `);
      ws.getCell(`A${r + 4} `).value =
        ` + Bảo dưỡng cấp 1000h: ` + ".".repeat(150);
      ws.mergeCells(`A${r + 5}:E${r + 5} `);
      ws.getCell(`A${r + 5} `).value =
        ` + Bảo dưỡng cấp 2000h: ` + ".".repeat(150);
      ws.mergeCells(`A${r + 6}:E${r + 6} `);
      ws.getCell(`A${r + 6} `).value =
        ` + Các thiết bị trung đại tu: ` + ".".repeat(150);
      ws.mergeCells(`A${r + 7}:E${r + 7} `);
      ws.getCell(`A${r + 7} `).value =
        ` + Các thiết bị sửa chữa đột xuất lớn: ` + ".".repeat(150);

      // ===== RIGHT TABLE TITLE =====
      ws.getCell(`H4`).value = "Các thiết bị dừng do các lý do khác nhau:";
      ws.getCell(`H4`).font = { bold: true };

      // ===== RIGHT HEADER =====
      ws.getRow(6).getCell("H").value = "STT";
      ws.getRow(6).getCell("I").value = "SỐ XE";
      ws.getRow(6).getCell("J").value = "TÌNH TRẠNG HƯ HỎNG";
      ws.getRow(6).getCell("K").value = "KẾT QUẢ SC TRONG CA";
      ws.getRow(6).getCell("L").value = "GHI CHÚ";

      ["H", "I", "J", "K", "L"].forEach((col) => {
        ws.getCell(`${col} 6`).border = fullBorder;
        ws.getCell(`${col} 6`).alignment = { horizontal: "center" };
      });

      // ===== 20 RIGHT EMPTY ROWS =====
      let rr = 7;

      for (let i = 0; i < repairsFilled.length; i++) {
        const rowData = repairsFilled[i];

        ws.getCell(`H${rr}`).value = i + 1;
        ws.getCell(`I${rr}`).value = rowData.vehicle;
        ws.getCell(`J${rr}`).value = rowData.status;
        ws.getCell(`K${rr}`).value = rowData.result;
        ws.getCell(`L${rr}`).value = rowData.note;

        ["H", "I", "J", "K", "L"].forEach((col) => {
          const cell = ws.getCell(`${col}${rr}`);
          cell.border = fullBorder;
          cell.alignment = {
            horizontal: col === "H" ? "center" : "left",
            vertical: "middle",
            wrapText: true,
          };
        });

        rr++;
      }

      // ===== TÍNH TOÁN DÒNG BẮT ĐẦU CHO PHẦN CHÂN TRANG (SECTION II, III) =====
      // r + 7 là dòng cuối cùng của bảng bên trái
      // rr là dòng cuối cùng của bảng bên phải
      // Ta lấy dòng sâu nhất cộng thêm 2 dòng trống để cho thoáng
      let maxBottomRow = Math.max(r + 7, rr) + 2;

      // ===== SECTION II =====
      let r2 = maxBottomRow;

      ws.mergeCells(`A${r2}:G${r2}`);
      ws.getCell(`A${r2}`).value =
        "II – Nội dung công việc trong ca và bàn giao sau ca:";
      ws.getCell(`A${r2}`).font = { bold: true };
      ws.getCell(`A${r2}`).alignment = {
        vertical: "center",
        horizontal: "center",
      };

      // ===== SECTION III – Nửa phải =====
      let r3 = maxBottomRow;

      ws.mergeCells(`H${r3}:N${r3}`);
      ws.getCell(`H${r3}`).value = "III – Dự báo nguy cơ mất an toàn:";
      ws.getCell(`H${r3}`).font = { bold: true };
      ws.getCell(`H${r3}`).alignment = {
        vertical: "center",
        horizontal: "center",
      };

      // ===== SIGNATURES =====
      let sigTitleRow = maxBottomRow + 4; // Cách phần title 4 dòng

      ws.mergeCells(`A${sigTitleRow}:E${sigTitleRow}`);
      ws.getCell(`A${sigTitleRow}`).value = "NGƯỜI GIAO";
      ws.getCell(`A${sigTitleRow}`).alignment = { horizontal: "center" };
      ws.getCell(`A${sigTitleRow}`).font = { bold: true };

      ws.mergeCells(`H${sigTitleRow}:L${sigTitleRow}`);
      ws.getCell(`H${sigTitleRow}`).value = "NGƯỜI NHẬN";
      ws.getCell(`H${sigTitleRow}`).alignment = { horizontal: "center" };
      ws.getCell(`H${sigTitleRow}`).font = { bold: true };

      let sigSubRow = sigTitleRow + 1;
      ws.mergeCells(`A${sigSubRow}:E${sigSubRow}`);
      ws.getCell(`A${sigSubRow}`).value = "(Ký và ghi rõ họ tên)";
      ws.getCell(`A${sigSubRow}`).alignment = { horizontal: "center" };

      ws.mergeCells(`H${sigSubRow}:L${sigSubRow}`);
      ws.getCell(`H${sigSubRow}`).value = "(Ký và ghi rõ họ tên)";
      ws.getCell(`H${sigSubRow}`).alignment = { horizontal: "center" };

      if (signature) {
        const response = await axios.get(signature, {
          responseType: "arraybuffer",
        });
        const extension = response.headers["content-type"].split("/")[1];
        const imageBuffer = Buffer.from(response.data, "binary");

        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension,
        });

        // Chèn ảnh chữ ký cách dòng phụ đề 1 dòng
        let imageRow = sigSubRow + 1;
        ws.addImage(imageId, {
          tl: { col: 2.5, row: imageRow },
          ext: { width: 100, height: 30 },
        });
      }

      // Đoạn tiếp theo vẫn giữ nguyên: ws.eachRow((row, rowNumber) => { ...

      ws.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.font = {
            name: "Times New Roman",
            size: rowNumber > 1 ? 10 : 16,
            bold: cell.font?.bold || false,
            italic: cell.font?.italic || false,
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename*=UTF-8''GiaoCa.xlsx",
      );

      res.send(buffer);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message });
    }
  },
);

// cham cong
router.post(
  "/attendance/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res) => {
    try {
      const { date, department } = req.body;
      const user = req.user;

      // Bước 1: xác định department
      let dep = department
        ? await Department.findById(department).select("_id")
        : user?.department?._id;

      const inputDate = dayjs(date, "MM/YYYY");

      // Ngày đầu tháng (00:00:00.00)
      const startDate = inputDate.startOf("month").toDate();

      // Ngày cuối tháng (23:59:59.999)
      const endDate = inputDate.endOf("month").toDate();

      // Bước 3: lấy tất cả order trong range ngày
      // (Bước 2 — danh sách nhân viên — làm sau khi có lệnh, vì phụ thuộc vào lệnh đã chốt: xem utils/roster.js)
      const orders = await Order.find({
        department: dep,
        status: { $in: [STATUS_ORDER.INPROGRESS, STATUS_ORDER.COMPLETED] },
        workingDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      })
        .populate("assignedTo", "fullName salaryCode")
        .populate("shift", "name")
        .lean();

      // Bước 2: danh sách nhân viên = người có lệnh ở đơn vị trong tháng + thành viên đơn vị vào cuối tháng
      // (không còn lấy theo đơn vị HIỆN TẠI của nhân viên nên chuyển đơn vị không làm lệch tháng cũ)
      const users = await attendanceRoster({ depId: dep, endDate, orders });

      // Bước 4: group theo user + ngày + ca
      const attendanceMap = {};
      orders.forEach((o) => {
        const userId = o.assignedTo?._id?.toString();
        if (!userId) return;
        const date = dayjs(o.workingDate).format("YYYY-MM-DD");
        const shiftName = (o.shift?.name || "N").toString();

        attendanceMap[userId] ??= {};
        // Sử dụng Set để đảm bảo các ca trong ngày không bị lặp lại
        attendanceMap[userId][date] ??= new Set();

        // Thêm tên ca vào Set
        if (shiftName !== "N") {
          attendanceMap[userId][date].add(shiftName);
        }
      });

      // Bước 5: chuyển thành format cho bảng
      const dateRange = [];
      let current = dayjs(startDate);
      const end = dayjs(endDate);
      while (current.isBefore(end) || current.isSame(end)) {
        dateRange.push(current.format("YYYY-MM-DD"));
        current = current.add(1, "day");
      }

      const result = users.map((u) => {
        const days = {};
        let totalCa1 = 0,
          totalCa2 = 0,
          totalCa3 = 0,
          totalDay = 0;

        dateRange.forEach((d) => {
          // Lấy Set chứa danh sách tên ca đã làm trong ngày 'd'
          const shiftSet = attendanceMap[u._id]?.[d];

          if (!shiftSet || shiftSet.size === 0) {
            // Không có lệnh/ca nào
            days[d] = "N";
          } else {
            // Chuyển Set thành mảng, sắp xếp, và nối thành chuỗi
            const caList = Array.from(shiftSet).sort();

            // HIỂN THỊ: Ghi ra danh sách các ca đã làm (ví dụ: "1" hoặc "1,2")
            days[d] = caList.join(",");

            // TỔNG CÔNG: Nếu có bất kỳ ca nào, tính là 1 công
            totalDay += caList.length;

            // TỔNG SỐ CA ĐÃ THỰC HIỆN
            if (shiftSet.has("1")) totalCa1++;
            if (shiftSet.has("2")) totalCa2++;
            if (shiftSet.has("3")) totalCa3++;
            // Có thể thêm logic xử lý các ca khác nếu có
          }
        });

        return {
          userId: u._id,
          fullName: u?.fullName,
          salaryCode: u?.salaryCode,
          days,
          totalDay,
          totalCa1,
          totalCa2,
          totalCa3,
        };
      });

      res.status(200).json({
        status: "success",
        data: [
          {
            data: result,
            dateRange: dateRange,
          },
        ],
      });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load bảng chấm công", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
router.post(
  "/attendance",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res) => {
    try {
      const { date, department, signature } = req.body;
      const user = req.user;

      // Bước 1: xác định department
      // ... (Logic xác định dep giữ nguyên)
      let depId = department
        ? await Department.findById(department).select("_id")
        : user?.department?._id;

      const depInfo = await Department.findById(depId).select("code");

      const inputDate = dayjs(date, "MM/YYYY");
      const startDate = inputDate.startOf("month").toDate();
      const endDate = inputDate.endOf("month").toDate();

      // Bước 2 & 3: Lấy danh sách nhân viên và Orders
      // ... (Logic lấy users và orders giữ nguyên)
      const orders = await Order.find({
        department: depId,
        status: { $in: [STATUS_ORDER.INPROGRESS, STATUS_ORDER.COMPLETED] },
        workingDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      })
        .populate("assignedTo", "fullName salaryCode")
        .populate("shift", "name")
        .lean();

      // Danh sách nhân viên = người có lệnh ở đơn vị trong tháng + thành viên đơn vị vào cuối tháng
      // (không còn lấy theo đơn vị HIỆN TẠI của nhân viên nên chuyển đơn vị không làm lệch tháng cũ)
      const users = await attendanceRoster({ depId, endDate, orders });

      // Bước 4: group theo user + ngày + ca (Giữ nguyên)
      const attendanceMap = {};
      orders.forEach((o) => {
        const userId = o.assignedTo?._id?.toString();
        if (!userId) return;
        const dateKey = dayjs(o.workingDate).format("YYYY-MM-DD");
        const shiftName = (o.shift?.name || "N").toString();

        attendanceMap[userId] ??= {};
        attendanceMap[userId][dateKey] ??= new Set();

        if (shiftName !== "N") {
          attendanceMap[userId][dateKey].add(shiftName);
        }
      });

      // Bước 5: Tạo dateRange và Result
      const dateRange = [];
      let current = dayjs(startDate);
      const end = dayjs(endDate);
      while (current.isBefore(end) || current.isSame(end)) {
        dateRange.push(current); // Lưu Dayjs object để lấy Thứ và Ngày
        current = current.add(1, "day");
      }

      // Chuyển dateRange sang chuỗi định dạng (YYYY-MM-DD) cho logic map
      const dateRangeKeys = dateRange.map((d) => d.format("YYYY-MM-DD"));

      const result = users.map((u) => {
        const days = {};
        let totalCa1 = 0,
          totalCa2 = 0,
          totalCa3 = 0,
          totalDay = 0; // totalDay = Tổng số ngày công

        dateRangeKeys.forEach((d) => {
          const shiftSet = attendanceMap[u._id]?.[d]; // Lấy Set ca

          if (!shiftSet || shiftSet.size === 0) {
            days[d] = "N";
          } else {
            // Lấy danh sách ca đã làm trong ngày
            const caList = Array.from(shiftSet).sort();
            // HIỂN THỊ: Ghi ra danh sách các ca đã làm (ví dụ: "1" hoặc "1,2")
            days[d] = caList.join(",");

            // TỔNG CÔNG: Nếu có bất kỳ ca nào, tính là 1 công
            totalDay += caList.length;

            // TỔNG SỐ CA ĐÃ THỰC HIỆN
            if (shiftSet.has("1")) totalCa1++;
            if (shiftSet.has("2")) totalCa2++;
            if (shiftSet.has("3")) totalCa3++;
          }
        });

        return {
          userId: u._id,
          fullName: u?.fullName,
          salaryCode: u?.salaryCode,
          days,
          totalDay, // 1 công/ngày
          totalCa1,
          totalCa2,
          totalCa3,
        };
      });

      // --- TẠO DÒNG TỔNG CỘNG (Summary Row) ---
      let grandTotalDay = 0,
        grandTotalCa1 = 0,
        grandTotalCa2 = 0,
        grandTotalCa3 = 0;
      result.forEach((r) => {
        grandTotalDay += r.totalDay;
        grandTotalCa1 += r.totalCa1;
        grandTotalCa2 += r.totalCa2;
        grandTotalCa3 += r.totalCa3;
      });

      const summaryRow = {
        fullName: "TỔNG CỘNG",
        totalDay: grandTotalDay,
        totalCa1: grandTotalCa1,
        totalCa2: grandTotalCa2,
        totalCa3: grandTotalCa3,
      };

      // --- BƯỚC 6: TẠO FILE EXCEL ---

      const workbook = new ExcelJS.Workbook();
      // Đảm bảo bạn đã cài đặt locale 'vi' cho Dayjs ở BE nếu cần
      const depCode = depInfo?.code ? depInfo.code.toString() : ""; // Ép về chuỗi
      const sheetName = `ChamCong_${depCode} `;
      const worksheet = workbook.addWorksheet(sheetName);

      // 1. Dòng Tiêu đề Báo cáo
      const startCol = 1; // A
      const endCol = 2 + dateRange.length + 4; // STT, Họ tên + Cột ngày + 4 cột tổng

      worksheet.mergeCells(1, startCol, 1, endCol);
      const infoRow = worksheet.getCell(1, startCol);
      infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
      infoRow.font = { italic: true, size: 18 };
      infoRow.alignment = { horizontal: "left", vertical: "middle" };

      // Dòng 2: Tiêu đề chính
      worksheet.mergeCells(3, startCol, 3, endCol);
      const headerCell = worksheet.getCell(3, startCol);
      headerCell.value = `BẢNG CHẤM CÔNG`;
      headerCell.font = { bold: true, size: 16 };
      headerCell.alignment = { horizontal: "center", vertical: "middle" };

      // Dòng 3: Thời gian
      worksheet.mergeCells(4, startCol, 4, endCol);
      worksheet.getCell(4, startCol).value =
        `Tháng ${inputDate.format("MM")} năm ${inputDate.format("YYYY")} `;
      worksheet.getCell(4, startCol).alignment = { horizontal: "center" };

      worksheet.mergeCells(5, startCol, 5, endCol);
      worksheet.getCell(5, startCol).value = `Đơn vị: ${depCode} `;
      worksheet.getCell(5, startCol).alignment = { horizontal: "center" };

      // Dòng 5: Tiêu đề Cột chính (STT, Họ Tên, Tổng)
      const headerRowNumber = 7;
      let colIndex = 1;

      // Header 1: STT
      worksheet.mergeCells(
        headerRowNumber,
        colIndex,
        headerRowNumber + 1,
        colIndex,
      );
      worksheet.getCell(headerRowNumber, colIndex).value = "TT";
      worksheet.getColumn(colIndex).width = 5;
      colIndex++;

      // Header 2: Họ và tên
      worksheet.mergeCells(
        headerRowNumber,
        colIndex,
        headerRowNumber + 1,
        colIndex,
      );
      worksheet.getCell(headerRowNumber, colIndex).value = "Họ và tên";
      worksheet.getColumn(colIndex).width = 25;
      colIndex++;

      worksheet.mergeCells(
        headerRowNumber,
        colIndex,
        headerRowNumber + 1,
        colIndex,
      );
      worksheet.getCell(headerRowNumber, colIndex).value = "Số thẻ";
      worksheet.getColumn(colIndex).width = 15;
      colIndex++;

      // Header 3: Cột Ngày (Cần xử lý phức tạp hơn)
      const startDayCol = colIndex;
      dateRange.forEach((dayjsObject) => {
        const day = dayjsObject.format("DD"); // Ngày
        const dayOfWeek = dayjsObject.format("dd"); // Thứ (T2, T3, CN,...)

        // Dòng 5: Ngày
        worksheet.getCell(headerRowNumber, colIndex).value = day;
        worksheet.getColumn(colIndex).width = 4;

        // Dòng 6: Thứ
        worksheet.getCell(headerRowNumber + 1, colIndex).value = dayOfWeek;

        colIndex++;
      });

      // Header 4: Cột Tổng Hợp
      // Merge tiêu đề "Tổng Hợp"
      const startTotalCol = colIndex;
      const endTotalCol = colIndex + 3;
      worksheet.mergeCells(
        headerRowNumber,
        startTotalCol,
        headerRowNumber,
        endTotalCol,
      );
      worksheet.getCell(headerRowNumber, startTotalCol).value = "Tổng Cộng";

      // Dòng 6: Các cột con (Tổng, Ca1, Ca2, Ca3)
      worksheet.getCell(headerRowNumber + 1, colIndex++).value = "Tổng";
      worksheet.getCell(headerRowNumber + 1, colIndex++).value = "Ca1";
      worksheet.getCell(headerRowNumber + 1, colIndex++).value = "Ca2";
      worksheet.getCell(headerRowNumber + 1, colIndex++).value = "Ca3";

      // --- ĐIỀN DỮ LIỆU CỦA TỪNG NHÂN VIÊN ---
      let dataRowNumber = headerRowNumber + 2; // Bắt đầu từ dòng 7

      const allRows = [...result, summaryRow];

      allRows.forEach((row, rowIndex) => {
        let cellColIndex = 1;

        // 1. TT / Bỏ trống cho dòng Tổng Cộng
        const sttValue = row.fullName === "TỔNG CỘNG" ? "" : rowIndex + 1;
        worksheet.getCell(dataRowNumber, cellColIndex++).value = sttValue;

        // 2. Họ và tên
        worksheet.getCell(dataRowNumber, cellColIndex++).value = row.fullName;

        worksheet.getCell(dataRowNumber, cellColIndex++).value = row.salaryCode;

        // 3. Dữ liệu ngày
        dateRange.forEach((dayjsObject) => {
          const dateKey = dayjsObject.format("YYYY-MM-DD");
          let cellValue = "";

          if (row.fullName !== "TỔNG CỘNG") {
            cellValue = row.days?.[dateKey] || "N";
          }
          // Nếu là dòng Tổng Cộng, ô ngày để trống.

          worksheet.getCell(dataRowNumber, cellColIndex++).value = cellValue;
        });

        // 4. Tổng ca
        worksheet.getCell(dataRowNumber, cellColIndex++).value = row.totalDay;
        worksheet.getCell(dataRowNumber, cellColIndex++).value = row.totalCa1;
        worksheet.getCell(dataRowNumber, cellColIndex++).value = row.totalCa2;
        worksheet.getCell(dataRowNumber, cellColIndex++).value = row.totalCa3;

        dataRowNumber++;
      });

      addTableBorders(worksheet, 7, dataRowNumber - 1, 1, endTotalCol);
      const signatureStartRow = dataRowNumber + 1;
      const signatureEndRow = signatureStartRow + 3;
      if (signature) {
        const response = await axios.get(signature, {
          responseType: "arraybuffer",
        });
        const extension = response.headers["content-type"].split("/")[1];
        const imageBuffer = Buffer.from(response.data, "binary");

        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension,
        });

        worksheet.mergeCells(
          `${startTotalCol}${signatureStartRow}:${endTotalCol}${signatureEndRow} `,
        );

        // Gán ảnh trực tiếp vào range
        worksheet.addImage(imageId, {
          tl: {
            col: startTotalCol - 1 + 0.1,
            row: signatureStartRow - 1 + 0.1,
          }, // Đặt tl (top-left) có offset nhỏ
          br: { col: endTotalCol - 0.1, row: signatureEndRow - 0.1 }, // Đặt br (bottom-right) có offset nhỏ
        });
      }
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

      // --- ÁP DỤNG STYLES CHO BẢNG DỮ LIỆU ---
      const finalRow = dataRowNumber - 1;
      const finalCol = colIndex - 1;

      const headerStyle = {
        font: { bold: true },
        alignment: { vertical: "middle", horizontal: "center", wrapText: true },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD3D3D3" },
        },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };

      const dataStyle = {
        alignment: { vertical: "middle", horizontal: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };

      // Apply style cho header (Dòng 5 và 6)
      worksheet.getRows(headerRowNumber, 2).forEach((row) => {
        row.eachCell((cell) => {
          Object.assign(cell, headerStyle);
        });
      });

      // Apply style cho data (Dòng 7 đến finalRow)
      worksheet
        .getRows(headerRowNumber + 2, finalRow - (headerRowNumber + 1))
        .forEach((row) => {
          row.eachCell((cell, colNum) => {
            Object.assign(cell, dataStyle);
            // Cột Họ tên (Cột 2) căn trái
            if (colNum === 2) {
              cell.alignment = { vertical: "middle", horizontal: "left" };
            }
          });
        });

      // Gửi file
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename *= UTF - 8'' *.xlsx`,
      );
      res.send(buffer);
      req.logger.info(`✅ Export excel thành công`);
    } catch (err) {
      req.logger.error("❌ Lỗi khi export bảng chấm công", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

//  bao cao chuyen theo ngay oto mau 03
router.post(
  "/carTripReportByDay/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { day, department, shift } = req.body;
      const user = req.user;
      let query = {};

      // 1. Lọc theo Department và Date
      if (user?.role === ROLE.ADMIN) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }

      if (day) {
        query.workingDate = new Date(day);
      } else {
        return res
          .status(400)
          .json({ status: "error", message: "Ngày là bắt buộc" });
      }

      if (shift && shift.length > 0) {
        const shiftIds = shift.map(s => typeof s === 'object' ? s._id : s);
        query.shift = { $in: shiftIds };
      }

      const orders = await Order.find(query)
        .populate("shift", "name")
        .populate("job", "type");

      const filterOrders = orders.filter(
        (r) => r.job?.type === JOB_TYPE.VAN_HANH_XE,
      );

      // 2. Khởi tạo cấu trúc dữ liệu tổng hợp
      let aggregatedData = {};
      if (shift && shift.length > 0) {
        const shiftIds = shift.map(s => typeof s === 'object' ? s._id : s);
        const selectedShifts = await Shift.find({ _id: { $in: shiftIds } });
        selectedShifts.forEach(s => {
          if (s.name) aggregatedData[s.name] = {};
        });
      } else {
        aggregatedData = { 1: {}, 2: {}, 3: {} };
      }
      const uniqueHeaderKeysDat = new Set(); // Set lưu trữ key header Đất duy nhất (MX | Nơi đổ)
      const uniqueHeaderKeysThan = new Set(); // Set lưu trữ key header Than duy nhất (MX | Nơi đổ)
      let grandTotalDat = 0;
      let grandTotalThan = 0;

      // 3. Vòng lặp Xử lý Reports và Tổng hợp Dữ liệu/Header
      for (const order of filterOrders) {
        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code category",
            populate: { path: "category", select: "name" },
          })
          .populate("material", "name acceptedProduct")
          .populate("excavator", "code")
          .populate("toLocation", "name");

        // Lọc chỉ lấy báo cáo của xe vận tải
        reports = reports.filter((r) =>
          r.device?.category?.name
            ?.toLowerCase()
            .includes("vận tải".toLowerCase()),
        );

        if (!reports.length) continue;

        const shiftName = order.shift?.name;
        if (!shiftName || !aggregatedData[shiftName]) continue;

        for (const report of reports) {
          const carCode = report.device?.code;
          const materialType = report.material?.acceptedProduct;
          const excavatorCode = report.excavator?.code || "Không rõ";
          const toLocationName = report.toLocation?.name || "Không rõ";
          const quantity = report.quantity || 0;

          if (!carCode || quantity === 0) continue;

          if (!aggregatedData[shiftName][carCode]) {
            aggregatedData[shiftName][carCode] = {
              Dat: { totalTrips: 0, detailsMap: {} }, // Dùng detailsMap (Object) để tra cứu
              Than: { totalTrips: 0, detailsMap: {} },
            };
          }

          const carData = aggregatedData[shiftName][carCode];
          const detailKey = `${excavatorCode} | ${toLocationName} `;

          // Cập nhật theo loại vật liệu
          if (materialType === ACCEPTED_PRODUCT.LAND) {
            carData.Dat.totalTrips += quantity;
            grandTotalDat += quantity;
            uniqueHeaderKeysDat.add(detailKey); // Thêm vào Set header

            if (!carData.Dat.detailsMap[detailKey]) {
              carData.Dat.detailsMap[detailKey] = { trips: 0 };
            }
            carData.Dat.detailsMap[detailKey].trips += quantity;
          } else if (materialType === ACCEPTED_PRODUCT.COAL) {
            carData.Than.totalTrips += quantity;
            grandTotalThan += quantity;
            uniqueHeaderKeysThan.add(detailKey); // Thêm vào Set header

            if (!carData.Than.detailsMap[detailKey]) {
              carData.Than.detailsMap[detailKey] = { trips: 0 };
            }
            carData.Than.detailsMap[detailKey].trips += quantity;
          }
        }
      }

      // 4. Tạo Danh sách Header Duy nhất (từ Set)
      const createHeaders = (keysSet) =>
        Array.from(keysSet)
          .map((key) => {
            const [excavator, toLocation] = key.split(" | ");
            return { key, excavator, toLocation };
          })
          .sort((a, b) => a.key.localeCompare(b.key)); // Sắp xếp theo key

      const uniqueHeadersDat = createHeaders(uniqueHeaderKeysDat);
      const uniqueHeadersThan = createHeaders(uniqueHeaderKeysThan);

      // 5. Kết hợp vào Cấu trúc Kết quả Cuối cùng
      let finalResult = {
        uniqueHeadersDat,
        uniqueHeadersThan,
        shifts: [],
        grandTotal: {
          grandTotalDat,
          grandTotalThan,
          grandTotalAll: grandTotalDat + grandTotalThan,
        },
      };

      // Lặp qua Ca để định dạng lại
      for (const [shiftName, shiftData] of Object.entries(aggregatedData)) {
        const shiftCars = [];
        let totalTripsInShift = 0;

        for (const [carCode, carData] of Object.entries(shiftData)) {
          const totalDat = carData.Dat.totalTrips;
          const totalThan = carData.Than.totalTrips;
          const totalCarTrips = totalDat + totalThan;
          totalTripsInShift += totalCarTrips;

          shiftCars.push({
            carCode,
            totalDat,
            totalThan,
            totalCarTrips, // TỔNG HỢP CHUYẾN
            datDetailsMap: carData.Dat.detailsMap,
            thanDetailsMap: carData.Than.detailsMap,
          });
        }

        finalResult.shifts.push({
          shiftName,
          cars: shiftCars,
          totalTripsInShift,
        });
      }

      // Gửi kết quả
      res.status(200).send({ status: "success", data: [finalResult] });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/carTripReportByDay",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { day, department, signature, shift } = req.body;
      const user = req.user;
      let query = {};

      // 1. Lọc theo Department và Date
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      if (day) {
        query.workingDate = new Date(day);
      } else {
        return res
          .status(400)
          .json({ status: "error", message: "Ngày là bắt buộc" });
      }

      if (shift && shift.length > 0) {
        const shiftIds = shift.map(s => typeof s === 'object' ? s._id : s);
        query.shift = { $in: shiftIds };
      }

      const orders = await Order.find({ ...query, department: dep })
        .populate("shift", "name")
        .populate("job", "type");

      const filterOrders = orders.filter(
        (r) => r.job?.type === JOB_TYPE.VAN_HANH_XE,
      );

      // 2. Khởi tạo cấu trúc dữ liệu tổng hợp
      let aggregatedData = {};
      if (shift && shift.length > 0) {
        const shiftIds = shift.map(s => typeof s === 'object' ? s._id : s);
        const selectedShifts = await Shift.find({ _id: { $in: shiftIds } });
        selectedShifts.forEach(s => {
          if (s.name) aggregatedData[s.name] = {};
        });
      } else {
        aggregatedData = { 1: {}, 2: {}, 3: {} };
      }
      const uniqueHeaderKeysDat = new Set(); // Set lưu trữ key header Đất duy nhất (MX | Nơi đổ)
      const uniqueHeaderKeysThan = new Set(); // Set lưu trữ key header Than duy nhất (MX | Nơi đổ)
      let grandTotalDat = 0;
      let grandTotalThan = 0;

      // 3. Vòng lặp Xử lý Reports và Tổng hợp Dữ liệu/Header
      for (const order of filterOrders) {
        let reports = await Report.find({ orderId: order._id })
          .populate({
            path: "device",
            select: "code category",
            populate: { path: "category", select: "name" },
          })
          .populate("material", "name acceptedProduct")
          .populate("excavator", "code")
          .populate("toLocation", "name");

        // Lọc chỉ lấy báo cáo của xe vận tải
        reports = reports.filter((r) =>
          r.device?.category?.name
            ?.toLowerCase()
            .includes("vận tải".toLowerCase()),
        );

        if (!reports.length) continue;

        const shiftName = order.shift?.name;
        if (!shiftName || !aggregatedData[shiftName]) continue;

        for (const report of reports) {
          const carCode = report.device?.code;
          const materialType = report.material?.acceptedProduct;
          const excavatorCode = report.excavator?.code || "Không rõ";
          const toLocationName = report.toLocation?.name || "Không rõ";
          const quantity = report.quantity || 0;

          if (!carCode || quantity === 0) continue;

          if (!aggregatedData[shiftName][carCode]) {
            aggregatedData[shiftName][carCode] = {
              Dat: { totalTrips: 0, detailsMap: {} }, // Dùng detailsMap (Object) để tra cứu
              Than: { totalTrips: 0, detailsMap: {} },
            };
          }

          const carData = aggregatedData[shiftName][carCode];
          const detailKey = `${excavatorCode} | ${toLocationName} `;

          // Cập nhật theo loại vật liệu
          if (materialType === ACCEPTED_PRODUCT.LAND) {
            carData.Dat.totalTrips += quantity;
            grandTotalDat += quantity;
            uniqueHeaderKeysDat.add(detailKey); // Thêm vào Set header

            if (!carData.Dat.detailsMap[detailKey]) {
              carData.Dat.detailsMap[detailKey] = { trips: 0 };
            }
            carData.Dat.detailsMap[detailKey].trips += quantity;
          } else if (materialType === ACCEPTED_PRODUCT.COAL) {
            carData.Than.totalTrips += quantity;
            grandTotalThan += quantity;
            uniqueHeaderKeysThan.add(detailKey); // Thêm vào Set header

            if (!carData.Than.detailsMap[detailKey]) {
              carData.Than.detailsMap[detailKey] = { trips: 0 };
            }
            carData.Than.detailsMap[detailKey].trips += quantity;
          }
        }
      }

      // 4. Tạo Danh sách Header Duy nhất (từ Set)
      const createHeaders = (keysSet) =>
        Array.from(keysSet)
          .map((key) => {
            const [excavator, toLocation] = key.split(" | ");
            return { key, excavator, toLocation };
          })
          .sort((a, b) => a.key.localeCompare(b.key)); // Sắp xếp theo key

      const uniqueHeadersDat = createHeaders(uniqueHeaderKeysDat);
      const uniqueHeadersThan = createHeaders(uniqueHeaderKeysThan);

      // 5. Kết hợp vào Cấu trúc Kết quả Cuối cùng
      let finalResult = {
        uniqueHeadersDat,
        uniqueHeadersThan,
        shifts: [],
        grandTotal: {
          grandTotalDat,
          grandTotalThan,
          grandTotalAll: grandTotalDat + grandTotalThan,
        },
      };

      // Lặp qua Ca để định dạng lại
      for (const [shiftName, shiftData] of Object.entries(aggregatedData)) {
        const shiftCars = [];
        let totalTripsInShift = 0;

        for (const [carCode, carData] of Object.entries(shiftData)) {
          const totalDat = carData.Dat.totalTrips;
          const totalThan = carData.Than.totalTrips;
          const totalCarTrips = totalDat + totalThan;
          totalTripsInShift += totalCarTrips;

          shiftCars.push({
            carCode,
            totalDat,
            totalThan,
            totalCarTrips, // TỔNG HỢP CHUYẾN
            datDetailsMap: carData.Dat.detailsMap,
            thanDetailsMap: carData.Than.detailsMap,
          });
        }

        finalResult.shifts.push({
          shiftName,
          cars: shiftCars,
          totalTripsInShift,
        });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("bao_chuyen");

      // === 3️⃣ Header đa tầng (chuẩn form PDF) ===
      const center = { vertical: "middle", horizontal: "center" };

      // === Tính toán các chỉ số cột (ĐƯA LÊN ĐẦU) ===
      const landStart = 3;
      const landColCount = Math.max(uniqueHeadersDat.length, 1);
      const landEnd = landStart + landColCount - 1;
      const totalDatCol = landEnd + 1; // TỔNG CHUYẾN ĐẤT
      const coalStart = totalDatCol + 1;
      const coalColCount = Math.max(uniqueHeadersThan.length, 1);
      const coalEnd = coalStart + coalColCount - 1;
      const totalThanCol = coalEnd + 1; // TỔNG CHUYẾN THAN
      const grandCol = totalThanCol + 1; // TỔNG HỢP CHUYẾN
      const totalCols = grandCol; // Tổng số cột cần thiết

      // --- NEW TOP TITLE ROWS (1-4) ---

      // HÀNG 1: Tên công ty
      sheet.mergeCells(1, 1, 1, totalCols);
      const infoRow = sheet.getCell("A1");
      infoRow.value = "CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV";
      infoRow.font = { italic: true, size: 18 };
      sheet.getRow(1).eachCell((cell) => {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      });

      // HÀNG 2: Tiêu đề bảng
      sheet.mergeCells(2, 1, 2, totalCols);
      const header2 = sheet.getCell("A2");
      header2.value = `BÁO CÁO CHUYẾN: ${day ? dayjs(day).format("DD/MM/YYYY") : ""} `; // Đã sửa từ 'date' sang 'day'
      header2.font = { bold: true, size: 14 };
      header2.alignment = center;

      // HÀNG 4: Người báo cáo
      sheet.mergeCells(3, 1, 3, totalCols);
      const header3 = sheet.getCell("A3");
      header3.value = `Họ tên người báo cáo: ${user?.fullName || ""} `;
      header3.font = { bold: true, size: 10 };
      header3.alignment = center;

      // HÀNG 3: Phân Xưởng
      sheet.mergeCells(4, 1, 4, totalCols);
      const header4 = sheet.getCell("A4");
      header4.value = `PHÂN XƯỞNG VẬN TẢI: ${dep?.code || ""} `;
      header4.font = { bold: true, size: 12 };
      sheet.getRow(4).eachCell((cell) => {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      });

      // Dòng 5 sẽ trống để làm dải phân cách

      // --- MAIN TABLE HEADERS (ROWS 6 & 7) ---

      // CA (Hàng 6 & 7, Cột 1)
      sheet.mergeCells("A6", "A7");
      sheet.getCell("A6").value = "CA";
      sheet.getCell("A6").alignment = center;

      // SỐ XE (Hàng 6 & 7, Cột 2)
      sheet.mergeCells("B6", "B7");
      sheet.getCell("B6").value = "SỐ XE";
      sheet.getCell("B6").alignment = center;

      // --- NHÓM ĐẤT ---
      sheet.mergeCells(6, landStart, 6, totalDatCol); // Merge đến totalDatCol
      sheet.getCell(6, landStart).value = "ĐẤT, SPNT, BÙN ĐẶC, BÙN LOÃNG...";
      sheet.getCell(6, landStart).alignment = center;

      // Header con ĐẤT (Hàng 7)
      if (uniqueHeadersDat.length > 0) {
        uniqueHeadersDat.forEach((h, i) => {
          const col = landStart + i;
          sheet.getCell(7, col).value =
            `Máy xúc: ${h.excavator} \nNơi đổ: ${h.toLocation} `; // Đã sửa từ Hàng 2 -> Hàng 7
          sheet.getCell(7, col).alignment = {
            wrapText: true,
            vertical: "middle",
            horizontal: "center",
          };
        });
      } else {
        sheet.getCell(7, landStart).value = "-"; // Đã sửa từ Hàng 2 -> Hàng 7
        sheet.getCell(7, landStart).alignment = center;
      }

      // TỔNG CHUYẾN ĐẤT (Hàng 7)
      sheet.getCell(7, totalDatCol).value = "TỔNG CHUYẾN ĐẤT"; // Đã sửa từ Hàng 2 -> Hàng 7
      sheet.getCell(7, totalDatCol).alignment = center;

      // --- NHÓM THAN ---
      sheet.mergeCells(6, coalStart, 6, totalThanCol); // Merge đến totalThanCol
      sheet.getCell(6, coalStart).value = "THAN";
      sheet.getCell(6, coalStart).alignment = center;

      // Header con THAN (Hàng 7)
      if (uniqueHeadersThan.length > 0) {
        uniqueHeadersThan.forEach((h, i) => {
          const col = coalStart + i;
          sheet.getCell(7, col).value =
            `Máy xúc: ${h.excavator} \nNơi đổ: ${h.toLocation} `; // Đã sửa từ Hàng 7
          sheet.getCell(7, col).alignment = {
            wrapText: true,
            vertical: "middle",
            horizontal: "center",
          };
        });
      } else {
        sheet.getCell(7, coalStart).value = "-"; // Đã sửa từ Hàng 7
        sheet.getCell(7, coalStart).alignment = center;
      }

      // TỔNG CHUYẾN THAN (Hàng 7)
      sheet.getCell(7, totalThanCol).value = "TỔNG CHUYẾN THAN"; // Đã sửa từ Hàng 7
      sheet.getCell(7, totalThanCol).alignment = center;

      // --- TỔNG HỢP CHUYẾN (merge 2 hàng) ---
      sheet.mergeCells(6, grandCol, 7, grandCol);
      sheet.getCell(6, grandCol).value = "TỔNG HỢP CHUYẾN";
      sheet.getCell(6, grandCol).alignment = center;

      // BẮT ĐẦU: Logic Bolding chọn lọc cho Header (Hàng 6 và 7)

      // 1. Áp dụng Bolding cho các tiêu đề chính/tổng
      sheet.getCell("A6").font = { bold: true }; // CA
      sheet.getCell("B6").font = { bold: true }; // SỐ XE
      sheet.getCell(6, landStart).font = { bold: true }; // ĐẤT, SPNT...
      sheet.getCell(7, totalDatCol).font = { bold: true }; // TỔNG CHUYẾN ĐẤT
      sheet.getCell(6, coalStart).font = { bold: true }; // THAN
      sheet.getCell(7, totalThanCol).font = { bold: true }; // TỔNG CHUYẾN THAN
      sheet.getCell(6, grandCol).font = { bold: true }; // TỔNG HỢP CHUYẾN

      // === 4️⃣ DỮ LIỆU THEO CA ===
      let currentRow = 8; // Dữ liệu bắt đầu từ hàng 8

      finalResult.shifts.forEach((shift) => {
        const startRow = currentRow; // Ghi nhớ dòng bắt đầu của ca
        const shiftLabel = `CA ${shift.shiftName} `;

        if (shift.cars.length === 0) {
          // Không có xe
          sheet.getCell(currentRow, 2).value = "Không có xe";
          for (let i = 3; i <= totalCols; i++)
            sheet.getCell(currentRow, i).value = 0;
          currentRow++;
        } else {
          // Có xe
          for (const car of shift.cars) {
            sheet.getCell(currentRow, 2).value = car.carCode;

            // Đất
            uniqueHeadersDat.forEach((h, i) => {
              const val = car.datDetailsMap[h.key]?.trips || 0;
              sheet.getCell(currentRow, landStart + i).value = val;
            });
            sheet.getCell(currentRow, totalDatCol).value = car.totalDat;

            // Than
            uniqueHeadersThan.forEach((h, i) => {
              const val = car.thanDetailsMap[h.key]?.trips || 0;
              sheet.getCell(currentRow, coalStart + i).value = val;
            });
            sheet.getCell(currentRow, totalThanCol).value = car.totalThan;
            sheet.getCell(currentRow, grandCol).value = car.totalCarTrips;

            currentRow++;
          }
        }

        // --- TỔNG CA ---
        sheet.getCell(currentRow, 2).value = `Tổng ca ${shift.shiftName} `;
        sheet.getCell(currentRow, totalDatCol).value = shift.cars.reduce(
          (a, b) => a + b.totalDat,
          0,
        );
        sheet.getCell(currentRow, totalThanCol).value = shift.cars.reduce(
          (a, b) => a + b.totalThan,
          0,
        );
        sheet.getCell(currentRow, grandCol).value = shift.totalTripsInShift;

        sheet.getRow(currentRow).eachCell((c) => {
          c.font = { bold: true };
        });

        const endRow = currentRow; // Dòng cuối của ca này
        sheet.mergeCells(startRow, 1, endRow, 1); // merge cột CA
        sheet.getCell(startRow, 1).value = shiftLabel;
        sheet.getCell(startRow, 1).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        sheet.getCell(startRow, 1).font = { bold: true }; // BOLD CA LABEL

        currentRow++;
      });

      // --- TỔNG CẢ NGÀY ---
      sheet.mergeCells(currentRow, 1, currentRow, 2);
      const shiftNamesList = shift && shift.length > 0 
        ? shift.map(s => typeof s === 'object' ? s.name : s).join('+')
        : "";
      sheet.getCell(currentRow, 1).value = shiftNamesList ? `TỔNG CA ${shiftNamesList}` : "TỔNG CẢ NGÀY";
      sheet.getCell(currentRow, totalDatCol).value =
        finalResult.grandTotal.grandTotalDat;
      sheet.getCell(currentRow, totalThanCol).value =
        finalResult.grandTotal.grandTotalThan;
      sheet.getCell(currentRow, grandCol).value =
        finalResult.grandTotal.grandTotalAll;
      sheet.getRow(currentRow).eachCell((c) => {
        c.font = { bold: true };
      });
      currentRow++;

      // === 5️⃣ KẺ KHUNG ===
      addTableBorders(sheet, 6, currentRow - 1, 1, totalCols); // Kẻ khung từ hàng 1 đến hết

      currentRow += 1; // để cách ra 1 dòng trắng

      // Khối Người lập (bên trái)
      const leftCol = 2; // Bắt đầu từ cột 2
      const leftEnd = leftCol + 1; // Kết thúc ở cột 4 (3 cột)

      sheet.mergeCells(currentRow, leftCol, currentRow, leftEnd);
      sheet.getCell(currentRow, leftCol).value = "Người lập";
      sheet.getCell(currentRow, leftCol).font = { bold: true };
      sheet.getCell(currentRow, leftCol).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      sheet.mergeCells(currentRow + 1, leftCol, currentRow + 1, leftEnd);
      sheet.getCell(currentRow + 1, leftCol).value = "(Ký, ghi rõ họ tên)";
      sheet.getCell(currentRow + 1, leftCol).font = { italic: true, size: 11 };
      sheet.getCell(currentRow + 1, leftCol).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      if (signature) {
        const response = await axios.get(signature, {
          responseType: "arraybuffer",
        });
        const extension = response.headers["content-type"].split("/")[1];
        const imageBuffer = Buffer.from(response.data, "binary");

        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension,
        });

        sheet.mergeCells(currentRow + 2, leftCol, currentRow + 4, leftEnd);

        // gán ảnh trực tiếp vào range
        sheet.addImage(imageId, {
          tl: { col: leftCol, row: currentRow + 1.2 }, // vị trí góc trên trái
          ext: { width: 100, height: 30 }, // kích thước ảnh (px)
        });
      }

      // === Quản đốc (bên phải) - ĐÃ SỬA LỖI MERGE ===
      // SỬA: Đảm bảo Quản Đốc cũng rộng 4 cột (như Người lập) và căn sát vào cột cuối của bảng (totalCols)
      const rightEnd = totalCols;
      const rightStart = totalCols - 2; // 4 cột: totalCols - 3, totalCols - 2, totalCols - 1, totalCols

      sheet.mergeCells(currentRow, rightStart, currentRow, rightEnd);
      sheet.getCell(currentRow, rightStart).value = "Quản Đốc";
      sheet.getCell(currentRow, rightStart).font = { bold: true };
      sheet.getCell(currentRow, rightStart).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      sheet.mergeCells(currentRow + 1, rightStart, currentRow + 1, rightEnd);
      sheet.getCell(currentRow + 1, rightStart).value = "(Ký, ghi rõ họ tên)";
      sheet.getCell(currentRow + 1, rightStart).font = {
        italic: true,
        size: 11,
      };
      sheet.getCell(currentRow + 1, rightStart).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      sheet.pageSetup = {
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
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          if (!cell.font) cell.font = {};
          cell.font = {
            ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
            name: "Times New Roman", // đổi font chữ
            // Cập nhật kích thước chữ cho khối tiêu đề mới
            ...(rowNumber >= 6 ?? { size: 11 }), // Dữ liệu/Header bảng
          };
          if (rowNumber <= 4) return;
          // Logic căn chỉnh
          if (rowNumber > 4 && rowNumber <= 7) {
            // Căn giữa toàn bộ header bảng (hàng 6-7)
            cell.alignment = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            };
          } else {
            // Dữ liệu (hàng 8 trở đi)
            if (cell.col === 1) {
              // Cột CA và SỐ XE (cột 1 & 2) - Căn giữa
              cell.alignment = { horizontal: "center", vertical: "middle" };
            } else if (cell.col === 2) {
              cell.alignment = { horizontal: "left", vertical: "middle" };
            } else if (cell.col >= 3) {
              // Cột số liệu (cột 3 trở đi) - Căn giữa
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
          }
        });
      });
      const fixedCols = {
        1: 7, // CA
        2: 15, // SỐ XE
        [totalCols]: 12, // TỔNG HỢP CHUYẾN
        [totalThanCol]: 12, // ✅ TỔNG CHUYẾN THAN
        [totalDatCol]: 12, // ✅ TỔNG CHUYẾN ĐẤT
      };

      // Giả sử muốn tổng width ~150
      const totalTargetWidth = 150;

      // Tính tổng width đã fix
      const fixedWidthSum = Object.values(fixedCols).reduce((a, b) => a + b, 0);

      // Còn lại chia đều cho các cột giữa
      const dynamicCols = totalCols - Object.keys(fixedCols).length;
      const dynamicWidth = Math.max(
        10,
        (totalTargetWidth - fixedWidthSum) / dynamicCols,
      );

      // Áp dụng width
      for (let i = 1; i <= totalCols; i++) {
        if (fixedCols[i]) {
          sheet.getColumn(i).width = fixedCols[i];
        } else {
          sheet.getColumn(i).width = dynamicWidth;
        }
      }

      // === 6️⃣ Trả file về client ===
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename = BaoCaoChuyenXe_${day}.xlsx`,
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      req.logger.error("❌ Lỗi khi load", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// tong hop thong ke than, dat mau 02

router.post(
  "/excavatorProductReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};

      // 1. Lọc Order theo Department và Date
      if (user?.role === ROLE.ADMIN && department) {
        query.department = new mongoose.Types.ObjectId(department);
      } else {
        query.department = new mongoose.Types.ObjectId(user.department?._id);
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Lấy Orders
      const orders = await Order.find(query)
        .populate({
          path: "device", // Device ở đây là Máy xúc/Loading device
          select: "code category",
          populate: { path: "category", select: "name" },
        })
        .populate({ path: "job", select: "type" });

      // Lọc Orders có máy xúc và là Job VAN_HANH_XUC
      const filteredOrders = orders.filter(
        (order) =>
          order.device?.some((d) =>
            d.category?.name?.toLowerCase().includes("máy xúc"),
          ) && order.job?.type === JOB_TYPE.VAN_HANH_XUC,
      );

      // 2. Aggregation Map: { "KT3-HT4": { totalDat: 0, totalThan: 0, materialDetails: { "Đất SX": { quantity: 10, acceptedProduct: 'Đất' }, ... } } }
      let aggregatedData = {};

      for (const order of filteredOrders) {
        // Lấy mã máy xúc từ Order.device (Giả định 1 Order chỉ có 1 Máy xúc)
        const excavatorCodes = order.device
          ?.filter((d) => d.category?.name?.toLowerCase().includes("máy xúc"))
          .map((d) => d?.code);

        if (!excavatorCodes || excavatorCodes.length === 0) continue;

        // Vì Order chỉ liên quan đến 1 Máy xúc, ta dùng mã đầu tiên làm key
        const excavatorCode = excavatorCodes[0];

        // Lấy Reports (các chuyến xe tải đã đổ) cho Order này
        let reports = await Report.find({ orderId: order._id }).populate(
          "material",
          "name acceptedProduct",
        ); // Populate vật liệu

        if (!reports.length) continue;

        // Khởi tạo data cho máy xúc nếu chưa có
        if (!aggregatedData[excavatorCode]) {
          aggregatedData[excavatorCode] = {
            totalDat: 0, // Tổng m3
            totalThan: 0, // Tổng tấn
            materialDetails: {}, // Chi tiết theo tên vật liệu
          };
        }

        const excavatorData = aggregatedData[excavatorCode];

        for (const report of reports) {
          const materialName = report.material?.name;
          const acceptedProduct = report.material?.acceptedProduct;
          // Lấy sản lượng chi tiết trong Report
          const m3 = report.totalCubicMeter || 0;
          const ton = report.totalTon || 0;

          if (!materialName || (!m3 && !ton)) continue;

          // Cập nhật tổng theo loại sản phẩm
          if (acceptedProduct === ACCEPTED_PRODUCT.LAND) {
            excavatorData.totalDat += m3;
            // Quantity chi tiết theo m3
            var quantityDetail = m3;
          } else if (acceptedProduct === ACCEPTED_PRODUCT.COAL) {
            excavatorData.totalThan += ton;
            // Quantity chi tiết theo tấn
            var quantityDetail = ton;
          } else {
            // Bỏ qua nếu không phải Đất hoặc Than
            continue;
          }

          // Cập nhật chi tiết theo tên vật liệu (Đất SX, SPNT, Than SX...)
          if (!excavatorData.materialDetails[materialName]) {
            excavatorData.materialDetails[materialName] = {
              quantity: 0,
              acceptedProduct: acceptedProduct,
            };
          }
          // Cộng dồn sản lượng chi tiết
          excavatorData.materialDetails[materialName].quantity +=
            quantityDetail;
        }
      }

      // 3. Chuyển đổi Aggregation Map sang mảng kết quả cuối cùng
      let finalResult = Object.entries(aggregatedData).map(([code, data]) => ({
        excavatorCode: code,
        totalDat: data.totalDat,
        totalThan: data.totalThan,
        materialDetails: data.materialDetails,
      }));

      finalResult.sort((a, b) =>
        (a.excavatorCode || "").localeCompare(
          b.excavatorCode || "",
          undefined,
          { numeric: true },
        ),
      );

      res.status(200).send({ status: "success", data: finalResult });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load excavator product report", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
const excavatorProductReport = async (
  workbook,
  sheetName,
  dep,
  query,
  signature,
) => {
  const orders = await Order.find({ ...query, department: dep?._id })
    .populate({
      path: "device",
      select: "code category",
      populate: { path: "category", select: "name" },
    })
    .populate({ path: "job", select: "type" });

  const filteredOrders = orders.filter(
    (o) =>
      o.device?.some((d) =>
        d.category?.name?.toLowerCase().includes("máy xúc"),
      ) && o.job?.type === JOB_TYPE.VAN_HANH_XUC,
  );

  // --- 3️⃣ Tổng hợp dữ liệu ---
  const aggregated = {};
  for (const order of filteredOrders) {
    const exc = order.device?.find((d) =>
      d.category?.name?.toLowerCase().includes("máy xúc"),
    );
    if (!exc) continue;

    const reports = await Report.find({ orderId: order._id }).populate(
      "material",
      "name acceptedProduct",
    );
    if (!reports.length) continue;

    if (!aggregated[exc.code])
      aggregated[exc.code] = {
        totalDat: 0,
        totalThan: 0,
        materialDetails: {},
      };

    for (const r of reports) {
      const { name, acceptedProduct } = r.material || {};
      const m3 = r.totalCubicMeter || 0;
      const ton = r.totalTon || 0;
      let q = 0;
      if (acceptedProduct === ACCEPTED_PRODUCT.LAND) {
        aggregated[exc.code].totalDat += m3;
        q = m3;
      } else if (acceptedProduct === ACCEPTED_PRODUCT.COAL) {
        aggregated[exc.code].totalThan += ton;
        q = ton;
      } else continue;

      if (!aggregated[exc.code].materialDetails[name])
        aggregated[exc.code].materialDetails[name] = {
          quantity: 0,
          acceptedProduct,
        };
      aggregated[exc.code].materialDetails[name].quantity += q;
    }
  }

  const finalData = Object.entries(aggregated).map(([code, d]) => ({
    excavatorCode: code,
    ...d,
  }));
  finalData.sort((a, b) =>
    (a.excavatorCode || "").localeCompare(b.excavatorCode || "", undefined, {
      numeric: true,
    }),
  );

  const landList = [];
  const coalList = [];
  finalData.forEach((r) => {
    Object.entries(r.materialDetails || {}).forEach(([name, detail]) => {
      const qty = detail.quantity || 0;
      if (qty === 0) return; // ✅ bỏ qua vật liệu 0

      if (
        detail.acceptedProduct === ACCEPTED_PRODUCT.LAND &&
        !landList.includes(name)
      )
        landList.push(name);
      if (
        detail.acceptedProduct === ACCEPTED_PRODUCT.COAL &&
        !coalList.includes(name)
      )
        coalList.push(name);
    });
  });

  // === Tính tổng ==
  const totalDat = finalData.reduce((s, r) => s + (r.totalDat || 0), 0);
  const totalThan = finalData.reduce((s, r) => s + (r.totalThan || 0), 0);

  const totalLandByName = Object.fromEntries(
    landList.map((name) => [
      name,
      finalData.reduce(
        (s, r) => s + (r.materialDetails?.[name]?.quantity || 0),
        0,
      ),
    ]),
  );

  const totalCoalByName = Object.fromEntries(
    coalList.map((name) => [
      name,
      finalData.reduce(
        (s, r) => s + (r.materialDetails?.[name]?.quantity || 0),
        0,
      ),
    ]),
  );

  // --- 4️⃣ Tạo Excel Workbook ---
  const sheet = workbook.addWorksheet(sheetName);

  const center = { horizontal: "center", vertical: "middle" };

  // === Header 3 tầng ===
  const totalCols = 2 + (landList.length + 1) + (coalList.length + 1) + 1;

  sheet.mergeCells(1, 1, 1, totalCols);
  sheet.getCell("A1").value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  sheet.getCell("A1").font = { italic: true, size: 18 };
  sheet.getCell("A1").alignment = { horizontal: "left" };

  sheet.mergeCells(2, 1, 2, totalCols);
  sheet.getCell("A2").value = "BẢNG TỔNG HỢP THỐNG KÊ THAN, ĐẤT";
  sheet.getCell("A2").font = { bold: true, size: 14 };
  sheet.getCell("A2").alignment = center;

  sheet.mergeCells(4, 1, 4, totalCols);
  sheet.getCell("A4").value = `Đơn vị: ${dep?.code || ""} `;
  sheet.getCell("A4").alignment = { horizontal: "left" };

  // Hàng 4: tiêu đề bảng
  sheet.mergeCells(6, 1, 8, 1);
  sheet.getCell("A6").value = "TT";
  sheet.mergeCells(6, 2, 8, 2);
  sheet.getCell("B6").value = "MÁY XÚC";

  const landStart = 3;
  const landEnd = landStart + landList.length;
  const coalStart = landEnd + 1;
  const coalEnd = coalStart + coalList.length;
  const noteCol = coalEnd + 1;

  sheet.mergeCells(6, landStart, 6, coalEnd);
  sheet.getCell(6, landStart).value = "SẢN LƯỢNG THỰC HIỆN TRONG NGÀY";
  sheet.getCell(6, landStart).alignment = center;

  // Hàng 5
  sheet.mergeCells(7, landStart, 7, landEnd);
  sheet.getCell(7, landStart).value = "Đất đá (m³)";
  sheet.getCell(7, landStart).alignment = center;
  sheet.mergeCells(7, coalStart, 7, coalEnd);
  sheet.getCell(7, coalStart).value = "Than (tấn)";
  sheet.getCell(7, coalStart).alignment = center;

  // Hàng 6
  sheet.getCell(8, landStart).value = "Tổng cộng";
  landList.forEach((n, i) => {
    sheet.getCell(8, landStart + 1 + i).value = n;
  });
  sheet.getCell(8, coalStart).value = "Tổng cộng";
  coalList.forEach((n, i) => {
    sheet.getCell(8, coalStart + 1 + i).value = n;
  });

  sheet.mergeCells(6, noteCol, 8, noteCol);
  sheet.getCell(6, noteCol).value = "GHI CHÚ";

  // === DỮ LIỆU ===
  let currentRow = 9;
  finalData.forEach((r, i) => {
    const row = [
      i + 1,
      r.excavatorCode,
      r.totalDat,
      ...landList.map((n) => r.materialDetails[n]?.quantity || ""),
      r.totalThan,
      ...coalList.map((n) => r.materialDetails[n]?.quantity || ""),
      "",
    ];
    sheet.addRow(row);
    currentRow++;
  });

  const totalRow = [
    "TỔNG CỘNG",
    "", // cột Máy xúc để trống
    totalDat,
    ...landList.map((n) => totalLandByName[n] || ""),
    totalThan,
    ...coalList.map((n) => totalCoalByName[n] || ""),
    "", // Ghi chú
  ];

  sheet.addRow(totalRow);
  const totalRowIndex = sheet.lastRow.number;

  // Merge 2 cột đầu
  sheet.mergeCells(totalRowIndex, 1, totalRowIndex, 2);

  // Style
  sheet.getRow(totalRowIndex).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // === Ký tên ===
  addTableBorders(sheet, 6, currentRow, 1, totalCols); // Kẻ khung từ hàng 1 đến hết

  currentRow += 2; // để cách ra 1 dòng trắng

  // Khối Người lập (bên trái)
  const leftCol = 1; // Bắt đầu từ cột 2
  const leftEnd = leftCol + 1; // Kết thúc ở cột 4 (3 cột)

  sheet.mergeCells(currentRow, leftCol, currentRow, leftEnd);
  sheet.getCell(currentRow, leftCol).value = "Người lập";
  sheet.getCell(currentRow, leftCol).font = { bold: true };
  sheet.getCell(currentRow, leftCol).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  sheet.mergeCells(currentRow + 1, leftCol, currentRow + 1, leftEnd);
  sheet.getCell(currentRow + 1, leftCol).value = "(Ký, ghi rõ họ tên)";
  sheet.getCell(currentRow + 1, leftCol).font = { italic: true, size: 11 };
  sheet.getCell(currentRow + 1, leftCol).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  if (signature) {
    const response = await axios.get(signature, {
      responseType: "arraybuffer",
    });
    const extension = response.headers["content-type"].split("/")[1];
    const imageBuffer = Buffer.from(response.data, "binary");

    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension,
    });

    sheet.mergeCells(currentRow + 2, leftCol, currentRow + 4, leftEnd);

    // gán ảnh trực tiếp vào range
    sheet.addImage(imageId, {
      tl: { col: leftCol, row: currentRow + 1.2 }, // vị trí góc trên trái
      ext: { width: 100, height: 30 }, // kích thước ảnh (px)
    });
  }

  // === Quản đốc (bên phải) - ĐÃ SỬA LỖI MERGE ===
  // SỬA: Đảm bảo Quản Đốc cũng rộng 4 cột (như Người lập) và căn sát vào cột cuối của bảng (totalCols)
  const rightEnd = totalCols;
  const rightStart = totalCols - 2; // 4 cột: totalCols - 3, totalCols - 2, totalCols - 1, totalCols

  sheet.mergeCells(currentRow, rightStart, currentRow, rightEnd);
  sheet.getCell(currentRow, rightStart).value = "Quản Đốc";
  sheet.getCell(currentRow, rightStart).font = { bold: true };
  sheet.getCell(currentRow, rightStart).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  sheet.mergeCells(currentRow + 1, rightStart, currentRow + 1, rightEnd);
  sheet.getCell(currentRow + 1, rightStart).value = "(Ký, ghi rõ họ tên)";
  sheet.getCell(currentRow + 1, rightStart).font = { italic: true, size: 11 };
  sheet.getCell(currentRow + 1, rightStart).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  sheet.pageSetup = {
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
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font, // giữ lại các thuộc tính khác (bold, italic,…)
        name: "Times New Roman", // đổi font chữ
        // Cập nhật kích thước chữ cho khối tiêu đề mới
        ...(rowNumber >= 6 ?? { size: 11 }), // Dữ liệu/Header bảng
      };
      if (rowNumber <= 4) return;
      // Logic căn chỉnh
      if (rowNumber > 4 && rowNumber <= 8) {
        // Căn giữa toàn bộ header bảng (hàng 5-7)
        cell.font = { bold: true };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });
  const fixedCols = {
    1: 5, // CA
    2: 15, // SỐ XE
    [totalCols]: 12, // ghi chú
    // [coalStart]: 12, // ghi chú
    // [landStart]: 12// ghi chú
  };

  // Giả sử muốn tổng width ~150
  const totalTargetWidth = 150;

  // Tính tổng width đã fix
  const fixedWidthSum = Object.values(fixedCols).reduce((a, b) => a + b, 0);

  // Còn lại chia đều cho các cột giữa
  const dynamicCols = totalCols - Object.keys(fixedCols).length;
  const dynamicWidth = Math.max(
    10,
    (totalTargetWidth - fixedWidthSum) / dynamicCols,
  );

  // Áp dụng width
  for (let i = 1; i <= totalCols; i++) {
    if (fixedCols[i]) {
      sheet.getColumn(i).width = fixedCols[i];
    } else {
      sheet.getColumn(i).width = dynamicWidth;
    }
  }
};
router.post(
  "/excavatorProductReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { startDate, endDate, department, signature } = req.body;
      const user = req.user;
      let query = {};

      // --- 1️⃣ Lọc dữ liệu ---
      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      query.workingDate = { $gte: start, $lte: end };

      const workbook = new ExcelJS.Workbook();

      const totalSheetName = `Tong_hop_${dayjs(start).format("DD_MM")}_den_${dayjs(end).format("DD_MM")} `;
      await excavatorProductReport(
        workbook,
        totalSheetName,
        dep,
        query,
        signature,
      );
      const totalSheet = workbook.getWorksheet(totalSheetName);
      if (totalSheet) {
        totalSheet.getCell(3, 1).value =
          `Từ ngày: ${dayjs(start).format("DD-MM-YYYY")} `;
        totalSheet.getCell(3, 3).value =
          `Đến ngày: ${dayjs(end).format("DD-MM-YYYY")} `;
      }

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        query = { workingDate: d };

        const sheetName = `Ngay_${dayjs(d).format("DD_MM_YYYY")} `;
        await excavatorProductReport(
          workbook,
          sheetName,
          dep,
          query,
          signature,
        );
        const title = `Ngày ${dayjs(d).format("DD-MM-YYYY")} `;
        const daySheet = workbook.getWorksheet(sheetName);
        if (daySheet) {
          daySheet.getCell(3, 1).value = title;
        }
      }

      // === Xuất file ===
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename = ThongKeThanDat.xlsx`,
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      req.logger.error("❌ Lỗi xuất Excel", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

// bao cao san luong xe oto thuc hien (04)
router.post(
  "/carProductReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { day, department } = req.body;
      const user = req.user;
      let query = {};

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      if (day) {
        query.workingDate = new Date(day);
      } else {
        return res
          .status(400)
          .json({ status: "error", message: "Ngày là bắt buộc" });
      }

      const results = await getAllReport(query, dep, _);
      const grouped = await groupTripsVehicleProduction(results);

      res.status(200).send({ status: "success", data: [grouped] });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load excavator product report", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/carProductReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { day, department, signature } = req.body;
      const user = req.user;
      let query = {};

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      if (!day) {
        return res
          .status(400)
          .json({ status: "error", message: "Ngày là bắt buộc" });
      }

      query.workingDate = new Date(day);

      const results = await getAllReport(query, dep, _);

      const grouped = await groupTripsVehicleProduction(results);

      // === 4️⃣ Chuẩn bị file Excel - Start of Fixes V3 (Giống ảnh mẫu) ===
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Báo cáo sản lượng");
      const center = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      const leftCenter = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };
      const borderStyle = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Lấy nhóm ĐẤT/THAN và header chỉ tiêu
      const { landGroups, coalGroups, totals } = grouped;

      // Unique header ĐẤT
      const landHeaders = Array.from(
        new Set(
          landGroups.map(
            (g) =>
              `${g.locationName}| ${g.excavationLevel}| ${g.fullLiftHeightM}| ${g.excavatorCode}| ${g.distance}| ${g.materialName} `,
          ),
        ),
      ).map((k) => k.split("|"));

      // Unique header THAN
      const coalHeaders = Array.from(
        new Set(
          coalGroups.map(
            (g) =>
              `${g.locationName}| ${g.excavationLevel}| ${g.fullLiftHeightM}| ${g.excavatorCode}| ${g.distance}| ${g.materialName} `,
          ),
        ),
      ).map((k) => k.split("|"));

      // Định vị cột (Đã thay đổi theo yêu cầu A: Tiêu chí/Xe, B: Ca, C: Bắt đầu cho ĐẤT)
      const criteriaCol = 1; // Cột A: Tiêu chí (dùng cho Rows 4-9) & Xe (dùng cho Rows 10+)
      const deviceCol = 1; // Xe dùng chung cột với Tiêu chí (criteriaCol)
      const shiftCol = 2; // Cột B: Ca

      // Cột Tiêu chí động ĐẤT (chứa số chuyến)
      const landQuantityStartCol = shiftCol + 1; // Cột 3 (C)
      const landQuantityEndCol =
        landQuantityStartCol + (landHeaders.length || 1) - 1;

      // Cột TỔNG ĐẤT (M3/Tkm)
      const totalLandTrips = landQuantityEndCol + 1;
      const totalLandM3 = landQuantityEndCol + 2;
      const totalLandTkm = landQuantityEndCol + 3;

      // Cột Tiêu chí động THAN (chứa số chuyến)
      const coalQuantityStartCol = totalLandTkm + 1;
      const coalQuantityEndCol =
        coalQuantityStartCol + (coalHeaders.length || 1) - 1;

      // Cột TỔNG THAN (Tấn/Tkm)
      const totalCoalTrips = coalQuantityEndCol + 1;
      const totalCoalTon = coalQuantityEndCol + 2;
      const totalCoalTkm = coalQuantityEndCol + 3;
      const totalTripsCol = totalCoalTkm + 1;
      const totalCols = totalTripsCol;

      sheet.mergeCells(1, 1, 1, totalCols);
      sheet.getCell("A1").value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
      sheet.getCell("A1").font = { italic: true, size: 18 };
      sheet.getCell("A1").alignment = { horizontal: "left" };

      // === Header 1: Tiêu đề khối (Row 1) ===
      sheet.mergeCells(2, 1, 2, totalCols);
      sheet.getCell("A2").value = "BÁO CÁO SẢN LƯỢNG XE Ô TÔ THỰC HIỆN";
      sheet.getCell("A2").alignment = center;
      sheet.getCell("A2").font = { bold: true, size: 14 };

      sheet.mergeCells(3, 1, 3, 2);
      sheet.getCell("A3").value = `Đơn vị: ${dep?.code || ""} `;
      sheet.getCell("A3").alignment = { horizontal: "left" };
      sheet.mergeCells(4, 1, 4, 2);
      // Sửa hiển thị ngày/tháng
      sheet.getCell("A4").value = "Ngày: " + dayjs(day).format("DD/MM/YYYY");
      sheet.getCell("A4").alignment = { horizontal: "left" };

      // === Header 2: Tiêu đề nhóm (Row 3) ===
      const headerRow = 6;
      const row3 = sheet.getRow(headerRow);

      // 1. CÁC CHỈ TIÊU (A3:A3)
      row3.getCell(criteriaCol).value = "CÁC CHỈ TIÊU";
      row3.getCell(criteriaCol).alignment = center;
      // Bỏ merge A3:B3

      // 3. ĐẤT (Merge for the entire Land block)
      sheet.mergeCells(
        headerRow,
        landQuantityStartCol,
        headerRow,
        totalLandTkm,
      ); // C3...
      row3.getCell(landQuantityStartCol).value =
        "CHUYỂN VẬN CHUYỂN ĐẤT, SPNT, BÙN ĐẶC, BÙN LOÃNG...";
      row3.getCell(landQuantityStartCol).alignment = center;

      // 4. THAN (Merge for the entire Coal block)
      sheet.mergeCells(
        headerRow,
        coalQuantityStartCol,
        headerRow,
        totalCoalTkm,
      );
      row3.getCell(coalQuantityStartCol).value = "CHUYỂN VẬN CHUYỂN THAN";
      row3.getCell(coalQuantityStartCol).alignment = center;

      // Apply font bold cho Row 3
      row3.eachCell((c) => {
        c.font = { bold: true, name: "Times New Roman", size: 11 };
      });

      // === Header 3: Các tiêu đề con (Row 4) - Start of main fix ===
      const criteriaStartRow = 7;
      const criteriaEndRow = 12; // Rows 4-9 cho các tiêu chí

      // Row 4: Nơi đổ tải + Tiêu đề phụ (Ca) + TỔNG ĐẤT/THAN
      const row4 = sheet.getRow(criteriaStartRow);
      const row5 = sheet.getRow(criteriaStartRow + 1);
      row4.height = 30;

      // A4: Nơi đổ tải
      row4.getCell(criteriaCol).value = "Nơi đổ tải";
      row4.getCell(criteriaCol).alignment = leftCenter;
      row4.getCell(criteriaCol).font = { bold: true };

      // Merge B4:B9 cho "Ca xe /đ trong ngày"
      sheet.mergeCells(
        criteriaStartRow - 1,
        shiftCol,
        criteriaEndRow,
        shiftCol,
      ); // B4:B9
      sheet.getCell(criteriaStartRow - 1, shiftCol).value =
        "Ca xe h/đ trong ngày";
      sheet.getCell(criteriaStartRow - 1, shiftCol).alignment = center;

      sheet.mergeCells(
        criteriaStartRow - 1,
        totalTripsCol,
        criteriaEndRow,
        totalTripsCol,
      ); // B4:B9
      sheet.getCell(criteriaStartRow - 1, totalTripsCol).value = "Tổng chuyến";
      sheet.getCell(criteriaStartRow - 1, totalTripsCol).alignment = center;
      sheet.getCell(criteriaStartRow - 1, totalTripsCol).font = { bold: true };

      // Tiêu đề ĐẤT (Columns landQuantityStartCol ... landQuantityEndCol)
      landHeaders.forEach((h, idx) => {
        row4.getCell(landQuantityStartCol + idx).value = h[0] || "-"; // Nơi đổ tải (C4 onwards)
        row4.getCell(landQuantityStartCol + idx).alignment = center;
      });

      // --- ĐIỀU CHỈNH HEADER TỔNG ĐẤT (ROW 4) ---
      // Chỉ hiển thị đơn vị, vì tên vật liệu đã được merge ở Row 3

      // TỔNG ĐẤT (M3, Tkm)
      sheet.mergeCells(row4.number, totalLandTrips, row4.number, totalLandTkm);
      row4.getCell(totalLandM3).value = "TỔNG ĐẤT";
      row4.getCell(totalLandM3).alignment = center;
      row4.getCell(totalLandM3).font = { bold: true };

      row5.getCell(totalLandTrips).value = "Chuyến";
      row5.getCell(totalLandTrips).alignment = center;
      row5.getCell(totalLandM3).value = "(M3)";
      row5.getCell(totalLandM3).alignment = center;
      row5.getCell(totalLandTkm).value = "(Tkm)";
      row5.getCell(totalLandTkm).alignment = center;
      // ------------------------------------------

      // Tiêu đề THAN (Columns coalQuantityStartCol ... coalQuantityEndCol)
      coalHeaders.forEach((h, idx) => {
        row4.getCell(coalQuantityStartCol + idx).value = h[0] || "-"; // Nơi đổ tải
        row4.getCell(coalQuantityStartCol + idx).alignment = center;
      });

      // --- ĐIỀU CHỈNH HEADER TỔNG THAN (ROW 4) ---
      // Chỉ hiển thị đơn vị, vì tên vật liệu đã được merge ở Row 3
      sheet.mergeCells(row4.number, totalCoalTrips, row4.number, totalCoalTkm);
      row4.getCell(totalCoalTon).value = "TỔNG THAN";
      row4.getCell(totalCoalTon).alignment = center;
      row4.getCell(totalCoalTon).font = { bold: true };

      row5.getCell(totalCoalTrips).value = "Chuyến";
      row5.getCell(totalCoalTrips).alignment = center;
      row5.getCell(totalCoalTon).value = "(Tấn)";
      row5.getCell(totalCoalTon).alignment = center;
      row5.getCell(totalCoalTkm).value = "(Tkm)";
      row5.getCell(totalCoalTkm).alignment = center;
      // ------------------------------------------

      // // Merge theo chuẩn các cột Total (Rows 5–9)
      // sheet.mergeCells(criteriaStartRow + 1, totalTripsCol, criteriaEndRow, totalTripsCol);

      // Merge the Total Land and Total Coal columns from Row 5 to Row 9
      // for neatness, similar to the 'Ca xe' column
      [
        totalLandM3,
        totalLandTkm,
        totalCoalTon,
        totalCoalTkm,
        totalLandTrips,
        totalCoalTrips,
      ].forEach((col) => {
        // Merge rows 5:9 for each total column
        sheet.mergeCells(criteriaStartRow + 1, col, criteriaEndRow, col);
      });

      // Merge các tiêu chí còn lại (A5:A9)
      const remainingCriteriaLabels = [
        "Tầng xúc",
        "Chiều cao nâng tải",
        "Máy xúc",
        "Cung độ v/c (Km)",
        "Vật liệu",
      ];

      remainingCriteriaLabels.forEach((label, i) => {
        const row = sheet.getRow(criteriaStartRow + 1 + i); // Row 5 -> Row 9
        // Cột A: Tiêu chí
        row.getCell(criteriaCol).value = label;
        row.getCell(criteriaCol).alignment = leftCenter;
        row.getCell(criteriaCol).font = { bold: true };

        // Cột B: Ca xe /đ trong ngày (Đã merge B4:B9)

        // Land Criteria Values (Cột số chuyến)
        const criteriaIndex = 1 + i; // Start from index 1 (Tầng xúc)
        landHeaders.forEach((h, idx) => {
          row.getCell(landQuantityStartCol + idx).value =
            h[criteriaIndex] || "-";
          row.getCell(landQuantityStartCol + idx).alignment = center;
        });

        // Coal Criteria Values (Cột số chuyến)
        coalHeaders.forEach((h, idx) => {
          row.getCell(coalQuantityStartCol + idx).value =
            h[criteriaIndex] || "-";
          row.getCell(coalQuantityStartCol + idx).alignment = center;
        });

        // Total columns (M3/Tkm & Tấn/Tkm) are implicitly merged from Row 5:9
        // so we don't need to write to those cells here.
      });

      // === Body: danh sách xe/ca (Starts Row 10) ===
      // === Body: danh sách xe/ca (Ca trước → Xe sau) ===
      // === Body: danh sách xe/ca ===
      let rowIdx = criteriaEndRow + 1;

      // Danh sách ca, xe
      const allShifts = Array.from(
        new Set([...landGroups, ...coalGroups].map((g) => g.shift)),
      ).sort((a, b) => parseInt(a) - parseInt(b));

      const allDevices = Array.from(
        new Set([...landGroups, ...coalGroups].map((g) => g.deviceCode)),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      for (const shift of allShifts) {
        for (const device of allDevices) {
          // Kiểm tra có dữ liệu không
          const hasData = [...landGroups, ...coalGroups].some(
            (g) => g.deviceCode === device && g.shift === shift,
          );
          if (!hasData) continue;

          const row = sheet.getRow(rowIdx++);
          row.getCell(criteriaCol).value = device;
          row.getCell(criteriaCol).alignment = center;
          row.getCell(shiftCol).value = shift;
          row.getCell(shiftCol).alignment = center;

          // === ĐẤT ===
          landHeaders.forEach((h, idx) => {
            const matched = landGroups.find(
              (g) =>
                g.deviceCode === device &&
                g.shift === shift &&
                g.locationName === h[0] &&
                g.excavationLevel === h[1] &&
                g.fullLiftHeightM === h[2] &&
                g.excavatorCode === h[3] &&
                String(g.distance || "") === String(h[4] || "") &&
                g.materialName === h[5],
            );
            row.getCell(landQuantityStartCol + idx).value =
              matched?.quantity || "";
          });

          const totalLand = landGroups
            .filter((g) => g.deviceCode === device && g.shift === shift)
            .reduce(
              (acc, g) => ({
                m3: acc.m3 + (g.totalCubicMeter || 0),
                tkm: acc.tkm + (g.production || 0),
              }),
              { m3: 0, tkm: 0 },
            );

          row.getCell(totalLandTrips).value = landGroups
            .filter((g) => g.deviceCode === device && g.shift === shift)
            .reduce((s, g) => s + (g.quantity || 0), 0);
          row.getCell(totalLandM3).value = totalLand.m3;
          row.getCell(totalLandTkm).value = totalLand.tkm;

          // === THAN ===
          coalHeaders.forEach((h, idx) => {
            const matched = coalGroups.find(
              (g) =>
                g.deviceCode === device &&
                g.shift === shift &&
                g.locationName === h[0] &&
                g.excavationLevel === h[1] &&
                g.fullLiftHeightM === h[2] &&
                g.excavatorCode === h[3] &&
                String(g.distance || "") === String(h[4] || "") &&
                g.materialName === h[5],
            );
            row.getCell(coalQuantityStartCol + idx).value =
              matched?.quantity || "";
          });

          const totalCoal = coalGroups
            .filter((g) => g.deviceCode === device && g.shift === shift)
            .reduce(
              (acc, g) => ({
                ton: acc.ton + (g.totalTon || 0),
                tkm: acc.tkm + (g.production || 0),
              }),
              { ton: 0, tkm: 0 },
            );

          row.getCell(totalCoalTrips).value = coalGroups
            .filter((g) => g.deviceCode === device && g.shift === shift)
            .reduce((s, g) => s + (g.quantity || 0), 0);
          row.getCell(totalCoalTon).value = totalCoal.ton;
          row.getCell(totalCoalTkm).value = totalCoal.tkm;

          const totalTrips = [...landGroups, ...coalGroups]
            .filter((g) => g.deviceCode === device && g.shift === shift)
            .reduce((s, g) => s + (g.quantity || 0), 0);

          row.getCell(totalTripsCol).value = totalTrips;
        }
        const shiftLand = landGroups.filter((g) => g.shift === shift);
        const shiftCoal = coalGroups.filter((g) => g.shift === shift);
        if (shiftLand.length || shiftCoal.length) {
          const totalShiftRow = sheet.getRow(rowIdx++);
          sheet.mergeCells(
            totalShiftRow.number,
            criteriaCol,
            totalShiftRow.number,
            shiftCol,
          );
          totalShiftRow.getCell(criteriaCol).value = `TỔNG CA ${shift} `;
          totalShiftRow.getCell(criteriaCol).alignment = center;
          totalShiftRow.getCell(criteriaCol).font = { bold: true };

          // Tổng từng cột đất
          landHeaders.forEach((h, idx) => {
            const val = shiftLand
              .filter(
                (g) =>
                  g.locationName === h[0] &&
                  g.excavatorCode === h[3] &&
                  String(g.distance || "") === String(h[4] || "") &&
                  g.materialName === h[5],
              )
              .reduce((s, g) => s + (g.quantity || 0), 0);
            const cell = totalShiftRow.getCell(landQuantityStartCol + idx);
            cell.value = val;
            cell.numFmt = "#,##0.0";
          });

          totalShiftRow.getCell(totalLandTrips).value = shiftLand.reduce(
            (s, g) => s + (g.quantity || 0),
            0,
          );
          totalShiftRow.getCell(totalLandM3).value = shiftLand.reduce(
            (s, g) => s + (g.totalCubicMeter || 0),
            0,
          );
          totalShiftRow.getCell(totalLandTkm).value = shiftLand.reduce(
            (s, g) => s + (g.production || 0),
            0,
          );

          // Tổng từng cột than
          coalHeaders.forEach((h, idx) => {
            const val = shiftCoal
              .filter(
                (g) =>
                  g.locationName === h[0] &&
                  g.excavatorCode === h[3] &&
                  String(g.distance || "") === String(h[4] || "") &&
                  g.materialName === h[5],
              )
              .reduce((s, g) => s + (g.quantity || 0), 0);
            const cell = totalShiftRow.getCell(coalQuantityStartCol + idx);
            cell.value = val;
            cell.numFmt = "#,##0.0";
          });

          totalShiftRow.getCell(totalCoalTrips).value = shiftCoal.reduce(
            (s, g) => s + (g.quantity || 0),
            0,
          );
          totalShiftRow.getCell(totalCoalTon).value = shiftCoal.reduce(
            (s, g) => s + (g.totalTon || 0),
            0,
          );
          totalShiftRow.getCell(totalCoalTkm).value = shiftCoal.reduce(
            (s, g) => s + (g.production || 0),
            0,
          );

          const sumTripsShift = [...shiftLand, ...shiftCoal].reduce(
            (s, g) => s + (g.quantity || 0),
            0,
          );

          totalShiftRow.getCell(totalTripsCol).value = sumTripsShift;
          totalShiftRow.getCell(totalTripsCol).numFmt = "#,##0.0";

          // Style dòng tổng ca
          totalShiftRow.eachCell((c) => {
            c.font = { bold: true };
            c.alignment = center;
            c.border = borderStyle;
          });
        }
      }

      // === Dòng tổng cuối (Footer) ===
      const totalRow = sheet.getRow(rowIdx++);
      // Merge A and B for "TỔNG CỘNG" (criteriaCol:shiftCol)
      sheet.mergeCells(totalRow.number, criteriaCol, totalRow.number, shiftCol); // A:B

      // Gộp cả Tổng số chuyến vào ô TỔNG CỘNG
      totalRow.getCell(criteriaCol).value = "TỔNG CỘNG";
      totalRow.getCell(criteriaCol).alignment = center;

      // Land Totals (Quantity)
      landHeaders.forEach((h, idx) => {
        const totalQuantity = landGroups
          .filter(
            (g) =>
              g.locationName === h[0] &&
              g.excavationLevel === h[1] &&
              g.fullLiftHeightM === h[2] &&
              g.excavatorCode === h[3] &&
              String(g.distance || "") === String(h[4] || "") &&
              g.materialName === h[5],
          )
          .reduce((s, g) => s + g.quantity, 0);

        const cell = totalRow.getCell(landQuantityStartCol + idx); // Col C onwards
        cell.value = totalQuantity || 0;
        cell.numFmt = "#,##0.0";
      });

      // Tổng M3 và Tkm (Tổng Land)
      totalRow.getCell(totalLandTrips).value = landGroups.reduce(
        (s, g) => s + (g.quantity || 0),
        0,
      );
      totalRow.getCell(totalLandM3).value = totals.land.m3;
      totalRow.getCell(totalLandM3).numFmt = "#,##0.0";
      totalRow.getCell(totalLandTkm).value = totals.land.tkm;
      totalRow.getCell(totalLandTkm).numFmt = "#,##0.0";

      // Coal Totals (Quantity)
      coalHeaders.forEach((h, idx) => {
        const totalQuantity = coalGroups
          .filter(
            (g) =>
              g.locationName === h[0] &&
              g.excavationLevel === h[1] &&
              g.fullLiftHeightM === h[2] &&
              g.excavatorCode === h[3] &&
              String(g.distance || "") === String(h[4] || "") &&
              g.materialName === h[5],
          )
          .reduce((s, g) => s + g.quantity, 0);

        const cell = totalRow.getCell(coalQuantityStartCol + idx);
        cell.value = totalQuantity || 0;
        cell.numFmt = "#,##0.0";
      });

      // Tổng Tấn và Tkm (Tổng Coal)
      totalRow.getCell(totalLandTrips).value = landGroups.reduce(
        (s, g) => s + (g.quantity || 0),
        0,
      );
      totalRow.getCell(totalCoalTon).value = totals.coal.ton;
      totalRow.getCell(totalCoalTon).numFmt = "#,##0.0";
      totalRow.getCell(totalCoalTkm).value = totals.coal.tkm;
      totalRow.getCell(totalCoalTkm).numFmt = "#,##0.0";

      const totalTripsAll = [...landGroups, ...coalGroups].reduce(
        (s, g) => s + (g.quantity || 0),
        0,
      );

      totalRow.getCell(totalTripsCol).value = totalTripsAll;
      totalRow.getCell(totalTripsCol).numFmt = "#,##0.0";

      // Apply bold font and alignment to the total row
      totalRow.eachCell((c) => {
        c.font = { bold: true, name: "Times New Roman", size: 11 };
        c.alignment = center;
        // Numbers should be right-aligned
        if (
          (c.col >= landQuantityStartCol && c.col <= landQuantityEndCol) ||
          c.col === totalLandM3 ||
          c.col === totalLandTkm ||
          (c.col >= coalQuantityStartCol && c.col <= coalQuantityEndCol) ||
          c.col === totalCoalTon ||
          c.col === totalCoalTkm
        ) {
          c.alignment = {
            horizontal: "right",
            vertical: "middle",
            wrapText: true,
          };
        }
      });

      // Note: addTableBorders function is assumed to be defined elsewhere in the file structure
      addTableBorders(sheet, 6, totalRow.number, 1, totalCols);

      const currentRow = totalRow.number + 2; // Cách ra 2 dòng trắng

      // Khối Người lập (bên trái)
      const leftCol = 2;
      const leftEnd = 3; // Rộng 3 cột (2, 3, 4)
      sheet.mergeCells(currentRow, leftCol, currentRow, leftEnd);
      sheet.getCell(currentRow, leftCol).value = "Người lập";
      sheet.getCell(currentRow, leftCol).font = { bold: true };
      sheet.getCell(currentRow, leftCol).alignment = center;

      sheet.mergeCells(currentRow + 1, leftCol, currentRow + 1, leftEnd);
      sheet.getCell(currentRow + 1, leftCol).value = "(Ký, ghi rõ họ tên)";
      sheet.getCell(currentRow + 1, leftCol).font = { italic: true, size: 11 };
      sheet.getCell(currentRow + 1, leftCol).alignment = center;

      // Chèn chữ ký (nếu có)
      if (signature) {
        const response = await axios.get(signature, {
          responseType: "arraybuffer",
        });
        const extension = response.headers["content-type"].split("/")[1];
        const imageBuffer = Buffer.from(response.data, "binary");

        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension,
        });

        sheet.addImage(imageId, {
          tl: { col: leftCol, row: currentRow + 1.2 },
          ext: { width: 100, height: 30 },
        });
      }

      // Quản đốc (bên phải)
      // Lấy cột cuối cùng là 11, khối Quản Đốc rộng 3 cột (9, 10, 11)
      const rightEnd = totalCols;
      const rightStart = totalCols - 2;
      sheet.mergeCells(currentRow, rightStart, currentRow, rightEnd);
      sheet.getCell(currentRow, rightStart).value = "Quản Đốc";
      sheet.getCell(currentRow, rightStart).font = { bold: true };
      sheet.getCell(currentRow, rightStart).alignment = center;

      sheet.mergeCells(currentRow + 1, rightStart, currentRow + 1, rightEnd);
      sheet.getCell(currentRow + 1, rightStart).value = "(Ký, ghi rõ họ tên)";
      sheet.getCell(currentRow + 1, rightStart).font = {
        italic: true,
        size: 11,
      };
      sheet.getCell(currentRow + 1, rightStart).alignment = center;

      // === Khối tổng theo ca ===
      let rowPtr = totalRow.number + 5;
      const shifts = [1, 2, 3];

      // === Helper ===
      const sumByShift = (arr, shift, field) =>
        arr
          .filter((g) => g.shift === shift)
          .reduce((s, g) => s + (g[field] || 0), 0);

      // === Tổng chuyến ===
      let r = sheet.getRow(rowPtr++);
      r.getCell(1).value = "Tổng chuyến:";
      r.font = { bold: true };
      r.alignment = { horizontal: "left" };

      shifts.forEach((s) => {
        const val =
          sumByShift([...landGroups, ...coalGroups], s, "quantity") || 0;
        sheet.getRow(rowPtr++).getCell(1).value = `Ca ${s}: ${val} `;
      });

      // khoảng cách 2 dòng
      rowPtr += 2;

      // === Tổng đất (m³) ===
      let r2 = sheet.getRow(rowPtr++);
      r2.getCell(1).value = "Tổng đất (m³):";
      r2.font = { bold: true };

      shifts.forEach((s) => {
        const val = sumByShift(landGroups, s, "totalCubicMeter") || 0;
        sheet.getRow(rowPtr++).getCell(1).value = `Ca ${s}: ${val.toFixed(1)} `;
      });

      rowPtr += 2;

      // === Tổng đất (Tkm) ===
      let r3 = sheet.getRow(rowPtr++);
      r3.getCell(1).value = "Tổng đất (Tkm):";
      r3.font = { bold: true };

      shifts.forEach((s) => {
        const val = sumByShift(landGroups, s, "production") || 0;
        sheet.getRow(rowPtr++).getCell(1).value = `Ca ${s}: ${val.toFixed(1)} `;
      });

      rowPtr += 2;

      // === Tổng than (tấn) ===
      let r4 = sheet.getRow(rowPtr++);
      r4.getCell(1).value = "Tổng than (tấn):";
      r4.font = { bold: true };

      shifts.forEach((s) => {
        const val = sumByShift(coalGroups, s, "totalTon") || 0;
        sheet.getRow(rowPtr++).getCell(1).value = `Ca ${s}: ${val.toFixed(1)} `;
      });

      rowPtr += 2;

      // === Tổng than (Tkm) ===
      let r5 = sheet.getRow(rowPtr++);
      r5.getCell(1).value = "Tổng than (Tkm):";
      r5.font = { bold: true };

      shifts.forEach((s) => {
        const val = sumByShift(coalGroups, s, "production") || 0;
        sheet.getRow(rowPtr++).getCell(1).value = `Ca ${s}: ${val.toFixed(1)} `;
      });

      // === A4 Landscape and Final Styling ===
      sheet.pageSetup = {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      // Apply font, alignment and borders to all cells from row 3 onwards
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          // Apply general font/size
          if (!cell.font) cell.font = {};
          if (rowNumber !== 1) {
            // Row 1 uses size 14
            cell.font = {
              ...cell.font,
              name: "Times New Roman",
              ...(rowNumber >= 6 ?? { size: 11 }),
            };
          }

          // Apply alignment for data/headers
          if (rowNumber >= 4) {
            // Align the criteria labels in Col A to the left/center (Rows 4-9)
            if (
              rowNumber >= criteriaStartRow &&
              rowNumber <= criteriaEndRow &&
              colNumber === criteriaCol
            ) {
              cell.alignment = leftCenter;
            }

            // Center align the merged Ca xe /đ trong ngày label in Col B (Rows 4-9)
            if (
              rowNumber >= criteriaStartRow &&
              rowNumber <= criteriaEndRow &&
              colNumber === shiftCol
            ) {
              cell.alignment = center;
            }

            // Center align merged total columns in rows 5-9
            if (
              rowNumber >= criteriaStartRow + 1 &&
              rowNumber <= criteriaEndRow &&
              (colNumber === totalLandM3 ||
                colNumber === totalLandTkm ||
                colNumber === totalCoalTon ||
                colNumber === totalCoalTkm)
            ) {
              cell.alignment = center;
            }

            // Align numbers in body/totals to the right/center
            if (rowNumber >= criteriaEndRow + 1) {
              // Data starts at Row 10
              if (
                (colNumber >= landQuantityStartCol &&
                  colNumber <= landQuantityEndCol) ||
                colNumber === totalLandM3 ||
                colNumber === totalLandTkm ||
                (colNumber >= coalQuantityStartCol &&
                  colNumber <= coalQuantityEndCol) ||
                colNumber === totalCoalTon ||
                colNumber === totalCoalTkm
              )
                if (colNumber === criteriaCol || colNumber === shiftCol) {
                  // Center align Xe/Ca data columns A & B
                  cell.alignment = center;
                }
            }

            // Center align the merged TỔNG CỘNG label in A:B
            if (rowNumber === totalRow.number && colNumber === criteriaCol) {
              cell.alignment = center;
            }
          }
        });
      });

      // === Column Widths ===
      const fixedColsWidths = {
        1: 20, // Cột A (Tiêu chí / Xe)
        2: 10, // Cột B (Ca)
      };
      const totalTargetWidth = 150;

      // Tính tổng width đã fix
      const fixedWidthSum = Object.values(fixedColsWidths).reduce(
        (a, b) => a + b,
        0,
      );

      // Còn lại chia đều cho các cột giữa
      const dynamicCols = totalCols - Object.keys(fixedColsWidths).length;
      const dynamicWidth = Math.max(
        10,
        (totalTargetWidth - fixedWidthSum) / dynamicCols,
      );

      for (let i = 1; i <= totalCols; i++) {
        if (fixedColsWidths[i]) {
          sheet.getColumn(i).width = fixedColsWidths[i];
        } else {
          sheet.getColumn(i).width = dynamicWidth;
        }
      }

      // === Xuất file ===
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename = "BC_SL.xlsx"`,
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      req.logger.error("❌ Lỗi khi load carProductReport", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

// bao cao nang suat dau xe (05)

router.post(
  "/carProductivityReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { startDate, endDate, department } = req.body;
      const user = req.user;
      let query = {};

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Lấy Orders
      const allReports = await getAllReport(query, dep, _);
      const grouped = await groupTripsVehicleProductivity(allReports);
      const map = {};

      grouped.forEach((model) => {
        const modelName = model.modelName || "Khác";

        if (!map[modelName]) {
          map[modelName] = {
            modelName,
            summary: {
              land: { trips: 0, m3: 0, tkm: 0 },
              coal: { trips: 0, ton: 0, tkm: 0 },
              totalTkm: 0,
              shifts: 0,
              days: 0,
            },
            vehicles: {},
          };
        }

        const m = map[modelName];

        // accumulate summary
        m.summary.land.trips += model.summary.land.trips;
        m.summary.land.m3 += model.summary.land.m3;
        m.summary.land.tkm += model.summary.land.tkm;

        m.summary.coal.trips += model.summary.coal.trips;
        m.summary.coal.ton += model.summary.coal.ton;
        m.summary.coal.tkm += model.summary.coal.tkm;

        m.summary.totalTkm += model.summary.totalTkm;

        model.vehicles.forEach((v) => {
          const code = v.carCode;

          if (!m.vehicles[code]) {
            m.vehicles[code] = {
              carCode: code,
              land: { trips: 0, m3: 0, tkm: 0 },
              coal: { trips: 0, ton: 0, tkm: 0 },
              totalTkm: 0,
              shifts: 0,
              days: 0,
            };
          }

          const x = m.vehicles[code];
          x.land.trips += v.land.trips || 0;
          x.land.m3 += v.land.m3 || 0;
          x.land.tkm += v.land.tkm || 0;

          x.coal.trips += v.coal.trips || 0;
          x.coal.ton += v.coal.ton || 0;
          x.coal.tkm += v.coal.tkm || 0;

          x.totalTkm += v.totalTkm || 0;
          x.shifts += v.shift || 0;

          if (dayjs(v.workingDate).isValid()) {
            x.days += 1;
          }

          // Đếm ngày của tổng model
          if (dayjs(v.workingDate).isValid()) {
            m.summary.days = (m.summary.days || 0) + 1;
          }
          m.summary.shifts += v.shift || 0;
        });
      });

      // Convert sets to numbers & object → array
      const summary = Object.values(map).map((m) => ({
        ...m,
        summary: {
          ...m.summary,
          days: m.summary.days,
        },
        vehicles: Object.values(m.vehicles)
          .sort((a, b) =>
            (a.carCode || "").localeCompare(b.carCode || "", undefined, {
              numeric: true,
            }),
          )
          .map((v) => ({
            ...v,
            days: v.days,
          })),
      }));

      res.status(200).send({ status: "success", data: summary });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load excavator product report", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

const carProductivityReport = async (
  workbook,
  totalSheetName,
  dep,
  results,
  signature,
  dayjs,
  _,
) => {
  const grouped = await groupTripsVehicleProductivity(results);

  const isSummarySheet = totalSheetName.startsWith("Tong_hop_");

  let vehicleMapByModel = {};

  if (isSummarySheet) {
    grouped.forEach((model) => {
      const modelName = model.modelName || "Khác";

      if (!vehicleMapByModel[modelName]) {
        vehicleMapByModel[modelName] = {};
      }

      model.vehicles.forEach((v) => {
        const code = v.carCode;

        if (!vehicleMapByModel[modelName][code]) {
          vehicleMapByModel[modelName][code] = {
            carCode: code,
            land: { trips: 0, m3: 0, tkm: 0 },
            coal: { trips: 0, ton: 0, tkm: 0 },
            totalTkm: 0,
            shifts: 0,
            days: 0,
          };
        }

        const m = vehicleMapByModel[modelName][code];

        m.land.trips += v.land.trips || 0;
        m.land.m3 += v.land.m3 || 0;
        m.land.tkm += v.land.tkm || 0;

        m.coal.trips += v.coal.trips || 0;
        m.coal.ton += v.coal.ton || 0;
        m.coal.tkm += v.coal.tkm || 0;

        m.totalTkm += v.totalTkm || 0;
        m.shifts += v.shift || 0;

        if (dayjs(v.workingDate).isValid()) {
          m.days += 1;
        }
      });
    });
  }

  // --- 1. Tính Grand Total và Sắp xếp chi tiết xe theo ngày ---
  const grandTotal = {
    land: { trips: 0, m3: 0, tkm: 0 },
    coal: { trips: 0, ton: 0, tkm: 0 },
    totalTkm: 0,
    totalShifts: 0,
    totalDays: 0,
  };

  grouped.forEach((model) => {
    // Sort the vehicles array within each model group for proper Excel display

    // Calculate Grand Total
    grandTotal.land.trips += model.summary.land.trips;
    grandTotal.land.m3 += model.summary.land.m3;
    grandTotal.land.tkm += model.summary.land.tkm;
    grandTotal.coal.trips += model.summary.coal.trips;
    grandTotal.coal.ton += model.summary.coal.ton;
    grandTotal.coal.tkm += model.summary.coal.tkm;
    grandTotal.totalTkm += model.summary.totalTkm;

    const vehicles = model.vehicles || [];
    vehicles.forEach((v) => {
      if (dayjs(v.workingDate).isValid()) {
        // Chuẩn hóa ngày về 'YYYY-MM-DD' để Set so sánh chính xác
        grandTotal.totalDays += 1;
      }
    });
    grandTotal.totalShifts += vehicles.reduce(
      (acc, v) => acc + (v.shift || 0),
      0,
    );
  });
  // --- Kết thúc tính Grand Total ---

  const sheet = workbook.addWorksheet(totalSheetName);

  const center = { horizontal: "center", vertical: "middle" };
  const formatNumber = (num) => (num ? num.toFixed(1).replace(/\.0$/, "") : ""); // Giữ logic làm tròn từ React component

  // Cột cuối cùng (Ngày xe) là cột số 11
  const totalCols = 11;

  // === Header báo cáo ===
  sheet.mergeCells(1, 1, 1, totalCols);
  sheet.getCell("A1").value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  sheet.getCell("A1").font = { italic: true, size: 18 };
  sheet.getCell("A1").alignment = { horizontal: "left" };

  sheet.mergeCells(2, 1, 2, totalCols);
  sheet.getCell("A2").value = "BÁO CÁO NĂNG SUẤT ĐẦU XE";
  sheet.getCell("A2").font = { bold: true, size: 14 };
  sheet.getCell("A2").alignment = center;

  sheet.mergeCells(3, 1, 3, 2);
  sheet.getCell("A3").value = `Đơn vị: ${dep?.code || ""} `;
  sheet.getCell("A3").alignment = { horizontal: "left" };
  sheet.mergeCells(4, 1, 4, 2);
  // Sửa hiển thị ngày/tháng

  // === Header bảng (Hàng 5 & 6) ===
  const headerRow5 = sheet.getRow(6);
  const headerRow6 = sheet.getRow(7);

  // Gộp hàng cho các cột cố định
  sheet.mergeCells(6, 1, 7, 1);
  sheet.getCell("A6").value = "TT";
  sheet.mergeCells(6, 2, 7, 2);
  sheet.getCell("B6").value = "LOẠI XE - SỐ XE";

  // VẬN CHUYỂN ĐẤT (Cột 3-5)
  sheet.mergeCells(6, 3, 6, 5);
  sheet.getCell("C6").value = "VẬN CHUYỂN ĐẤT";
  headerRow6.getCell(3).value = "Số chuyến";
  headerRow6.getCell(4).value = "m³";
  headerRow6.getCell(5).value = "tkm";

  // VẬN CHUYỂN THAN (Cột 6-8)
  sheet.mergeCells(6, 6, 6, 8);
  sheet.getCell("F6").value = "VẬN CHUYỂN THAN";
  headerRow6.getCell(6).value = "Số chuyến";
  headerRow6.getCell(7).value = "Tấn";
  headerRow6.getCell(8).value = "tkm";

  // TỔNG TKM (Cột 9)
  sheet.mergeCells(6, 9, 7, 9);
  sheet.getCell("I6").value = "TỔNG TKM";

  // XE HOẠT ĐỘNG (Cột 10-11)
  sheet.mergeCells(6, 10, 6, 11);
  sheet.getCell("J6").value = "XE HOẠT ĐỘNG";
  headerRow6.getCell(10).value = "Ca xe";
  headerRow6.getCell(11).value = "Ngày xe";

  // Áp dụng định dạng cho header
  [headerRow5, headerRow6].forEach((row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = center;
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // === DỮ LIỆU ===
  let currentRow = 7;
  grouped.forEach((model, modelIndex) => {
    currentRow++;
    // Dòng tổng của Model (∑ CAT 773E)
    const modelRow = sheet.getRow(currentRow);
    modelRow.getCell(1).value = modelIndex + 1;
    modelRow.getCell(2).value = `∑ ${model.modelName} `;
    modelRow.getCell(3).value = formatNumber(model.summary.land.trips);
    modelRow.getCell(4).value = formatNumber(model.summary.land.m3);
    modelRow.getCell(5).value = formatNumber(model.summary.land.tkm);
    modelRow.getCell(6).value = formatNumber(model.summary.coal.trips);
    modelRow.getCell(7).value = formatNumber(model.summary.coal.ton);
    modelRow.getCell(8).value = formatNumber(model.summary.coal.tkm);
    modelRow.getCell(9).value = formatNumber(model.summary.totalTkm);

    modelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.alignment = center;
    });
    modelRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

    // Dòng chi tiết từng xe
    if (isSummarySheet) {
      const cars = Object.values(vehicleMapByModel[model.modelName] || {}).sort(
        (a, b) =>
          (a.carCode || "").localeCompare(b.carCode || "", undefined, {
            numeric: true,
          }),
      );

      cars.forEach((v) => {
        currentRow++;
        const row = sheet.getRow(currentRow);

        row.getCell(2).value = v.carCode;

        row.getCell(3).value = formatNumber(v.land.trips);
        row.getCell(4).value = formatNumber(v.land.m3);
        row.getCell(5).value = formatNumber(v.land.tkm);

        row.getCell(6).value = formatNumber(v.coal.trips);
        row.getCell(7).value = formatNumber(v.coal.ton);
        row.getCell(8).value = formatNumber(v.coal.tkm);

        row.getCell(9).value = formatNumber(v.totalTkm);

        row.getCell(10).value = v.shifts;
        row.getCell(11).value = v.days;

        row.eachCell({ includeEmpty: true }, (c) => (c.alignment = center));
        row.getCell(2).alignment = { horizontal: "left" };
      });
    } else {
      const sortedVehicles = [...(model.vehicles || [])].sort((a, b) =>
        (a.carCode || "").localeCompare(b.carCode || "", undefined, {
          numeric: true,
        }),
      );
      sortedVehicles.forEach((vehicle) => {
        currentRow++;
        const vehicleRow = sheet.getRow(currentRow);
        // Cột TT để trống cho chi tiết xe
        vehicleRow.getCell(2).value = vehicle.carCode;
        vehicleRow.getCell(3).value = formatNumber(vehicle.land.trips);
        vehicleRow.getCell(4).value = formatNumber(vehicle.land.m3);
        vehicleRow.getCell(5).value = formatNumber(vehicle.land.tkm);
        vehicleRow.getCell(6).value = formatNumber(vehicle.coal.trips);
        vehicleRow.getCell(7).value = formatNumber(vehicle.coal.ton);
        vehicleRow.getCell(8).value = formatNumber(vehicle.coal.tkm);
        vehicleRow.getCell(9).value = formatNumber(vehicle.totalTkm);
        vehicleRow.getCell(10).value = vehicle.shift;
        vehicleRow.getCell(11).value = dayjs(vehicle.workingDate).isValid()
          ? dayjs(vehicle.workingDate).format("DD/MM/YYYY")
          : "";

        vehicleRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = center;
        });
        vehicleRow.getCell(2).alignment = {
          horizontal: "left",
          vertical: "middle",
        };
      });
    }
  });

  // --- Dòng Tổng Cộng Toàn Bộ ---
  currentRow++;
  const totalRow = sheet.getRow(currentRow);
  sheet.mergeCells(currentRow, 1, currentRow, 2);
  totalRow.getCell(1).value = "TỔNG CỘNG";
  totalRow.getCell(3).value = formatNumber(grandTotal.land.trips);
  totalRow.getCell(4).value = formatNumber(grandTotal.land.m3);
  totalRow.getCell(5).value = formatNumber(grandTotal.land.tkm);
  totalRow.getCell(6).value = formatNumber(grandTotal.coal.trips);
  totalRow.getCell(7).value = formatNumber(grandTotal.coal.ton);
  totalRow.getCell(8).value = formatNumber(grandTotal.coal.tkm);
  totalRow.getCell(9).value = formatNumber(grandTotal.totalTkm);
  totalRow.getCell(10).value = formatNumber(grandTotal.totalShifts);
  totalRow.getCell(11).value = formatNumber(grandTotal.totalDays);

  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true };
    cell.alignment = center;
  });
  totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  // === Kẻ khung (Borders) cho toàn bộ bảng ===
  addTableBorders(sheet, 6, currentRow, 1, 11);

  // === Ký tên ===
  currentRow += 2; // Cách ra 2 dòng trắng

  // Khối Người lập (bên trái)
  const leftCol = 2;
  const leftEnd = 4; // Rộng 3 cột (2, 3, 4)
  sheet.mergeCells(currentRow, leftCol, currentRow, leftEnd);
  sheet.getCell(currentRow, leftCol).value = "Người lập";
  sheet.getCell(currentRow, leftCol).font = { bold: true };
  sheet.getCell(currentRow, leftCol).alignment = center;

  sheet.mergeCells(currentRow + 1, leftCol, currentRow + 1, leftEnd);
  sheet.getCell(currentRow + 1, leftCol).value = "(Ký, ghi rõ họ tên)";
  sheet.getCell(currentRow + 1, leftCol).font = { italic: true, size: 11 };
  sheet.getCell(currentRow + 1, leftCol).alignment = center;

  // Chèn chữ ký (nếu có)
  if (signature) {
    const response = await axios.get(signature, {
      responseType: "arraybuffer",
    });
    const extension = response.headers["content-type"].split("/")[1];
    const imageBuffer = Buffer.from(response.data, "binary");

    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension,
    });

    sheet.addImage(imageId, {
      tl: { col: leftCol, row: currentRow + 1.2 },
      ext: { width: 100, height: 30 },
    });
  }

  // Quản đốc (bên phải)
  // Lấy cột cuối cùng là 11, khối Quản Đốc rộng 3 cột (9, 10, 11)
  const rightEnd = totalCols;
  const rightStart = totalCols - 2;
  sheet.mergeCells(currentRow, rightStart, currentRow, rightEnd);
  sheet.getCell(currentRow, rightStart).value = "Quản Đốc";
  sheet.getCell(currentRow, rightStart).font = { bold: true };
  sheet.getCell(currentRow, rightStart).alignment = center;

  sheet.mergeCells(currentRow + 1, rightStart, currentRow + 1, rightEnd);
  sheet.getCell(currentRow + 1, rightStart).value = "(Ký, ghi rõ họ tên)";
  sheet.getCell(currentRow + 1, rightStart).font = { italic: true, size: 11 };
  sheet.getCell(currentRow + 1, rightStart).alignment = center;

  // === Định dạng trang in và Font chữ ===
  sheet.pageSetup = {
    paperSize: 9, // A4
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

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font,
        name: "Times New Roman",
        ...(rowNumber >= 6 ?? { size: 11 }),
      };
      // Căn phải cho số liệu
      if (rowNumber >= 8 && rowNumber < currentRow && colNumber === 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
      // Căn giữa cho các trường còn lại (trừ cột 2)
      if (
        rowNumber >= 8 &&
        (colNumber === 1 || colNumber === 10 || colNumber === 11)
      ) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  // === Cấu hình chiều rộng cột ===
  const fixedCols = {
    1: 5, // TT
    2: 25, // LOẠI XE - SỐ XE
    9: 15,
    10: 8, // Ca xe
    11: 25, // Ngày xe
  };
  const dynamicWidth = 15;

  for (let i = 1; i <= totalCols; i++) {
    if (fixedCols[i]) {
      sheet.getColumn(i).width = fixedCols[i];
    } else {
      sheet.getColumn(i).width = dynamicWidth;
    }
  }
};
router.post(
  "/carProductivityReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { startDate, endDate, department, signature } = req.body;
      const user = req.user;
      let query = {};

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      query.workingDate = { $gte: start, $lte: end };

      // Lấy Orders
      const results = await getAllReport(query, dep, _);

      const workbook = new ExcelJS.Workbook();

      if (results.length > 0) {
        const totalSheetName = `Tong_hop_${dayjs(start).format("DD_MM")}_den_${dayjs(end).format("DD_MM")} `;

        await carProductivityReport(
          workbook,
          totalSheetName,
          dep,
          results,
          signature,
          dayjs,
          _,
        );

        // Ghi tiêu đề dạng "Từ ngày ... đến ngày ..."
        const totalSheet = workbook.getWorksheet(totalSheetName);
        if (totalSheet) {
          totalSheet.getCell(4, 1).value =
            `Từ ngày: ${dayjs(start).format("DD-MM-YYYY")} `;
          totalSheet.getCell(4, 3).value =
            `Đến ngày: ${dayjs(end).format("DD-MM-YYYY")} `;
        }
      }

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        query = { workingDate: d };

        const results = await getAllReport(query, dep, _);

        const totalSheetName = `Ngay_${dayjs(d).format("DD_MM_YYYY")} `;
        await carProductivityReport(
          workbook,
          totalSheetName,
          dep,
          results,
          signature,
          dayjs,
          _,
        );

        const title = `Ngày ${dayjs(d).format("DD-MM-YYYY")} `;
        const totalSheet = workbook.getWorksheet(totalSheetName);
        if (totalSheet) {
          totalSheet.getCell(4, 1).value = title;
        }
      }

      // === Xuất file ===
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename = BaoCaoNangSuatDauXe_${dayjs(startDate).format("DD_MM_YYYY")}_${dayjs(endDate).format("DD_MM_YYYY")}.xlsx`,
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      req.logger.error("❌ Lỗi khi load excavator product report", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// bao cao san luong van chuyen dat da,than (06,07)

const getAllReport = async (query, dep, type) => {
  const orders = await Order.find({
    ...query,
    department: dep?._id,
  })
    .populate({
      path: "device",
      select: "code category material",
      populate: [{ path: "category", select: "name" }],
    })
    .populate({ path: "job", select: "type" })
    .populate({ path: "shift", select: "name" })
    .sort("-workingDate");

  const filteredOrders = orders.filter(
    (order) =>
      order.device?.some((d) =>
        d.category?.name?.toLowerCase().includes("vận tải"),
      ) && order.job?.type === JOB_TYPE.VAN_HANH_XE,
  );

  let allReports = [];
  for (const order of filteredOrders) {
    let reports = await Report.find({ orderId: order._id })
      .populate("material", "name acceptedProduct")
      .populate("toLocation", "name")
      .populate({
        path: "device",
        select: "code category material",
        populate: [
          { path: "category", select: "name" },
          { path: "material", select: "name" },
        ],
      })
      .populate({
        path: "excavator",
        select: "code material",
        populate: [{ path: "material", select: "name" }],
      });

    reports = reports.filter(
      (r) =>
        r.device?.category?.name?.toLowerCase().includes("vận tải") &&
        (!type || r.material?.acceptedProduct.includes(type)),
    );
    if (!reports.length) continue;
    const mapped = reports.map((r) => ({
      ...r.toObject(),
      workingDate: r.workingDate || order.workingDate,
      shift: r.shift || order.shift,
    }));
    allReports.push(...mapped);
  }
  return allReports;
};
router.post(
  "/carProductionLandCoalReport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { startDate, endDate, department } = req.body;
      const type = req.query.type;
      const user = req.user;
      let query = {};

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      if (startDate && endDate) {
        query.workingDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Lấy Orders
      const allReports = await getAllReport(query, dep, type);
      const grouped = await groupProductionLand(allReports);
      res.status(200).send({ status: "success", data: grouped });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load excavator product report", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// Hàm tạo Sheet Excel (Tách ra để dùng cho cả Ngày và Tổng)
const carProductionLandCoalReport = async (
  workbook,
  dateOrRange, // Có thể là Date object cho báo cáo ngày, hoặc string cho báo cáo tổng
  dep,
  type,
  allReports,
  signature,
  ACCEPTED_PRODUCT,
  groupProductionLand, // Truyền vào các hàm utility cần thiết
  addTableBorders,
  dayjs,
  _,
) => {
  // Dữ liệu đã group theo deviceMaterial
  const grouped = await groupProductionLand(allReports);

  // ===== Chuẩn bị dữ liệu giống FE =====
  const headerColumns = _.uniq(grouped.map((g) => g.deviceMaterial));

  const allExcavatorRecords = grouped.flatMap((group) =>
    (group.excavators || []).map((item) => ({
      ...item,
      deviceMaterial: group.deviceMaterial ?? item.deviceMaterial,
    })),
  );

  const hierarchy = Object.entries(
    _.groupBy(allExcavatorRecords, "mainGroup"),
  ).flatMap(([mainGroup, mainItems]) => {
    let mainGroupExcavators = [];

    // 1. Xử lý SubGroups
    const subGroups = Object.entries(_.groupBy(mainItems, "subGroup")).flatMap(
      ([subGroup, subItems]) => {
        const groupedByExcavator = _.groupBy(subItems, "excavator");
        const excavators = Object.entries(groupedByExcavator).map(
          ([code, items]) => {
            const row = {
              type: "excavator", // Loại hàng: Máy xúc chi tiết
              excavator: code,
              totalTrips: _.sumBy(items, "totalTrips"),
              totalM3: _.sumBy(items, "totalM3"),
              totalTon: _.sumBy(items, "totalTon"),
              totalTkm: _.sumBy(items, "totalTkm"),
              materials: {},
            };
            items.forEach((i) => {
              row.materials[i.deviceMaterial] = {
                totalTrips: i.totalTrips,
                totalM3: i.totalM3,
                totalTon: i.totalTon,
                totalTkm: i.totalTkm,
              };
            });
            return row;
          },
        );

        // Gộp tất cả chi tiết máy xúc từ subGroup này vào tổng mainGroup
        mainGroupExcavators.push(...excavators);

        // --- Tính Tổng cho SubGroup và gán vào SubGroup Header ---
        const subGroupTotals = {
          totalTrips: _.sumBy(excavators, "totalTrips"),
          totalM3: _.sumBy(excavators, "totalM3"),
          totalTon: _.sumBy(excavators, "totalTon"),
          totalTkm: _.sumBy(excavators, "totalTkm"),
          materials: headerColumns.reduce((acc, col) => {
            acc[col] = {
              totalTrips: _.sumBy(
                excavators,
                (e) => e.materials[col]?.totalTrips || 0,
              ),
              totalM3: _.sumBy(
                excavators,
                (e) => e.materials[col]?.totalM3 || 0,
              ),
              totalTon: _.sumBy(
                excavators,
                (e) => e.materials[col]?.totalTon || 0,
              ),
              totalTkm: _.sumBy(
                excavators,
                (e) => e.materials[col]?.totalTkm || 0,
              ),
            };
            return acc;
          }, {}),
        };

        // Trả về: [dòng tiêu đề subGroup (đã có tổng), ...các máy xúc]
        return [
          { type: "subGroupHeader", subGroup, ...subGroupTotals },
          ...excavators,
        ];
      },
    );

    // 2. Tính Tổng cho MainGroup và gán vào MainGroup Header
    const mainGroupTotals = {
      totalTrips: _.sumBy(mainGroupExcavators, "totalTrips"),
      totalM3: _.sumBy(mainGroupExcavators, "totalM3"),
      totalTon: _.sumBy(mainGroupExcavators, "totalTon"),
      totalTkm: _.sumBy(mainGroupExcavators, "totalTkm"),
      materials: headerColumns.reduce((acc, col) => {
        acc[col] = {
          totalTrips: _.sumBy(
            mainGroupExcavators,
            (e) => e.materials[col]?.totalTrips || 0,
          ),
          totalM3: _.sumBy(
            mainGroupExcavators,
            (e) => e.materials[col]?.totalM3 || 0,
          ),
          totalTon: _.sumBy(
            mainGroupExcavators,
            (e) => e.materials[col]?.totalTon || 0,
          ),
          totalTkm: _.sumBy(
            mainGroupExcavators,
            (e) => e.materials[col]?.totalTkm || 0,
          ),
        };
        return acc;
      }, {}),
    };

    // Trả về: [dòng tiêu đề mainGroup (đã có tổng), ...các subGroup chi tiết]
    return [
      { type: "mainGroupHeader", mainGroup, ...mainGroupTotals },
      ...subGroups,
    ];
  });

  const overallTotals = {
    totalTrips: _.sumBy(grouped, "totalTrips"),
    totalM3: _.sumBy(grouped, "totalM3"),
    totalTon: _.sumBy(grouped, "totalTon"),
    totalTkm: _.sumBy(grouped, "totalTkm"),
    materialTotals: grouped.reduce((acc, group) => {
      acc[group.deviceMaterial] = {
        totalTrips: group.totalTrips,
        totalM3: group.totalM3,
        totalTon: group.totalTon,
        totalTkm: group.totalTkm,
      };
      return acc;
    }, {}),
  };

  // ===== Tạo Excel =====
  const sheetName =
    dateOrRange instanceof Date
      ? `Bao_cao_san_luong_${dayjs(dateOrRange).format("DD_MM_YYYY")} `
      : dateOrRange;
  const sheet = workbook.addWorksheet(sheetName, {
    // views: [{ showGridLines: false }],
  });

  const totalColSpan = 2 + 3 + headerColumns.length * 3; // TT + Máy xúc + 3 + 3*n

  let currentRow = 1;

  // ===== Title / thông tin chung (giống các báo cáo khác) =====
  sheet.mergeCells(currentRow, 1, currentRow, totalColSpan);
  sheet.getCell(currentRow, 1).value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
  sheet.getCell(currentRow, 1).font = { italic: true, size: 18 };
  currentRow += 2;

  sheet.mergeCells(currentRow, 1, currentRow, totalColSpan);
  sheet.getCell(currentRow, 1).value =
    `BÁO CÁO SẢN LƯỢNG VẬN CHUYỂN ${ACCEPTED_PRODUCT.LAND.includes(type) ? "ĐẤT ĐÁ" : "THAN"} `;
  sheet.getCell(currentRow, 1).font = { bold: true, size: 14 };
  sheet.getCell(currentRow, 1).alignment = { horizontal: "center" };
  currentRow++;

  sheet.mergeCells(currentRow, 1, currentRow, totalColSpan);
  sheet.getCell(currentRow, 1).value = `Đơn vị: ${dep?.code || ""} `;
  currentRow++;

  sheet.getCell(currentRow, 1).value =
    dateOrRange instanceof Date
      ? `Ngày: ${dayjs(dateOrRange).format("DD-MM-YYYY")} `
      : dateOrRange;

  currentRow += 2;

  const headerRow1 = currentRow;
  const headerRow2 = currentRow + 1;

  const center = { horizontal: "center", vertical: "middle", wrapText: true };

  // ===== Header =====
  // TT
  sheet.mergeCells(headerRow1, 1, headerRow2, 1);
  sheet.getCell(headerRow1, 1).value = "TT";

  // Máy xúc
  sheet.mergeCells(headerRow1, 2, headerRow2, 2);
  sheet.getCell(headerRow1, 2).value = "Máy xúc";

  // Tổng số
  sheet.mergeCells(headerRow1, 3, headerRow1, 5);
  sheet.getCell(headerRow1, 3).value = "Tổng số";
  sheet.getCell(headerRow2, 3).value = "Chuyến";
  sheet.getCell(headerRow2, 4).value = ACCEPTED_PRODUCT.LAND.includes(type)
    ? "M³"
    : "Tấn";
  sheet.getCell(headerRow2, 5).value = "Tkm";

  let col = 6;
  headerColumns.forEach((mat) => {
    sheet.mergeCells(headerRow1, col, headerRow1, col + 2);
    sheet.getCell(headerRow1, col).value = `Loại xe ${mat} `;
    sheet.getCell(headerRow2, col).value = "Chuyến";
    sheet.getCell(headerRow2, col + 1).value = ACCEPTED_PRODUCT.LAND.includes(
      type,
    )
      ? "M³"
      : "Tấn";
    sheet.getCell(headerRow2, col + 2).value = "Tkm";
    col += 3;
  });

  // style header
  for (let r = headerRow1; r <= headerRow2; r++) {
    for (let c = 1; c <= totalColSpan; c++) {
      const cell = sheet.getCell(r, c);
      cell.alignment = center;
      cell.font = { bold: true, size: 11 };
    }
  }

  currentRow = headerRow2 + 1;

  // ===== Dòng tổng =====
  sheet.mergeCells(currentRow, 1, currentRow, 2);
  sheet.getCell(currentRow, 1).value = "Tổng số";
  sheet.getCell(currentRow, 3).value = overallTotals.totalTrips;
  sheet.getCell(currentRow, 4).value = ACCEPTED_PRODUCT.LAND.includes(type)
    ? overallTotals.totalM3
    : overallTotals.totalTon;
  sheet.getCell(currentRow, 5).value = overallTotals.totalTkm;

  col = 6;
  headerColumns.forEach((mat) => {
    const totals = overallTotals.materialTotals[mat] || {};
    sheet.getCell(currentRow, col).value = totals.totalTrips || "";
    sheet.getCell(currentRow, col + 1).value = ACCEPTED_PRODUCT.LAND.includes(
      type,
    )
      ? totals.totalM3 || ""
      : totals.totalTon || "";
    sheet.getCell(currentRow, col + 2).value = totals.totalTkm || "";
    col += 3;
  });

  for (let c = 1; c <= totalColSpan; c++) {
    const cell = sheet.getCell(currentRow, c);
    cell.alignment = {
      horizontal: c <= 2 ? "left" : "center",
      vertical: "middle",
    };
    cell.font = { bold: true };
  }

  // ===== Body: mainGroup -> subGroup -> excavator =====
  const startDataRow = currentRow + 1;

  // ===== Body: mainGroup -> subGroup -> excavator (Đã sửa lại) =====
  let stt = 0; // Để đếm số thứ tự cho SubGroup
  hierarchy.forEach((row, rowIdx) => {
    currentRow++;

    // Xử lý dòng tiêu đề MainGroup (ví dụ: Cục (1-7))
    if (row.type === "mainGroupHeader") {
      stt = 0; // Reset STT SubGroup khi gặp MainGroup mới

      // Merge cột TT (1) và Tên nhóm (2)
      sheet.mergeCells(currentRow, 1, currentRow, 2);
      sheet.getCell(currentRow, 1).value = `${row.mainGroup} `; // **Cục (1-7)**
      sheet.getCell(currentRow, 1).font = { bold: true };
      sheet.getCell(currentRow, 1).alignment = { horizontal: "left" };
      sheet.getCell(currentRow, 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8E8E8" },
      };

      // Ghi tổng vào các cột số liệu (không merge)
      sheet.getCell(currentRow, 3).value = row.totalTrips || "";
      sheet.getCell(currentRow, 4).value = ACCEPTED_PRODUCT.LAND.includes(type)
        ? row.totalM3 || ""
        : row.totalTon || "";
      sheet.getCell(currentRow, 5).value = row.totalTkm || "";

      let col = 6;
      headerColumns.forEach((mat) => {
        const matData = row.materials[mat] || {};
        sheet.getCell(currentRow, col).value = matData.totalTrips || "";
        sheet.getCell(currentRow, col + 1).value =
          ACCEPTED_PRODUCT.LAND.includes(type)
            ? matData.totalM3 || ""
            : matData.totalTon || "";
        sheet.getCell(currentRow, col + 2).value = matData.totalTkm || "";
        col += 3;
      });

      // Style cho dòng tổng
      for (let c = 1; c <= totalColSpan; c++) {
        const cell = sheet.getCell(currentRow, c);
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8E8E8" },
        };
        // Căn trái cho cột 1, 2 (tên nhóm), căn giữa cho các cột số liệu
        cell.alignment = {
          horizontal: c <= 2 ? "left" : "center",
          vertical: "middle",
        };
      }
      return;
    }

    // Xử lý dòng tiêu đề SubGroup (ví dụ: Máy xúc Mitsubishi 3T)
    if (row.type === "subGroupHeader") {
      stt++; // Tăng STT cho SubGroup

      // Merge cột TT (1) và Tên nhóm (2)
      sheet.getCell(currentRow, 1).value = stt;
      sheet.mergeCells(currentRow, 2, currentRow, 2); // Chỉ merge cột 2, không merge qua cột số liệu
      sheet.getCell(currentRow, 2).value = `Máy xúc ${row.subGroup} `;
      sheet.getCell(currentRow, 2).font = { bold: true, italic: true };
      sheet.getCell(currentRow, 2).alignment = { horizontal: "left" };

      // Ghi tổng vào các cột số liệu (không merge)
      sheet.getCell(currentRow, 3).value = row.totalTrips || "";
      sheet.getCell(currentRow, 4).value = ACCEPTED_PRODUCT.LAND.includes(type)
        ? row.totalM3 || ""
        : row.totalTon || "";
      sheet.getCell(currentRow, 5).value = row.totalTkm || "";

      let col = 6;
      headerColumns.forEach((mat) => {
        const matData = row.materials[mat] || {};
        sheet.getCell(currentRow, col).value = matData.totalTrips || "";
        sheet.getCell(currentRow, col + 1).value =
          ACCEPTED_PRODUCT.LAND.includes(type)
            ? matData.totalM3 || ""
            : matData.totalTon || "";
        sheet.getCell(currentRow, col + 2).value = matData.totalTkm || "";
        col += 3;
      });

      // Style cho dòng tổng
      for (let c = 1; c <= totalColSpan; c++) {
        const cell = sheet.getCell(currentRow, c);
        if (c <= 2) {
          cell.font = { bold: true, italic: true };
        }
        // Căn giữa cho cột TT (1) và các cột số liệu (3 trở đi)
        cell.alignment = {
          horizontal: c === 2 ? "left" : "center",
          vertical: "middle",
        };
      }
      return;
    }

    // Xử lý chi tiết từng máy xúc
    if (row.type === "excavator") {
      sheet.getCell(currentRow, 1).value = "";
      sheet.getCell(currentRow, 2).value = row.excavator;
      sheet.getCell(currentRow, 3).value = row.totalTrips;
      sheet.getCell(currentRow, 4).value = ACCEPTED_PRODUCT.LAND.includes(type)
        ? row.totalM3
        : row.totalTon;
      sheet.getCell(currentRow, 5).value = row.totalTkm;

      let col = 6;
      headerColumns.forEach((mat) => {
        const matData = row.materials[mat] || {};
        sheet.getCell(currentRow, col).value = matData.totalTrips || "";
        sheet.getCell(currentRow, col + 1).value =
          ACCEPTED_PRODUCT.LAND.includes(type)
            ? matData.totalM3 || ""
            : matData.totalTon || "";
        sheet.getCell(currentRow, col + 2).value = matData.totalTkm || "";
        col += 3;
      });

      for (let c = 1; c <= totalColSpan; c++) {
        const cell = sheet.getCell(currentRow, c);
        cell.alignment = {
          horizontal: c <= 2 ? "left" : "center",
          vertical: "middle",
        };
      }
      return;
    }
  });

  // === Kẻ khung (Borders) cho toàn bộ bảng ===
  addTableBorders(sheet, 7, currentRow, 1, totalColSpan);

  // === Ký tên ===
  currentRow += 2; // Cách ra 2 dòng trắng

  // Khối Người lập (bên trái)
  const leftCol = 1;
  const leftEnd = 2; // Rộng 3 cột (2, 3, 4)
  sheet.mergeCells(currentRow, leftCol, currentRow, leftEnd);
  sheet.getCell(currentRow, leftCol).value = "Người lập";
  sheet.getCell(currentRow, leftCol).font = { bold: true };
  sheet.getCell(currentRow, leftCol).alignment = center;

  sheet.mergeCells(currentRow + 1, leftCol, currentRow + 1, leftEnd);
  sheet.getCell(currentRow + 1, leftCol).value = "(Ký, ghi rõ họ tên)";
  sheet.getCell(currentRow + 1, leftCol).font = { italic: true, size: 11 };
  sheet.getCell(currentRow + 1, leftCol).alignment = center;

  // ===== Chữ ký =====
  if (signature) {
    const response = await axios.get(signature, {
      responseType: "arraybuffer",
    });
    const extension = response.headers["content-type"].split("/")[1];
    const imageBuffer = Buffer.from(response.data, "binary");

    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension,
    });

    sheet.addImage(imageId, {
      tl: { col: leftCol, row: currentRow + 1.2 },
      ext: { width: 100, height: 30 },
    });
  }

  // const leftCol1 = 3;
  // const leftEnd1 = 4;
  // sheet.mergeCells(currentRow, leftCol1, currentRow, leftEnd1);
  // sheet.getCell(currentRow, leftCol1).value = 'Phòng KTVT';
  // sheet.getCell(currentRow, leftCol1).font = { bold: true };
  // sheet.getCell(currentRow, leftCol1).alignment = center;

  // sheet.mergeCells(currentRow + 1, leftCol1, currentRow + 1, leftEnd1);
  // sheet.getCell(currentRow + 1, leftCol1).value = '(Ký, ghi rõ họ tên)';
  // sheet.getCell(currentRow + 1, leftCol1).font = { italic: true, size: 11 };
  // sheet.getCell(currentRow + 1, leftCol1).alignment = center;

  // const rightEnd1 = totalColSpan - 2;
  // const rightStart1 = totalColSpan - 3;
  // sheet.mergeCells(currentRow, rightStart1, currentRow, rightEnd1);
  // sheet.getCell(currentRow, rightStart1).value = 'Phòng KT';
  // sheet.getCell(currentRow, rightStart1).font = { bold: true };
  // sheet.getCell(currentRow, rightStart1).alignment = center;

  // sheet.mergeCells(currentRow + 1, rightStart1, currentRow + 1, rightEnd1);
  // sheet.getCell(currentRow + 1, rightStart1).value = '(Ký, ghi rõ họ tên)';
  // sheet.getCell(currentRow + 1, rightStart1).font = { italic: true, size: 11 };
  // sheet.getCell(currentRow + 1, rightStart1).alignment = center;

  // Quản đốc (bên phải)
  // Lấy cột cuối cùng là 11, khối Quản Đốc rộng 3 cột (9, 10, 11)
  const rightEnd = totalColSpan;
  const rightStart = totalColSpan - 1;
  sheet.mergeCells(currentRow, rightStart, currentRow, rightEnd);
  sheet.getCell(currentRow, rightStart).value = "Quản Đốc";
  sheet.getCell(currentRow, rightStart).font = { bold: true };
  sheet.getCell(currentRow, rightStart).alignment = center;

  sheet.mergeCells(currentRow + 1, rightStart, currentRow + 1, rightEnd);
  sheet.getCell(currentRow + 1, rightStart).value = "(Ký, ghi rõ họ tên)";
  sheet.getCell(currentRow + 1, rightStart).font = { italic: true, size: 11 };
  sheet.getCell(currentRow + 1, rightStart).alignment = center;

  // === Định dạng trang in và Font chữ ===
  sheet.pageSetup = {
    paperSize: 9, // A4
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

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (!cell.font) cell.font = {};
      cell.font = {
        ...cell.font,
        name: "Times New Roman",
        ...(rowNumber >= 6 ?? { size: 10 }),
      };
      // Căn phải cho số liệu
      // if (rowNumber >= 8 && rowNumber < currentRow && colNumber === 2) {
      //     cell.alignment = { horizontal: 'left', vertical: 'middle' };
      // }
      // // Căn giữa cho các trường còn lại (trừ cột 2)
      // if (rowNumber >= 8 && (colNumber === 1 || colNumber === 10 || colNumber === 11)) {
      //     cell.alignment = { horizontal: 'center', vertical: 'middle' };
      // }
    });
  });

  // === Cấu hình chiều rộng cột ===
  const fixedCols = {
    1: 5, // TT
    2: 20, // LOẠI XE - SỐ XE
  };
  const totalTargetWidth = 150;

  // Tính tổng width đã fix
  const fixedWidthSum = Object.values(fixedCols).reduce((a, b) => a + b, 0);

  // Còn lại chia đều cho các cột giữa
  const dynamicCols = totalColSpan - Object.keys(fixedCols).length;
  const dynamicWidth = Math.max(
    10,
    (totalTargetWidth - fixedWidthSum) / dynamicCols,
  );

  for (let i = 1; i <= totalColSpan; i++) {
    if (fixedCols[i]) {
      sheet.getColumn(i).width = fixedCols[i];
    } else {
      sheet.getColumn(i).width = dynamicWidth;
    }
  }
};

router.post(
  "/carProductionLandCoalReport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res) => {
    try {
      const { startDate, endDate, department, signature } = req.body;
      const type = req.query.type;
      const user = req.user;
      let query = {};

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code name");
      } else {
        dep = user?.department;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      query.workingDate = { $gte: start, $lte: end };

      const workbook = new ExcelJS.Workbook();

      const results = await getAllReport(query, dep, type);

      if (results.length > 0) {
        const totalSheetName = `Tong_hop_${dayjs(start).format("DD_MM_YYYY")}_den_${dayjs(end).format("DD_MM_YYYY")} `;

        await carProductionLandCoalReport(
          workbook,
          totalSheetName,
          dep,
          type,
          results,
          signature,
          ACCEPTED_PRODUCT,
          groupProductionLand,
          addTableBorders,
          dayjs,
          _,
        );

        // Ghi tiêu đề dạng "Từ ngày ... đến ngày ..."
        const totalSheet = workbook.getWorksheet(totalSheetName);
        if (totalSheet) {
          totalSheet.getCell(5, 1).value =
            `Từ ngày: ${dayjs(start).format("DD-MM-YYYY")} `;
          totalSheet.getCell(5, 3).value =
            `Đến ngày: ${dayjs(end).format("DD-MM-YYYY")} `;
        }
      }

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        query = { workingDate: d };

        const results = await getAllReport(query, dep, type);

        const totalSheetName = `Ngay_${dayjs(d).format("DD_MM_YYYY")} `;
        await carProductionLandCoalReport(
          workbook,
          totalSheetName, // Truyền Date object cho báo cáo ngày
          dep,
          type,
          results,
          signature,
          ACCEPTED_PRODUCT,
          groupProductionLand,
          addTableBorders,
          dayjs,
          _,
        );

        const title = `Ngày ${dayjs(d).format("DD-MM-YYYY")} `;
        const totalSheet = workbook.getWorksheet(totalSheetName);
        if (totalSheet) {
          totalSheet.getCell(5, 1).value = title;
        }
      }

      // ===== Gửi file =====
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename = "BC_sanluong.xlsx"`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      req.logger?.error(
        "❌ Lỗi khi export báo cáo sản lượng vận chuyển đất đá",
        err,
      );
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

// so nhat lenh quan doc
router.post(
  "/dailyorderreport/view",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { day, department, shift } = req.body;
      const user = req.user;
      let query = {};

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      if (day) {
        query.workingDate = new Date(day);
      } else {
        return res
          .status(400)
          .json({ status: "error", message: "Ngày là bắt buộc" });
      }
      if (shift?.length) query.shift = { $in: shift };

      const orders = await Order.find({
        ...query,
        department: new mongoose.Types.ObjectId(dep?._id),
      })
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode position",
          populate: "position",
        })
        .populate({
          path: "createdBy",
          select: "fullName salaryCode position",
          populate: "position",
        })
        .populate({
          path: "department",
          select: "name",
        })
        .populate({
          path: "device",
          select: "code",
        })
        .populate("excavator.device", "code")
        .populate("material", "name")
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate({
          path: "job",
          select: "type",
        });

      res.status(200).send({ status: "success", data: orders });
    } catch (err) {
      req.logger.error("❌ Lỗi khi load so nhat lenh", err);
      res
        .status(500)
        .json({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.post(
  "/dailyorderreport",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
  async (req, res, next) => {
    try {
      const { day, department, shift, signature } = req.body;
      const user = req.user;
      let query = {};

      const shiftData = await Shift.findById(shift[0]);

      let dep;
      if (department) {
        dep = await Department.findById(department).select("code");
      } else {
        dep = user?.department;
      }

      if (day) {
        query.workingDate = new Date(day);
      } else {
        return res
          .status(400)
          .json({ status: "error", message: "Ngày là bắt buộc" });
      }
      if (shift?.length) query.shift = shift;

      const orders = await Order.find({
        ...query,
        department: new mongoose.Types.ObjectId(dep?._id),
      })
        .populate({
          path: "assignedTo",
          select: "fullName salaryCode position",
          populate: "position",
        })
        .populate({
          path: "createdBy",
          select: "fullName salaryCode position",
          populate: "position",
        })
        .populate({
          path: "department",
          select: "name",
        })
        .populate({
          path: "device",
          select: "code",
        })
        .populate("excavator.device", "code")
        .populate("material", "name")
        .populate({
          path: "assistants",
          select: "fullName salaryCode",
        })
        .populate({
          path: "job",
          select: "type",
        });

      // === 4️⃣ Chuẩn bị file Excel - Start of Fixes V3 (Giống ảnh mẫu) ===
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sổ nhật lệnh quản đốc");
      const center = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      worksheet.mergeCells(1, 1, 1, 13);
      worksheet.getCell("A1").value = "CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV";
      worksheet.getCell("A1").font = { italic: true, size: 18 };
      worksheet.getCell("A1").alignment = { horizontal: "left" };

      // === Header 1: Tiêu đề khối (Row 1) ===
      worksheet.mergeCells(2, 1, 2, 13);
      worksheet.getCell("A2").value = "SỔ NHẬT LỆNH QUẢN ĐỐC";
      worksheet.getCell("A2").alignment = center;
      worksheet.getCell("A2").font = { bold: true, size: 14 };

      worksheet.mergeCells(3, 1, 3, 2);
      worksheet.getCell("A3").value = `Đơn vị: ${dep?.code || ""} `;
      worksheet.getCell("A3").alignment = { horizontal: "left" };
      worksheet.mergeCells(4, 1, 4, 2);
      // Sửa hiển thị ngày/tháng
      worksheet.getCell("A4").value =
        "Ngày: " + dayjs(day).format("DD/MM/YYYY");
      worksheet.getCell("A4").alignment = { horizontal: "left" };

      worksheet.getCell("C4").value = "Ca: " + shiftData?.name || "";
      worksheet.getCell("C4").alignment = { horizontal: "left" };

      // === Header 2: Tiêu đề nhóm (Row 3) ===
      const headerRowNumber = 6;

      const headers = [
        "Tên tổ sản xuất",
        "Người tạo lệnh",
        "Người nhận lệnh",
        "Thời gian tạo lệnh",
        "Tên-Số hiệu thiết bị",
        "Khu vực",
        "Nơi chất tải",
        "Tên hàng",
        "Nội dung công việc",
        "Sản lượng theo định mức",
        "Dự báo nguy cơ mất AT",
        "Biện pháp an toàn",
        // "Nhóm trưởng",
        "Họ tên - Bậc lương",
      ];

      headers.forEach((text, index) => {
        const cell = worksheet.getRow(headerRowNumber).getCell(index + 1);
        cell.value = text;
        cell.font = { bold: true };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      let totalDataRows = headerRowNumber;
      orders.forEach((i) => {
        // Dùng forEach thay vì map nếu không trả về mảng mới
        totalDataRows++;
        const row = worksheet.addRow([
          i?.department?.name || "",
          `${i?.createdBy?.fullName || ""} - ${i?.createdBy?.salaryCode || ""} - ${i?.createdBy?.position?.name || ""}`,
          `${i?.assignedTo?.fullName || ""} - ${i?.assignedTo?.salaryCode || ""} - ${i?.assignedTo?.position?.name || ""}`,
          i?.createdAt ? dayjs(i?.createdAt).format("DD/MM/YYYY HH:mm:ss") : "",
          (i?.device || []).map((d) => d.code || "").join(", "),
          "",
          (i?.excavator || []).map((d) => d.device?.code || "").join(", "),
          (i?.material || []).map((d) => d.name || "").join(", "),
          i?.workContent || "",
          "",
          i?.risk || "",
          (i?.safetyMeasure || "") + " " + (i?.safetyMeasureSpecific || ""),
          // i?.assignedTo?.fullName,
          "",
        ]);
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "top", // Căn lên trên cùng
            horizontal: "left", // Căn sang trái
            wrapText: false, // Mặc định không xuống dòng để giữ row height thấp
          };
        });

        // Ép ô cột A (cột 1) phải xuống dòng nếu dài
        row.getCell(1).alignment = {
          vertical: "top",
          horizontal: "left", // Hoặc "left" tùy bạn
          wrapText: true,
        };

        // Bạn cũng nên áp dụng cho các cột khác có khả năng dài như cột 6, 8, 9
        [2, 3, 4, 5, 7, 8].forEach((colIdx) => {
          row.getCell(colIdx).alignment = {
            vertical: "top",
            horizontal: "left",
            wrapText: true,
          };
        });
      });

      addTableBorders(worksheet, 6, totalDataRows, 1, 13);

      // Khối Người lập (bên trái)
      const currentRow = totalDataRows + 2;
      const leftCol = 2;
      const leftEnd = 3; // Rộng 3 cột (2, 3, 4)
      worksheet.mergeCells(currentRow, leftCol, currentRow, leftEnd);
      worksheet.getCell(currentRow, leftCol).value = "Người lập";
      worksheet.getCell(currentRow, leftCol).font = { bold: true };
      worksheet.getCell(currentRow, leftCol).alignment = center;

      worksheet.mergeCells(currentRow + 1, leftCol, currentRow + 1, leftEnd);
      worksheet.getCell(currentRow + 1, leftCol).value = "(Ký, ghi rõ họ tên)";
      worksheet.getCell(currentRow + 1, leftCol).font = {
        italic: true,
        size: 11,
      };
      worksheet.getCell(currentRow + 1, leftCol).alignment = center;

      // Chèn chữ ký (nếu có)
      if (signature) {
        const response = await axios.get(signature, {
          responseType: "arraybuffer",
        });
        const extension = response.headers["content-type"].split("/")[1];
        const imageBuffer = Buffer.from(response.data, "binary");

        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension,
        });

        worksheet.addImage(imageId, {
          tl: { col: leftCol - 0.5, row: currentRow + 1.2 },
          ext: { width: 100, height: 30 },
        });
      }

      worksheet.mergeCells(currentRow + 4, leftCol, currentRow + 4, leftEnd);
      worksheet.getCell(currentRow + 4, leftCol).value = user?.fullName;
      worksheet.getCell(currentRow + 4, leftCol).font = {
        bold: true,
        size: 11,
      };
      worksheet.getCell(currentRow + 4, leftCol).alignment = center;

      // Quản đốc (bên phải)
      // Lấy cột cuối cùng là 11, khối Quản Đốc rộng 3 cột (9, 10, 11)
      const rightEnd = 13;
      const rightStart = 10;
      worksheet.mergeCells(currentRow, rightStart, currentRow, rightEnd);
      worksheet.getCell(currentRow, rightStart).value = "Quản Đốc";
      worksheet.getCell(currentRow, rightStart).font = { bold: true };
      worksheet.getCell(currentRow, rightStart).alignment = center;

      worksheet.mergeCells(
        currentRow + 1,
        rightStart,
        currentRow + 1,
        rightEnd,
      );
      worksheet.getCell(currentRow + 1, rightStart).value =
        "(Ký, ghi rõ họ tên)";
      worksheet.getCell(currentRow + 1, rightStart).font = {
        italic: true,
        size: 11,
      };
      worksheet.getCell(currentRow + 1, rightStart).alignment = center;

      // === A4 Landscape and Final Styling ===
      worksheet.pageSetup = {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      worksheet.columns = [
        { key: "A", width: 15 }, // STT
        { key: "B", width: 17 }, // Nhận tải
        { key: "C", width: 17 }, // Đổ tải
        { key: "D", width: 15 }, // Loại hàng
        { key: "E", width: 15 }, // Cung độ tạm tính
        { key: "F", width: 15 }, // Chiều cao nâng tải
        { key: "G", width: 15 }, // Số chuyến
        { key: "H", width: 15 }, // Khối lượng
        { key: "I", width: 25 }, // Trọng lượng
        { key: "J", width: 15 }, // Sản lượng
        { key: "K", width: 20 }, // Sản lượng
        { key: "L", width: 20 }, // Sản lượng
        { key: "M", width: 17 }, // Sản lượng

        // { key: "K", width: 15 }, // Nhiên liệu
      ];

      // Apply font, alignment and borders to all cells from row 3 onwards
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          // Apply general font/size
          if (!cell.font) cell.font = {};
          if (rowNumber !== 1) {
            // Row 1 uses size 14
            cell.font = {
              ...cell.font,
              name: "Times New Roman",
              ...(rowNumber >= 6 ?? { size: 11 }),
            };
          }
        });
      });

      // === Xuất file ===
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename = "BC_SL.xlsx"`,
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      req.logger.error("❌ Lỗi khi load carProductReport", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);
function setCell(ws, range, value) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(":")[0]);
  cell.value = value;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.font = { bold: true };
}
function setMergeCellHeader(ws, range, value) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(":")[0]);
  cell.value = value;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.font = { bold: true };
}
function setCellHeader(ws, range, value) {
  const cell = ws.getCell(range);
  cell.value = value;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.font = { bold: true };
}
function formatDate(date) {
  return date.toLocaleDateString("vi-VN"); // dạng 10/07/2025
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
function getColumnLetter(col) {
  let letter = "";
  while (col > 0) {
    let remainder = (col - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}
function setAutoRowHeight(row, text, lineHeight = 25) {
  if (!text) return;
  const lines = text.split("\n").length;
  row.height = lines * lineHeight;
}

function timeSignature(worksheet, row, startCol, endCol, time) {
  const cellRange = `${startCol}${row}:${endCol}${row}`;
  const cellAddress = `${startCol}${row}`;

  // 1. Merge các ô
  worksheet.mergeCells(cellRange);

  // 2. Gán giá trị thời gian hiện tại
  worksheet.getCell(cellAddress).value = time
    ? dayjs(time).format("DD/MM/YYYY HH:mm:ss")
    : "";

  // 3. Căn giữa
  worksheet.getCell(cellAddress).alignment = {
    horizontal: "center",
    vertical: "middle", // Thêm vertical cho đẹp nếu cần
  };
}

module.exports = router;
