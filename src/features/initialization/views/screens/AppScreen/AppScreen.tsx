import { useAuthStore } from '@/src/core/store';
import { useFonts } from 'expo-font';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';

export const AppScreen = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const checkExistingAuth = useAuthStore((state) => state.checkExistingAuth);

  const [fontsLoaded] = useFonts({
    'EuclidCircularA-Regular': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Regular.ttf'),
    'EuclidCircularA-Medium': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Medium.ttf'),
    'EuclidCircularA-SemiBold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-SemiBold.ttf'),
    'EuclidCircularA-Bold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Bold.ttf'),
  });

  useEffect(() => {
    checkExistingAuth().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !ready) return;
    const inDashboard = segments[0] === '(dashboard)';
    if (!inDashboard) {
      router.replace('/(dashboard)/home');
    }
  }, [fontsLoaded, ready, segments]);

  if (!fontsLoaded || !ready) return null;

  return <>{children}</>;
};
