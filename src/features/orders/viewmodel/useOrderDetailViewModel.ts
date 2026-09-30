import { useLocalSearchParams } from 'expo-router';
import { useOrderDetailQuery } from '@/src/features/orders/data/queries/useOrderDetailQuery';

export const useOrderDetailViewModel = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const { data: order, isLoading, refetch, isRefetching } = useOrderDetailQuery(orderId);

  return { orderId, order, isLoading, refetch, isRefetching };
};
