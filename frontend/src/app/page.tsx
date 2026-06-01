'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Droplet, Heart, Activity, Users, ArrowRight, Search, MapPin, Calendar, UserPlus, Building2, Megaphone, Eye, Target, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { blogService } from '@/lib/services/blog';
import { BlogPost } from '@/types';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Tìm ngân hàng máu',
    desc: 'Tìm kiếm ngân hàng máu và thông tin về lượng máu trên toàn quốc.',
    color: 'bg-red-50 text-blood',
  },
  {
    icon: UserPlus,
    title: 'Đăng ký hiến máu',
    desc: 'Đăng ký làm người hiến máu tình nguyện tại cơ sở gần nhất.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: Calendar,
    title: 'Đặt lịch hiến',
    desc: 'Chọn ngày, giờ và địa điểm hiến máu phù hợp nhất với bạn.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Megaphone,
    title: 'Tổ chức chiến dịch',
    desc: 'Tổ chức chiến dịch hiến máu tại cộng đồng và trường học.',
    color: 'bg-emerald-50 text-emerald-600',
  },
];

const stats = [
  { number: '12,543', label: 'Lượt hiến máu', icon: Droplet },
  { number: '8,219', label: 'Tình nguyện viên', icon: Users },
  { number: '482', label: 'Yêu cầu hiện tại', icon: Activity },
  { number: '156', label: 'Cơ sở y tế', icon: Building2 },
];

