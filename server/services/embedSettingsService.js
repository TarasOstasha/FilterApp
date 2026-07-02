const fs = require('fs').promises;
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../data/embed-settings.json');
const DEFAULT_SETTINGS = { enabled: true };

async function ensureSettingsFile() {
  try {
    await fs.access(SETTINGS_PATH);
  } catch {
    await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
  }
}

async function readSettingsFile() {
  await ensureSettingsFile();
  const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    enabled: parsed.enabled !== false,
  };
}

async function getEmbedSettings() {
  return readSettingsFile();
}

async function setEmbedEnabled(enabled) {
  const settings = { enabled: Boolean(enabled) };
  await ensureSettingsFile();
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

module.exports = {
  getEmbedSettings,
  setEmbedEnabled,
};
