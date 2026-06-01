'use client';
import Link from 'next/link';
import { Droplet, Heart, Phone, Mail, MapPin, Globe, MessageCircle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-navy text-white">
      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 flex items-center justify-center">
                <img src="/logo.png" alt="BloodLink Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-blood">Blood</span>
                <span className="text-white">Link</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Kết nối người hiến máu với những người cần máu. Cùng nhau xây dựng cộng đồng hiến máu lớn mạnh trên toàn quốc.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-md bg-slate-700 hover:bg-blood flex items-center justify-center transition-colors">
                <Globe className="h-4 w-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-md bg-slate-700 hover:bg-blood flex items-center justify-center transition-colors">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold mb-5 uppercase tracking-wider">Liên kết nhanh</h3>
            <ul className="space-y-3">
              {[
                { name: 'Trang chủ', href: '/' },
                { name: 'Yêu cầu máu', href: '/blood-requests' },
                { name: 'Tài liệu', href: '/education' },
                { name: 'Đăng ký hiến', href: '/register' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 hover:text-blood text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Donor */}
          <div>
            <h3 className="text-sm font-semibold mb-5 uppercase tracking-wider">Người hiến máu</h3>
            <ul className="space-y-3">
              {[
                { name: 'Hồ sơ của tôi', href: '/donor/profile' },
                { name: 'Lịch sử hiến máu', href: '/donor/history' },
                { name: 'Đặt lịch hiến', href: '/donor/book' },
                { name: 'Quên mật khẩu', href: '/forgot-password' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 hover:text-blood text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold mb-5 uppercase tracking-wider">Liên hệ</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-blood shrink-0 mt-0.5" />
                <span>Số 600, đường Nguyễn Văn Cừ (nối dài), Phường An Bình, Thành phố Cần Thơ</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Phone className="h-4 w-4 text-blood shrink-0" />
                <span>024 7300 1866</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Mail className="h-4 w-4 text-blood shrink-0" />
                <span>contact@bloodlink.vn</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm flex items-center gap-1">
            © {new Date().getFullYear()} BloodLink. Made with <Heart className="h-3 w-3 text-blood fill-blood" /> in Vietnam
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Chính sách</Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Điều khoản</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
