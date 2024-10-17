const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { importCategoryController } = require('../controllers');

const importCategoryRouter = Router();

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

importCategoryRouter.post('/', upload.single('file'), importCategoryController.importCategories);

module.exports = importCategoryRouter;
