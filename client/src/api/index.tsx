import axios, { AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-toastify';

  // width range
interface WidthRangeResponse {
    min: number;
    max: number;
    globalMin: number;
    globalMax: number;
}

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
        const rawString = queryParams.toString().replace(/\+/g, '%20');
        return await axiosInstance.get(`/products?${rawString}`);
    } catch (error) {
        console.error('Error fetching products:', error);
        return undefined;
    }
};

// price range
export const fetchPriceRange = async (params?: Record<string,string>) => {
    try {
        //console.log(params ? Object.values(params) : [], '<< params in fetchPriceRange');
      return await axiosInstance.get<{
        breakpoints: never[];min:number;max:number
}>('/products/price-range',{ params });
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };


export const fetchWidthRange = async (params?: Record<string, string>) => {
    try {
      //console.log(params ? Object.values(params) : [], '<< params in fetchWidthRange');
      return await axiosInstance.get<WidthRangeResponse>('/products/width-range', { params });
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  // height range
export const fetchHeightRange = async (params?: Record<string, string>) => {
    try {
      //console.log(params ? Object.values(params) : [], '<< params in fetchHeightRange');
      return await axiosInstance.get<WidthRangeResponse>('/products/height-range', { params });
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
export const fetchMegaFilteredProductsFromAPI = async (searchTerm: string, sortBy: string): Promise<AxiosResponse<any> | undefined> => {
    console.log(sortBy, '<< sortBy API');
    const queryParams = new URLSearchParams();
    if (searchTerm) {
        queryParams.append('searchTerms', searchTerm);
    }
    if (sortBy) {
        queryParams.append('sortBy', sortBy);  // Pass the sort method as a query parameter
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
export const fetchFilterSidebarData = async (): Promise<AxiosResponse<any> | undefined> => {
    try {
        return await axiosInstance.get('/filterField');
    } catch (error) {
        console.log(error, 'error fetching filter data');
    }
}

// fetch dynamic filters
export const fetchDynamicFilters = async (
    params: Record<string, string>
) => {
    try {
        return await axiosInstance.get('/dynamic-filters', { params });
    } catch (err) {
        console.error('error fetching dynamic filters', err);
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
        const err = error as AxiosError; // type assertion
        if (err.response && err.response.status === 401) {
            toast.error('Invalid credentials');
        } else {
            toast.error('An error occurred while logging in');
        }
        return undefined;
    }
};

