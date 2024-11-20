const Document = require('../../models/Document');
const xss = require('xss');
const { validationResult } = require('express-validator');
const { logAudit } = require('../../utils/auditory');
const { DeslindeLegal, PoliticPrivacy, TermsAndCondition } = require('../../models/historicalModel')
const mongoose = require('mongoose');

const moment = require('moment-timezone');

exports.createDocument = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, author, validUntil } = req.body;

    if (!title || !content || !author || !validUntil) {
        return res.status(400).json({
            error: "Todos los campos (título, contenido, autor y fecha de vigencia) son obligatorios."
        });
    }

    const sanitizedTitle = xss(title);
    const sanitizedContent = xss(content);
    const sanitizedAuthor = xss(author);
    const sanitizedValidUntil = xss(validUntil);

    const today = moment().tz('America/Mexico_City');
    const validUntilDate = moment(sanitizedValidUntil).tz('America/Mexico_City');

    if (!validUntilDate.isValid() || validUntilDate.isBefore(today)) {
        return res.status(400).json({
            error: "La fecha de vigencia debe ser válida y posterior o igual a la fecha actual.",
        });
    }

    await Document.deleteMany({ title: sanitizedTitle });

    try {
        const latestDoc = await Document.findOne({ title: sanitizedTitle }).sort({ version: -1 });
        const version = latestDoc ? (parseFloat(latestDoc.version) + 1).toFixed(1) : "1.0";

        const newDocument = new Document({
            title: sanitizedTitle,
            content: sanitizedContent,
            validUntil: validUntilDate.toDate(),
            author: sanitizedAuthor,
            version,
            createdAt: today.toDate(),
            status: 'inactive',
        });

        await newDocument.save();
        await logAudit(req.user.id, 'CREATE', 'Documento', { documentId: newDocument._id });

        res.status(201).json({ msg: 'Documento creado con éxito', document: newDocument });
    } catch (error) {
        console.error("Error al crear documento:", error);
        res.status(500).json({ error: 'Error al crear el documento' });
    }
};


// Obtener un documento por su ID

// Modificar un documento regulatorio y crear una nueva versión

exports.updateDocument = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, validUntil, author } = req.body;

    // Sanitizar los datos
    const sanitizedTitle = xss(title);
    const sanitizedContent = xss(content);
    const sanitizedValidUntil = xss(validUntil);

    // Convertir fechas a la zona horaria de Ciudad de México
    const today = moment().tz('America/Mexico_City');
    const validUntilDate = moment(sanitizedValidUntil).tz('America/Mexico_City');
    console.log(validUntilDate);

    if (!validUntilDate.isValid() || validUntilDate.isBefore(today)) {
        return res.status(400).json({
            error: "La fecha de vigencia debe ser válida y posterior o igual a la fecha actual.",
        });
    }

    try {
        const oldDocument = await Document.findById(req.params.id);
        if (!oldDocument) {
            return res.status(404).json({ error: 'Documento no encontrado.' });
        }

        // Determinar la colección histórica según el título
        let collectionName = '';
        if (oldDocument.title === 'Deslinde legal') {
            collectionName = 'deslindeLegal';
        } else if (oldDocument.title === 'Política de privacidad') {
            collectionName = 'politicPrivacy';
        } else if (oldDocument.title === 'Términos y condiciones') {
            collectionName = 'termsAndCondition';
        } else {
            return res.status(400).json({ message: 'Título no válido para guardar historial.' });
        }

        const HistoricalCollection = mongoose.connection.collection(collectionName);

        // Elimina el campo _id antes de guardar en el historial
        const documentToMove = oldDocument.toObject();
        delete documentToMove._id;

        await HistoricalCollection.insertOne({
            ...documentToMove,
            status: 'inactive',
            movedAt: today.toDate(), // Usar fecha en CMDX
        });

        // Elimina versiones más antiguas con el mismo título
        await Document.deleteMany({
            title: oldDocument.title,
            _id: { $ne: oldDocument._id },
        });

        const newVersion = (parseFloat(oldDocument.version) + 1).toFixed(1);

        // Crear nueva versión del documento
        const newDocument = new Document({
            title: sanitizedTitle,
            content: sanitizedContent,
            validUntil: validUntilDate.toDate(), // Fecha en CMDX
            author: author || oldDocument.author,
            version: newVersion,
            status: 'inactive',
            createdAt: today.toDate(), // Fecha actual en CMDX
        });

        await newDocument.save();

        // Eliminar el documento actual
        await Document.findByIdAndDelete(req.params.id);

        await logAudit(req.user.id, 'UPDATE', 'Documento', { documentId: newDocument._id });

        res.status(200).json({
            message: 'Documento actualizado y nueva versión creada.',
            document: newDocument,
        });
    } catch (error) {
        console.error("Error al actualizar documento:", error);
        res.status(500).json({ error: 'Error al modificar el documento.' });
    }
};



