import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const systemNotificationService = {
  // Initialize and request permission from the user
  init: async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('proga_notifications', {
          name: 'PROGA Notifications',
          description: 'Thông báo cập nhật tiến độ công việc và dự án PROGA',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0052CC',
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.log('Error initializing system notifications:', error);
      return false;
    }
  },

  // Trigger a system notification (drops down from status bar with sound & vibration)
  sendSystemNotification: async (
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<void> => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          color: '#0052CC',
        },
        trigger: null, // triggers immediately
      });
    } catch (error) {
      console.log('Error triggering system notification:', error);
    }
  },
};
