const express = require('express');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/admin', verifyToken, checkRole('admin'), (req, res) => {
    res.json({ msg: "Bienvenido al panel de administración" });
});

router.get('/user-dashboard', verifyToken, (req, res) => {
    res.json({ msg: "Bienvenido al dashboard de usuario" });
});

module.exports = router;