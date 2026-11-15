import api from './apiClient';

/**
 * Service quản trị dữ liệu danh mục hệ thống (nhóm máu, thành phần máu, mức khẩn, cơ sở y tế, địa giới).
 */
export const adminMasterDataService = {
  /** Lấy toàn bộ danh mục thành phần máu. */
  getBloodComponents: async () => {
    return await api.get('/master-data/blood-components');
  },

  /** Lấy danh mục các mức độ khẩn cấp. */
  getUrgencyLevels: async () => {
    return await api.get('/master-data/urgency-levels');
  },

  /** Lấy danh sách nhóm máu hỗ trợ phân trang và tìm kiếm. */
  getBloodTypes: async (params?: any) => {
    return await api.get('/master-data/blood-types', { params });
  },

  /** Tạo mới một nhóm máu trong danh mục. */
  createBloodType: async (data: any) => {
    return await api.post('/master-data/blood-types', data);
  },

  /** Cập nhật thông tin nhóm máu theo ID. */
  updateBloodType: async (id: number, data: any) => {
    return await api.put(`/master-data/blood-types/${id}`, data);
  },

  /** Xóa nhóm máu khỏi danh mục theo ID. */
  deleteBloodType: async (id: number) => {
    return await api.delete(`/master-data/blood-types/${id}`);
  },

  /** Lấy danh sách vai trò người dùng trong hệ thống. */
  getRoles: async () => {
    return await api.get('/master-data/roles');
  },

  /** Lấy danh sách cơ sở y tế theo bộ lọc. */
  getFacilities: async (params?: any) => {
    return await api.get('/master-data/facilities', { params });
  },

  /** Lấy chi tiết một cơ sở y tế theo ID. */
  getFacilityById: async (id: number) => {
    return await api.get(`/master-data/facilities/${id}`);
  },

  /** Tạo mới cơ sở y tế. */
  createFacility: async (data: any) => {
    return await api.post('/master-data/facilities', data);
  },

  /** Cập nhật thông tin cơ sở y tế theo ID. */
  updateFacility: async (id: number, data: any) => {
    return await api.put(`/master-data/facilities/${id}`, data);
  },

  /** Xóa cơ sở y tế theo ID. */
  deleteFacility: async (id: number) => {
    return await api.delete(`/master-data/facilities/${id}`);
  },

  /** Xuất danh sách cơ sở y tế ra file Excel để tải xuống. */
  exportFacilitiesExcel: async (params?: any) => {
    const res = await api.get('/master-data/facilities/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'facilities.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Tải file Excel mẫu dùng để import danh sách cơ sở y tế. */
  downloadFacilitiesTemplate: async () => {
    const res = await api.get('/master-data/facilities/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'facilities_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  /** Import danh sách cơ sở y tế hàng loạt từ file Excel. */
  importFacilitiesExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/master-data/facilities/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // --- BLOOD COMPONENTS ---
  /** Lấy danh sách thành phần máu có phân trang. */
  getBloodComponentsPaginated: async (params?: any) => {
    return await api.get('/master-data/blood-components', { params });
  },
  /** Tạo mới thành phần máu. */
  createBloodComponent: async (data: any) => {
    return await api.post('/master-data/blood-components', data);
  },
  /** Cập nhật thành phần máu theo ID. */
  updateBloodComponent: async (id: number, data: any) => {
    return await api.put(`/master-data/blood-components/${id}`, data);
  },
  /** Xóa thành phần máu theo ID. */
  deleteBloodComponent: async (id: number) => {
    return await api.delete(`/master-data/blood-components/${id}`);
  },

  // --- BLOOD COMPATIBILITY ---
  /** Lấy danh sách quy tắc tương thích nhóm máu. */
  getBloodCompatibilities: async (params?: any) => {
    return await api.get('/master-data/blood-compatibilities', { params });
  },
  /** Tạo mới quy tắc tương thích nhóm máu. */
  createBloodCompatibility: async (data: any) => {
    return await api.post('/master-data/blood-compatibilities', data);
  },
  /** Cập nhật quy tắc tương thích nhóm máu theo ID. */
  updateBloodCompatibility: async (id: number, data: any) => {
    return await api.put(`/master-data/blood-compatibilities/${id}`, data);
  },
  /** Xóa quy tắc tương thích nhóm máu theo ID. */
  deleteBloodCompatibility: async (id: number) => {
    return await api.delete(`/master-data/blood-compatibilities/${id}`);
  },

  // --- DONATION INTERVAL RULES ---
  /** Lấy danh sách quy định khoảng cách thời gian giữa các lần hiến máu. */
  getDonationIntervalRules: async (params?: any) => {
    return await api.get('/master-data/donation-interval-rules', { params });
  },
  /** Tạo mới quy định khoảng cách ngày hiến máu. */
  createDonationIntervalRule: async (data: any) => {
    return await api.post('/master-data/donation-interval-rules', data);
  },
  /** Cập nhật quy định khoảng cách ngày hiến máu theo ID. */
  updateDonationIntervalRule: async (id: number, data: any) => {
    return await api.put(`/master-data/donation-interval-rules/${id}`, data);
  },
  /** Xóa quy định khoảng cách ngày hiến máu theo ID. */
  deleteDonationIntervalRule: async (id: number) => {
    return await api.delete(`/master-data/donation-interval-rules/${id}`);
  },

  // --- LOCATION ---
  /** Lấy danh sách tỉnh/thành phố. */
  getProvinces: async () => {
    return await api.get('/master-data/provinces');
  },
  /** Lấy danh sách phường/xã thuộc tỉnh/thành phố theo provinceId. */
  getWards: async (provinceId: number) => {
    return await api.get(`/master-data/provinces/${provinceId}/wards`);
  }
};
