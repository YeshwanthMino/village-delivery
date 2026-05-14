import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import '@/global.css';
import { NotoSansTelugu_400Regular, NotoSansTelugu_700Bold, useFonts } from '@expo-google-fonts/noto-sans-telugu';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppScreen } from '@/src/features/initialization/views/screens/AppScreen';
import { useVillageStore } from '@/src/core/store/useVillageStore';

export default function RootLayout() {
  const loadLocale = useVillageStore((s) => s.loadLocale);

  const [fontsLoaded] = useFonts({
    NotoSansTelugu_400Regular,
    NotoSansTelugu_700Bold,
  });

  useEffect(() => {
    loadLocale();
  }, [loadLocale]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GluestackUIProvider mode="light">
          <StatusBar style="auto" translucent backgroundColor="transparent" />
          <AppScreen>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(dashboard)" />
              <Stack.Screen name="onboarding/language" />
              <Stack.Screen name="search" />
              <Stack.Screen name="category-details" />
              <Stack.Screen name="cart" />
              <Stack.Screen name="order-detail" />
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
            </Stack>
          </AppScreen>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
