const mongoose = require('mongoose');
const { ROLES, ROLE } = require('../config/config');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    gender: { type: String },
    email: { type: String },
    phone: { type: String },
    avatar: { type: String },
    signature: { type: String },
    salaryCode: { type: String, required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
    role: { type: String, default: ROLE.EMPLOYEE },
    // Quyền riêng của cán bộ: chỉ có tác dụng khi customPermissions = true (nếu không thì ăn theo chức vụ).
    customPermissions: { type: Boolean, default: false },
    permissions: {
        type: [{ _id: false, module: String, c: Boolean, r: Boolean, u: Boolean, d: Boolean }],
        default: undefined,
    },
    active: {
        type: Boolean,
        default: true
    },
    deviceTokens: [{
        type: String
    }],
    passwordChangedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now();
    next();
});

userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('User', userSchema); 