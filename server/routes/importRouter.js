const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { importController } = require('../controllers');
const { upload } = require('../middleware'); // multer config

const importRouter = Router();

// Multer configuration
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, path.join(__dirname, '../services/import/data'));
//     },
//     filename: (req, file, cb) => {
//         cb(null, `${file.originalname}`);
//     }
// });

// // File filter for CSV files
// const fileFilter = (req, file, cb) => {
//     // Check the file extension or MIME type
//     if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
//         cb(null, true); // Accept the file
//     } else {
//         cb(new Error('Only .csv files are allowed!'), false); // Reject the file
//     }
// };

// const upload = multer({
//     storage,
//     fileFilter,
// });

importRouter
    // .post('/category', upload.single('file'), importController.importCategories)
    // .post('/product', upload.single('file'), importController.importProducts)
    // .post('/product-category', upload.single('file'), importController.importProductCategories)
    // .post('/product-filter', upload.single('file'), importController.importProductFilters)
    // .post('/filter-field', upload.single('file'), importController.importFilterFields);
    .post('/category', upload.uploadCsvData, importController.importCategories)
    .post('/product', upload.uploadCsvData, importController.importProducts)
    .post('/product-category', upload.uploadCsvData, importController.importProductCategories)
    .post('/product-filter', upload.uploadCsvData, importController.importProductFilters)
    .post('/filter-field', upload.uploadCsvData, importController.importFilterFields);

module.exports = importRouter;


// uploadUserPhoto 
