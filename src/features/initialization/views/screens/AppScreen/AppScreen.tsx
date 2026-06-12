import { useAuthStore, useLocationStore } from '@/src/core/store';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { useFonts } from 'expo-font';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';

export const AppScreen = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const checkExistingAuth = useAuthStore((state) => state.checkExistingAuth);
  const setLocale = useVillageStore((s) => s.setLocale);
  const hydrateLocation = useLocationStore((s) => s.hydrate);

  const [fontsLoaded] = useFonts({
    'EuclidCircularA-Regular': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Regular.ttf'),
    'EuclidCircularA-Medium': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Medium.ttf'),
    'EuclidCircularA-SemiBold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-SemiBold.ttf'),
    'EuclidCircularA-Bold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Bold.ttf'),
  });

  useEffect(() => {
    const init = async () => {
      await Promise.all([checkExistingAuth(), hydrateLocation()]);
      // MVP: only English is shipped. On first launch default to English and
      // mark onboarding complete so the language screen is never shown.
      const firstLaunch = await StoredPrefs.getIsFirstLaunch();
      if (firstLaunch) {
        await setLocale('en');
        await StoredPrefs.setIsFirstLaunch(false);
      }
      setReady(true);
    };
    init();
  }, [checkExistingAuth, hydrateLocation, setLocale]);

  useEffect(() => {
    if (!fontsLoaded || !ready) return;

    const root = segments[0] as string | undefined;

    // Keep known routes; bounce unknown roots to home.
    const allowed = [
      '(dashboard)', 'auth', 'search',
      'category-details', 'cart', 'top-picks', 'order-detail',
    ];
    if (!root || !allowed.includes(root)) {
      router.replace('/(dashboard)/home');
    }
  }, [fontsLoaded, ready, segments, router]);

  if (!fontsLoaded || !ready) return null;

  return <>{children}</>;
};
