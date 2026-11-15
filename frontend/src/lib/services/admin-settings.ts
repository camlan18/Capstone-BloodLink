import api from './apiClient';

/**
 * Service phía quản trị viên gọi API đọc, tạo/cập nhật và xóa cấu hình hệ thống.
 */
export const adminSettingsService = {
  /** Lấy danh sách các tham số cấu hình hệ thống. */
  getSettings: (params?: any) => {
    return api.get('/system-settings', { params });
  },
  /** Tạo mới hoặc cập nhật giá trị cấu hình theo khóa. */
  upsertSetting: (data: any) => {
    return api.post('/system-settings', data);
  },
  /** Xóa cấu hình hệ thống theo ID. */
  deleteSetting: (id: number) => {
    return api.delete(`/system-settings/${id}`);
  }
};
