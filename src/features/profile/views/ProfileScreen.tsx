import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Info, LogOut, MapPin, MessageCircle, Package, Share2, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Support } from '@/src/base/constants/AppConstants';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';
import { ProfileRow } from './components/ProfileRow';

/** Best-effort display name from the (loosely-typed) profile returned by /app/auth/me. */
function displayName(user: any): string | null {
  if (!user) return null;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.name || null;
}

/** Best-effort phone, preferring the profile then the persisted login number. */
function displayPhone(user: any, fallback: string | null): string | null {
  return user?.mobileNumber || user?.phoneNumber || fallback || null;
}

export const ProfileScreen = () => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const bottomPad = TAB_BAR_CONTENT_HEIGHT + bottom + 24;

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const storeMobile = useAuthStore(s => s.mobileNumber);
  const logout = useAuthStore(s => s.logout);
  const [loginVisible, setLoginVisible] = useState(false);

  const name = displayName(user);
  const phone = displayPhone(user, storeMobile);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();

  const handleLogout = () => {
    Alert.alert(t('profile_logout_btn'), '', [
      { text: 'Cancel', style: 'cancel' },
      { text: t('profile_logout_btn'), style: 'destructive', onPress: () => { logout(); } },
    ]);
  };

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

  const handleShare = async () => {
    try {
      await Share.share({ message: t('share_message') });
    } catch {
      // user-cancelled share is a no-op
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        {isAuthenticated ? (
          /* Header card */
          <View className="flex-row items-center gap-3 bg-green-600 rounded-2xl px-4 py-5 mb-5">
            <View className="w-14 h-14 rounded-full bg-white/25 items-center justify-center">
              <Text className="text-white font-black text-xl">{initial}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-black text-lg" style={teFont} numberOfLines={1}>
                {name ?? t('profile_greeting')}
              </Text>
              {phone ? (
                <Text className="text-white/80 text-sm" style={teRegular}>{phone}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          /* Sign-in card */
          <View className="bg-white rounded-2xl px-5 py-6 mb-5 border border-slate-100 items-center">
            <View className="w-16 h-16 bg-green-50 rounded-full items-center justify-center mb-4">
              <User size={32} color="#16a34a" />
            </View>
            <Text className="text-slate-900 font-black text-lg mb-1 text-center" style={teFont}>
              {t('sign_in_title')}
            </Text>
            <Text className="text-slate-500 text-sm text-center mb-5" style={teRegular}>
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

        {/* Account rows (signed-in only) */}
        {isAuthenticated ? (
          <>
            <ProfileRow
              icon={<Package size={20} color="#16a34a" />}
              label={t('profile_orders')}
              onPress={() => router.push('/(dashboard)/orders' as any)}
            />
            <ProfileRow
              icon={<MapPin size={20} color="#16a34a" />}
              label={t('profile_address_book')}
              onPress={() => router.push('/address/add' as any)}
            />
          </>
        ) : null}

        {/* Public rows (always) */}
        <ProfileRow
          icon={<Share2 size={20} color="#16a34a" />}
          label={t('profile_share_app')}
          onPress={handleShare}
        />
        <ProfileRow
          icon={<Info size={20} color="#16a34a" />}
          label={t('profile_about')}
          onPress={() => router.push('/about' as any)}
        />
        <ProfileRow
          icon={<MessageCircle size={20} color="#16a34a" />}
          label={t('whatsapp_chat')}
          onPress={openWhatsApp}
          variant="whatsapp"
        />

        {/* Logout (signed-in only) */}
        {isAuthenticated ? (
          <ProfileRow
            icon={<LogOut size={20} color="#dc2626" />}
            label={t('profile_logout_btn')}
            onPress={handleLogout}
            variant="danger"
          />
        ) : null}

        <Text className="text-slate-400 text-xs text-center mt-4" style={teRegular}>
          {t('profile_version_label')} {appVersion}
        </Text>
      </ScrollView>

      <LoginBottomSheet
        mode="auth"
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onComplete={() => setLoginVisible(false)}
      />
    </SafeAreaView>
  );
};
