const chalk = require('chalk');
const createHttpError = require('http-errors');
const { 
    processCategoriesCsvFile, 
    processProductCsvFile, 
    processProductCategoriesCsvFile, 
    processProductFiltersCsvFile,
    processFilterFieldsCsvFile,
    processRemoveProductsCsvFile 
} = require('../services/import');




module.exports.importCategories = async (req, res, next) => {
    if (!req.file) {
        return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
    }
    try {
        await processCategoriesCsvFile(req.file.path);
        res.status(200).json({ message: 'File processed successfully' });
    } catch (err) {
        next(createHttpError(500, 'Error processing file'));
    }
}

module.exports.importProducts = async (req, res, next) => {
    if (!req.file) {
        return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
    }
    try {
        const results = await processProductCsvFile(req.file.path);
        if (results.errorRows && results.errorRows.length > 0) {
            const skipped = results.errorRows.length;
            return res.status(200).json({
                message: `${skipped} product(s) skipped. Download error report for details.`,
                errorRows: results.errorRows,
                skippedCount: skipped,
            });
        }
        res.status(200).json({ message: 'File processed successfully' });
    } catch (err) {
        next(createHttpError(500, 'Error processing file'));
    }
}

module.exports.importRemoveProducts = async (req, res, next) => {
    console.log(chalk.blue('=== importRemoveProducts endpoint called ==='));
    
    if (!req.file) {
        console.log(chalk.red('No file uploaded or invalid file format'));
        return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
    }
    
    console.log(chalk.cyan(`File uploaded: ${req.file.originalname}, path: ${req.file.path}`));
    
    try {
        const result = await processRemoveProductsCsvFile(req.file.path);
        console.log(chalk.green('Remove products process completed successfully'));
        console.log(chalk.cyan(`Deleted ${result.deleted} products`));
        
        res.status(200).json({ 
            message: 'File processed successfully',
            result: {
                deleted: result.deleted,
                totalIdsProcessed: result.ids.length
            } 
        });
    } catch (err) {
        console.error(chalk.red('Error in importRemoveProducts:'), err);
        next(createHttpError(500, 'Error processing file'));
    }
}

module.exports.importProductCategories = async (req, res, next) => {
    if (!req.file) {
        return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
    }
    try {
        const results = await processProductCategoriesCsvFile(req.file.path);
        if (results.errorRows && results.errorRows.length > 0) {
            res.status(400).json({
                message: `File processed with errors. ${results.errorRows.length} rows had issues.`,
                errorRows: results.errorRows
            });
        } else {
            res.status(200).json({ message: 'File processed successfully' });
        }
    } catch (err) {
        next(createHttpError(500, 'Error processing file'));
    }
}

// module.exports.importProductFilters = async (req, res, next) => {
//     console.log(req.file, 'req.file.path from importProductFilters'); // To verify the uploaded file
//     if (!req.file) {
//         return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
//     }
//     try {
//         const results = await processProductFiltersCsvFile(req.file.path);

//         if (results.errorRows && results.errorRows.length > 0) {
//             res.status(400).json({
//                 message: `File processed with errors. ${results.errorRows.length} rows had issues.`,
//                 errorRows: results.errorRows
//             });
//         } else {
//             res.status(200).json({ message: 'File processed successfully', status: 'ok' });
//         }

//     } catch (err) {
//         console.error('Error processing CSV file:', err);
//         next(createHttpError(500, 'Error processing file'));
//     }
// };

module.exports.importProductFilters = async (req, res, next) => {
    if (!req.file) {
      return next(createHttpError(400, 'No file uploaded or invalid format'));
    }
  
    try {
      const { successRows, errorRows } = await processProductFiltersCsvFile(req.file.path);
  
      if (errorRows.length > 0) {
        const skipped = errorRows.length;
        return res.status(200).json({
          message: `${skipped} product(s) skipped. Download error report for details.`,
          errorRows,
          skippedCount: skipped,
          importedCount: successRows.length,
        });
      }

      res.status(200).json({
        message: `Imported ${successRows.length} filters successfully.`,
        status: 'ok',
        importedCount: successRows.length,
      });
    } catch (err) {
      console.error('Error processing CSV file:', err);
      
      // Handle validation errors specifically
      if (err.validationError) {
        return res.status(400).json({
          message: err.message,
          validationErrors: err.details,
          errorRows: err.errorRows,
          status: 'validation_failed'
        });
      }

      if (err.importError) {
        return res.status(500).json({
          message: err.message,
          status: 'import_rolled_back',
        });
      }
      
      next(createHttpError(500, 'Error processing file'));
    }
  };

module.exports.importFilterFields = async (req, res, next) => {
    //console.log(req.file.path); 
    if (!req.file) {
        return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
    }
    try {
        await processFilterFieldsCsvFile(req.file.path);
        res.status(200).json({ message: 'File processed successfully' });
    } catch (err) {
        next(createHttpError(500, 'Error processing file'));
    }
};
