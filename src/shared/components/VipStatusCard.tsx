// src/shared/components/VipStatusCard.tsx
//
// Profile-screen entry point into the VIP membership screen. Self-gated the
// same way as VipMembershipCard (real VIP + cashback feature on) — the
// caller renders it unconditionally.

import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { ChevronRight, Crown } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useCashbackSettings } from '@/src/core/store/useStoreConfigStore';

export const VipStatusCard = () => {
  const router = useGuardedRouter();
  const { t } = useTranslation();
  const isVip = Boolean(useAuthStore(state => state.user?.isVip));
  const cashbackSettings = useCashbackSettings();

  const cashbackEnabled = cashbackSettings.active && !cashbackSettings.isDeleted;
  if (!isVip || !cashbackEnabled) return null;

  return (
    <TouchableOpacity
      testID="vip-status-card"
      onPress={() => router.push('/vip-membership')}
      activeOpacity={0.9}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex-row items-center gap-3 mb-5"
    >
      <View className="w-10 h-10 rounded-xl bg-amber-200 items-center justify-center">
        <Crown size={18} color="#92400e" />
      </View>
      <View className="flex-1">
        <Text className="text-amber-900 font-bold text-sm">{t('vip_membership_title')}</Text>
        {/* Status copy, not the cart's upsell pitch — an already-VIP customer
            reading "double cashback · ₹45/month" reads it as an offer to pay,
            not confirmation of what they already have. */}
        <Text className="text-amber-700 text-xs mt-0.5">{t('vip_active_benefit')}</Text>
      </View>
      <ChevronRight size={16} color="#b45309" />
    </TouchableOpacity>
  );
};
