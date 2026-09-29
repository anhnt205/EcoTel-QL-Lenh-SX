const mongoose = require('mongoose')

const DeviceType = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'DeviceType is required'],
        trim: true
    },
    group:{
        type:String,
        num:['Xe','Máy']
    },
    // Gắn với idNhomTaiSan bên QL-TAISAN khi nhóm này được tạo tự động lúc
    // đồng bộ thiết bị — xem services/taiSanSync.js. Nhóm tạo thủ công để trống.
    externalNhomTaiSanId: {
        type: String,
        index: true,
        sparse: true,
    },
},
    {
        timestamps: true
    })
module.exports = mongoose.model('DeviceType', DeviceType)
