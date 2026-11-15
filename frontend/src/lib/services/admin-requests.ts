import api from './apiClient';

/**
 * Service phía quản trị viên/nhân viên gọi API quản lý yêu cầu cần máu, ghép nối người hiến, phân bổ kho và nhập/xuất Excel.
 */
export const adminRequestService = {
  /** Lấy danh sách yêu cầu cần máu theo bộ lọc. */
  getRequests: async (params?: any) => {
    return await api.get('/requests', { params });
  },

  /** Tạo mới yêu cầu cần máu từ phía nhân viên y tế. */
  createRequest: async (data: any) => {
    return await api.post('/requests', data);
  },

  /** Xuất danh sách yêu cầu cần máu ra file Excel tải về trình duyệt. */
  exportExcel: async (params?: any) => {
    const res = await api.get('/requests/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'requests.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Tải tệp Excel mẫu dùng cho chức năng nhập hàng loạt yêu cầu máu. */
  downloadTemplate: async () => {
    const res = await api.get('/requests/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'requests_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Gửi tệp Excel tải lên để import hàng loạt yêu cầu cần máu. */
  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/requests/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** Kích hoạt xử lý yêu cầu PENDING: tự động phân bổ kho hoặc tìm người hiến. */
  processRequest: async (id: number) => {
    return await api.post(`/requests/${id}/process`);
  },

  /** Cập nhật thông tin yêu cầu cần máu theo ID. */
  updateRequest: async (id: number, data: any) => {
    return await api.put(`/requests/${id}`, data);
  },

  /** Xóa yêu cầu cần máu theo ID. */
  deleteRequest: async (id: number) => {
    return await api.delete(`/requests/${id}`);
  },

  /** Hủy yêu cầu cần máu đang mở theo ID. */
  cancelRequest: async (id: number) => {
    return await api.post(`/requests/${id}/cancel`);
  },

  // --- MATCHING ---
  /** Lấy danh sách người hiến máu đã ghép nối với yêu cầu. */
  getMatches: async (id: number) => {
    return await api.get(`/requests/${id}/matches`);
  },
  /** Chạy thuật toán tìm kiếm người hiến máu phù hợp cho yêu cầu. */
  findMatches: async (id: number) => {
    return await api.post(`/requests/${id}/matches/find`);
  },
  /** Cập nhật trạng thái phản hồi của một lượt ghép nối. */
  updateMatchStatus: async (matchId: number, status: string) => {
    return await api.put(`/requests/matches/${matchId}/status`, { status });
  },

  // --- ALLOCATION ---
  /** Lấy danh sách túi máu đã phân bổ cho yêu cầu. */
  getAllocations: async (id: number) => {
    return await api.get(`/requests/${id}/allocations`);
  },
  /** Phân bổ danh sách túi máu chỉ định vào yêu cầu cần máu. */
  allocateInventory: async (id: number, inventoryIds: number[]) => {
    return await api.post(`/requests/${id}/allocations`, { inventory_ids: inventoryIds });
  },
  /** Giải phóng một túi máu đã phân bổ trả lại kho khả dụng. */
  releaseAllocation: async (allocationId: number) => {
    return await api.delete(`/requests/allocations/${allocationId}`);
  }
};
