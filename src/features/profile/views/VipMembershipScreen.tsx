// src/features/profile/views/VipMembershipScreen.tsx
//
// Standalone VIP membership screen, reached from the profile header badge and
// the profile VipStatusCard. Shows only what the backend actually exposes
// today (isVip + the cashback config's tier rewards) — no invented renewal
// date, monthly-fee reminder, or unimplemented perks. Design approved
// 2026-09-29 after checking Zepto Pass / Blinkit membership screens for
// reference — those lean on real benefit numbers rather than restating cost.

import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Percent } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useCashbackSettings } from '@/src/core/store/useStoreConfigStore';
import { rupees, toUnits } from '@/src/shared/utils/currency';

export const VipMembershipScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isVip = Boolean(useAuthStore(state => state.user?.isVip));
  const cashbackSettings = useCashbackSettings();

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
              <Text className="text-amber-800 text-xs">{t('vip_active_benefit')}</Text>
            </View>

            {bestRewardText ? (
              <View className="bg-white border border-slate-100 rounded-2xl p-3.5 mt-4 flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center">
                  <Percent size={16} color="#b45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold text-[13.5px]">
                    {t('vip_hub_max_reward_label')}
                  </Text>
                  <Text className="text-slate-500 text-xs">{t('vip_hub_max_reward_subtitle')}</Text>
                </View>
                <Text className="text-slate-900 font-bold text-[15px]">{bestRewardText}</Text>
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
