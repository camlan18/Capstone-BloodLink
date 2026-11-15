import apiClient from './apiClient';
import { ApiResponse, BloodRequest } from '@/types';

/**
 * Service phía người dùng/công khai gọi API tạo và tra cứu yêu cầu cần máu.
 */
export const bloodRequestService = {
  /** Lấy danh sách yêu cầu máu khẩn cấp đang chờ hỗ trợ công khai. */
  getUrgentRequests: async () => {
    return apiClient.get<any, ApiResponse<BloodRequest[]>>('/requests/public', {
      params: {
        urgency_level: 'URGENT',
        status: 'PENDING'
      }
    });
  },
  /** Lấy danh sách yêu cầu cần máu công khai có lọc theo nhóm máu và phân trang. */
  getAllRequests: async (params?: { page?: number; limit?: number; blood_type_id?: number }) => {
    return apiClient.get<any, ApiResponse<BloodRequest[]>>('/requests/public', { params });
  },
  /** Gửi yêu cầu cần máu mới qua cổng công khai. */
  createPublicRequest: async (data: any) => {
    return apiClient.post<any, ApiResponse<any>>('/requests/public', data);
  },
  /** Lấy danh sách yêu cầu cần máu do người dùng hiện tại đã tạo. */
  getMyRequests: async (params?: any) => {
    return apiClient.get<any, ApiResponse<any>>('/requests/my', { params });
  },
  /** Lấy chi tiết một yêu cầu cần máu của người dùng đang đăng nhập theo ID. */
  getMyRequestDetails: async (id: number) => {
    return apiClient.get<any, ApiResponse<any>>(`/requests/my/${id}`);
  },
  /** Tra cứu công khai tiến độ yêu cầu cần máu bằng mã yêu cầu (`code`). */
  getRequestByCode: async (code: string) => {
    return apiClient.get<any, ApiResponse<any>>(`/requests/public/code/${code}`);
  }
};
