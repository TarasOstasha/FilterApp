// const chalk = require('chalk');
// const fs = require('fs');
// const { Parser } = require('json2csv');
// const { sequelize } = require('../../models');
// const manageExportedFiles = require('./manageExportedFiles');

// const exportProductFilterDataToCSV = async () => {
//   try {
//     // 1) Pull enriched rows from the DB
//     const [rows] = await sequelize.query(`
//       SELECT 
//         pf.product_id,
//         p.product_code,
//         pf.filter_field_id,
//         ff.field_name   AS filter_field_name,
//         pf.filter_value
//       FROM product_filters pf
//       JOIN products       p  ON pf.product_id       = p.id
//       JOIN filter_fields  ff ON pf.filter_field_id  = ff.id
//       ORDER BY pf.product_id, pf.filter_field_id;
//     `);

//     // 2) Convert to CSV
//     const fields = [
//       'product_id',
//       'product_code',
//       'filter_field_id',
//       'filter_field_name',
//       'filter_value',
//     ];
//     const csv = new Parser({ fields }).parse(rows);

//     // 3) Write file
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const dir = `${__dirname}/data`;
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

//     const filePath = `${dir}/exported_product_filters_${timestamp}.csv`;
//     fs.writeFileSync(filePath, csv);

//     console.log(chalk.green(`Product filters exported to ${filePath}`));
//     manageExportedFiles();

//     return csv;
//   } catch (err) {
//     console.error(chalk.red('Error exporting product_filters:'), err);
//     throw err;
//   }
// };

// module.exports = exportProductFilterDataToCSV;

/////////////////////////////////

// server/utils/csvProductFilterExporter.js


const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { sequelize } = require('../../models');
const manageExportedFiles = require('./manageExportedFiles');


function normalizePriceValues(raw) {
  if (!raw) return [];
  const s = String(raw).trim();

  // Handle clean lists like "0,500" or "1000,5000"
  if (/^\d+(,\d+)+$/.test(s)) {
    return s.split(',').map(v => v.trim()).filter(Boolean);
  }

  // Handle "10,005,000" → ["1000","5000"]
  if (/^\d{2},\d{3},\d{3}$/.test(s)) {
    const digits = s.replace(/,/g, ''); // "10005000"
    return [digits.slice(0, 4), digits.slice(4)];
  }

  // Handle "1,000,500" → ["1000","500"]
  if (/^\d{1},\d{3},\d{3}$/.test(s)) {
    const digits = s.replace(/,/g, ''); // "1000500"
    // slice last 3 digits
    return [digits.slice(0, digits.length - 3), digits.slice(-3)];
  }

  // Handle normal thousands formatting like "1,000" → ["1000"]
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    return [s.replace(/,/g, '')];
  }

  // Fallback — split by comma or whitespace
  return s
    .split(/[,|\s]+/)
    .map(v => v.trim().replace(/[^\d.]/g, ''))
    .filter(Boolean);
}


function uniq(arr) {
  return arr.filter((v, i) => arr.indexOf(v) === i);
}

const exportProductFilterDataToCSV = async () => {
  try {
    // 1) Pull rows (product x field x value)
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

    // 2) Pivot: product -> { product_id, product_code, "<fieldId>": "v1,v2" }
    const fieldMeta = new Map(); // id -> name
    const byProduct = new Map(); // product_id -> row

    for (const r of rows) {
      const fieldId = r.filter_field_id;
      const fieldName = r.filter_field_name;

      if (!fieldMeta.has(fieldId)) fieldMeta.set(fieldId, fieldName);

      if (!byProduct.has(r.product_id)) {
        byProduct.set(r.product_id, {
          product_id: r.product_id,
          product_code: r.product_code,
        });
      }

      const rowObj = byProduct.get(r.product_id);
      const colKey = String(fieldId);
      if (rowObj[colKey] === undefined) rowObj[colKey] = '';

      // Field-specific handling
      if (fieldId === 1) {
        const normList = normalizePriceValues(r.filter_value);
        if (normList.length) {
          const existing = rowObj[colKey] ? rowObj[colKey].split(',') : [];
          for (const v of normList) {
            if (!existing.includes(v)) existing.push(v);
          }
          rowObj[colKey] = existing.join(',');
        }
      } else {
        const v = (r.filter_value ?? '').toString().trim();
        if (v) {
          const existing = rowObj[colKey] ? rowObj[colKey].split(',') : [];
          if (!existing.includes(v)) {
            existing.push(v);
            rowObj[colKey] = existing.join(',');
          }
        }
      }
    }

    // 3) Ordered field ids
    const sortedFieldIds = Array.from(fieldMeta.keys()).sort((a, b) => a - b);

    // 4) Build headers: product cols + for each field (ID col + Name col)
    const headers = ['product_id', 'product_code'];
    for (const id of sortedFieldIds) {
      headers.push(`filter_field_id_${id}`);              // numeric id
      headers.push(fieldMeta.get(id) || `field_${id}`);   // values
    }

    // 5) Assemble data rows aligned to headers
    const data = Array.from(byProduct.values()).map((row) => {
      const out = {
        product_id: row.product_id,
        product_code: row.product_code,
      };
      for (const id of sortedFieldIds) {
        const key = String(id);
        out[`filter_field_id_${id}`] = id;
        out[fieldMeta.get(id) || `field_${id}`] = row[key] || '';
      }
      return out;
    });

    // 6) CSV
    const parser = new Parser({ fields: headers, withBOM: true });
    const csv = parser.parse(data);

    // 7) Write file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `exported_product_filters_pivot_${timestamp}.csv`);
    fs.writeFileSync(filePath, csv);

    console.log(chalk.green(`Product filters (pivot) exported to ${filePath}`));
    manageExportedFiles();

    return csv;
  } catch (err) {
    console.error(chalk.red('Error exporting product_filters (pivot):'), err);
    throw err;
  }
};

module.exports = exportProductFilterDataToCSV;
