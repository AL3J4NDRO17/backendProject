// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../../models/User');
const { getConfigValue } = require('../../utils/config');

//Evitar Ataquee XSS
const xss = require('xss');

const { sendEmail, sendOtpEmail } = require('../../utils/sendEmail');


const { validationResult, check } = require('express-validator');

const logger = require('../../utils/logger');

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000); // Genera un número de 6 dígitos
};


const isPasswordStrong = (password) => {
    const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
    return regex.test(password);
};


//Funcion para Iniciar sesion
exports.login = async (req, res) => {
    const correo = xss(req.body.correo);
    const pass = xss(req.body.pass);


    try {
        // Verificar si el usuario existe
        const user = await User.findOne({ correo });


        if (!user) {
            console.log(`Usuario no encontrado: ${correo}`);
            return res.status(400).json({ msg: "Usuario no registrado." });
        }


        // Verificar si la cuenta está inactiva o bloqueada
        if (user.status !== "active") {
            logger.info(`Intento de inicio de sesión para cuenta inactiva: ${correo}`);
            return res.status(403).json({ msg: "Por favor verifica tu cuenta." });
        }

        if (user.bloqueado && Date.now() < user.bloqueado.getTime()) {
            logger.info(`Intento de inicio de sesión para cuenta bloqueada: ${correo}`);
            return res.status(403).json({ msg: "La cuenta está temporalmente bloqueada. Inténtalo más tarde." });
        }

        const maxAttempts = await getConfigValue('max_intents');
        const lockTime = await getConfigValue('bloqueo_tiempo');

        // Verificar contraseña


        const isMatch = await bcrypt.compare(pass, user.pass);

        if (!isMatch) {
            user.failtrys = (user.failtrys || 0) + 1;

            // Bloquear cuenta si se exceden los intentos
            if (user.failtrys >= maxAttempts) {
                user.bloqueado = Date.now() + lockTime * 60 * 1000; // Convertir minutos a milisegundos
                user.failtrys = 0; // Reiniciar el contador de intentos fallidos después del bloqueo
                await user.save();
                logger.info(`Intento fallido de inicio de sesión para usuario: ${correo}, cuenta bloqueada`)
                return res.status(403).json({ msg: "Cuenta bloqueada. Inténtalo más tarde." });
            }

            await user.save();
            logger.info(`Intento fallido de inicio de sesión para usuario: ${correo}, contraseña incorrecta`);
            return res.status(400).json({ msg: "Contraseña incorrecta." });
        }

        // Resetear intentos fallidos al iniciar sesión correctamente
        user.failtrys = 0;
        user.bloqueado = null;
        await user.save();

        // Generar el token JWT
        const otp = generateOtp(); // Usando la función alternativa
        const otpExpTime = await getConfigValue('OtpExpTime'); // Obtener el tiempo de expiración del OTP de la configuración
        console.log(otpExpTime)
        user.otp = otp;
        user.otpExpires = Date.now() + otpExpTime * 60 * 1000; // Asignar la expiración del OTP basada en la configuración
        await user.save();

        // Enviar OTP al correo del usuario
        await sendOtpEmail(user.correo, otp);

        res.json({ msg: "OTP enviado. Verifica tu correo para continuar.", userId: user._id });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ msg: "Error en el servidor." });
    }
};

//Funcion para Validar el Inicio de Sesion mediante MFA
exports.verifyOtp = async (req, res) => {
    const { userId, otp } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user || user.otp !== parseInt(otp) || Date.now() > user.otpExpires) {
            return res.status(400).json({ msg: "Código OTP incorrecto o expirado." });
        }

        // Limpiar OTP y emitir JWT con el rol
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        const authToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('authToken', authToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 1 día en milisegundos
            sameSite: 'Strict',
            path: '/',
        });


        res.json({ msg: "Inicio de sesión exitoso" });
    } catch (error) {
        console.error("Error al verificar OTP:", error);
        res.status(500).json({ msg: "Error en el servidor." });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const userId = req.body.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: "Usuario no encontrado." });
        }

        const otp = generateOtp();
        const otpExpTime = await getConfigValue('OtpExpTime');
        user.otp = otp;
        user.otpExpires = Date.now() + otpExpTime * 60 * 1000;
        await user.save();

        await sendOtpEmail(user.correo, otp);

        res.json({ msg: "OTP reenviado. Verifica tu correo." });
    } catch (error) {
        console.error("Error al reenviar OTP:", error);
        res.status(500).json({ msg: "Error en el servidor al reenviar OTP." });
    }
};


// Controlador para obtener el tiempo de expiración del OTP
exports.getOtpExpTime = async (req, res) => {
    try {
        // Obtener el valor de OtpExpTime desde la configuración
        const otpExpTime = await getConfigValue('OtpExpTime');
        
        if (!otpExpTime) {
            return res.status(404).json({ msg: "Tiempo de expiración del OTP no configurado." });
        }

        res.json({ value: otpExpTime });
    } catch (error) {
        console.error("Error al obtener el tiempo de expiración del OTP:", error);
        res.status(500).json({ msg: "Error en el servidor al obtener el tiempo de expiración del OTP." });
    }
};

exports.getUserData = (req, res) => {
    try {
        const token = req.cookies.authToken; // Leer el token desde la cookie
        if (!token) return res.status(401).json({ msg: "No autenticado" });

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId, role } = decoded;

        res.status(200).json({ userId, role }); // Devolver solo los datos necesarios
    } catch (error) {
        res.status(401).json({ msg: "Token inválido o expirado" });
    }
};


//Funcion para Cerrar Sesion
exports.logout = (req, res) => {
    res.clearCookie('authToken');
    logger.info(`Cierre de sesión para usuario: ${req.user ? req.user.correo : "usuario desconocido"}`);
    res.json({ msg: "Cierre de sesión exitoso" });
};


