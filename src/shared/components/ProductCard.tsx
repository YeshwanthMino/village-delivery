import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Heart, Star } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { rupees } from '@/src/features/home/data/static/villageData';
import { CompactStepper } from './CompactStepper';

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

  const isFav = !!favs[product.id];
  const hasVariants = !!product.variants?.length;
  const cartKey = product.id;
  const count = cart[cartKey] ?? 0;

  // For variant products, count is sum of all variant keys
  const variantCount = hasVariants
    ? (product.variants?.reduce((sum, _, i) => sum + (cart[`${product.id}-v${i}`] ?? 0), 0) ?? 0)
    : 0;

  const discount = product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100)
    : 0;

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
            <Text className="text-white text-[10px] font-extrabold">{discount}% OFF</Text>
          </View>
        )}
      </LinearGradient>

      {/* Body */}
      <View className="p-3 flex-1 flex-col gap-2">
        {/* Name */}
        <Text className="text-[13px] font-bold text-slate-900 leading-tight" numberOfLines={2}>
          {product.name}
        </Text>

        {/* Pills row */}
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <View className="bg-slate-100 rounded-full px-2 py-0.5">
            <Text className="text-slate-600 text-[10px] font-medium">{product.weight}</Text>
          </View>
          <View className="bg-green-50 rounded-full px-2 py-0.5 flex-row items-center gap-0.5">
            <Star size={10} color="#15803d" fill="#15803d" />
            <Text className="text-green-700 text-[10px] font-medium">{product.rating}</Text>
            <Text className="text-slate-400 text-[10px]">({product.reviews})</Text>
          </View>
        </View>

        {/* Price row */}
        <View className="flex-row items-baseline gap-1 flex-wrap">
          {hasVariants && (
            <Text className="text-slate-400 text-[10px]">from</Text>
          )}
          <Text className="text-slate-900 font-bold text-sm">{rupees(product.price)}</Text>
          {product.mrp > product.price && (
            <Text className="text-slate-400 text-[10px] line-through">{rupees(product.mrp)}</Text>
          )}
          {!hasVariants && discount > 0 && (
            <Text className="text-green-600 text-[10px] font-semibold">{discount}% off</Text>
          )}
        </View>

        {/* CTA pinned to bottom */}
        <View className="mt-auto pt-1">
          {hasVariants ? (
            variantCount === 0 ? (
              // ADD button for variant product
              <TouchableOpacity
                onPress={() => openVariants(product)}
                className="border-2 border-green-600 rounded-lg h-10 flex-row items-center justify-center gap-1"
              >
                <Text className="text-green-700 font-bold text-sm">ADD</Text>
                <ChevronDown size={14} color="#15803d" />
              </TouchableOpacity>
            ) : (
              // X ADDED button for variant product with items in cart
              <TouchableOpacity
                onPress={() => openVariants(product)}
                className="bg-green-50 border-2 border-green-600 rounded-lg h-10 flex-row items-center justify-center gap-1"
              >
                <Text className="text-green-700 font-bold text-sm">{variantCount} ADDED</Text>
                <ChevronDown size={14} color="#15803d" />
              </TouchableOpacity>
            )
          ) : count === 0 ? (
            // ADD button for simple product
            <TouchableOpacity
              onPress={() => addToCart(product.id)}
              className="border-2 border-green-600 rounded-lg h-10 items-center justify-center"
            >
              <Text className="text-green-700 font-bold text-sm">ADD</Text>
            </TouchableOpacity>
          ) : (
            // Stepper for simple product in cart
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
