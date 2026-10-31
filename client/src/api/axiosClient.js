import axios from 'axios';
import { beginLoading } from './loadingStore';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.method === 'get') config.finishLoading = beginLoading();
        else if (['post', 'put', 'patch', 'delete'].includes(config.method)) config.finishLoading = beginLoading(true);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response) => {
        response.config.finishLoading?.();
        return response.data;
    },
    (error) => {
        error.config?.finishLoading?.();
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
