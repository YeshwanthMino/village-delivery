import { createOrder } from '../data/orderApi';
import { CreateOrderResult } from '../data/orderApi';

// Mock apiClient
jest.mock('@/src/base/services/remote/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

import { apiClient } from '@/src/base/services/remote/apiClient';

describe('Cart Checkout with Stock Conflicts', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createOrder returns stockInfo when API responds with stock conflicts', async () => {
    const stockConflictResponse = {
      stockInfo: [
        { productId: 'prod1', availableStock: 0 },
        { productId: 'prod2', availableStock: 2 },
      ],
    };

    mockApiClient.post.mockResolvedValue(stockConflictResponse);

    const result = await createOrder({
      products: [
        { productId: 'prod1', quantity: 2 },
        { productId: 'prod2', quantity: 5 },
      ],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBeNull();
    expect(result.stockInfo).toEqual(stockConflictResponse.stockInfo);
  });

  test('createOrder returns orderId when checkout succeeds', async () => {
    const successResponse = {
      _id: 'order123',
    };

    mockApiClient.post.mockResolvedValue(successResponse);

    const result = await createOrder({
      products: [{ productId: 'prod1', quantity: 2 }],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBe('order123');
    expect(result.stockInfo).toBeUndefined();
  });

  test('createOrder handles empty stockInfo array as success', async () => {
    const responseWithEmptyStockInfo = {
      _id: 'order124',
      stockInfo: [],
    };

    mockApiClient.post.mockResolvedValue(responseWithEmptyStockInfo);

    const result = await createOrder({
      products: [{ productId: 'prod1', quantity: 2 }],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBe('order124');
    // Empty stockInfo is not surfaced (treated as success)
    expect(result.stockInfo).toBeUndefined();
  });

  test('createOrder handles null/undefined stockInfo gracefully', async () => {
    const responseWithoutStockInfo = {
      _id: 'order125',
      stockInfo: null,
    };

    mockApiClient.post.mockResolvedValue(responseWithoutStockInfo);

    const result = await createOrder({
      products: [{ productId: 'prod1', quantity: 2 }],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBe('order125');
    expect(result.stockInfo).toBeUndefined();
  });

  test('createOrder includes all required fields in request', async () => {
    mockApiClient.post.mockResolvedValue({ _id: 'order126' });

    await createOrder({
      products: [
        { productId: 'prod1', quantity: 2, hasFreeItem: true },
        { productId: 'prod2', quantity: 1, hasFreeItem: false },
      ],
      address: 'addr123',
      paymentMethod: 'upi',
      scheduledOn: '2026-07-20',
      notes: 'Leave at gate',
      isPriority: true,
    });

    expect(mockApiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/app/orders'),
      expect.objectContaining({
        products: [
          { productId: 'prod1', quantity: 2, hasFreeItem: true },
          { productId: 'prod2', quantity: 1, hasFreeItem: false },
        ],
        address: 'addr123',
        preferredPaymentMethod: 'upi',
        scheduledOn: '2026-07-20',
        notes: 'Leave at gate',
        isPriority: true,
      })
    );
  });
});
