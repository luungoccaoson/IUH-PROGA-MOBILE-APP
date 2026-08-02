import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadAuthFromStorage } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadAuthFromStorage();
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workspaces/[id]"
          options={{
            headerShown: true,
            title: 'Chi Tiết Workspace',
            headerBackTitle: 'Quay lại',
            headerStyle: { backgroundColor: '#F6F5EF' },
            headerTintColor: '#111827',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="spaces/[spaceId]"
          options={{
            headerShown: true,
            title: 'Chi Tiết Space',
            headerBackTitle: 'Quay lại',
            headerStyle: { backgroundColor: '#F6F5EF' },
            headerTintColor: '#111827',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack>
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
