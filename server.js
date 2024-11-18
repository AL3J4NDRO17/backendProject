// server.js
const express = require('express');
const connectDB = require('./config/db');
//Rutas
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const configRoutes = require('./routes/configRoutes.js');
const frontRoutes= require('./routes/frontRoutes.js')

const cors = require('cors');
const logger = require('./utils/logger');

require('dotenv').config();

//Cookies
const cookieParser = require('cookie-parser');


//Prevenir Ataques
const helmet = require('helmet'); //XSS
const csrf = require('csurf'); //CSRF


const app = express();
app.use(express.json());


connectDB();

//Prevenir Ataques Contra XSS
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));



app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

app.use(cookieParser());
app.use(express.json());

app.use(cors({
    origin: 'http://prophysio.developers506.com', // Reemplaza con la URL del frontend
    credentials: true,               // Permite el envío de cookies si es necesario
}));

const csrfProtection = csrf(csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Solo en producción
        sameSite: 'strict', // Ajusta según sea necesario
    },
}));
app.use(csrfProtection);

app.get('/api/get-csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});



// Ruta para obtener el token CSRF

app.use('/api/auth', authRoutes);
app.use('/api/config',configRoutes)
app.use('/api/documents',documentRoutes)
app.use('/api/front',frontRoutes)



app.use((error, req, res, next) => {
    logger.error(error.stack);
    res.status(500).send('Algo salió mal');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
