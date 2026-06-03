const path = require('path');
const XLSX = require('xlsx');

/** Checkbox fields: comma-split atomic tokens (matches productFiltersCsvProcessor). */
const CHECKBOX_FIELDS = [
  'Product_Type',
  'Backlit',
  'Booth_Size',
  'Print_Type',
  'Product_Details',
  'Frame_Hardware',
  'Display_Shape',
  'Other_Accessories',
  'Hanging_Sign_Shapes',
  'Turntable_Type',
  'Motor_Capacity',
  'Flooring_Type',
  'Print_Facility',
  'Features',
  'Outdoor_Type',
  'Product_Line',
];

const RANGE_AND_PRICE_FIELDS = ['Display_Width', 'Display_Height', 'Product_Price'];

/** Columns loaded from Excel and reported in load summary. */
const VERIFY_FIELDS = [...CHECKBOX_FIELDS, ...RANGE_AND_PRICE_FIELDS];

/** Header cell text (row 1) → canonical field. */
const EXCEL_COLUMN_ALIASES = {
  Product_Type: 'Product_Type',
  product_type: 'Product_Type',
  'Product Type': 'Product_Type',
  Backlit: 'Backlit',
  backlit: 'Backlit',
  Booth_Size: 'Booth_Size',
  booth_size: 'Booth_Size',
  'Booth Size': 'Booth_Size',
  Print_Type: 'Print_Type',
  print_type: 'Print_Type',
  'Print Type': 'Print_Type',
  Product_Details: 'Product_Details',
  product_details: 'Product_Details',
  'Product Details': 'Product_Details',
  Frame_Hardware: 'Frame_Hardware',
  frame_hardware: 'Frame_Hardware',
  'Frame Hardware': 'Frame_Hardware',
  Display_Shape: 'Display_Shape',
  display_shape: 'Display_Shape',
  'Display Shape': 'Display_Shape',
  Other_Accessories: 'Other_Accessories',
  other_accessories: 'Other_Accessories',
  'Other / Accessories': 'Other_Accessories',
  'Other Accessories': 'Other_Accessories',
  Hanging_Sign_Shapes: 'Hanging_Sign_Shapes',
  hanging_sign_shapes: 'Hanging_Sign_Shapes',
  'Hanging Sign Shapes': 'Hanging_Sign_Shapes',
  Turntable_Type: 'Turntable_Type',
  turntable_type: 'Turntable_Type',
  'Turntable Type': 'Turntable_Type',
  Motor_Capacity: 'Motor_Capacity',
  motor_capacity: 'Motor_Capacity',
  'Motor Capacity': 'Motor_Capacity',
  Flooring_Type: 'Flooring_Type',
  flooring_type: 'Flooring_Type',
  'Flooring Type': 'Flooring_Type',
  Print_Facility: 'Print_Facility',
  print_facility: 'Print_Facility',
  'Print Facility': 'Print_Facility',
  Features: 'Features',
  features: 'Features',
  Outdoor_Type: 'Outdoor_Type',
  outdoor_type: 'Outdoor_Type',
  'Outdoor Type': 'Outdoor_Type',
  Product_Line: 'Product_Line',
  product_line: 'Product_Line',
  'Product Line': 'Product_Line',
  Display_Width: 'Display_Width',
  display_width: 'Display_Width',
  'Display Width': 'Display_Width',
  Display_Height: 'Display_Height',
  display_height: 'Display_Height',
  'Display Height': 'Display_Height',
  Product_Price: 'Product_Price',
  product_price: 'Product_Price',
  'Product Price': 'Product_Price',
  'price from xyz': 'Product_Price',
};

const PRODUCT_CODE_HEADERS = [
  'product_code',
  'Product_Code',
  'PRODUCT_CODE',
  'Product Code',
  'product code',
];

const DEFAULT_EXCEL_PATH = path.resolve(
  __dirname,
  '../../services/export/data/product_filters.xlsx'
);

const MIN_TRACKED_COLUMNS_FOR_FLAT_SHEET = 3;

/**
 * @returns {string}
 */
