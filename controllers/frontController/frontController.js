const Config = require('../../models/Front');
const logo = require('../../models/logo');
const Logo = require('../../models/logo')
const { validationResult } = require('express-validator');
const xss = require('xss');

// Obtener todas las configuraciones
const getAllConfigFront = async (req, res) => {
  try {
    const configs = await Config.find({});

    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las configuraciones', error });
  }
};

const getLogoHistory = async (req, res) => {
  try {
    // Busca el único documento que contiene el historial de logos
    const logoHistory = await Logo.findOne({ type: "logotipo" });

    if (!logoHistory) {
      return res.status(404).json({ message: 'No se encontró ningún historial de logos' });
    }

    // Devuelve el documento completo, que incluye el logo actual y el historial
    res.status(200).json({
      currentLogo: logoHistory.currentLogo,
      logoHistory: logoHistory.logoHistory,
    });
  } catch (error) {
    console.error('Error al obtener el historial de logos:', error);
    res.status(500).json({ message: 'Error al obtener el historial de logos' });
  }
};
// Obtener una configuración específica
const getConfigFront = async (req, res) => {
  const { type } = req.params;
  try {
    const config = await Config.findOne({ type });
    if (!config) {
      return res.status(404).json({ message: `Configuración de tipo ${type} no encontrada` });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la configuración', error });
  }
};
const updateLogo = async (req, res) => {
  try {
    const { currentLogo, newLogo } = req.body;
    console.log("actualizarlogos", req.body);

    // Validar que se envió al menos un dato para actualizar
    if (!currentLogo && !newLogo) {
      return res.status(400).json({ message: 'Se requiere al menos un dato para actualizar' });
    }

    // Construir la actualización
    const updateData = {};
    if (newLogo) {
      updateData.currentLogo = newLogo; // Actualizar el logo actual
      updateData.$push = { logoHistory: newLogo }; // Agregar al historial
    }
    if (currentLogo) {
      updateData.currentLogo = currentLogo; // Actualizar el logo actual
    }

    // Actualizar el documento directamente
    const updatedLogo = await Logo.findOneAndUpdate(
      { type: "logotipo" },
      updateData,
      { new: true } // Retornar el documento actualizado
    );

    if (!updatedLogo) {
      return res.status(404).json({ message: 'No se encontró ningún logotipo para actualizar' });
    }

    res.status(200).json({
      message: 'Logo actualizado exitosamente',
      currentLogo: updatedLogo.currentLogo,
      logoHistory: updatedLogo.logoHistory,
    });
  } catch (error) {
    console.error('Error al actualizar el logo:', error);
    res.status(500).json({ message: 'Error al actualizar el logo' });
  }
};




const activateLogo = async (req, res) => {
  try {
    const { logoToActivate } = req.body;

    // Validar que se envió el logo a activar
    if (!logoToActivate) {
      return res.status(400).json({ message: 'Se requiere un logo para activar' });
    }

    // Actualizar el documento directamente
    const updatedLogo = await Logo.findOneAndUpdate(
      { type: "logotipo" }, // Condición para encontrar el documento
      {
        $set: { currentLogo: logoToActivate }, // Actualizar el logo actual
        $addToSet: { logoHistory: logoToActivate }, // Asegurar que el logo esté en el historial
      },
      { new: true } // Retornar el documento actualizado
    );

    // Si no se encontró el documento
    if (!updatedLogo) {
      return res.status(404).json({ message: 'No se encontró ningún logotipo para actualizar' });
    }

    res.status(200).json({
      message: 'Logo activado correctamente',
      currentLogo: updatedLogo.currentLogo,
      logoHistory: updatedLogo.logoHistory,
    });
  } catch (error) {
    console.error('Error al activar el logo:', error);
    res.status(500).json({ message: 'Error al activar el logo' });
  }
};



// Actualizar o crear una configuración
const updateConfigFront = async (req, res) => {

  // Validación de errores
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type, value } = req.body;

  try {
    // Buscar configuración por tipo
    let config = await Config.findOne({ type });

    if (!config) {
      // Si no existe, crear una nueva configuración
      config = new Config({
        type,
        value: xss(value)
      });
    } else {
      // Si existe, actualizar el valor y la fecha
      config.value = xss(value);
      config.updatedAt = Date.now();
    }

    // Guardar la configuración en la base de datos
    await config.save();
    res.json({ message: `Configuración de tipo ${type} actualizada correctamente`, config });

  } catch (error) {
    console.error('Error al actualizar o crear la configuración:', error);
    res.status(500).json({ message: 'Error al actualizar o crear la configuración', error });
  }
};


// Eliminar una configuración
const deleteConfigFront = async (req, res) => {
  const { type } = req.params;
  try {
    await Config.deleteOne({ type });
    res.json({ message: `Configuración de tipo ${type} eliminada correctamente` });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la configuración', error });
  }
};

module.exports = { activateLogo, updateLogo, getLogoHistory, getAllConfigFront, getConfigFront, updateConfigFront, deleteConfigFront };
