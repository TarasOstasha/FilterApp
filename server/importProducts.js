const { processCsvFile } = require('./services/csvProcessor');

processCsvFile()
  .then((results) => {
    console.log('Products successfully inserted:', results.length);
  })
  .catch((error) => {
    console.error('Error processing CSV file:', error);
  });