function resolveExcelPath() {
  const configured = process.env.QA_PRODUCTS_EXCEL_PATH?.trim();
  if (!configured) return DEFAULT_EXCEL_PATH;
  if (path.isAbsolute(configured)) return configured;
  return path.resolve(__dirname, '../..', configured);
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
function isEmptyValue(raw) {
  if (raw == null) return true;
  return String(raw).trim() === '';
}

/**
 * @param {unknown} raw
 * @param {string} field
 * @returns {string|number|null}
 */
function normalizeCellValue(raw, field) {
  if (isEmptyValue(raw)) return null;
  if (field === 'Product_Price') {
    const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : String(raw).trim();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return String(raw).trim();
}

/**
 * Split checkbox cell values the same way as CSV import (productFiltersCsvProcessor.js).
 * @param {unknown} raw
 * @returns {string[]}
 */
function splitCheckboxTokens(raw) {
  if (isEmptyValue(raw)) return [];
  return String(raw)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Attach per-field token arrays for checkbox columns (atomic DB/API values).
 * @param {object} product
 */
function attachCheckboxTokens(product) {
  for (const field of CHECKBOX_FIELDS) {
    const key = `${field}_tokens`;
    product[key] = splitCheckboxTokens(product[field]);
  }
  return product;
}

/**
 * @param {object} product
 * @param {string} field
 * @param {string} token
 */
function productHasCheckboxToken(product, field, token) {
  const tokens = product[`${field}_tokens`];
  if (!Array.isArray(tokens)) return false;
  const target = String(token).trim();
  return tokens.some((t) => t === target);
}

/**
 * @param {string[]} headerRow - Excel row 1 (first row in sheet)
 */
function analyzeHeaderRow(headerRow) {
  const headers = headerRow.map((c) => String(c ?? '').trim());
  /** @type {Record<string, number>} */
  const columnIndexByField = {};
  let productCodeIndex = -1;

  headers.forEach((header, index) => {
    if (!header) return;
    if (PRODUCT_CODE_HEADERS.includes(header)) productCodeIndex = index;
    const canonical = EXCEL_COLUMN_ALIASES[header];
    if (canonical && columnIndexByField[canonical] === undefined) {
      columnIndexByField[canonical] = index;
    }
  });

  const trackedCount = VERIFY_FIELDS.filter((f) => columnIndexByField[f] !== undefined).length;

  return { headers, columnIndexByField, productCodeIndex, trackedCount };
}

/**
 * @param {import('xlsx').WorkBook} workbook
 */
function pickDataSheet(workbook) {
  const configured = process.env.QA_PRODUCTS_EXCEL_SHEET?.trim();
  if (configured) {
    if (!workbook.Sheets[configured]) {
      throw new Error(
        `Sheet "${configured}" not found. Available: ${workbook.SheetNames.join(', ')}`
      );
    }
    return configured;
  }

  let bestName = null;
  let bestScore = -1;
  /** @type {string[]} */
  let bestHeaders = [];

  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
    if (!rows.length) continue;
    const analysis = analyzeHeaderRow(rows[0]);
    const score =
      analysis.trackedCount +
      (analysis.productCodeIndex >= 0 ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
      bestHeaders = analysis.headers.filter(Boolean);
    }
  }

  if (!bestName || bestScore < MIN_TRACKED_COLUMNS_FOR_FLAT_SHEET) {
    throw new Error(
      'No sheet with a standard header row was found. Expected row 1 to include columns such as ' +
        `product_code, Product_Type, Backlit, Booth_Size (found sheets: ${workbook.SheetNames.join(', ')}). ` +
        'Set QA_PRODUCTS_EXCEL_PATH to your flat workbook path.'
    );
  }

  const analysis = analyzeHeaderRow(
    XLSX.utils.sheet_to_json(workbook.Sheets[bestName], { header: 1, defval: '' })[0]
  );
  if (analysis.productCodeIndex < 0) {
    throw new Error(
      `Sheet "${bestName}" is missing a product_code header column. Headers: ${bestHeaders.join(', ')}`
    );
  }

  return bestName;
}

/**
 * Load Excel: row 1 = headers, row 2+ = data. No two-row headers, no name inference.
 * @param {string} [filePath]
 */
function loadExcelProducts(filePath = resolveExcelPath()) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = pickDataSheet(workbook);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  });

  if (rows.length < 2) {
    throw new Error(`Sheet "${sheetName}" must have a header row and at least one data row.`);
  }

  const { columnIndexByField, productCodeIndex, headers } = analyzeHeaderRow(rows[0]);
  const missingColumns = VERIFY_FIELDS.filter((f) => columnIndexByField[f] === undefined);

  const byCode = new Map();
  let totalRows = 0;

  for (const row of rows.slice(1)) {
    const productCode = String(row[productCodeIndex] ?? '').trim();
    if (!productCode || productCode === 'product_code') continue;

    totalRows += 1;

    if (!byCode.has(productCode)) {
      const product = { product_code: productCode, product_name: null };
      for (const field of VERIFY_FIELDS) product[field] = null;
      byCode.set(productCode, product);
    }

    const product = byCode.get(productCode);

    const nameCol = headers.indexOf('product_name');
    if (nameCol >= 0 && !isEmptyValue(row[nameCol])) {
      product.product_name = String(row[nameCol]).trim();
    }

    for (const field of VERIFY_FIELDS) {
      const colIndex = columnIndexByField[field];
      if (colIndex === undefined) continue;
      const value = normalizeCellValue(row[colIndex], field);
      if (value != null) product[field] = value;
    }
  }

  const products = [...byCode.values()].map(attachCheckboxTokens);

  return {
    filePath,
    sheetName,
    headers: headers.filter(Boolean),
    totalRows,
    totalProducts: products.length,
    columnIndexByField,
    missingColumns,
    products,
  };
}

