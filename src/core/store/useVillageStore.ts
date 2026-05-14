/**
 * Village Store - Zustand
 * Manages cart, favourites, category selection, and sort state
 */
import { CartRecord, SortKey } from '@/src/base/types/village.types';
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';
import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Locale } from '@/src/base/constants/translations';

interface VillageState {
  cart: CartRecord;
  favs: Record<string, boolean>;
  selectedCat: string | null;
  sortKey: SortKey;
  locale: Locale;
}

interface VillageActions {
  addToCart: (key: string) => void;
  decFromCart: (key: string) => void;
  toggleFav: (productId: string) => void;
  setSelectedCat: (id: string | null) => void;
  setSortKey: (key: SortKey) => void;
  clearCart: () => void;
  setLocale: (locale: Locale) => Promise<void>;
  loadLocale: () => Promise<void>;
}

// Computed selector types (returned as derived values, not stored state)
interface VillageComputed {
  cartCount: () => number;
  cartTotal: () => number;
}

type VillageStore = VillageState & VillageActions & VillageComputed;

const initialState: VillageState = {
  cart: {},
  favs: {},
  selectedCat: null,
  sortKey: 'popular',
  locale: 'te',
};

/**
 * Parse a cart key into productId and optional variantIndex.
 * Keys with '-v' suffix like 'f1-v0' map to product 'f1', variantIndex 0.
 */
function parseCartKey(key: string): { productId: string; variantIndex: number | null } {
  const match = key.match(/^(.+)-v(\d+)$/);
  if (match) {
    return { productId: match[1], variantIndex: parseInt(match[2], 10) };
  }
  return { productId: key, variantIndex: null };
}

export const useVillageStore = create<VillageStore>((set, get) => ({
  ...initialState,

  // Cart actions
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

  setSelectedCat: (id) => set({ selectedCat: id }),

  setSortKey: (key) => set({ sortKey: key }),

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

  // Computed selectors
  cartCount: () => {
    const { cart } = get();
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  },

  cartTotal: () => {
    const { cart } = get();
    let total = 0;

    for (const [key, count] of Object.entries(cart)) {
      const { productId, variantIndex } = parseCartKey(key);
      const product = ALL_PRODUCTS.find((p) => p.id === productId);

      if (!product) continue;

      let price: number;
      if (variantIndex !== null && product.variants && product.variants[variantIndex] != null) {
        price = product.variants[variantIndex].price;
      } else {
        price = product.price;
      }

      total += price * count * 20; // rupees multiplier
    }

    return total;
  },
}));
