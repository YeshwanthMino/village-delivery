import { create } from 'zustand';
import { checkCartStock } from '@/src/features/cart/data/stockApi';

export interface StockStatus {
  inStock: boolean;
  availableQuantity?: number;
}

/**
 * Address a cart line's stock. The backend tracks inventory per variant, so a
 * cart holding two variants of one product (e.g. Toor Dal 500g and 1kg) needs
 * two distinct entries — keying by productId alone let one overwrite the other
 * and showed both rows the same availability.
 *
 * Use this on both sides of `stockStatus`: writes in `verifyCartStock` and reads
 * in the cart UI must agree.
 */
export function stockKey(item: { productId: string; variantId?: string }): string {
  return item.variantId ?? item.productId;
}

interface CartStockState {
  /** Keyed by `stockKey(item)`, not by productId. */
  stockStatus: Record<string, StockStatus>;
  isLoading: boolean;
  error: string | null;
  lastChecked: number | null;
}

interface CartStockActions {
  verifyCartStock: (items: { productId: string; variantId?: string; quantity: number }[]) => Promise<void>;
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
        stockStatusMap[stockKey(item)] = {
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
  selectIsInStock: (item: { productId: string; variantId?: string }) => (state: CartStockStore) =>
    state.stockStatus[stockKey(item)]?.inStock ?? true,
};
