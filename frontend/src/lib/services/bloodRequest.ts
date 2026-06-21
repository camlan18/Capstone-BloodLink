import apiClient from './apiClient';
import { ApiResponse, BloodRequest } from '@/types';

export const bloodRequestService = {
  getUrgentRequests: async () => {
    return apiClient.get<any, ApiResponse<BloodRequest[]>>('/requests/public', {
      params: {
        urgency_level: 'URGENT',
        status: 'PENDING'
      }
    });
  },
  getAllRequests: async (params?: { page?: number; limit?: number; blood_type_id?: number }) => {
    return apiClient.get<any, ApiResponse<BloodRequest[]>>('/requests/public', { params });
  },
  createPublicRequest: async (data: any) => {
    return apiClient.post<any, ApiResponse<any>>('/requests/public', data);
  },
  getMyRequests: async (params?: any) => {
    return apiClient.get<any, ApiResponse<any>>('/requests/my', { params });
  },
  getMyRequestDetails: async (id: number) => {
    return apiClient.get<any, ApiResponse<any>>(`/requests/my/${id}`);
  }
};
