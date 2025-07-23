const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// The directory where your export files are stored
const exportDirectory = path.join(__dirname, 'data');

// Helper function to keep the last 10 exported files
const manageExportedFiles = () => {
    fs.readdir(exportDirectory, (err, files) => {
        if (err) {
            return console.error(chalk.red('Error reading export directory:', err));
        }

        // Filter only CSV files
        const csvFiles = files.filter(file => file.endsWith('.csv'));

        // If there are more than 10 files, delete the older ones
        if (csvFiles.length > 10) {
            // Sort files by creation time (oldest first)
            const sortedFiles = csvFiles
                .map(file => ({ file, time: fs.statSync(path.join(exportDirectory, file)).mtime.getTime() }))
                .sort((a, b) => a.time - b.time);

            // Remove the oldest files, keeping only the most recent 10
            const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 10);

            filesToDelete.forEach(({ file }) => {
                fs.unlink(path.join(exportDirectory, file), (err) => {
                    if (err) {
                        console.error(chalk.red(`Error deleting file ${file}:`, err));
                    } else {
                        console.log(chalk.yellow(`Deleted old export file: ${file}`));
                    }
                });
            });
        }
    });
};

module.exports = manageExportedFiles;
