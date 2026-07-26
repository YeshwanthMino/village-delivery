import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
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
const CHIP_SIZE = 32;
const CHIP_OFFSET = 11;

/** Splits a `{n}` template into the text either side of the placeholder, so
 *  the amount itself can be rendered as a separately-styled nested `<Text>`
 *  instead of one uniform run. */
function splitOnAmount(template: string): [string, string] {
  const [prefix = '', suffix = ''] = template.split('{n}');
  return [prefix, suffix];
}

/** Most-recently-added distinct products first, capped at `max`, fanned like
 *  a hand of cards. Cart keys preserve insertion order, so scanning from the
 *  end surfaces recent adds; a product already seen (e.g. a second variant of
 *  the same item) is skipped so the stack never shows the same product twice. */
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
  const { t, tCartSummaryCount } = useTranslation();

  // The glowing dot at the progress bar's leading edge blinks continuously —
  // a breathing opacity loop, not a one-shot animation.
  const glowPulse = useSharedValue(1);
  React.useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(0.35, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [glowPulse]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowPulse.value }));

  const cartItems = React.useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);
  const bill = React.useMemo(() => computeBill(cartItems), [cartItems]);

  if (bill.totalCount === 0) return null;

  const cardBottom = (bottomOffset ?? TAB_BAR_CONTENT_HEIGHT) + 8;
  // Most-recently-added distinct products, fanned in a deck-of-cards stack —
  // shown regardless of threshold state.
  const recentItems = distinctRecentItems(cartItems, MAX_THUMBNAILS);
  // bill.amountToMinimum is already clamped to 0 at/above the minimum (see
  // computeBill), so this is max(0, minimumOrderValue - cartTotal) verbatim.
  const progress = Math.min(1, Math.max(0, bill.grandTotal / bill.minOrderValue));

  const [nudgePrefix, nudgeSuffix] = splitOnAmount(t('shop_more_to_place_order'));
  const [savedPrefix, savedSuffix] = splitOnAmount(t('saved_amount'));

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
            <Text style={styles.nudge}>
              {nudgePrefix}
              <Text style={styles.nudgeAmount}>{rupeesCeil(bill.amountToMinimum)}</Text>
              {nudgeSuffix}
            </Text>
          ) : bill.totalSavings > 0 ? (
            <Text style={styles.saved}>
              {savedPrefix}
              <Text style={styles.savedAmount}>{rupees(bill.totalSavings)}</Text>
              {savedSuffix}
            </Text>
          ) : (
            <Text style={styles.nudge}>{t('order_ready_to_place')}</Text>
          )}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#86efac', '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            >
              <Animated.View style={[styles.progressGlow, glowStyle]} />
            </LinearGradient>
          </View>
        </View>

        <View style={styles.iconColumn}>
          <View
            style={[styles.stack, { width: CHIP_SIZE + (recentItems.length - 1) * CHIP_OFFSET }]}
            testID="cart-summary-icon"
          >
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
                {index === 0 && (
                  <View style={styles.chevronBadge}>
                    <ChevronRight size={9} color="#16a34a" strokeWidth={3} />
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.viewCartCaption}>{t('view_cart')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    backgroundColor: '#16a34a',
    borderRadius: 17,
    paddingVertical: 7,
    paddingHorizontal: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaBlock: { flex: 1 },
  countLine: { flexDirection: 'row', alignItems: 'center' },
  count: { color: '#ffffff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },
  dot: { color: 'rgba(255,255,255,0.55)', marginHorizontal: 5, fontSize: 16 },
  total: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  nudge: { color: '#d1fae5', fontWeight: '500', fontSize: 12.5, marginTop: 3 },
  nudgeAmount: { color: '#ffffff', fontWeight: '800' },
  saved: { color: '#d1fae5', fontWeight: '500', fontSize: 12.5, letterSpacing: 0.5, marginTop: 3 },
  savedAmount: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'visible',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    justifyContent: 'center',
  },
  progressGlow: {
    position: 'absolute',
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  iconColumn: { alignItems: 'center', marginLeft: 10, gap: 3 },
  stack: { height: CHIP_SIZE + 8, marginLeft: 0 },
  chip: {
    position: 'absolute',
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  chipImage: { width: '100%', height: '100%', borderRadius: 6.5 },
  chipEmoji: { fontSize: 13 },
  chevronBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  viewCartCaption: { color: '#ffffff', fontWeight: '700', fontSize: 9.5, letterSpacing: 0.2 },
});
