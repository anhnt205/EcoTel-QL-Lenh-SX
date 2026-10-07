const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
    },
    // Các module (chức năng/menu) mà phòng ban này được NHÌN THẤY — xem config/modules.js. Không có = chưa cấu hình
    // (người dùng chạy theo vai trò cũ). Chức vụ thuộc phòng ban chỉ chọn quyền trong phạm vi này.
    allowedModules: { type: [String], default: undefined },
    // Gắn với đơn vị gốc bên Thống kê — xem services/tkCatalogSync.js.
    externalTkId: {
        type: String,
        index: true,
        sparse: true,
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Department', departmentSchema); 