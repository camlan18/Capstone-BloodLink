import api from './apiClient';

export const adminBlogService = {
  getAdminComments: async (params?: any) => {
    return await api.get('/blog/admin/comments', { params });
  },

  approveComment: async (id: number, isApproved: boolean) => {
    return await api.put(`/blog/admin/comments/${id}/approve`, { is_approved: isApproved });
  },

  deleteComment: async (id: number) => {
    return await api.delete(`/blog/admin/comments/${id}`);
  },

  getPosts: async (params?: any) => {
    return await api.get('/blog/posts', { params });
  },

  createPost: async (data: any) => {
    return await api.post('/blog/posts', data);
  },

  updatePost: async (id: number, data: any) => {
    return await api.put(`/blog/posts/${id}`, data);
  },

  deletePost: async (id: number) => {
    return await api.delete(`/blog/posts/${id}`);
  },

  createCategory: async (data: any) => {
    return await api.post('/blog/categories', data);
  },

  updateCategory: async (id: number, data: any) => {
    return await api.put(`/blog/categories/${id}`, data);
  },

  deleteCategory: async (id: number) => {
    return await api.delete(`/blog/categories/${id}`);
  }
};
