import axios, { AxiosResponse } from 'axios';


const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
    // headers: {
    //     'Content-Type': 'multipart/form-data', 
    // },
});

// fetch regular products
export const fetchProductsFromAPI = async (
    queryParams: URLSearchParams
): Promise<AxiosResponse<any> | undefined> => {
    try {
        return await axiosInstance.get(`/products?${queryParams.toString()}`);
    } catch (error) {
        console.error('Error fetching products:', error);
        return undefined;
    }
};

// fetch megafiltered products
// export const fetchMegaFilteredProductsFromAPI = async (searchTerm: string): Promise<AxiosResponse<any> | undefined> => {
//     const queryParams = new URLSearchParams();
//     if (searchTerm) {
//         queryParams.append('search', searchTerm);  // Pass the search term as a query parameter
//     }
//     console.log(searchTerm, '<<queryParams');
//     try {
//         return await axiosInstance.get(`/products/mega?${queryParams.toString()}`);
//     } catch (error) {
//         console.error('Error fetching filtered products:', error);
//         return undefined;
//     }
// };
export const fetchMegaFilteredProductsFromAPI = async (searchTerm: string): Promise<AxiosResponse<any> | undefined> => {
    const queryParams = new URLSearchParams();
    if (searchTerm) {
        queryParams.append('searchTerms', searchTerm); 
    }
    try {
        return await axiosInstance.get(`/products/mega?${queryParams.toString()}`);
    } catch (error) {
        console.error('Error fetching filtered products:', error);
        return undefined;
    }
};




export const uploadCSV = async (uploadType: string, formData: FormData): Promise<AxiosResponse<any> | undefined> => {
    try {
        return await axiosInstance.post(`/upload-csv/${uploadType}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data', 
            },
        });
    } catch (error) {
        console.error('Error uploading CSV:', error);
        return undefined; 
    }
};

export const exportData = async (type: string): Promise<AxiosResponse<Blob> | undefined> => {
    try {
        return await axiosInstance.get<Blob>(`/export/${type}`, {
            responseType: 'blob',
        });
    } catch (error) {
        console.error('Error exporting data:', error);
        return undefined;
    }
};

export const loginUser = async (values: { username: string; password: string }): Promise<AxiosResponse<any> | undefined> => {
    try {
        return await axiosInstance.post('/admin/login', values);
    } catch (error) {
        console.error('Error during login:', error);
        return undefined; 
    }
};

