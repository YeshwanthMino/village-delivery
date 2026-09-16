import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const AboutScreen = () => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-slate-900 font-black text-xl" style={teFont}>{t('about_title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-3xl bg-green-600 items-center justify-center mb-3">
            <Text className="text-white font-black text-3xl">V</Text>
          </View>
          <Text className="text-slate-900 font-black text-2xl" style={teFont}>Village</Text>
          <Text className="text-slate-500 text-sm mt-1 text-center" style={teRegular}>{t('about_tagline')}</Text>
        </View>

        <Text className="text-slate-700 text-base leading-6 mb-6" style={teRegular}>{t('about_body')}</Text>

        <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3" style={teFont}>
          {t('about_contact_label')}
        </Text>
        <View className="bg-white rounded-2xl px-4 py-4 border border-slate-100 mb-6">
          <Text className="text-slate-900 text-base" style={teRegular}>support@village.app</Text>
        </View>

        <Text className="text-slate-400 text-xs text-center" style={teRegular}>
          {t('profile_version_label')} {appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};
