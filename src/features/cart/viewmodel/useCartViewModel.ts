import { useMemo, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore, selectCartCount } from '@/src/core/store';
import { computeBill, getCartItems } from '@/src/features/cart/domain/bill';

export const useCartViewModel = () => {
  const cart = useVillageStore(state => state.cart);
  const cartSnapshots = useVillageStore(state => state.cartSnapshots);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const setQuantity = useVillageStore(state => state.setQuantity);
  const clearCart = useVillageStore(state => state.clearCart);
  const cartCount = useVillageStore(selectCartCount);
  const vipAdded = useVillageStore(state => state.vipAddedInCart);
  const addVipMembership = useVillageStore(state => state.addVipMembership);
  const removeVipMembership = useVillageStore(state => state.removeVipMembership);

  const [couponApplied, setCouponApplied] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const cartItems = useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);

  const bill = useMemo(() =>
    computeBill(cartItems, { couponApplied, vipAdded }),
    [cartItems, couponApplied, vipAdded]
  );

  return {
    cartItems,
    bill,
    cartCount,
    couponApplied,
    toggleCoupon: () => setCouponApplied(v => !v),
    vipAdded,
    addVipMembership,
    removeVipMembership,
    variantProduct,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
    addToCart,
    decFromCart,
    setQuantity,
    clearCart,
  };
};
