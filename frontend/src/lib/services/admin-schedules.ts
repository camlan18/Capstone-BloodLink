import apiClient from './apiClient';
import { ApiResponse } from '@/types';

export interface FacilityDonationSchedule {
  schedule_id: number;
  facility_id: number;
  date: string;
  start_time: string;
  end_time: string;
  max_donors: number;
  current_donors: number;
  status: string;
  terms_html: string | null;
  created_at: string;
  facility?: {
    facility_id: number;
    name: string;
    address: string;
  };
}

export const adminSchedulesService = {
  getSchedules: async (params?: { page?: number; limit?: number; facility_id?: number; status?: string; date?: string }) => {
    return apiClient.get<any, ApiResponse<FacilityDonationSchedule[]>>('/schedules', { params });
  },

  getScheduleById: async (id: number) => {
    return apiClient.get<any, ApiResponse<FacilityDonationSchedule>>(`/schedules/${id}`);
  },

  createSchedule: async (data: Partial<FacilityDonationSchedule>) => {
    return apiClient.post<any, ApiResponse<FacilityDonationSchedule>>('/schedules', data);
  },

  updateSchedule: async (id: number, data: Partial<FacilityDonationSchedule>) => {
    return apiClient.put<any, ApiResponse<FacilityDonationSchedule>>(`/schedules/${id}`, data);
  },

  deleteSchedule: async (id: number) => {
    return apiClient.delete<ApiResponse<any>>(`/schedules/${id}`);
  },

  getScheduleDonors: async (scheduleId: number, params?: any) => {
    return apiClient.get<ApiResponse<any[]>>(`/schedules/${scheduleId}/donors`, { params });
  },

  updateDonorStatus: async (scheduleId: number, slotId: number, status: string) => {
    return apiClient.put<ApiResponse<any>>(`/schedules/${scheduleId}/donors/${slotId}/status`, { status });
  },

  exportScheduleDonors: async (scheduleId: number) => {
    const response = await apiClient.get(`/schedules/${scheduleId}/donors/export`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response as any]));
    const link = document.createElement('a');
    link.href = url;
    
    const contentDisposition = response.headers?.['content-disposition'];
    let filename = `Danh_sach_DKHM_${scheduleId}.xlsx`;
    if (contentDisposition && contentDisposition.includes('filename=')) {
      filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
