const chalk = require('chalk');
const { processProductCategoriesCsvFile } = require('./services/import'); 


processProductCategoriesCsvFile()
  .then((results) => {
    console.log(chalk.green('Product Categories successfully inserted:', results.length));
  })
  .catch((error) => {
    console.error(chalk.red('Error processing product categories CSV file:', error));
  });
