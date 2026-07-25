import { CartRecord, CartSnapshot, CartSnapshotRecord } from '@/src/base/types/village.types';
import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Locale } from '@/src/base/constants/translations';
import { parseCartKey } from '@/src/features/cart/domain/cartKey';

interface VillageState {
  cart: CartRecord;
  cartSnapshots: CartSnapshotRecord;
  /** Per product id, the cart key of the variant touched most recently. Cards
   *  mirror that line's price and pack size; the cart itself does not use it. */
  lastVariantKey: Record<string, string>;
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
  lastVariantKey: {},
  favs: {},
  locale: 'en',
};

interface PersistedCart {
  cart: CartRecord;
  cartSnapshots: CartSnapshotRecord;
  lastVariantKey?: Record<string, string>;
}

function isPersistedCart(value: unknown): value is PersistedCart {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PersistedCart>;
  return typeof candidate.cart === 'object' && candidate.cart !== null;
}

/**
 * A line just left the cart. If it was the one its product pointed at, point the
 * product at any line it still has, or drop the entry when it has none.
 */
function releaseLastVariant(
  lastVariantKey: Record<string, string>,
  cart: CartRecord,
  productId: string,
  removedKey: string,
): Record<string, string> {
  if (lastVariantKey[productId] !== removedKey) return lastVariantKey;
  const fallback = Object.keys(cart).find((k) => parseCartKey(k).productId === productId);
  const next = { ...lastVariantKey };
  if (fallback) next[productId] = fallback;
  else delete next[productId];
  return next;
}

export const useVillageStore = create<VillageStore>((set, get) => ({
  ...initialState,

  hydrateCart: async () => {
    try {
      const saved = await StoredPrefs.getCustomData<unknown>(StorageKeys.CART);
      if (!isPersistedCart(saved)) return;
      const cartSnapshots = saved.cartSnapshots ?? {};
      // Backfill and prune in one pass: installs persisted before this field
      // existed hydrate with no pointer at all, and any pointer — old or new —
      // can name a key a later write already dropped from the cart. Either way,
      // a product with lines in the cart must point at a real one of them.
      const lastVariantKey = { ...(saved.lastVariantKey ?? {}) };
      for (const key in saved.cart) {
        const { productId } = parseCartKey(key);
        const pointed = lastVariantKey[productId];
        if (!pointed || !(pointed in saved.cart)) lastVariantKey[productId] = key;
      }
      set({ cart: saved.cart, cartSnapshots, lastVariantKey });
    } catch {
      // A missing or unreadable cart is not worth failing app start over.
    }
  },

  addToCart: (key, snapshot, maxQuantity) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      // Nothing changed, so nothing is touched: the pointer stays wherever it
      // was, exactly like a rejected add never happened.
      if (maxQuantity !== undefined && current >= maxQuantity) {
        return state;
      }
      const { productId } = parseCartKey(key);
      return {
        cart: {
          ...state.cart,
          [key]: current + 1,
        },
        cartSnapshots:
          snapshot && !state.cartSnapshots[key]
            ? { ...state.cartSnapshots, [key]: snapshot }
            : state.cartSnapshots,
        lastVariantKey: { ...state.lastVariantKey, [productId]: key },
      };
    }),

  decFromCart: (key) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      // Nothing to remove — a no-op write would still fire a notification and
      // a persist call for a line that was never there.
      if (current === 0) return state;
      const { productId } = parseCartKey(key);
      if (current <= 1) {
        const { [key]: _removed, ...cart } = state.cart;
        const { [key]: _snap, ...cartSnapshots } = state.cartSnapshots;
        return {
          cart,
          cartSnapshots,
          lastVariantKey: releaseLastVariant(state.lastVariantKey, cart, productId, key),
        };
      }
      return {
        cart: { ...state.cart, [key]: current - 1 },
        lastVariantKey: { ...state.lastVariantKey, [productId]: key },
      };
    }),

  setQuantity: (key, quantity, maxQuantity) =>
    set((state) => {
      const capped = maxQuantity !== undefined ? Math.min(quantity, maxQuantity) : quantity;
      const { productId } = parseCartKey(key);

      if (capped <= 0) {
        const { [key]: _removed, ...cart } = state.cart;
        const { [key]: _snap, ...cartSnapshots } = state.cartSnapshots;
        return {
          cart,
          cartSnapshots,
          lastVariantKey: releaseLastVariant(state.lastVariantKey, cart, productId, key),
        };
      }

      return {
        cart: { ...state.cart, [key]: capped },
        lastVariantKey: { ...state.lastVariantKey, [productId]: key },
      };
    }),

  toggleFav: (productId) =>
    set((state) => ({
      favs: {
        ...state.favs,
        [productId]: !state.favs[productId],
      },
    })),

  clearCart: () => set({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }),

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

/**
 * Both selectors below are curried — `selector(productId)(state)` — so a
 * component can subscribe with a stable per-product selector. That's only
 * safe under zustand 5 + React 19 because each returns a value stable under
 * `Object.is` across notifications that don't actually change it: a number,
 * or `state.cartSnapshots[key]`, an object reference untouched by unrelated
 * spreads. A future curried selector that builds and returns a fresh
 * array/object on every call would re-render its subscriber on every store
 * notification — the safety is a property of the return value, not the
 * curried shape.
 */

// Every cart line belonging to one product, summed (see parseCartKey for the
// key format). Grouped once per `cart` identity, same rationale as
// selectCartCount above: this selector runs once per mounted product card —
// dozens in a category grid — on every notification, cart-related or not.
let groupedCart: CartRecord | null = null;
let productTotals: Record<string, number> = {};

export const selectProductCartCount =
  (productId: string) =>
  (state: VillageStore): number => {
    if (state.cart !== groupedCart) {
      groupedCart = state.cart;
      productTotals = {};
      for (const key in state.cart) {
        const owner = parseCartKey(key).productId;
        productTotals[owner] = (productTotals[owner] ?? 0) + state.cart[key];
      }
    }
    return productTotals[productId] ?? 0;
  };

/** The snapshot of the variant this product last had added or changed, if any. */
export const selectLastVariantSnapshot =
  (productId: string) =>
  (state: VillageStore): CartSnapshot | undefined => {
    const key = state.lastVariantKey[productId];
    return key ? state.cartSnapshots[key] : undefined;
  };

// Persist the cart on every change rather than inside each action, so no future
// mutation can forget to save. Fire-and-forget keeps the actions synchronous;
// a failed write just means the cart is not restored after process death.
useVillageStore.subscribe((state, prev) => {
  if (
    state.cart === prev.cart &&
    state.cartSnapshots === prev.cartSnapshots &&
    state.lastVariantKey === prev.lastVariantKey
  ) {
    return;
  }
  void StoredPrefs.setCustomData(StorageKeys.CART, {
    cart: state.cart,
    cartSnapshots: state.cartSnapshots,
    lastVariantKey: state.lastVariantKey,
  }).catch(() => {});
});
