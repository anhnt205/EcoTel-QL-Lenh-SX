const mongoose = require('mongoose');
const { STATUS_DEVICES, STATUS_DEVICE } = require('../config/config');

const deviceSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Device code is required'],
        trim: true
    },
    name: {
        type: String,
    },
    // Gắn với đúng bản ghi TaiSan bên QL-TAISAN (nguồn gốc danh mục thiết bị)
    // để đồng bộ lại (đổi tên, loại, công suất...) không bị nhân đôi bản ghi.
    // Thiết bị tạo thủ công trong Điều phối (không qua đồng bộ) để trống field
    // này. Xem services/taiSanSync.js.
    externalTaiSanId: {
        type: String,
        index: true,
        sparse: true,
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
    },
    vehicleNumber: {
        type: String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeviceType',
    },
    material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeviceModel',
    },
    fuelType: {
        type: String,
    },
    capacity: {
        type: Number,
    },
    power: {
        type: Number,
    },
    status: {
        type: String,
        enum: STATUS_DEVICES,
        default: STATUS_DEVICE.AVAILABLE
    },
    coordinates: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    note: {
        type: String,
    },
    files: [{
        key: String,
        fileName: String
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
deviceSchema.index({ type: 1, status: 1 });
deviceSchema.index({ department: 1 });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
