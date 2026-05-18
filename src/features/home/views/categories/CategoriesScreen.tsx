import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart, Search } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingCartPill } from '@/src/shared/components';
import { useCategoriesViewModel } from '../../viewmodel/categories/useCategoriesViewModel';

const SW = Dimensions.get('window').width;

// ── Banner carousel constants ────────────────────────────────────────────────
const B_PAD   = 16;   // left padding
const B_PEEK  = 22;   // px of next card peeking on right
const B_GAP   = 10;   // gap between cards
const B_W     = SW - B_PAD - B_PEEK - B_GAP;
const B_SNAP  = B_W + B_GAP;
const B_H     = 128;

// ── Tile grid constants ──────────────────────────────────────────────────────
const SEC_PAD  = 16;   // horizontal section padding
const TILE_GAP = 10;   // gap between tiles
const TILE_W   = (SW - SEC_PAD * 2 - TILE_GAP * 3) / 4;

// ── Data types ───────────────────────────────────────────────────────────────
interface Tile { catId: string; label: string; stack: string[]; tint: string }
interface StoreTile { catId: string; label: string; stack: string[]; tint: string }
interface Section {
  title: string;
  tiles: Tile[];
  storeTiles?: StoreTile[];
}

// ── Static banner data ───────────────────────────────────────────────────────
const BANNERS = [
  {
    tag: 'FRESH DEALS',
    title: 'Fruits &\nVegetables',
    subtitle: 'Farm-fresh, delivered daily',
    emoji1: '🥭',
    emoji2: '🍓',
    colors: ['#f97316', '#dc2626'] as const,
  },
  {
    tag: 'NEW IN',
    title: 'Dairy &\nBakery',
    subtitle: 'Fresh from local farms',
    emoji1: '🥛',
    emoji2: '🥐',
    colors: ['#0ea5e9', '#2563eb'] as const,
  },
  {
    tag: 'BESTSELLERS',
    title: 'Snacks &\nDrinks',
    subtitle: 'Up to 40% off popular brands',
    emoji1: '🍿',
    emoji2: '🧃',
    colors: ['#a855f7', '#db2777'] as const,
  },
];

// ── Blinkit-style section data ───────────────────────────────────────────────
const T = '#e8f5f0'; // uniform tint for all 4-col category tiles

const SECTIONS: Section[] = [
  {
    title: 'Grocery & Kitchen',
    tiles: [
      { catId: 'fruits',    label: 'Vegetables\n& Fruits',     stack: ['🍉', '🍌', '🥬', '🍋', '🥭'], tint: T },
      { catId: 'pantry',    label: 'Atta, Rice\n& Dal',        stack: ['🌾', '🍚', '🫘'],              tint: T },
      { catId: 'beverages', label: 'Oil, Ghee\n& Masala',      stack: ['🧴', '🧂', '🌶️'],             tint: T },
      { catId: 'dairy',     label: 'Dairy, Bread\n& Eggs',     stack: ['🥛', '🍞', '🥚'],              tint: T },
      { catId: 'bakery',    label: 'Bakery &\nBiscuits',       stack: ['🍪', '🥐', '🧁'],              tint: T },
      { catId: 'snacks',    label: 'Dry Fruits\n& Cereals',    stack: ['🥜', '🌰', '🥣'],              tint: T },
      { catId: 'meat',      label: 'Chicken,\nMeat & Fish',    stack: ['🍗', '🥩', '🐟'],              tint: T },
      { catId: 'organic',   label: 'Organic &\nNatural',       stack: ['🌿', '🥑', '🍯'],              tint: T },
    ],
  },
  {
    title: 'Snacks & Drinks',
    tiles: [
      { catId: 'snacks',    label: 'Chips &\nNamkeen',         stack: ['🥨', '🌽', '🥔'],              tint: T },
      { catId: 'snacks',    label: 'Sweets &\nChocolates',     stack: ['🍫', '🍬', '🍭'],              tint: T },
      { catId: 'beverages', label: 'Drinks &\nJuices',         stack: ['🧃', '🥤', '🍹'],              tint: T },
      { catId: 'beverages', label: 'Tea &\nCoffee',            stack: ['☕', '🍵', '🥛'],              tint: T },
      { catId: 'frozen',    label: 'Instant &\nFrozen Food',   stack: ['🍕', '🍟', '🧊'],              tint: T },
      { catId: 'snacks',    label: 'Sauces &\nSpreads',        stack: ['🥫', '🍯', '🧈'],              tint: T },
      { catId: 'frozen',    label: 'Ice Creams\n& Desserts',   stack: ['🍦', '🍨', '🍰'],              tint: T },
      { catId: 'beverages', label: 'Paan\nCorner',             stack: ['🌿', '🍃', '🥥'],              tint: T },
    ],
  },
  {
    title: 'Household Essentials',
    tiles: [
      { catId: 'organic',   label: 'Home &\nLifestyle',        stack: ['🏠', '🪴', '🛋️'],             tint: T },
      { catId: 'pantry',    label: 'Cleaners &\nRepellents',   stack: ['🧴', '🧽', '🧼'],              tint: T },
      { catId: 'snacks',    label: 'Electronics',              stack: ['🎧', '📱', '💡'],              tint: T },
      { catId: 'bakery',    label: 'Stationery\n& Games',      stack: ['📚', '✏️', '🎲'],              tint: T },
    ],
  },
  {
    title: 'Stores in spotlight',
    tiles: [],
    storeTiles: [
      { catId: 'frozen',    label: 'Ice Cream Store', stack: ['🍦', '🍨'],  tint: '#d9ecf8' },
      { catId: 'organic',   label: 'Travel Store',    stack: ['🧳', '🧣'],  tint: '#cff0e3' },
      { catId: 'snacks',    label: 'Hobby Store',     stack: ['🎨', '📷'],  tint: '#ede9fe' },
      { catId: 'beverages', label: 'Sports Store',    stack: ['🏀', '🏸'],  tint: '#ecfccb' },
    ],
  },
];

