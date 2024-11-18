const express = require('express');
const router = express.Router();

const { body, param } = require('express-validator');
const {
  getAllConfigFront,
  getConfigFront,
  updateConfigFront,
  deleteConfigFront, 
  getLogoHistory, 
  updateLogo,
  activateLogo,
} = require('../controllers/frontController/frontController');

router.get('/getConfig', getAllConfigFront);

router.get('/logoHistory', getLogoHistory);

router.get('/:type',
  param('type').notEmpty().withMessage('El tipo es obligatorio'),
  getConfigFront
);

router.put('/updateLogo', updateLogo);

router.put('/logo/activate', activateLogo);

router.put('/updateData',
  body('type').notEmpty().withMessage('El tipo es obligatorio'),
  body('value').notEmpty().withMessage('El valor es obligatorio'),
  updateConfigFront
);

router.delete('/:type',
  param('type').notEmpty().withMessage('El tipo es obligatorio'),
  deleteConfigFront
);

module.exports = router;
