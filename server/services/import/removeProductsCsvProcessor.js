/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const chalk = require('chalk');
const db = require('../../models');
const { Op } = require('sequelize');

const { sequelize } = db;
const Product = db.Product;

function readCsv(csvFilePath) {
  return new Promise((resolve, reject) => {
    const codes = new Set();
    const ids = new Set();

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const code = (row.product_code || row.code || '').toString().trim();
        const idRaw = row.id !== undefined ? String(row.id).trim() : '';
        if (code) codes.add(code);
        if (idRaw && /^\d+$/.test(idRaw)) ids.add(Number(idRaw));
      })
      .on('end', () => resolve({ codes: [...codes], ids: [...ids] }))
      .on('error', reject);
  });
}

async function removeProductsFromCsv(csvFilePath, { dryRun = false, force = false } = {}) {
  if (!fs.existsSync(csvFilePath)) {
    console.error(chalk.red(`❌ CSV not found: ${csvFilePath}`));
    return { deleted: 0, ids: [] };
  }

  const { codes, ids } = await readCsv(csvFilePath);
  if (!codes.length && !ids.length) {
    console.log(chalk.yellow('No valid product_code or id found in CSV.'));
    return { deleted: 0, ids: [] };
  }

  const where = {};
  if (codes.length) where.product_code = { [Op.in]: codes };
  if (ids.length) where.id = { [Op.in]: ids };

  const rows = await Product.findAll({ where, attributes: ['id', 'product_code'], raw: true });
  const productIds = rows.map(r => r.id);

  if (!productIds.length) {
    console.log(chalk.yellow('No matching products found.'));
    return { deleted: 0, ids: [] };
  }

  console.log(chalk.cyan(`Matched ${productIds.length} product(s).`));
  if (dryRun) {
    console.table(rows.slice(0, 20));
    console.log(chalk.magenta('Would delete IDs:'), productIds);
    return { deleted: 0, ids: productIds };
  }

  return sequelize.transaction(async (t) => {
    // One call; DB CASCADE takes care of related rows everywhere
    const deleted = await Product.destroy({
      where: { id: { [Op.in]: productIds } },
      transaction: t,
      force: !!force, // if paranoid, pass --force to hard-delete
    });

    console.log(chalk.green(`Deleted ${deleted} product(s) (cascade applied in DB).`));
    return { deleted, ids: productIds };
  });
}

// CLI
if (require.main === module) {
  (async () => {
    const csvPath = process.argv[2];
    const dry = process.argv.includes('--dry');
    const force = process.argv.includes('--force');
    if (!csvPath) {
      console.log(`Usage: node ${path.basename(__filename)} <file.csv> [--dry] [--force]`);
      process.exit(1);
    }
    try {
      const res = await removeProductsFromCsv(path.resolve(csvPath), { dryRun: dry, force });
      if (dry) console.log(chalk.magenta('Dry-run complete.'));
      process.exit(0);
    } catch (e) {
      console.error(chalk.red('Error:'), e);
      process.exit(1);
    }
  })();
}

module.exports = { removeProductsFromCsv };
