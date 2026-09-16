import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { getWallet } from '../walletApi';

interface UseWalletQueryOptions {
  /** Force a fresh server fetch on every mount instead of trusting a cached
   *  value — for surfaces (like the Cart screen) where the balance directly
   *  affects real money and a figure cached from an earlier Profile visit
   *  would be wrong to trust. Cached data (if any) still paints instantly;
   *  this only controls whether a revalidation fires alongside it. */
  alwaysFresh?: boolean;
}

// The wallet is per-user and the endpoint 401s without a token, so only fetch
// once signed in. Signing out resets the auth store, which disables this query.
export const useWalletQuery = (opts?: UseWalletQueryOptions) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.wallet.detail(),
    queryFn: () => getWallet(),
    enabled: isAuthenticated,
    refetchOnMount: opts?.alwaysFresh ? 'always' : undefined,
  });
};
