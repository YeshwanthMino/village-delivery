import { CartRecord, CartSnapshot, CartSnapshotRecord } from '@/src/base/types/village.types';
import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Locale } from '@/src/base/constants/translations';

interface VillageState {
  cart: CartRecord;
  cartSnapshots: CartSnapshotRecord;
  favs: Record<string, boolean>;
  locale: Locale;
}

interface VillageActions {
  addToCart: (key: string, snapshot?: CartSnapshot, maxQuantity?: number) => void;
  decFromCart: (key: string) => void;
  /** Set a line to an exact quantity in a single write. Prefer this over looping
   *  addToCart/decFromCart: each of those is its own store notification, so
   *  adjusting by n fired n render passes across every subscriber. */
  setQuantity: (key: string, quantity: number, maxQuantity?: number) => void;
  toggleFav: (productId: string) => void;
  clearCart: () => void;
  setLocale: (locale: Locale) => Promise<void>;
  loadLocale: () => Promise<void>;
  /** Restore the persisted cart. Call once on app start. */
  hydrateCart: () => Promise<void>;
}

type VillageStore = VillageState & VillageActions;

const initialState: VillageState = {
  cart: {},
  cartSnapshots: {},
  favs: {},
  locale: 'en',
};

interface PersistedCart {
  cart: CartRecord;
  cartSnapshots: CartSnapshotRecord;
}

function isPersistedCart(value: unknown): value is PersistedCart {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PersistedCart>;
  return typeof candidate.cart === 'object' && candidate.cart !== null;
}

export const useVillageStore = create<VillageStore>((set, get) => ({
  ...initialState,

  hydrateCart: async () => {
    try {
      const saved = await StoredPrefs.getCustomData<unknown>(StorageKeys.CART);
      if (!isPersistedCart(saved)) return;
      set({ cart: saved.cart, cartSnapshots: saved.cartSnapshots ?? {} });
    } catch {
      // A missing or unreadable cart is not worth failing app start over.
    }
  },

  addToCart: (key, snapshot, maxQuantity) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      if (maxQuantity !== undefined && current >= maxQuantity) {
        return state;
      }
      return {
        cart: {
          ...state.cart,
          [key]: current + 1,
        },
        cartSnapshots:
          snapshot && !state.cartSnapshots[key]
            ? { ...state.cartSnapshots, [key]: snapshot }
            : state.cartSnapshots,
      };
    }),

  decFromCart: (key) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      if (current <= 1) {
        const { [key]: _removed, ...rest } = state.cart;
        const { [key]: _snap, ...restSnapshots } = state.cartSnapshots;
        return { cart: rest, cartSnapshots: restSnapshots };
      }
      return { cart: { ...state.cart, [key]: current - 1 } };
    }),

  setQuantity: (key, quantity, maxQuantity) =>
    set((state) => {
      const capped = maxQuantity !== undefined ? Math.min(quantity, maxQuantity) : quantity;

      if (capped <= 0) {
        const { [key]: _removed, ...cart } = state.cart;
        const { [key]: _snap, ...cartSnapshots } = state.cartSnapshots;
        return { cart, cartSnapshots };
      }

      return { cart: { ...state.cart, [key]: capped } };
    }),

  toggleFav: (productId) =>
    set((state) => ({
      favs: {
        ...state.favs,
        [productId]: !state.favs[productId],
      },
    })),

  clearCart: () => set({ cart: {}, cartSnapshots: {} }),

  setLocale: async (locale) => {
    set({ locale });
    await StoredPrefs.setCustomData(StorageKeys.LOCALE, locale);
  },

  loadLocale: async () => {
    // MVP ships English only. Ignore any previously-saved 'te' so existing
    // installs migrate to English. Restore the 'te' branch when Telugu returns.
    const saved = await StoredPrefs.getCustomData<Locale>(StorageKeys.LOCALE);
    if (saved === 'en') {
      set({ locale: saved });
    }
  }
}));

/**
 * Total item count across the cart.
 *
 * Zustand runs every selector on every store notification, so calling a
 * `cartCount()` method inside a selector re-reduced the whole cart on unrelated
 * updates — locale changes, favourite toggles — once per mounted view model.
 * Seven of them subscribe. Caching on `cart` identity makes those a pointer
 * comparison.
 */
let countedCart: CartRecord | null = null;
let countedTotal = 0;

export const selectCartCount = (state: VillageStore): number => {
  if (state.cart !== countedCart) {
    countedCart = state.cart;
    countedTotal = Object.values(state.cart).reduce((sum, count) => sum + count, 0);
  }
  return countedTotal;
};

// Persist the cart on every change rather than inside each action, so no future
// mutation can forget to save. Fire-and-forget keeps the actions synchronous;
// a failed write just means the cart is not restored after process death.
useVillageStore.subscribe((state, prev) => {
  if (state.cart === prev.cart && state.cartSnapshots === prev.cartSnapshots) return;
  void StoredPrefs.setCustomData(StorageKeys.CART, {
    cart: state.cart,
    cartSnapshots: state.cartSnapshots,
  }).catch(() => {});
});
