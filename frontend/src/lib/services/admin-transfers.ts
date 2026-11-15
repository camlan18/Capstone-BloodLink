import api from './apiClient';

/**
 * Service phía quản trị viên gọi API điều chuyển máu giữa các cơ sở y tế.
 */
export const adminTransferService = {
  /** Lấy danh sách phiếu điều chuyển máu theo bộ lọc. */
  getTransfers: async (params?: any) => {
    return await api.get('/transfers', { params });
  },

  /** Lấy thông tin chi tiết một phiếu điều chuyển theo ID. */
  getTransferById: async (id: number) => {
    return await api.get(`/transfers/${id}`);
  },

  /** Tạo mới phiếu yêu cầu điều chuyển máu giữa hai cơ sở. */
  createTransfer: async (data: any) => {
    return await api.post('/transfers', data);
  },

  /** Phê duyệt phiếu điều chuyển kèm danh sách túi máu xuất đi. */
  approveTransfer: async (id: number, data: any) => {
    return await api.post(`/transfers/${id}/approve`, data);
  },

  /** Xác nhận xuất kho và bắt đầu vận chuyển phiếu điều chuyển. */
  shipTransfer: async (id: number) => {
    return await api.post(`/transfers/${id}/ship`);
  },

  /** Xác nhận lô máu đã giao tới nơi nhận. */
  deliverTransfer: async (id: number) => {
    return await api.post(`/transfers/${id}/deliver`);
  },

  /** Xác nhận nhập kho các túi máu từ phiếu điều chuyển về cơ sở đích. */
  receiveTransfer: async (id: number) => {
    return await api.post(`/transfers/${id}/receive`);
  },

  /** Xác nhận nhận cùng lúc nhiều phiếu điều chuyển. */
  receiveBatchTransfers: async (transferIds: number[]) => {
    return await api.post('/transfers/receive-batch', { transfer_ids: transferIds });
  },

  /** Từ chối phiếu điều chuyển kèm lý do. */
  rejectTransfer: async (id: number, reason: string) => {
    return await api.post(`/transfers/${id}/reject`, { reason });
  },

  /** Hủy phiếu điều chuyển đang chờ duyệt hoặc chưa xuất kho. */
  cancelTransfer: async (id: number) => {
    return await api.post(`/transfers/${id}/cancel`);
  },
};
