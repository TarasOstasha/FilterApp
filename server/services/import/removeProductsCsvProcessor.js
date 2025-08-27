/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const chalk = require('chalk');
const db = require('../../models');
const { Op } = require('sequelize');

const { sequelize } = db;
const Product = db.Product;

const CHUNK = 3000; // safety for huge batches

function readCsv(csvFilePath, { debug = false } = {}) {
  return new Promise((resolve, reject) => {
    const codes = new Set();
    const ids = new Set();
    const badIdRows = [];
    let rowCount = 0;

    fs.createReadStream(csvFilePath)
      .pipe(csv({
        // trim headers + strip BOM
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, ''),
      }))
      .on('headers', (headers) => {
        if (debug) console.log(chalk.gray('CSV headers:'), headers);
      })
      .on('data', (row) => {
        rowCount++;

        // show first 5 rows for sanity
        if (debug && rowCount <= 5) {
          console.log(chalk.cyanBright(`[csv row ${rowCount}]`), row);
        }

        const rawCode = row.product_code ?? row.code ?? '';
        const code = String(rawCode).trim();
        const idRaw = row.id !== undefined ? String(row.id).trim() : '';

        if (code) codes.add(code);
        if (idRaw) {
          if (/^\d+$/.test(idRaw)) ids.add(Number(idRaw));
          else badIdRows.push({ row: rowCount, id: idRaw });
        }
      })
      .on('end', () => {
        if (debug) {
          console.log(
            chalk.yellow(
              `CSV read complete → rows: ${rowCount}, unique codes: ${codes.size}, unique ids: ${ids.size}`
            )
          );
          if (badIdRows.length) {
            console.log(chalk.yellowBright('Non-numeric id values found (ignored):'));
            console.table(badIdRows.slice(0, 20));
          }
          if (codes.size === 0 && ids.size === 0) {
            console.log(chalk.red('No usable columns found. Expecting "product_code" or "id".'));
          }
        }
        resolve({ codes: [...codes], ids: [...ids], rowCount, badIdRows });
      })
      .on('error', (err) => {
        if (debug) console.error(chalk.red('CSV stream error:'), err);
        reject(err);
      });
  });
}

function diffInputs(foundRows, codes, ids) {
  const foundIds = new Set(foundRows.map((r) => r.id));
  const foundCodes = new Set(foundRows.map((r) => r.product_code));
  return {
    ids: ids.filter((x) => !foundIds.has(x)),
    codes: codes.filter((x) => !foundCodes.has(x)),
  };
}

async function destroyInChunks(productIds, { transaction, force }) {
  let total = 0;
  for (let i = 0; i < productIds.length; i += CHUNK) {
    const slice = productIds.slice(i, i + CHUNK);
    const deleted = await Product.destroy({
      where: { id: { [Op.in]: slice } },
      transaction,
      force: !!force,
    });
    total += deleted;
  }
  return total;
}

/**
 * Remove products by CSV (columns: product_code or id).
 * Set { debug:true } to print CSV diagnostics.
 */
async function processRemoveProductsCsvFile(
  csvFilePath,
  { dryRun = false, force = false, caseInsensitive = false, debug = false } = {}
) {
  if (!fs.existsSync(csvFilePath)) {
    console.error(chalk.red(`CSV not found: ${csvFilePath}`));
    return { deleted: 0, ids: [] };
  }

  const { codes, ids, rowCount } = await readCsv(csvFilePath, { debug });
  if (!codes.length && !ids.length) {
    console.log(chalk.yellow('No valid product_code or id found in CSV.'));
    return { deleted: 0, ids: [] };
  }
  if (debug) {
    console.log(chalk.blue(`Input summary → rows:${rowCount} codes:${codes.length} ids:${ids.length}`));
  }

  // Build WHERE with optional case-insensitive product_code match
  const ors = [];
  if (ids.length) ors.push({ id: { [Op.in]: ids } });
  if (codes.length) {
    if (caseInsensitive) {
      const upperCodes = codes.map((c) => c.toUpperCase());
      ors.push(sequelize.where(sequelize.fn('upper', sequelize.col('product_code')), { [Op.in]: upperCodes }));
    } else {
      ors.push({ product_code: { [Op.in]: codes } });
    }
  }
  const where = ors.length === 1 ? ors[0] : { [Op.or]: ors };
  if (debug) console.log(chalk.gray('WHERE preview:'), JSON.stringify(where, null, 2));

  const rows = await Product.findAll({
    where,
    attributes: ['id', 'product_code'],
    raw: true,
  });
  const productIds = rows.map((r) => r.id);

  if (!productIds.length) {
    console.log(chalk.yellow('No matching products found.'));
    return { deleted: 0, ids: [] };
  }

  const missing = diffInputs(rows, codes, ids);
  console.log(chalk.cyan(`Matched ${productIds.length} product(s).`));
  if (debug && (missing.codes.length || missing.ids.length)) {
    console.log(chalk.yellow('Some inputs did not match existing products:'), missing);
  }

  if (dryRun) {
    console.table(rows.slice(0, 20));
    console.log(
      chalk.magenta('Would delete IDs:'),
      productIds.length > 50 ? productIds.slice(0, 50).concat(['…']) : productIds
    );
    return { deleted: 0, ids: productIds, missing };
  }

  return sequelize.transaction(async (t) => {
    // One or more chunked destroys; DB ON DELETE CASCADE cleans related rows
    const deleted = await destroyInChunks(productIds, { transaction: t, force });
    console.log(chalk.green(`Deleted ${deleted} product(s) (cascade applied in DB).`));
    return { deleted, ids: productIds, missing };
  });
}


module.exports = processRemoveProductsCsvFile;               
//module.exports.removeProductsFromCsv = removeProductsFromCsv; 



