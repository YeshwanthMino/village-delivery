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
  applied: boolean;
  onApply: () => void;
  onRemove: () => void;
}

export const WalletApplyCard = ({ balance, applied, onApply, onRemove }: WalletApplyCardProps) => {
  const { t } = useTranslation();

  if (balance == null || balance <= 0) return null;

  const amountText = rupees(balance);

  if (applied) {
    return (
      <TouchableOpacity
        testID="wallet-apply-card"
        onPress={onRemove}
        activeOpacity={0.9}
        className="bg-cyan-50 border border-cyan-300 rounded-2xl p-3 flex-row items-center gap-3"
      >
        <View className="w-11 h-11 rounded-xl bg-cyan-100 items-center justify-center">
          <Wallet size={20} color="#0e7490" />
        </View>
        <View className="flex-1">
          <Text className="text-cyan-900 font-bold text-sm">{t('wallet_apply_title')}</Text>
          <Text className="text-cyan-700 text-xs mt-0.5">
            {interpolate(t('wallet_apply_applied'), amountText)}
          </Text>
        </View>
        <View className="border border-green-600 rounded-xl px-3.5 py-1.5">
          <Text className="text-green-700 font-bold text-sm">{t('remove')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID="wallet-apply-card"
      onPress={onApply}
      activeOpacity={0.9}
      className="bg-white border border-cyan-200 rounded-2xl p-3 flex-row items-center gap-3"
    >
      <View className="w-11 h-11 rounded-xl bg-cyan-50 items-center justify-center">
        <Wallet size={20} color="#0284c7" />
      </View>
      <View className="flex-1">
        <Text className="text-cyan-950 font-bold text-sm">{t('wallet_apply_title')}</Text>
        <Text className="text-cyan-700 text-xs mt-0.5">
          {interpolate(t('wallet_apply_available'), amountText)}
        </Text>
      </View>
      <View className="border border-green-600 rounded-xl px-3.5 py-1.5">
        <Text className="text-green-700 font-bold text-sm">{t('apply')}</Text>
      </View>
    </TouchableOpacity>
  );
};
