const chalk = require('chalk');
const createHttpError = require('http-errors');
const { 
    processCategoriesCsvFile, 
    processProductCsvFile, 
    processProductCategoriesCsvFile, 
    processProductFiltersCsvFile,
    processFilterFieldsCsvFile 
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
        await processProductCsvFile(req.file.path);
        res.status(200).json({ message: 'File processed successfully' });
    } catch (err) {
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

module.exports.importProductFilters = async (req, res, next) => {
    console.log(req.file.path); // To verify the uploaded file
    if (!req.file) {
        return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
    }
    try {
        await processProductFiltersCsvFile(req.file.path);
        res.status(200).json({ message: 'File processed successfully' });
    } catch (err) {
        next(createHttpError(500, 'Error processing file'));
    }
};

module.exports.importFilterFields = async (req, res, next) => {
    console.log(req.file.path); 
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