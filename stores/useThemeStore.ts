import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  name: ThemeMode;
  bg: string;
  cardBg: string;
  cardBorder: string;
  cardInner: string;
  text: string;
  subText: string;
  mutedText: string;
  inputBg: string;
  inputBorder: string;
  divider: string;
  headerBg: string;
  headerBorder: string;
  primary: string;
  primaryBg: string;
  segmentBg: string;
  segmentActiveBg: string;
  successBg: string;
  successText: string;
  dangerBg: string;
  dangerText: string;
  warningBg: string;
  warningText: string;
  overlay: string;
  statusBar: 'light-content' | 'dark-content';
}

export const themes: Record<ThemeMode, ThemeColors> = {
  dark: {
    name: 'dark',
    bg: '#101214',
    cardBg: '#1C2127',
    cardBorder: '#282E33',
    cardInner: '#161A1D',
    text: '#E6EDF3',
    subText: '#8C9BAB',
    mutedText: '#626F86',
    inputBg: '#161A1D',
    inputBorder: '#282E33',
    divider: '#22272B',
    headerBg: '#101214',
    headerBorder: '#1C2127',
    primary: '#579DFF',
    primaryBg: '#1D3B6A',
    segmentBg: '#161A1D',
    segmentActiveBg: '#1D3B6A',
    successBg: '#0D3823',
    successText: '#57D9A3',
    dangerBg: '#3B2225',
    dangerText: '#F87171',
    warningBg: '#332B00',
    warningText: '#F5CD47',
    overlay: 'rgba(0, 0, 0, 0.75)',
    statusBar: 'light-content',
  },
  light: {
    name: 'light',
    bg: '#F4F5F7',
    cardBg: '#FFFFFF',
    cardBorder: '#DFE1E6',
    cardInner: '#FAFBFC',
    text: '#172B4D',
    subText: '#5E6C84',
    mutedText: '#7A869A',
    inputBg: '#FAFBFC',
    inputBorder: '#DFE1E6',
    divider: '#EBECF0',
    headerBg: '#FFFFFF',
    headerBorder: '#EBECF0',
    primary: '#0052CC',
    primaryBg: '#DEEBFF',
    segmentBg: '#EBECF0',
    segmentActiveBg: '#DEEBFF',
    successBg: '#E3FCEF',
    successText: '#006644',
    dangerBg: '#FFEBE6',
    dangerText: '#DE350B',
    warningBg: '#FFF0B3',
    warningText: '#172B4D',
    overlay: 'rgba(9, 30, 66, 0.54)',
    statusBar: 'dark-content',
  },
};

const THEME_STORAGE_KEY = '@proga_theme_mode';

interface ThemeState {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (mode: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  isDark: true,
  colors: themes.dark,

  toggleTheme: async () => {
    const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (e) {
      console.log('Error saving theme mode:', e);
    }
    set({
      theme: nextTheme,
      isDark: nextTheme === 'dark',
      colors: themes[nextTheme],
    });
  },

  setTheme: async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.log('Error saving theme mode:', e);
    }
    set({
      theme: mode,
      isDark: mode === 'dark',
      colors: themes[mode],
    });
  },

  initTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        set({
          theme: saved,
          isDark: saved === 'dark',
          colors: themes[saved],
        });
        return;
      }
    } catch (e) {
      console.log('Error loading theme mode:', e);
    }
    // Default to dark
    set({
      theme: 'dark',
      isDark: true,
      colors: themes.dark,
    });
  },
}));
