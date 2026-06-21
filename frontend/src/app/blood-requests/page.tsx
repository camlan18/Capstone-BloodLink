'use client';
import { useEffect, useState } from 'react';
import { bloodRequestService } from '@/lib/services/bloodRequest';
import { BloodRequest } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { BaseModal } from '@/components/ui/BaseModal';
import { MapPin, Clock, Heart, Filter, ArrowRight, Activity, Calendar, Droplet, UserPlus, User } from 'lucide-react';
import Link from 'next/link';

export default function BloodRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedUrgencies, setSelectedUrgencies] = useState<string[]>([]);
  const [selectedBloodTypes, setSelectedBloodTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('urgentFirst');

  // Detail Modal States
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res: any = await bloodRequestService.getAllRequests();
      let fetchedRequests = [];
      if (res && Array.isArray(res.data)) fetchedRequests = res.data;
      else if (res && res.data && Array.isArray(res.data.data)) fetchedRequests = res.data.data;
      else if (Array.isArray(res)) fetchedRequests = res;
      
      // Fix urgency mapping directly if needed
      setRequests(fetchedRequests);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-blood text-white border-blood';
      case 'URGENT': return 'bg-orange-500 text-white border-orange-500';
      default: return 'bg-blue-500 text-white border-blue-500';
    }
  };

  const getUrgencyLabel = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'Nguy Kịch';
      case 'URGENT': return 'Khẩn Cấp';
      default: return 'Bình Thường';
    }
  };

  const toggleUrgency = (level: string) => {
    setSelectedUrgencies(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleBloodType = (bt: string) => {
    setSelectedBloodTypes(prev => 
      prev.includes(bt) ? prev.filter(b => b !== bt) : [...prev, bt]
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Chưa xác nhận';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Chưa xác nhận';
    return d.toLocaleDateString('vi-VN');
  };

  const bloodTypesList = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  const filteredRequests = requests.filter(req => {
    const matchUrgency = selectedUrgencies.length === 0 || selectedUrgencies.includes(req.urgency?.urgency_code);
    const btStr = req.blood_type ? `${req.blood_type.abo}${req.blood_type.rh_factor}`.replace(/\s+/g, '') : '';
    const matchBloodType = selectedBloodTypes.length === 0 || selectedBloodTypes.includes(btStr);
    return matchUrgency && matchBloodType;
  }).sort((a, b) => {
    if (sortBy === 'urgentFirst') {
      const uMap: any = { 'CRITICAL': 3, 'URGENT': 2, 'NORMAL': 1 };
      return (uMap[b.urgency?.urgency_code] || 0) - (uMap[a.urgency?.urgency_code] || 0);
    } else {
      const timeA = a.required_before ? new Date(a.required_before).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.required_before ? new Date(b.required_before).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    }
  });

  return (
    <MainLayout>
      <div className="bg-slate-50 min-h-screen pb-12">
        {/* Simple Header */}
        <div className="bg-white border-b border-slate-200 py-6 mb-8">
          <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-navy flex items-center gap-3">
                <Activity className="h-7 w-7 text-blood" />
                Danh sách Yêu cầu máu khẩn cấp
              </h1>
              <p className="text-slate-500 mt-1">Hàng ngàn bệnh nhân đang chờ giọt máu quý giá từ bạn.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/blood-requests/create"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-blood border border-blood font-semibold rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm"
              >
                <Activity className="h-4 w-4" />
                Tạo Yêu Cầu Khẩn Cấp
              </Link>
              <Link
                href="/donor/book"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blood text-white font-semibold rounded-lg hover:bg-blood-dark transition-colors shadow-sm text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Đăng Ký Lịch Hiến Máu
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Main Content (Left, 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sort Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="text-sm text-slate-600">
                  Tìm thấy <span className="font-bold text-navy">{filteredRequests.length}</span> yêu cầu phù hợp
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <span className="text-slate-500 font-medium">Sắp xếp theo:</span>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="sort" 
                      checked={sortBy === 'urgentFirst'} 
                      onChange={() => setSortBy('urgentFirst')} 
                      className="w-4 h-4 text-blood border-slate-300 focus:ring-blood" 
                    />
                    <span className="group-hover:text-slate-900 transition-colors">Khẩn cấp nhất</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="sort" 
                      checked={sortBy === 'nearest'} 
                      onChange={() => setSortBy('nearest')} 
                      className="w-4 h-4 text-blood border-slate-300 focus:ring-blood" 
                    />
                    <span className="group-hover:text-slate-900 transition-colors">Hạn cần máu gần nhất</span>
                  </label>
                </div>
              </div>

              {/* List View */}
              <div className="space-y-4">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white p-6 rounded-xl border border-slate-200 h-32"></div>
                  ))
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map(req => (
                    <div key={req.request_id} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blood/30 hover:shadow-md transition-all group relative overflow-hidden flex flex-col md:flex-row gap-4 md:items-center">
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.urgency?.urgency_code === 'CRITICAL' ? 'bg-blood' : req.urgency?.urgency_code === 'URGENT' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                      
                      {/* Left: Facility Logo / Icon Placeholder */}
                      <div className="hidden md:flex shrink-0 w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg items-center justify-center text-slate-300 ml-2">
                         <Droplet className="w-8 h-8" />
                      </div>

                      {/* Middle: Info */}
                      <div className="flex-1 md:pl-2">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded border ${getUrgencyColor(req.urgency?.urgency_code)}`}>
                            {req.urgency?.urgency_name || getUrgencyLabel(req.urgency?.urgency_code)}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> Cần trước: {req.required_before ? formatDate(req.required_before) : 'Chưa xác định'}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-navy mb-1.5 group-hover:text-blood transition-colors pr-4">
                          Cần {req.units_needed} đơn vị máu {req.blood_type ? (req.blood_type.abo + req.blood_type.rh_factor).replace(/\s+/g, '') : ''}
                        </h3>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-slate-600 mb-2">
                          <div className="flex items-start gap-1.5">
                            <User className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-1 font-medium">{req.patient_name}</span>
                          </div>
                          {req.component && (
                            <div className="flex items-start gap-1.5">
                              <Activity className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                              <span className="line-clamp-1">Chế phẩm: {req.component.component_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-slate-600">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-1 font-medium">{req.facility?.facility_name || req.hospital_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action */}
                      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2.5 md:w-44 shrink-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                        {req.blood_type && (
                          <div className="hidden md:flex items-center gap-2 bg-red-50 text-blood px-3 py-1.5 rounded-lg border border-red-100 font-bold mb-1">
                            <Heart className="w-4 h-4 fill-current opacity-70" /> {(req.blood_type.abo + req.blood_type.rh_factor).replace(/\s+/g, '')}
                          </div>
                        )}
                        <button 
                            onClick={() => { setSelectedRequest(req); setIsDetailOpen(true); }}
                            className="w-full text-center px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 font-semibold rounded-lg transition-colors text-sm"
                        >
                            Xem chi tiết
                        </button>
                        <Link
                          href={`/donor/book?facility=${req.facility_id}`}
                          className="w-full text-center px-4 py-2 bg-blood text-white hover:bg-blood-dark font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5"
                        >
                          Hiến ngay <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                    <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-navy mb-1">Không tìm thấy yêu cầu máu phù hợp</h3>
                    <p className="text-slate-500">Thử thay đổi hoặc xóa các bộ lọc để xem thêm.</p>
                    <button 
                      onClick={() => { setSelectedUrgencies([]); setSelectedBloodTypes([]); }}
                      className="mt-4 px-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar (Right, 1 col) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-navy flex items-center gap-2 uppercase text-sm tracking-wide">
                    <Filter className="w-4 h-4 text-slate-400" /> BỘ LỌC NÂNG CAO
                  </h3>
                  {(selectedUrgencies.length > 0 || selectedBloodTypes.length > 0) && (
                    <button 
                      onClick={() => { setSelectedUrgencies([]); setSelectedBloodTypes([]); }}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>

                {/* Urgency Filter */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3 cursor-pointer group">
                    <h4 className="font-bold text-slate-800 text-sm uppercase">MỨC ĐỘ KHẨN CẤP</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { id: 'CRITICAL', label: 'Nguy Kịch', count: requests.filter(r => r.urgency_level === 'CRITICAL').length },
                      { id: 'URGENT', label: 'Khẩn Cấp', count: requests.filter(r => r.urgency_level === 'URGENT').length },
                      { id: 'NORMAL', label: 'Bình Thường', count: requests.filter(r => r.urgency_level === 'NORMAL').length }
                    ].map(item => (
                      <label key={item.id} className="flex items-center justify-between group cursor-pointer relative pl-7">
                        <input 
                          type="checkbox" 
                          className="peer absolute left-0 top-0.5 w-4 h-4 text-blood bg-white border-slate-300 rounded focus:ring-blood focus:ring-2 cursor-pointer"
                          checked={selectedUrgencies.includes(item.id)}
                          onChange={() => toggleUrgency(item.id)}
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{item.count}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Blood Type Filter */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase">NHÓM MÁU CẦN</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {bloodTypesList.map(bt => {
                      const count = requests.filter(r => r.blood_type && (r.blood_type.abo + r.blood_type.rh_factor) === bt).length;
                      const isSelected = selectedBloodTypes.includes(bt);
                      return (
                        <label 
                          key={bt} 
                          className={`
                            flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-sm font-bold cursor-pointer transition-all
                            ${isSelected ? 'bg-blood text-white border-blood shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}
                          `}
                        >
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isSelected}
                            onChange={() => toggleBloodType(bt)}
                          />
                          <span>{bt}</span>
                          <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400 font-medium'}`}>
                            {count} yêu cầu
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết Yêu cầu máu"
        size="md"
        hideFooter
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="font-bold text-navy text-lg">Cần {selectedRequest.units_needed} đơn vị máu {selectedRequest.blood_type ? (selectedRequest.blood_type.abo + selectedRequest.blood_type.rh_factor).replace(/\s+/g, '') : ''}</h3>
                  <span className={`inline-block px-2.5 py-0.5 mt-2 text-[11px] font-bold uppercase rounded border ${getUrgencyColor(selectedRequest.urgency?.urgency_code)}`}>
                     {selectedRequest.urgency?.urgency_name || getUrgencyLabel(selectedRequest.urgency?.urgency_code)}
                  </span>
               </div>
               {selectedRequest.blood_type && (
                 <div className="flex items-center gap-2 bg-red-50 text-blood px-3 py-1.5 rounded-lg border border-red-100 font-bold shrink-0">
                    <Heart className="w-4 h-4 fill-current opacity-70" /> {(selectedRequest.blood_type.abo + selectedRequest.blood_type.rh_factor).replace(/\s+/g, '')}
                 </div>
               )}
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3 mt-4">
              <div className="flex items-start gap-3 text-sm">
                 <User className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                 <div>
                   <div className="font-semibold text-slate-800 mb-0.5">Bệnh nhân</div>
                   <div className="text-slate-700">{selectedRequest.patient_name}</div>
                   {selectedRequest.patient_phone && <div className="text-slate-500 text-xs mt-1">SĐT liên hệ: {selectedRequest.patient_phone}</div>}
                 </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                 <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                 <div>
                   <div className="font-semibold text-slate-800 mb-0.5">Cơ sở tiếp nhận / Bệnh viện điều trị</div>
                   <div className="text-slate-700">{selectedRequest.hospital_name || selectedRequest.facility?.facility_name}</div>
                   <div className="text-slate-500 text-xs mt-1">Khoa/Phòng: {selectedRequest.ward_room || 'Chưa xác định'}</div>
                   <div className="text-slate-500 text-xs mt-1">Địa chỉ: {selectedRequest.address || selectedRequest.facility?.address}</div>
                 </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                 <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                 <div>
                   <span className="font-semibold text-slate-800">Cần trước: </span>
                   <span className="text-slate-700">{selectedRequest.required_before ? formatDate(selectedRequest.required_before) : 'Chưa xác định'}</span>
                 </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                 <Activity className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                 <div>
                   <span className="font-semibold text-slate-800">Lượng máu cần: </span>
                   <span className="text-slate-700">{selectedRequest.units_needed} đơn vị ({selectedRequest.component?.component_name || 'Chưa rõ chế phẩm'})</span>
                 </div>
              </div>
            </div>

            {selectedRequest.clinical_notes && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mt-4">
                 <div className="font-semibold text-orange-800 text-sm mb-1.5">Ghi chú thêm:</div>
                 <div className="text-sm text-orange-700 leading-relaxed whitespace-pre-wrap">{selectedRequest.clinical_notes}</div>
              </div>
            )}

            <div className="pt-4 flex gap-3 justify-end mt-6">
               <button onClick={() => setIsDetailOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Đóng</button>
               <Link href={`/donor/book?facility=${selectedRequest.facility_id}`} className="px-5 py-2.5 text-sm font-semibold text-white bg-blood hover:bg-blood-dark rounded-lg transition-colors flex items-center gap-2">
                 Hiến ngay <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
          </div>
        )}
      </BaseModal>

    </MainLayout>
  );
}
