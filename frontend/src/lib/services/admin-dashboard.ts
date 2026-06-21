import api from './apiClient';

export const adminDashboardService = {
  getStats: async (params?: { startDate?: string; endDate?: string; facilityId?: string }) => {
    return await api.get('/dashboard/stats', { params });
  }
};
