const { expect } = require('chai');
const {
  importAllProductFiltersInTransaction,
  resolveProductIdentity,
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

function mockProductIdByCode(entries) {
  return new Map(
    entries.map(({ product_code, id }) => [
      String(product_code).trim().toUpperCase(),
      { id, product_code: String(product_code).trim() },
    ])
  );
}

describe('product_filters.csv import — product identity resolution', function () {
  const productIdByCode = mockProductIdByCode([
    { product_code: 'MK3200', id: 28 },
    { product_code: 'AB10103', id: 22292 },
  ]);

  it('resolves product_id from product_code when product_id is omitted', function () {
    const result = resolveProductIdentity(
      { product_code: 'MK3200', filter_field_id_1: '1', 'Product Price': '10000' },
      productIdByCode
    );

    expect(result).to.deep.equal({ product_id: 28, product_code: 'MK3200' });
  });

  it('accepts product_id when product_code is omitted', function () {
    const result = resolveProductIdentity({ product_id: '28' }, productIdByCode);

    expect(result).to.deep.equal({ product_id: 28, product_code: '' });
  });

  it('accepts product_id and product_code when they match', function () {
    const result = resolveProductIdentity(
      { product_id: '28', product_code: 'MK3200' },
      productIdByCode
    );

    expect(result).to.deep.equal({ product_id: 28, product_code: 'MK3200' });
  });

  it('rejects mismatched product_id and product_code', function () {
    const result = resolveProductIdentity(
      { product_id: '99', product_code: 'MK3200' },
      productIdByCode
    );

    expect(result.product_id).to.equal(null);
    expect(result.reason).to.match(/does not match/i);
  });

  it('rejects unknown product_code', function () {
    const result = resolveProductIdentity({ product_code: 'NOPE' }, productIdByCode);

    expect(result.product_id).to.equal(null);
    expect(result.reason).to.match(/not found/i);
  });

  it('rejects rows with neither product_code nor product_id', function () {
    const result = resolveProductIdentity({ filter_field_id_1: '1' }, productIdByCode);

    expect(result.product_id).to.equal(null);
    expect(result.reason).to.match(/Missing product_code/i);
  });
});

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
