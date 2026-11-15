import api from './apiClient';

/**
 * Service quản trị blog: kiểm duyệt bình luận, quản lý bài viết và danh mục blog.
 */
export const adminBlogService = {
  /** Lấy danh sách bình luận cần kiểm duyệt trong trang quản trị. */
  getAdminComments: async (params?: any) => {
    return await api.get('/blog/admin/comments', { params });
  },

  /** Duyệt hoặc bỏ duyệt hiển thị một bình luận theo ID. */
  approveComment: async (id: number, isApproved: boolean) => {
    return await api.put(`/blog/admin/comments/${id}/approve`, { is_approved: isApproved });
  },

  /** Xóa vĩnh viễn một bình luận từ trang quản trị. */
  deleteComment: async (id: number) => {
    return await api.delete(`/blog/admin/comments/${id}`);
  },

  /** Lấy danh sách bài viết blog cho quản trị viên. */
  getPosts: async (params?: any) => {
    return await api.get('/blog/posts', { params });
  },

  /** Tạo mới bài viết blog. */
  createPost: async (data: any) => {
    return await api.post('/blog/posts', data);
  },

  /** Cập nhật nội dung bài viết blog theo ID. */
  updatePost: async (id: number, data: any) => {
    return await api.put(`/blog/posts/${id}`, data);
  },

  /** Xóa bài viết blog theo ID. */
  deletePost: async (id: number) => {
    return await api.delete(`/blog/posts/${id}`);
  },

  /** Tạo mới danh mục bài viết blog. */
  createCategory: async (data: any) => {
    return await api.post('/blog/categories', data);
  },

  /** Cập nhật thông tin danh mục blog theo ID. */
  updateCategory: async (id: number, data: any) => {
    return await api.put(`/blog/categories/${id}`, data);
  },

  /** Xóa danh mục bài viết blog theo ID. */
  deleteCategory: async (id: number) => {
    return await api.delete(`/blog/categories/${id}`);
  }
};
