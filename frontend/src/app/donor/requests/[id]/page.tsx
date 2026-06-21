'use client';

import { useState, useEffect, use } from 'react';
import { bloodRequestService } from '@/lib/services/bloodRequest';
import { 
  ClipboardList, ArrowLeft, Activity, MapPin, Droplet, Clock, 
  User as UserIcon, Phone, FileText, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await bloodRequestService.getMyRequestDetails(Number(id));
        if (res && res.data) {
          setRequest(res.data);
        } else {
          setRequest(res);
        }
      } catch (error) {
        console.error('Failed to fetch details:', error);
        toast.error('Không thể tải chi tiết yêu cầu');
        router.push('/donor/requests');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchDetails();
    }
  }, [id, router]);

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-slate-100 text-slate-700';
    const s = status.toLowerCase();
    if (s.includes('pending')) return 'bg-yellow-100 text-yellow-700';
    if (s.includes('approved')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('completed')) return 'bg-blue-100 text-blue-700';
    if (s.includes('reject') || s.includes('cancel')) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getUrgencyColor = (urgency: string) => {
    if (!urgency) return 'text-slate-500';
    const u = urgency.toLowerCase();
    if (u.includes('urgent') || u.includes('emergency')) return 'text-red-600 bg-red-50 border-red-100';
    if (u.includes('high')) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Activity className="w-8 h-8 animate-spin text-blood" />
          <p className="font-medium">Đang tải chi tiết...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center min-h-[60vh] flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-navy mb-2">Không tìm thấy yêu cầu</h2>
        <p className="text-slate-500 mb-6">Yêu cầu này không tồn tại hoặc bạn không có quyền xem.</p>
        <Link href="/donor/requests" className="px-6 py-2 bg-blood text-white rounded-lg font-medium">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/donor/requests" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blood transition-colors font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
              Mã Yêu Cầu: <span className="text-blood">{request.request_code}</span>
            </h1>
            <p className="text-slate-500 mt-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tạo lúc {new Date(request.created_at).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold border ${getStatusColor(request.status?.status_code)}`}>
            {request.status?.status_name}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('details')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Thông tin chi tiết
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Lịch sử xử lý
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{request.status_history?.length || 0}</span>
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Medical Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Droplet className="w-32 h-32 text-blood" />
              </div>
              <h2 className="text-xl font-bold text-navy flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-blood" />
                Thông tin y tế
              </h2>
              
              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Nhóm máu cần</label>
                  <div className="flex items-center gap-2 text-lg font-bold text-blood">
                    <span className="bg-red-50 px-3 py-1 rounded-lg border border-red-100 flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 fill-blood/20" />
                      {request.blood_type?.abo}{request.blood_type?.rh_factor}
                    </span>
                  </div>
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Chế phẩm máu</label>
                  <p className="font-semibold text-slate-800">{request.component?.component_name}</p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Số lượng cần</label>
                  <p className="font-semibold text-slate-800 text-lg">
                    {request.units_needed} <span className="text-sm font-medium text-slate-500">đơn vị</span>
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Mức độ khẩn cấp</label>
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold border ${getUrgencyColor(request.urgency?.urgency_code)}`}>
                    {request.urgency?.urgency_name}
                  </span>
                </div>
                
                {request.required_before && (
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Cần trước ngày</label>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {new Date(request.required_before).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Patient & Contact Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2 mb-6">
                <UserIcon className="w-5 h-5 text-blood" />
                Bệnh nhân & Liên hệ
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Họ và tên bệnh nhân</label>
                  <p className="font-semibold text-slate-800">{request.patient_name}</p>
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Số điện thoại liên hệ</label>
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {request.patient_phone || 'Không cung cấp'}
                  </p>
                </div>

                {request.clinical_notes && (
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Chẩn đoán / Ghi chú lâm sàng</label>
                    <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-slate-100">
                      {request.clinical_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Facility Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-navy flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
                <MapPin className="w-5 h-5 text-blood" />
                Nơi tiếp nhận
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Cơ sở / Bệnh viện</label>
                  <p className="font-semibold text-slate-800 leading-snug">
                    {request.facility?.name || request.hospital_name}
                  </p>
                </div>
                
                {request.ward_room && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Phòng / Khoa</label>
                    <p className="font-medium text-slate-700">{request.ward_room}</p>
                  </div>
                )}
                
                {(request.address || request.facility?.address) && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Địa chỉ</label>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {request.facility?.address || request.address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Timeline / History Tab */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-navy flex items-center gap-2 mb-8 border-b border-slate-100 pb-4">
            <FileText className="w-6 h-6 text-blood" />
            Lịch sử xử lý yêu cầu
          </h2>
          
          {request.status_history && request.status_history.length > 0 ? (
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
              {request.status_history.map((hist: any, index: number) => (
                <div key={hist.history_id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 border-white ${index === 0 ? 'bg-blood shadow-[0_0_0_2px_rgba(225,29,72,0.2)]' : 'bg-slate-300'}`}></div>
                  
                  {/* Content box */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group">
                    {/* Decorative pointer */}
                    <div className="absolute top-3 -left-2 w-4 h-4 bg-white border-l border-b border-slate-100 rotate-45 group-hover:border-slate-200 transition-colors"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <p className="text-base font-bold text-slate-800">
                        Chuyển sang <span className="text-blood">{hist.to_status?.status_name}</span>
                      </p>
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(hist.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    
                    {hist.change_reason ? (
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-700 mr-1">Ghi chú:</span> 
                        {hist.change_reason}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Không có ghi chú</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="font-medium">Chưa có lịch sử xử lý nào cho yêu cầu này.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
