// src/features/profile/views/VipMembershipScreen.tsx
//
// Standalone VIP membership screen, reached from the profile header badge,
// the profile VipStatusCard, and the home VipBanner. Shows only what the
// backend actually exposes today (isVip + the cashback config's monthly fee
// and tier rewards) — no invented renewal date or unimplemented perks.

import { useRouter } from 'expo-router';
import { ArrowLeft, Crown } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolateVars } from '@/src/base/constants/translations';
import { useCashbackSettings } from '@/src/core/store/useStoreConfigStore';
import { rupees, toUnits } from '@/src/shared/utils/currency';

export const VipMembershipScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isVip = Boolean(useAuthStore(state => state.user?.isVip));
  const cashbackSettings = useCashbackSettings();

  const feeText = rupees(toUnits(cashbackSettings.vipUpgradeFee));
  const bestTier = [...cashbackSettings.tiers].sort((a, b) => b.vipReward - a.vipReward)[0];
  const bestRewardText = bestTier ? rupees(toUnits(bestTier.vipReward)) : null;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12 }}>
        <View className="px-4 pb-3 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-bold text-base">{t('vip_membership_title')}</Text>
        </View>
      </View>

      <View className="p-4">
        {isVip ? (
          <>
            <View className="bg-amber-100 rounded-2xl p-5 gap-2">
              <View className="w-12 h-12 rounded-full bg-amber-200 items-center justify-center">
                <Crown size={22} color="#92400e" />
              </View>
              <Text className="text-amber-950 font-black text-lg mt-1">
                {t('vip_hub_active_subtitle')}
              </Text>
              <Text className="text-amber-800 text-xs">
                {interpolateVars(t('vip_membership_benefit'), { f: feeText })}
              </Text>
            </View>

            <View className="bg-white border border-slate-100 rounded-2xl p-4 mt-4 flex-row items-center justify-between">
              <Text className="text-slate-500 text-sm">{t('vip_hub_fee_label')}</Text>
              <Text className="text-slate-900 font-bold text-sm">{feeText}</Text>
            </View>

            {bestRewardText ? (
              <View className="bg-white border border-slate-100 rounded-2xl p-4 mt-3 flex-row items-center justify-between">
                <Text className="text-slate-500 text-sm">{t('vip_hub_best_reward_label')}</Text>
                <Text className="text-slate-900 font-bold text-sm">{bestRewardText}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text className="text-slate-600 text-sm leading-5">{t('vip_hub_not_member')}</Text>
        )}
      </View>
    </SafeAreaView>
  );
};
