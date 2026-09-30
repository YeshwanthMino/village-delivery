// src/shared/components/VipMembershipCard.tsx
//
// Cart-screen VIP membership upsell, addable like a product line item —
// modelled on the pattern Blinkit/Zepto use (a dedicated card with a badge,
// benefit copy, a price, and an ADD-style button) rather than a caption
// inside the cashback banner. Controlled component, same shape as the
// sibling CouponRow: the screen owns the `added` state and passes it down,
// this component only renders it.
//
// Adding VIP here adds its monthly fee straight into THIS order's total
// (see bill.ts's `vipMembershipFee` field) and flips cashback to VIP rates
// immediately, for this same cart — not from the next order. Both were
// explicit product decisions, not implementation shortcuts.
//
// Known gap: /app/orders' request body has no field for a membership charge
// and no VIP product/SKU exists in the catalog, so this order's displayed
// total is not yet what the backend will actually charge. This card is
// front-end-complete; charging and provisioning VIP server-side is a
// separate, later piece of work.

import { Crown } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolateVars } from '@/src/base/constants/translations';
import { useCashbackSettings } from '@/src/core/store/useStoreConfigStore';
import { rupees, toUnits } from '@/src/shared/utils/currency';

interface VipMembershipCardProps {
  added: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export const VipMembershipCard = ({ added, onAdd, onRemove }: VipMembershipCardProps) => {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const cashbackSettings = useCashbackSettings();

  // Already a real member — nothing to upsell. Kill switch mirrors
  // cartProgress.ts's own `disabled` condition so this card and the
  // cashback banner turn off together.
  const isRealVip = Boolean(user?.isVip);
  const cashbackEnabled = cashbackSettings.active && !cashbackSettings.isDeleted;
  if (isRealVip || !cashbackEnabled) return null;

  const feeText = rupees(toUnits(cashbackSettings.vipUpgradeFee));

  if (added) {
    return (
      <TouchableOpacity
        testID="vip-membership-card"
        onPress={onRemove}
        activeOpacity={0.9}
        className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex-row items-center gap-3"
      >
        <View className="w-11 h-11 rounded-xl bg-emerald-100 items-center justify-center">
          <Crown size={20} color="#059669" />
        </View>
        <View className="flex-1">
          <Text className="text-emerald-900 font-bold text-sm">{t('vip_membership_added_title')}</Text>
          <Text className="text-emerald-700 text-xs mt-0.5">{t('vip_membership_added_benefit')}</Text>
        </View>
        <View className="border border-green-600 rounded-xl px-3.5 py-1.5">
          <Text className="text-green-700 font-bold text-sm">{t('remove')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID="vip-membership-card"
      onPress={onAdd}
      activeOpacity={0.9}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex-row items-center gap-3"
    >
      <View className="w-11 h-11 rounded-xl bg-amber-100 items-center justify-center">
        <Crown size={20} color="#b45309" />
      </View>
      <View className="flex-1">
        <Text className="text-amber-900 font-bold text-sm">{t('vip_membership_title')}</Text>
        <Text className="text-amber-800 text-xs mt-0.5">
          {interpolateVars(t('vip_membership_benefit'), { f: feeText })}
        </Text>
      </View>
      <View className="border border-green-600 rounded-xl px-3.5 py-1.5">
        <Text className="text-green-700 font-bold text-sm">{t('add')}</Text>
      </View>
    </TouchableOpacity>
  );
};
