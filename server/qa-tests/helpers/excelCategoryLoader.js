const path = require('path');
const XLSX = require('xlsx');
const { splitCheckboxTokens, isEmptyValue } = require('./excelProductLoader');

const DEFAULT_CATEGORY_EXCEL_PATH = path.resolve(
  __dirname,
  '../fixtures/products_check_category.xlsx'
);

const PRODUCT_CODE_HEADERS = [
  'product_code',
  'Product_Code',
  'PRODUCT_CODE',
  'Product Code',
  'product code',
];

const CATEGORY_IDS_HEADERS = ['category_ids', 'Category_Ids', 'category_ids', 'Category IDs'];

/**
 * @returns {string}
 */
function resolveCategoryExcelPath() {
  const configured = process.env.QA_CATEGORY_EXCEL_PATH?.trim();
  if (!configured) return DEFAULT_CATEGORY_EXCEL_PATH;
  if (path.isAbsolute(configured)) return configured;
  return path.resolve(__dirname, '../..', configured);
}

/**
 * @param {string[]} headerRow
 */
function analyzeCategoryHeaderRow(headerRow) {
  const headers = headerRow.map((c) => String(c ?? '').trim());
  let productCodeIndex = -1;
  let categoryIdsIndex = -1;

  headers.forEach((header, index) => {
    if (!header) return;
    if (PRODUCT_CODE_HEADERS.includes(header)) productCodeIndex = index;
    if (CATEGORY_IDS_HEADERS.includes(header) || header === 'category_ids') {
      categoryIdsIndex = index;
    }
  });

  return { headers, productCodeIndex, categoryIdsIndex };
}

/**
 * @param {object} product
 */
function attachCategoryTokens(product) {
  product.category_id_tokens = splitCheckboxTokens(product.category_ids);
  return product;
}

/**
 * Load category fixture: row 1 = headers (product_code, category_ids), row 2+ = data.
 * category_ids uses comma-separated IDs (same semantics as CSV import).
 * @param {string} [filePath]
 */
