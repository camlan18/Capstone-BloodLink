import apiClient from './apiClient';
import { ApiResponse, User } from '@/types';

export const authService = {
  login: async (credentials: any) => {
    return apiClient.post<any, ApiResponse<{ access_token: string; refresh_token?: string; user: User }>>('/auth/login', credentials);
  },
  register: async (data: any) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/register', data);
  },
  verifyOtp: async (data: { email: string; otp_code: string }) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/verify-otp', data);
  },
  resendOtp: async (data: { email: string }) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/resend-otp', data);
  },
  getProfile: async () => {
    return apiClient.get<any, ApiResponse<User>>('/users/profile');
  },
  forgotPassword: async (email: string) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/forgot-password', { email });
  },
  resetPassword: async (data: { email: string; otp_code: string; new_password: string }) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/reset-password', data);
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<any, ApiResponse<User>>('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  requestChangePasswordOtp: async () => {
    return apiClient.post<any, ApiResponse<any>>('/users/change-password-otp', {});
  },
  changePassword: async (data: { otp_code: string; new_password: string }) => {
    return apiClient.put<any, ApiResponse<any>>('/users/change-password', data);
  },
};
