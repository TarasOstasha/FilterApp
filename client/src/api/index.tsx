import axios, { AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-toastify';

  // width range
interface WidthRangeResponse {
    min: number;
    max: number;
    globalMin: number;
    globalMax: number;
}

const API_BASE = process.env.REACT_APP_API_URL || `${window.location.origin}/api`;

const axiosInstance = axios.create({
    baseURL: API_BASE, //'http://localhost:5000/api',
    paramsSerializer: {
        indexes: null, // Product_Type=a&Product_Type=b (comma stays inside one value)
    },
});

//console.log('API_BASE:', process.env.REACT_APP_API_URL);

// fetch regular products
export const fetchProductsFromAPI = async (
    queryParams: URLSearchParams,
    catId: string
): Promise<AxiosResponse<any> | undefined> => {
    try {
        const rawString = queryParams.toString().replace(/\+/g, '%20');
        return await axiosInstance.get(`/products?${rawString}`, { params: { catId } });
    } catch (error) {
        console.error('Error fetching products:', error);
        return undefined;
    }
};

type FilterQueryParams = Record<string, string | string[]>;

// price range
export const fetchPriceRange = async (params?: FilterQueryParams, catId?: string) => {
    try {
        //console.log(params ? Object.values(params) : [], '<< params in fetchPriceRange');
      const allParams = catId ? { ...params, catId } : params;
      return await axiosInstance.get<{
        breakpoints: never[];min:number;max:number
}>('/products/price-range',{ params: allParams });
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };


export const fetchWidthRange = async (params?: FilterQueryParams, catId?: string) => {
    try {
      //console.log(params ? Object.values(params) : [], '<< params in fetchWidthRange');
      const allParams = catId ? { ...params, catId } : params;
      return await axiosInstance.get<WidthRangeResponse>('/products/width-range', { params: allParams });
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  // height range
export const fetchHeightRange = async (params?: FilterQueryParams, catId?: string) => {
    try {
      //console.log(params ? Object.values(params) : [], '<< params in fetchHeightRange');
      const allParams = catId ? { ...params, catId } : params;
      return await axiosInstance.get<WidthRangeResponse>('/products/height-range', { params: allParams });
    } catch (err) {
      console.error(err);
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
export const fetchMegaFilteredProductsFromAPI = async (
    searchTerm: string,
    sortBy: string,
    catId?: string
): Promise<AxiosResponse<any> | undefined> => {
    console.log(sortBy, '<< sortBy API');
    const queryParams = new URLSearchParams();
    if (searchTerm) {
        queryParams.append('searchTerms', searchTerm);
    }
    if (sortBy) {
        queryParams.append('sortBy', sortBy);  // Pass the sort method as a query parameter
    }
    if (catId) {
        queryParams.append('catId', catId);
    }
    //console.log(sortBy, '<< sortBy');
    try {
        return await axiosInstance.get(`/products/mega?${queryParams.toString()}`);
    } catch (error) {
        console.error('Error fetching filtered products:', error);
        return undefined;
    }
};

// fetch filter fields
export const fetchFilterSidebarData = async (catId: string): Promise<AxiosResponse<any> | undefined> => {
    try {
        return await axiosInstance.get('/filterField', { params: { catId } });
    } catch (error) {
        console.log(error, 'error fetching filter data');
    }
}

// fetch dynamic filters
export const fetchDynamicFilters = async (
    params: FilterQueryParams,
    catId: string
) => {
    console.log(params, catId, '<< params and catId in fetchDynamicFilters');
    try {
        return await axiosInstance.get('/dynamic-filters', { params: { ...params, catId } });
    } catch (err) {
        console.error('error fetching dynamic filters', err);
        return undefined;
    }
};

export const uploadCSV = async (uploadType: string, formData: FormData): Promise<AxiosResponse<any>> => {
    console.log(`Uploading CSV file of type: ${uploadType}`, {
        uploadType,
        apiURL: `${API_BASE}/upload-csv/${uploadType}`,
        formDataKeys: Array.from(formData.keys())
    });
    
    try {
        console.log("Making axios POST request...");
        const response = await axiosInstance.post(`/upload-csv/${uploadType}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        console.log("Upload response received:", response);
        return response;
    } catch (error) {
        console.error("Error in uploadCSV function:", error);
        if (axios.isAxiosError(error)) {
            console.error("Axios error details:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
        }
        throw error; // Re-throw to be handled by the component
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
        const err = error as AxiosError; // type assertion
        if (err.response && err.response.status === 401) {
            toast.error('Invalid credentials');
        } else {
            toast.error('An error occurred while logging in');
        }
        return undefined;
    }
};

export interface AdminProduct {
    id: number;
    product_code: string;
    product_name: string;
    product_link: string;
    product_img_link: string;
    product_price: string | number;
    most_popular: string | number | null;
    hide_product: string;
    category_ids: string;
}

export interface AdminProductPayload {
    product_name: string;
    product_link: string;
    product_img_link: string;
    product_price: string | number;
    most_popular?: string | number | null;
    hide_product?: string;
    category_ids: string;
}

export interface AdminProductFilterField {
    filter_field_id: number;
    value_index: number;
    field_name: string;
    display_name: string;
    field_type: string;
    current_value: string;
    allowed_values: string[];
}

export interface AdminFilterField {
    id: number;
    field_name: string;
    field_type: string;
    allowed_values: string;
    sort_order: number;
}

export interface AdminFilterFieldPayload {
    id?: number | string;
    field_name: string;
    field_type: string;
    allowed_values: string;
    sort_order: number | string;
}

export interface AdminCategory {
    category_id: number;
    category_name: string;
}

export interface AdminCategoryPayload {
    category_id?: number | string;
    category_name: string;
}

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export const fetchProductByCode = async (
    productCode: string
): Promise<AxiosResponse<{ product: AdminProduct }> | undefined> => {
    try {
        const encoded = encodeURIComponent(productCode.trim());
        return await axiosInstance.get(`/products/by-code/${encoded}`, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
};

export const updateProductByCode = async (
    productCode: string,
    payload: AdminProductPayload
): Promise<AxiosResponse<{ message: string; product: AdminProduct }> | undefined> => {
    try {
        const encoded = encodeURIComponent(productCode.trim());
        return await axiosInstance.put(`/products/by-code/${encoded}`, payload, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
};

export const deleteProductByCode = async (
    productCode: string
): Promise<AxiosResponse<{ message: string; result: { id: number; product_code: string } }> | undefined> => {
    try {
        const encoded = encodeURIComponent(productCode.trim());
        return await axiosInstance.delete(`/products/by-code/${encoded}`, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
};

export const fetchProductFiltersByCode = async (
    productCode: string
): Promise<AxiosResponse<{ product_code: string; filters: AdminProductFilterField[] }> | undefined> => {
    try {
        const encoded = encodeURIComponent(productCode.trim());
        return await axiosInstance.get(`/products/by-code/${encoded}/filters`, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error fetching product filters:', error);
        throw error;
    }
};

export const updateProductFilterByCode = async (
    productCode: string,
    payload: { filter_field_id: number; value_index: number; filter_value: string }
): Promise<AxiosResponse<{ message: string; product_code: string; filters: AdminProductFilterField[] }> | undefined> => {
    try {
        const encoded = encodeURIComponent(productCode.trim());
        return await axiosInstance.put(`/products/by-code/${encoded}/filters`, payload, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error updating product filter:', error);
        throw error;
    }
};

export const fetchFilterFieldById = async (
    id: number | string
): Promise<AxiosResponse<{ filter_field: AdminFilterField }> | undefined> => {
    try {
        const encoded = encodeURIComponent(String(id).trim());
        return await axiosInstance.get(`/filterField/by-id/${encoded}`, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error fetching filter field:', error);
        throw error;
    }
};

export const createFilterField = async (
    payload: AdminFilterFieldPayload
): Promise<AxiosResponse<{ message: string; filter_field: AdminFilterField }> | undefined> => {
    try {
        return await axiosInstance.post('/filterField', payload, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error creating filter field:', error);
        throw error;
    }
};

export const updateFilterFieldById = async (
    id: number | string,
    payload: Omit<AdminFilterFieldPayload, 'id'>
): Promise<AxiosResponse<{ message: string; filter_field: AdminFilterField }> | undefined> => {
    try {
        const encoded = encodeURIComponent(String(id).trim());
        return await axiosInstance.put(`/filterField/by-id/${encoded}`, payload, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error updating filter field:', error);
        throw error;
    }
};

export const deleteFilterFieldById = async (
    id: number | string
): Promise<AxiosResponse<{ message: string; result: { id: number; field_name: string } }> | undefined> => {
    try {
        const encoded = encodeURIComponent(String(id).trim());
        return await axiosInstance.delete(`/filterField/by-id/${encoded}`, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error deleting filter field:', error);
        throw error;
    }
};

export const fetchCategoryByCategoryId = async (
    categoryId: number | string
): Promise<AxiosResponse<{ category: AdminCategory }> | undefined> => {
    try {
        const encoded = encodeURIComponent(String(categoryId).trim());
        return await axiosInstance.get(`/category/by-category-id/${encoded}`, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        throw error;
    }
};

export const createCategory = async (
    payload: AdminCategoryPayload
): Promise<AxiosResponse<{ message: string; category: AdminCategory }> | undefined> => {
    try {
        return await axiosInstance.post('/category', payload, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error creating category:', error);
        throw error;
    }
};

export const updateCategoryByCategoryId = async (
    categoryId: number | string,
    payload: Pick<AdminCategoryPayload, 'category_name'>
): Promise<AxiosResponse<{ message: string; category: AdminCategory }> | undefined> => {
    try {
        const encoded = encodeURIComponent(String(categoryId).trim());
        return await axiosInstance.put(`/category/by-category-id/${encoded}`, payload, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error updating category:', error);
        throw error;
    }
};

export const deleteCategoryByCategoryId = async (
    categoryId: number | string
): Promise<AxiosResponse<{ message: string; result: { category_id: number; category_name: string } }> | undefined> => {
    try {
        const encoded = encodeURIComponent(String(categoryId).trim());
        return await axiosInstance.delete(`/category/by-category-id/${encoded}`, {
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

function getUsernameFromAuthToken(token: string): string {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return typeof payload.username === 'string' ? payload.username : '';
    } catch {
        return '';
    }
}

export const changePassword = async (values: {
    oldPassword: string;
    newPassword: string;
    username?: string;
}): Promise<AxiosResponse<{ message: string }> | undefined> => {
    const token = localStorage.getItem('authToken');
    const username = values.username || (token ? getUsernameFromAuthToken(token) : '');

    if (!username) {
        toast.error('Username is required to change your password');
        return undefined;
    }

    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        return await axiosInstance.post(
            '/admin/change-password',
            {
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
                username,
            },
            headers ? { headers } : undefined
        );
    } catch (error) {
        console.error('Error changing password:', error);
        const err = error as AxiosError<{ error?: string }>;
        const message = err.response?.data?.error;

        if (err.response?.status === 401) {
            toast.error(message || 'Incorrect current password');
        } else if (err.response?.status === 400) {
            toast.error(message || 'Invalid password request');
        } else {
            toast.error('An error occurred while changing your password');
        }
        return undefined;
    }
};
