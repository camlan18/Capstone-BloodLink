import api from './apiClient';

/**
 * Service gọi API lấy dữ liệu thống kê tổng quan cho trang Dashboard quản trị.
 */
export const adminDashboardService = {
  /** Lấy số liệu thống kê tổng quan theo khoảng thời gian và cơ sở y tế. */
  getStats: async (params?: { startDate?: string; endDate?: string; facilityId?: string }) => {
    return await api.get('/dashboard/stats', { params });
  }
};
