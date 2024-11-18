const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController/documentController'); // Asegúrate de que la ruta sea correcta
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');
const { body, param, query } = require('express-validator');

// Ruta para crear un nuevo documento regulatorio
router.post(
    '/create',
    verifyToken,
    verifyRole(['admin', 'editor']),
    [
        body('title').notEmpty().withMessage('El título es obligatorio').trim().escape(),
        body('content').notEmpty().withMessage('El contenido es obligatorio').trim(),
        body('validUntil').isISO8601().toDate().withMessage('Fecha de vigencia no válida')
    ],
    documentController.createDocument
);

router.get('/history/:title', documentController.getDocumentHistory);
router.get('/deleted', documentController.getAllDeletedDocuments);
router.get('/filter', documentController.filterDocuments);

// Ruta para actualizar un documento (crear nueva versión)
router.put(
    '/:id',
    verifyToken,
    verifyRole(['admin', 'editor']),
    [
        param('id').isMongoId().withMessage('ID de documento no válido'),
        body('content').optional().trim(),
        body('validUntil').optional().isISO8601().toDate().withMessage('Fecha de vigencia no válida')
    ],
    documentController.updateDocument
);
router.get(
    '/getdoc/:id',
    verifyToken,
    verifyRole(['admin', 'editor']),
    [
        param('id').isMongoId().withMessage('ID de documento no válido'),
        body('content').optional().trim(),
        body('validUntil').optional().isISO8601().toDate().withMessage('Fecha de vigencia no válida')
    ],
    documentController.getDocumentById
);
// Ruta para marcar un documento como eliminado (lógico)
router.delete(
    '/:id',
    verifyToken,
    verifyRole(['admin']),
    [
        param('id').isMongoId().withMessage('ID de documento no válido')
    ],
    documentController.deleteDocument
);

// Ruta para activar una versión específica del documento
router.patch(
    '/:id/status',
    verifyToken,
    verifyRole(['admin']),
    [
        param('id').isMongoId().withMessage('ID de documento no válido')
    ],
    documentController.activateDocumentVersion
);

// Ruta para obtener el historial de versiones de un documento
router.get(
    '/history',
    verifyToken,
    query('title').notEmpty().withMessage('El título es obligatorio').trim().escape(),
    documentController.getDocumentHistory
);

// Ruta para obtener la versión vigente actual de un documento
router.get('/latest', documentController.getLatestVersions);

// Ruta para obtener todos los documentos con paginación
router.get(
    '/getDocuments',
    verifyToken,
    documentController.getAllDocuments
);

// Ruta para buscar documentos por término de búsqueda
router.get(
    '/search',
    verifyToken,
    [query('query').isString().optional()],
    documentController.searchDocuments
);

// Ruta para obtener documentos recientes
router.get(
    '/recent',
    verifyToken,
    documentController.getRecentDocuments
);
router.patch(
    '/:id/setStatus',
    verifyToken,
    verifyRole(['admin', 'editor']),
    [
        param('id').isMongoId().withMessage('ID de documento no válido'),
        body('status').isIn(['active', 'inactive', 'deleted']).withMessage('Estado no válido')
    ],
    documentController.updateDocumentStatus
);

// Ruta para obtener una versión específica del documento
router.get(
    '/version/:version',
    verifyToken,
    [
        param('version').isString().withMessage('Versión no válida')
    ],
    documentController.getDocumentByVersion
);
module.exports = router;
