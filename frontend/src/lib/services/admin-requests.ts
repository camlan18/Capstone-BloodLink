import api from './apiClient';

export const adminRequestService = {
  getRequests: async (params?: any) => {
    return await api.get('/requests', { params });
  },

  createRequest: async (data: any) => {
    return await api.post('/requests', data);
  },

  exportExcel: async (params?: any) => {
    const res = await api.get('/requests/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'requests.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  downloadTemplate: async () => {
    const res = await api.get('/requests/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'requests_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/requests/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  processRequest: async (id: number) => {
    return await api.post(`/requests/${id}/process`);
  },

  updateRequest: async (id: number, data: any) => {
    return await api.put(`/requests/${id}`, data);
  },

  deleteRequest: async (id: number) => {
    return await api.delete(`/requests/${id}`);
  },

  cancelRequest: async (id: number) => {
    return await api.post(`/requests/${id}/cancel`);
  },

  // --- MATCHING ---
  getMatches: async (id: number) => {
    return await api.get(`/requests/${id}/matches`);
  },
  findMatches: async (id: number) => {
    return await api.post(`/requests/${id}/matches/find`);
  },
  updateMatchStatus: async (matchId: number, status: string) => {
    return await api.put(`/requests/matches/${matchId}/status`, { status });
  },

  // --- ALLOCATION ---
  getAllocations: async (id: number) => {
    return await api.get(`/requests/${id}/allocations`);
  },
  allocateInventory: async (id: number, inventoryIds: number[]) => {
    return await api.post(`/requests/${id}/allocations`, { inventory_ids: inventoryIds });
  },
  releaseAllocation: async (allocationId: number) => {
    return await api.delete(`/requests/allocations/${allocationId}`);
  }
};
