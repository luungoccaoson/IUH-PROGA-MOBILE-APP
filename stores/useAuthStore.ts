import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  loadAuthFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user: User, accessToken: string, refreshToken?: string) => {
    try {
      await AsyncStorage.setItem('@proga_access_token', accessToken);
      await AsyncStorage.setItem('@proga_user', JSON.stringify(user));
      if (refreshToken) {
        await AsyncStorage.setItem('@proga_refresh_token', refreshToken);
      }
    } catch (e) {
      console.error('Failed to save auth to AsyncStorage', e);
    }
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  updateUser: async (user: User) => {
    try {
      await AsyncStorage.setItem('@proga_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to update user in AsyncStorage', e);
    }
    set({ user });
  },

  loadAuthFromStorage: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('@proga_access_token');
      const userStr = await AsyncStorage.getItem('@proga_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch (e) {
      console.error('Failed to load auth from AsyncStorage', e);
    }
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove([
        '@proga_access_token',
        '@proga_refresh_token',
        '@proga_user',
      ]);
    } catch (e) {
      console.error('Failed to remove auth from AsyncStorage', e);
    }
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },
}));
