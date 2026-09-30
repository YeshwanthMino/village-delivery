// src/shared/components/WalletApplyCard.tsx
//
// Cart-screen wallet redemption card — mirrors VipMembershipCard's controlled
// add/remove pattern. The screen decides `applied` (defaulting it to true
// once a balance is known, see useCartViewModel) and owns the toggle; this
// component only renders whichever state it's told.
//
// POST /app/orders' `useWallet` flag is boolean/all-or-nothing — the backend
// decides the real amount deducted. `balance` here is this app's best-effort
// display estimate, from the same /app/wallet read WalletCard (Profile) uses.

import { Wallet } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { rupees } from '@/src/shared/utils/currency';

interface WalletApplyCardProps {
  /** Cashback balance, internal units. null/undefined/<=0 hides the card —
   *  covers "no wallet", "still loading", "query failed", and "logged out"
   *  alike, since none of those are confident enough to offer redemption on. */
  balance: number | null | undefined;
  /** Amount actually redeemed on this order (internal units, i.e.
   *  Bill.walletDiscount) — used only in the applied state's copy. Can be
   *  less than `balance` when the balance exceeds the order total (bill.ts
   *  caps the discount at the pre-wallet total). The not-applied state's
   *  "available" copy always shows the full `balance` regardless. */
  appliedAmount: number;
  applied: boolean;
  onApply: () => void;
  onRemove: () => void;
}

export const WalletApplyCard = ({ balance, appliedAmount, applied, onApply, onRemove }: WalletApplyCardProps) => {
  const { t } = useTranslation();

  if (balance == null || balance <= 0) return null;

  if (applied) {
    const appliedText = rupees(appliedAmount);
    return (
      <TouchableOpacity
        testID="wallet-apply-card"
        onPress={onRemove}
        activeOpacity={0.9}
        className="bg-amber-50 rounded-2xl p-3 flex-row items-center gap-3"
      >
        <View className="w-11 h-11 rounded-xl bg-amber-100 items-center justify-center">
          <Wallet size={20} color="#b8860b" />
        </View>
        <View className="flex-1">
          <Text className="text-amber-900 font-bold text-sm">{t('wallet_apply_title')}</Text>
          <Text className="text-amber-700 text-xs mt-0.5">
            {interpolate(t('wallet_apply_applied'), appliedText)}
          </Text>
        </View>
        <View className="border border-red-600 rounded-xl px-3.5 py-1.5">
          <Text className="text-red-600 font-bold text-sm">{t('remove')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const availableText = rupees(balance);
  return (
    <TouchableOpacity
      testID="wallet-apply-card"
      onPress={onApply}
      activeOpacity={0.9}
      className="bg-white border border-amber-200 rounded-2xl p-3 flex-row items-center gap-3"
    >
      <View className="w-11 h-11 rounded-xl bg-amber-50 items-center justify-center">
        <Wallet size={20} color="#d4a017" />
      </View>
      <View className="flex-1">
        <Text className="text-amber-950 font-bold text-sm">{t('wallet_apply_title')}</Text>
        <Text className="text-amber-700 text-xs mt-0.5">
          {interpolate(t('wallet_apply_available'), availableText)}
        </Text>
      </View>
      <View className="bg-green-600 border border-green-600 rounded-xl px-3.5 py-1.5">
        <Text className="text-white font-bold text-sm">{t('apply')}</Text>
      </View>
    </TouchableOpacity>
  );
};
