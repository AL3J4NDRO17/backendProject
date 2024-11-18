const express = require('express');
const connectDB = require('./config/db');
// Rutas
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const configRoutes = require('./routes/configRoutes');
const frontRoutes = require('./routes/frontRoutes');

const cors = require('cors');
const logger = require('./utils/logger');

require('dotenv').config();

// Cookies
const cookieParser = require('cookie-parser');

// Prevenir ataques
const helmet = require('helmet'); // XSS
const csrf = require('csurf'); // CSRF

const app = express();

// Conexión a la base de datos
connectDB();

// Middleware para proteger contra XSS
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Deshabilitar almacenamiento en caché
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Middleware para cookies y JSON
app.use(cookieParser());
app.use(express.json());

// Configuración de CORS
app.use(
  cors({
    origin: 'http://prophysio.developers506.com', // Reemplaza con la URL del frontend
    credentials: true, // Permite el envío de cookies
  })
);

// Middleware de protección CSRF
app.use(
  csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo en producción
      sameSite: 'strict', // Ajusta según sea necesario
    },
  })
);

// Ruta para obtener el token CSRF
app.get('/api/get-csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Inspeccionar token CSRF (solo para depuración)
app.use((req, res, next) => {
  console.log('CSRF Token:', req.csrfToken());
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/front', frontRoutes);

// Manejo de errores
app.use((error, req, res, next) => {
  logger.error(error.stack);
  if (error.code === 'EBADCSRFTOKEN') {
    // Token CSRF inválido
    return res.status(403).json({ message: 'Token CSRF inválido o faltante' });
  }
  res.status(500).send('Algo salió mal');
});

// Configuración del puerto y escucha
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
