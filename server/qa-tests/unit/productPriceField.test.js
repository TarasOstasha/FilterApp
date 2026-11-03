const { expect } = require('chai');
const {
  PRODUCT_PRICE_FIELD_NAME,
  isProductPriceFieldName,
  filterFieldsForProductFilterIo,
} = require('../../utils/productPriceField');
const { buildProductPriceSidebarField } = require('../../controllers/filterFieldController');
const { collectFilterValuesForRow } = require('../../services/import/productFiltersCsvProcessor');
const { pivotDataToXml, headerToXmlTag } = require('../../services/export/csvProductFilterExporter');

describe('productPriceField helpers', function () {
  it('recognizes Product Price by name', function () {
    expect(isProductPriceFieldName(PRODUCT_PRICE_FIELD_NAME)).to.equal(true);
    expect(isProductPriceFieldName(' Product Price ')).to.equal(true);
    expect(isProductPriceFieldName('Product Type')).to.equal(false);
    expect(isProductPriceFieldName('')).to.equal(false);
  });

  it('excludes Product Price from product_filters import/export field lists', function () {
    const fields = [
      { id: 1, field_name: 'Product Price' },
      { id: 2, field_name: 'Product Type' },
      { id: 4, field_name: 'Display Width' },
    ];
    const filtered = filterFieldsForProductFilterIo(fields);
    expect(filtered.map((f) => f.id)).to.deep.equal([2, 4]);
    expect(filtered.every((f) => f.field_name !== 'Product Price')).to.equal(true);
  });
});

describe('getAllFilterFields — Product Price sidebar entry', function () {
  it('builds allowed_values from filter_fields breakpoints, not product_filters', function () {
    const field = {
      id: 1,
      field_name: 'Product Price',
      field_type: 'range',
      sort_order: 0,
      allowed_values: '0, 50, 100, 500, 1000',
    };

    const result = buildProductPriceSidebarField(field);
    expect(result).to.deep.equal({
      id: 1,
      field_name: 'Product Price',
      field_type: 'range',
      sort_order: 0,
      allowed_values: ['0', '50', '100', '500', '1000'],
    });
  });

  it('returns null when breakpoints are missing', function () {
    expect(
      buildProductPriceSidebarField({
        id: 1,
        field_name: 'Product Price',
        field_type: 'range',
        sort_order: 0,
        allowed_values: '',
      })
    ).to.equal(null);
  });
});

describe('product_filters.csv import — skip Product Price assignments', function () {
  const filterFieldMap = new Map([
    [
      1,
      {
        field_name: 'Product Price',
        allowed_values_set: new Set(['0', '50', '100', '500', '1000']),
        field_type: 'range',
      },
    ],
    [
      2,
      {
        field_name: 'Product Type',
        allowed_values_set: new Set(['backdrop', 'trade show booth']),
        field_type: 'checkbox',
      },
    ],
    [
      19,
      {
        field_name: 'Backlit',
        allowed_values_set: new Set(['backlit', 'non-backlit']),
        field_type: 'checkbox',
      },
    ],
  ]);

  it('ignores Product Price columns and still imports other fields', function () {
    const row = {
      filter_field_id_1: '1',
      'Product Price': '10000',
      filter_field_id_2: '2',
      'Product Type': 'Backdrop',
      filter_field_id_19: '19',
      Backlit: 'Backlit',
    };
    const idToValueCol = [
      { idCol: 'filter_field_id_1', valueCol: 'Product Price', idNumber: 1 },
      { idCol: 'filter_field_id_2', valueCol: 'Product Type', idNumber: 2 },
      { idCol: 'filter_field_id_19', valueCol: 'Backlit', idNumber: 19 },
    ];

    const { touchedFields, validationErrors, rowErrors } = collectFilterValuesForRow(
      row,
      28,
      idToValueCol,
      filterFieldMap
    );

    expect(validationErrors).to.have.lengthOf(0);
    expect(rowErrors).to.have.lengthOf(0);
    expect(touchedFields.has(1)).to.equal(false);
    expect(touchedFields.get(2)).to.deep.equal({ values: ['Backdrop'] });
    expect(touchedFields.get(19)).to.deep.equal({ values: ['Backlit'] });
  });

  it('does not clear Product Price when the CSV column is blank', function () {
    const row = {
      filter_field_id_1: '1',
      'Product Price': '',
      filter_field_id_19: '19',
      Backlit: 'Non-Backlit',
    };
    const idToValueCol = [
      { idCol: 'filter_field_id_1', valueCol: 'Product Price', idNumber: 1 },
      { idCol: 'filter_field_id_19', valueCol: 'Backlit', idNumber: 19 },
    ];

    const { touchedFields } = collectFilterValuesForRow(row, 28, idToValueCol, filterFieldMap);

    // Blank Product Price must not enter touchedFields (would DELETE existing rows).
    expect(touchedFields.has(1)).to.equal(false);
    expect(touchedFields.get(19)).to.deep.equal({ values: ['Non-Backlit'] });
  });
});

describe('product_filters export — omit Product Price', function () {
  it('omits Product Price headers from pivot XML', function () {
    const headers = [
      'product_id',
      'product_code',
      'filter_field_id_2',
      'Product Type',
      'filter_field_id_19',
      'Backlit',
    ];
    const data = [
      {
        product_id: 28,
        product_code: 'MK3200',
        filter_field_id_2: 2,
        'Product Type': 'Backdrop',
        filter_field_id_19: 19,
        Backlit: 'Backlit',
      },
    ];

    const xml = pivotDataToXml(data, headers);
    expect(xml).to.include('<Product_Type>Backdrop</Product_Type>');
    expect(xml).to.include('<Backlit>Backlit</Backlit>');
    expect(xml).to.not.include('Product_Price');
    expect(xml).to.not.match(/<filter_field_id_1>/);
    expect(headerToXmlTag('Product Price')).to.equal('Product_Price');
  });

  it('filterFieldsForProductFilterIo drives export column selection', function () {
    const exportFields = filterFieldsForProductFilterIo([
      { id: 1, field_name: 'Product Price' },
      { id: 2, field_name: 'Product Type' },
    ]);
    const headers = ['product_id', 'product_code'];
    for (const f of exportFields) {
      headers.push(`filter_field_id_${f.id}`);
      headers.push(f.field_name);
    }
    expect(headers).to.deep.equal([
      'product_id',
      'product_code',
      'filter_field_id_2',
      'Product Type',
    ]);
  });
});
