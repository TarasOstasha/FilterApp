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
        if (!file) {
            toast.error('Please select a file!');
            return;
        }

        const fileName = file.name.toLowerCase();
        const uploadType = getUploadTypeFromName(fileName);
        if (uploadType === 'unknown') {
            toast.error('Unsupported file name.');
            setShowRules(true);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        
        setIsUploading(true);
        toast.info('Uploading and processing file... Please wait.', { autoClose: false, toastId: 'upload-progress' });
        
        try {
            const response = await uploadCSV(uploadType, formData);
            const uploadTime = new Date().toLocaleString();
            toast.dismiss('upload-progress');
            toast.success(`File uploaded successfully at ${uploadTime}`);
        } catch (error) {
            toast.dismiss('upload-progress');
            if (axios.isAxiosError(error) && error.response?.data) {
                const errorData = error.response.data;
                if (errorData.errorRows && errorData.errorRows.length > 0) {
                    toast.error(`${errorData.message || 'File processed with errors'} ${errorData.errorRows.length} rows had issues.`);
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
            <input type="file" onChange={handleFileChange} disabled={isUploading} />
            <button onClick={handleFileUpload} disabled={!file || invalid || isUploading}>
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
