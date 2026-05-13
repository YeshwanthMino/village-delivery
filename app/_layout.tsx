import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import '@/global.css';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppScreen } from '@/src/features/initialization/views/screens/AppScreen';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="light">
        <StatusBar style="auto" translucent backgroundColor="transparent" />
        <AppScreen>
          <Stack screenOptions={{ headerShown: false }} />
        </AppScreen>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
