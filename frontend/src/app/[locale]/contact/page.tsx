'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Mail, MapPin, Phone, Send, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/services/apiClient';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
      };
      
      await apiClient.post('/notifications/contact', data);
      toast.success('Cảm ơn bạn! Chúng tôi đã nhận được tin nhắn và sẽ phản hồi sớm nhất.');
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="bg-slate-50 py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="text-blood font-bold tracking-wider uppercase text-sm mb-2 block">Liên hệ</span>
            <h1 className="text-4xl md:text-5xl font-bold text-navy mb-6">Bạn cần hỗ trợ?</h1>
            <p className="text-slate-600 text-lg">
              Đội ngũ BloodLink luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về quy trình hiến máu, đăng ký cơ sở hoặc phản hồi dịch vụ.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
            
            {/* Contact Info (Left) */}
            <div className="lg:col-span-2 bg-navy p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blood/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
              
              <div className="relative z-10 h-full flex flex-col">
                <h3 className="text-2xl font-bold mb-8">Thông tin liên hệ</h3>
                
                <div className="space-y-8 flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-blood-light" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Trụ sở chính</h4>
                      <p className="text-slate-300 leading-relaxed">FPT University, Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-blood-light" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Hotline (24/7)</h4>
                      <p className="text-slate-300 leading-relaxed">+84 (0) 123 456 789<br/>+84 (0) 987 654 321</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-blood-light" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Email Support</h4>
                      <p className="text-slate-300 leading-relaxed">support@bloodlink.vn<br/>partners@bloodlink.vn</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex items-center gap-4">
                  <span className="text-sm text-slate-400">Kết nối với chúng tôi qua:</span>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blood transition-colors cursor-pointer"><MessageSquare className="w-4 h-4" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form (Right) */}
            <div className="lg:col-span-3 p-10 md:p-14">
              <h3 className="text-2xl font-bold text-navy mb-8">Gửi tin nhắn cho chúng tôi</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Họ và tên</label>
                    <input name="name" required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood transition-all" placeholder="Nguyễn Văn A" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Số điện thoại</label>
                    <input name="phone" required type="tel" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood transition-all" placeholder="0987654321" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <input name="email" required type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood transition-all" placeholder="email@example.com" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Chủ đề</label>
                  <select name="subject" required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood transition-all">
                    <option value="">Chọn chủ đề bạn quan tâm</option>
                    <option value="Hỗ trợ người hiến máu">Hỗ trợ người hiến máu</option>
                    <option value="Hợp tác cơ sở y tế">Hợp tác cơ sở y tế</option>
                    <option value="Góp ý hệ thống">Góp ý hệ thống</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nội dung tin nhắn</label>
                  <textarea name="message" required rows={5} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood transition-all resize-none" placeholder="Vui lòng mô tả chi tiết vấn đề của bạn..."></textarea>
                </div>

                <button disabled={loading} type="submit" className="w-full py-4 bg-blood text-white font-bold rounded-xl hover:bg-blood-dark hover:shadow-xl hover:shadow-blood/20 transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Gửi tin nhắn <Send className="w-5 h-5" /></>
                  )}
                </button>
              </form>
            </div>
            
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
