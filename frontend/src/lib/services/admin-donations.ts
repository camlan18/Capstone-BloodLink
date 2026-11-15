import api from './apiClient';

/**
 * Service quản trị lịch hẹn hiến máu, ghi nhận kết quả hiến máu và nhập xuất Excel.
 */
export const adminDonationService = {
  /** Lấy danh sách các lịch hẹn/slot hiến máu theo bộ lọc. */
  getSlots: async (params?: any) => {
    return await api.get('/donor/slots', { params });
  },

  /** Cập nhật trạng thái và ghi chú cho một lịch hẹn hiến máu. */
  updateSlotStatus: async (id: number, status: string, notes?: string) => {
    return await api.put(`/donor/slots/${id}/status`, { status, notes });
  },

  /** Ghi nhận kết quả buổi hiến máu thực tế và lượng máu thu được. */
  recordDonation: async (data: any) => {
    return await api.post('/donor/donations', data);
  },

  /** Xuất danh sách lịch hiến máu ra file Excel và tải xuống. */
  exportExcel: async (params?: any) => {
    const res = await api.get('/donor/slots/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'donations.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Tải xuống file Excel mẫu dùng để import lịch hiến máu. */
  downloadTemplate: async () => {
    const res = await api.get('/donor/slots/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'donations_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Import dữ liệu lịch hiến máu hàng loạt từ file Excel. */
  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/donor/slots/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** Tạo mới một lịch hẹn hiến máu từ giao diện quản trị. */
  createSlot: async (data: any) => {
    return await api.post('/donor/slots', data);
  }
};
