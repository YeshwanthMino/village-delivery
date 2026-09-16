// src/shared/components/CashbackProgressBanner.tsx
//
// Cart-screen counterpart to the cashback progress shown in the home-screen
// snackbar (CartSummaryCard) — same rules, same copy keys, via the shared
// `useCartCashback` hook, so the two surfaces cannot drift. Renders nothing
// below the ₹199 minimum (CheckoutBar already carries that message there)
// or when the cashback programme is disabled.
//
// Tier progress only — the VIP upsell used to render here as a text line,
// but now lives on its own as VipMembershipCard (an addable line item, not
// a caption), so the two "asks" on this screen (shop more / go VIP) get
// their own distinct visual weight instead of competing inside one banner.

import React from 'react';
import { Text, View } from 'react-native';
import { Gift } from 'lucide-react-native';
import { useCartCashback } from '@/src/features/cart/domain/useCartCashback';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { renderTemplateWithBold } from '@/src/shared/utils/richText';

interface CashbackProgressBannerProps {
  grandTotal: number;
}

const BOLD_STYLE = { fontWeight: '800' as const, color: '#166534' };

export const CashbackProgressBanner = ({ grandTotal }: CashbackProgressBannerProps) => {
  const cashback = useCartCashback(grandTotal);
  const { t } = useTranslation();

  if (cashback.phase === 'disabled' || cashback.phase === 'below_minimum') return null;

  return (
    <View className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 gap-2">
      <View className="flex-row items-center gap-2">
        <Gift size={16} color="#16a34a" />
        <Text className="text-emerald-800 text-sm font-medium flex-1">
          {renderTemplateWithBold(t(cashback.primary.key), cashback.primary.vars, BOLD_STYLE)}
        </Text>
      </View>
      <View className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
        <View
          className="h-full bg-emerald-500 rounded-full"
          style={{ width: `${cashback.progress * 100}%` }}
        />
      </View>
    </View>
  );
};
