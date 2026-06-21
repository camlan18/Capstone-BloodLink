import api from './apiClient';

export const adminNotificationsService = {
  getNotifications: (params?: any) => {
    return api.get('/notifications', { params });
  },
  createNotification: (data: any) => {
    return api.post('/notifications', data);
  },
  deleteNotification: (id: number) => {
    return api.delete(`/notifications/${id}`);
  },
  markAsRead: (id: number) => {
    return api.put(`/notifications/${id}/read`);
  }
};
