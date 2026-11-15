import apiClient from './apiClient';
import { ApiResponse, EducationDocument } from '@/types';

/**
 * Service frontend công khai tra cứu tài liệu giáo dục và danh mục kiến thức hiến máu.
 */
export const educationService = {
  /** Lấy danh sách tài liệu giáo dục có phân trang, tìm kiếm và lọc theo danh mục. */
  getDocuments: async (params?: { page?: number; limit?: number; search?: string; category_id?: number; sort?: string; order?: 'ASC' | 'DESC' }) => {
    return apiClient.get<any, ApiResponse<EducationDocument[]>>('/education/documents', { params });
  },
  /** Lấy chi tiết nội dung tài liệu giáo dục theo slug. */
  getDocumentBySlug: async (slug: string) => {
    return apiClient.get<any, ApiResponse<EducationDocument>>(`/education/documents/${slug}`);
  },
  /** Lấy danh sách danh mục tài liệu giáo dục. */
  getCategories: async () => {
    return apiClient.get<any, ApiResponse<any[]>>('/education/categories');
  },
  /** Lấy danh sách tài liệu giáo dục liên quan theo slug hiện tại. */
  getRelatedDocuments: async (slug: string) => {
    return apiClient.get<any, ApiResponse<EducationDocument[]>>(`/education/documents/${slug}/related`);
  }
};
