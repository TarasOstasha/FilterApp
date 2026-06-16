const createHttpError = require('http-errors');
const { FilterField } = require('../models');

const VALID_FIELD_TYPES = new Set(['checkbox', 'range']);

const parseFilterFieldId = (raw) => {
  const id = parseInt(String(raw || '').trim(), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, 'Valid filter field ID is required');
  }
  return id;
};

const normalizeAllowedValues = (raw) => {
  const value = String(raw ?? '').trim();
  return value || null;
};

const normalizeSortOrder = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return 0;
  }
  const sortOrder = parseInt(String(raw).trim(), 10);
  if (!Number.isInteger(sortOrder)) {
    throw createHttpError(400, 'sort_order must be an integer');
  }
  return sortOrder;
};

const validateFieldType = (fieldType) => {
  const value = String(fieldType || '').trim();
  if (!value) {
    throw createHttpError(400, 'field_type is required');
  }
  if (!VALID_FIELD_TYPES.has(value)) {
    throw createHttpError(400, `field_type must be one of: ${[...VALID_FIELD_TYPES].join(', ')}`);
  }
  return value;
};

const toAdminFilterField = (field) => ({
  id: field.id,
  field_name: field.field_name,
  field_type: field.field_type,
  allowed_values: field.allowed_values || '',
  sort_order: field.sort_order ?? 0,
});

async function getFilterFieldById(rawId) {
  const id = parseFilterFieldId(rawId);
  const field = await FilterField.findByPk(id, { raw: true });
  return field ? toAdminFilterField(field) : null;
}

async function createFilterField(payload) {
  const fieldName = String(payload.field_name || '').trim();
  if (!fieldName) {
    throw createHttpError(400, 'field_name is required');
  }

  const fieldType = validateFieldType(payload.field_type);
  const allowedValues = normalizeAllowedValues(payload.allowed_values);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  const createData = {
    field_name: fieldName,
    field_type: fieldType,
    allowed_values: allowedValues,
    sort_order: sortOrder,
  };

  if (payload.id !== undefined && payload.id !== null && String(payload.id).trim() !== '') {
    const id = parseFilterFieldId(payload.id);
    const existing = await FilterField.findByPk(id);
    if (existing) {
      throw createHttpError(409, `Filter field ID ${id} already exists`);
    }
    createData.id = id;
  }

  const created = await FilterField.create(createData);
  return toAdminFilterField(created.get({ plain: true }));
}

async function updateFilterFieldById(rawId, payload) {
  const id = parseFilterFieldId(rawId);
  const existing = await FilterField.findByPk(id);
  if (!existing) {
    throw createHttpError(404, `Filter field not found: ${id}`);
  }

  const fieldName = String(payload.field_name || '').trim();
  if (!fieldName) {
    throw createHttpError(400, 'field_name is required');
  }

  const fieldType = validateFieldType(payload.field_type);
  const allowedValues = normalizeAllowedValues(payload.allowed_values);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  await existing.update({
    field_name: fieldName,
    field_type: fieldType,
    allowed_values: allowedValues,
    sort_order: sortOrder,
  });

  return toAdminFilterField(existing.get({ plain: true }));
}

async function deleteFilterFieldById(rawId) {
  const id = parseFilterFieldId(rawId);
  const existing = await FilterField.findByPk(id);
  if (!existing) {
    throw createHttpError(404, `Filter field not found: ${id}`);
  }

  const result = {
    id: existing.id,
    field_name: existing.field_name,
  };

  await existing.destroy();
  return result;
}

module.exports = {
  getFilterFieldById,
  createFilterField,
  updateFilterFieldById,
  deleteFilterFieldById,
};
