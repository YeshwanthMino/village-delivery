import { IS_DEV } from '@/src/core/utils/platform';
import { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const isDevelopment = IS_DEV;

// Logging interceptor - DISABLED (logging handled at API layer for clean, structured logs)
export const loggingInterceptor = {
  request: (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Logging disabled - handled at API layer
    return config;
  },

  response: (response: AxiosResponse): AxiosResponse => {
    // Logging disabled - handled at API layer
    return response;
  },

  error: (error: AxiosError): Promise<AxiosError> => {
    if (isDevelopment) {
      const errorDescription = `${error.response?.status || 'NO_RESPONSE'} - ${error.config?.url}`;
      console.log('Request Error:', errorDescription);
      if (error.response?.data) {
        console.log('Error Response Data:', error.response.data);
      }

      console.log('Error Details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
    return Promise.reject(error);
  },
};
