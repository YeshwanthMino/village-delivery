// Order placement bypassed React Query entirely (called createOrder() directly
// from CartScreen), so a successful placement never invalidated the orders
// cache. A customer who had already opened "My Orders" earlier in the session
// would place an order, get navigated straight to that screen, and see the
// stale list without their new order until the 5-minute staleTime elapsed or
// they pulled to refresh.

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateOrderMutation } from '../useCreateOrderMutation';
import { queryKeys } from '@/src/base/query/queryKeys';
import * as orderApi from '../../orderApi';

// An explicit factory (rather than the bare auto-mock form) so Jest never
// loads the real orderApi.ts to infer its shape — that module imports the
// apiClient singleton, whose constructor kicks off unawaited background init
// and leaves an open async handle that stops the test process from exiting.
jest.mock('../../orderApi', () => ({ createOrder: jest.fn() }));
const mockCreateOrder = orderApi.createOrder as jest.Mock;

// Cleaned up after every test (see afterEach below): an un-torn-down
// QueryClient leaves its internal garbage-collector timer and the rendered
// tree open, which stops the Jest process from exiting even though the test
// itself has already passed.
let activeQueryClient: QueryClient | undefined;
let activeUnmount: (() => void) | undefined;

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      // gcTime: 0 means a settled mutation/query is dropped immediately
      // rather than via a scheduled timer — one less thing to leak.
      mutations: { retry: false, gcTime: 0 },
      queries: { retry: false, gcTime: 0 },
    },
  });
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(() => useCreateOrderMutation(), { wrapper });
  activeQueryClient = queryClient;
  activeUnmount = unmount;
  return { result, invalidateSpy };
}

const input = {
  products: [{ productId: 'p1', quantity: 1 }],
  address: 'addr1',
  paymentMethod: 'cod' as const,
};

describe('useCreateOrderMutation', () => {
  beforeEach(() => jest.clearAllMocks());

  afterEach(() => {
    activeUnmount?.();
    activeQueryClient?.clear();
    activeUnmount = undefined;
    activeQueryClient = undefined;
  });

  test('invalidates the orders cache when an order is actually placed', async () => {
    mockCreateOrder.mockResolvedValue({ orderId: 'o1', raw: {} });
    const { result, invalidateSpy } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.orders.all });
  });

  test('invalidates the wallet cache when an order is actually placed', async () => {
    mockCreateOrder.mockResolvedValue({ orderId: 'o1', raw: {} });
    const { result, invalidateSpy } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.wallet.all });
  });

  test('does not invalidate the wallet cache when the response is a stock conflict', async () => {
    mockCreateOrder.mockResolvedValue({
      orderId: null,
      raw: {},
      stockInfo: [{ productId: 'p1', availableStock: 0 }],
    });
    const { result, invalidateSpy } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: queryKeys.wallet.all });
  });

  test('does not invalidate when the response is a stock conflict, not a placed order', async () => {
    mockCreateOrder.mockResolvedValue({
      orderId: null,
      raw: {},
      stockInfo: [{ productId: 'p1', availableStock: 0 }],
    });
    const { result, invalidateSpy } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('does not invalidate when the request fails', async () => {
    mockCreateOrder.mockRejectedValue(new Error('network down'));
    const { result, invalidateSpy } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('does not retry a failed placement', async () => {
    // Retrying automatically would place a second, real order on a transient
    // network blip — POST /app/orders is not idempotent. Manual retry (the
    // checkout sheet's own flow) is the only safe way to try again.
    mockCreateOrder.mockRejectedValue(new Error('network down'));
    const { result } = renderWithClient();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });
});
