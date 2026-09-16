// Wallet (cashback) card for the profile screen. Signed-in only — the caller
// gates on auth, and useWalletQuery stays disabled until then.
//
// /app/wallet is cashback-only ({ cashback, cashbackExpiryDate, daysLeft }, see
// walletApi's header comment) — there is no general spendable balance to show.
//
// The card always renders for a signed-in user rather than hiding on failure:
// an earlier version hid itself whenever the balance couldn't be read, which
// turned a mapping bug into an invisible feature. Failures now show a dash and
// a Retry instead.
//
// The Profile tab stays mounted (like Orders/Home/Categories), so a plain
// mount-time fetch never re-runs when the user tabs away and back. Refetch on
// focus instead — mirrors OrdersScreen's identical fix for the same tab-bar
// behavior — so the balance shown is never more than a tab-switch stale.

import { useFocusEffect } from 'expo-router';
import { RefreshCw, Wallet as WalletIcon } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate, translate } from '@/src/base/constants/translations';
import { Skeleton } from '@/src/shared/components/Skeleton';
import { rupees } from '@/src/shared/utils/currency';
import { useWalletQuery } from '../../data/queries/useWalletQuery';

export const WalletCard = () => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { data: wallet, isPending, isError, isFetching, refetch } = useWalletQuery();
  const unavailable = isError || (!isPending && !wallet);

  // Guarded on isAuthenticated because a manual refetch() bypasses the query's
  // `enabled` gate and would otherwise fire (and 401) right as the user signs out.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refetch();
    }, [isAuthenticated, refetch]),
  );

  return (
    <View className="bg-white rounded-2xl px-4 py-4 mb-5 border border-slate-100">
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full bg-green-50 items-center justify-center">
          <WalletIcon size={22} color="#16a34a" />
        </View>

        <View className="flex-1">
          <Text className="text-slate-500 text-xs mb-1" style={teRegular}>
            {t('wallet_cashback_label')}
          </Text>
          {isPending ? (
            <Skeleton width={90} height={22} radius={8} />
          ) : (
            <Text className="text-slate-900 font-black text-xl">
              {wallet ? rupees(wallet.cashback) : '—'}
            </Text>
          )}
          {!isPending && wallet && wallet.cashback > 0 && wallet.daysLeft != null ? (
            <Text className="text-slate-400 text-xs mt-0.5" style={teRegular}>
              {interpolate(translate('wallet_cashback_expiry', locale), wallet.daysLeft)}
            </Text>
          ) : null}
        </View>

        {unavailable ? (
          <TouchableOpacity
            onPress={() => refetch()}
            disabled={isFetching}
            accessibilityRole="button"
            className="flex-row items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2"
          >
            <RefreshCw size={14} color="#475569" />
            <Text className="text-slate-600 text-xs font-semibold" style={teFont}>
              {t('retry')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
