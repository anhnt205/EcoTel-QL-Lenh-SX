const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/errorHandler');
const Material = require('../models/material');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const Order = require('../models/Order');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const { ROLE } = require('../config/config');

// them vat lieu
router.post('/', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const { name, acceptedProduct } = req.body
        const existingMaterial = await Material.findOne({ name });
        if (existingMaterial) {
            req.logger.error("❌ Tên vật liệu đã tồn tại");
            return res.status(400).send({ status: 'error', message: 'Tên hàng hóa đã tồn tại' });
        }
        const newMaterial = new Material({
            name: name,
            acceptedProduct: acceptedProduct,
        });
        await newMaterial.save();
        req.logger.info(`🔥 Tạo thành công`);

        res.status(200).send({ status: 'success', message: "Tạo thành công" });
    } catch (err) {
        req.logger.error("❌ Lỗi khi tạo", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});
// thêm thơi gian
router.post("/save-timeslot", async (req, res) => {
    try {
        const { startTime, endTime, rows, initSlot, force } = req.body;

        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);

        // ====== 1. LẤY TẤT CẢ TIME SLOT HIỆN CÓ ======
        const materials = await Material.find().lean();

        const exists = materials.some(m =>
            m.valueHistory?.some(h =>
                new Date(h.startTime).getTime() === newStart.getTime() &&
                new Date(h.endTime).getTime() === newEnd.getTime()
            )
        );

        // ====== 2. CASE: TẠO MỚI (KHÔNG CÓ initSlot) ======
        if (!initSlot) {

            // Nếu trùng EXACT và chưa force → báo FE xác nhận ghi đè
            if (exists && !force) {
                return res.status(409).json({
                    code: "EXISTS",
                    message: "Khoảng thời gian đã tồn tại"
                });
            }

            // Nếu trùng và force = true → xóa slot cũ
            if (exists && force) {
                await Material.updateMany(
                    {},
                    {
                        $pull: {
                            valueHistory: {
                                startTime: newStart,
                                endTime: newEnd
                            }
                        }
                    }
                );
            }
        }

        // ====== 3. CASE: EDIT (CÓ initSlot) ======
        if (initSlot) {
            await Material.updateMany(
                {},
                {
                    $pull: {
                        valueHistory: {
                            startTime: new Date(initSlot.startTime),
                            endTime: new Date(initSlot.endTime)
                        }
                    }
                }
            );
        }

        // ====== 4. LƯU TỶ TRỌNG MỚI ======
        for (const row of rows) {
            await Material.updateOne(
                { _id: row.id },
                {
                    $push: {
                        valueHistory: {
                            startTime: newStart,
                            endTime: newEnd,
                            density: row.density ? Number(row.density) : null,
                            dryDensity: row.dryDensity ? Number(row.dryDensity) : null
                        }
                    }
                }
            );
        }

        return res.json({ message: "Lưu thành công" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

// DELETE /materials/timeslots
router.delete("/timeslots", async (req, res) => {
    try {
        const { slots } = req.body;

        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ message: "Không có slot để xóa" });
        }

        for (const s of slots) {
            await Material.updateMany(
                {},
                {
                    $pull: {
                        valueHistory: {
                            startTime: new Date(s.startTime),
                            endTime: new Date(s.endTime),
                        }
                    }
                }
            );
        }

        return res.json({ message: "Xóa khoảng thời gian thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});


router.delete('/', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const user = req.user
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            req.logger.error("❌ Vui lòng chọn bản ghi cần xóa");
            return res.status(400).send({ status: 'error', message: 'Vui lòng chọn bản ghi cần xóa' });
        }

        const result = await Material.deleteMany({ _id: { $in: ids } });
        if (result.deletedCount === 0) {
            req.logger.error("❌ không tìm thấy bản ghi cần xóa");

            return res.status(200).send({ status: 'error', message: 'Không tìm thấy bản ghi để xóa' });
        }
        req.logger.info(`🔥 ${user?.username}  Đã xóa ${result.deletedCount} bản ghi`);

        res.status(200).json({
            status: 'success',
            message: `Đã xóa ${result.deletedCount} bản ghi`
        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi xóa", err);

        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});
router.put('/:id', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const user = req.user

        const material = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (!material) {
            req.logger.error('❌ Không tìm thấy vật liệu');
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy vật liệu' });
        }

        req.logger.info(`🔥 ${user?.username} Sửa vật liệu thành công`);

        res.status(200).json({
            status: 'success',
            message: 'Sửa thành công'
        });
    } catch (err) {
        req.logger.error("❌ Lỗi", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});
// Get device usage history
router.get("/", verifyToken, async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    const query = {};
    if (req.query.name) {
      const regex = new RegExp(req.query.name, "i");
      query.name = regex;
    }

    // Phân trang: không truyền page/pageSize thì lấy hết
    const page = parseInt(req.query.page);
    const pageSize = parseInt(req.query.pageSize);
    const hasPagination =
      !isNaN(page) && !isNaN(pageSize) && page > 0 && pageSize > 0;

    let materials;
    let totalDocs;

    if (startTime && endTime) {
      const filterStartTime = new Date(startTime);
      const filterEndTime = new Date(endTime);

      const basePipeline = [
        { $match: query },
        {
          $addFields: {
            currentHistory: {
              $filter: {
                input: "$valueHistory",
                as: "h",
                cond: {
                  $and: [
                    { $eq: ["$$h.startTime", filterStartTime] },
                    { $eq: ["$$h.endTime", filterEndTime] },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            density: {
              $ifNull: [{ $arrayElemAt: ["$currentHistory.density", 0] }, null],
            },
            dryDensity: {
              $ifNull: [
                { $arrayElemAt: ["$currentHistory.dryDensity", 0] },
                null,
              ],
            },
            startTime: {
              $ifNull: [
                { $arrayElemAt: ["$currentHistory.startTime", 0] },
                null,
              ],
            },
            endTime: {
              $ifNull: [{ $arrayElemAt: ["$currentHistory.endTime", 0] }, null],
            },
          },
        },
        {
          $project: {
            name: 1,
            acceptedProduct: 1,
            valueHistory: 1,
            density: 1,
            dryDensity: 1,
            startTime: 1,
            endTime: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        { $sort: { name: 1 } },
      ];

      const facetPipeline = [
        ...basePipeline,
        {
          $facet: {
            data: hasPagination
              ? [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }]
              : [],
            totalCount: [{ $count: "total" }],
          },
        },
      ];

      const [result] = await Material.aggregate(facetPipeline);
      materials = result?.data || [];
      totalDocs = result?.totalCount?.[0]?.total || 0;
    } else {
      totalDocs = await Material.countDocuments(query);

      let materialsQuery = Material.find(query).sort({ name: 1 });
      if (hasPagination) {
        materialsQuery = materialsQuery
          .skip((page - 1) * pageSize)
          .limit(pageSize);
      }
      materials = await materialsQuery;
    }

    req.logger.info(`🔥 Load thành công`);
    res.status(200).send({
      status: "success",
      results: materials.length,
      page: hasPagination ? page : undefined,
      pageSize: hasPagination ? pageSize : undefined,
      totalDocs,
      totalPages: hasPagination ? Math.ceil(totalDocs / pageSize) : undefined,
      data: materials,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi", err);
    res
      .status(500)
      .send({ status: "error", message: err.message, stack: err.stack });
  }
});
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const material = await Material.findById(req.params.id)
        if (!material) {
            req.logger.error("❌ không tìm thấy bản ghi ");

            return res.status(200).send({ status: 'error', message: 'No material found with that ID' });
        }
        req.logger.info(`🔥 Load thành công`);

        res.status(200).json({
            status: 'success',
            data: material
        });
    } catch (err) {
        req.logger.error("❌ Lỗi", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

const columnMapping = {
    'Tên vật liệu': 'name',
    'Tỷ trọng': 'density',
    'Sản phẩm nghiệm thu': 'acceptedProduct',
};
router.post('/importFile', upload.single('file'), verifyToken, async (req, res) => {
    try {
        const user = req.user;
        if (!req.file) {
            req.logger.warn("⚠️ Import file thất bại - Không có file được chọn.");
            return res.status(400).json({ status: 'error', message: 'Vui lòng chọn file' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1, range: 0, raw: true })[0];
        const mappedHeaders = headers.map(header => columnMapping[header] || header);
        const data = xlsx.utils.sheet_to_json(worksheet, { header: mappedHeaders, range: 1 });
        const dataImport = data.filter(row => row.name);

        if (dataImport.length === 0) {
            req.logger.warn("⚠️ Import file thất bại - Không tìm thấy dữ liệu hợp lệ.");
            return res.status(400).json({ status: 'error', message: 'Không tìm thấy dữ liệu hợp lệ trong file.' });
        }

        const operations = dataImport.map(item => {
            const { name, ...updateData } = item;

            if (name) { // Kiểm tra nếu có trường 'name'
                return {
                    updateOne: {
                        filter: { name: name }, // Sửa từ 'cleanedId' thành 'name'
                        update: { $set: updateData }, // Sử dụng $set để cập nhật dữ liệu
                        upsert: true
                    }
                };
            } else {
                return {
                    insertOne: {
                        document: item
                    }
                };
            }
        });

        await Material.bulkWrite(operations);
        req.logger.info(`✅ ${user?.username}  Import file thành công. Đã xử lý ${dataImport.length} bản ghi.`);
        res.status(200).json({
            status: 'success',
            message: `Import file thành công. Đã xử lý ${dataImport.length} bản ghi.`,
        });
    } catch (error) {
        req.logger.error("❌ Lỗi khi import file biện pháp an toàn", error);
        res.status(500).json({
            status: 'error',
            message: 'Tải thất bại',
            error: error.message
        });
    }
});

router.post('/exportFile', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER), async (req, res, next) => {
    try {
        const data = await Material.find();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('DS.vat_lieu');

        worksheet.columns = [
            { header: 'Tên vật liệu', key: 'name', width: 20 },
            { header: 'Tỷ trọng', key: 'density', width: 20 },
            { header: 'Sản phẩm nghiệm thu', key: 'acceptedProduct', width: 20 },
        ];

        const formattedDevices = (data || []).map(item => ({
            name: item?.name || '',
            density: item?.density || '',
            acceptedProduct: item?.acceptedProduct || '',
        }));
        worksheet.addRows(formattedDevices);

        worksheet.eachRow((row, rowNumber) => {
            row.eachCell(cell => {
                cell.font = { size: 9, bold: (rowNumber === 1) };
                cell.alignment = { vertical: 'middle', wrapText: true, };
            });
        });

        const MAX = Math.max(worksheet.rowCount + 100, 1000);
        worksheet.dataValidations.add(`C2:C${MAX}`, {
            type: 'list',
            allowBlank: true,
            formulae: ['"Than,Đất"'],
            showErrorMessage: true,
            errorTitle: 'Giá trị không hợp lệ',
            error: 'Chỉ được chọn Than hoặc Đất.',
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'danh_sach_nguoi_dung.xlsx');
        res.send(buffer);
        req.logger.info("✅ Xuất file thành công.");

    } catch (err) {
        req.logger.error("❌ Lỗi khi xuất file vật liệu", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack });
    }
});
module.exports = router; 