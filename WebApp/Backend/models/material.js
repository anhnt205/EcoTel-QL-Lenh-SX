const mongoose = require('mongoose')

const Material = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Material name is required'],
        trim: true
    },
    // san pham nghiem thu
    acceptedProduct: {
        type: String
    },
    // Gắn với chủng loại hàng gốc bên Thống kê — xem services/tkCatalogSync.js.
    externalTkId: {
        type: String,
        index: true,
        sparse: true,
    },
    valueHistory: [
        {
            density: Number,
            dryDensity: Number,
            startTime: {
                type: Date,
                default: Date.now,
            },
            endTime: {
                type: Date,
                default: Date.now,
            },
        }],

},
    {
        timestamps: true
    })
module.exports = mongoose.model('Material', Material)
