const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/errorHandler');
const DeviceType = require('../models/DeviceType');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const { ROLE } = require('../config/config');
const { safeRegex } = require('../utils/escapeRegex');


router.post('/', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const { name, group } = req.body
        const existingDeviceType = await DeviceType.findOne({ name, group });
        if (existingDeviceType) {
            req.logger.error("❌ Tên loại phương tiện đã tồn tại");
            return res.status(400).send({ status: 'error', message: 'Tên loại phương tiện đã tồn tại' });
        }
        const newDeviceType = new DeviceType({
            name, group
        });
        await newDeviceType.save();
        req.logger.info(`🔥  Tạo thành công`);
        res.status(200).send({ status: 'success', message: "Tạo thành công" });
    } catch (err) {
        req.logger.error("❌ Lỗi khi tạo loại phương tiện", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

router.delete('/', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN), async (req, res, next) => {
    try {
        const user = req.user
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            req.logger.error("❌ Chọn bản ghi cần xóa");
            return res.status(400).send({ status: 'error', message: 'Vui lòng chọn bản ghi cần xóa' });
        }

        const result = await DeviceType.deleteMany({ _id: { $in: ids } });
        if (result.deletedCount === 0) {
            req.logger.error("❌ Không tìm thấy bản ghi cần xóa");
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
router.put('/:id', verifyToken, restrictTo(ROLE.MANAGER,ROLE.ADMIN), async (req, res, next) => {
    try {
        const user = req.user
        const deviceType = await DeviceType.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!deviceType) {
            req.logger.error("❌ Sửa thất bại");
            return res.status(404).send({ status: 'error', message: 'Sửa thất bại ' });
        }
        req.logger.info(`🔥${user?.username}  Sửa loại phương tiện thành công`);
        res.status(200).json({
            status: 'success',
            message: 'Sửa thành công'
        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi sửa ", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});
router.get('/', verifyToken, async (req, res) => {
    try {
        const query = {};
        if (req.query.q) {
            query.name = safeRegex(req.query.q);
        }
        const DeviceTypes = await DeviceType.find(query)
            .collation({ locale: "vi", strength: 1 })
            .sort({ name: 1 });
        req.logger.info(`🔥  Load thành công`);
        res.status(200).send({ status: 'success', data: DeviceTypes });
    } catch (err) {
        req.logger.error("❌ Lỗi khi load", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

router.get('/:id', verifyToken, async (req, res) => {
    try {
        const DeviceTypes = await DeviceType.findById(req.params.id);
        req.logger.info(`🔥  Load thành công`);
        res.status(200).send({ status: 'success', data: DeviceTypes });
    } catch (err) {
        req.logger.error("❌ Lỗi khi load", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

module.exports = router; 