const mongoose = require('mongoose');

const LogoSchema = new mongoose.Schema({
    type: { type: String, required: true },
    currentLogo: { type: String, required: true },
    logoHistory: { type: [String], required: true },
    updatedAt: { type: Date, default: Date.now },
    value: { type: String }
});

module.exports = mongoose.model('logos', LogoSchema);
