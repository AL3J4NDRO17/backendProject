const mongoose = require('mongoose');

// Esquema base para documentos históricos
const HistoricalDocumentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    validUntil: { type: Date, required: true },
    author: { type: String, required: true },
    version: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, required: true },
    movedAt: { type: Date, default: Date.now }, // Fecha de movimiento al historial
});

// Exportar modelos específicos
const DeslindeLegal = mongoose.model('DeslindeLegal', HistoricalDocumentSchema, 'deslindeLegal');
const PoliticPrivacy = mongoose.model('PoliticPrivacy', HistoricalDocumentSchema, 'politicPrivacy');
const TermsAndCondition = mongoose.model('TermsAndCondition', HistoricalDocumentSchema, 'termsAndCondition');

module.exports = { DeslindeLegal, PoliticPrivacy, TermsAndCondition };