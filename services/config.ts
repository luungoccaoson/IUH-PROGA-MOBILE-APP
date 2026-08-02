import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const STORAGE_KEY_API_URL = '@proga_api_gateway_url';

export const getDefaultApiUrl = (): string => {
  // Automatically extract host IP from Expo Go (e.g. "192.168.1.15:8081" -> "192.168.1.15")
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8080/api/v1`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }
  return 'http://localhost:8080/api/v1';
};

export const configService = {
  getApiUrl: async (): Promise<string> => {
    try {
      const savedUrl = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
      if (savedUrl && savedUrl.trim()) {
        return savedUrl.trim();
      }
    } catch (e) {
      console.error('Error reading API URL from storage:', e);
    }
    return getDefaultApiUrl();
  },

  setApiUrl: async (url: string): Promise<void> => {
    try {
      const formatted = url.trim().replace(/\/+$/, ''); // Remove trailing slash
      await AsyncStorage.setItem(STORAGE_KEY_API_URL, formatted);
    } catch (e) {
      console.error('Error saving API URL to storage:', e);
    }
  },

  resetApiUrl: async (): Promise<string> => {
    const defaultUrl = getDefaultApiUrl();
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, defaultUrl);
    return defaultUrl;
  },
};