export default function HomePage() {
  const [latestDocs, setLatestDocs] = useState<BlogPost[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    // Fetch latest blogs
    const fetchLatest = async () => {
      try {
        setLoadingDocs(true);
        const res = await blogService.getPosts({ limit: 3 });
        if (res && res.data) {
          setLatestDocs(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch latest blogs:", error);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchLatest();
  }, []);

  return (
    <MainLayout>
      {/* ===== HERO ===== */}
      <section className="relative bg-blood overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-md -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-md translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-md px-4 py-1.5 text-sm mb-6 animate-slide-up">
              <Heart className="h-4 w-4 fill-white" />
              <span>Mỗi giọt máu - Một cuộc đời</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight animate-slide-up">
              Cần tìm máu <br className="hidden md:block" />
              <span className="text-white/90">khẩn cấp?</span>
            </h1>
            <p className="text-lg md:text-xl text-red-100 mb-10 max-w-2xl mx-auto animate-slide-up">
              Chỉ cần điền thông tin và nhấn nút tìm kiếm. Nếu bạn muốn trở thành người hiến máu, hãy đăng ký ngay!
            </p>

            {/* Search / CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blood font-bold rounded-md hover:bg-slate-50 transition-all hover:shadow-xl shadow-lg text-base"
              >
                <UserPlus className="h-5 w-5" />
                Đăng ký hiến máu
              </Link>
              <Link
                href="/blood-requests"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-bold rounded-md hover:bg-white hover:text-blood transition-all text-base"
              >
                <Search className="h-5 w-5" />
                Tìm người hiến
              </Link>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 50L48 45.7C96 41.3 192 32.7 288 30.5C384 28.3 480 32.7 576 39.2C672 45.7 768 54.3 864 52.2C960 50 1056 37 1152 34.8C1248 32.7 1344 41.3 1392 45.7L1440 50V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ===== STEPS ===== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-blood font-semibold text-sm uppercase tracking-wider mb-2">Quy trình đơn giản</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy">4 bước hiến máu dễ dàng</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="group text-center relative">
                  <div className={`w-20 h-20 ${step.color} rounded-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                    <Icon className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-2">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 -right-4 w-8">
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blood-light rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-blood" />
                    </div>
                    <div className="text-3xl font-extrabold text-navy mb-1">{stat.number}</div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== WHO WE ARE ===== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <p className="text-blood font-semibold text-sm uppercase tracking-wider mb-2">Giới thiệu</p>
              <h2 className="text-3xl md:text-4xl font-bold text-navy mb-6">
                Chúng tôi là <span className="text-gradient">ai?</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-8">
                BloodLink là hệ thống hiến máu tự động kết nối người hiến máu tình nguyện với những người cần máu khẩn cấp trên toàn quốc. Thông qua SMS, ứng dụng di động và website, chúng tôi giúp quá trình tìm kiếm máu trở nên nhanh chóng và dễ dàng hơn bao giờ hết.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy text-lg mb-1">Tầm nhìn</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Trở thành nền tảng hiến máu lớn nhất Việt Nam, nơi mọi người có thể dễ dàng tiếp cận nguồn máu an toàn.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <Target className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy text-lg mb-1">Sứ mệnh</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Kết nối cộng đồng, xây dựng nguồn máu dự trữ bền vững, đảm bảo ai cũng có thể nhận được máu khi cần.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - illustration placeholder */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blood-light to-red-50 rounded-lg p-10 relative overflow-hidden border border-red-100 shadow-sm">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blood/10 rounded-md -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-blood/10 rounded-md translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-blood rounded-md flex items-center justify-center mb-6 animate-pulse-soft">
                    <Droplet className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-navy mb-3">Hiến máu cứu người</h3>
                  <p className="text-slate-600 text-sm mb-6 max-w-sm">Mỗi giọt máu bạn hiến có thể cứu sống đến 3 người. Hãy tham gia cùng chúng tôi ngay hôm nay.</p>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center bg-white rounded-lg p-4 shadow-sm">
                      <span className="text-2xl font-extrabold text-blood">A+</span>
                      <span className="text-xs text-slate-400 mt-1">Phổ biến</span>
                    </div>
                    <div className="flex flex-col items-center bg-white rounded-lg p-4 shadow-sm">
                      <span className="text-2xl font-extrabold text-blood">O-</span>
                      <span className="text-xs text-slate-400 mt-1">Khan hiếm</span>
                    </div>
                    <div className="flex flex-col items-center bg-white rounded-lg p-4 shadow-sm">
                      <span className="text-2xl font-extrabold text-blood">AB+</span>
                      <span className="text-xs text-slate-400 mt-1">Hiếm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY DONATE ===== */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-blood font-semibold text-sm uppercase tracking-wider mb-2">Lợi ích</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy">Vì sao nên hiến máu?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Heart, title: 'Tốt cho tim mạch', desc: 'Giảm lượng sắt thừa, giảm nguy cơ mắc các bệnh về tim mạch và đột quỵ.', color: 'bg-rose-50 text-rose-600' },
              { icon: Activity, title: 'Sản sinh máu mới', desc: 'Cơ thể nhanh chóng tái tạo máu, kích thích tủy xương sản xuất tế bào mới.', color: 'bg-sky-50 text-sky-600' },
              { icon: Sparkles, title: 'Kiểm tra sức khỏe', desc: 'Mỗi lần hiến máu, bạn sẽ được kiểm tra sức khỏe cơ bản miễn phí.', color: 'bg-amber-50 text-amber-600' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white p-8 rounded-lg shadow-sm border border-slate-50 hover:shadow-md hover:-translate-y-1 transition-all group">
                  <div className={`w-14 h-14 ${item.color} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== LATEST ARTICLES ===== */}
      {(loadingDocs || latestDocs.length > 0) && (
        <section className="py-20 bg-white border-t border-slate-50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <p className="text-blood font-semibold text-sm uppercase tracking-wider mb-2">Blog & Tin tức</p>
                <h2 className="text-3xl md:text-4xl font-bold text-navy">Bài viết mới nhất</h2>
              </div>
              <Link href="/blog" className="hidden md:inline-flex items-center gap-2 text-blood font-medium hover:text-blood-dark transition-colors group">
                Xem tất cả bài viết <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {latestDocs.length > 0 ? latestDocs.map((doc) => (
                <Card key={doc.post_id} className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all border-slate-50 rounded-lg group">
                  <div className="h-48 bg-slate-100 relative overflow-hidden">
                    {doc.thumbnail_url ? (
                      <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-50 group-hover:bg-red-100 transition-colors">
                        <BookOpen className="h-16 w-16 text-blood/30" />
                      </div>
                    )}
                    {doc.category && (
                      <Badge className="absolute top-4 left-4 bg-white text-blood shadow-sm border-none rounded-md px-3 py-1 font-semibold">
                        {doc.category.category_name}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <h3 className="font-bold text-lg text-navy mb-3 line-clamp-2 group-hover:text-blood transition-colors">{doc.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{doc.summary}</p>
                  </CardContent>
                  <CardFooter className="p-6 border-t border-slate-50 bg-white mt-auto flex items-center justify-end">
                    <Link
                      href={`/blog/${doc.slug}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold border border-blood text-blood bg-white hover:bg-blood hover:text-white rounded-md transition-all group/btn"
                    >
                      Đọc tiếp <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </CardFooter>
                </Card>
              )) : (
                [1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-slate-50 border border-slate-100 rounded-lg h-96"></div>
                ))
              )}
            </div>
            
            <div className="mt-8 text-center md:hidden">
              <Link href="/blog" className="text-blood font-semibold hover:text-navy flex items-center gap-1 group/link justify-center">
                Xem tất cả <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-blood to-blood-dark rounded-lg p-10 md:p-16 text-center text-white flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-md -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-md translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Tìm hiểu thêm về hiến máu</h2>
              <p className="text-red-100 mb-8 max-w-2xl mx-auto text-lg">Đọc các bài viết, tài liệu hướng dẫn và tin tức mới nhất về phong trào hiến máu nhân đạo.</p>
              <Link
                href="/education"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blood font-bold rounded-md hover:bg-slate-50 transition-all shadow-lg text-base"
              >
                Khám phá tài liệu <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
