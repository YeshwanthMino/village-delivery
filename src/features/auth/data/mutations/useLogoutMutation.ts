import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/src/core/store/useAuthStore';

export const useLogoutMutation = () => {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: logout,
  });
};
