const mongoose = require('mongoose');

// Cài đặt chung của ứng dụng dạng khoá - giá trị (hiện dùng cho key "branding": logo, tên, màu chủ đạo).
const AppSetting = new mongoose.Schema(
    {
        key: {
            type: String,
            required: [true, 'Setting key is required'],
            unique: true,
            trim: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('AppSetting', AppSetting);
