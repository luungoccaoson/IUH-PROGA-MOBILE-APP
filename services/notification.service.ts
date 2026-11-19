import { apiClient } from './api';
import { ApiResponse, NotificationItem } from '../types';

export const notificationService = {
  getUserNotifications: async (userId: number): Promise<NotificationItem[]> => {
    try {
      const response = await apiClient.get<ApiResponse<NotificationItem[]>>(`/notifications/user/${userId}`);
      return response.data.data || [];
    } catch (error) {
      console.log('Error fetching user notifications:', error);
      return [];
    }
  },

  getUnreadNotifications: async (userId: number): Promise<NotificationItem[]> => {
    try {
      const response = await apiClient.get<ApiResponse<NotificationItem[]>>(`/notifications/user/${userId}/unread`);
      return response.data.data || [];
    } catch (error) {
      console.log('Error fetching unread notifications:', error);
      return [];
    }
  },

  getUnreadCount: async (userId: number): Promise<number> => {
    try {
      const response = await apiClient.get<ApiResponse<number>>(`/notifications/user/${userId}/unread-count`);
      return response.data.data || 0;
    } catch (error) {
      console.log('Error fetching unread count:', error);
      return 0;
    }
  },

  markAsRead: async (id: number): Promise<void> => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.log(`Error marking notification ${id} as read:`, error);
      throw error;
    }
  },

  markAllAsRead: async (userId: number): Promise<void> => {
    try {
      await apiClient.patch(`/notifications/user/${userId}/read-all`);
    } catch (error) {
      console.log(`Error marking all notifications for user ${userId} as read:`, error);
      throw error;
    }
  },

  deleteNotification: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch (error) {
      console.log(`Error deleting notification ${id}:`, error);
      throw error;
    }
  },
};
