import { useMemo, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import {
  ALL_PRODUCTS,
  computeBill,
  getCartItems,
} from '@/src/features/home/data/static/villageData';

export const useCartViewModel = () => {
  const cart = useVillageStore(state => state.cart);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const clearCart = useVillageStore(state => state.clearCart);
  const cartCount = useVillageStore(state => state.cartCount());

  const [couponApplied, setCouponApplied] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const cartItems = useMemo(() => getCartItems(cart), [cart]);

  const bill = useMemo(() =>
    computeBill(cartItems, { couponApplied }),
    [cartItems, couponApplied]
  );

  // Top 8 products not in cart, sorted by rating × reviews
  const fbtProducts = useMemo(() => {
    const cartProductIds = new Set(cartItems.map(item => item.product.id));
    return ALL_PRODUCTS
      .filter(p => !cartProductIds.has(p.id))
      .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
      .slice(0, 8);
  }, [cartItems]);

  return {
    cartItems,
    bill,
    fbtProducts,
    cartCount,
    couponApplied,
    toggleCoupon: () => setCouponApplied(v => !v),
    variantProduct,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
    addToCart,
    decFromCart,
    clearCart,
  };
};
