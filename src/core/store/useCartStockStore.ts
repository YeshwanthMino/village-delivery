import { create } from 'zustand';
import { checkCartStock } from '@/src/features/cart/data/stockApi';

export interface StockStatus {
  inStock: boolean;
  availableQuantity?: number;
}

interface CartStockState {
  stockStatus: Record<string, StockStatus>;
  isLoading: boolean;
  error: string | null;
  lastChecked: number | null;
}

interface CartStockActions {
  verifyCartStock: (items: Array<{ productId: string; quantity: number }>) => Promise<void>;
  setError: (error: string | null) => void;
  clearStockState: () => void;
}

type CartStockStore = CartStockState & CartStockActions;

const initialState: CartStockState = {
  stockStatus: {},
  isLoading: false,
  error: null,
  lastChecked: null,
};

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed to verify stock';
}

export const useCartStockStore = create<CartStockStore>((set) => ({
  ...initialState,

  setError: (error) => set({ error }),

  clearStockState: () => set(initialState),

  verifyCartStock: async (items) => {
    if (items.length === 0) {
      set({ stockStatus: {}, lastChecked: Date.now() });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await checkCartStock(items);

      const stockStatusMap: Record<string, StockStatus> = {};
      response.items.forEach((item) => {
        stockStatusMap[item.productId] = {
          inStock: item.inStock,
          availableQuantity: item.availableQuantity,
        };
      });

      set({
        stockStatus: stockStatusMap,
        isLoading: false,
        error: null,
        lastChecked: Date.now(),
      });
    } catch (error) {
      const message = errMessage(error);
      set({
        isLoading: false,
        error: message,
        lastChecked: Date.now(),
      });
      throw error;
    }
  },
}));

export const cartStockSelectors = {
  selectStockStatus: (state: CartStockStore) => state.stockStatus,
  selectIsLoading: (state: CartStockStore) => state.isLoading,
  selectError: (state: CartStockStore) => state.error,
  selectLastChecked: (state: CartStockStore) => state.lastChecked,
  selectIsInStock: (productId: string) => (state: CartStockStore) =>
    state.stockStatus[productId]?.inStock ?? true,
};
