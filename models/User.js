// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    correo: { type: String, unique: true, required: true },
    pass: { type: String, required: true },
    nombreCompleto: { type: String, required: true },
    status: { type: String, default: "inactive" },
    failtrys: { type: Number, default: 0 },
    bloqueado: { type: Date, default: null },
    otp: { type: Number },
    otpExpires: { type: Date },
    role: { type: String, enum: ['admin', 'employee', 'user'], default: 'user' },
    banned: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null }, 
    resetPasswordCode: String,
    resetPasswordExpires: Date,            
});

// Hash de la contraseña antes de guardar


UserSchema.methods.generateVerificationToken = function() {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    return this.verificationToken;
};

module.exports = mongoose.model('User', UserSchema, 'users');
