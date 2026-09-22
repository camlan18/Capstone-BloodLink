'use client';
import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/services/apiClient';
import { MainLayout } from '@/components/layout/MainLayout';

export default function PublicSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any, any>('/donor/schedules');
      if (res && res.data) {
        // Filter out schedules with 0 slots
        const validSchedules = res.data.filter((s: any) => (s.max_donors - s.current_donors) > 0);
        setSchedules(validSchedules);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Lịch Hiến Máu Sắp Tới</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Hàng ngàn bệnh nhân đang chờ đợi sự giúp đỡ của bạn. Hãy chọn một lịch hiến máu phù hợp và đăng ký ngay hôm nay.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blood"></div>
            </div>
          ) : schedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schedules.map((schedule) => (
                <div key={schedule.schedule_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="h-2 bg-blood w-full"></div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-red-50 text-blood px-3 py-1 rounded-full text-xs font-semibold">
                        Còn {Math.max(0, schedule.max_donors - schedule.current_donors)} chỗ
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-navy mb-2 line-clamp-1" title={schedule.facility?.facility_name}>
                      {schedule.facility?.facility_name}
                    </h3>
                    
                    <div className="space-y-3 mt-4 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{new Date(schedule.date).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {schedule.start_time?.includes('T') ? schedule.start_time.substring(11, 16) : schedule.start_time} - {schedule.end_time?.includes('T') ? schedule.end_time.substring(11, 16) : schedule.end_time}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{schedule.facility?.address}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>Đã đăng ký: {schedule.current_donors}/{schedule.max_donors}</span>
                      </div>
                      <Link 
                        href="/donor/book" 
                        className="text-blood font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all group-hover:text-red-700"
                      >
                        Đăng ký ngay <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy">Chưa có lịch hiến máu nào</h3>
              <p className="text-slate-500 mt-2">Hiện tại không có lịch hiến máu nào sắp tới hoặc đã kín chỗ. Vui lòng quay lại sau.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
