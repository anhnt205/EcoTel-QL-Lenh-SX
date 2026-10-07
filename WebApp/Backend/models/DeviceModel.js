const mongoose = require('mongoose')

const DeviceModel = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Model name is required'],
        trim: true
    },
    // Gắn với chủng loại gốc bên Thống kê — xem services/tkCatalogSync.js.
    externalTkId: {
        type: String,
        index: true,
        sparse: true,
    },
},
    {
        timestamps: true
    })
module.exports = mongoose.model('DeviceModel', DeviceModel)
