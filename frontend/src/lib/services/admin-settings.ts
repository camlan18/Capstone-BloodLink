import api from './apiClient';

export const adminSettingsService = {
  getSettings: (params?: any) => {
    return api.get('/system-settings', { params });
  },
  upsertSetting: (data: any) => {
    return api.post('/system-settings', data);
  },
  deleteSetting: (id: number) => {
    return api.delete(`/system-settings/${id}`);
  }
};
