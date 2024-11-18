const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    validUntil: { type: Date, required: true },
    author: { type: String, required: true },
    version: { type: String, default: "1.0" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    status: { type: String, enum: ["active", "inactive", "deleted"], default: "inactive" }
});

module.exports = mongoose.model('Document', documentSchema);
