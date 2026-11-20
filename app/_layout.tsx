import { useLanguageStore } from '../stores/useLanguageStore';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../stores/useThemeStore';
import { appUpdateService } from '../services/appUpdate.service';
import { systemNotificationService } from '../services/systemNotification.service';
import { AppUpdateModal } from '../components/AppUpdateModal';
import { AppVersionInfo } from '../types';

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadAuthFromStorage } = useAuthStore();
  const { initTheme, isDark, colors } = useThemeStore();
  const { ready: languageReady, initLanguage } = useLanguageStore();
  const segments = useSegments();
  const router = useRouter();

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);

  useEffect(() => {
    loadAuthFromStorage();
    initTheme();
    void initLanguage();

    // Initialize System Notifications & request OS permission
    void systemNotificationService.init();

    // Check for app update on root mount
    appUpdateService.checkUpdate().then(({ hasUpdate, updateInfo }) => {
      if (hasUpdate && updateInfo) {
        setUpdateInfo(updateInfo);
        setUpdateModalVisible(true);
      }
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if user is not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main tabs if already logged in
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading || !languageReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workspaces/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="spaces/[spaceId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>

      <AppUpdateModal
        visible={updateModalVisible}
        updateInfo={updateInfo}
        onClose={() => setUpdateModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F6F5EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