// ── Emoji stack helper ────────────────────────────────────────────────────────
function EmojiStack({ stack, size }: { stack: string[]; size: number }) {
  const n = stack.length;
  const maxEmoji = Math.min(n, 4);
  const spread   = size * 0.32;
  const origin   = size / 2;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {stack.slice(0, maxEmoji).map((e, i) => {
        const total    = (maxEmoji - 1) * spread;
        const left     = origin + i * spread - total / 2;
        const fontSize = [size * 0.47, size * 0.41, size * 0.37, size * 0.33][i] ?? size * 0.3;
        const bottom   = size * 0.06 + (i % 2) * size * 0.07;
        return (
          <Text
            key={i}
            style={{
              position: 'absolute',
              left,
              bottom,
              fontSize,
              lineHeight: fontSize * 1.15,
              transform: [{ translateX: -fontSize * 0.5 }],
            }}
          >
            {e}
          </Text>
        );
      })}
    </View>
  );
}

// ── Section tile (4-col) ──────────────────────────────────────────────────────
function SectionTile({ tile, onPress }: { tile: Tile; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.tile, { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <View style={[s.tileImageBox, { backgroundColor: tile.tint }]}>
        <EmojiStack stack={tile.stack} size={TILE_W - 16} />
      </View>
      <Text style={s.tileLabel} numberOfLines={2}>
        {tile.label}
      </Text>
    </Pressable>
  );
}

// ── Store spotlight tile (2-col large) ────────────────────────────────────────
const STORE_W = (SW - SEC_PAD * 2 - TILE_GAP) / 2;

function StoreTile({ tile, onPress }: { tile: StoreTile; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={[s.storeTile, { backgroundColor: tile.tint }]}>
        <Text style={s.storeLabel} numberOfLines={2}>{tile.label}</Text>
        <View style={s.storeEmojiWrap}>
          <Text style={s.storeEmoji}>{tile.stack[0]}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Banner carousel ────────────────────────────────────────────────────────────
function BannerCarousel() {
  const [cur, setCur] = useState(0);
  const ref           = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / B_SNAP);
    setCur(Math.max(0, Math.min(idx, BANNERS.length - 1)));
  };

  return (
    <View style={{ paddingTop: 14 }}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={B_SNAP}
        snapToAlignment="start"
        contentContainerStyle={{ paddingLeft: B_PAD, paddingRight: B_PEEK }}
        onMomentumScrollEnd={onScroll}
      >
        {BANNERS.map((b, i) => (
          <LinearGradient
            key={i}
            colors={b.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.bannerCard,
              { width: B_W, height: B_H, marginRight: i < BANNERS.length - 1 ? B_GAP : 0 },
            ]}
          >
            {/* ambient blobs */}
            <View style={s.blob1} />
            <View style={s.blob2} />

            <View style={s.bannerInner}>
              {/* Text */}
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={s.tagPill}>
                  <Text style={s.tagText}>{b.tag}</Text>
                </View>
                <Text style={s.bannerTitle}>{b.title}</Text>
                <Text style={s.bannerSubtitle} numberOfLines={1}>{b.subtitle}</Text>
              </View>

              {/* Emoji stack */}
              <View style={s.bannerEmojis}>
                <Text style={[s.bannerEmoji1]}>{b.emoji1}</Text>
                <Text style={[s.bannerEmoji2]}>{b.emoji2}</Text>
              </View>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={s.dots}>
        {BANNERS.map((_, i) => (
          <View
            key={i}
            style={[s.dot, { width: i === cur ? 20 : 6, backgroundColor: i === cur ? '#16a34a' : '#cbd5e1' }]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

// ── Main screen ────────────────────────────────────────────────────────────────
export const CategoriesScreen = () => {
  const router  = useRouter();
  const vm      = useCategoriesViewModel();
  const insets  = useSafeAreaInsets();

  const TAB_BAR_H = 64;
  const bottomPad = TAB_BAR_H + insets.bottom + 24;

  const goCategory = (catId: string) => {
    router.push({ pathname: '/category-details', params: { categoryId: catId } } as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['bottom', 'left', 'right']}>

      {/* ── Sticky toolbar ── */}
      <View style={[s.toolbar, { paddingTop: insets.top + 10 }]}>
        {/* Left spacer — same width as icons area so title is truly centered */}
        <View style={s.toolbarSpacer} />
        <Text style={s.pageTitle}>All Categories</Text>
        <View style={s.toolbarIcons}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
          >
            <Heart size={20} color="#1e293b" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => router.push('/search' as any)}
            activeOpacity={0.7}
          >
            <Search size={20} color="#1e293b" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        decelerationRate="normal"
        scrollEventThrottle={16}
      >
        {/* Banner carousel */}
        <View style={{ backgroundColor: '#fff', paddingBottom: 4 }}>
          <BannerCarousel />
        </View>

        {/* Sections */}
        {SECTIONS.map((sec) => (
          <View key={sec.title} style={s.section}>
            <SectionHeader title={sec.title} />

            {sec.tiles.length > 0 && (
              <View style={s.tileGrid}>
                {sec.tiles.map((tile, i) => (
                  <SectionTile
                    key={`${tile.catId}-${i}`}
                    tile={tile}
                    onPress={() => goCategory(tile.catId)}
                  />
                ))}
              </View>
            )}

            {sec.storeTiles && (
              <View style={s.storeGrid}>
                {[0, 2].map(start => (
                  <View key={start} style={s.storeRow}>
                    {sec.storeTiles!.slice(start, start + 2).map((tile, i) => (
                      <StoreTile
                        key={`store-${tile.catId}-${i}`}
                        tile={tile}
                        onPress={() => goCategory(tile.catId)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={() => router.push('/cart')} />
      )}
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Sticky toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  toolbarSpacer: {
    width: 88,   // matches two iconBtn (40px) + gap (6px) + small padding = ~88
  },
  toolbarLeft: {
    flex: 1,
  },
  toolbarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 88,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'EuclidCircularA-Bold',
    lineHeight: 12,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'EuclidCircularA-Bold',
    color: '#0f172a',
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 3,
  },

  // Banner
  bannerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 7,
  },
  blob1: {
    position: 'absolute',
    top: -28, right: -28,
    width: 110, height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  blob2: {
    position: 'absolute',
    bottom: -20, left: 20,
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 7,
  },
  tagText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'EuclidCircularA-Bold',
    letterSpacing: 1.8,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 19,
    fontFamily: 'EuclidCircularA-Bold',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  bannerEmojis: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  bannerEmoji1: { fontSize: 52, lineHeight: 58 },
  bannerEmoji2: { fontSize: 36, lineHeight: 40, marginTop: -8, marginRight: 4 },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  dot: { height: 6, borderRadius: 3 },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: SEC_PAD,
    paddingTop: 18,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'EuclidCircularA-Bold',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 14,
  },

  // 4-col tile grid
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    width: TILE_W,
    alignItems: 'center',
  },
  tileImageBox: {
    width: TILE_W,
    height: TILE_W,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    overflow: 'hidden',
  },
  tileLabel: {
    fontSize: 11,
    fontFamily: 'EuclidCircularA-Bold',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
    minHeight: 30,
  },

  // 2-col store tiles
  storeGrid: {
    gap: TILE_GAP,
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeTile: {
    width: STORE_W,
    borderRadius: 20,
    height: 155,
    padding: 14,
    justifyContent: 'space-between',
  },
  storeLabel: {
    fontSize: 15,
    fontFamily: 'EuclidCircularA-Bold',
    color: '#1e293b',
    lineHeight: 21,
  },
  storeEmojiWrap: {
    alignItems: 'flex-end',
  },
  storeEmoji: {
    fontSize: 68,
  },
});
