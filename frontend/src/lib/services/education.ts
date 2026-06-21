import apiClient from './apiClient';
import { ApiResponse, EducationDocument } from '@/types';

export const educationService = {
  getDocuments: async (params?: { page?: number; limit?: number; search?: string; category_id?: number; sort?: string; order?: 'ASC' | 'DESC' }) => {
    return apiClient.get<any, ApiResponse<EducationDocument[]>>('/education/documents', { params });
  },
  getDocumentBySlug: async (slug: string) => {
    return apiClient.get<any, ApiResponse<EducationDocument>>(`/education/documents/${slug}`);
  },
  getCategories: async () => {
    return apiClient.get<any, ApiResponse<any[]>>('/education/categories');
  },
  getRelatedDocuments: async (slug: string) => {
    return apiClient.get<any, ApiResponse<EducationDocument[]>>(`/education/documents/${slug}/related`);
  }
};
