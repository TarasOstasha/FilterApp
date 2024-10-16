const chalk = require('chalk');
const { exportProductDataToCSV } = require('./services/export'); //require('./services/csvExporter');

// Call the export function
exportProductDataToCSV()
  .then(() => {
    console.log(chalk.green('Export completed successfully.'));
  })
  .catch((error) => {
    console.error(chalk.red('Error during export:', error));
  });
