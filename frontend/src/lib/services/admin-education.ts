import api from './apiClient';

export const adminEducationService = {
  // Categories
  getCategories: async () => {
    return await api.get('/education/categories');
  },

  createCategory: async (data: any) => {
    return await api.post('/education/categories', data);
  },

  updateCategory: async (id: number, data: any) => {
    return await api.put(`/education/categories/${id}`, data);
  },

  deleteCategory: async (id: number) => {
    return await api.delete(`/education/categories/${id}`);
  },

  // Documents
  getDocuments: async (params?: any) => {
    return await api.get('/education/documents', { params });
  },

  createDocument: async (data: any) => {
    return await api.post('/education/documents', data);
  },

  updateDocument: async (id: number, data: any) => {
    return await api.put(`/education/documents/${id}`, data);
  },

  deleteDocument: async (id: number) => {
    return await api.delete(`/education/documents/${id}`);
  }
};
