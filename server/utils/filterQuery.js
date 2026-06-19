/** Query keys that are pagination/sort/category, not product filters. */
const META_QUERY_KEYS = new Set(['limit', 'offset', 'sortBy', 'catId']);

/** Strip meta keys; return only filter field entries from req.query. */
function extractFiltersFromQuery(query) {
  const filters = {};
  for (const [key, raw] of Object.entries(query || {})) {
    if (META_QUERY_KEYS.has(key)) continue;
    if (raw == null || raw === '') continue;
    filters[key] = raw;
  }
  return filters;
}

/**
 * Parse checkbox filter values from req.query without splitting on commas.
 * - "Banner Stand,Retractable" => ["Banner Stand,Retractable"]
 * - ["Banner Stand", "Retractable"] => ["Banner Stand", "Retractable"]
 */
function parseCheckboxFilterValues(rawValue) {
  if (rawValue == null || rawValue === '') return [];
  if (Array.isArray(rawValue)) {
    return rawValue.map((v) => String(v).trim()).filter(Boolean);
  }
  const trimmed = String(rawValue).trim();
  return trimmed ? [trimmed] : [];
}

/** One JOIN per selected checkbox value — product must match every value (AND). */
function singleCheckboxFilterJoinSql(alias, fieldId, replacementKey) {
  return `
    JOIN product_filters ${alias}
      ON ${alias}.product_id = p.id
     AND ${alias}.filter_field_id = ${fieldId}
     AND ${alias}.filter_value = :${replacementKey}
  `;
}

/** Append one JOIN per value; returns updated joinClauses and next join index. */
function appendCheckboxFilterJoins(joinClauses, replacements, fieldId, values, joinIndex) {
  let clauses = joinClauses;
  let idx = joinIndex;
  for (const val of values) {
    const repKey = `checkVal${idx}`;
    replacements[repKey] = val;
    clauses += singleCheckboxFilterJoinSql(`pf_check${idx}`, fieldId, repKey);
    idx += 1;
  }
  return { joinClauses: clauses, joinIndex: idx };
}

/**
 * Parse "Product Price" query value into numeric min/max for SQL BETWEEN.
 * - "min,max" — both bounds
 * - "min" only — min and max both set to min (avoids missing :maxPrice)
 * - ",max" / "min," — empty segment treated as 0
 * @returns {{ minPrice: number, maxPrice: number } | null}
 */
function parseProductPriceRange(rawValue) {
  if (rawValue == null || rawValue === '') return null;

  const segments = String(rawValue).split(',');
  const parseSeg = (s) => {
    const trimmed = String(s ?? '').trim();
    if (trimmed === '') return 0;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : 0;
  };

  if (segments.length === 1) {
    const v = parseSeg(segments[0]);
    return { minPrice: v, maxPrice: v };
  }

  return {
    minPrice: parseSeg(segments[0]),
    maxPrice: parseSeg(segments[1]),
  };
}

/** Fail fast when SQL placeholders lack bound values (Sequelize throws opaque errors otherwise). */
function assertSqlReplacements(sql, replacements) {
  const names = new Set();
  // Exclude PostgreSQL casts (::numeric) — only match bind params like :minPrice
  const re = /(?<![:\w]):([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = re.exec(sql)) !== null) {
    names.add(match[1]);
  }
  for (const name of names) {
    if (!Object.prototype.hasOwnProperty.call(replacements, name) || replacements[name] === undefined) {
      throw new Error(`SQL references :${name} but replacements.${name} is missing`);
    }
  }
}

/** Distinct checkbox option values — filter_value is stored as a single exact string. */
const DISTINCT_FILTER_VALUE_SQL = `
  SELECT DISTINCT TRIM(pf.filter_value) AS val
  FROM product_filters pf
  JOIN base_products bp ON bp.id = pf.product_id
  WHERE pf.filter_field_id = :fieldId
    AND TRIM(pf.filter_value) <> ''
  ORDER BY val;
`;

/**
 * Build JOIN/WHERE fragments for active filters.
 * @param {object} opts
 * @param {Record<string, unknown>} opts.filters - field name -> raw query value
 * @param {Array<{id:number, field_name:string, field_type:string}>} opts.allFilterFields
 * @param {Record<string, number>} opts.fieldIdMap
 * @param {string} [opts.excludeFieldName] - omit this field from joins (legacy; prefer applying all filters for facet scope)
 */
function buildFilterJoins({ filters, allFilterFields, fieldIdMap, excludeFieldName }) {
  let joinClauses = '';
  let whereClauses = '';
  const replacements = {};
  let joinIndex = 0;

  for (const [fieldName, rawValue] of Object.entries(filters)) {
    if (fieldName === excludeFieldName) continue;

    if (fieldName === 'Product Price') {
      const parsed = parseProductPriceRange(rawValue);
      if (!parsed) continue;

      whereClauses += `
        AND p.product_price BETWEEN :minPrice AND :maxPrice
      `;
      replacements.minPrice = parsed.minPrice;
      replacements.maxPrice = parsed.maxPrice;
      continue;
    }

    if (!fieldIdMap[fieldName]) continue;
    const fieldId = fieldIdMap[fieldName];
    const fieldDef = allFilterFields.find((f) => f.field_name === fieldName);
    if (!fieldDef) continue;

    if (fieldDef.field_type === 'checkbox') {
      const values = parseCheckboxFilterValues(rawValue);
      if (!values.length) continue;

      const appended = appendCheckboxFilterJoins(
        joinClauses,
        replacements,
        fieldId,
        values,
        joinIndex
      );
      joinClauses = appended.joinClauses;
      joinIndex = appended.joinIndex;
    } else if (fieldDef.field_type === 'range') {
      const [min, max] = String(rawValue)
        .split(',')
        .map((v) => parseFloat(v) || 0);
      const alias = `pf_range${joinIndex}`;

      joinClauses += `
        JOIN product_filters ${alias}
          ON ${alias}.product_id = p.id
         AND ${alias}.filter_field_id = ${fieldId}
      `;

      whereClauses += `
        AND CAST(regexp_replace(${alias}.filter_value, '[^0-9\\.]', '', 'g') AS FLOAT)
            BETWEEN :min${joinIndex} AND :max${joinIndex}
      `;

      replacements[`min${joinIndex}`] = min;
      replacements[`max${joinIndex}`] = max;
      joinIndex++;
    }
  }

  return { joinClauses, whereClauses, replacements, joinIndex };
}

module.exports = {
  META_QUERY_KEYS,
  extractFiltersFromQuery,
  parseCheckboxFilterValues,
  parseProductPriceRange,
  assertSqlReplacements,
  singleCheckboxFilterJoinSql,
  appendCheckboxFilterJoins,
  DISTINCT_FILTER_VALUE_SQL,
  buildFilterJoins,
};
