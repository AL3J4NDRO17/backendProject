const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Importar crypto para generar el token de recuperación
const User = require('../../models/User');
const xss = require('xss'); // Evitar ataques XSS
const { sendEmail } = require('../../utils/sendEmail');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');
const { validationResult, check } = require('express-validator');


exports.validateResetPass = [
    check('nuevaContraseña').isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }).withMessage('La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, un número y un símbolo especial'),
];

// Controlador para solicitar restablecimiento de contraseña
exports.requestPasswordReset = async (req, res) => {
    const { correo } = req.body;

    try {
        // Buscar el usuario en la base de datos
        const user = await User.findOne({ correo });
        if (!user) return res.status(404).json({ msg: "Correo no registrado" });

        // Generar un código de verificación
        const resetCode = crypto.randomInt(100000, 999999).toString(); // Código de 6 dígitos
        user.resetPasswordCode = resetCode;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // Expira en 1 hora
        await user.save();

        // Leer la plantilla HTML y reemplazar el código de verificación
        const templatePath = path.join(__dirname, '../../utils/Templates/verificarContra.html');
        let emailTemplate = fs.readFileSync(templatePath, 'utf8');
        emailTemplate = emailTemplate.replace('${resetCode}', resetCode);

        // Enviar el correo con la plantilla
        await sendEmail(user.correo, "Código de verificación para restablecimiento de contraseña", emailTemplate);

        res.json({ msg: "Se ha enviado un código de verificación a tu correo electrónico" });
    } catch (err) {
        logger.error(err.message, err);
        res.status(500).json({ msg: "Error en el servidor" });
    }
};
exports.verifyResetCode = async (req, res) => {
    const { correo, codigo } = req.body;

    try {
        // Buscar el usuario y verificar el código
        const user = await User.findOne({
            correo,
            resetPasswordCode: codigo,
            resetPasswordExpires: { $gt: new Date() }// Verificar que el código no ha expirado
        });


        if (!user) return res.status(400).json({ msg: "Código inválido o expirado" });

        res.json({ msg: "Código verificado correctamente" });
    } catch (err) {
        logger.error(err.message, err);
        res.status(500).json({ msg: "Error en el servidor" });
    }
};

// Controlador para restablecer la contraseña


exports.resetPassword = async (req, res) => {
    const { resetToken, nuevaContraseña } = req.body;
    

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Imprime el código y la hora actual para depuración
        
        // Buscar al usuario por el código de restablecimiento
        const user = await User.findOne({
            resetPasswordCode: resetToken,
            resetPasswordExpires: { $gt: new Date() }
        });
        console.log(user)
        // Verificación si el usuario fue encontrado
        if (!user) {
            console.log("No se encontró ningún usuario que coincida con el código y la fecha de expiración.");
            return res.status(400).json({ msg: "Código inválido o expirado" });
        }

        // Comparar la nueva contraseña con la actual
        const isSamePassword = await bcrypt.compare(nuevaContraseña, user.pass);
        if (isSamePassword) {
            return res.status(400).json({ msg: "La nueva contraseña no puede ser igual a la anterior" });
        }

        // Actualizar la contraseña y limpiar los campos de código
        user.pass = await bcrypt.hash(nuevaContraseña, 10);
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ msg: "Contraseña restablecida con éxito" });
    } catch (err) {
        logger.error(err.message, err);
        console.error("Error en resetPassword:", err);
        res.status(500).json({ msg: "Error en el servidor" });
    }
};
