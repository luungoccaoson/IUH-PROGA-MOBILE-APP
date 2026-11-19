import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';
import { ApiResponse, AppVersionInfo } from '../types';

const STORAGE_KEY_DISMISSED_VERSION = '@proga_dismissed_update_version';

export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
};

export const appUpdateService = {
  getCurrentVersion: (): string => {
    return Constants.expoConfig?.version || '1.0.0';
  },

  checkUpdate: async (
    ignoreDismissed = false
  ): Promise<{ hasUpdate: boolean; updateInfo: AppVersionInfo | null }> => {
    try {
      const currentVersion = appUpdateService.getCurrentVersion();
      const response = await apiClient.get<ApiResponse<AppVersionInfo>>('/notifications/app-version', {
        params: { currentVersion },
      });

      const updateInfo = response.data?.data;
      if (!updateInfo || !updateInfo.latestVersion) {
        return { hasUpdate: false, updateInfo: null };
      }

      // If currentVersion is less than latestVersion
      const isNewer = compareVersions(currentVersion, updateInfo.latestVersion) < 0;

      if (!isNewer) {
        return { hasUpdate: false, updateInfo };
      }

      // Check if user dismissed this version before (only applies if not forced update)
      if (!ignoreDismissed && !updateInfo.forceUpdate) {
        const dismissedVersion = await AsyncStorage.getItem(STORAGE_KEY_DISMISSED_VERSION);
        if (dismissedVersion === updateInfo.latestVersion) {
          return { hasUpdate: false, updateInfo };
        }
      }

      return { hasUpdate: true, updateInfo };
    } catch (error) {
      console.log('Error checking for app update:', error);
      return { hasUpdate: false, updateInfo: null };
    }
  },

  dismissUpdate: async (version: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_DISMISSED_VERSION, version);
    } catch (error) {
      console.log('Error saving dismissed update version:', error);
    }
  },

  openDownloadUrl: async (url: string): Promise<void> => {
    try {
      if (url) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          console.warn('Cannot open URL:', url);
        }
      }
    } catch (error) {
      console.log('Error opening download URL:', error);
    }
  },
};
