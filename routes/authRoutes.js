// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');


const {
    login,
    logout,
    verifyOtp,
    resendOtp,
    getUserData,
    getOtpExpTime
} = require('../controllers/authControllers/loginController');

const {
    register,
    verifyAccount,
    validateRegistration,
    resendVerification
} = require('../controllers/authControllers/registerController');

const {
    requestPasswordReset,
    resetPassword,
    verifyResetCode,
    validateResetPass,
} = require('../controllers/resetPassworController/passwordResetController');

const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

// const loginLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutos
//     max: 5, // Limitar cada IP a 5 intentos por ventana de 15 minutos
//     message: 'Demasiados intentos de inicio de sesión. Por favor intenta de nuevo más tarde.'
// });


// Rutas de autenticación
router.post('/register', validateRegistration, register);
router.get('/verify/:token', verifyAccount);
router.post('/login', login);
router.post('/logout', logout);
router.post('/verify-otp', verifyOtp);
router.get('/user-data', verifyToken, getUserData); // Protege esta ruta para usuarios autenticados

router.post('/resend-verification', resendVerification);

router.post('/resend-otp', resendOtp); // Nueva ruta para reenviar el OTP
router.get('/otp-exp-time', getOtpExpTime);

// Rutas para restablecimiento de contraseña
router.post('/requestPasswordReset', requestPasswordReset);
router.post('/resetPassword', validateResetPass, resetPassword);
router.post('/verifyCodeReset', verifyResetCode);


// Ruta de administración (solo accesible para administradores)
router.get('/admin', verifyToken, verifyRole(['admin']), (req, res) => {
    res.status(200).json({ msg: "Bienvenido al panel de administración." });
});

module.exports = router;
