import { useCartStockStore } from '@/src/core/store/useCartStockStore';
import { checkCartStock } from '../data/stockApi';

import { apiClient } from '@/src/base/services/remote/apiClient';
import { ErrorMapper } from '@/src/base/services/remote/errorMapper';

jest.mock('@/src/base/services/remote/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('Cart Stock Verification Integration', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    useCartStockStore.setState({
      stockStatus: {},
      isLoading: false,
      error: null,
      lastChecked: null,
    });
    jest.clearAllMocks();
  });

  test('cart stock verification end-to-end flow with in-stock items', async () => {
    const mockResponse = {
      items: [
        { productId: 'prod-1', inStock: true, availableQuantity: 10 },
        { productId: 'prod-2', inStock: true, availableQuantity: 5 },
      ],
    };

    mockApiClient.post.mockResolvedValue(mockResponse);

    const cartItems = [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ];

    await useCartStockStore.getState().verifyCartStock(cartItems);

    const state = useCartStockStore.getState();
    expect(state.stockStatus['prod-1'].inStock).toBe(true);
    expect(state.stockStatus['prod-2'].inStock).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  test('cart stock verification with mixed stock status', async () => {
    const mockResponse = {
      items: [
        { productId: 'prod-1', inStock: true, availableQuantity: 3 },
        { productId: 'prod-2', inStock: false, availableQuantity: 0 },
        { productId: 'prod-3', inStock: true, availableQuantity: 1 },
      ],
    };

    mockApiClient.post.mockResolvedValue(mockResponse);

    const cartItems = [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 5 },
      { productId: 'prod-3', quantity: 1 },
    ];

    await useCartStockStore.getState().verifyCartStock(cartItems);

    const state = useCartStockStore.getState();
    expect(state.stockStatus['prod-1'].inStock).toBe(true);
    expect(state.stockStatus['prod-2'].inStock).toBe(false);
    expect(state.stockStatus['prod-3'].inStock).toBe(true);
  });

  test('cart stock verification error handling and retry', async () => {
    const errorMessage = 'Stock verification service unavailable';
    mockApiClient.post.mockRejectedValueOnce(new Error(errorMessage));

    const cartItems = [{ productId: 'prod-1', quantity: 2 }];

    try {
      await useCartStockStore.getState().verifyCartStock(cartItems);
    } catch {
      // Expected error
    }

    let state = useCartStockStore.getState();
    expect(state.error).toBe(errorMessage);
    expect(state.isLoading).toBe(false);

    // Retry with successful response
    const mockResponse = {
      items: [{ productId: 'prod-1', inStock: true, availableQuantity: 5 }],
    };

    mockApiClient.post.mockResolvedValueOnce(mockResponse);

    await useCartStockStore.getState().verifyCartStock(cartItems);

    state = useCartStockStore.getState();
    expect(state.error).toBeNull();
    expect(state.stockStatus['prod-1'].inStock).toBe(true);
  });

  test('cart stock verification timeout handling', async () => {
    // The real apiClient rejects with a mapped NetworkError, not an Axios error.
    mockApiClient.post.mockRejectedValue(ErrorMapper.createNetworkError('REQUEST_TIMED_OUT'));

    const cartItems = [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ];

    await useCartStockStore.getState().verifyCartStock(cartItems);

    const state = useCartStockStore.getState();
    // On timeout, checkCartStock assumes all items are in stock
    expect(state.stockStatus['prod-1'].inStock).toBe(true);
    expect(state.stockStatus['prod-2'].inStock).toBe(true);
    expect(state.error).toBeNull();
  });

  test('clear stock state resets verification', async () => {
    const mockResponse = {
      items: [{ productId: 'prod-1', inStock: true, availableQuantity: 5 }],
    };

    mockApiClient.post.mockResolvedValue(mockResponse);

    await useCartStockStore.getState().verifyCartStock([
      { productId: 'prod-1', quantity: 2 },
    ]);

    let state = useCartStockStore.getState();
    expect(state.stockStatus['prod-1']).toBeDefined();

    useCartStockStore.getState().clearStockState();

    state = useCartStockStore.getState();
    expect(state.stockStatus).toEqual({});
    expect(state.lastChecked).toBeNull();
  });

  test('cart stock verification persists until manual clear', async () => {
    const mockResponse = {
      items: [{ productId: 'prod-1', inStock: false, availableQuantity: 0 }],
    };

    mockApiClient.post.mockResolvedValue(mockResponse);

    await useCartStockStore.getState().verifyCartStock([
      { productId: 'prod-1', quantity: 2 },
    ]);

    const state = useCartStockStore.getState();
    const lastChecked = state.lastChecked;
    expect(lastChecked).not.toBeNull();

    // Status should remain the same until cleared
    const updatedState = useCartStockStore.getState();
    expect(updatedState.stockStatus['prod-1'].inStock).toBe(false);
    expect(updatedState.lastChecked).toBe(lastChecked);
  });

  test('partial response handled gracefully', async () => {
    // First call returns some items
    const firstResponse = {
      items: [{ productId: 'prod-1', inStock: true, availableQuantity: 5 }],
    };

    mockApiClient.post.mockResolvedValueOnce(firstResponse);

    await useCartStockStore.getState().verifyCartStock([
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ]);

    let state = useCartStockStore.getState();
    expect(state.stockStatus['prod-1']).toBeDefined();
    expect(state.stockStatus['prod-2']).toBeUndefined();

    // Second call with complete data
    const secondResponse = {
      items: [
        { productId: 'prod-1', inStock: true, availableQuantity: 5 },
        { productId: 'prod-2', inStock: true, availableQuantity: 3 },
      ],
    };

    mockApiClient.post.mockResolvedValueOnce(secondResponse);

    await useCartStockStore.getState().verifyCartStock([
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ]);

    state = useCartStockStore.getState();
    expect(state.stockStatus['prod-1']).toBeDefined();
    expect(state.stockStatus['prod-2']).toBeDefined();
  });

  test('empty cart does not trigger API call', async () => {
    await useCartStockStore.getState().verifyCartStock([]);

    expect(mockApiClient.post).not.toHaveBeenCalled();

    const state = useCartStockStore.getState();
    expect(state.stockStatus).toEqual({});
  });
});
