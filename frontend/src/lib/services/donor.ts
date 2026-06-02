import apiClient from './apiClient';
import { ApiResponse, DonorProfile, DonationSlot, DonationHistory } from '@/types';

export const donorService = {
  getProfile: async () => {
    return apiClient.get<any, ApiResponse<DonorProfile>>('/donor/profile');
  },
  getSlots: async (date?: string) => {
    return apiClient.get<any, ApiResponse<DonationSlot[]>>(`/donor/slots${date ? `?date=${date}` : ''}`);
  },
  getMySlots: async () => {
    return apiClient.get<any, any>('/donor/my-slots');
  },
  getSchedules: async (facilityId?: string) => {
    return apiClient.get<any, any>(`/donor/schedules${facilityId ? `?facilityId=${facilityId}` : ''}`);
  },
  bookSlot: async (data: { schedule_id: number, notes?: string }) => {
    return apiClient.post<any, ApiResponse<any>>('/donor/book-slot', data);
  },
  cancelSlot: async (slotId: number) => {
    return apiClient.post<any, ApiResponse<any>>(`/donor/cancel-slot/${slotId}`, {});
  },
  updateProfile: async (data: any) => {
    return apiClient.put<any, ApiResponse<any>>('/donor/profile', data);
  },
  getHistory: async () => {
    return apiClient.get<any, ApiResponse<DonationHistory[]>>('/donor/history');
  }
};
