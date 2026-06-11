import { CartRecord, Order } from '@/src/base/types/village.types';
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';
import { MOCK_ORDERS } from '@/src/features/orders/data/mockOrders';
import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Locale } from '@/src/base/constants/translations';

interface VillageState {
  cart: CartRecord;
  favs: Record<string, boolean>;
  locale: Locale;
  orders: Order[];
  dynamicPrices: Record<string, number>;
}

interface VillageActions {
  addToCart: (key: string) => void;
  decFromCart: (key: string) => void;
  toggleFav: (productId: string) => void;
  clearCart: () => void;
  setLocale: (locale: Locale) => Promise<void>;
  loadLocale: () => Promise<void>;
  registerDynamicPrices: (prices: Record<string, number>) => void;
}

interface VillageComputed {
  cartCount: () => number;
  cartTotal: () => number;
}

type VillageStore = VillageState & VillageActions & VillageComputed;

const initialState: VillageState = {
  cart: {},
  favs: {},
  locale: 'te',
  orders: [], // TEMP: empty for UI testing
  dynamicPrices: {},
};

function parseCartKey(key: string): { productId: string; variantIndex: number | null } {
  const match = key.match(/^(.+)-v(\d+)$/);
  if (match) {
    return { productId: match[1], variantIndex: parseInt(match[2], 10) };
  }
  return { productId: key, variantIndex: null };
}

export const useVillageStore = create<VillageStore>((set, get) => ({
  ...initialState,

  addToCart: (key) =>
    set((state) => ({
      cart: {
        ...state.cart,
        [key]: (state.cart[key] ?? 0) + 1,
      },
    })),

  decFromCart: (key) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      if (current <= 1) {
        const { [key]: _removed, ...rest } = state.cart;
        return { cart: rest };
      }
      return { cart: { ...state.cart, [key]: current - 1 } };
    }),

  toggleFav: (productId) =>
    set((state) => ({
      favs: {
        ...state.favs,
        [productId]: !state.favs[productId],
      },
    })),

  clearCart: () => set({ cart: {} }),

  setLocale: async (locale) => {
    set({ locale });
    await StoredPrefs.setCustomData(StorageKeys.LOCALE, locale);
  },

  loadLocale: async () => {
    const saved = await StoredPrefs.getCustomData<Locale>(StorageKeys.LOCALE);
    if (saved === 'te' || saved === 'en') {
      set({ locale: saved });
    }
  },

  registerDynamicPrices: (prices) =>
    set((state) => ({ dynamicPrices: { ...state.dynamicPrices, ...prices } })),

  cartCount: () => {
    const { cart } = get();
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  },

  cartTotal: () => {
    const { cart, dynamicPrices } = get();
    let total = 0;
    for (const [key, count] of Object.entries(cart)) {
      const { productId, variantIndex } = parseCartKey(key);
      // Dynamic (API) products: real rupee price, no ×20 multiplier.
      if (variantIndex === null && dynamicPrices[productId] != null) {
        total += dynamicPrices[productId] * count;
        continue;
      }
      const product = ALL_PRODUCTS.find((p) => p.id === productId);
      if (!product) continue;
      let price: number;
      if (variantIndex !== null && product.variants && product.variants[variantIndex] != null) {
        price = product.variants[variantIndex].price;
      } else {
        price = product.price;
      }
      total += price * count * 20;
    }
    return total;
  },
}));
