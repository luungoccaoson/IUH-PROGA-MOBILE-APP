import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type Language = 'vi' | 'en' | 'zh';
const STORAGE_KEY = '@proga_language';
export const languages: { code: Language; label: string }[] = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '简体中文' },
];
const isLanguage = (value: unknown): value is Language =>
  value === 'vi' || value === 'en' || value === 'zh';

let writes = Promise.resolve();
export const useLanguageStore = create<{
  language: Language;
  ready: boolean;
  initLanguage: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
}>((set, get) => ({
  language: 'vi',
  ready: false,
  initLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (!get().ready && isLanguage(saved)) set({ language: saved });
    } catch (error) {
      console.warn('Failed to load language', error);
    } finally {
      set({ ready: true });
    }
  },
  setLanguage: async (language) => {
    if (!isLanguage(language)) return;
    set({ language, ready: true });
    writes = writes.then(() => AsyncStorage.setItem(STORAGE_KEY, language)).catch((error) => {
      console.warn('Failed to save language', error);
    });
    await writes;
  },
}));
