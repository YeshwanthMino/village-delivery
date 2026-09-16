import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { getWallet } from '../walletApi';

// The wallet is per-user and the endpoint 401s without a token, so only fetch
// once signed in. Signing out resets the auth store, which disables this query.
export const useWalletQuery = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.wallet.detail(),
    queryFn: () => getWallet(),
    enabled: isAuthenticated,
  });
};
