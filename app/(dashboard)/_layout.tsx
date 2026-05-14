import { LayoutGrid, Home, ClipboardList, User } from 'lucide-react-native';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { useTranslation } from '@/src/core/utils/useTranslation';

const TAB_BAR_CONTENT_HEIGHT = 64;

export default function DashboardLayout() {
  const { bottom } = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottom;
  const { t } = useTranslation();
  const [firstLaunch, setFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    StoredPrefs.getIsFirstLaunch().then((isFirst) => {
      setFirstLaunch(isFirst);
    });
  }, []);

  if (firstLaunch === null) return null;
  if (firstLaunch) return <Redirect href="/onboarding/language" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#28ae61',
        tabBarInactiveTintColor: '#8c8c8c',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: tabBarHeight,
          paddingBottom: bottom > 0 ? bottom : 8,
          paddingTop: 8,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'EuclidCircularA-Medium',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('nav_home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: t('nav_categories'),
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('nav_orders'),
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav_profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
