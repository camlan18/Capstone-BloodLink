import api from './apiClient';

export const adminInventoryService = {
  getInventoryList: async (params?: any) => {
    return await api.get('/inventory', { params });
  },

  getInventoryStats: async () => {
    return await api.get('/inventory/stats');
  },

  receiveBlood: async (data: any) => {
    return await api.post('/inventory/receive', data);
  },

  updateBlood: async (id: number, data: any) => {
    return await api.put(`/inventory/${id}`, data);
  },

  discardBlood: async (id: number, reason: string) => {
    return await api.post(`/inventory/${id}/discard`, { reason });
  },

  exportExcel: async (params?: any) => {
    const res = await api.get('/inventory/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  downloadTemplate: async () => {
    const res = await api.get('/inventory/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/inventory/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
