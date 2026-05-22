const chalk = require('chalk');
const { exportProductDataToXML } = require('./services/export');

exportProductDataToXML()
  .then(() => {
    console.log(chalk.green('Export completed successfully.'));
  })
  .catch((error) => {
    console.error(chalk.red('Error during export:', error));
  });
