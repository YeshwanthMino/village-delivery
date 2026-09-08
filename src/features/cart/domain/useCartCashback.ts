// src/features/cart/domain/useCartCashback.ts
//
// Shared wiring behind the cashback progress shown on both the cart
// snackbar (CartSummaryCard) and the cart screen (CashbackProgressBanner,
// BillSummaryCard) — one hook, so every surface reads the same isVip flag
// and the same settings and cannot drift apart.

import { useAuthStore, useVillageStore } from '@/src/core/store';
import { CASHBACK_SETTINGS } from './cashbackConfig';
import { getCartProgressState, type CartProgressState } from './cartProgress';

export function useCartCashback(grandTotalUnits: number): CartProgressState {
  const user = useAuthStore(state => state.user);
  // A real membership (user.isVip) or one added to this cart from the VIP
  // membership card both count immediately — the card's own "double your
  // cashback" pitch applies to the order it was added on, not a future one.
  const vipAddedInCart = useVillageStore(state => state.vipAddedInCart);
  const isVip = Boolean(user?.isVip) || vipAddedInCart;
  return getCartProgressState(grandTotalUnits, isVip, CASHBACK_SETTINGS);
}
