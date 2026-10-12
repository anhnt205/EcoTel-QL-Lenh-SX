const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/errorHandler');
const Department = require('../models/Department');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const { ROLE } = require('../config/config');
const { safeRegex } = require('../utils/escapeRegex');

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', verifyToken, async (req, res, next) => {
    try {
        const query = {}

        if (req.query.code) {
            query.code = safeRegex(req.query.code); // không phân biệt hoa thường
        }
        const departments = await Department.find(query)
            .collation({ locale: "vi", strength: 1 })
            .sort({ code: 1 });

        req.logger.info(`🔥 Load dữ liệu đơn vị thành công`);
        res.status(200).json({
            status: 'success',
            results: departments.length,
            data:
                departments

        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi load đơn vị", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               manager:
 *                 type: string
 */
router.post('/', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const { name, code, description, allowedModules } = req.body;

        // Check if department with same code exists
        const existingCodeDepartment = await Department.findOne({ code });
        if (existingCodeDepartment) {
            req.logger.error("❌ Mã đơn vị đã tồn tại");
            return res.status(400).send({ status: 'error', message: 'Mã đơn vị đã tồn tại' });
        }
        const existingNameDepartment = await Department.findOne({ name });
        if (existingNameDepartment) {
            req.logger.error("❌ Tên đơn vị đã tồn tại");
            return res.status(400).send({ status: 'error', message: 'Tên đơn vị đã tồn tại' });
        }
        const department = await Department.create({
            name,
            code,
            description,
            allowedModules,
        });

        req.logger.info(`🔥  Tạo mới đơn vị thành công`);
        res.status(201).json({
            status: 'success',
            data:
                department
        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi tạo đơn vị", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id)

        if (!department) {
            req.logger.error("❌ không tìm thấy đơn vị");
            return res.status(404).send({ status: 'error', message: 'No department found with that ID' });
        }
        req.logger.info(`🔥 Load đơn vị thành công`);
        res.status(200).json({
            status: 'success',
            data:
                department

        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi load đơn vị", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   patch:
 *     summary: Update department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               manager:
 *                 type: string
 *               isActive:
 *                 type: boolean
 */
router.put('/:id', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const user = req.user;
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        )
        if (!department) {
            req.logger.error("❌ không tìm thấy đơn vị");
            return res.status(404).send({ status: 'error', message: 'No department found with that ID' });
        }
        req.logger.info(`🔥${user?.username}   Sửa đơn vị thành công`);
        res.status(200).json({
            status: 'success',
            data:
                department

        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi sửa đơn vị", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     summary: Delete department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            req.logger.error("❌ Chọn bản ghi cần xóa");
            return res.status(400).send({ status: 'error', message: 'Vui lòng chọn bản ghi cần xóa' });
        }

        const result = await Department.deleteMany({ _id: { $in: ids } });
        if (result.deletedCount === 0) {
            req.logger.error("❌ không tìm thấy bản ghi cần xóa");
            return res.status(200).send({ status: 'error', message: 'Không tìm thấy bản ghi để xóa' });
        }
        req.logger.info(`🔥  Đã xóa ${result.deletedCount} bản ghi`);
        res.status(200).json({
            status: 'success',
            message: `Đã xóa ${result.deletedCount} bản ghi`
        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi xóa bản ghi", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

const columnMapping = {
    'Mã đơn vị': 'code',
    'Tên đơn vị': 'name',
    'Chức năng': 'description'
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
            const { code, ...updateData } = item;

            if (code) { // Kiểm tra nếu có trường 'name'
                return {
                    updateOne: {
                        filter: { code: code }, // Sửa từ 'cleanedId' thành 'name'
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

        await Department.bulkWrite(operations);
        req.logger.info(`✅ ${user?.username}  Import file thành công. Đã xử lý ${dataImport.length} bản ghi.`);
        res.status(200).json({
            status: 'success',
            message: ` Import file thành công. Đã xử lý ${dataImport.length} bản ghi.`,
        });
    } catch (error) {
        req.logger.error("❌ Lỗi khi import file đơn vị", error);
        res.status(500).json({
            status: 'error',
            message: 'Tải thất bại',
            error: error.message
        });
    }
});

router.post('/exportFile', verifyToken, restrictTo(ROLE.MANAGER,ROLE.ADMIN,ROLE.DISPATCHER), async (req, res, next) => {
    try {
        const data = await Department.find();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('DS.don_vi');

        worksheet.columns = [
            { header: 'Mã đơn vị', key: 'code', width: 20 },
            { header: 'Tên đơn vị', key: 'name', width: 20 },
            { header: 'Chức năng', key: 'description', width: 20 },
        ];

        const formattedDevices = (data || []).map(item => ({
            code: item?.code || '',
            name: item?.name || '',
            description: item?.description || '',
        }));
        worksheet.addRows(formattedDevices);

        worksheet.eachRow((row, rowNumber) => {
            row.eachCell(cell => {
                cell.font = { size: 9, bold: (rowNumber === 1) };
                cell.alignment = { vertical: 'middle', wrapText: true, };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'danh_sach_nguoi_dung.xlsx');
        res.send(buffer);
        req.logger.info("✅ Xuất file thành công.");

    } catch (err) {
        req.logger.error("❌ Lỗi khi xuất file chức danh", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack });
    }
});
module.exports = router; 