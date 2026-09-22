import apiClient from './apiClient';

export const adminCertificateService = {
  getCertificates: (params?: any) => apiClient.get('/donor/certificates', { params }),
  approveCertificate: (id: number) => apiClient.put(`/donor/certificates/${id}/approve`),
  rejectCertificate: (id: number, reason: string) => apiClient.put(`/donor/certificates/${id}/reject`, { reason }),
};
