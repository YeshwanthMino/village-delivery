import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { listOrders } from '../ordersApi';

// Orders are per-user, so only fetch once signed in.
export const useOrdersQuery = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => listOrders(),
    enabled: isAuthenticated,
  });
};
