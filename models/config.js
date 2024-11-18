// models/Config.js
const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    type: {
        type: String,
        unique: true,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true }); // Esto agregará automáticamente createdAt y updatedAt



module.exports = mongoose.model('Config', configSchema);