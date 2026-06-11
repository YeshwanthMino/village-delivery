import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { apiClient } from '@/src/base/services/remote/apiClient';
import { queryClient } from '@/src/base/query/queryClient';

export const useLogoutMutation = () => {
  const { reset } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      await apiClient.clearTokens();
    },
    onSuccess: () => {
      reset();
      queryClient.clear();
    },
  });
};
