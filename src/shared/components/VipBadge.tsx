// src/shared/components/VipBadge.tsx
//
// Small gold "VIP" pill for wherever a real member's identity is shown
// (profile header, order history, …). Self-gated on `user.isVip`, like
// VipMembershipCard — callers render it unconditionally.

import { Crown } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const VipBadge = () => {
  const { t } = useTranslation();
  const isVip = Boolean(useAuthStore(state => state.user?.isVip));

  if (!isVip) return null;

  return (
    <View
      testID="vip-badge"
      className="flex-row items-center gap-1 bg-amber-200 rounded-full px-2 py-0.5"
    >
      <Crown size={10} color="#92400e" />
      <Text className="text-amber-900 text-[10px] font-bold">{t('vip_badge_label')}</Text>
    </View>
  );
};
