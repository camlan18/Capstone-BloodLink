import api from './apiClient';

export const adminTransferService = {
  getTransfers: async (params?: any) => {
    return await api.get('/transfers', { params });
  },

  getTransferById: async (id: number) => {
    return await api.get(`/transfers/${id}`);
  },

  createTransfer: async (data: any) => {
    return await api.post('/transfers', data);
  },

  approveTransfer: async (id: number, data: any) => {
    return await api.post(`/transfers/${id}/approve`, data);
  },

  shipTransfer: async (id: number) => {
    return await api.post(`/transfers/${id}/ship`);
  },

  receiveTransfer: async (id: number) => {
    return await api.post(`/transfers/${id}/receive`);
  },

  rejectTransfer: async (id: number, reason: string) => {
    return await api.post(`/transfers/${id}/reject`, { reason });
  },

  cancelTransfer: async (id: number) => {
    return await api.post(`/transfers/${id}/cancel`);
  },
};
