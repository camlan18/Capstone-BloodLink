'use client';
import { useEffect, useState } from 'react';
import { donorService } from '@/lib/services/donor';
import { authService } from '@/lib/services/auth';
import { useAuthStore } from '@/lib/stores';
import { useRouter, useSearchParams } from 'next/navigation';
import { bloodRequestService } from '@/lib/services/bloodRequest';
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowRight, CheckCircle2, MapPin, Users, AlertCircle, XCircle, Info, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from '@/components/ui/BaseModal';
import { BloodRequestDetailModal } from '@/components/BloodRequestDetailModal';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { text: 'Chờ duyệt', color: 'bg-orange-100 border-orange-200 text-orange-800', icon: <Clock className="w-3.5 h-3.5" /> };
    case 'APPROVED':
      return { text: 'Đã duyệt', color: 'bg-blue-100 border-blue-300 text-blue-800', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    case 'COMPLETED':
      return { text: 'Hoàn thành', color: 'bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5 text-white" /> };
    case 'CANCELLED':
      return { text: 'Đã hủy', color: 'bg-slate-100 border-slate-300 text-slate-600', icon: <XCircle className="w-3.5 h-3.5" /> };
    case 'REJECTED':
      return { text: 'Từ chối', color: 'bg-red-100 border-red-300 text-red-800', icon: <XCircle className="w-3.5 h-3.5" /> };
    default:
      return { text: 'Đã đăng ký', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
  }
};

export default function BookDonationPage() {
  const { user, donorProfile, setUser, setDonorProfile } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request');
  const facilityIdParam = searchParams.get('facility');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [requestContext, setRequestContext] = useState<any>(null);
  
  const [mySlots, setMySlots] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableSchedulesOnDate, setAvailableSchedulesOnDate] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [expectedTime, setExpectedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [viewingTermsHtml, setViewingTermsHtml] = useState<string>('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [selectedRequestCode, setSelectedRequestCode] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
      const [slotsRes, schedRes, donorRes, authRes, historyRes, reqRes] = await Promise.all([
        donorService.getMySlots().catch(() => null),
        donorService.getSchedules().catch(() => null),
        donorService.getProfile().catch(() => null),
        authService.getProfile().catch(() => null),
        donorService.getHistory().catch(() => null),
        requestId ? bloodRequestService.getAllRequests().then((res: any) => {
           let list = [];
           if (res && Array.isArray(res.data)) list = res.data;
           else if (res && res.data && Array.isArray(res.data.data)) list = res.data.data;
           else if (Array.isArray(res)) list = res;
           return list.find((r: any) => r.request_id === Number(requestId)) || null;
        }).catch(() => null) : Promise.resolve(null)
      ]);
      
      if (slotsRes && slotsRes.data) setMySlots(slotsRes.data);
      if (schedRes && schedRes.data) setSchedules(schedRes.data);
      if (historyRes && historyRes.data) setMyHistory(historyRes.data);
      if (reqRes) setRequestContext(reqRes);
      
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
      if (requestContext && facilityIdParam) {
        // Cho phép tạo lịch ngầm định cho yêu cầu
        setAvailableSchedulesOnDate([{
          is_implicit: true,
          facility: requestContext.facility || { facility_name: requestContext.hospital_name, address: requestContext.address },
          max_donors: 999,
          current_donors: 0,
          start_time: '07:00',
          end_time: '17:00'
        }]);
        setSelectedDate(day);
        setNotes('');
        setExpectedTime('');
        setIsConsentChecked(false);
        setIsModalOpen(true);
        return;
      }
      toast.error('Hiện chưa có cơ sở nào mở lịch hiến máu vào ngày này.');
      return;
    }

    setAvailableSchedulesOnDate(openSchedules);
    setSelectedDate(day);
    setNotes('');
    setExpectedTime('');
    setIsConsentChecked(false);
    setIsModalOpen(true);
  };

  const handleSubmitBooking = async (scheduleId?: number) => {
    try {
      setIsSubmitting(scheduleId || -1);
      
      // Client-side validation if requestContext exists
      if (requestContext) {
         if (availableSchedulesOnDate.some(s => s.is_implicit) && !expectedTime) {
           toast.error('Vui lòng chọn Khung giờ dự kiến đến hiến.');
           setIsSubmitting(null);
           return;
         }
      }

      await donorService.bookSlot({
        schedule_id: scheduleId,
        request_id: requestContext ? Number(requestId) : undefined,
        facility_id: requestContext ? Number(facilityIdParam) : undefined,
        specific_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        expected_time: expectedTime,
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
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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

      {requestContext && (
        <div className="mb-6 bg-blood/10 border border-blood/20 p-4 rounded-xl flex items-start gap-4">
           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle className="w-6 h-6 text-blood" />
           </div>
           <div>
              <h3 className="font-bold text-blood text-lg">Đang đăng ký hiến máu cho Yêu cầu khẩn cấp</h3>
              <p className="text-sm text-slate-700 mt-1 font-medium">
                Bệnh nhân: <span className="font-bold">{requestContext.patient_name}</span> | 
                Cần: <span className="font-bold">{requestContext.units_needed} đơn vị {requestContext.blood_type?.abo}{requestContext.blood_type?.rh_factor}</span>
                {requestContext.required_before && (
                  <> | Cần trước: <span className="font-bold text-red-600">{format(new Date(requestContext.required_before), 'dd/MM/yyyy')}</span></>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng chọn một ngày trên lịch. Hệ thống sẽ tự động đăng ký lịch ưu tiên cho cơ sở <strong>{requestContext.facility?.facility_name || requestContext.hospital_name}</strong>.
              </p>
           </div>
        </div>
      )}

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
            
            let isAfterRequiredDate = false;
            if (requestContext?.required_before) {
               const requiredDate = startOfDay(new Date(requestContext.required_before));
               if (isBefore(requiredDate, day)) {
                  isAfterRequiredDate = true;
               }
            }
            
            const mySlot = mySlots.find(s => s.schedule && isSameDay(parseISO(s.schedule.date), day));
            const openSchedulesCount = schedules.filter(sch => isSameDay(parseISO(sch.date), day)).length;

            const isDisabled = (isPast && !mySlot) || isAfterRequiredDate;

            return (
              <div 
                key={day.toString()}
                onClick={() => !isDisabled && handleDayClick(day)}
                className={`
                  min-h-[140px] p-3 border-b border-r border-slate-100 relative group transition-colors flex flex-col items-center
                  ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white text-navy'}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-blood/5'}
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
                  (() => {
                    const statusConfig = getStatusBadge(mySlot.status);
                    return (
                      <div className={`absolute bottom-3 left-3 right-3 ${statusConfig.color} border rounded-lg p-2 animate-slide-up shadow-sm`}>
                        <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                          {statusConfig.icon} {statusConfig.text}
                        </div>
                        <div className="text-[11px] font-medium line-clamp-1 mb-0.5 opacity-90">
                          {mySlot.schedule.facility?.facility_name}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] opacity-80">
                          <Clock className="w-3 h-3" />
                          {mySlot.schedule.start_time?.includes('T') ? mySlot.schedule.start_time.substring(11, 16) : mySlot.schedule.start_time} - {mySlot.schedule.end_time?.includes('T') ? mySlot.schedule.end_time.substring(11, 16) : mySlot.schedule.end_time}
                        </div>
                      </div>
                    );
                  })()
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
              <div key={sch.schedule_id} className="transition-all bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Cơ sở y tế / Bệnh viện</label>
                    <h4 className="font-bold text-navy text-lg leading-tight mb-2">{sch.facility?.facility_name}</h4>
                    <div className="flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                      <span className="line-clamp-2 leading-relaxed">{sch.facility?.address}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-sm text-xs font-bold whitespace-nowrap border ${sch.is_implicit ? 'bg-amber-50 text-amber-700 border-amber-200' : isFull ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {sch.is_implicit ? 'Lịch khẩn cấp' : isFull ? 'Đã kín chỗ' : `Còn ${sch.max_donors - sch.current_donors} chỗ`}
                  </span>
                </div>
                
                {!sch.is_implicit && (
                  <div className="flex flex-wrap items-center gap-3 text-sm font-medium mb-5">
                    <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-sm border border-slate-100">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {sch.start_time?.includes('T') ? sch.start_time.substring(11, 16) : sch.start_time} - {sch.end_time?.includes('T') ? sch.end_time.substring(11, 16) : sch.end_time}
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-sm border border-slate-100">
                      <Users className="w-4 h-4 text-slate-400" />
                      {sch.current_donors}/{sch.max_donors} người
                    </div>
                  </div>
                )}

                {!isFull && (
                  <div className="flex flex-col gap-5">
                    
                    {sch.is_implicit && (
                      <div className="relative border-t border-slate-100 pt-4 mt-1">
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Khung giờ dự kiến đến hiến <span className="text-red-500">*</span></label>
                        <select 
                           value={expectedTime} 
                           onChange={e => setExpectedTime(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm font-medium text-navy focus:outline-none focus:ring-1 focus:ring-blood focus:border-blood transition-colors cursor-pointer"
                        >
                           <option value="" disabled>-- Chọn khung giờ --</option>
                           {[
                             { value: '07:00', label: '07:00 Sáng' },
                             { value: '08:00', label: '08:00 Sáng' },
                             { value: '09:00', label: '09:00 Sáng' },
                             { value: '10:00', label: '10:00 Sáng' },
                             { value: '11:00', label: '11:00 Sáng' },
                             { value: '13:30', label: '13:30 Chiều' },
                             { value: '14:30', label: '14:30 Chiều' },
                             { value: '15:30', label: '15:30 Chiều' },
                             { value: '16:30', label: '16:30 Chiều' }
                           ].map(opt => {
                             let disabled = false;
                             if (selectedDate && isToday(selectedDate)) {
                               const [h, m] = opt.value.split(':').map(Number);
                               const now = new Date();
                               if (h < now.getHours() || (h === now.getHours() && m < now.getMinutes())) {
                                 disabled = true;
                               }
                             }
                             return (
                               <option key={opt.value} value={opt.value} disabled={disabled} className={disabled ? 'text-slate-300' : 'text-slate-700'}>
                                 {opt.label} {disabled ? '(Đã qua)' : ''}
                               </option>
                             );
                           })}
                        </select>
                      </div>
                    )}

                    {/* Ghi chú & Xác nhận */}
                    <div className="relative border-t border-slate-100 pt-4 mt-1">
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Ghi chú cho cơ sở y tế (Tùy chọn)</label>
                      <input 
                        type="text" 
                        placeholder="Nhập ghi chú..." 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 placeholder:text-slate-400 transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-blue-50/50 p-3 rounded-sm border border-blue-100/50">
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
                      disabled={isSubmitting !== null || !isConsentChecked || (sch.is_implicit && !expectedTime)}
                      className="w-full py-3.5 bg-blood text-white font-bold rounded-sm hover:bg-blood-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {isSubmitting === (sch.schedule_id || -1) ? (
                        <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang xử lý</>
                      ) : (
                        sch.is_implicit ? 'Xác nhận hiến máu khẩn cấp' : 'Xác nhận đăng ký'
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
          <div className="flex flex-col gap-4">
            <div className="bg-white">
              <div className="flex justify-between items-start gap-4 mb-2">
                <h4 className="font-bold text-navy text-lg">{selectedMySlot.schedule.facility?.facility_name}</h4>
                {(() => {
                  const statusConfig = getStatusBadge(selectedMySlot.status);
                  return (
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-bold ${statusConfig.color} border shrink-0 whitespace-nowrap`}>
                      {statusConfig.icon} {statusConfig.text}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-500 mb-4">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                <span className="leading-relaxed">{selectedMySlot.schedule.facility?.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-sm border border-slate-100 w-fit">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{selectedMySlot.schedule.start_time?.includes('T') ? selectedMySlot.schedule.start_time.substring(11, 16) : selectedMySlot.schedule.start_time} - {selectedMySlot.schedule.end_time?.includes('T') ? selectedMySlot.schedule.end_time.substring(11, 16) : selectedMySlot.schedule.end_time}</span>
              </div>
            </div>

            {(() => {
              if (selectedMySlot.status === 'COMPLETED') {
                const historyItem = myHistory.find(h => 
                  h.facility_id === selectedMySlot.schedule?.facility_id && 
                  h.donation_date && selectedMySlot.schedule?.date &&
                  h.donation_date.substring(0, 10) === selectedMySlot.schedule.date.substring(0, 10)
                );
                
                return (
                  <div className="pt-4 border-t border-slate-200 mt-4">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <h5 className="font-bold text-emerald-800 mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5"/> Lịch đã hoàn thành</h5>
                      <div className="space-y-3 text-sm">
                        {historyItem?.volume_ml ? (
                          <div className="flex justify-between items-center bg-white p-2.5 rounded-lg shadow-sm">
                            <span className="text-slate-600 font-medium">Lượng máu đã hiến:</span>
                            <span className="font-bold text-emerald-700 text-base">{historyItem.volume_ml} ml</span>
                          </div>
                        ) : null}
                        {historyItem?.notes && (
                          <div className="flex flex-col gap-1 bg-white p-2.5 rounded-lg shadow-sm">
                            <span className="text-slate-500 font-medium text-xs">Ghi chú của bác sĩ:</span>
                            <span className="font-semibold text-slate-800">{historyItem.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (selectedMySlot.status === 'CANCELLED' || selectedMySlot.status === 'REJECTED') {
                 return null;
              }

              const daysLeft = differenceInDays(parseISO(selectedMySlot.schedule.date), startOfDay(new Date()));
              const canCancel = daysLeft > 2;
              
              const matchRQ = selectedMySlot.notes?.match(/Mã:\s*(R[EQ]+-[A-Za-z0-9\-]+)/i);
              const extractedCode = matchRQ ? matchRQ[1] : null;

              return (
                <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                  {extractedCode && (
                    <div className="bg-blue-50 border border-blue-100 rounded-sm p-4 text-center">
                      <p className="text-sm text-blue-800 mb-3 font-medium">Lượt đăng ký này dành cho một Yêu cầu máu khẩn cấp.</p>
                      <button
                        onClick={() => {
                          setSelectedRequestCode(extractedCode);
                          setIsDetailModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 font-bold rounded-sm shadow-sm hover:bg-blue-50 transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" /> Xem chi tiết yêu cầu
                      </button>
                    </div>
                  )}

                  {!canCancel ? (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-sm border border-orange-200 text-center font-medium">
                      Bạn không thể hủy lịch này do đã quá sát ngày hiến máu (Ít hơn 2 ngày).
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCancelBooking(selectedMySlot.slot_id)}
                      disabled={isCanceling}
                      className="w-full py-3 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                      {isCanceling ? (
                        <><span className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></span> Đang xử lý</>
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
      <BloodRequestDetailModal 
        requestCode={selectedRequestCode}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}
