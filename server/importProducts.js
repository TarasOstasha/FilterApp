const chalk = require('chalk');
const { processProductCsvFile } = require('./services/import');

processProductCsvFile()
  .then((results) => {
    console.log(chalk.green('Products successfully inserted:', results.length));
  })
  .catch((error) => {
    console.error(chalk.red('Error processing CSV file:', error));
  });
