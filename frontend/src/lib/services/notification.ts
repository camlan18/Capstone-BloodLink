import api from './apiClient';

export const notificationService = {
  getMyNotifications: async (params?: any) => {
    const res = await api.get('/notifications/my', { params });
    return res;
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/my/unread-count');
    return res.data;
  },

  markAsRead: async (id: number) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.put('/notifications/my/mark-all-read');
    return res.data;
  }
};
