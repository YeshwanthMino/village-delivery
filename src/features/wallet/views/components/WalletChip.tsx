// Wallet-balance chip for the Home top bar, following the reference: the gold
// wallet icon with the ₹ amount in a small dark pill layered over its bottom.
// Same size (w-9 h-9) and bg-slate-100 as the cart and bell buttons so the row
// lines up. Signed-in only — the caller gates on auth. Tapping opens Profile,
// where the full WalletCard (expiry, Retry) lives.

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { Skeleton } from '@/src/shared/components/Skeleton';
import { rupees } from '@/src/shared/utils/currency';
import { useWalletQuery } from '../../data/queries/useWalletQuery';

/** Wallet-with-₹ glyph — the supplied wallet-icon.svg (assets/wallet-icon.svg),
 *  inlined because the project has no SVG-file loader. Its embedded provenance
 *  metadata is dropped; only the two artwork paths are kept. */
const WALLET_GOLD = '#e0b23f';
const WalletGlyph = () => (
  <Svg width={18} height={17} viewBox="0 0 20 19">
    <Path
      d="M2.25 1.5C1.83621 1.5 1.5 1.83621 1.5 2.25C1.5 2.66379 1.83621 3 2.25 3H15.75C17.2692 3 18.5 4.23079 18.5 5.75V8.1685C19.0911 8.4495 19.5 9.0522 19.5 9.75V11.75C19.5 12.4478 19.0911 13.0505 18.5 13.3315V15.75C18.5 17.2692 17.2692 18.5 15.75 18.5H2.75C1.23079 18.5 0 17.2692 0 15.75V2.25C0 1.00779 1.00779 0 2.25 0H14.75C15.1642 0 15.5 0.33579 15.5 0.75C15.5 1.16421 15.1642 1.5 14.75 1.5H2.25ZM1.5 4.37187V15.75C1.5 16.4408 2.05921 17 2.75 17H15.75C16.4408 17 17 16.4408 17 15.75V13.5H15.75C14.2308 13.5 13 12.2692 13 10.75C13 9.2308 14.2308 8 15.75 8H17V5.75C17 5.05921 16.4408 4.5 15.75 4.5H2.25C1.98705 4.5 1.73461 4.45484 1.5 4.37187ZM17.75 12C17.8878 12 18 11.8878 18 11.75V9.75C18 9.6122 17.8878 9.5 17.75 9.5H15.75C15.0592 9.5 14.5 10.0592 14.5 10.75C14.5 11.4408 15.0592 12 15.75 12H17.75Z"
      fill={WALLET_GOLD}
    />
    <G transform="translate(8.2,11.02) scale(0.3) translate(-7.5,-10)">
      <Path
        d="M14.2565 4.875C14.2565 5.17337 14.1379 5.45952 13.927 5.6705C13.716 5.88147 13.4298 6 13.1315 6H10.5065C10.5047 7.59076 9.87203 9.11588 8.74719 10.2407C7.62234 11.3656 6.09723 11.9983 4.50646 12H4.03771L10.1315 17.5425C10.2428 17.6413 10.3335 17.7612 10.3982 17.8953C10.4628 18.0294 10.5003 18.175 10.5083 18.3236C10.5163 18.4723 10.4947 18.6211 10.4447 18.7613C10.3948 18.9016 10.3176 19.0305 10.2174 19.1407C10.1173 19.2509 9.99632 19.3401 9.86147 19.4031C9.72662 19.4662 9.58059 19.5019 9.43184 19.5081C9.2831 19.5143 9.13461 19.4909 8.99496 19.4393C8.85532 19.3877 8.7273 19.3089 8.61834 19.2075L0.368338 11.7075C0.19989 11.5544 0.0818477 11.3538 0.0298018 11.1322C-0.022244 10.9106 -0.0058444 10.6784 0.0768345 10.4664C0.159513 10.2543 0.304582 10.0723 0.492878 9.94436C0.681175 9.81646 0.90384 9.74869 1.13146 9.75H4.50646C5.50102 9.75 6.45485 9.35491 7.15811 8.65165C7.86137 7.94839 8.25646 6.99456 8.25646 6H1.13146C0.833094 6 0.546946 5.88147 0.335968 5.6705C0.124989 5.45952 0.00646303 5.17337 0.00646303 4.875C0.00646303 4.57663 0.124989 4.29048 0.335968 4.0795C0.546946 3.86853 0.833094 3.75 1.13146 3.75H7.50646C7.15716 3.28426 6.70422 2.90625 6.18351 2.6459C5.66281 2.38554 5.08863 2.25 4.50646 2.25H1.13146C0.833094 2.25 0.546946 2.13147 0.335968 1.9205C0.124989 1.70952 0.00646303 1.42337 0.00646303 1.125C0.00646303 0.826631 0.124989 0.540483 0.335968 0.329505C0.546946 0.118526 0.833094 0 1.13146 0H13.1315C13.4298 0 13.716 0.118526 13.927 0.329505C14.1379 0.540483 14.2565 0.826631 14.2565 1.125C14.2565 1.42337 14.1379 1.70952 13.927 1.9205C13.716 2.13147 13.4298 2.25 13.1315 2.25H9.18553C9.55059 2.70453 9.84746 3.20984 10.0668 3.75H13.1315C13.4298 3.75 13.716 3.86853 13.927 4.0795C14.1379 4.29048 14.2565 4.57663 14.2565 4.875Z"
        fill={WALLET_GOLD}
      />
    </G>
  </Svg>
);

export const WalletChip = () => {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { data: wallet, isPending, refetch } = useWalletQuery();

  // Home stays mounted as a tab, so refetch whenever it regains focus (same
  // pattern and auth guard as WalletCard) — the balance changes after orders.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refetch();
    }, [isAuthenticated, refetch]),
  );

  return (
    <TouchableOpacity
      onPress={() => router.push('/(dashboard)/profile')}
      activeOpacity={0.7}
      accessibilityRole="button"
      className="w-9 h-9 rounded-full bg-slate-100 items-center pt-1.5"
    >
      <WalletGlyph />
      {/* Amount pill layered over the icon, pinned to the bottom edge of the
          circle (inside it, so the button stays the same height as its siblings). */}
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0 items-center">
        <View className="min-w-8 h-4 px-1.5 rounded-full bg-slate-800 items-center justify-center">
          {isPending ? (
            <Skeleton width={14} height={7} radius={3} />
          ) : (
            <Text className="text-white text-[10px] font-extrabold">
              {wallet ? rupees(wallet.cashback) : '—'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
