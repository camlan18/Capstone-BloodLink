import api from './apiClient';

export const adminUserService = {
  getUsers: async (params?: any) => {
    return await api.get('/users', { params });
  },

  getUserById: async (id: number) => {
    return await api.get(`/users/${id}`);
  },

  createUser: async (data: any) => {
    return await api.post('/users', data);
  },

  updateUser: async (id: number, data: any) => {
    return await api.put(`/users/${id}`, data);
  },

  toggleLock: async (id: number) => {
    return await api.put(`/users/${id}/lock`);
  },

  exportExcel: async (params?: any) => {
    const res = await api.get('/users/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  downloadTemplate: async () => {
    const res = await api.get('/users/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
