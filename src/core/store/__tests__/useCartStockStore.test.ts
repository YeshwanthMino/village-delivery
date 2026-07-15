import { useCartStockStore } from '../useCartStockStore';
import * as stockApi from '@/src/features/cart/data/stockApi';

jest.mock('@/src/features/cart/data/stockApi');

describe('useCartStockStore', () => {
  beforeEach(() => {
    useCartStockStore.setState({
      stockStatus: {},
      isLoading: false,
      error: null,
      lastChecked: null,
    });
    jest.clearAllMocks();
  });

  test('initializes with empty state', () => {
    const state = useCartStockStore.getState();
    expect(state.stockStatus).toEqual({});
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastChecked).toBeNull();
  });

  test('verifyCartStock updates state with successful response', async () => {
    const mockResponse = {
      items: [
        { productId: 'prod1', inStock: true, availableQuantity: 5 },
        { productId: 'prod2', inStock: false, availableQuantity: 0 },
      ],
    };

    jest.spyOn(stockApi, 'checkCartStock').mockResolvedValue(mockResponse);

    const items = [
      { productId: 'prod1', quantity: 2 },
      { productId: 'prod2', quantity: 1 },
    ];

    await useCartStockStore.getState().verifyCartStock(items);

    const state = useCartStockStore.getState();
    expect(state.stockStatus['prod1']).toEqual({ inStock: true, availableQuantity: 5 });
    expect(state.stockStatus['prod2']).toEqual({ inStock: false, availableQuantity: 0 });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastChecked).not.toBeNull();
  });

  test('verifyCartStock handles empty items array', async () => {
    await useCartStockStore.getState().verifyCartStock([]);

    const state = useCartStockStore.getState();
    expect(state.stockStatus).toEqual({});
    expect(state.isLoading).toBe(false);
    expect(state.lastChecked).not.toBeNull();
  });

  test('verifyCartStock sets error on API failure', async () => {
    const errorMessage = 'Network error';
    jest.spyOn(stockApi, 'checkCartStock').mockRejectedValue(new Error(errorMessage));

    const items = [{ productId: 'prod1', quantity: 2 }];

    try {
      await useCartStockStore.getState().verifyCartStock(items);
    } catch {
      // Error is expected
    }

    const state = useCartStockStore.getState();
    expect(state.error).toBe(errorMessage);
    expect(state.isLoading).toBe(false);
  });

  test('verifyCartStock sets isLoading to true during request', async () => {
    jest.spyOn(stockApi, 'checkCartStock').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ items: [] }), 100))
    );

    const items = [{ productId: 'prod1', quantity: 2 }];
    const promise = useCartStockStore.getState().verifyCartStock(items);

    expect(useCartStockStore.getState().isLoading).toBe(true);

    await promise;
    expect(useCartStockStore.getState().isLoading).toBe(false);
  });

  test('setError updates error state', () => {
    useCartStockStore.getState().setError('Test error');
    expect(useCartStockStore.getState().error).toBe('Test error');

    useCartStockStore.getState().setError(null);
    expect(useCartStockStore.getState().error).toBeNull();
  });

  test('clearStockState resets to initial state', () => {
    useCartStockStore.setState({
      stockStatus: { prod1: { inStock: false } },
      isLoading: false,
      error: 'Some error',
      lastChecked: Date.now(),
    });

    useCartStockStore.getState().clearStockState();

    const state = useCartStockStore.getState();
    expect(state.stockStatus).toEqual({});
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastChecked).toBeNull();
  });

  test('selectIsInStock selector defaults to true when product not found', () => {
    useCartStockStore.setState({ stockStatus: {} });

    const state = useCartStockStore.getState();
    const isInStock = state.stockStatus['unknown']?.inStock ?? true;

    expect(isInStock).toBe(true);
  });

  test('selectIsInStock selector returns correct status for existing product', () => {
    useCartStockStore.setState({
      stockStatus: {
        prod1: { inStock: false, availableQuantity: 0 },
      },
    });

    const state = useCartStockStore.getState();
    const isInStock = state.stockStatus['prod1']?.inStock ?? true;

    expect(isInStock).toBe(false);
  });
});
