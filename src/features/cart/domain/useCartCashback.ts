// src/features/cart/domain/useCartCashback.ts
//
// Shared wiring behind the cashback progress shown on both the cart
// snackbar (CartSummaryCard) and the cart screen (CashbackProgressBanner,
// BillSummaryCard) — one hook, so every surface reads the same isVip flag
// and the same settings and cannot drift apart.

import { useAuthStore, useVillageStore } from '@/src/core/store';
import { useCashbackSettings } from '@/src/core/store/useStoreConfigStore';
import { getCartProgressState, type CartProgressState } from './cartProgress';

export function useCartCashback(grandTotalUnits: number): CartProgressState {
  const user = useAuthStore(state => state.user);
  // A real membership (user.isVip) or one added to this cart from the VIP
  // membership card both count immediately — the card's own "double your
  // cashback" pitch applies to the order it was added on, not a future one.
  const vipAddedInCart = useVillageStore(state => state.vipAddedInCart);
  const isVip = Boolean(user?.isVip) || vipAddedInCart;
  // Store-config settings: the bundled defaults until the startup fetch lands,
  // then the fetched ones — this re-renders when they swap.
  const settings = useCashbackSettings();
  return getCartProgressState(grandTotalUnits, isVip, settings);
}
