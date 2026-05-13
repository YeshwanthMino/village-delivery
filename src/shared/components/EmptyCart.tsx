import { ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface EmptyCartProps {
  onStartShopping: () => void;
}

export const EmptyCart = ({ onStartShopping }: EmptyCartProps) => (
  <View className="flex-1 items-center justify-center px-6 py-12">
    <View className="w-28 h-28 bg-green-50 rounded-full items-center justify-center mb-5 relative">
      <ShoppingBag size={52} color="#16a34a" />
      <Text className="absolute bottom-1 right-1 text-xl">🥦</Text>
    </View>
    <Text className="text-slate-900 font-bold text-xl mb-2">Your cart is empty</Text>
    <Text className="text-slate-500 text-sm text-center mb-6">
      Add fresh groceries, dairy, snacks and more to your cart
    </Text>
    <TouchableOpacity
      onPress={onStartShopping}
      className="bg-green-600 rounded-2xl px-8 py-3"
    >
      <Text className="text-white font-bold text-sm">Start Shopping</Text>
    </TouchableOpacity>
  </View>
);
