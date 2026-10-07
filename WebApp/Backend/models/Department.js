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