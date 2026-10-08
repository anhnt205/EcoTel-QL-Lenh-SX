const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errorHandler');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
    try {
        // 1) Check if token exists
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).send({ status: 'error', message: 'You are not logged in! Please log in to get access.' });
        }

        // 2) Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.userId).populate("department").populate({ path: "position", populate: { path: "department", select: "name code allowedModules" } })
        if (!currentUser) {
            req.logger.warn(`⚠️ Không tìm thấy user`);
            return res.status(401).send({ status: 'error', message: 'The user belonging to this token no longer exists.' });
        }

        if (currentUser.passwordChangedAt) {
            const changedTimestamp = Math.floor(currentUser.passwordChangedAt.getTime() / 1000);
            if (decoded.iat < changedTimestamp) {
                req.logger.warn(`⚠️ Vui lòng login lại ${currentUser?.username}`);
                return res.status(401).send({ status: 'error', message: 'Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.' });
            }
        }
        // Grant access to protected route
        req.user = currentUser;
        req.userId = currentUser._id;
        next();
    } catch (err) {
        res.status(401).send({ status: 'error', message: 'Invalid token. Please log in again!' });
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        // Quyền mới (Phòng ban -> Chức vụ -> Cán bộ): middleware/permission.js đã xác nhận người này được phép thao tác
        // này trên module tương ứng (chỉ đặt ở các nhóm API quản lý danh mục/hệ thống) -> không áp lại giới hạn vai trò cũ.
        if (req.permissionGranted === true) return next();
        if (!roles.includes(req.user?.role)) {
            return res.status(403).send({ status: 'error', message: 'You do not have permission to perform this action' });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    restrictTo
}; 