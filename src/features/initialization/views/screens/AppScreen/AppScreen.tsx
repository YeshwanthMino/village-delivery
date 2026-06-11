import { useAuthStore, useLocationStore } from '@/src/core/store';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';

export const AppScreen = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const checkExistingAuth = useAuthStore((state) => state.checkExistingAuth);
  const hydrateLocation = useLocationStore((s) => s.hydrate);
  const hydrated = useLocationStore((s) => s.hydrated);
  const hasServiceableLocation = useLocationStore((s) => s.serviceableVillage !== null);

  const [fontsLoaded] = useFonts({
    'EuclidCircularA-Regular': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Regular.ttf'),
    'EuclidCircularA-Medium': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Medium.ttf'),
    'EuclidCircularA-SemiBold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-SemiBold.ttf'),
    'EuclidCircularA-Bold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Bold.ttf'),
  });

  useEffect(() => {
    const init = async () => {
      await Promise.all([checkExistingAuth(), hydrateLocation()]);
      const firstLaunch = await StoredPrefs.getIsFirstLaunch();
      if (firstLaunch) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl?.startsWith('villagedelivery://')) {
          await StoredPrefs.setDeferredDeepLink(initialUrl);
        }
      }
      setIsFirstLaunch(firstLaunch);
      setReady(true);
    };
    init();
  }, [checkExistingAuth, hydrateLocation]);

  useEffect(() => {
    if (!fontsLoaded || !ready || !hydrated || isFirstLaunch === null) return;

    const root = segments[0] as string | undefined;
    const inOnboarding = root === 'onboarding';

    // First launch → onboarding; stay there until it completes.
    if (isFirstLaunch) {
      if (!inOnboarding) router.replace('/onboarding/language');
      return;
    }

    // Hard gate: no serviceable location → force the location screen.
    const inLocation = root === 'location';
    if (!hasServiceableLocation) {
      if (!inLocation) router.replace('/location' as any);
      return;
    }

    // Serviceable: keep known routes; bounce unknown roots (and the now-stale
    // /location gate) to home.
    const allowed = [
      '(dashboard)', 'auth', 'search', 'onboarding',
      'category-details', 'cart', 'top-picks', 'order-detail', 'address',
    ];
    if (!root || !allowed.includes(root)) {
      router.replace('/(dashboard)/home');
    }
  }, [fontsLoaded, ready, hydrated, isFirstLaunch, hasServiceableLocation, segments, router]);

  if (!fontsLoaded || !ready || !hydrated) return null;

  return <>{children}</>;
};
