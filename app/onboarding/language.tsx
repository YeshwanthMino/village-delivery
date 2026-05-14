import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    await setLocale(selected);
    await StoredPrefs.setIsFirstLaunch(false);
    router.replace('/(dashboard)/home');
  };

  return (
    <LinearGradient
      colors={['#023034', '#065f46']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* Hero */}
        <Text style={{ fontSize: 72, marginBottom: 24 }}>🛺</Text>
        <Text style={{ fontFamily: 'NotoSansTelugu_700Bold', fontSize: 28, color: '#ffffff', textAlign: 'center', marginBottom: 6 }}>
          మీకు స్వాగతం!
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 48 }}>
          Welcome to Village Delivery
        </Text>

        {/* Prompt */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 16 }}>
          మీ భాష ఎంచుకోండి · Choose your language
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
                  borderWidth: 2.5,
                  borderColor: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                  backgroundColor: isSelected ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
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
                  color: '#ffffff',
                  fontFamily: lang === 'te' ? 'NotoSansTelugu_700Bold' : undefined,
                }}>
                  {lang === 'te' ? 'తెలుగు' : 'EN'}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  {lang === 'te' ? 'Telugu' : 'English'}
                </Text>
                {isSelected && (
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: '#fbbf24',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#78350f' }}>✓</Text>
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
            backgroundColor: loading ? '#d97706' : '#fbbf24',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontFamily: selected === 'te' ? 'NotoSansTelugu_700Bold' : undefined,
            fontWeight: '800',
            fontSize: 17,
            color: '#78350f',
          }}>
            {selected === 'te' ? 'కొనసాగించు →' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}
