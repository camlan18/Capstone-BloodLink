import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, DonorProfile } from '@/types';

/** Kiểu trạng thái xác thực và hồ sơ người hiến máu lưu trong Zustand store. */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  donorProfile: DonorProfile | null;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  setDonorProfile: (profile: DonorProfile) => void;
  setUser: (user: User) => void;
}

/**
 * Zustand store lưu trạng thái đăng nhập (persist vào localStorage) và hồ sơ người hiến máu.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      donorProfile: null,
      /** Lưu token vào localStorage và cập nhật trạng thái đã đăng nhập trong store. */
      login: (user, token, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
        }
        set({ user, isAuthenticated: true });
      },
      /** Xóa token, reset store về trạng thái chưa đăng nhập và chuyển hướng về /login. */
      logout: () => {
        set({ user: null, isAuthenticated: false, donorProfile: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (window.location.pathname !== '/login') {
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
        }
      },
      /** Cập nhật thông tin hồ sơ người hiến máu trong store. */
      setDonorProfile: (profile) => set({ donorProfile: profile }),
      /** Cập nhật thông tin tài khoản người dùng trong store. */
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
