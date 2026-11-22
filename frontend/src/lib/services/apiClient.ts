import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';

/**
 * Axios instance dùng chung cho toàn bộ Frontend, tự động gắn Bearer token và xử lý làm mới token khi gặp lỗi 401.
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // Trên trình duyệt, tự động đính kèm access_token từ localStorage vào header Authorization
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

/**
 * Đẩy các request đang chờ trong hàng đợi thực thi tiếp sau khi quá trình refresh token hoàn tất hoặc thất bại.
 */
const processQueue = (error: any, token: string | null = null) => {
  // Duyệt hàng đợi để resolve kèm token mới hoặc reject hàng loạt nếu refresh thất bại
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Mở bọc response.data để caller nhận trực tiếp payload từ backend
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Tránh lặp vô hạn nếu chính endpoint làm mới token bị lỗi
    if (originalRequest.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    // Xử lý hết hạn phiên đăng nhập (HTTP 401) khi request chưa từng retry
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Nếu đang có tiến trình refresh khác chạy, xếp request này vào hàng đợi chờ token mới
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Kiểm tra refresh_token; nếu không có thì buộc đăng xuất ngay
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }

      try {
        // Gọi endpoint refresh bằng axios gốc để không đi qua interceptor hiện tại
        const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh-token`, {
          refresh_token: refreshToken
        });

        const newAccessToken = response.data?.data?.access_token || response.data?.access_token;
        const newRefreshToken = response.data?.data?.refresh_token || response.data?.refresh_token;

        if (!newAccessToken) throw new Error('Không thể lấy access_token mới');

        // Lưu cặp token mới vào localStorage và đồng bộ lại thông tin user trong store
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newAccessToken);
          if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken);

          const newUser = response.data?.data?.user || response.data?.user;
          if (newUser) {
            useAuthStore.getState().setUser(newUser);
          }
        }

        // Cập nhật header mặc định rồi đánh thức toàn bộ request trong failedQueue và gọi lại request ban đầu
        apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (err) {
        // Nếu refresh thất bại: hủy hàng đợi chờ và đăng xuất người dùng
        processQueue(err, null);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          useAuthStore.getState().logout();
        }
        return Promise.reject(err);
      }
    }

    // Hiển thị thông báo tiếng Việt khi người dùng không đủ quyền truy cập (HTTP 403)
    if (error.response && error.response.status === 403) {
      if (typeof window !== 'undefined') {
        toast.error('Bạn không có đủ quyền để thực hiện thao tác này (Lỗi 403)');
      }
      if (error.response.data) {
        error.response.data.message = 'Bạn không có quyền (403 Forbidden)';
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Tải một tệp hình ảnh lên server thông qua API `/upload/image` và trả về URL ảnh sau khi upload.
 */
export const uploadImage = async (file: File): Promise<string> => {
  // Đóng gói file vào FormData và gửi dưới dạng multipart/form-data
  const formData = new FormData();
  formData.append('file', file);
  const res: any = await apiClient.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.url || res.url || res;
};

export default apiClient;
