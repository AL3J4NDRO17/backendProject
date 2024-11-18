// src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const configController = require('../controllers/incidentsController/incidentsController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');
const { body, query } = require('express-validator'); // Importación de validadores

// Ruta para actualizar el mensaje de activación de cuenta
// Ruta para actualizar el mensaje de activación de cuenta
router.put('/activationMessage', verifyToken, verifyRole(['admin']), configController.updateActivationMessage);

// Ruta para actualizar intentos máximos de inicio de sesión
router.put('/maxLoginAttempts', verifyToken, configController.updateMaxLoginAttempts);

// Ruta para actualizar el tiempo de vida del OTP
router.put('/verificationToken', verifyToken, verifyRole(['admin']), configController.updateverificationToken);

router.put('/otpExpiration', verifyToken, verifyRole(['admin']), configController.updateOtpToken);


// Ruta para obtener usuarios bloqueados recientemente con filtro de tiempo
router.get('/getRecentUsers', verifyToken, verifyRole(['admin']), configController.getRecentlyBlockedUsers);

router.get('/getConfig',verifyToken, verifyRole(['admin']), configController.getConfigData);

module.exports = router;
