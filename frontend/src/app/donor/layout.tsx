'use client';
import { ReactNode, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuthStore } from '@/lib/stores';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Clock, CalendarPlus, Droplet } from 'lucide-react';

export default function DonorLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router, mounted]);

  if (!mounted || !isAuthenticated) return null;

  const navItems = [
    { name: 'Hồ sơ của tôi', path: '/donor/profile', icon: User },
    { name: 'Lịch sử hiến máu', path: '/donor/history', icon: Clock },
    { name: 'Đăng ký hiến máu', path: '/donor/book', icon: CalendarPlus },
  ];

  return (
    <MainLayout>
      <div className="bg-white min-h-[calc(100vh-64px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-2xl font-bold text-navy mb-8">Cài đặt tài khoản</h1>
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar */}
            <div className="w-full lg:w-56 shrink-0">
              <nav className="space-y-1 sticky top-24">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all text-sm font-medium ${
                        isActive
                          ? 'bg-slate-100 text-navy font-semibold'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-navy'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
