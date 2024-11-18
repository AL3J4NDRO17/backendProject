// services/configService.js
const Config = require('../models/config');


const getConfigValue = async (type) => {
    const config = await Config.findOne({ type });
    
    if (!config) {
        return null; // Retorna null si no se encuentra el tipo
    }

    // Solo convierte a número si la clave es una de las que se espera que sea numérica
    if (type === 'verificationTokenLifetime' || type === 'otpLifetime' || type === 'max_intents' || type === 'bloqueo_tiempo') {
        return parseInt(config.value, 10);
    }

    // Para otros valores, devuelve el valor tal cual (como cadena)
    return config.value;
};

module.exports = {
    getConfigValue,
};