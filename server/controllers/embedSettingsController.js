const createError = require('http-errors');
const embedSettingsService = require('../services/embedSettingsService');

module.exports.getEmbedSettings = async (req, res, next) => {
  try {
    const settings = await embedSettingsService.getEmbedSettings();
    return res.status(200).json(settings);
  } catch (error) {
    return next(createError(500, 'Failed to load embed settings'));
  }
};

module.exports.updateEmbedSettings = async (req, res, next) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return next(createError(400, 'enabled must be a boolean'));
    }

    const settings = await embedSettingsService.setEmbedEnabled(enabled);
    return res.status(200).json(settings);
  } catch (error) {
    return next(createError(500, 'Failed to update embed settings'));
  }
};
