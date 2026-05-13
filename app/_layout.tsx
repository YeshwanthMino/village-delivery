import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import '@/global.css';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppScreen } from '@/src/features/initialization/views/screens/AppScreen';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GluestackUIProvider mode="light">
          <StatusBar style="auto" translucent backgroundColor="transparent" />
          <AppScreen>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(dashboard)" />
              <Stack.Screen name="search" />
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
            </Stack>
          </AppScreen>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
