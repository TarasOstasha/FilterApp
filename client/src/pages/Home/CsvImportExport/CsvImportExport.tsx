import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './CsvImportExport.module.scss';

const CsvImportExport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);

    // Handle file selection for import
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    // Determine upload type based on file name
    const getUploadType = (fileName: string): string => {
        console.log(fileName);
        if (fileName.includes('categories')) return 'category';
        if (fileName.includes('product-categories')) return 'product-category';
        if (fileName.includes('product-filters')) return 'product-filter';
        if (fileName.includes('filter-fields')) return 'filter-field';
        if (fileName.includes('products')) return 'product';
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
                        <li><strong>"product-categories.csv"</strong> for uploading product categories</li>
                        <li><strong>"product-filters.csv"</strong> for uploading product filters</li>
                        <li><strong>"filter-fields.csv"</strong> for uploading filter fields</li>
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
            const response = await axios.post(`http://localhost:5000/api/upload-csv/${uploadType}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const uploadTime = new Date().toLocaleString();
            // toast.success(`File uploaded successfully at ${uploadTime}`);
            if (response.data.errorRows && response.data.errorRows.length > 0) {
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
    const handleExport = async (type: 'products' | 'categories' | 'productCategories' | 'filterFields' | 'productFilters') => {
        try {
            const response = await axios.get(`/api/export-${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_data.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`${type} data exported successfully!`);
        } catch (error) {
            toast.error(`Error exporting ${type} data`);
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
            <div className={styles['export-buttons']}>
                <button onClick={() => handleExport('products')}>Export Products</button>
                <button onClick={() => handleExport('categories')}>Export Categories</button>
                <button onClick={() => handleExport('productCategories')}>Export Product Categories</button>
                <button onClick={() => handleExport('filterFields')}>Export Filter Fields</button>
                <button onClick={() => handleExport('productFilters')}>Export Product Filter</button>
            </div>
        </div>
    );
};

export default CsvImportExport;
