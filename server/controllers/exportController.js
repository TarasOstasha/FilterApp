
const { 
    exportCategoryDataToCSV, 
    exportProductCategoriesToCSV, 
    exportProductDataToCSV, 
    exportProductFilterDataToCSV, 
    exportFilterFieldDataToCSV } = require('../services/export');

module.exports.exportData = async (req, res, next) => {
    const { type } = req.params;
    try {
        let csvData;

        switch (type) {
            case 'products':
                csvData = await exportProductDataToCSV()
                break;
            case 'categories':
                csvData = await exportCategoryDataToCSV();
                break;
            case 'product_categories':
                csvData = await exportProductCategoriesToCSV();
                break;
            case 'filter_fields':
                csvData = await exportFilterFieldDataToCSV();
                break;
            case 'product_filters':
                csvData = await exportProductFilterDataToCSV();
                break;
            default:
                return res.status(400).json({ message: 'Invalid type for export' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
     
        res.status(200).send(csvData);

    } catch (error) {
        next(error); 
    }
};