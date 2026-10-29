import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configService } from './config';

export const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Dynamically set baseURL and attach Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const baseURL = await configService.getApiUrl();
      config.baseURL = baseURL;

      const token = await AsyncStorage.getItem('@proga_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('Error configuring request:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle token refresh logic or unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('@proga_refresh_token');
        if (refreshToken) {
          const baseURL = await configService.getApiUrl();
          const response = await axios.post(`${baseURL}/auth/refresh-token`, {
            refreshToken,
          });

          const accessToken = response.data.data?.accessToken || response.data?.accessToken;
          if (accessToken) {
            await AsyncStorage.setItem('@proga_access_token', accessToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove([
          '@proga_access_token',
          '@proga_refresh_token',
          '@proga_user',
        ]);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
