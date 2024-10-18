import React, { useState } from 'react';
import axios from 'axios';
import { AxiosResponse } from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './CsvImportExport.module.scss';
import { exportData, uploadCSV } from '../../../api/index';

const CsvImportExport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [selectedExportType, setSelectedExportType] = useState<string>('');

    // Handle file selection for import
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    // Determine upload type based on file name
    const getUploadType = (fileName: string): string => {
        
        // Remove the extension if necessary, like '.csv', for comparison
        const cleanFileName = fileName.split('.')[0];
    
        if (cleanFileName === 'products') return 'product';
        if (cleanFileName === 'categories') return 'category';
        if (cleanFileName === 'product_categories') return 'product-category';
        if (cleanFileName === 'product_filters') return 'product-filter';
        if (cleanFileName === 'filter_fields') return 'filter-field';
    
        return 'unknown';
    };

    // Handle file upload (import)
    const handleFileUpload = async () => {
        if (!file) {
            toast.error('Please select a file!');
            return;
        }

        const fileName = file.name.toLowerCase();
        const uploadType = getUploadType(fileName);

        if (uploadType === 'unknown') {
            toast.error(
                <div>
                    <p><strong>Invalid file name!</strong></p>
                    <p>Allowed file names are:</p>
                    <ul>
                        <li><strong>"categories.csv"</strong> for uploading categories</li>
                        <li><strong>"product_categories.csv"</strong> for uploading product categories</li>
                        <li><strong>"product_filters.csv"</strong> for uploading product filters</li>
                        <li><strong>"filter_fields.csv"</strong> for uploading filter fields</li>
                        <li><strong>"products.csv"</strong> for uploading products</li>
                    </ul>
                </div>,
                {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                }
            );
            return;
        }


        const formData = new FormData();
        formData.append('file', file);

        try {
            
            // const response = await axios.post(`http://localhost:5000/api/upload-csv/${uploadType}`, formData, {
            //     headers: {
            //         'Content-Type': 'multipart/form-data',
            //     },
            // });
            const response = await uploadCSV(uploadType, formData);
            const uploadTime = new Date().toLocaleString();
            // toast.success(`File uploaded successfully at ${uploadTime}`);
            if (response?.data.errorRows && response.data.errorRows.length > 0) {
                toast.warn(`File uploaded with errors. ${response.data.errorRows.length} rows had issues.`);
            } else {
                toast.success(`File uploaded successfully at ${uploadTime}`);
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else if (error instanceof Error) {
                toast.error(error.message); 
            } else {
                toast.error('Error uploading file');
            }
        }
    };

    // Handle exporting data
    const handleExport = async (type: 'products' | 'categories' | 'product_categories' | 'filter_fields' | 'product_filters') => {
        try {
            //const response = await axios.get(`http://localhost:5000/api/export/${type}`, { responseType: 'blob' });
            const response: AxiosResponse<Blob> | undefined = await exportData(type)
            // exportData
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
            toast.error(`Error exporting ${type} data`);
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
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />

            <h2>Import CSV</h2>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleFileUpload} disabled={!file}>
                Import CSV
            </button>

            <h2>Export Data</h2>
            {/* <div className={styles['export-buttons']}>
                <button onClick={() => handleExport('products')}>Export Products</button>
                <button onClick={() => handleExport('categories')}>Export Categories</button>
                <button onClick={() => handleExport('productCategories')}>Export Product Categories</button>
                <button onClick={() => handleExport('filterFields')}>Export Filter Fields</button>
                <button onClick={() => handleExport('productFilters')}>Export Product Filter</button>
            </div> */}
            <div className={styles['export-buttons']}>
                <label htmlFor="exportType">Select Export Type:</label>
                <select
                    id="exportType"
                    value={selectedExportType}
                    onChange={(e) => setSelectedExportType(e.target.value)}
                >
                    <option value="">--Select an option--</option>
                    <option value="products">Export Products</option>
                    <option value="categories">Export Categories</option>
                    <option value="product_categories">Export Product Categories</option>
                    <option value="filter_fields">Export Filter Fields</option>
                    <option value="product_filters">Export Product Filter</option>
                </select>
                <button onClick={handleExportClick}>Export</button>
            </div>
        </div>
    );
};

export default CsvImportExport;
