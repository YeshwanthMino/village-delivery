import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import '@/global.css';
import { NotoSansTelugu_400Regular, NotoSansTelugu_700Bold, useFonts } from '@expo-google-fonts/noto-sans-telugu';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/src/shared/components/ErrorBoundary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppScreen } from '@/src/features/initialization/views/screens/AppScreen';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/src/base/query/queryClient';

SplashScreen.preventAutoHideAsync();

// Fonts are a nicety, not a gate. If loading stalls (slow disk, cold cache) we
// render with system fonts rather than showing a blank frame indefinitely.
const FONT_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const loadLocale = useVillageStore((s) => s.loadLocale);
  const hydrateCart = useVillageStore((s) => s.hydrateCart);
  const [fontTimedOut, setFontTimedOut] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    NotoSansTelugu_400Regular,
    NotoSansTelugu_700Bold,
  });

  useEffect(() => {
    loadLocale();
    // Restore the cart before first paint so a customer returning after the OS
    // reclaimed the process does not find it empty.
    void hydrateCart();
  }, [loadLocale, hydrateCart]);

  useEffect(() => {
    const id = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = fontsLoaded || !!fontError || fontTimedOut;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // The splash stays up until this returns real content, so returning null here
  // no longer means an empty screen.
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GluestackUIProvider mode="light">
          <StatusBar style="auto" translucent backgroundColor="transparent" />
          <ErrorBoundary>
          <AppScreen>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(dashboard)" />
              <Stack.Screen name="onboarding/language" />
              <Stack.Screen name="search" />
              <Stack.Screen name="category-details" />
              <Stack.Screen name="product" />
              <Stack.Screen name="cart" />
              <Stack.Screen name="order-detail" />
              <Stack.Screen name="top-picks" />
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="location/index" />
              <Stack.Screen name="address/add" />
              <Stack.Screen name="about" />
            </Stack>
          </AppScreen>
          </ErrorBoundary>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
