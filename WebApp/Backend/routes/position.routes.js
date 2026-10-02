const express = require("express");
const router = express.Router();
const { AppError } = require("../utils/errorHandler");
const Position = require("../models/Position");
const { verifyToken, restrictTo } = require("../middleware/auth.middleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");
const { ROLE } = require("../config/config");
const { paginateQuery } = require("../utils/pagination");

router.post(
  "/",
  verifyToken,
  restrictTo(ROLE.MANAGER, ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const { name, note } = req.body;

      const existingPosition = await Position.findOne({ name });
      if (existingPosition) {
        req.logger.warn(`⚠️ Chức vụ đã tồn tại: ${name}`);
        return res
          .status(400)
          .send({ status: "error", message: "Chức vụ đã tồn tại" });
      }

      const newPosition = new Position({
        name,
        note,
      });
      await newPosition.save();
      req.logger.info(`✅ Tạo chức vụ thành công: ${newPosition.name}`);
      res.status(200).send({ status: "success", message: "Tạo thành công" });
    } catch (err) {
      req.logger.error("❌ Lỗi khi tạo chức vụ", err);
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
        req.logger.warn("⚠️ Yêu cầu xóa không có IDs hợp lệ");
        return res
          .status(400)
          .send({ status: "error", message: "Vui lòng chọn bản ghi cần xóa" });
      }

      const result = await Position.deleteMany({ _id: { $in: ids } });
      if (result.deletedCount === 0) {
        req.logger.info("ℹ️ Không tìm thấy bản ghi để xóa");
        return res
          .status(200)
          .send({ status: "error", message: "Không tìm thấy bản ghi để xóa" });
      }

      req.logger.info(
        `✅ ${user?.username}  Xóa thành công ${result.deletedCount} bản ghi`,
      );
      res.status(200).json({
        status: "success",
        message: `Đã xóa ${result.deletedCount} bản ghi`,
      });
    } catch (err) {
      req.logger.error("❌ Lỗi khi xóa chức vụ", err);
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
      const position = await Position.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true },
      );

      if (!position) {
        req.logger.warn(
          `⚠️ Cập nhật thất bại - Không tìm thấy chức vụ với ID: ${req.params.id}`,
        );
        return res
          .status(404)
          .send({ status: "error", message: "Sửa thất bại " });
      }

      req.logger.info(
        `✅ ${user?.username} Cập nhật chức vụ thành công cho ID: ${req.params.id}`,
      );
      res.status(200).json({
        status: "success",
        message: "Sửa thành công",
      });
    } catch (err) {
      req.logger.error("❌ Lỗi khi cập nhật chức vụ", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);

router.get("/", verifyToken, async (req, res) => {
  try {
    const query = {};

    if (req.query.name) {
      const regex = new RegExp(req.query.name, "i"); // không phân biệt hoa thường
      query.name = regex;
    }

    const modelQuery = Position.find(query)
      .collation({ locale: "vi", strength: 1 })
      .sort({ name: 1 });

    const result = await paginateQuery(modelQuery, Position, query, req.query);
    req.logger.info(`✅ Load thành công`);
    res.status(200).send({ status: "success", ...result });
  } catch (err) {
    req.logger.error("❌ Lỗi khi lấy danh sách chức vụ", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
const columnMapping = {
  "Tên chức danh": "name",
  "Mô tả": "note",
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
      const dataImport = data.filter((row) => row.name);

      if (dataImport.length === 0) {
        req.logger.warn(
          "⚠️ Import file thất bại - Không tìm thấy dữ liệu hợp lệ.",
        );
        return res.status(400).json({
          status: "error",
          message: "Không tìm thấy dữ liệu hợp lệ trong file.",
        });
      }

      const operations = dataImport.map((item) => {
        const { name, ...updateData } = item;

        if (name) {
          // Kiểm tra nếu có trường 'name'
          return {
            updateOne: {
              filter: { name: name }, // Sửa từ 'cleanedId' thành 'name'
              update: { $set: updateData }, // Sử dụng $set để cập nhật dữ liệu
              upsert: true,
            },
          };
        } else {
          return {
            insertOne: {
              document: item,
            },
          };
        }
      });

      await Position.bulkWrite(operations);
      req.logger.info(
        `✅ ${user?.username}  Import file thành công. Đã xử lý ${dataImport.length} bản ghi.`,
      );
      res.status(200).json({
        status: "success",
        message: `Import file thành công. Đã xử lý ${dataImport.length} bản ghi.`,
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
      const data = await Position.find();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("DS.vat_lieu");

      worksheet.columns = [
        { header: "Tên chức danh", key: "name", width: 20 },
        { header: "Mô tả", key: "note", width: 20 },
      ];

      const formattedDevices = (data || []).map((item) => ({
        name: item?.name || "",
        note: item?.note || "",
      }));
      worksheet.addRows(formattedDevices);

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.font = { size: 9, bold: rowNumber === 1 };
          cell.alignment = { vertical: "middle", wrapText: true };
        });
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
      req.logger.info("✅ Xuất file thành công.");
    } catch (err) {
      req.logger.error("❌ Lỗi khi xuất file chức danh", err);
      res
        .status(500)
        .send({ status: "error", message: err.message, stack: err.stack });
    }
  },
);
module.exports = router;
