import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Droplet, MapPin, Phone, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { bloodRequestService } from '@/lib/services/bloodRequest';

interface BloodRequestDetailContentProps {
  requestCode: string | null;
}

export const BloodRequestDetailContent: React.FC<BloodRequestDetailContentProps> = ({
  requestCode
}) => {
  const [requestDetail, setRequestDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (requestCode) {
      const fetchRequestDetails = async () => {
        try {
          setLoading(true);
          const response = await bloodRequestService.getRequestByCode(requestCode);
          if (response && response.data) {
             setRequestDetail(response.data);
          } else {
             setRequestDetail(response); // Fallback in case the interceptor returns data directly
          }
        } catch (error: any) {
          toast.error(error?.response?.data?.message || error.message || 'Có lỗi xảy ra.');
        } finally {
          setLoading(false);
        }
      };
      fetchRequestDetails();
    } else {
      setRequestDetail(null);
    }
  }, [requestCode]);

  if (!requestCode) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-8 h-8 border-4 border-blood border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!requestDetail) {
    return (
      <div className="text-center py-10 text-slate-500">
        Không tìm thấy dữ liệu.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Thông tin bệnh nhân */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h3 className="font-bold text-navy text-sm uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4" /> THÔNG TIN BỆNH NHÂN
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Họ và tên</label>
            <div className="font-bold text-slate-800 text-lg">{requestDetail.patient_name}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Số điện thoại LH</label>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" /> {requestDetail.patient_phone || 'Không có'}
            </div>
          </div>
        </div>
      </div>

      {/* Yêu cầu máu */}
      <div className="bg-white rounded-md border border-red-200 overflow-hidden">
        <div className="bg-red-50/50 px-4 py-3 border-b border-red-100">
          <h3 className="font-bold text-red-700 text-sm uppercase tracking-wide flex items-center gap-2">
            <Droplet className="w-4 h-4" /> THÔNG TIN NHẬN MÁU
          </h3>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm text-center">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nhóm máu</label>
            <div className="font-black text-blood text-xl">{requestDetail.blood_type?.blood_type_code || 'Khác'}</div>
          </div>
          <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm text-center">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cần (Đơn vị)</label>
            <div className="font-black text-slate-800 text-xl">{requestDetail.units_needed}</div>
          </div>
          <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm text-center col-span-2 sm:col-span-2 flex flex-col justify-center">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chế phẩm máu</label>
            <div className="font-bold text-slate-700 leading-tight truncate">{requestDetail.component?.component_name || 'Máu toàn phần'}</div>
          </div>
        </div>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Độ khẩn</label>
              <div className="font-bold text-orange-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {requestDetail.urgency?.urgency_name || 'Bình thường'}</div>
           </div>
           {requestDetail.required_before && (
             <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cần máu trước ngày</label>
                <div className="font-bold text-slate-700 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {format(new Date(requestDetail.required_before), 'dd/MM/yyyy')}</div>
             </div>
           )}
        </div>
      </div>

      {/* Cơ sở điều trị */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h3 className="font-bold text-navy text-sm uppercase tracking-wide flex items-center gap-2">
            <MapPin className="w-4 h-4" /> CƠ SỞ ĐIỀU TRỊ
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bệnh viện / Cơ sở y tế</label>
            <div className="font-bold text-slate-800 text-base">{requestDetail.facility?.facility_name || requestDetail.hospital_name}</div>
            <div className="text-sm text-slate-500 mt-1">{requestDetail.facility?.address || requestDetail.address}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
             <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Khoa / Phòng điều trị</label>
                <div className="font-semibold text-slate-700">{requestDetail.ward_room || 'Không có'}</div>
             </div>
          </div>
        </div>
      </div>

      {/* Ghi chú */}
      {requestDetail.clinical_notes && (
        <div className="bg-amber-50 rounded-md border border-amber-200 p-4">
          <label className="block text-xs font-bold text-amber-800 uppercase mb-2">GHI CHÚ LÂM SÀNG</label>
          <p className="text-sm text-amber-900 leading-relaxed">{requestDetail.clinical_notes}</p>
        </div>
      )}
    </div>
  );
};
