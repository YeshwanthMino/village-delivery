import { LogOut, MessageCircle, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Support } from '@/src/base/constants/AppConstants';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';

/** Best-effort display name from the (loosely-typed) profile returned by /app/auth/me. */
function displayName(user: any): string | null {
  if (!user) return null;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.name || user.mobileNumber || user.phoneNumber || null;
}

export const ProfileScreen = () => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;
  const { bottom } = useSafeAreaInsets();
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const bottomPad = TAB_BAR_CONTENT_HEIGHT + bottom + 8;

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [loginVisible, setLoginVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert(t('profile_logout_btn'), '', [
      { text: 'Cancel', style: 'cancel' },
      { text: t('profile_logout_btn'), style: 'destructive', onPress: () => { logout(); } },
    ]);
  };

  const name = displayName(user);

  const openWhatsApp = async () => {
    const message = encodeURIComponent('నమస్కారం, నాకు సహాయం కావాలి.');
    const whatsappUrl = `whatsapp://send?phone=${Support.WHATSAPP_NUMBER}&text=${message}`;
    const webUrl = `https://wa.me/${Support.WHATSAPP_NUMBER}?text=${message}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      await Linking.openURL(canOpen ? whatsappUrl : webUrl);
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {isAuthenticated ? (
        /* Signed-in section */
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6">
            <User size={40} color="#16a34a" />
          </View>
          <Text className="text-slate-900 font-black text-xl mb-1 text-center" style={teFont}>
            {t('profile_greeting')}{name ? `, ${name}` : ''}
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-8" style={teRegular}>
            {t('sign_in_subtitle')}
          </Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center gap-2 border border-slate-200 rounded-2xl px-10 py-3"
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="text-red-600 font-bold text-base" style={teFont}>{t('profile_logout_btn')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Sign-in section */
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6">
            <User size={40} color="#16a34a" />
          </View>
          <Text className="text-slate-900 font-black text-xl mb-2 text-center" style={teFont}>
            {t('sign_in_title')}
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-8" style={teRegular}>
            {t('sign_in_subtitle')}
          </Text>
          <TouchableOpacity
            onPress={() => setLoginVisible(true)}
            className="bg-green-600 rounded-2xl px-10 py-3"
          >
            <Text className="text-white font-bold text-base" style={teFont}>{t('sign_in_btn')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Help / WhatsApp section */}
      <View className="px-4 border-t border-slate-100 pt-4" style={{ paddingBottom: bottomPad }}>
        <Text
          className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-3"
          style={teFont}
        >
          {t('whatsapp_help')}
        </Text>
        <TouchableOpacity
          onPress={openWhatsApp}
          className="flex-row items-center gap-3 bg-white rounded-2xl px-4 py-4 border border-slate-100"
        >
          <View className="w-10 h-10 bg-green-50 rounded-full items-center justify-center">
            <MessageCircle size={20} color="#16a34a" />
          </View>
          <Text
            className="text-slate-900 font-semibold text-base flex-1"
            style={teRegular}
          >
            {t('whatsapp_chat')}
          </Text>
          <Text className="text-slate-400 text-lg">→</Text>
        </TouchableOpacity>
      </View>

      <LoginBottomSheet
        mode="auth"
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onComplete={() => setLoginVisible(false)}
      />
    </SafeAreaView>
  );
};
