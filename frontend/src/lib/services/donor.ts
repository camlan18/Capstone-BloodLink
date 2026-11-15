import apiClient from './apiClient';
import { ApiResponse, DonorProfile, DonationSlot, DonationHistory } from '@/types';

/**
 * Service frontend phục vụ người hiến máu: hồ sơ, lịch đặt, lịch sử hiến máu, thành tích và chứng nhận.
 */
export const donorService = {
  /** Lấy thông tin hồ sơ người hiến máu hiện tại. */
  getProfile: async () => {
    return apiClient.get<any, ApiResponse<DonorProfile>>('/donor/profile');
  },
  /** Lấy danh sách slot hiến máu khả dụng (tùy chọn lọc theo ngày). */
  getSlots: async (date?: string) => {
    return apiClient.get<any, ApiResponse<DonationSlot[]>>(`/donor/slots${date ? `?date=${date}` : ''}`);
  },
  /** Lấy danh sách lịch hẹn hiến máu của cá nhân người dùng. */
  getMySlots: async () => {
    return apiClient.get<any, any>('/donor/my-slots');
  },
  /** Lấy danh sách lịch tổ chức hiến máu theo cơ sở y tế. */
  getSchedules: async (facilityId?: string) => {
    return apiClient.get<any, any>(`/donor/schedules${facilityId ? `?facilityId=${facilityId}` : ''}`);
  },
  /** Đăng ký đặt lịch hiến máu theo đợt hoặc theo cơ sở/yêu cầu khẩn. */
  bookSlot: async (data: { schedule_id?: number, request_id?: number, facility_id?: number, specific_date?: string, expected_time?: string, notes?: string, is_health_cleared?: boolean }) => {
    return apiClient.post<any, ApiResponse<any>>('/donor/book-slot', data);
  },
  /** Hủy lịch hẹn hiến máu đã đăng ký theo slotId. */
  cancelSlot: async (slotId: number) => {
    return apiClient.post<any, ApiResponse<any>>(`/donor/cancel-slot/${slotId}`, {});
  },
  /** Cập nhật thông tin hồ sơ sức khỏe và cá nhân của người hiến máu. */
  updateProfile: async (data: any) => {
    return apiClient.put<any, ApiResponse<any>>('/donor/profile', data);
  },
  /** Lấy lịch sử các lần hiến máu đã hoàn thành. */
  getHistory: async () => {
    return apiClient.get<any, ApiResponse<DonationHistory[]>>('/donor/history');
  },
  /** Lấy danh sách lời kêu gọi hiến máu phù hợp nhóm máu của bản thân. */
  getMyMatches: async () => {
    return apiClient.get<any, any>('/donor/my-matches');
  },
  /** Lấy thông tin thống kê thành tích và huy hiệu hiến máu. */
  getAchievements: async () => {
    return apiClient.get<any, any>('/donor/achievements');
  },
  /** Lấy chi tiết giấy chứng nhận hiến máu theo donationId. */
  getCertificate: async (donationId: number) => {
    return apiClient.get<any, any>(`/donor/certificate/${donationId}`);
  },
  /** Lấy danh sách tất cả giấy chứng nhận hiến máu của bản thân. */
  getMyCertificates: async (params?: any) => {
    return apiClient.get<any, any>('/donor/my-certificates', { params });
  }
};
