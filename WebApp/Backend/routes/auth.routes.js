const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errorHandler');
const { sendPasswordResetEmail } = require('../utils/email');
const User = require('../models/User');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const { permissionsForClient } = require("../services/permissions");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *               - fullName
 *               - position
 *               - department
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               fullName:
 *                 type: string
 *               position:
 *                 type: string
 *                 enum: [admin, manager, supervisor, employee]
 *               department:
 *                 type: string
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, gender, fullName, phone, avatar, signature,
            salaryCode, department, position, role, active, customPermissions, permissions } = req.body;

        // Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            req.logger.error(`❌ Tên đăng nhập đã tồn tại ${username}`);
            return res.status(400).json({
                status: 'error',
                message: 'Tên đăng nhập đã tồn tại'
            });
        }

        if (phone) {
            let exitsPhone = await User.findOne({ phone });
            if (exitsPhone) {
                req.logger.error(`❌ Số điện thoại đã tồn tại ${phone}`);
                return res.status(400).json({
                    status: 'error',
                    message: 'Số điện thoại đã tồn tại'
                });
            }
        }
        if (email) {
            let exitsEmail = await User.findOne({ email });
            if (exitsEmail) {
                req.logger.error(`❌ Email đã tồn tại ${email}`);
                return res.status(400).json({
                    status: 'error',
                    message: 'Email đã tồn tại'
                });
            }
        }
        if (salaryCode) {
            let exitsSalaryCode = await User.findOne({ salaryCode });
            if (exitsSalaryCode) {
                req.logger.error(`❌ Mã thẻ lương đã tồn tại ${salaryCode}`);
                return res.status(400).json({
                    status: 'error',
                    message: 'Mã thẻ lương đã tồn tại'
                });
            }
        }

        // Create new user
        user = new User({
            username,
            password,
            email,
            phone,
            avatar,
            signature,
            fullName,
            department,
            salaryCode,
            position,
            gender,
            role,
            active,
            customPermissions,
            permissions
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save user
        await user.save();

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        req.logger.info(`🔥  Tạo người dùng thành công user${username} pass${password}`);
        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    position: user.position,
                }
            }
        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi tạo người dùng", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;


        // Check if user exists
        const user = await User.findOne({ username }).populate("position").populate("department")
        if (!user) {
            req.logger.error(`❌ Không tìm thấy người dùng ${username}`);
            return res.status(404).send({
                status: 'error', message: 'Không tìm thấy người dùng'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.logger.error(`❌ Mật khẩu ${password} không đúng cho ${username}`);
            return res.status(400).send({
                status: 'error', message: 'Mật khẩu không đúng'
            });
        }

        if (user.active === false) {
            req.logger.error(`❌ Tài khoàn ${username} không hoạt động vui lòng chờ hoặc liên hệ admin để giải quyết.`);
            return res.status(403).send({
                status: 'error', message: 'Tài khoàn không hoạt động vui lòng chờ hoặc liên hệ admin để giải quyết.'
            });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        req.logger.info(`🔥 Login thành công user ${username}`);
        res.json({
            success: true,
            data: {
                token,
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    salaryCode: user.salaryCode,
                    phone: user.phone,
                    department: user.department,
                    role: user.role
                }
            }
        });
    } catch (error) {
        req.logger.error("❌ Đăng nhập thất bại", error);
        res.status(500).send({ status: 'error', message: error.message, stack: error.stack })

    }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 */
router.post('/forgot-password', async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).send({ status: 'error', message: 'There is no user with that email address' });
        }

        // Generate random reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Send reset email
        await sendPasswordResetEmail(user, resetToken);

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    } catch (err) {
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   patch:
 *     summary: Reset password
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - passwordConfirm
 *             properties:
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 */
router.patch('/reset-password/:token', async (req, res, next) => {
    try {
        const user = await User.findOne({
            passwordResetToken: req.params.token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send({ status: 'error', message: 'Token is invalid or has expired' });
        }

        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Generate new JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        res.status(200).json({
            status: 'success',
            token
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
/**
 * Cấp token cho khung Thống kê nhúng (đăng nhập một lần) — xem services/tkToken.js.
 * Chỉ admin/manager/dispatcher; employee không được vào Thống kê.
 */
router.get("/tk-token", verifyToken, async (req, res) => {
    try {
        const { canAccessThongKe, signTkToken } = require("../services/tkToken");
        if (!canAccessThongKe(req.user)) {
            return res.status(403).send({ status: "error", message: "Tài khoản không có quyền dùng phần mềm Thống kê" });
        }
        const secret = process.env.TK_AUTH_JWT_SECRET;
        if (!secret) {
            return res.status(503).send({ status: "error", message: "Chưa cấu hình liên thông Thống kê (TK_AUTH_JWT_SECRET)" });
        }
        const { token, expiresIn } = signTkToken(req.user, secret);
        res.status(200).json({ status: "success", data: { appToken: token, expiresIn } });
    } catch (err) {
        req.logger.error("❌ Lỗi cấp token Thống kê", err);
        res.status(500).send({ status: "error", message: err.message });
    }
});

router.get('/me', verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).populate("department").populate({ path: "position", populate: { path: "department", select: "name code allowedModules" } })
        req.logger.info(`🔥 Load dữ liệu  người dùng thành công ${user.username}`);
        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    salaryCode: user.salaryCode,
                    position: user.position,
                    department: user.department,
                    role: user.role,
                    signature: user.signature,
                    avatar: user.avatar,
                    // quyền mới theo Phòng ban -> Chức vụ -> Cán bộ (mode: full|custom|legacy), xem services/permissions.js
                    ...permissionsForClient(user),
                    customPermissions: user.customPermissions === true
                }
            }
        });
    } catch (err) {
        req.logger.error("❌ Lỗi khi load dữ liệu người dùng", err);
        res.status(500).send({ status: 'error', message: err.message, stack: err.stack })
    }
});

module.exports = router; 