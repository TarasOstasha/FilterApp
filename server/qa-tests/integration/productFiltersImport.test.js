const { expect } = require('chai');
const {
  importAllProductFiltersInTransaction,
} = require('../../services/import/productFiltersCsvProcessor');
const {
  createMockPgPool,
  getFiltersForProductField,
} = require('../helpers/mockPgPool');

function buildFiltersByProduct(entries) {
  /** @type {Map<number, Map<number, { values: string[] }>>} */
  const filtersByProduct = new Map();

  for (const { product_id, filter_field_id, values } of entries) {
    if (!filtersByProduct.has(product_id)) {
      filtersByProduct.set(product_id, new Map());
    }
    filtersByProduct.get(product_id).set(filter_field_id, { values });
  }

  return filtersByProduct;
}

describe('product_filters.csv import — file-level transaction', function () {
  it('commits all products when the import succeeds', async function () {
    const { pool, state } = createMockPgPool([
      { product_id: 1, filter_field_id: 19, filter_value: 'Old-A' },
      { product_id: 2, filter_field_id: 19, filter_value: 'Old-B' },
    ]);

    const filtersByProduct = buildFiltersByProduct([
      { product_id: 1, filter_field_id: 19, values: ['Backlit'] },
      { product_id: 2, filter_field_id: 19, values: ['Non-Backlit'] },
    ]);

    const result = await importAllProductFiltersInTransaction(filtersByProduct, pool);

    expect(state.committed).to.equal(true);
    expect(state.rolledBack).to.equal(false);
    expect(result.successRows).to.have.lengthOf(2);
    expect(getFiltersForProductField(state.filters, 1, 19)).to.deep.equal(['Backlit']);
    expect(getFiltersForProductField(state.filters, 2, 19)).to.deep.equal(['Non-Backlit']);
  });

  it('rolls back all product changes when one product fails during DB import', async function () {
    const { pool, state } = createMockPgPool(
      [
        { product_id: 1, filter_field_id: 19, filter_value: 'Keep-1' },
        { product_id: 2, filter_field_id: 19, filter_value: 'Keep-2' },
      ],
      { failOnDeleteForProductId: 2 }
    );

    const filtersByProduct = buildFiltersByProduct([
      { product_id: 1, filter_field_id: 19, values: ['Updated-1'] },
      { product_id: 2, filter_field_id: 19, values: ['Updated-2'] },
    ]);

    let thrown;
    try {
      await importAllProductFiltersInTransaction(filtersByProduct, pool);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).to.exist;
    expect(thrown.importError).to.equal(true);
    expect(thrown.message).to.match(/rolled back/i);
    expect(state.rolledBack).to.equal(true);
    expect(state.committed).to.equal(false);
    expect(getFiltersForProductField(state.filters, 1, 19)).to.deep.equal(['Keep-1']);
    expect(getFiltersForProductField(state.filters, 2, 19)).to.deep.equal(['Keep-2']);
  });

  it('leaves filter fields that are not in the file headers untouched', async function () {
    const { pool, state } = createMockPgPool([
      { product_id: 1, filter_field_id: 2, filter_value: 'Backdrop' },
      { product_id: 1, filter_field_id: 19, filter_value: 'Old-Backlit' },
      { product_id: 1, filter_field_id: 12, filter_value: '10 x 10' },
    ]);

    const filtersByProduct = buildFiltersByProduct([
      { product_id: 1, filter_field_id: 19, values: ['Backlit'] },
    ]);

    await importAllProductFiltersInTransaction(filtersByProduct, pool);

    expect(getFiltersForProductField(state.filters, 1, 19)).to.deep.equal(['Backlit']);
    expect(getFiltersForProductField(state.filters, 1, 2)).to.deep.equal(['Backdrop']);
    expect(getFiltersForProductField(state.filters, 1, 12)).to.deep.equal(['10 x 10']);
  });
});
