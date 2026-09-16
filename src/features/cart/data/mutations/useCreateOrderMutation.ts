import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { createOrder, CreateOrderInput } from '../orderApi';

/**
 * Places an order and, only on an actual placement (an `orderId` came back —
 * not a stock-conflict response), invalidates the orders cache so a customer
 * landing on the Orders screen right after checkout sees the order they just
 * placed instead of a stale cached list.
 *
 * Deliberately does not enable retries: POST /app/orders is not idempotent, so
 * an automatic retry on a transient network blip would place a second, real
 * order. Manual retry — the checkout sheet's own retry flow — calls this again
 * explicitly, which is the only safe way to retry here.
 */
export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (result) => {
      if (result.orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        // The backend, not this app, decides how much wallet balance a
        // useWallet:true order actually consumed — refetch so the next read
        // (Cart or Profile) shows the real post-order balance.
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
      }
    },
  });
}
