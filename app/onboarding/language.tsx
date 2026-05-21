import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Locale } from '@/src/base/constants/translations';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';

export default function LanguageScreen() {
  const router = useRouter();
  const setLocale = useVillageStore((s) => s.setLocale);
  const [selected, setSelected] = useState<Locale>('te');
  const [loading, setLoading] = useState(false);

  const DEEPLINK_ROUTE_MAP: Record<string, string> = {
    home:               '/(dashboard)/home',
    categories:         '/(dashboard)/categories',
    orders:             '/(dashboard)/orders',
    profile:            '/(dashboard)/profile',
    search:             '/search',
    'category-details': '/category-details',
    cart:               '/cart',
    'top-picks':        '/top-picks',
    'order-detail':     '/order-detail',
  };

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    await setLocale(selected);
    await StoredPrefs.setIsFirstLaunch(false);

    const deferred = await StoredPrefs.getDeferredDeepLink();
    if (deferred) {
      await StoredPrefs.setDeferredDeepLink(null);
      const parsed = Linking.parse(deferred);
      const pathname = DEEPLINK_ROUTE_MAP[parsed.hostname ?? ''] ?? '/(dashboard)/home';
      const params = (parsed.queryParams as Record<string, string>) ?? {};
      router.replace({ pathname: pathname as any, params });
    } else {
      router.replace('/(dashboard)/home');
    }
  };

  const isTe = selected === 'te';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
      {/* Hero */}
      <Text style={{ fontFamily: 'NotoSansTelugu_700Bold', fontSize: 28, color: '#111827', textAlign: 'center', marginBottom: 6 }}>
        {isTe ? 'మీకు స్వాగతం!' : 'Welcome!'}
      </Text>
      <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 48 }}>
        {isTe ? 'విలేజ్ డెలివరీకి స్వాగతం' : 'Welcome to Village Delivery'}
      </Text>

      {/* Prompt */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center', marginBottom: 16 }}>
        {isTe ? 'మీ భాష ఎంచుకోండి' : 'Choose your language'}
      </Text>

      {/* Language cards */}
      <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginBottom: 32 }}>
        {(['te', 'en'] as Locale[]).map((lang) => {
          const isSelected = selected === lang;
          return (
            <TouchableOpacity
              key={lang}
              onPress={() => setSelected(lang)}
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: isSelected ? '#16a34a' : '#e5e7eb',
                backgroundColor: isSelected ? '#f0fdf4' : '#f9fafb',
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 12,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{
                fontSize: 22,
                fontWeight: '800',
                color: isSelected ? '#15803d' : '#374151',
                fontFamily: lang === 'te' ? 'NotoSansTelugu_700Bold' : undefined,
              }}>
                {lang === 'te' ? 'తెలుగు' : 'EN'}
              </Text>
              <Text style={{ fontSize: 11, color: isSelected ? '#16a34a' : '#9ca3af' }}>
                {lang === 'te' ? 'Telugu' : 'English'}
              </Text>
              {isSelected && (
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: '#16a34a',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={handleContinue}
        disabled={loading}
        style={{
          width: '100%',
          height: 54,
          backgroundColor: loading ? '#15803d' : '#16a34a',
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{
          fontFamily: isTe ? 'NotoSansTelugu_700Bold' : undefined,
          fontWeight: '800',
          fontSize: 17,
          color: '#ffffff',
        }}>
          {isTe ? 'కొనసాగించు →' : 'Continue →'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
