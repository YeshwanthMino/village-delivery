import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { MOCK_ORDERS } from '../mockOrders';

// queryFn body swaps to: apiClient.get(`${WebService.villageService}v1/orders/${orderId}`)
const fetchOrderDetail = async (orderId: string) =>
  MOCK_ORDERS.find(o => o.id === orderId) ?? null;

export const useOrderDetailQuery = (orderId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ''),
    queryFn: () => fetchOrderDetail(orderId!),
    enabled: !!orderId,
  });
