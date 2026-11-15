import api from './apiClient';

/**
 * Service phía quản trị viên gọi API quản lý kho máu, nhập/xuất Excel, hủy và điều chuyển túi máu.
 */
export const adminInventoryService = {
  /** Lấy danh sách túi máu trong kho theo bộ lọc. */
  getInventoryList: async (params?: any) => {
    return await api.get('/inventory', { params });
  },

  /** Lấy số liệu thống kê tồn kho máu theo cơ sở hoặc toàn hệ thống. */
  getInventoryStats: async (params?: any) => {
    return await api.get('/inventory/stats', { params });
  },

  /** Tiếp nhận và nhập mới một túi máu vào kho. */
  receiveBlood: async (data: any) => {
    return await api.post('/inventory/receive', data);
  },

  /** Cập nhật thông tin chi tiết túi máu theo ID. */
  updateBlood: async (id: number, data: any) => {
    return await api.put(`/inventory/${id}`, data);
  },

  /** Hủy túi máu hỏng hoặc hết hạn kèm lý do. */
  discardBlood: async (id: number, reason: string) => {
    return await api.post(`/inventory/${id}/discard`, { reason });
  },

  /** Điều chuyển nhanh một túi máu sang cơ sở y tế khác. */
  transferBlood: async (id: number, data: { to_facility_id: number, notes?: string }) => {
    return await api.post(`/inventory/${id}/transfer`, data);
  },

  /** Xuất danh sách tồn kho máu ra tệp Excel. */
  exportExcel: async (params?: any) => {
    const res = await api.get('/inventory/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Tải tệp Excel mẫu phục vụ nhập kho máu hàng loạt. */
  downloadTemplate: async () => {
    const res = await api.get('/inventory/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Nhập hàng loạt túi máu vào kho từ tệp Excel tải lên. */
  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/inventory/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
