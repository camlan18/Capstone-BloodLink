'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Droplets, FileText, Settings, LogOut, FileSearch, MessageSquare, Menu, User, HeartPulse, Building2, Edit3, ChevronDown, Bell, BookOpen, Calendar } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { label: 'Tổng quan', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF', 'MODERATOR', 'HOSPITAL_STAFF'] },
    { label: 'Quản lý Lịch hiến máu', href: '/admin/schedules', icon: Calendar, roles: ['ADMIN', 'STAFF'] },
    { label: 'Quản lý Kho máu', href: '/admin/inventory', icon: Droplets, roles: ['ADMIN', 'STAFF'] },
    { label: 'Quản lý Đăng ký hiến', href: '/admin/donations', icon: FileSearch, roles: ['ADMIN', 'STAFF'] },
    { label: 'Yêu cầu từ bệnh viện', href: '/admin/requests', icon: FileText, roles: ['ADMIN', 'STAFF', 'HOSPITAL_STAFF'] },
    { label: 'Quản lý Người dùng', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { label: 'Dữ liệu Máu', href: '/admin/blood-master-data', icon: HeartPulse, roles: ['ADMIN'] },
    { label: 'Quản lý Cơ sở y tế', href: '/admin/facilities', icon: Building2, roles: ['ADMIN'] },
    { label: 'Quản lý Bài viết', href: '/admin/posts', icon: Edit3, roles: ['ADMIN', 'MODERATOR'] },
    { label: 'Tài liệu Giáo dục', href: '/admin/education', icon: BookOpen, roles: ['ADMIN', 'MODERATOR'] },
    { label: 'Thông báo', href: '/admin/notifications', icon: Bell, roles: ['ADMIN'] },
    { label: 'Cài đặt', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.role_code;
  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(userRole || ''));

  useEffect(() => {
    if (userRole && pathname !== '/admin') {
      const isAllowed = filteredNavItems.some(item => pathname.startsWith(item.href));
      if (!isAllowed) {
        router.push('/admin');
      }
    }
  }, [pathname, userRole, filteredNavItems, router]);

  const formattedDate = format(currentTime, "EEEE, dd/MM/yyyy", { locale: vi });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar - Deep Blood Red */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#7A0010] text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20 shadow-md relative`}>
        <div className="h-16 flex items-center justify-center border-b border-white/10 shrink-0 px-4">
          <Link href="/admin" className="font-bold tracking-tight flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-[#7A0010]">
              <Droplets className="w-5 h-5 fill-current" />
            </div>
            {isSidebarOpen && (
              <span className="text-xl whitespace-nowrap">Blood<span className="opacity-80">Admin</span></span>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isSidebarOpen ? item.label : undefined}
                className={`flex items-center ${isSidebarOpen ? 'justify-start px-5' : 'justify-center'} py-3 text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-black/20 border-l-4 border-white text-white' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <Icon className={`shrink-0 w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-white/70'}`} />
                {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F4F6F8]">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Clock Date/Time like Screenshot */}
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600 bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                <span className="capitalize">{mounted ? formattedDate : 'Đang tải...'}</span>
              </div>
              <div className="w-px h-4 bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{mounted ? formattedTime : '--:--:--'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 outline-none hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-[#7A0010] flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 leading-tight">{user?.full_name || 'Admin'}</p>
                  <p className="text-xs text-slate-500 uppercase font-semibold">{typeof user?.role === 'string' ? user.role : user?.role?.role_name || 'Quản trị viên'}</p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1">
                <div className="px-3 py-2 mb-1 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{user?.full_name || 'Admin'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <DropdownMenuItem className="cursor-pointer py-2">
                  <User className="w-4 h-4 mr-2 text-slate-500" />
                  Hồ sơ cá nhân
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2">
                  <Settings className="w-4 h-4 mr-2 text-slate-500" />
                  Cài đặt tài khoản
                </DropdownMenuItem>
                <div className="h-px bg-slate-100 my-1"></div>
                <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer py-2 font-medium">
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-4 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
    </svg>
  );
}
