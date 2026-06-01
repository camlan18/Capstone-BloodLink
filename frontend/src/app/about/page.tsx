'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Heart, ShieldCheck, Users, Target } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-slate-50 border-b border-slate-100 py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blood/5 rounded-l-full blur-3xl -translate-y-1/4 translate-x-1/4"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <Badge>Về Chúng Tôi</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-navy mt-6 mb-6 leading-tight">
            Kết nối dòng máu, <br/><span className="text-blood">Trao gửi sự sống</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            BloodLink ra đời với sứ mệnh xây dựng một cộng đồng hiến máu vững mạnh, nơi mọi giọt máu cho đi đều có thể cứu sống một cuộc đời ở lại.
          </p>
        </div>
      </div>

      {/* Story */}
      <div className="py-20 bg-white" id="story">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-navy mb-6">Câu chuyện của chúng tôi</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Mỗi năm, hàng ngàn bệnh nhân trên khắp cả nước phải đối mặt với nguy cơ thiếu máu trong các ca phẫu thuật khẩn cấp. Nỗi đau và sự bất lực của người nhà bệnh nhân khi không tìm được nguồn máu phù hợp là động lực lớn nhất để chúng tôi thành lập BloodLink.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Chúng tôi áp dụng công nghệ để rút ngắn khoảng cách giữa người hiến máu tình nguyện và những bệnh viện đang cần máu, giúp quy trình trở nên minh bạch, nhanh chóng và an toàn hơn bao giờ hết.
              </p>
            </div>
            <div className="flex-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blood/20 aspect-square">
                <img src="/images/about-story.jpg" alt="Câu chuyện BloodLink" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?q=80&w=1000&auto=format&fit=crop' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="py-20 bg-slate-50" id="vision">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blood/5 transition-all">
              <div className="w-16 h-16 bg-blood/10 rounded-2xl flex items-center justify-center mb-6 text-blood">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">Sứ mệnh</h3>
              <p className="text-slate-600 leading-relaxed">
                Cung cấp một nền tảng công nghệ tin cậy, kết nối nhanh chóng những người sẵn sàng hiến máu với những cơ sở y tế đang cần. Chúng tôi lan tỏa thông điệp nhân văn về tình yêu thương con người và trách nhiệm cộng đồng.
              </p>
            </div>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-700">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">Tầm nhìn</h3>
              <p className="text-slate-600 leading-relaxed">
                Trở thành mạng lưới ngân hàng máu thông minh lớn nhất Việt Nam. Nơi không còn bệnh nhân nào phải từ bỏ hy vọng sống chỉ vì thiếu máu, và việc hiến máu trở thành thói quen tốt đẹp của mọi công dân khỏe mạnh.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats/Achievements */}
      <div className="py-20 bg-navy relative overflow-hidden" id="achievements">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Thành tựu đáng tự hào</h2>
            <p className="text-slate-300">Những con số biết nói minh chứng cho nỗ lực không ngừng nghỉ của cộng đồng BloodLink</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard number="10,000+" label="Người hiến máu" icon={Users} />
            <StatCard number="15,500+" label="Đơn vị máu (ml)" icon={Heart} />
            <StatCard number="50+" label="Bệnh viện đối tác" icon={ShieldCheck} />
            <StatCard number="5,000+" label="Mạng sống được cứu" icon={Target} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 bg-white text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl font-bold text-navy mb-6">Bạn đã sẵn sàng để trở thành một anh hùng?</h2>
          <p className="text-slate-600 mb-10">Hãy tham gia cộng đồng BloodLink ngay hôm nay để mang lại hy vọng và sự sống cho hàng ngàn người bệnh.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-3 bg-blood text-white rounded-lg font-bold hover:bg-blood-dark hover:shadow-xl hover:shadow-blood/20 transition-all">
              Đăng ký hiến máu
            </Link>
            <Link href="/contact" className="px-8 py-3 bg-slate-100 text-navy rounded-lg font-bold hover:bg-slate-200 transition-all">
              Liên hệ chúng tôi
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-4 py-1.5 bg-blood/10 text-blood font-semibold rounded-full text-sm">
      {children}
    </span>
  );
}

function StatCard({ number, label, icon: Icon }: { number: string; label: string; icon: any }) {
  return (
    <div className="p-6">
      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-4xl font-extrabold text-white mb-2">{number}</div>
      <div className="text-slate-300 font-medium">{label}</div>
    </div>
  );
}
