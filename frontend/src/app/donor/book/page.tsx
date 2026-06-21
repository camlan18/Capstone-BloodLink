'use client';
import { useEffect, useState } from 'react';
import { donorService } from '@/lib/services/donor';
import { authService } from '@/lib/services/auth';
import { useAuthStore } from '@/lib/stores';
import { useRouter } from 'next/navigation';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  parseISO,
  differenceInDays
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowRight, CheckCircle2, MapPin, Users, AlertCircle, XCircle, Info, User } from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from '@/components/ui/BaseModal';

export default function BookDonationPage() {
  const { user, donorProfile, setUser, setDonorProfile } = useAuthStore();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [mySlots, setMySlots] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableSchedulesOnDate, setAvailableSchedulesOnDate] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [viewingTermsHtml, setViewingTermsHtml] = useState<string>('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Xem chi tiết lịch đã đặt
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMySlot, setSelectedMySlot] = useState<any | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [slotsRes, schedRes, donorRes, authRes] = await Promise.all([
        donorService.getMySlots().catch(() => null),
        donorService.getSchedules().catch(() => null),
        donorService.getProfile().catch(() => null),
        authService.getProfile().catch(() => null)
      ]);
      
      if (slotsRes && slotsRes.data) setMySlots(slotsRes.data);
      if (schedRes && schedRes.data) setSchedules(schedRes.data);
      
      if (donorRes && donorRes.data) {
        setDonorProfile(donorRes.data);
      }
      if (authRes && authRes.data) {
        setUser(authRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (day: Date) => {
    if (isBefore(day, startOfDay(new Date()))) return;
    
    const hasSlot = mySlots.find(s => s.schedule && isSameDay(parseISO(s.schedule.date), day));
    if (hasSlot) {
      setSelectedMySlot(hasSlot);
      setIsViewModalOpen(true);
      return;
    }

    const openSchedules = schedules.filter(sch => isSameDay(parseISO(sch.date), day));
    if (openSchedules.length === 0) {
      toast.error('Hiện chưa có cơ sở nào mở lịch hiến máu vào ngày này.');
      return;
    }

    setAvailableSchedulesOnDate(openSchedules);
    setSelectedDate(day);
    setNotes('');
    setIsConsentChecked(false);
    setIsModalOpen(true);
  };

  const handleSubmitBooking = async (scheduleId: number) => {
    try {
      setIsSubmitting(scheduleId);
      await donorService.bookSlot({
        schedule_id: scheduleId,
        notes
      });
      
      toast.success('Đăng ký lịch hiến máu thành công!');
      setIsModalOpen(false);
      fetchData(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại.');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleCancelBooking = async (slotId: number) => {
    try {
      setIsCanceling(true);
      await donorService.cancelSlot(slotId);
      toast.success('Đã hủy lịch thành công!');
      setIsViewModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Hủy thất bại.');
    } finally {
      setIsCanceling(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const isProfileComplete = 
    user?.full_name && 
    (user as any)?.identity_card && 
    user?.phone && 
    user?.date_of_birth && 
    donorProfile?.blood_type_id && 
    donorProfile?.weight_kg;

  if (!loading && !isProfileComplete) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <AlertCircle className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-navy mb-4">Cập nhật Hồ sơ bắt buộc</h2>
        <p className="text-slate-600 max-w-lg mx-auto mb-8 leading-relaxed">
          Để đảm bảo an toàn hiến máu, bạn cần cập nhật đầy đủ thông tin cá nhân và các chỉ số sức khỏe cơ bản (CCCD, SĐT, Nhóm máu, Cân nặng...) trước khi có thể đăng ký lịch hiến.
        </p>
        <button 
          onClick={() => router.push('/donor/profile')}
          className="px-6 py-3 bg-blood text-white font-bold rounded-lg hover:bg-blood-dark transition-colors inline-flex items-center gap-2 shadow-sm"
        >
          <User className="w-5 h-5" /> Cập nhật Hồ sơ ngay
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Lịch Hiến Máu</h1>
          <p className="text-slate-500 text-sm mt-1">Chọn ngày có sẵn trên lịch để xem các cơ sở đang tiếp nhận</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-bold text-navy min-w-[140px] text-center capitalize">
            {format(currentMonth, 'MMMM, yyyy', { locale: vi })}
          </span>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekDays.map(day => (
            <div key={day} className="py-4 text-center text-sm font-bold text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="w-10 h-10 border-4 border-blood border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isPast = isBefore(day, startOfDay(new Date()));
            
            const mySlot = mySlots.find(s => s.schedule && isSameDay(parseISO(s.schedule.date), day));
            const openSchedulesCount = schedules.filter(sch => isSameDay(parseISO(sch.date), day)).length;

            return (
              <div 
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[140px] p-3 border-b border-r border-slate-100 relative group transition-colors flex flex-col items-center
                  ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white text-navy'}
                  ${isPast && !mySlot ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-blood/5'}
                  ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                `}
              >
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mb-2
                  ${isToday(day) ? 'bg-blood text-white shadow-md shadow-blood/20' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {mySlot && mySlot.schedule && (
                  <div className="absolute bottom-3 left-3 right-3 bg-emerald-50 border border-emerald-200 rounded-lg p-2 animate-slide-up shadow-sm">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã đăng ký
                    </div>
                    <div className="text-[11px] font-medium text-emerald-600 line-clamp-1 mb-0.5">
                      {mySlot.schedule.facility?.facility_name}
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px]">
                      <Clock className="w-3 h-3" />
                      {mySlot.schedule.start_time?.slice(11, 16)} - {mySlot.schedule.end_time?.slice(11, 16)}
                    </div>
                  </div>
                )}
                
                {!isPast && !mySlot && isCurrentMonth && openSchedulesCount > 0 && (
                  <div className="absolute bottom-3 left-0 right-0 px-2 flex justify-center">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5 text-center shadow-sm">
                      <span className="text-blue-700 font-semibold text-[11px] whitespace-nowrap">{openSchedulesCount} Cơ sở mở lịch</span>
                    </div>
                  </div>
                )}

                {!isPast && !mySlot && isCurrentMonth && openSchedulesCount > 0 && (
                  <div className="absolute inset-0 bg-blood/10 border-2 border-blood rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center m-1.5 z-10 backdrop-blur-[1px]">
                    <span className="text-blood font-bold text-sm bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                      Xem lịch <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Modal */}
      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Chọn cơ sở hiến máu"
        subtitle={selectedDate && `Các lịch còn trống trong ngày ${format(selectedDate, 'dd/MM/yyyy')}`}
        size="3xl"
        hideFooter
      >
        <div className="space-y-5">
          {availableSchedulesOnDate.map(sch => {
            const isFull = sch.current_donors >= sch.max_donors;
            
            return (
              <div key={sch.schedule_id} className={`p-3 transition-all rounded-xl `}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-lg leading-tight mb-2">{sch.facility?.facility_name}</h4>
                    <div className="flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                      <span className="line-clamp-2 leading-relaxed">{sch.facility?.address}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap ${isFull ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                    {isFull ? 'Đã kín chỗ' : `Còn ${sch.max_donors - sch.current_donors} chỗ`}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium mb-6">
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {sch.start_time?.slice(11, 16)} - {sch.end_time?.slice(11, 16)}
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <Users className="w-4 h-4 text-slate-400" />
                    {sch.current_donors}/{sch.max_donors} người
                  </div>
                </div>

                {!isFull && (
                  <div className="space-y-5">
                    
                    {/* Ghi chú & Xác nhận */}
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Ghi chú cho cơ sở y tế (Tùy chọn)" 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 placeholder:text-slate-400 transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm text-slate-600">
                        Vui lòng đọc kỹ <button 
                          onClick={() => {
                            setViewingTermsHtml(sch.terms_html || '<p>Không có lưu ý đặc biệt từ cơ sở này.</p>');
                            setIsTermsModalOpen(true);
                          }} 
                          className="text-blue-600 font-semibold hover:underline decoration-blue-600/30 underline-offset-2"
                        >
                          Lưu ý và Điều khoản hiến máu
                        </button> trước khi đăng ký.
                      </span>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group pt-1">
                      <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                        <input 
                          type="checkbox" 
                          checked={isConsentChecked}
                          onChange={(e) => setIsConsentChecked(e.target.checked)}
                          className="peer w-5 h-5 appearance-none border border-slate-300 rounded bg-white checked:bg-blood checked:border-blood transition-all cursor-pointer"
                        />
                        <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-sm text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors select-none">
                        Tôi đã đọc kỹ và xác nhận bản thân đáp ứng đủ các tiêu chuẩn hiến máu ở trên.
                      </span>
                    </label>

                    <button
                      onClick={() => handleSubmitBooking(sch.schedule_id)}
                      disabled={isSubmitting !== null || !isConsentChecked}
                      className="w-full py-3.5 bg-blood text-white font-bold rounded-lg hover:bg-blood-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {isSubmitting === sch.schedule_id ? (
                        <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang xử lý</>
                      ) : (
                        'Xác nhận đăng ký'
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </BaseModal>

      {/* View/Cancel Modal */}
      <BaseModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        title="Lịch đã đăng ký"
        subtitle={selectedMySlot?.schedule?.date && `Ngày hiến: ${format(parseISO(selectedMySlot.schedule.date), 'dd/MM/yyyy')}`}
        size="md"
        hideFooter
      >
        {selectedMySlot && selectedMySlot.schedule && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl">
              <h4 className="font-bold text-navy mb-2">{selectedMySlot.schedule.facility?.facility_name}</h4>
              <div className="flex items-start gap-2 text-sm text-slate-500 mb-3">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span>{selectedMySlot.schedule.facility?.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg inline-flex">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">{selectedMySlot.schedule.start_time?.slice(11, 16)} - {selectedMySlot.schedule.end_time?.slice(11, 16)}</span>
              </div>
            </div>

            {(() => {
              const daysLeft = differenceInDays(parseISO(selectedMySlot.schedule.date), startOfDay(new Date()));
              const canCancel = daysLeft > 2;
              
              return (
                <div className="pt-4 border-t border-slate-200">
                  {!canCancel ? (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200 text-center">
                      Bạn không thể hủy lịch này do đã quá sát ngày hiến máu (Ít hơn 2 ngày).
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCancelBooking(selectedMySlot.slot_id)}
                      disabled={isCanceling}
                      className="w-full py-3 border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCanceling ? (
                        <><span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></span> Đang hủy</>
                      ) : (
                        <><XCircle className="w-5 h-5" /> Hủy lịch này</>
                      )}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </BaseModal>
      {/* Terms Modal */}
      <BaseModal
        open={isTermsModalOpen}
        onOpenChange={setIsTermsModalOpen}
        title="Lưu ý và Điều khoản hiến máu"
        size="2xl"
        hideFooter
        zIndexClass="z-[60]"
      >
        <div 
          className="prose prose-slate max-w-none text-sm bg-slate-50 p-6 rounded-xl border border-slate-100"
          dangerouslySetInnerHTML={{ __html: viewingTermsHtml }}
        />

        <div className="mt-6 flex justify-end">
          <button 
            onClick={() => setIsTermsModalOpen(false)}
            className="px-6 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors"
          >
            Tôi đã hiểu
          </button>
        </div>
      </BaseModal>
    </div>
  );
}
