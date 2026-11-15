import api from './apiClient';

/**
 * Service quản trị kho tài liệu giáo dục và các danh mục kiến thức hiến máu.
 */
export const adminEducationService = {
  // Categories
  /** Lấy danh sách danh mục tài liệu giáo dục. */
  getCategories: async () => {
    return await api.get('/education/categories');
  },

  /** Tạo mới danh mục tài liệu giáo dục. */
  createCategory: async (data: any) => {
    return await api.post('/education/categories', data);
  },

  /** Cập nhật danh mục tài liệu giáo dục theo ID. */
  updateCategory: async (id: number, data: any) => {
    return await api.put(`/education/categories/${id}`, data);
  },

  /** Xóa danh mục tài liệu giáo dục theo ID. */
  deleteCategory: async (id: number) => {
    return await api.delete(`/education/categories/${id}`);
  },

  // Documents
  /** Lấy danh sách tài liệu giáo dục cho trang quản trị. */
  getDocuments: async (params?: any) => {
    return await api.get('/education/documents', { params });
  },

  /** Tạo mới tài liệu giáo dục. */
  createDocument: async (data: any) => {
    return await api.post('/education/documents', data);
  },

  /** Cập nhật tài liệu giáo dục theo ID. */
  updateDocument: async (id: number, data: any) => {
    return await api.put(`/education/documents/${id}`, data);
  },

  /** Xóa tài liệu giáo dục theo ID. */
  deleteDocument: async (id: number) => {
    return await api.delete(`/education/documents/${id}`);
  }
};
