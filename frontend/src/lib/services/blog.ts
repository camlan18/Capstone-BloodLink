import api from './apiClient';
import { ApiResponse, BlogPost, BlogCategory, BlogComment } from '@/types';

/**
 * Service frontend công khai cho trang blog: đọc bài viết, danh mục và tương tác bình luận.
 */
export const blogService = {
  /** Lấy danh sách bài viết blog có lọc và phân trang. */
  getPosts: async (params?: any): Promise<ApiResponse<BlogPost[]> | any> => {
    try {
      const response = await api.get('/blog/posts', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /** Lấy chi tiết bài viết blog theo slug. */
  getPostBySlug: async (slug: string): Promise<BlogPost | any> => {
    try {
      const response = await api.get(`/blog/posts/${slug}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /** Lấy danh sách bài viết liên quan với bài viết hiện tại theo slug. */
  getRelatedPosts: async (slug: string): Promise<BlogPost[] | any> => {
    try {
      const response = await api.get(`/blog/posts/${slug}/related`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /** Lấy danh sách tất cả danh mục bài viết blog. */
  getCategories: async (): Promise<ApiResponse<BlogCategory[]> | any> => {
    try {
      const response = await api.get('/blog/categories');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /** Lấy danh sách bình luận của một bài viết theo postId. */
  getComments: async (postId: number, params?: any): Promise<ApiResponse<BlogComment[]> | any> => {
    try {
      const response = await api.get(`/blog/posts/${postId}/comments`, {
        params: { t: Date.now(), ...params }
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /** Gửi bình luận mới (hoặc phản hồi bình luận cha) cho bài viết. */
  addComment: async (postId: number, content: string, guestName?: string, parentId?: number) => {
    try {
      const response = await api.post(`/blog/posts/${postId}/comments`, {
        content,
        guest_name: guestName,
        parent_comment_id: parentId
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /** Chỉnh sửa nội dung bình luận đã đăng theo commentId. */
  editComment: async (commentId: number, content: string) => {
    try {
      const response = await api.put(`/blog/comments/${commentId}`, { content });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /** Xóa bình luận theo commentId. */
  deleteComment: async (commentId: number) => {
    try {
      const response = await api.delete(`/blog/comments/${commentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};
