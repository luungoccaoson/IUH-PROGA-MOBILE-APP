import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SPACES_KEY = '@proga_recent_viewed_space_ids';

export const recentSpacesService = {
  getRecentSpaceIds: async (): Promise<number[]> => {
    try {
      const data = await AsyncStorage.getItem(RECENT_SPACES_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addRecentSpaceId: async (spaceId: number): Promise<void> => {
    try {
      if (!spaceId || typeof spaceId !== 'number') return;
      const current = await recentSpacesService.getRecentSpaceIds();
      // Put spaceId at index 0, deduplicate
      const updated = [spaceId, ...current.filter((id) => id !== spaceId)].slice(0, 20);
      await AsyncStorage.setItem(RECENT_SPACES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.log('Error adding recent space id:', e);
    }
  },
};
