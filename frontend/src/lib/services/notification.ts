import api from './apiClient';

/**
 * Service phía người dùng gọi API xem danh sách thông báo cá nhân và đánh dấu đã đọc.
 */
export const notificationService = {
  /** Lấy danh sách thông báo của người dùng hiện tại. */
  getMyNotifications: async (params?: any) => {
    const res = await api.get('/notifications/my', { params });
    return res;
  },

  /** Lấy số lượng thông báo chưa đọc của người dùng hiện tại. */
  getUnreadCount: async () => {
    const res = await api.get('/notifications/my/unread-count');
    return res.data;
  },

  /** Đánh dấu một thông báo cụ thể là đã đọc. */
  markAsRead: async (id: number) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  /** Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc. */
  markAllAsRead: async () => {
    const res = await api.put('/notifications/my/mark-all-read');
    return res.data;
  }
};
