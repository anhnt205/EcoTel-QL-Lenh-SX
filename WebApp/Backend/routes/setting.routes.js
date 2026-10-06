const express = require('express');
const router = express.Router();
const AppSetting = require('../models/AppSetting');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const { ROLE } = require('../config/config');
const { sanitizeBranding, toPublicBranding } = require('../utils/branding');

const BRANDING_KEY = 'branding';

const loadBranding = async () => {
    const doc = await AppSetting.findOne({ key: BRANDING_KEY }).lean();
    return (doc && doc.value) || {};
};

// Công khai: trang đăng nhập cần logo/tên/màu trước khi có token. Không trả nội dung logo, chỉ phiên bản.
router.get('/branding', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-cache');
        res.status(200).send({ status: 'success', data: toPublicBranding(await loadBranding()) });
    } catch (err) {
        req.logger.error('❌ Lỗi khi lấy cấu hình giao diện', err);
        res.status(500).send({ status: 'error', message: err.message });
    }
});

// Công khai: ảnh logo (URL có ?v=<phiên bản> nên cache được lâu, đổi logo là URL đổi)
router.get('/branding/logo', async (req, res) => {
    try {
        const { logo } = await loadBranding();
        const m = typeof logo === 'string' ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(logo) : null;
        if (!m) {
            return res.status(404).send({ status: 'error', message: 'Chưa có logo tuỳ chỉnh' });
        }
        res.set('Content-Type', m[1]);
        res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
        if (m[1] === 'image/svg+xml') {
            // SVG mở trực tiếp vẫn không chạy được script
            res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        }
        res.status(200).send(Buffer.from(m[2], 'base64'));
    } catch (err) {
        req.logger.error('❌ Lỗi khi lấy logo', err);
        res.status(500).send({ status: 'error', message: err.message });
    }
});

// Chỉ admin được đổi
router.put('/branding', verifyToken, restrictTo(ROLE.ADMIN), async (req, res) => {
    try {
        const { errors, changes } = sanitizeBranding(req.body);
        if (errors.length > 0) {
            req.logger.warn(`⚠️ Cấu hình giao diện không hợp lệ: ${errors.join('; ')}`);
            return res.status(400).send({ status: 'error', message: errors.join('. ') });
        }

        const current = await loadBranding();
        const next = { ...current, ...changes };
        if (changes.logo !== undefined) {
            // đổi/xoá logo thì tăng phiên bản để URL ảnh đổi theo
            next.logoUpdatedAt = changes.logo ? Date.now() : null;
        }

        await AppSetting.findOneAndUpdate(
            { key: BRANDING_KEY },
            { $set: { value: next, updatedBy: req.user._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        req.logger.info(`✅ ${req.user.username} cập nhật cấu hình giao diện (${Object.keys(changes).join(', ') || 'không đổi'})`);
        res.status(200).send({ status: 'success', message: 'Đã lưu cấu hình giao diện', data: toPublicBranding(next) });
    } catch (err) {
        req.logger.error('❌ Lỗi khi lưu cấu hình giao diện', err);
        res.status(500).send({ status: 'error', message: err.message });
    }
});

// Khôi phục mặc định (xoá toàn bộ cấu hình tuỳ chỉnh)
router.delete('/branding', verifyToken, restrictTo(ROLE.ADMIN), async (req, res) => {
    try {
        await AppSetting.deleteOne({ key: BRANDING_KEY });
        req.logger.info(`✅ ${req.user.username} khôi phục cấu hình giao diện mặc định`);
        res.status(200).send({ status: 'success', message: 'Đã khôi phục giao diện mặc định', data: toPublicBranding({}) });
    } catch (err) {
        req.logger.error('❌ Lỗi khi khôi phục cấu hình giao diện', err);
        res.status(500).send({ status: 'error', message: err.message });
    }
});

module.exports = router;
