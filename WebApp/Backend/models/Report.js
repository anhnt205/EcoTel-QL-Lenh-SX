const mongoose = require('mongoose')

const Report = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
    },
    excavator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
    },
    fromLocation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    toLocation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
    },
    quantity: {
        type: Number,
    },
    drillDepth: {
        type: Number,
    },
    hardnessF: {
        type: Number,
    },
    workingMinutes: {
        type: Number,
    },
    distanceKm: {
        type: Number,
    },
    quantityUpdateTimes: [{
        time: Date,
        quantity: {
            type: Number,
            default: 1
        }
    }],
    totalProduction: {
        type: Number,
        default: 0
    },
    totalCubicMeter: {
        type: Number,
        default: 0
    },
    totalTon: {
        type: Number,
        default: 0
    },
    // Bản chụp (chốt) thông tin thiết bị / máy xúc / điểm xúc-đổ / vật liệu của chuyến khi lệnh hoàn thành, để báo cáo
    // cũ không đổi theo dữ liệu gốc (xem services/reportSnapshot.js). Dạng { at, editedAt, source, data }.
    // select:false: mặc định không nạp, nên mọi API không liên quan giữ nguyên kết quả; chỗ cần dùng phải
    // .select("+frozen").
    frozen: { type: mongoose.Schema.Types.Mixed, select: false }
}, {
    timestamps: true
})

Report.index({ orderId: 1 });
Report.index({ 'frozen.at': 1 });
Report.index({ material: 1 });
Report.index({ quantity: 1 });
Report.index({ excavator: 1 });
Report.index({ device: 1 });
Report.index({ toLocation: 1 });
Report.index({ fromLocation: 1 });
Report.index({ drillDepth: 1 });




module.exports = mongoose.model('Report', Report)