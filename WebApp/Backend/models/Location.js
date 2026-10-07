const mongoose = require('mongoose')

const Location = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Location name is required'],
        trim: true
    },
    distance: {
        type: Number
    },
    // Gắn với nơi dỡ/nhận tải gốc bên Thống kê ("unloading:<id>" | "receiving:<id>") — xem services/tkCatalogSync.js.
    externalTkId: {
        type: String,
        index: true,
        sparse: true,
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
    }
},
    {
        timestamps: true
    })
module.exports = mongoose.model('Location', Location)
