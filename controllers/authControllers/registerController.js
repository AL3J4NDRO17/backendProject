const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');
const { getConfigValue } = require('../../utils/config');
const { sendEmail } = require('../../utils/sendEmail');
const { validationResult, check } = require('express-validator');
const logger = require('../../utils/logger');


// Validación de registro
exports.validateRegistration = [
    check('correo').isEmail().withMessage('Correo inválido').normalizeEmail({ gmail_remove_dots: false }),
    check('contraseña').isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }).withMessage('La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, un número y un símbolo especial'),
    check('nombreCompleto').isAlpha('es-ES', { ignore: ' ' }).withMessage('El nombre solo puede contener letras y espacios').trim().escape(),
];

// Función para registrar usuario
exports.register = async (req, res) => {
    const { correo, contraseña, nombreCompleto, captchaToken } = req.body;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Validación de CAPTCHA
        if (!captchaToken) {
            return res.status(400).json({ msg: "Token de reCAPTCHA faltante" });
        }
        const captchaResponse = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`);
        if (!captchaResponse.data.success) {
            console.error("reCAPTCHA falló:", captchaResponse.data["error-codes"]);
            return res.status(400).json({ msg: "Falló la verificación de CAPTCHA", details: captchaResponse.data["error-codes"] });
        }
        let user = await User.findOne({ correo });
        if (user) return res.status(400).json({ msg: "El correo ya está registrado" });

        // Verificar si el usuario ya existe
       
        // Crear nuevo usuario con contraseña encriptada
        user = new User({
            correo,
            pass: await bcrypt.hash(contraseña, 10),
            nombreCompleto,
            status: 'inactive',
        });

        await user.save(); // Guardamos el usuario para obtener el _id

        // Obtener el tiempo de expiración del token de verificación desde la base de datos
        const tokenLifetime = await getConfigValue('verificationTokenLifetime');  // Suponiendo que el tiempo está en minutos
        const tokenExpiration = `${tokenLifetime}m`;  // Convierte a formato JWT, como '30m' o '1h'

        // Generar token de verificación
        const verificationToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: tokenExpiration });
        user.verificationToken = verificationToken;
        await user.save();

        // Obtener el mensaje de activación desde la base de datos
        const activationMessage = await getConfigValue('activationMessage');

        // Enviar correo de verificación con plantilla personalizada
        const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        const htmlTemplate = fs.readFileSync(path.join(__dirname, '../../utils/Templates/verificarCuenta.html'), 'utf8')
            .replace('${nombreCompleto}', nombreCompleto)
            .replace(/\${verificationLink}/g, verificationLink)
            .replace('${tokenLifetime}', tokenLifetime)
            .replace('${activationMessage}', activationMessage);

        await sendEmail(user.correo, "Verificación de cuenta", htmlTemplate);

        res.status(201).json({ msg: "Usuario registrado, verifica tu correo electrónico" });
    } catch (err) {
        console.error('Error en el registro:', err);
        res.status(500).json({ msg: "Error en el servidor" });
    }
};

// Función para verificar la cuenta
exports.verifyAccount = async (req, res) => {
    const { token } = req.params;
    console.log("Token recibido para verificación:", token);

    if (!token) {
        return res.status(400).json({ msg: 'Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token decodificado:", decoded);

        const userId = decoded.userId;
        const user = await User.findById(userId);
       
        if (!user) {
            return res.status(400).json({ msg: 'Usuario no encontrado o token inválido.' });
        }

        if (user.status === 'active') {
            return res.status(400).json({ msg: 'La cuenta ya está verificada.' });
        }
        console.log(user.verificationToken )
        user.status = 'active';
        user.verificationToken = null; // Borra el token de verificación
        await user.save();

        res.json({ msg: 'Cuenta verificada exitosamente.' });
    } catch (error) {
        console.error('Error al verificar el email:', error);
        res.status(400).json({ msg: 'Token inválido o expirado.' });
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        // Verificar si el correo existe
        const user = await User.findOne({ correo: email });

        if (!user) {
            return res.status(404).json({ msg: "Usuario no encontrado." });
        }

        // Verificar si ya está verificado
        if (user.status === "active") {
            return res.status(400).json({ msg: "La cuenta ya está verificada." });
        }
        
        // Generar un nuevo token de verificación
        const tokenLifetime = await getConfigValue('verificationTokenLifetime') || 60; // Tiempo en minutos
        const verificationToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: `${tokenLifetime}m` } // Expiración del token
        );
        const activationMessage = await getConfigValue('activationMessage');
        // Actualizar el token en el usuario
        user.verificationToken = verificationToken;
        await user.save();

        // Leer la plantilla HTML y personalizarla
        const htmlTemplatePath = path.join(__dirname, '../../utils/Templates/verificarCuenta.html');
        const htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8')
            .replace('${nombreCompleto}', user.nombreCompleto)
            .replace(/\${verificationLink}/g, `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`)
            .replace('${tokenLifetime}', tokenLifetime)
            .replace('${activationMessage}', activationMessage);
        
         

        // Enviar el correo
        await sendEmail(user.correo, "Reenvío de verificación de cuenta", htmlTemplate);

        res.status(200).json({ msg: "Correo de verificación reenviado." });
    } catch (error) {
        console.error("Error al reenviar correo de verificación:", error);
        res.status(500).json({ msg: "Error en el servidor al reenviar el correo de verificación." });
    }
};
