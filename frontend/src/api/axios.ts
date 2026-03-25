import axios from 'axios';
import { useAuthStore } from './authStore';
import { env } from './env';

const api = axios.create({
    baseURL: `${env.BACKEND_URL}`,
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response, // If we don't get any errors, we return the response as is
    async (error) => {
        const originalRequest = error.config;

        // We use _retry in here to not retry if we get an error even after the refresh token was successfully refreshed
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const response = await axios.post(`${env.BACKEND_URL}/refresh`, {}, { withCredentials: true });

                useAuthStore.getState().setAccessToken(response.data.accessToken);

                return api(originalRequest);
            } catch (refreshError) {
                // The refresh token likely expired too, so we log the user out
                useAuthStore.getState().clearAuth();

                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
)

export default api;