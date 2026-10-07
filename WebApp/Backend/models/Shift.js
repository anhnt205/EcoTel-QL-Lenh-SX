const mongoose = require('mongoose')

const Shift = new mongoose.Schema({
    name: {
        type: Number,
        required: [true, 'Shift name is required'],
        trim: true
    },
    startTime: {
        type: String,
    },
    endTime: {
        type: String,
    },
    // Gắn với ca gốc bên Thống kê — xem services/tkCatalogSync.js.
    externalTkId: {
        type: String,
        index: true,
        sparse: true,
    },
},
    {
        timestamps: true
    })
module.exports = mongoose.model('Shift', Shift)
