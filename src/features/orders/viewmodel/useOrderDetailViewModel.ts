import { useLocalSearchParams } from 'expo-router';
import { useVillageStore } from '@/src/core/store';
import { useOrderDetailQuery } from '@/src/features/orders/data/queries/useOrderDetailQuery';
import { orderItemSnapshot } from '@/src/features/cart/domain/reorder';

export const useOrderDetailViewModel = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const addToCart = useVillageStore(state => state.addToCart);
  const setQuantity = useVillageStore(state => state.setQuantity);
  const clearCart = useVillageStore(state => state.clearCart);

  const { data: order, isLoading, refetch, isRefetching } = useOrderDetailQuery(orderId);

  const handleReorder = () => {
    clearCart();
    if (!order) return;
    for (const item of order.items) {
      const snapshot = orderItemSnapshot(item);
      addToCart(snapshot.key, snapshot);
      setQuantity(snapshot.key, item.quantity);
    }
  };

  return { orderId, order, isLoading, handleReorder, refetch, isRefetching };
};
