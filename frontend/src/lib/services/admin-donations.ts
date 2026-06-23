import api from './apiClient';

export const adminDonationService = {
  getSlots: async (params?: any) => {
    return await api.get('/donor/slots', { params });
  },

  updateSlotStatus: async (id: number, status: string, notes?: string) => {
    return await api.put(`/donor/slots/${id}/status`, { status, notes });
  },

  recordDonation: async (data: any) => {
    return await api.post('/donor/donations', data);
  },

  exportExcel: async (params?: any) => {
    const res = await api.get('/donor/slots/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'donations.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  downloadTemplate: async () => {
    const res = await api.get('/donor/slots/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'donations_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/donor/slots/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  createSlot: async (data: any) => {
    return await api.post('/donor/slots', data);
  }
};
