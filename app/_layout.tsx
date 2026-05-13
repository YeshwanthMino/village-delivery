import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import '@/global.css';
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'EuclidCircularA-Regular': require('../assets/fonts/fonts/EuclidCircularA-Regular.ttf'),
    'EuclidCircularA-Medium': require('../assets/fonts/fonts/EuclidCircularA-Medium.ttf'),
    'EuclidCircularA-SemiBold': require('../assets/fonts/fonts/EuclidCircularA-SemiBold.ttf'),
    'EuclidCircularA-Bold': require('../assets/fonts/fonts/EuclidCircularA-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="light">
        <StatusBar style="auto" translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false }} />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
