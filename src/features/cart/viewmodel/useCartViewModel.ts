import { useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore, selectCartCount } from '@/src/core/store';
import { computeBill, getCartItems } from '@/src/features/cart/domain/bill';
import { useWalletQuery } from '@/src/features/wallet/data/queries/useWalletQuery';

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

  // Real /app/wallet balance — always revalidated on mount since this
  // directly affects real money at checkout (see useWalletQuery's alwaysFresh).
  const { data: wallet } = useWalletQuery({ alwaysFresh: true });
  const walletBalance = wallet && wallet.cashback > 0 ? wallet.cashback : null;

  const [walletApplied, setWalletApplied] = useState(false);
  // Applies the balance automatically the first time it's known to be
  // positive, and only then — so a customer who taps Remove keeps it removed
  // even if the query refetches again in the background this session.
  const walletAutoAppliedOnce = useRef(false);
  useEffect(() => {
    if (!walletAutoAppliedOnce.current && walletBalance != null) {
      walletAutoAppliedOnce.current = true;
      setWalletApplied(true);
    }
  }, [walletBalance]);

  const cartItems = useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);

  const walletAppliedEffective = walletApplied && walletBalance != null;

  const bill = useMemo(() =>
    computeBill(cartItems, {
      couponApplied,
      vipAdded,
      walletApplied: walletAppliedEffective,
      walletBalance: walletBalance ?? 0,
    }),
    [cartItems, couponApplied, vipAdded, walletAppliedEffective, walletBalance]
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
    walletBalance,
    walletApplied: walletAppliedEffective,
    applyWallet: () => setWalletApplied(true),
    removeWallet: () => setWalletApplied(false),
    variantProduct,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
    addToCart,
    decFromCart,
    setQuantity,
    clearCart,
  };
};
