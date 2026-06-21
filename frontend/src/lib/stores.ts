import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, DonorProfile } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  donorProfile: DonorProfile | null;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  setDonorProfile: (profile: DonorProfile) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      donorProfile: null,
      login: (user, token, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
        }
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
        set({ user: null, isAuthenticated: false, donorProfile: null });
      },
      setDonorProfile: (profile) => set({ donorProfile: profile }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
