const mongoose = require('mongoose');

const frontSchema = new mongoose.Schema({
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


module.exports = mongoose.model('configs', frontSchema);
