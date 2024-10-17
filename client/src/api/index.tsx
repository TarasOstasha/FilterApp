import axios, { AxiosResponse } from 'axios';


const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'multipart/form-data', 
    },
});



// export const uploadCSV = (uploadType: string, formData: FormData) => {
//     try {
//         return axiosInstance.post(`/upload-csv/${uploadType}`, formData);
//     } catch (error) {
//         console.error(error);
//     }
// };

// export const exportData = (type: string) => {
//     try {
//         return axiosInstance.get(`/export/${type}`, {
//             responseType: 'blob', 
//         });
//     } catch (error) {
//         console.error(error);
//     }
// };


export const uploadCSV = async (uploadType: string, formData: FormData): Promise<AxiosResponse<any> | undefined> => {
    try {
        return await axiosInstance.post(`/upload-csv/${uploadType}`, formData);
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
