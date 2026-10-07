const mongoose = require('mongoose')

const Position = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    note: {
        type: String
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