function loadCategoryProducts(filePath = resolveCategoryExcelPath()) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = process.env.QA_CATEGORY_EXCEL_SHEET?.trim() || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(
      `Sheet "${sheetName}" not found in ${filePath}. Available: ${workbook.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) {
    throw new Error(`Sheet "${sheetName}" must have a header row and at least one data row.`);
  }

  const { headers, productCodeIndex, categoryIdsIndex } = analyzeCategoryHeaderRow(rows[0]);
  if (productCodeIndex < 0) {
    throw new Error(`Missing product_code column. Headers: ${headers.join(', ')}`);
  }
  if (categoryIdsIndex < 0) {
    throw new Error(`Missing category_ids column. Headers: ${headers.join(', ')}`);
  }

  const byCode = new Map();
  let totalRows = 0;

  for (const row of rows.slice(1)) {
    const productCode = String(row[productCodeIndex] ?? '').trim();
    if (!productCode || productCode === 'product_code') continue;

    totalRows += 1;
    const rawCategoryIds = row[categoryIdsIndex];
    const categoryIds = isEmptyValue(rawCategoryIds) ? '' : String(rawCategoryIds).trim();

    if (!byCode.has(productCode)) {
      byCode.set(productCode, {
        product_code: productCode,
        category_ids: categoryIds,
      });
      continue;
    }

    const existing = byCode.get(productCode);
    if (!existing.category_ids && categoryIds) {
      existing.category_ids = categoryIds;
    }
  }

  const products = [...byCode.values()].map(attachCategoryTokens);

  return {
    filePath,
    sheetName,
    headers: headers.filter(Boolean),
    totalRows,
    totalProducts: products.length,
    products,
  };
}

/**
 * @param {object} product
 * @param {string|number} categoryId
 */
function productHasCategoryId(product, categoryId) {
  const target = String(categoryId).trim();
  const tokens = product.category_id_tokens;
  if (!Array.isArray(tokens)) return false;
  return tokens.some((t) => t === target);
}

/**
 * Unique category_id tokens across all products (sorted numerically when possible).
 * @param {object[]} products
 */
function collectUniqueCategoryIds(products) {
  const set = new Set();
  for (const product of products) {
    for (const id of product.category_id_tokens || []) set.add(id);
  }

  return [...set].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

/**
 * @param {ReturnType<typeof loadCategoryProducts>} loaded
 */
function buildCategoryLoadSummary(loaded) {
  const uniqueCategoryIds = collectUniqueCategoryIds(loaded.products);
  const countsByCategory = Object.fromEntries(
    uniqueCategoryIds.map((id) => [
      id,
      loaded.products.filter((p) => productHasCategoryId(p, id)).length,
    ])
  );

  return {
    filePath: loaded.filePath,
    sheetName: loaded.sheetName,
    headers: loaded.headers,
    totalRows: loaded.totalRows,
    totalProducts: loaded.totalProducts,
    uniqueCategoryIds,
    countsByCategory,
  };
}

/**
 * @param {ReturnType<typeof buildCategoryLoadSummary>} summary
 */
function formatCategoryLoadSummaryText(summary) {
  const lines = [
    '=== Category Excel load summary ===',
    `File: ${summary.filePath}`,
    `Sheet: ${summary.sheetName}`,
    `Header columns: ${summary.headers.join(', ')}`,
    `Total rows (with product_code): ${summary.totalRows}`,
    `Total products (unique product_code): ${summary.totalProducts}`,
    `Unique category_ids: ${summary.uniqueCategoryIds.length}`,
  ];

  const preview = summary.uniqueCategoryIds.slice(0, 20);
  if (preview.length) {
    lines.push(
      `Sample categories: ${preview.map((id) => `${id}(${summary.countsByCategory[id]})`).join(', ')}`
    );
  }

  return lines.join('\n');
}

/**
 * Categories to run in tests (env overrides for focused runs).
 * @param {string[]} allCategoryIds
 */
function selectCategoryIdsForTest(allCategoryIds) {
  const explicit = process.env.QA_CATEGORY_IDS_TO_TEST?.trim();
  if (explicit) {
    const requested = explicit
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const available = new Set(allCategoryIds);
    return requested.filter((id) => available.has(id));
  }

  const capRaw = process.env.QA_MAX_CATEGORIES_TO_TEST?.trim();
  if (capRaw) {
    const cap = parseInt(capRaw, 10);
    if (Number.isFinite(cap) && cap > 0) return allCategoryIds.slice(0, cap);
  }

  return allCategoryIds;
}

/**
 * Categories for combined category+filter tests (defaults to top N by product count).
 * @param {string[]} allCategoryIds
 * @param {Record<string, number>} countsByCategory
 */
function selectCategoryIdsForCombinedFilterTest(allCategoryIds, countsByCategory) {
  const explicit = process.env.QA_CATEGORY_IDS_TO_TEST?.trim();
  if (explicit) {
    const requested = explicit
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const available = new Set(allCategoryIds);
    return requested.filter((id) => available.has(id));
  }

  const sorted = [...allCategoryIds].sort(
    (a, b) => (countsByCategory[b] || 0) - (countsByCategory[a] || 0)
  );

  const capRaw = process.env.QA_MAX_CATEGORIES_TO_TEST?.trim();
  const defaultCap = 5;
  const cap = capRaw ? parseInt(capRaw, 10) : defaultCap;
  if (Number.isFinite(cap) && cap > 0) return sorted.slice(0, cap);

  return sorted;
}

module.exports = {
  DEFAULT_CATEGORY_EXCEL_PATH,
  resolveCategoryExcelPath,
  loadCategoryProducts,
  productHasCategoryId,
  collectUniqueCategoryIds,
  buildCategoryLoadSummary,
  formatCategoryLoadSummaryText,
  selectCategoryIdsForTest,
  selectCategoryIdsForCombinedFilterTest,
};
