const createHttpError = require('http-errors')
//const { FilterField } = require('../models');
const chalk = require('chalk');

// module.exports.getAllFilterFields = async (req, res, next) => {
//   try {
//     const { catId } = req.query;
//     const foundFilterFields = await FilterField.findAll({
//       order: [['sort_order', 'ASC']],
//     });
//     // i'm modifying data here becaouse i need allowed_values be array of string
//     const modifiedFilterFields = foundFilterFields.map((field) => {
//       return {
//         ...field.dataValues,
//         allowed_values: typeof field.dataValues.allowed_values === 'string'
//           ? field.dataValues.allowed_values.split(',').map((val) => val.trim())
//           : field.dataValues.allowed_values,
//       };
//     });
//     res.status(200).send(modifiedFilterFields);
//   } catch (err) {
//     next(err)
//   }
// }


const { Product, Category, ProductFilter, FilterField } = require('../models');
module.exports.getAllFilterFields = async (req, res, next) => {
  try {
    const catId = req.query.catId ? Number(req.query.catId) : null;
    console.log(chalk.blue('getAllFilterFields catId:'), catId);

    // Build include for product/category scoping
    const productInclude = catId
      ? [{
          model: Product,
          attributes: [],
          required: true,
          include: [{
            model: Category,
            attributes: [],
            required: true,
            where: { id: catId },
            through: { attributes: [] },
          }],
        }]
      : [{
          model: Product,
          attributes: [],
          required: true,           // only products that exist
        }];

    // Pull all product_filters that match the scope + their FilterField meta
    const pfRows = await ProductFilter.findAll({
      attributes: ['filter_field_id', 'filter_value'],
      include: [
        ...productInclude,
        {
          model: FilterField,
          attributes: ['id', 'field_name', 'field_type', 'sort_order'],
          required: true,
        },
      ],
      raw: true,
    });

    // Aggregate values per field, splitting CSVs like "Blue, Large"
    const byField = new Map();
    for (const row of pfRows) {
      const fieldId   = row.filter_field_id;
      const fieldName = row['FilterField.field_name'];
      const fieldType = row['FilterField.field_type'];
      const sortOrder = row['FilterField.sort_order'];
      const csv       = String(row.filter_value || '');

      if (!byField.has(fieldId)) {
        byField.set(fieldId, {
          id: fieldId,
          field_name: fieldName,
          field_type: fieldType,
          sort_order: sortOrder,
          values: new Set(),
        });
      }

      csv.split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0)
        .forEach(v => byField.get(fieldId).values.add(v));
    }

    // Build response: only fields that actually have values
    const result = Array.from(byField.values())
      .map(f => ({
        id: f.id,
        field_name: f.field_name,
        field_type: f.field_type,
        sort_order: f.sort_order,
        allowed_values: Array.from(f.values)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      }))
      .filter(f => f.allowed_values.length > 0)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    console.log(chalk.green('getAllFilterFields result:'), result);

    return res.status(200).send(result);
  } catch (err) {
    console.error(chalk.red('getAllFilterFields error:'), err);
    next(err);
  }
};
