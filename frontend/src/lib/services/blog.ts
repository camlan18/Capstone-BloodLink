import api from './apiClient';
import { ApiResponse, BlogPost, BlogCategory, BlogComment } from '@/types';

export const blogService = {
  getPosts: async (params?: any): Promise<ApiResponse<BlogPost[]> | any> => {
    try {
      const response = await api.get('/blog/posts', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPostBySlug: async (slug: string): Promise<BlogPost | any> => {
    try {
      const response = await api.get(`/blog/posts/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRelatedPosts: async (slug: string): Promise<BlogPost[] | any> => {
    try {
      const response = await api.get(`/blog/posts/${slug}/related`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCategories: async (): Promise<ApiResponse<BlogCategory[]> | any> => {
    try {
      const response = await api.get('/blog/categories');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getComments: async (postId: number): Promise<ApiResponse<BlogComment[]> | any> => {
    try {
      const response = await api.get(`/blog/posts/${postId}/comments`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addComment: async (postId: number, content: string, guestName?: string, parentId?: number) => {
    try {
      const response = await api.post(`/blog/posts/${postId}/comments`, {
        content,
        guest_name: guestName,
        parent_comment_id: parentId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
