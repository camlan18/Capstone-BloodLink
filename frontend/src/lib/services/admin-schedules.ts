import apiClient from './apiClient';
import { ApiResponse } from '@/types';

/** Thông tin đợt tổ chức hiến máu tại một cơ sở y tế. */
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

/**
 * Service quản trị đợt hiến máu: tạo/sửa/xóa lịch, duyệt người đăng ký và xuất Excel.
 */
export const adminSchedulesService = {
  /** Lấy danh sách đợt hiến máu có phân trang và bộ lọc. */
  getSchedules: async (params?: { page?: number; limit?: number; facility_id?: number; status?: string; date?: string }) => {
    return apiClient.get<any, ApiResponse<FacilityDonationSchedule[]>>('/schedules', { params });
  },

  /** Lấy chi tiết một đợt hiến máu theo ID. */
  getScheduleById: async (id: number) => {
    return apiClient.get<any, ApiResponse<FacilityDonationSchedule>>(`/schedules/${id}`);
  },

  /** Tạo mới đợt tổ chức hiến máu. */
  createSchedule: async (data: Partial<FacilityDonationSchedule>) => {
    return apiClient.post<any, ApiResponse<FacilityDonationSchedule>>('/schedules', data);
  },

  /** Cập nhật thông tin đợt hiến máu theo ID. */
  updateSchedule: async (id: number, data: Partial<FacilityDonationSchedule>) => {
    return apiClient.put<any, ApiResponse<FacilityDonationSchedule>>(`/schedules/${id}`, data);
  },

  /** Xóa đợt hiến máu theo ID. */
  deleteSchedule: async (id: number) => {
    return apiClient.delete<ApiResponse<any>>(`/schedules/${id}`);
  },

  /** Lấy danh sách người đăng ký tham gia trong một đợt hiến máu. */
  getScheduleDonors: async (scheduleId: number, params?: any) => {
    return apiClient.get<ApiResponse<any[]>>(`/schedules/${scheduleId}/donors`, { params });
  },

  /** Cập nhật trạng thái tham gia của người hiến máu trong đợt hiến máu. */
  updateDonorStatus: async (scheduleId: number, slotId: number, status: string) => {
    return apiClient.put<ApiResponse<any>>(`/schedules/${scheduleId}/donors/${slotId}/status`, { status });
  },

  /** Xuất danh sách người đăng ký của đợt hiến máu ra file Excel. */
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
