import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVillageStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { computeBill, getCartItems } from '@/src/features/cart/domain/bill';
import { rupees, rupeesCeil } from '@/src/shared/utils/currency';
import type { CartLineItem } from '@/src/base/types/village.types';

interface CartSummaryCardProps {
  onPress: () => void;
  bottomOffset?: number;
}

const TAB_BAR_CONTENT_HEIGHT = 64;
const MAX_THUMBNAILS = 3;
const CHIP_SIZE = 26;
const CHIP_OFFSET = 9;

/** Most-recently-added distinct products first, capped at `max`. Cart keys
 *  preserve insertion order, so scanning from the end surfaces recent adds;
 *  a product already seen (e.g. a second variant of the same item) is skipped
 *  so the stack never shows the same product twice. */
function distinctRecentItems(items: CartLineItem[], max: number): CartLineItem[] {
  const seenProductIds = new Set<string>();
  const result: CartLineItem[] = [];
  for (let i = items.length - 1; i >= 0 && result.length < max; i--) {
    const item = items[i];
    if (seenProductIds.has(item.productId)) continue;
    seenProductIds.add(item.productId);
    result.push(item);
  }
  return result;
}

export const CartSummaryCard = ({ onPress, bottomOffset }: CartSummaryCardProps) => {
  const cart = useVillageStore(state => state.cart);
  const cartSnapshots = useVillageStore(state => state.cartSnapshots);
  const { t, tCartSummaryCount, tShopMoreToPlaceOrder } = useTranslation();

  const cartItems = React.useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);
  const bill = React.useMemo(() => computeBill(cartItems), [cartItems]);

  if (bill.totalCount === 0) return null;

  const cardBottom = (bottomOffset ?? TAB_BAR_CONTENT_HEIGHT) + 8;
  const recentItems = bill.belowMinimum ? distinctRecentItems(cartItems, MAX_THUMBNAILS) : [];
  const progress = Math.min(1, bill.grandTotal / bill.minOrderValue);

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
          {bill.belowMinimum && (
            <>
              <Text style={styles.nudge}>{tShopMoreToPlaceOrder(rupeesCeil(bill.amountToMinimum))}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </>
          )}
        </View>

        {bill.belowMinimum ? (
          <View style={[styles.stack, { width: CHIP_SIZE + (recentItems.length - 1) * CHIP_OFFSET }]}>
            {recentItems.map((item, index) => (
              <View
                key={item.key}
                testID="cart-summary-chip"
                style={[
                  styles.chip,
                  { left: index * CHIP_OFFSET, top: index * 3, zIndex: recentItems.length - index },
                ]}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.chipImage} contentFit="cover" />
                ) : (
                  <Text style={styles.chipEmoji}>{item.emoji}</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>{t('view_cart_arrow')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 9,
    backgroundColor: '#0f5132',
    borderRadius: 11,
    paddingVertical: 4,
    paddingHorizontal: 9,
    shadowColor: '#0f5132',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaBlock: { flex: 1 },
  countLine: { flexDirection: 'row', alignItems: 'center' },
  count: { color: '#ffffff', fontWeight: '700', fontSize: 13, letterSpacing: 0.2 },
  dot: { color: 'rgba(255,255,255,0.55)', marginHorizontal: 5, fontSize: 13 },
  total: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  nudge: { color: '#d1fae5', fontWeight: '600', fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
    width: 140,
  },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  stack: { height: CHIP_SIZE + 6, marginLeft: 10 },
  chip: {
    position: 'absolute',
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0f5132',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  chipImage: { width: '100%', height: '100%', borderRadius: 5 },
  chipEmoji: { fontSize: 11 },
});
