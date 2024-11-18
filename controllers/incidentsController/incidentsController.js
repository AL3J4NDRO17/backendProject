// src/controllers/configController.js
const xss = require('xss');

const Config = require('../../models/config');
const User = require('../../models/User');

const { getConfigValue } = require('../../utils/config');

exports.updateActivationMessage = async (req, res) => {
    console.log("Datos recibidos en updateActivationMessage:", req.body);  // Verificar si llegan datos
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Mensaje de activación es requerido' });
        }
        await Config.findOneAndUpdate(
            { type: 'activationMessage' },
            { value: message },
            { upsert: true, new: true }
        );
        res.status(200).json({ msg: 'Mensaje de activación actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando mensaje de activación:', error);
        res.status(500).json({ error: 'No se pudo actualizar el mensaje de activación' });
    }
};

exports.updateMaxLoginAttempts = async (req, res) => {
    console.log(req.body)
    try {
        const { maxAttempts } = req.body;
        await Config.findOneAndUpdate(
            { type: 'max_intents' },  // Cambiar a 'max_intents'
            { value: maxAttempts },
            { upsert: true, new: true }
        );
        res.status(200).json({ msg: 'Intentos máximos de inicio de sesión actualizados correctamente' });
    } catch (error) {
        console.error('Error actualizando intentos máximos:', error);
        res.status(500).json({ error: 'No se pudo actualizar los intentos máximos de inicio de sesión' });
    }
};

exports.updateverificationToken = async (req, res) => {
    try {
        const { verificationToken } = req.body;
        console.log(req.body)
        await Config.findOneAndUpdate(
            { type: 'expired_time' },  // Cambiar a 'expired_time'
            { value: verificationToken },
            { upsert: true, new: true }
        );
        res.status(200).json({ msg: 'Tiempo de vida del OTP actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando tiempo de vida del OTP:', error);
        res.status(500).json({ error: 'No se pudo actualizar el tiempo de vida del OTP' });
    }
};

exports.updateOtpToken = async (req, res) => {
    try {
        const {otpLifetime } = req.body;
     
        await Config.findOneAndUpdate(
            { type: 'OtpExpTime' },  // Cambiar a 'expired_time'
            { value: otpLifetime },
            { upsert: true, new: true }
        );
        res.status(200).json({ msg: 'Tiempo de vida del OTP actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando tiempo de vida del OTP:', error);
        res.status(500).json({ error: 'No se pudo actualizar el tiempo de vida del OTP' });
    }
};

// Obtener usuarios bloqueados recientemente
exports.getRecentlyBlockedUsers = async (req, res) => {
    try {
        const { timeframe } = req.query;
        
        // Define el filtro de tiempo según el período seleccionado
        let dateFilter = new Date();
        switch (timeframe) {
            case 'day':
                dateFilter.setDate(dateFilter.getDate() - 1);
                break;
            case 'week':
                dateFilter.setDate(dateFilter.getDate() - 7);
                break;
            case 'month':
                dateFilter.setMonth(dateFilter.getMonth() - 1);
                break;
            default:
                return res.status(400).json({ error: 'Intervalo de tiempo no válido' });
        }

        // Buscar usuarios bloqueados en el período especificado usando el campo `bloqueado`
        const blockedUsers = await User.find({
            bloqueado: { $gte: dateFilter }
        }).select('nombreCompleto correo bloqueado'); // Seleccionar solo los campos necesarios
    
        res.status(200).json({ users: blockedUsers });
    } catch (error) {
        console.error('Error obteniendo usuarios bloqueados:', error);
        res.status(500).json({ error: 'No se pudo obtener la lista de usuarios bloqueados' });
    }
};

// Ruta en el controlador de configuración
exports.getConfigData = async (req, res) => {
    try {
        const activationMessage = await getConfigValue('activationMessage');
        const maxLoginAttempts = await getConfigValue('max_intents');
        const registerExpiration = await getConfigValue('verificationTokenLifetime');
        const otpExpiration = await getConfigValue('OtpExpTime');

        res.status(200).json({
            activationMessage,
            maxLoginAttempts,
            registerExpiration,
            otpExpiration
        });
    } catch (error) {
        console.error('Error al obtener datos de configuración:', error);
        res.status(500).json({ error: 'No se pudo obtener la configuración' });
    }
};


