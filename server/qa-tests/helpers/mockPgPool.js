/**
 * In-memory mock pg Pool for product_filters import tests.
 * Simulates BEGIN / COMMIT / ROLLBACK with snapshot rollback semantics.
 */

function cloneFilters(filters) {
  return filters.map((row) => ({ ...row }));
}

/**
 * @param {Array<{ product_id: number, filter_field_id: number, filter_value: string }>} initialFilters
 * @param {{ failOnDeleteForProductId?: number | null }} [options]
 */
function createMockPgPool(initialFilters = [], options = {}) {
  const state = {
    filters: cloneFilters(initialFilters),
    snapshot: null,
    failOnDeleteForProductId: options.failOnDeleteForProductId ?? null,
    queries: [],
    committed: false,
    rolledBack: false,
  };

  const client = {
    async query(sql, params = []) {
      state.queries.push({ sql, params });
      const normalized = sql.trim().toUpperCase();

      if (normalized === 'BEGIN') {
        state.snapshot = cloneFilters(state.filters);
        state.committed = false;
        state.rolledBack = false;
        return { rows: [], rowCount: 0 };
      }

      if (normalized === 'COMMIT') {
        state.snapshot = null;
        state.committed = true;
        return { rows: [], rowCount: 0 };
      }

      if (normalized === 'ROLLBACK') {
        if (state.snapshot) {
          state.filters = cloneFilters(state.snapshot);
        }
        state.snapshot = null;
        state.rolledBack = true;
        state.committed = false;
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes('DELETE FROM product_filters')) {
        const [product_id, filter_field_id] = params;
        if (state.failOnDeleteForProductId === product_id) {
          throw new Error(`Simulated DB failure for product ${product_id}`);
        }
        state.filters = state.filters.filter(
          (row) =>
            !(row.product_id === product_id && row.filter_field_id === filter_field_id)
        );
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes('INSERT INTO product_filters')) {
        for (let i = 0; i < params.length; i += 3) {
          state.filters.push({
            product_id: params[i],
            filter_field_id: params[i + 1],
            filter_value: params[i + 2],
          });
        }
        return { rows: [], rowCount: params.length / 3 };
      }

      throw new Error(`Unhandled mock SQL: ${sql}`);
    },
    release() {},
  };

  const pool = {
    connect: async () => client,
  };

  return { pool, state, client };
}

function getFiltersForProductField(filters, product_id, filter_field_id) {
  return filters
    .filter((row) => row.product_id === product_id && row.filter_field_id === filter_field_id)
    .map((row) => row.filter_value)
    .sort();
}

module.exports = {
  createMockPgPool,
  getFiltersForProductField,
};
