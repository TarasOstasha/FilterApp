const chalk = require('chalk');
const createHttpError = require('http-errors');
const { processCategoriesCsvFile } = require('../services/import');

module.exports.importCategories = async (req, res, next) => {
    console.log(chalk.red(req.file.path));
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

