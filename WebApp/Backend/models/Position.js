const mongoose = require('mongoose')

const Position = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    note: {
        type: String
    },
    // Phòng ban của chức vụ: quyền chỉ được chọn trong các module phòng ban đó được xem (Department.allowedModules).
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    // Quyền C/R/U/D theo module. Không có (undefined) = chưa cấu hình, cán bộ chạy theo vai trò cũ.
    permissions: {
        type: [{ _id: false, module: String, c: Boolean, r: Boolean, u: Boolean, d: Boolean }],
        default: undefined,
    },
    // Gắn với chức vụ gốc bên Thống kê — xem services/tkCatalogSync.js.
    externalTkId: {
        type: String,
        index: true,
        sparse: true,
    }
},
    {
        timestamps: true
    })
module.exports = mongoose.model('Position', Position)

