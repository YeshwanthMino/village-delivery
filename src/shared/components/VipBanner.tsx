// src/shared/components/VipBanner.tsx
//
// Home top-bar strip telling a real VIP member their order earns double
// cashback, linking into the VIP membership screen. Self-gated like
// VipMembershipCard / VipStatusCard — the caller renders it unconditionally.

import { useRouter } from 'expo-router';
import { ChevronRight, Crown } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useCashbackSettings } from '@/src/core/store/useStoreConfigStore';

export const VipBanner = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const isVip = Boolean(useAuthStore(state => state.user?.isVip));
  const cashbackSettings = useCashbackSettings();

  const cashbackEnabled = cashbackSettings.active && !cashbackSettings.isDeleted;
  if (!isVip || !cashbackEnabled) return null;

  return (
    <TouchableOpacity
      testID="vip-banner"
      onPress={() => router.push('/vip-membership')}
      activeOpacity={0.9}
      className="flex-row items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3"
    >
      <Crown size={16} color="#b45309" />
      <Text className="flex-1 text-amber-900 text-xs font-semibold">{t('vip_home_banner')}</Text>
      <ChevronRight size={14} color="#b45309" />
    </TouchableOpacity>
  );
};
