const express = require("express");
const router = express.Router();
const { AppError } = require("../utils/errorHandler");
const SafetyMeasure = require("../models/SafetyMeasures");
const Job = require("../models/Job");
const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");
const { ROLE } = require("../config/config");
const { paginateQuery } = require("../utils/pagination");

const columnMapping = {
  "Tên biện pháp an toàn chung": "name",
  "Biện pháp an toàn chung": "content",
  "Loại công việc": "job",
};

router.post(
  "/",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const { name, content, job, position } = req.body;
      const newSafetyMeasure = new SafetyMeasure({
        name,
        content,
        job,
        position,
      });
      await newSafetyMeasure.save();
      req.logger.info(`✅ Tạo biện pháp an toàn thành công: ${content}`);
      res.status(200).send({ status: "success", message: "Tạo thành công" });
    } catch (err) {
      req.logger.error("❌ Lỗi khi tạo biện pháp an toàn", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.delete(
  "/",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const user = req.user;
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        req.logger.warn("⚠️ Yêu cầu xóa không có IDs hợp lệ.");
        return res
          .status(400)
          .send({ status: "error", message: "Vui lòng chọn bản ghi cần xóa" });
      }

      const result = await SafetyMeasure.deleteMany({ _id: { $in: ids } });
      if (result.deletedCount === 0) {
        req.logger.info("ℹ️ Không tìm thấy bản ghi để xóa.");
        return res
          .status(200)
          .send({ status: "error", message: "Không tìm thấy bản ghi để xóa" });
      }

      req.logger.info(
        `✅ ${user?.username}  Đã xóa thành công ${result.deletedCount} bản ghi biện pháp an toàn.`,
      );
      res.status(200).json({
        status: "success",
        message: `Đã xóa ${result.deletedCount} bản ghi`,
      });
    } catch (err) {
      req.logger.error("❌ Lỗi khi xóa biện pháp an toàn", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.put(
  "/:id",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const user = req.user;
      const safetyMeasure = await SafetyMeasure.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true },
      );

      if (!safetyMeasure) {
        req.logger.warn(
          `⚠️ Cập nhật thất bại - Không tìm thấy biện pháp an toàn với ID: ${req.params.id}`,
        );
        return res
          .status(404)
          .send({ status: "error", message: "Sửa thất bại " });
      }

      req.logger.info(
        `✅ ${user?.username} Cập nhật biện pháp an toàn thành công cho ID: ${req.params.id}`,
      );
      res.status(200).json({
        status: "success",
        message: "Sửa thành công",
      });
    } catch (err) {
      req.logger.error("❌ Lỗi khi cập nhật biện pháp an toàn", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
router.get("/", verifyToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.q) {
      const regex = new RegExp(req.query.q, "i");
      query.name = regex;
    }

    let modelQuery = SafetyMeasure.find(query)
      .populate("job", "name")
      .populate("position", "name")
      .collation({ locale: "vi", strength: 1 })
      .sort({ content: 1 });

    const result = await paginateQuery(
      modelQuery,
      SafetyMeasure,
      query,
      req.query,
    );

    res.status(200).send({ status: "success", ...result });
  } catch (err) {
    req.logger.error("❌ Lỗi khi lấy danh sách biện pháp an toàn", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
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
      const dataImport = data.filter((row) => row.content);

      if (dataImport.length === 0) {
        req.logger.warn(
          "⚠️ Import file thất bại - Không tìm thấy dữ liệu hợp lệ.",
        );
        return res.status(400).json({
          status: "error",
          message: "Không tìm thấy dữ liệu hợp lệ trong file.",
        });
      }
      const uniqueJobs = [
        ...new Set(dataImport.map((d) => d.job).filter(Boolean)),
      ];

      const operations = [];
      const invalidRows = [];

      for (const item of dataImport) {
        operations.push({
          updateOne: {
            filter: { name: item.name },
            update: { $set: item },
            upsert: true,
          },
        });
      }

      let bulkResult = null;
      if (operations.length > 0) {
        bulkResult = await SafetyMeasure.bulkWrite(operations);
      }
      req.logger.info(
        `✅ ${user?.username}  Import file thành công. Đã xử lý ${dataImport.length} bản ghi.`,
      );
      res.status(200).json({
        status: "success",
        message: "Import dữ liệu hoàn tất.",
        summary: {
          totalProcessed: dataImport.length,
          insertedCount: bulkResult ? bulkResult.upsertedCount : 0,
          updatedCount: bulkResult ? bulkResult.modifiedCount : 0,
          invalidCount: invalidRows.length,
        },
        invalidRows: invalidRows,
      });
    } catch (error) {
      req.logger.error("❌ Lỗi khi import file biện pháp an toàn", error);
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
      const data = await SafetyMeasure.find().populate("job", "name");

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("DS.bien_phap");

      const jobs = await Job.find();

      worksheet.columns = [
        { header: "Tên biện pháp an toàn chung", key: "name", width: 50 },
        { header: "Biện pháp an toàn chung", key: "content", width: 50 },
        // { header: 'Loại công việc', key: 'job', width: 20 },
      ];

      const formattedDevices = (data || []).map((item) => ({
        name: item?.name || "",
        content: item?.content || "",
        // job: item?.job?.name || '',
      }));
      worksheet.addRows(formattedDevices);

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.font = { size: 9, bold: rowNumber === 1 };
          cell.alignment = { vertical: "middle", wrapText: true };
        });
      });
      // const jobList = [...new Set(jobs.map(p => p.name).filter(Boolean))];

      // worksheet.getColumn('X').values = ['jobs', ...jobList];
      // worksheet.getColumn('X').hidden = true;

      // const MAX = Math.max(worksheet.rowCount + 100, 1000);
      // worksheet.dataValidations.add(`C2:C${MAX}`, {
      //     type: 'list',
      //     allowBlank: true,
      //     formulae: [`=$X$2:$X$${jobList.length + 1}`],
      //     showErrorMessage: true,
      //     errorTitle: 'Giá trị không hợp lệ',
      // });
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
      req.logger.info("✅ Xuất file thành công.");
    } catch (err) {
      req.logger.error("❌ Lỗi khi xuất file biện pháp an toàn", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

module.exports = router;
