import api from './apiClient';

/**
 * Service quản trị người dùng: danh sách, tạo/sửa, khóa mở tài khoản và nhập xuất Excel.
 */
export const adminUserService = {
  /** Lấy danh sách người dùng có lọc và phân trang. */
  getUsers: async (params?: any) => {
    return await api.get('/users', { params });
  },

  /** Lấy thông tin chi tiết một người dùng theo ID. */
  getUserById: async (id: number) => {
    return await api.get(`/users/${id}`);
  },

  /** Tạo mới tài khoản người dùng từ trang quản trị. */
  createUser: async (data: any) => {
    return await api.post('/users', data);
  },

  /** Cập nhật thông tin người dùng theo ID. */
  updateUser: async (id: number, data: any) => {
    return await api.put(`/users/${id}`, data);
  },

  /** Đảo trạng thái khóa hoặc mở khóa tài khoản người dùng. */
  toggleLock: async (id: number) => {
    return await api.put(`/users/${id}/lock`);
  },

  /** Xuất danh sách người dùng ra file Excel và tải xuống trình duyệt. */
  exportExcel: async (params?: any) => {
    const res = await api.get('/users/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Tải xuống file Excel mẫu dùng để import danh sách người dùng. */
  downloadTemplate: async () => {
    const res = await api.get('/users/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Import danh sách người dùng hàng loạt từ file Excel. */
  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
