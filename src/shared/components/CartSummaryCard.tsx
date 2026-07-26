import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVillageStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { computeBill, getCartItems } from '@/src/features/cart/domain/bill';
import { rupees, rupeesCeil } from '@/src/shared/utils/currency';

interface CartSummaryCardProps {
  onPress: () => void;
  bottomOffset?: number;
}

const TAB_BAR_CONTENT_HEIGHT = 64;
const ICON_SIZE = 40;

export const CartSummaryCard = ({ onPress, bottomOffset }: CartSummaryCardProps) => {
  const cart = useVillageStore(state => state.cart);
  const cartSnapshots = useVillageStore(state => state.cartSnapshots);
  const { t, tCartSummaryCount, tShopMoreToPlaceOrder, tSavedAmount } = useTranslation();

  const cartItems = React.useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);
  const bill = React.useMemo(() => computeBill(cartItems), [cartItems]);

  if (bill.totalCount === 0) return null;

  const cardBottom = (bottomOffset ?? TAB_BAR_CONTENT_HEIGHT) + 8;
  // Cart keys preserve insertion order, so the last entry is the most recently
  // added line — shown as the card's icon regardless of threshold state.
  const recentItem = cartItems[cartItems.length - 1];
  // bill.amountToMinimum is already clamped to 0 at/above the minimum (see
  // computeBill), so this is max(0, minimumOrderValue - cartTotal) verbatim.
  const progress = Math.min(1, Math.max(0, bill.grandTotal / bill.minOrderValue));

  return (
    <TouchableOpacity
      testID="cart-summary-card"
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, { marginBottom: cardBottom }]}
    >
      <View style={styles.row}>
        <View style={styles.metaBlock}>
          <View style={styles.countLine}>
            <Text style={styles.count}>{tCartSummaryCount(bill.totalCount)}</Text>
            <Text style={styles.dot}>{'·'}</Text>
            <Text style={styles.total}>{rupees(bill.grandTotal)}</Text>
          </View>
          {bill.belowMinimum ? (
            <Text style={styles.nudge}>{tShopMoreToPlaceOrder(rupeesCeil(bill.amountToMinimum))}</Text>
          ) : bill.totalSavings > 0 ? (
            <>
              <Text style={styles.nudge}>{t('order_ready_to_place')}</Text>
              <Text style={styles.saved}>{tSavedAmount(rupees(bill.totalSavings))}</Text>
            </>
          ) : (
            <Text style={styles.nudge}>{t('order_ready_to_place')}</Text>
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        <View style={styles.iconBox} testID="cart-summary-icon">
          {recentItem?.imageUrl ? (
            <Image source={{ uri: recentItem.imageUrl }} style={styles.iconImage} contentFit="cover" />
          ) : (
            <Text style={styles.iconEmoji}>{recentItem?.emoji}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    backgroundColor: '#0f5132',
    borderRadius: 17,
    paddingVertical: 7,
    paddingHorizontal: 14,
    shadowColor: '#0f5132',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaBlock: { flex: 1 },
  countLine: { flexDirection: 'row', alignItems: 'center' },
  count: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  dot: { color: 'rgba(255,255,255,0.55)', marginHorizontal: 5, fontSize: 15 },
  total: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  nudge: { color: '#d1fae5', fontWeight: '600', fontSize: 13, marginTop: 2 },
  saved: { color: '#ffffff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3, marginTop: 1 },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
    width: 216,
  },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 3 },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  iconImage: { width: '100%', height: '100%', borderRadius: 7 },
  iconEmoji: { fontSize: 16 },
});
