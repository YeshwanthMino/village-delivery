import { useLocalSearchParams } from 'expo-router';
import { useVillageStore } from '@/src/core/store';
import { useOrderDetailQuery } from '@/src/features/orders/data/queries/useOrderDetailQuery';

export const useOrderDetailViewModel = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const addToCart = useVillageStore(state => state.addToCart);
  const clearCart = useVillageStore(state => state.clearCart);

  const { data: order, isLoading } = useOrderDetailQuery(orderId);

  const handleReorder = () => {
    clearCart();
    if (!order) return;
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        addToCart(item.productId);
      }
    }
  };

  return { orderId, order, isLoading, handleReorder };
};
