import { Home } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { CheckoutState } from '@/src/features/cart/domain/checkoutState';
import type { AddressTag } from '@/src/features/location/domain/models';

interface CheckoutBarProps {
  state: CheckoutState;
  grandTotal: number;
  /** Selected address tag + one-line summary — shown in the 'place' state. */
  addressTag?: AddressTag;
  addressLine?: string;
  onLogin: () => void;
  onSelectAddress: () => void;
  onPlaceOrder: () => void;
}

export const CheckoutBar = ({
  state,
  grandTotal,
  addressTag,
  addressLine,
  onLogin,
  onSelectAddress,
  onPlaceOrder,
}: CheckoutBarProps) => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  // States 'login' / 'address' are a single full-width green button.
  if (state !== 'place') {
    const config = {
      login: { label: t('login_to_proceed'), onPress: onLogin },
      address: { label: t('select_address_to_proceed'), onPress: onSelectAddress },
    }[state];

    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.fullButton} activeOpacity={0.9} onPress={config.onPress}>
          <Text style={[styles.fullCta, teFont]}>{config.label}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {/* Delivery address strip */}
        <View style={styles.addrRow}>
          <View style={styles.addrIcon}>
            <Home size={18} color="#f59e0b" />
          </View>
          <View style={styles.addrBody}>
            <Text style={[styles.addrTitle, teFont]} numberOfLines={1}>
              {addressTag ? t(`delivering_to_${addressTag}`) : t('delivering_to_home')}
            </Text>
            {!!addressLine && (
              <Text style={styles.addrLine} numberOfLines={1}>
                {addressLine}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onSelectAddress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.change}>{t('change')}</Text>
          </TouchableOpacity>
        </View>

        {/* Place order */}
        <View style={styles.placeRow}>
          <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={onPlaceOrder}>
            <View>
              <Text style={styles.total}>{rupees(grandTotal)}</Text>
              <Text style={styles.totalLabel}>TOTAL</Text>
            </View>
            <Text style={[styles.cta, teFont]}>{t('place_order')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, marginHorizontal: 12 },
  fullButton: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  fullCta: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  addrIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrBody: { flex: 1, marginLeft: 11 },
  addrTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  addrLine: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  change: { color: '#16a34a', fontWeight: '700', fontSize: 12, marginLeft: 8 },

  placeRow: { paddingHorizontal: 14, paddingVertical: 12 },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  total: { color: '#ffffff', fontWeight: '800', fontSize: 16, lineHeight: 18 },
  totalLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  cta: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
});
