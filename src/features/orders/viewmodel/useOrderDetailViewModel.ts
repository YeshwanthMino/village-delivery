import { useLocalSearchParams } from 'expo-router';
import { useVillageStore } from '@/src/core/store';

export const useOrderDetailViewModel = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const orders = useVillageStore(state => state.orders);
  const addToCart = useVillageStore(state => state.addToCart);
  const clearCart = useVillageStore(state => state.clearCart);

  const order = orders.find(o => o.id === orderId);

  const handleReorder = () => {
    clearCart();
    if (!order) return;
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        addToCart(item.productId);
      }
    }
  };

  return { orderId, order, handleReorder };
};
