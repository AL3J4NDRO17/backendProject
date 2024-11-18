const AuditLog = require('../models/auditory');

exports.logAudit = async (adminId, action, target, details) => {
    await AuditLog.create({
        adminId,
        action,
        target,
        details
    });
};

// Ejemplo de uso en un controlador