import api from './apiClient';

/**
 * Service phía quản trị viên gọi API xem, gửi mới, xóa và đánh dấu đọc thông báo hệ thống.
 */
export const adminNotificationsService = {
  /** Lấy danh sách thông báo toàn hệ thống. */
  getNotifications: (params?: any) => {
    return api.get('/notifications', { params });
  },
  /** Tạo và gửi thông báo tới danh sách người dùng. */
  createNotification: (data: any) => {
    return api.post('/notifications', data);
  },
  /** Xóa một thông báo theo ID. */
  deleteNotification: (id: number) => {
    return api.delete(`/notifications/${id}`);
  },
  /** Đánh dấu một thông báo là đã đọc. */
  markAsRead: (id: number) => {
    return api.put(`/notifications/${id}/read`);
  }
};
