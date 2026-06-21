import api from './apiClient';

export const adminMasterDataService = {
  getBloodComponents: async () => {
    return await api.get('/master-data/blood-components');
  },

  getUrgencyLevels: async () => {
    return await api.get('/master-data/urgency-levels');
  },

  getBloodTypes: async (params?: any) => {
    return await api.get('/master-data/blood-types', { params });
  },

  createBloodType: async (data: any) => {
    return await api.post('/master-data/blood-types', data);
  },

  updateBloodType: async (id: number, data: any) => {
    return await api.put(`/master-data/blood-types/${id}`, data);
  },

  deleteBloodType: async (id: number) => {
    return await api.delete(`/master-data/blood-types/${id}`);
  },

  getRoles: async () => {
    return await api.get('/master-data/roles');
  },

  getFacilities: async (params?: any) => {
    return await api.get('/master-data/facilities', { params });
  },

  getFacilityById: async (id: number) => {
    return await api.get(`/master-data/facilities/${id}`);
  },

  createFacility: async (data: any) => {
    return await api.post('/master-data/facilities', data);
  },

  updateFacility: async (id: number, data: any) => {
    return await api.put(`/master-data/facilities/${id}`, data);
  },

  deleteFacility: async (id: number) => {
    return await api.delete(`/master-data/facilities/${id}`);
  },

  exportFacilitiesExcel: async (params?: any) => {
    const res = await api.get('/master-data/facilities/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'facilities.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  downloadFacilitiesTemplate: async () => {
    const res = await api.get('/master-data/facilities/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'facilities_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  importFacilitiesExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/master-data/facilities/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // --- BLOOD COMPONENTS ---
  getBloodComponentsPaginated: async (params?: any) => {
    return await api.get('/master-data/blood-components', { params });
  },
  createBloodComponent: async (data: any) => {
    return await api.post('/master-data/blood-components', data);
  },
  updateBloodComponent: async (id: number, data: any) => {
    return await api.put(`/master-data/blood-components/${id}`, data);
  },
  deleteBloodComponent: async (id: number) => {
    return await api.delete(`/master-data/blood-components/${id}`);
  },

  // --- BLOOD COMPATIBILITY ---
  getBloodCompatibilities: async (params?: any) => {
    return await api.get('/master-data/blood-compatibilities', { params });
  },
  createBloodCompatibility: async (data: any) => {
    return await api.post('/master-data/blood-compatibilities', data);
  },
  updateBloodCompatibility: async (id: number, data: any) => {
    return await api.put(`/master-data/blood-compatibilities/${id}`, data);
  },
  deleteBloodCompatibility: async (id: number) => {
    return await api.delete(`/master-data/blood-compatibilities/${id}`);
  },

  // --- DONATION INTERVAL RULES ---
  getDonationIntervalRules: async (params?: any) => {
    return await api.get('/master-data/donation-interval-rules', { params });
  },
  createDonationIntervalRule: async (data: any) => {
    return await api.post('/master-data/donation-interval-rules', data);
  },
  updateDonationIntervalRule: async (id: number, data: any) => {
    return await api.put(`/master-data/donation-interval-rules/${id}`, data);
  },
  deleteDonationIntervalRule: async (id: number) => {
    return await api.delete(`/master-data/donation-interval-rules/${id}`);
  },

  // --- LOCATION ---
  getProvinces: async () => {
    return await api.get('/master-data/provinces');
  },
  getDistricts: async (provinceId: number) => {
    return await api.get(`/master-data/provinces/${provinceId}/districts`);
  },
  getWards: async (districtId: number) => {
    return await api.get(`/master-data/districts/${districtId}/wards`);
  }
};
