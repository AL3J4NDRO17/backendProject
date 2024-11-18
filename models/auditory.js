// models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // Ejemplo: "CREATE", "UPDATE", "DELETE"
    target: { type: String, required: true }, // Ejemplo: "Configuración", "Usuario", etc.
    timestamp: { type: Date, default: Date.now },
    details: { type: Object, required: true } // Almacena detalles específicos de la acción
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
