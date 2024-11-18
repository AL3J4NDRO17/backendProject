const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ msg: "Acceso denegado" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Aquí te aseguras de que `req.user.id` esté disponible
        req.user = { id: decoded.userId, role: decoded.role }; // Suponiendo que tienes `id` y `role` en el token
       
        next();
    } catch (err) {
        res.status(401).json({ msg: "Token no válido" });
    }
};

exports.verifyRole = (roles) => (req, res, next) => {
   
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ msg: "Acceso prohibido" });
    }
    next();
};

exports.protectRoute = (roles = []) => (req, res, next) => {
    try {
        // Obtener el token desde las cookies
        const token = req.cookies.authToken;
        
        if (!token) {
            return res.status(401).json({ msg: "Acceso denegado. No autorizado" });
        }

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Almacena los datos del usuario en req.user para uso posterior

        // Verificar rol si se especifica (verificar si el usuario tiene permiso)
        if (roles.length && !roles.includes(decoded.role)) {
            return res.status(403).json({ msg: "Acceso prohibido. No tienes permisos para esta ruta" });
        }

        // Si todo está bien, continúa con la siguiente función
        next();
    } catch (error) {
        console.error("Error en protectRoute:", error);
        res.status(401).json({ msg: "Token inválido o ha expirado" });
    }
};