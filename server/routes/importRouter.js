const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { importCategoryController } = require('../controllers');

const importRouter = Router();

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../services/import/data'));
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`);
    }
});

// File filter for CSV files
const fileFilter = (req, file, cb) => {
    // Check the file extension or MIME type
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Only .csv files are allowed!'), false); // Reject the file
    }
};

const upload = multer({
    storage,
    fileFilter,
});

importRouter.post('/category', upload.single('file'), importCategoryController.importCategories);
importRouter.post('/product', upload.single('file'), );
importRouter.post('/product-category', upload.single('file'), );
importRouter.post('/product-filter', upload.single('file'), );
importRouter.post('/filter-field', upload.single('file'), );

module.exports = importRouter;