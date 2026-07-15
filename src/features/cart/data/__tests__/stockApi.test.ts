import { checkCartStock } from '../stockApi';

jest.mock('@/src/base/services/remote/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

import { apiClient } from '@/src/base/services/remote/apiClient';

describe('Stock API', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('checkCartStock returns stock status for items with {items: []} format', async () => {
    const mockResponse = {
      items: [
        { productId: 'prod1', inStock: true, availableQuantity: 5 },
        { productId: 'prod2', inStock: false, availableQuantity: 0 },
      ],
    };

    mockApiClient.post.mockResolvedValue(mockResponse);

    const result = await checkCartStock([
      { productId: 'prod1', quantity: 2 },
      { productId: 'prod2', quantity: 1 },
    ]);

    expect(result).toEqual(mockResponse);
    expect(mockApiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/app/orders/check-stock'),
      { items: [{ productId: 'prod1', quantity: 2 }, { productId: 'prod2', quantity: 1 }] },
      { timeout: 5000 }
    );
  });

  test('checkCartStock handles direct array response format', async () => {
    const mockResponse = [
      { productId: 'prod1', availableStock: 5 },
      { productId: 'prod2', availableStock: 0 },
    ];

    mockApiClient.post.mockResolvedValue(mockResponse);

    const result = await checkCartStock([
      { productId: 'prod1', quantity: 2 },
      { productId: 'prod2', quantity: 1 },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      productId: 'prod1',
      inStock: true,
      availableQuantity: 5,
    });
    expect(result.items[1]).toEqual({
      productId: 'prod2',
      inStock: false,
      availableQuantity: 0,
    });
  });

  test('checkCartStock returns empty items for empty input', async () => {
    const result = await checkCartStock([]);

    expect(result.items).toEqual([]);
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  test('checkCartStock handles timeout gracefully by assuming all items in stock', async () => {
    const timeoutError = new Error('Request timeout');
    (timeoutError as any).code = 'ECONNABORTED';

    mockApiClient.post.mockRejectedValue(timeoutError);

    const result = await checkCartStock([
      { productId: 'prod1', quantity: 2 },
      { productId: 'prod2', quantity: 3 },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      productId: 'prod1',
      inStock: true,
      availableQuantity: 2,
    });
    expect(result.items[1]).toEqual({
      productId: 'prod2',
      inStock: true,
      availableQuantity: 3,
    });
  });

  test('checkCartStock handles timeout message in error', async () => {
    const timeoutError = new Error('timeout');

    mockApiClient.post.mockRejectedValue(timeoutError);

    const result = await checkCartStock([{ productId: 'prod1', quantity: 2 }]);

    expect(result.items[0].inStock).toBe(true);
  });

  test('checkCartStock throws on non-timeout network error', async () => {
    const networkError = new Error('Network connection failed');

    mockApiClient.post.mockRejectedValue(networkError);

    await expect(
      checkCartStock([{ productId: 'prod1', quantity: 2 }])
    ).rejects.toThrow('Network connection failed');
  });

  test('checkCartStock throws on invalid response format', async () => {
    mockApiClient.post.mockResolvedValue({ invalidField: [] });

    await expect(
      checkCartStock([{ productId: 'prod1', quantity: 2 }])
    ).rejects.toThrow('Invalid stock check response format');
  });

  test('checkCartStock throws when response items is not an array', async () => {
    mockApiClient.post.mockResolvedValue({ items: 'not-an-array' });

    await expect(
      checkCartStock([{ productId: 'prod1', quantity: 2 }])
    ).rejects.toThrow('Invalid stock check response format');
  });

  test('checkCartStock includes correct endpoint in post call', async () => {
    mockApiClient.post.mockResolvedValue({ items: [] });

    await checkCartStock([{ productId: 'prod1', quantity: 1 }]);

    const postCall = mockApiClient.post.mock.calls[0];
    expect(postCall[0]).toContain('/app/orders/check-stock');
  });
});
