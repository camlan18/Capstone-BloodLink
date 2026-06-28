import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm interceptor để đính kèm token vào mọi request nếu có
apiClient.interceptors.request.use(
  (config) => {
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

const processQueue = (error: any, token: string | null = null) => {
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
    // Backend trả về theo format ResponseInterceptor: { data, meta }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Không thử lại nếu là request gọi refresh-token
    if (originalRequest.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
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

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh-token`, {
          refresh_token: refreshToken
        });

        // Lấy token (tùy thuộc vào việc interceptor response bên NestJS bọc data)
        const newAccessToken = response.data?.data?.access_token || response.data?.access_token;
        const newRefreshToken = response.data?.data?.refresh_token || response.data?.refresh_token;

        if (!newAccessToken) throw new Error('Không thể lấy access_token mới');

        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newAccessToken);
          if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken);

          const newUser = response.data?.data?.user || response.data?.user;
          if (newUser) {
            useAuthStore.getState().setUser(newUser);
          }
        }

        apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          useAuthStore.getState().logout();
        }
        return Promise.reject(err);
      }
    }

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

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res: any = await apiClient.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.url || res.url || res;
};

export default apiClient;
