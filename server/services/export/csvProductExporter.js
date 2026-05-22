const chalk = require('chalk');
const fs = require('fs');
const pool = require('../../config/dbConfig');
const manageExportedFiles = require('./manageExportedFiles');

const PRODUCT_FIELDS = [
  'id',
  'product_code',
  'product_name',
  'product_link',
  'product_img_link',
  'product_price',
  'most_popular',
  'category_ids',
];

const escapeXml = (value) => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const rowsToXml = (rows) => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<products>'];

  for (const row of rows) {
    lines.push('  <product>');
    for (const field of PRODUCT_FIELDS) {
      lines.push(`    <${field}>${escapeXml(row[field])}</${field}>`);
    }
    lines.push('  </product>');
  }

  lines.push('</products>');
  return lines.join('\n');
};

const fetchProductExportRows = async () => {
  const result = await pool.query(`
    SELECT
      p.id,
      p.product_code,
      p.product_name,
      p.product_link,
      p.product_img_link,
      p.product_price,
      p.most_popular,
      COALESCE(STRING_AGG(pc.category_id::text, ',' ORDER BY pc.category_id), '') AS category_ids
    FROM products p
    LEFT JOIN product_categories pc ON p.id = pc.product_id
    GROUP BY
      p.id,
      p.product_code,
      p.product_name,
      p.product_link,
      p.product_img_link,
      p.product_price,
      p.most_popular
    ORDER BY p.product_code, p.id;
  `);

  return result.rows;
};

const exportProductDataToXML = async () => {
  try {
    const data = await fetchProductExportRows();
    const xml = rowsToXml(data);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const directoryPath = `${__dirname}/data`;

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const filePath = `${directoryPath}/exported_product_data_${timestamp}.xml`;
    fs.writeFileSync(filePath, xml, 'utf8');

    console.log(chalk.green(`Data successfully exported to ${filePath}`));
    manageExportedFiles();
    return xml;
  } catch (error) {
    console.error(chalk.red('Error exporting data to XML:'), error);
    throw error;
  }
};

module.exports = exportProductDataToXML;
