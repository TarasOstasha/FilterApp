import React, { useState } from 'react';
import axios from 'axios';
import { AxiosResponse } from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './CsvImportExport.module.scss';
import { exportData, uploadCSV } from '../../../api/index';
import Admin from '../../Admin/Admin';
import AllowedFilenamesNote, { isAllowedFileName, getUploadTypeFromName } from './AllowedFiles';



const CsvImportExport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [selectedExportType, setSelectedExportType] = useState<string>('');
    const [showRules, setShowRules] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const invalid = !!file && !isAllowedFileName(file.name);
    const errorLock = invalid && !showRules;
    const shouldShowNote = showRules || invalid;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const countCSVRows = (file: File): Promise<number> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                if (!text) {
                    resolve(0);
                    return;
                }
                // Count lines, subtract 1 for header row
                const lines = text.split('\n').filter(line => line.trim() !== '');
                const rowCount = Math.max(0, lines.length - 1);
                resolve(rowCount);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    };

    // const getUploadType = (fileName: string): string => {
    //     const cleanFileName = fileName.split('.')[0];

    //     if (cleanFileName === 'products') return 'product';
    //     if (cleanFileName === 'products-remove') return 'product-remove';
    //     if (cleanFileName === 'categories') return 'category';
    //     if (cleanFileName === 'product_categories') return 'product-category';
    //     if (cleanFileName === 'product_filters') return 'product-filter';
    //     if (cleanFileName === 'filter_fields') return 'filter-field';

    //     return 'unknown';
    // };

    const handleFileUpload = async () => {
        console.log("Upload button clicked", { file });
        
        if (!file) {
            toast.error('Please select a file!');
            return;
        }

        const fileName = file.name.toLowerCase();
        const uploadType = getUploadTypeFromName(fileName);
        console.log("File information:", { fileName, uploadType, size: file.size });
        
        if (uploadType === 'unknown') {
            toast.error('Unsupported file name.');
            setShowRules(true);
            return;
        }

        // Check row count before uploading
        try {
            toast.info('Validating file...', { autoClose: 2000 });
            const rowCount = await countCSVRows(file);
            
            if (rowCount > 10000) {
                toast.error(
                    <div>
                        <p><strong>File too large!</strong></p>
                        <p>Your file contains <strong>{rowCount.toLocaleString()}</strong> rows.</p>
                        <p>Maximum allowed: <strong>10,000</strong> rows.</p>
                        <p>Please split your file into smaller chunks and upload them separately.</p>
                    </div>,
                    { autoClose: 10000 }
                );
                return;
            }
        } catch (error) {
            toast.error('Failed to validate file. Please try again.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        
        setIsUploading(true);
        toast.info('Uploading and processing file... Please wait.', { autoClose: false, toastId: 'upload-progress' });
        
        try {
            console.log("Attempting to upload file", { uploadType });
            const response = await uploadCSV(uploadType, formData);
            console.log("Upload response received:", response);
            const uploadTime = new Date().toLocaleString();
            toast.dismiss('upload-progress');
            
            if (uploadType === 'product-remove') {
               
                const deleted = response.data.result?.deleted || 0;
                toast.success(`File processed successfully. ${deleted} product(s) removed at ${uploadTime}`);
            } else {
                toast.success(`File uploaded successfully at ${uploadTime}`);
            }
            
            // Reset the file input after successful upload
            setFile(null);
            const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error("Error during upload:", error);
            toast.dismiss('upload-progress');
            if (axios.isAxiosError(error) && error.response?.data) {
                const errorData = error.response.data;
                if (errorData.errorRows && errorData.errorRows.length > 0) {
                    toast.error(errorData.message || `File processed with errors. ${errorData.errorRows.length} row(s) had issues.`);
                } else if (errorData.message) {
                    toast.error(errorData.message);
                } else {
                    toast.error('Error uploading file');
                }
            } else if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Error uploading file');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleExport = async (type: 'products' | 'categories' | 'product_categories' | 'filter_fields' | 'product_filters') => {
        setIsExporting(true);
        toast.info(`Exporting ${type} data... Please wait.`, { autoClose: false, toastId: 'export-progress' });
        
        try {
            const response: AxiosResponse<Blob> | undefined = await exportData(type);
            toast.dismiss('export-progress');
            
            if (response && response.data) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${type}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`${type} data exported successfully!`);
            } else {
                toast.error(`Failed to export ${type} data`);
            }
        } catch (error) {
            toast.dismiss('export-progress');
            toast.error(`Error exporting ${type} data`);
        } finally {
            setIsExporting(false);
        }
    };


    const handleExportClick = () => {
        if (selectedExportType) {
            handleExport(selectedExportType as any);
        } else {
            toast.error('Please select an export type.');
        }
    };

    return (
        <div className={styles['csv-import-export']}>

            <ToastContainer
                position="top-right"
                autoClose={15000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <Admin />
            <h2>Import CSV</h2>
            <input 
                type="file" 
                onChange={handleFileChange} 
                disabled={isUploading} 
                id="csv-file-input"
            />
            <button 
                onClick={handleFileUpload} 
                disabled={!file || invalid || isUploading}
                style={{ 
                    padding: '8px 16px', 
                    margin: '10px 0', 
                    cursor: !file || invalid || isUploading ? 'not-allowed' : 'pointer',
                    backgroundColor: !file ? '#cccccc' : invalid ? '#ffcccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                }}
                id="import-csv-button"
            >
                {isUploading ? 'Uploading...' : 'Import CSV'}
            </button>
            <button
                type="button"
                className={styles.linkBtn}
                disabled={errorLock || isUploading}                       
                aria-disabled={errorLock || isUploading}
                onClick={() => setShowRules(v => !v)}
            >
                {showRules ? 'Hide allowed import names' : 'Show allowed import names'}
            </button>
            <h2>Export Data</h2>
            <div className={styles['export-buttons']}>
                <label htmlFor="exportType">Select Export Type:</label>
                <select
                    id="exportType"
                    value={selectedExportType}
                    onChange={(e) => setSelectedExportType(e.target.value)}
                    disabled={isExporting}
                >
                    <option value="">--Select an option--</option>
                    <option value="products">Export Products</option>
                    <option value="categories">Export Categories</option>
                    <option value="product_categories">Export Product Categories</option>
                    <option value="filter_fields">Export Filter Fields</option>
                    <option value="product_filters">Export Product Filter</option>
                </select>
                <button onClick={handleExportClick} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export'}
                </button>
            </div>
            {shouldShowNote && (
                <div className={styles.noteWrap}>
                    <AllowedFilenamesNote
                        file={file}
                        open={showRules}
                        onClose={() => setShowRules(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default CsvImportExport;
