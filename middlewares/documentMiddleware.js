const { check } = require('express-validator');

exports.validateCreateDocument = [
    check('title').isLength({ min: 3 }).withMessage('El título debe tener al menos 3 caracteres.'),
    check('content').isLength({ min: 5 }).withMessage('El contenido debe tener al menos 5 caracteres.')
];
