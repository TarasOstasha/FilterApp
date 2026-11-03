const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../../models');
const manageExportedFiles = require('./manageExportedFiles');
const {
  isProductPriceFieldName,
  filterFieldsForProductFilterIo,
} = require('../../utils/productPriceField');

const escapeXml = (value) => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/** XML tag from CSV column header (field names may contain spaces). */
const headerToXmlTag = (header) => {
  if (/^filter_field_id_\d+$/.test(header)) return header;

  let tag = String(header)
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!tag || /^\d/.test(tag)) tag = `field_${tag || 'unknown'}`;
  return tag;
};

const buildProductFilterPivotData = async () => {
  const [allFields] = await sequelize.query(`
    SELECT id, field_name
    FROM filter_fields
    ORDER BY id
  `);

  // Product Price assignments are legacy — numeric price lives on products.product_price.
  const exportFields = filterFieldsForProductFilterIo(allFields);
  const sortedFieldIds = exportFields.map((f) => f.id);
  const fieldMeta = new Map(exportFields.map((f) => [f.id, f.field_name]));
  const exportFieldIdSet = new Set(sortedFieldIds);

  const [rows] = await sequelize.query(`
    SELECT 
      pf.product_id,
      p.product_code,
      ff.id               AS filter_field_id,
      ff.field_name       AS filter_field_name,
      pf.filter_value
    FROM product_filters pf
    JOIN products       p  ON p.id  = pf.product_id
    JOIN filter_fields  ff ON ff.id = pf.filter_field_id
    ORDER BY pf.product_id, ff.id, pf.filter_value
  `);

  const byProduct = new Map();

  for (const r of rows) {
    const fieldId = r.filter_field_id;
    if (!exportFieldIdSet.has(fieldId) || isProductPriceFieldName(r.filter_field_name)) {
      continue;
    }

    if (!byProduct.has(r.product_id)) {
      byProduct.set(r.product_id, {
        product_id: r.product_id,
        product_code: r.product_code,
      });
    }

    const rowObj = byProduct.get(r.product_id);
    const colKey = String(fieldId);
    if (rowObj[colKey] === undefined) rowObj[colKey] = '';

    const v = (r.filter_value ?? '').toString().trim();
    if (v) {
      const existing = rowObj[colKey] ? rowObj[colKey].split(',') : [];
      if (!existing.includes(v)) {
        existing.push(v);
        rowObj[colKey] = existing.join(',');
      }
    }
  }

  const headers = ['product_id', 'product_code'];
  for (const id of sortedFieldIds) {
    headers.push(`filter_field_id_${id}`);
    headers.push(fieldMeta.get(id) || `field_${id}`);
  }

  const data = Array.from(byProduct.values()).map((row) => {
    const out = {
      product_id: row.product_id,
      product_code: row.product_code,
    };
    for (const id of sortedFieldIds) {
      const key = String(id);
      const fieldName = fieldMeta.get(id) || `field_${id}`;
      out[`filter_field_id_${id}`] = id;
      out[fieldName] = row[key] || '';
    }
    return out;
  });

  return { data, headers };
};

/** Flat wide XML — same column order as pivot CSV export. */
const pivotDataToXml = (data, headers) => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<product_filters>'];

  for (const row of data) {
    lines.push('  <product>');
    for (const header of headers) {
      const tag = headerToXmlTag(header);
      lines.push(`    <${tag}>${escapeXml(row[header])}</${tag}>`);
    }
    lines.push('  </product>');
  }

  lines.push('</product_filters>');
  return lines.join('\n');
};

const exportProductFilterDataToXML = async () => {
  try {
    const { data, headers } = await buildProductFilterPivotData();
    const xml = pivotDataToXml(data, headers);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `exported_product_filters_pivot_${timestamp}.xml`);
    fs.writeFileSync(filePath, xml, 'utf8');

    console.log(chalk.green(`Product filters (pivot) exported to ${filePath}`));
    manageExportedFiles();

    return xml;
  } catch (err) {
    console.error(chalk.red('Error exporting product_filters (pivot) to XML:'), err);
    throw err;
  }
};

module.exports = exportProductFilterDataToXML;
module.exports.buildProductFilterPivotData = buildProductFilterPivotData;
module.exports.pivotDataToXml = pivotDataToXml;
module.exports.headerToXmlTag = headerToXmlTag;
