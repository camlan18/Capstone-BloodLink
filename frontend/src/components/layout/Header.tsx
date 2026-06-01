'use client';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores';
import { Droplet, Menu, LogOut, User as UserIcon, X, ChevronDown, Heart, Clock, CalendarPlus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

const navLinks = [
  { name: 'Trang chủ', href: '/' },
  { name: 'Tìm người hiến', href: '/blood-requests' },
  { 
    name: 'Về chúng tôi', 
    href: '/about',
    submenu: [
      { name: 'Câu chuyện của chúng tôi', href: '/about#story', description: 'Hành trình và sứ mệnh của BloodLink' },
      { name: 'Tầm nhìn & Sứ mệnh', href: '/about#vision', description: 'Mục tiêu hướng tới trong tương lai' },
      { name: 'Đội ngũ', href: '/about#team', description: 'Những người đứng sau dự án' },
      { name: 'Thành tựu', href: '/about#achievements', description: 'Các cột mốc đáng nhớ' },
    ]
  },
  { 
    name: 'Tài liệu', 
    href: '/education',
    submenu: [
      { name: 'Kiến thức chung', href: '/education?category=1', description: 'Những điều cần biết trước khi hiến máu' },
      { name: 'Quy trình', href: '/education?category=2', description: 'Các bước chuẩn bị và thực hiện' },
      { name: 'Lợi ích', href: '/education?category=3', description: 'Tại sao hiến máu tốt cho sức khỏe' },
      { name: 'Hỏi đáp (FAQ)', href: '/education?category=4', description: 'Giải đáp các thắc mắc thường gặp' },
    ]
  },
  { name: 'Liên hệ', href: '/contact' },
];

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-slate-200/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 flex items-center justify-center group-hover:scale-110 transition-transform">
            <img src="/logo.png" alt="BloodLink Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold">
            <span className="text-blood">Blood</span>
            <span className="text-navy">Link</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 relative">
          {navLinks.map((link) => (
            <div key={link.href} className="relative group">
              <Link
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blood rounded-lg hover:bg-blood-light transition-all flex items-center gap-1"
              >
                {link.name}
                {link.submenu && <ChevronDown className="w-3 h-3 transition-transform group-hover:-rotate-180" />}
              </Link>
              
              {link.submenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[500px] bg-white rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 z-50">
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {link.submenu.map((sub) => (
                      <Link 
                        key={sub.name} 
                        href={sub.href}
                        className="p-3 rounded-lg hover:bg-slate-50 transition-colors group/item"
                      >
                        <div className="font-semibold text-sm text-navy group-hover/item:text-blood mb-1">{sub.name}</div>
                        <div className="text-xs text-slate-500">{sub.description}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden lg:flex items-center gap-3">
          {mounted && isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors">
                <div className="w-8 h-8 rounded-md bg-blood flex items-center justify-center overflow-hidden shrink-0">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-navy">{user?.full_name}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-navy">{user?.full_name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/donor/profile" className="w-full flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> Hồ sơ hiến máu
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/donor/history" className="w-full flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Lịch sử hiến máu
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/donor/book" className="w-full flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" /> Đăng ký hiến máu
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-blood focus:text-blood" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-medium text-navy hover:text-blood transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blood hover:bg-blood-dark rounded-md transition-all hover:shadow-lg hover:shadow-blood/25"
              >
                Đăng ký
              </Link>
            </div>
          )}
          {!mounted && (
            <div className="w-24 h-10 animate-pulse bg-slate-100 rounded-md"></div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 animate-slide-up">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-slate-600 hover:text-blood hover:bg-blood-light rounded-lg transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              {mounted && isAuthenticated ? (
                <>
                  <Link href="/donor/profile" onClick={() => setMobileOpen(false)} className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-blood hover:bg-blood-light rounded-lg transition-colors">
                    Hồ sơ của tôi
                  </Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="px-4 py-3 text-sm font-medium text-blood hover:bg-blood-light rounded-lg transition-colors text-left">
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-navy hover:bg-slate-100 rounded-lg transition-colors text-center"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-semibold text-white bg-blood hover:bg-blood-dark rounded-md transition-colors text-center"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
