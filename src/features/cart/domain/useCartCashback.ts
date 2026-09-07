// src/features/cart/domain/useCartCashback.ts
//
// Shared wiring behind the cashback progress shown on both the cart
// snackbar (CartSummaryCard) and the cart screen (CashbackProgressBanner,
// BillSummaryCard) — one hook, so every surface reads the same isVip flag
// and the same settings and cannot drift apart.

import { useAuthStore } from '@/src/core/store';
import { CASHBACK_SETTINGS } from './cashbackConfig';
import { getCartProgressState, type CartProgressState } from './cartProgress';

export function useCartCashback(grandTotalUnits: number): CartProgressState {
  const user = useAuthStore(state => state.user);
  const isVip = Boolean(user?.isVip);
  return getCartProgressState(grandTotalUnits, isVip, CASHBACK_SETTINGS);
}
