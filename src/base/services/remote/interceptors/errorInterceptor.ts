import { AxiosError } from 'axios';
import { NetworkError } from '../apiTypes';
import { ErrorMapper } from '../errorMapper';

// Legacy mapping function for backward compatibility
export const mapToNetworkError = (error: AxiosError): NetworkError => {
  return ErrorMapper.mapAxiosError(error);
};

// Enhanced error interceptor using the new error mapper
export const errorInterceptor = {
  error: (error: AxiosError) => {
    const networkError = ErrorMapper.mapAxiosError(error);

    // Error logging disabled here - handled at API layer for clean structured logs
    // This prevents React Native from showing console.warn as unhandled rejections

    return networkError;
  },
};
