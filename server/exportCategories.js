const chalk = require('chalk');
const { exportCategoryDataToCSV } = require('./services/export'); //require('./services/csvExporter');

// Call the export function
exportCategoryDataToCSV()
  .then(() => {
    console.log(chalk.green('Export completed successfully.'));
  })
  .catch((error) => {
    console.error(chalk.red('Error during export:', error));
  });
