import apiClient from './apiClient';

/**
 * Service quản trị duyệt hoặc từ chối giấy chứng nhận hiến máu.
 */
export const adminCertificateService = {
  /** Lấy danh sách yêu cầu cấp chứng nhận hiến máu. */
  getCertificates: (params?: any) => apiClient.get('/donor/certificates', { params }),
  /** Phê duyệt cấp giấy chứng nhận hiến máu theo ID. */
  approveCertificate: (id: number) => apiClient.put(`/donor/certificates/${id}/approve`),
  /** Từ chối cấp giấy chứng nhận kèm lý do cụ thể. */
  rejectCertificate: (id: number, reason: string) => apiClient.put(`/donor/certificates/${id}/reject`, { reason }),
};