exports.getDocumentById = async (req, res) => {
    const { id } = req.params;

    try {
        const document = await Document.findById(id);

        if (!document) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        res.status(200).json(document);
    } catch (error) {
        console.error("Error al obtener el documento:", error);
        res.status(500).json({ error: 'Error al obtener el documento' });
    }
};

// Marcar un documento como eliminado (lógico)
exports.deleteDocument = async (req, res) => {
    try {
        // Encuentra el documento que se va a eliminar
        const documentToDelete = await Document.findById(req.params.id);
        if (!documentToDelete) {
            return res.status(404).json({ error: 'Documento no encontrado.' });
        }

        // Determina la colección histórica según el título
        let collectionName;
        if (documentToDelete.title === 'Deslinde legal') {
            collectionName = 'deslindeLegal';
        } else if (documentToDelete.title === 'Política de privacidad') {
            collectionName = 'politicPrivacy';
        } else if (documentToDelete.title === 'Términos y condiciones') {
            collectionName = 'termsAndCondition';
        } else {
            return res.status(400).json({ message: 'Título no válido para guardar en historial.' });
        }

        // Guarda el documento eliminado en la colección histórica
        const HistoricalCollection = mongoose.connection.collection(collectionName);
        await HistoricalCollection.insertOne({
            ...documentToDelete.toObject(),
            status: 'deleted', // Cambia el status
            deletedAt: new Date(), // Fecha de eliminación
        });

        // Elimina el documento de la colección principal
        await Document.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Documento eliminado y movido al historial.' });
    } catch (error) {
        console.error('Error al eliminar documento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Activar una versión específica del documento
exports.activateDocumentVersion = async (req, res) => {
    const { id } = req.params;

    try {
        const documentToActivate = await Document.findById(id);
        if (!documentToActivate) return res.status(404).json({ error: 'Documento no encontrado' });

        await Document.updateMany({ title: documentToActivate.title }, { status: 'inactive' });

        documentToActivate.status = 'active';
        await documentToActivate.save();

        await logAudit(req.user.id, 'ACTIVATE', 'Documento', { documentId: id });
        res.json({ msg: 'Versión activada', document: documentToActivate });
    } catch (error) {
        res.status(400).json({ error: 'Error al activar la versión' });
    }
};

// Obtener el historial de versiones de un documento
exports.getDocumentHistory = async (req, res) => {
    const { title } = req.params; // El título se pasa como parámetro de la ruta

    try {
        // Determina la colección correspondiente según el título
        let HistoricalModel;
        if (title === 'Deslinde legal') {
            HistoricalModel = DeslindeLegal;
        } else if (title === 'Política de privacidad') {
            HistoricalModel = PoliticPrivacy;
        } else if (title === 'Términos y condiciones') {
            HistoricalModel = TermsAndCondition;
        } else {
            return res.status(400).json({ message: 'Título no válido.' });
        }

        // Obtiene todas las versiones del historial
        const history = await HistoricalModel.find().sort({ createdAt: -1 }); // Orden descendente por fecha
        res.status(200).json(history);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
exports.getLatestVersions = async (req, res) => {
    try {
        const latestDocuments = await Document.aggregate([
            { $sort: { version: -1 } }, // Ordena por versión en orden descendente
            {
                $group: {
                    _id: "$title", // Agrupa por el campo título
                    latestVersion: { $first: "$$ROOT" } // Selecciona la versión más reciente
                }
            },
            {
                $replaceRoot: { newRoot: "$latestVersion" } // Reemplaza el root con la última versión
            }
        ]);

        res.json(latestDocuments);
    } catch (error) {
        console.error("Error al obtener las versiones más recientes de los documentos:", error);
        res.status(500).json({ message: 'Error al obtener las versiones más recientes de los documentos', error });
    }
};


// Obtener la versión vigente actual de un documento
exports.getCurrentVersion = async (req, res) => {
    try {
        const currentVersion = await Document.findOne({ status: 'active' });
        if (!currentVersion) return res.status(404).json({ error: 'No hay ninguna versión activa' });

        await logAudit(req.user.id, 'VIEW_CURRENT', 'Documento', { documentId: currentVersion._id });
        res.json(currentVersion);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la versión vigente' });
    }
};

// Obtener todos los documentos con paginación
exports.getAllDocuments = async (req, res) => {
    try {
        // Obtener todos los documentos excluyendo los eliminados
        const documents = await Document.find();

        // Registro de auditoría
        await logAudit(req.user.id, 'VIEW_ALL', 'Documentos', { action: 'Obtener todos los documentos' });

        // Respuesta con todos los documentos
        res.status(200).json({
            documents,
            totalDocuments: documents.length, // Total de documentos
        });
    } catch (error) {
        console.error("Error al obtener documentos:", error);
        res.status(500).json({ msg: "Error al obtener documentos" });
    }
};

exports.getAllDocumentsUser = async (req, res) => {
    try {
        // Obtener todos los documentos excluyendo los eliminados
        const documents = await Document.find();

        // Respuesta con todos los documentos
        res.status(200).json({
            documents,
            totalDocuments: documents.length, // Total de documentos
        });
    } catch (error) {
        console.error("Error al obtener documentos:", error);
        res.status(500).json({ msg: "Error al obtener documentos" });
    }
};


exports.getAllDeletedDocuments = async (req, res) => {
    try {
        // Obtén los documentos eliminados de cada colección
        const deslindeLegalDocs = await DeslindeLegal.find({ status: 'deleted' });
        const politicPrivacyDocs = await PoliticPrivacy.find({ status: 'deleted' });
        const termsAndConditionDocs = await TermsAndCondition.find({ status: 'deleted' });

        // Devuelve los resultados agrupados por colección
        res.status(200).json({
            deslindeLegal: deslindeLegalDocs,
            politicPrivacy: politicPrivacyDocs,
            termsAndCondition: termsAndConditionDocs,
        });
    } catch (error) {
        console.error('Error al obtener documentos eliminados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
// Buscar documentos por término de búsqueda
exports.searchDocuments = async (req, res) => {
    try {
        const searchQuery = req.query.query ? xss(req.query.query) : '';

        const documents = await Document.find({
            $or: [
                { title: { $regex: searchQuery, $options: 'i' } },
                { content: { $regex: searchQuery, $options: 'i' } }
            ]
        });

        await logAudit(req.user.id, 'SEARCH', 'Documentos', { searchQuery });
        res.status(200).json(documents);
    } catch (error) {
        console.error("Error al buscar documentos:", error);
        res.status(500).json({ msg: "Error al buscar documentos." });
    }
};

// Obtener documentos recientes
exports.getRecentDocuments = async (req, res) => {
    try {
        const recentDocuments = await Document.find().sort({ createdAt: -1 }).limit(5);

        await logAudit(req.user.id, 'VIEW_RECENT', 'Documentos', {});
        res.status(200).json(recentDocuments);
    } catch (error) {
        console.error("Error al obtener documentos recientes:", error);
        res.status(500).json({ msg: "Error al obtener documentos recientes." });
    }
};
// Actualizar el estado de un documento
exports.updateDocumentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const document = await Document.findByIdAndUpdate(id, { status }, { new: true });
        if (!document) return res.status(404).json({ error: 'Documento no encontrado' });

        res.json({ msg: 'Estado del documento actualizado', document });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estado del documento' });
    }
};

// Obtener una versión específica del documento
exports.getDocumentByVersion = async (req, res) => {
    const { version } = req.params;

    try {
        const document = await Document.findOne({ version });
        if (!document) return res.status(404).json({ error: 'Versión de documento no encontrada' });

        res.json(document);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la versión del documento' });
    }
};

exports.filterDocuments = async (req, res) => {
    try {
        const { title, status, version, startDate, endDate, collection } = req.query;

        // Mapear las colecciones a sus modelos Mongoose
        const collectionMap = {
            deslindeLegal: DeslindeLegal,
            politicPrivacy: PoliticPrivacy,
            termsAndCondition: TermsAndCondition,
            default: Document, // Modelo predeterminado
        };

        // Seleccionar el modelo basado en la colección
        const targetModel = collectionMap[collection] || collectionMap.default;

        // Construir el filtro dinámico
        const filters = {};
        if (title) filters.title = title;
        if (status) filters.status = status;
        if (version) filters.version = version;
        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) filters.createdAt.$gte = new Date(startDate);
            if (endDate) filters.createdAt.$lte = new Date(endDate);
        }

        // Ejecutar la consulta usando el modelo Mongoose
        const results = await targetModel.find(filters);

        res.status(200).json({ message: 'Documentos filtrados correctamente.', results });
    } catch (error) {
        console.error('Error al filtrar documentos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
