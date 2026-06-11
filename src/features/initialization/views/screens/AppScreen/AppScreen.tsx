import { useAuthStore } from '@/src/core/store';
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

  const [fontsLoaded] = useFonts({
    'EuclidCircularA-Regular': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Regular.ttf'),
    'EuclidCircularA-Medium': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Medium.ttf'),
    'EuclidCircularA-SemiBold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-SemiBold.ttf'),
    'EuclidCircularA-Bold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Bold.ttf'),
  });

  useEffect(() => {
    const init = async () => {
      await checkExistingAuth();
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
  }, [checkExistingAuth]);

  useEffect(() => {
    if (!fontsLoaded || !ready || isFirstLaunch === null) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (isFirstLaunch && !inOnboarding) {
      router.replace('/onboarding/language');
      return;
    }

    if (!isFirstLaunch) {
      const inDashboard = segments[0] === '(dashboard)';
      const inAuth = segments[0] === 'auth';
      const inSearch = segments[0] === 'search';
      const inCategoryDetails = segments[0] === 'category-details';
      const inCart = segments[0] === 'cart';
      const inTopPicks = segments[0] === 'top-picks';
      const inOrderDetail = segments[0] === 'order-detail';
      if (!inDashboard && !inAuth && !inSearch && !inOnboarding && !inCategoryDetails && !inCart && !inTopPicks && !inOrderDetail) {
        router.replace('/(dashboard)/home');
      }
    }
  }, [fontsLoaded, ready, isFirstLaunch, segments, router]);

  if (!fontsLoaded || !ready) return null;

  return <>{children}</>;
};
