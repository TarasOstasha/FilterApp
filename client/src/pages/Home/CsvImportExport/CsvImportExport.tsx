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

    // Handle file upload (import)
    const handleFileUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/upload-csv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success('File uploaded successfully!'); 
        } catch (error) {
            toast.error('Error uploading file'); 
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
