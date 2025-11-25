const chalk = require('chalk')
const { exportProductCategoriesToCSV } = require('./services/export') 

// Call the export function
exportProductCategoriesToCSV()
  .then(() => {
    console.log(chalk.green('Export completed successfully.'))
  })
  .catch((error) => {
    console.error(chalk.red('Error during export:', error))
  })
