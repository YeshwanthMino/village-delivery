import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { MOCK_ORDERS } from '../mockOrders';

// queryFn body swaps to: apiClient.get(`${WebService.villageService}v1/orders`)
const fetchOrders = async () => MOCK_ORDERS;

export const useOrdersQuery = () =>
  useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: fetchOrders,
  });
