import { User } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ProfileScreen = () => (
  <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
    <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6">
      <User size={40} color="#16a34a" />
    </View>
    <Text className="text-slate-900 font-black text-xl mb-2 text-center">
      Sign in to Village Delivery
    </Text>
    <Text className="text-slate-500 text-sm text-center mb-8">
      Track orders, save favourites and unlock member-only deals.
    </Text>
    <TouchableOpacity className="bg-green-600 rounded-2xl px-10 py-3">
      <Text className="text-white font-bold text-base">Sign In</Text>
    </TouchableOpacity>
  </SafeAreaView>
);
