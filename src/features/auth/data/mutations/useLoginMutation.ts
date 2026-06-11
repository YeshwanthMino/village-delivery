import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';

interface LoginRequest {
  phoneNumber: string;
  otp: string;
}

// mutationFn body swaps to:
// apiClient.postWithoutAuth(`${WebService.villageService}v1/auth/login`, { phoneNumber, otp })
const performLogin = async ({ phoneNumber }: LoginRequest) => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  tokenType: 'Bearer',
  user: { id: '1', phoneNumber },
});

export const useLoginMutation = () => {
  const { setAuthenticated, setTokens, setUser } = useAuthStore();

  return useMutation({
    mutationFn: performLogin,
    onSuccess: async (data) => {
      await StoredPrefs.setAccessToken(data.accessToken);
      await StoredPrefs.setRefreshToken(data.refreshToken);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setAuthenticated(true);
    },
  });
};
