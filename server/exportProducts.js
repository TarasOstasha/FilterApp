const { exportDataToCSV } = require('./services/csvExporter');

// Call the export function
exportDataToCSV()
  .then(() => {
    console.log('Export completed successfully.');
  })
  .catch((error) => {
    console.error('Error during export:', error);
  });
