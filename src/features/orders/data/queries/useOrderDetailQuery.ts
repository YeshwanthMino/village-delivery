import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { getOrderDetail } from '../ordersApi';

export const useOrderDetailQuery = (orderId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ''),
    queryFn: ({ signal }) => getOrderDetail(orderId!, signal),
    enabled: !!orderId,
  });
