const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/errorHandler');
const Shift = require('../models/Shift');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const { ROLE } = require('../config/config');
const { safeRegex } = require('../utils/escapeRegex');

router.post('/', verifyToken, restrictTo(ROLE.MANAGER,ROLE.ADMIN), async (req, res, next) => {
    try {
        const { name, startTime, endTime } = req.body;
        const existingShift = await Shift.findOne({ name });
        if (existingShift) {
            req.logger.warn(`⚠️ Ca làm việc đã tồn tại: ${name}`);
            return res.status(400).send({ status: 'error', message: 'Ca làm việc đã tồn tại' });
        }
        const newShift = new Shift({
            name: name,
            startTime: startTime,
            endTime: endTime
        });
        await newShift.save();
        req.logger.info(`✅ Tạo ca làm việc thành công: ${newShift.name}`);
        res.status(200).send({ status: 'success', message: 'Tạo thành công' });
    } catch (err) {
        req.logger.error('❌ Lỗi khi tạo ca làm việc', err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack });
    }
});

router.delete('/', verifyToken, restrictTo(ROLE.MANAGER,ROLE.ADMIN), async (req, res, next) => {
    try {
        const user = req.user;
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            req.logger.warn('⚠️ Yêu cầu xóa không có IDs hợp lệ');
            return res.status(400).send({ status: 'error', message: 'Vui lòng chọn bản ghi cần xóa' });
        }

        const result = await Shift.deleteMany({ _id: { $in: ids } });
        if (result.deletedCount === 0) {
            req.logger.info('ℹ️ Không tìm thấy bản ghi để xóa');
            return res.status(200).send({ status: 'error', message: 'Không tìm thấy bản ghi để xóa' });
        }

        req.logger.info(`✅ ${user?.username}  Đã xóa thành công ${result.deletedCount} bản ghi`);
        res.status(200).json({
            status: 'success',
            message: `Đã xóa ${result.deletedCount} bản ghi`
        });
    } catch (err) {
        req.logger.error('❌ Lỗi khi xóa ca làm việc', err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack });
    }
});

router.put('/:id', verifyToken, restrictTo(ROLE.MANAGER,ROLE.ADMIN), async (req, res, next) => {
    try {
        const user = req.user;
        const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!shift) {
            req.logger.warn(`⚠️ Cập nhật thất bại - Không tìm thấy ca làm việc với ID: ${req.params.id}`);
            return res.status(404).send({ status: 'error', message: 'Sửa thất bại ' });
        }

        req.logger.info(`✅ ${user?.username} Cập nhật ca làm việc thành công cho ID: ${req.params.id}`);
        res.status(200).json({
            status: 'success',
            message: 'Sửa thành công'
        });
    } catch (err) {
        req.logger.error('❌ Lỗi khi cập nhật ca làm việc', err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack });
    }
});

router.get('/', verifyToken, async (req, res) => {
    try {
        const query = {};

        if (req.query.name) {
            query.name = safeRegex(req.query.name); // không phân biệt hoa thường
        }
        const shifts = await Shift.find(query);
        res.status(200).send({ status: 'success', data: shifts });
    } catch (err) {
        req.logger.error('❌ Lỗi khi lấy danh sách ca làm việc', err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack });
    }
});

module.exports = router;