import { QueryClient } from '@tanstack/react-query';
import { AppConfig } from '../constants/AppConstants';
import { NetworkError } from '../services/remote/apiTypes';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: AppConfig.staleTime,
      gcTime: AppConfig.cacheTime,
      retry: (failureCount, error: unknown) => {
        const networkError = error as NetworkError;
        if (networkError?.type === 'AUTHENTICATION') return false;
        return failureCount < 2;
      },
    },
  },
});
