const chalk = require('chalk');
const { processCategoriesCsvFile } = require('./services/import');

processCategoriesCsvFile()
  .then((results) => {
    console.log(chalk.green('Categories successfully inserted:', results.length));
  })
  .catch((error) => {
    console.error(chalk.red('Error processing CSV file:', error));
  });
