import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Heart } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { rupees } from '@/src/features/home/data/static/villageData';
import { CompactStepper } from './CompactStepper';
import { useTranslation, localizeWeight } from '@/src/core/utils/useTranslation';

interface ProductCardProps {
  product: Product;
  openVariants: (product: Product) => void;
}

export const ProductCard = ({ product, openVariants }: ProductCardProps) => {
  const cart = useVillageStore(state => state.cart);
  const favs = useVillageStore(state => state.favs);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const toggleFav = useVillageStore(state => state.toggleFav);
  const { t, tDiscount, locale } = useTranslation();

  const isFav = !!favs[product.id];
  const hasVariants = !!product.variants?.length;
  const cartKey = product.id;
  const count = cart[cartKey] ?? 0;

  const variantCount = hasVariants
    ? (product.variants?.reduce((sum, _, i) => sum + (cart[`${product.id}-v${i}`] ?? 0), 0) ?? 0)
    : 0;

  const discount = product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100)
    : 0;

  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;

  return (
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex-1">
      {/* Image area */}
      <LinearGradient
        colors={[gradientColor(product.gradientFrom), gradientColor(product.gradientTo)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}
      >
        <Text style={{ fontSize: 64 }}>{product.emoji}</Text>

        {/* Heart button */}
        <TouchableOpacity
          onPress={() => toggleFav(product.id)}
          className="absolute top-2 right-2 w-8 h-8 bg-white/85 rounded-full items-center justify-center"
        >
          <Heart
            size={16}
            color={isFav ? '#f43f5e' : '#94a3b8'}
            fill={isFav ? '#f43f5e' : 'none'}
          />
        </TouchableOpacity>

        {/* Discount badge */}
        {discount > 0 && (
          <View className="absolute top-2 left-2 bg-green-600 rounded-md px-2 py-1">
            <Text className="text-white text-[10px] font-extrabold">{tDiscount(discount)}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Body */}
      <View className="p-3 flex-1 flex-col gap-2">
        {/* Name */}
        <Text
          className="text-base font-bold text-slate-900 leading-tight"
          style={teFont}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* Weight pill — ratings row removed */}
        <View className="bg-slate-100 rounded-full px-2 py-0.5 self-start">
          <Text className="text-slate-600 text-xs font-medium" style={teRegular}>
            {localizeWeight(product.weight, locale)}
          </Text>
        </View>

        {/* Price row */}
        <View className="flex-row items-baseline gap-1 flex-wrap">
          <Text className="text-slate-900 font-extrabold text-lg">{rupees(product.price)}</Text>
          {product.mrp > product.price && (
            <Text className="text-slate-400 text-xs line-through">{rupees(product.mrp)}</Text>
          )}
        </View>

        {/* CTA */}
        <View className="mt-auto pt-1">
          {hasVariants ? (
            variantCount === 0 ? (
              <TouchableOpacity
                onPress={() => openVariants(product)}
                className="border-2 border-green-600 rounded-lg h-11 flex-row items-center justify-center gap-1"
              >
                <Text className="text-green-700 font-bold text-base" style={teFont}>{t('add')}</Text>
                <ChevronDown size={14} color="#15803d" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => openVariants(product)}
                className="bg-green-50 border-2 border-green-600 rounded-lg h-11 flex-row items-center justify-center gap-1"
              >
                <Text className="text-green-700 font-bold text-base" style={teFont}>{variantCount} {t('added')}</Text>
                <ChevronDown size={14} color="#15803d" />
              </TouchableOpacity>
            )
          ) : count === 0 ? (
            <TouchableOpacity
              onPress={() => addToCart(product.id)}
              className="border-2 border-green-600 rounded-lg h-11 items-center justify-center"
            >
              <Text className="text-green-700 font-bold text-base" style={teFont}>{t('add')}</Text>
            </TouchableOpacity>
          ) : (
            <CompactStepper
              count={count}
              onAdd={() => addToCart(product.id)}
              onDec={() => decFromCart(product.id)}
            />
          )}
        </View>
      </View>
    </View>
  );
};
