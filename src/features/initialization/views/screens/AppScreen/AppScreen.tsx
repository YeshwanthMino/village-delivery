import { useAuthStore, useLocationStore } from '@/src/core/store';
import { useFonts } from 'expo-font';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';

export const AppScreen = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
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
    Promise.all([checkExistingAuth(), hydrateLocation()]).finally(() => setReady(true));
  }, [checkExistingAuth, hydrateLocation]);

  useEffect(() => {
    if (!fontsLoaded || !ready || !hydrated) return;

    const root = segments[0] as string | undefined;
    const inLocation = root === 'location';

    // Hard gate: no serviceable location → force the location screen.
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
  }, [fontsLoaded, ready, hydrated, hasServiceableLocation, segments]);

  if (!fontsLoaded || !ready || !hydrated) return null;

  return <>{children}</>;
};
