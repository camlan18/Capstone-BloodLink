import apiClient from './apiClient';
import { ApiResponse, User } from '@/types';

/**
 * Service frontend gọi các API xác thực tài khoản, OTP, mật khẩu và hồ sơ cá nhân.
 */
export const authService = {
  /** Gửi thông tin đăng nhập để nhận access token và thông tin người dùng. */
  login: async (credentials: any) => {
    return apiClient.post<any, ApiResponse<{ access_token: string; refresh_token?: string; user: User }>>('/auth/login', credentials);
  },
  /** Đăng ký tài khoản người dùng mới. */
  register: async (data: any) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/register', data);
  },
  /** Xác thực mã OTP sau khi đăng ký tài khoản. */
  verifyOtp: async (data: { email: string; otp_code: string }) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/verify-otp', data);
  },
  /** Yêu cầu gửi lại mã OTP xác thực qua email. */
  resendOtp: async (data: { email: string }) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/resend-otp', data);
  },
  /** Lấy thông tin hồ sơ người dùng đang đăng nhập. */
  getProfile: async () => {
    return apiClient.get<any, ApiResponse<User>>('/users/profile');
  },
  /** Gửi yêu cầu cấp mã OTP khôi phục mật khẩu tới email. */
  forgotPassword: async (email: string) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/forgot-password', { email });
  },
  /** Đặt lại mật khẩu mới bằng mã OTP đã nhận. */
  resetPassword: async (data: { email: string; otp_code: string; new_password: string }) => {
    return apiClient.post<any, ApiResponse<any>>('/auth/reset-password', data);
  },
  /** Tải lên ảnh đại diện mới cho tài khoản người dùng hiện tại. */
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<any, ApiResponse<User>>('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  /** Yêu cầu gửi mã OTP xác nhận đổi mật khẩu cho tài khoản đang đăng nhập. */
  requestChangePasswordOtp: async () => {
    return apiClient.post<any, ApiResponse<any>>('/users/change-password-otp', {});
  },
  /** Thực hiện đổi mật khẩu với mã OTP xác nhận và mật khẩu mới. */
  changePassword: async (data: { otp_code: string; new_password: string }) => {
    return apiClient.put<any, ApiResponse<any>>('/users/change-password', data);
  },
};