/**
 * Unique raw cell strings (legacy / debugging).
 * @param {object[]} products
 */
function collectUniqueRawCellValues(products) {
  /** @type {Record<string, Set<string|number>>} */
  const sets = Object.fromEntries(VERIFY_FIELDS.map((f) => [f, new Set()]));

  for (const product of products) {
    for (const field of VERIFY_FIELDS) {
      const v = product[field];
      if (v == null || v === '') continue;
      sets[field].add(v);
    }
  }

  const out = {};
  for (const field of VERIFY_FIELDS) {
    out[field] = [...sets[field]].sort((a, b) => String(a).localeCompare(String(b)));
  }
  return out;
}

/**
 * Unique atomic tokens per field (matches import + API checkbox semantics).
 * @param {object[]} products
 * @param {string[]} [fields]
 */
function collectUniqueAtomicValues(products, fields = CHECKBOX_FIELDS) {
  /** @type {Record<string, Set<string>>} */
  const sets = Object.fromEntries(fields.map((f) => [f, new Set()]));

  for (const product of products) {
    for (const field of fields) {
      const tokens = product[`${field}_tokens`] || [];
      for (const token of tokens) sets[field].add(token);
    }
  }

  const out = {};
  for (const field of fields) {
    out[field] = [...sets[field]].sort((a, b) => a.localeCompare(b));
  }
  return out;
}

/** @deprecated Use collectUniqueAtomicValues for checkbox tests. */
function collectUniqueFilterValues(products) {
  return collectUniqueRawCellValues(products);
}

/**
 * @param {ReturnType<typeof loadExcelProducts>} loaded
 */
function buildLoadSummary(loaded) {
  const uniqueRawByField = collectUniqueRawCellValues(loaded.products);
  const uniqueAtomicByField = collectUniqueAtomicValues(loaded.products);
  return {
    filePath: loaded.filePath,
    sheetName: loaded.sheetName,
    headers: loaded.headers,
    totalRows: loaded.totalRows,
    totalProducts: loaded.totalProducts,
    missingColumns: loaded.missingColumns,
    uniqueByField: uniqueRawByField,
    uniqueRawByField,
    uniqueAtomicByField,
    uniqueCounts: Object.fromEntries(
      VERIFY_FIELDS.map((f) => [f, uniqueRawByField[f].length])
    ),
    uniqueAtomicCounts: Object.fromEntries(
      CHECKBOX_FIELDS.map((f) => [f, uniqueAtomicByField[f].length])
    ),
  };
}

/**
 * @param {ReturnType<typeof buildLoadSummary>} summary
 */
function formatLoadSummaryText(summary) {
  const lines = [
    '=== Excel load summary ===',
    `File: ${summary.filePath}`,
    `Sheet: ${summary.sheetName}`,
    `Header columns: ${summary.headers.join(', ')}`,
    `Total rows (with product_code): ${summary.totalRows}`,
    `Total products (unique product_code): ${summary.totalProducts}`,
  ];

  if (summary.missingColumns?.length) {
    lines.push(`Missing columns (not in header row): ${summary.missingColumns.join(', ')}`);
  }

  lines.push('Unique raw cell values per field:');
  for (const field of VERIFY_FIELDS) {
    lines.push(`  ${field}: ${summary.uniqueCounts[field]}`);
  }

  lines.push('Unique atomic tokens (checkbox fields, comma-split):');
  for (const field of CHECKBOX_FIELDS) {
    lines.push(`  ${field}: ${summary.uniqueAtomicCounts[field]}`);
  }

  return lines.join('\n');
}

module.exports = {
  VERIFY_FIELDS,
  CHECKBOX_FIELDS,
  RANGE_AND_PRICE_FIELDS,
  DEFAULT_EXCEL_PATH,
  resolveExcelPath,
  loadExcelProducts,
  splitCheckboxTokens,
  attachCheckboxTokens,
  productHasCheckboxToken,
  collectUniqueRawCellValues,
  collectUniqueAtomicValues,
  collectUniqueFilterValues,
  buildLoadSummary,
  formatLoadSummaryText,
  isEmptyValue,
  normalizeCellValue,
};
