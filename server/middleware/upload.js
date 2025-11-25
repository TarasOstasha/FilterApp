
const path = require('node:path');
const multer = require('multer');
const createHttpError = require('http-errors');


// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../services/import/data'));
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`);
    }
});


// File filter for CSV files OLD
// const fileFilter = (req, file, cb) => {
//     // Check the file extension or MIME type
//     if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
//         cb(null, true); // Accept the file
//     } else {
//         cb(new Error('Only .csv files are allowed!'), false); // Reject the file
//     }
// };

const MIMETYPE_REG_EXP = /^text\/csv$/i;

const fileFilter = (req, file, cb) => {
    // Check the file extension or MIME type using the regular expression
    if (MIMETYPE_REG_EXP.test(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true); // Accept the file
    } else {
        cb(createHttpError(415, 'Only .csv files are allowed!'), false); // Reject the file
    }
};


const upload = multer({
    storage,
    fileFilter,
});


module.exports.uploadCsvData = upload.single('file');